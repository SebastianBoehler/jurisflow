from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.providers.html_web_search import run_html_web_search
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource

# Official state-law portals, ministries, and administrative-law registries
# for all 16 German Bundesländer plus general administrative-law anchors.
_STATE_LAW_DOMAINS = (
    # Aggregated state law registries
    "landesrecht",
    "landesrechtportal",
    # Baden-Württemberg
    "landesrecht-bw.de",
    "justiz-bw.de",
    "landesrecht.bwl.de",
    # Bavaria
    "gesetze-bayern.de",
    "bayern.de",
    "stmj.bayern.de",
    # Berlin
    "berlin.de",
    "gerichtsentscheidungen.berlin.de",
    # Brandenburg
    "bravors.brandenburg.de",
    "brandenburg.de",
    # Bremen
    "bremen.de",
    "transparenz.bremen.de",
    # Hamburg
    "hamburg.de",
    "justiz.hamburg.de",
    # Hesse
    "rv.hessenrecht.hessen.de",
    "hessen.de",
    # Mecklenburg-Vorpommern
    "mecklenburg-vorpommern.de",
    "landesrecht-mv.de",
    # Lower Saxony
    "niedersachsen.de",
    "voris.niedersachsen.de",
    # NRW
    "recht.nrw.de",
    "nrw.de",
    "justiz.nrw.de",
    # Rhineland-Palatinate
    "rlp.de",
    "landesrecht.rlp.de",
    "justiz.rlp.de",
    # Saarland
    "saarland.de",
    "landesrecht.saarland.de",
    # Saxony
    "sachsen.de",
    "revosax.sachsen.de",
    # Saxony-Anhalt
    "sachsen-anhalt.de",
    "landesrecht.sachsen-anhalt.de",
    # Schleswig-Holstein
    "schleswig-holstein.de",
    "gesetze-rechtsprechung.sh.juris.de",
    # Thuringia
    "thueringen.de",
    "landesrecht.thueringen.de",
    # Cross-cutting
    "justiz",
    "ministerium",
    "polizei",
    "verwaltung",
    "behörde",
    "behoerde",
)


class StateLawProvider(ResearchProvider):
    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        return run_html_web_search(
            source=ResearchSource.STATE_LAW,
            request=request,
            query_suffix="Landesrecht Verwaltungsvorschrift Erlass Ministerium",
            preferred_domains=_STATE_LAW_DOMAINS,
        )
