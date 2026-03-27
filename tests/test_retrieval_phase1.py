import unittest

from jurisflow_retrieval import ingest_text_document, merge_results
from jurisflow_retrieval.embeddings.base import EmbeddingProvider
from jurisflow_retrieval.types import RetrievalHit
from jurisflow_shared import AuthorityLevel, ResearchSource


class StubEmbeddingProvider(EmbeddingProvider):
    @property
    def backend(self) -> str:
        return "stub"

    @property
    def model_name(self) -> str:
        return "stub-model"

    @property
    def dimension(self) -> int | None:
        return 2

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [[float(index + 1), float(len(text))] for index, text in enumerate(texts)]


class RetrievalPhase1Tests(unittest.TestCase):
    def test_ingest_text_document_embeds_chunks_and_extracts_keywords(self) -> None:
        chunks = ingest_text_document(
            "§ 242 BGB verpflichtet zu Treu und Glauben.\n\nDies ist ein zweiter Absatz.",
            provider=StubEmbeddingProvider(),
            target_size=40,
            overlap=10,
        )

        self.assertEqual(len(chunks), 2)
        self.assertEqual(chunks[0].embedding, [1.0, float(len(chunks[0].text))])
        self.assertIn("§ 242 BGB", chunks[0].keywords)

    def test_retrieval_hit_populates_evidence_defaults(self) -> None:
        hit = RetrievalHit(
            source=ResearchSource.FEDERAL_LAW,
            title="§ 242 BGB - Treu und Glauben",
            excerpt="Leistung nach Treu und Glauben.",
            citation="§ 242 BGB",
            url="https://example.com/norm",
        )

        self.assertEqual(hit.authority, AuthorityLevel.PRIMARY)
        self.assertEqual(hit.citations, ["§ 242 BGB"])
        self.assertEqual(hit.source_id, "https://example.com/norm")

    def test_merge_results_prefers_higher_authority_on_equal_score(self) -> None:
        merged = merge_results(
            [RetrievalHit(source=ResearchSource.GENERAL_WEB, title="Web", excerpt="...", relevance_score=0.7)],
            [RetrievalHit(source=ResearchSource.FEDERAL_LAW, title="Norm", excerpt="...", relevance_score=0.7)],
            limit=2,
        )

        self.assertEqual([hit.source for hit in merged], [ResearchSource.FEDERAL_LAW, ResearchSource.GENERAL_WEB])


if __name__ == "__main__":
    unittest.main()
