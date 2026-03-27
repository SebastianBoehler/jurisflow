from jurisflow_retrieval.providers.base import ResearchProvider
from jurisflow_retrieval.providers.html_web_search import run_html_web_search
from jurisflow_retrieval.types import RetrievalHit, SearchRequest
from jurisflow_shared import ResearchSource

# Primary authoritative German legal sources ranked first
_PRIMARY_DOMAINS = (
    "gesetze-im-internet.de",
    "rechtsprechung-im-internet.de",
    "bundesgerichtshof.de",
    "bverfg.de",
    "bverwg.de",
    "bag.bund.de",
    "bfh.bund.de",
    "bsg.bund.de",
    "bpatg.bund.de",
    "bund.de",
)

# High-quality secondary / aggregator sources
_SECONDARY_DOMAINS = (
    # Free case law & cross-linked databases
    "openjur.de",
    "dejure.org",
    "rewis.io",
    "buzer.de",
    "gesetze.io",
    # Official EU / court portals
    "eur-lex.europa.eu",
    "curia.europa.eu",
    # Official ministry / agency portals
    "bmjv.bund.de",
    "bmj.bund.de",
    "bmas.bund.de",
    "bmwi.bund.de",
    "bundesnetzagentur.de",
    "bafin.de",
    "bundeskartellamt.de",
    "bfdi.bund.de",
    # State / regional
    "justiz",
    "ministerium",
    "polizei",
    "landesrecht",
)

_ALL_PREFERRED = _PRIMARY_DOMAINS + _SECONDARY_DOMAINS


class GeneralWebSearchProvider(ResearchProvider):
    def search(self, request: SearchRequest) -> list[RetrievalHit]:
        return run_html_web_search(
            source=ResearchSource.GENERAL_WEB,
            request=request,
            query_suffix="amtliche Quelle Gericht Gesetz Verwaltung Deutschland",
            preferred_domains=_ALL_PREFERRED,
        )

    def search_reconnaissance(self, request: SearchRequest) -> list[RetrievalHit]:
        return run_html_web_search(
            source=ResearchSource.GENERAL_WEB,
            request=request,
            query_suffix="Deutschland amtliche Quelle Norm Verwaltung Gericht",
            preferred_domains=_ALL_PREFERRED,
        )
