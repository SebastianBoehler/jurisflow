"""Additional legal tools for the JurisFlow chat agent.

Provides three FunctionTools beyond basic web search:
- gutachten_gliederung   — Gutachtenstil scaffold (Obersatz → Definition → Subsumtion → Ergebnis)
- fetch_norm_text        — Live norm text from gesetze-im-internet.de with temporal validity hint
- pruefe_normkollision   — Lex specialis / lex posterior collision analysis template
"""
from __future__ import annotations

import re

import httpx
from lxml import html

from jurisflow_retrieval.citations import extract_statute_references
from jurisflow_retrieval.utils import clean_text, decode_bytes


def gutachten_gliederung(obersatz: str, norm_zitat: str) -> str:
    """Erstelle eine Gutachtenstil-Gliederung für eine juristische Analyse.

    Gibt eine strukturierte Vorlage im deutschen Gutachtenstil zurück
    (Obersatz → Definition → Subsumtion → Ergebnis), die du anschließend
    mit deiner inhaltlichen Analyse ausfüllen sollst.

    Args:
        obersatz: Die zu prüfende Rechtsfrage als Obersatz, z.B.
            "A könnte einen Anspruch gegen B auf Schadensersatz aus § 823 Abs. 1 BGB haben."
        norm_zitat: Die primär einschlägige Norm, z.B. "§ 823 Abs. 1 BGB".

    Returns:
        Gutachtenstil-Vorlage als Markdown.
    """
    return (
        f"## Gutachten: {norm_zitat}\n\n"
        f"**I. Obersatz**\n{obersatz}\n\n"
        f"**II. Voraussetzungen / Definition**\n"
        f"*[Nenne die Tatbestandsmerkmale von {norm_zitat} und definiere jeden Begriff präzise.]*\n\n"
        f"**III. Subsumtion**\n"
        f"*[Prüfe jedes Tatbestandsmerkmal anhand des konkreten Sachverhalts. "
        f"Liegt es vor? Begründe dies.]*\n\n"
        f"**IV. Zwischenergebnis**\n"
        f"*[Fazit: Der Tatbestand des {norm_zitat} ist / ist nicht erfüllt, weil …]*"
    )


def fetch_norm_text(paragraph: str, gesetz: str) -> str:
    """Rufe den aktuellen Normtext eines Paragraphen von gesetze-im-internet.de ab.

    Gibt den vollständigen Normtext zurück und weist auf den Geltungsstand
    sowie enthaltene Querverweise auf andere Paragraphen hin.

    Args:
        paragraph: Paragraphennummer ohne §-Zeichen, z.B. "242", "823", "433".
            Bei Buchstabenzusatz ohne Leerzeichen: "823a".
        gesetz: Gesetzeskürzel in Kleinbuchstaben, z.B. "bgb", "stgb", "hgb",
            "gwg", "urhg", "gg", "ao".

    Returns:
        Normtext mit Geltungshinweis und Querverweisen als Markdown.
    """
    paragraph = paragraph.strip().lower().replace("§", "").replace(" ", "")
    gesetz = gesetz.strip().lower()
    url = f"https://www.gesetze-im-internet.de/{gesetz}/__{paragraph}.html"

    try:
        response = httpx.get(
            url,
            timeout=15.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; Jurisflow/1.0)"},
        )
        if response.status_code == 404:
            return (
                f"Norm nicht gefunden: § {paragraph} {gesetz.upper()}. "
                "Bitte Paragraphennummer und Gesetzkürzel prüfen "
                "(z.B. paragraph='242', gesetz='bgb')."
            )
        response.raise_for_status()
    except httpx.TimeoutException:
        return f"Zeitüberschreitung beim Abruf von § {paragraph} {gesetz.upper()}."
    except Exception as exc:
        return f"Abruf fehlgeschlagen: {exc}"

    page_text = decode_bytes(response.content)
    doc = html.fromstring(page_text)

    # Heading (e.g. "§ 242 Treu und Glauben")
    heading = " ".join(t.strip() for t in doc.xpath("//h1//text()") if t.strip())

    # Norm body — jurAbsatz divs contain the actual paragraph text
    absaetze = [
        clean_text(node.text_content())
        for node in doc.xpath("//div[contains(@class,'jurAbsatz')]")
        if clean_text(node.text_content())
    ]

    if not absaetze:
        return (
            f"Normtext für § {paragraph} {gesetz.upper()} nicht parsebar "
            f"(URL: {response.url}). Bitte direkt aufrufen."
        )

    # Temporal validity hint — "Stand: DD.MM.YYYY" in the HTML metadata
    stand_match = re.search(r"Stand:\s*([\d./]+)", page_text)
    geltung_hint = f"\n> **Geltungsstand:** Stand {stand_match.group(1)}" if stand_match else ""

    # Cross-references mentioned inside the norm text itself
    combined = " ".join(absaetze)
    refs = extract_statute_references(combined)
    # Deduplicate, drop self-reference
    unique_refs = list(dict.fromkeys(
        r for r in refs
        if paragraph not in r.replace("§", "").replace("§§", "").strip().split()
    ))
    verweis_hint = (
        f"\n\n**Querverweise im Normtext:** {', '.join(unique_refs[:8])}"
        if unique_refs
        else ""
    )

    norm_body = "\n\n".join(absaetze[:12])
    title = heading or f"§ {paragraph} {gesetz.upper()}"
    return f"### {title}{geltung_hint}\n\n{norm_body}{verweis_hint}"


def pruefe_normkollision(norm1_zitat: str, norm2_zitat: str) -> str:
    """Analysiere einen möglichen Normwiderspruch zwischen zwei Normen.

    Gibt eine strukturierte Prüfungsvorlage für Normkollisionen zurück,
    basierend auf den klassischen Kollisionsregeln (lex specialis, lex posterior,
    lex superior). Fülle die Vorlage mit deiner eigenen inhaltlichen Analyse aus.

    Args:
        norm1_zitat: Erste Norm, z.B. "§ 823 BGB".
        norm2_zitat: Zweite Norm, z.B. "§ 1 ProdHaftG".

    Returns:
        Kollisionsprüfungs-Vorlage als Markdown.
    """
    return (
        f"## Normkollisionsprüfung: {norm1_zitat} vs. {norm2_zitat}\n\n"
        "**Anwendbare Kollisionsregeln:**\n\n"
        "| Regel | Fragestellung |\n"
        "|-------|---------------|\n"
        f"| **lex specialis** | Ist {norm1_zitat} oder {norm2_zitat} die speziellere Norm? "
        "Die speziellere Norm verdrängt die allgemeinere. |\n"
        f"| **lex posterior** | Welche Norm ist zeitlich jünger? "
        "Die spätere Norm geht der älteren vor, sofern Verdrängung gewollt war. |\n"
        "| **lex superior** | Besteht ein Rangunterschied (GG, EU-Recht > Bundesgesetz > Landesrecht)? |\n\n"
        "**Prüfungsschritte:**\n\n"
        f"1. **Überschneidung der Anwendungsbereiche:** Greifen {norm1_zitat} und {norm2_zitat} "
        "auf denselben Sachverhalt zu?\n"
        "   *[Vergleiche Schutzgüter und Tatbestandsmerkmale.]*\n\n"
        "2. **Spezialitätsverhältnis:** Welche Norm hat den engeren Anwendungsbereich?\n"
        "   *[Begründe das Spezialitätsverhältnis.]*\n\n"
        "3. **Zeitliches Verhältnis:** Wann traten die Normen in Kraft? Wurde eine bewusst als lex posterior eingeführt?\n"
        "   *[Inkrafttreten und Gesetzgebungshistorie prüfen.]*\n\n"
        "4. **Rangverhältnis:** Sind beide Normen gleichen Ranges, oder gilt Vorrang kraft Hierarchie?\n"
        "   *[Normenhierarchie bestimmen.]*\n\n"
        "5. **Ergebnis:** Welche Norm geht vor? Gilt die andere subsidiär oder ist sie vollständig verdrängt?\n"
        "   *[Ggf. Kumulation möglich, falls kein Widerspruch im Rechtsfolgenbereich.]*"
    )
