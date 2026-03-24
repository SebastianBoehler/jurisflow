from google.adk.agents import LlmAgent, SequentialAgent

from jurisflow_agents.config import live_model_enabled, model_name
from jurisflow_agents.custom_agents import custom_agent


def _extraction_agent():
    if not live_model_enabled():
        return custom_agent("ExtractionAgent", "Mock extraction for local development.")
    return LlmAgent(
        name="ExtractionAgent",
        description="Extract parties, dates, deadlines, statute references, and a concise summary.",
        model=model_name(),
        instruction="Extract structured legal facts from German legal documents.",
    )


def build_document_pipeline() -> SequentialAgent:
    return SequentialAgent(
        name="DocumentPipeline",
        description="Upload -> OCR -> classification -> extraction -> storage",
        sub_agents=[
            custom_agent("UploadAgent", "Accepts the uploaded file and stages metadata."),
            custom_agent("OCRAgent", "Runs OCR only if no PDF text layer is present."),
            custom_agent("ClassificationAgent", "Assigns a legal document class."),
            _extraction_agent(),
            custom_agent("StorageAgent", "Persists extracted artifacts and embeddings."),
        ],
    )

