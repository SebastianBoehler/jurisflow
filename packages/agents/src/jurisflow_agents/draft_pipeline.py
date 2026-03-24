from google.adk.agents import LlmAgent, SequentialAgent

from jurisflow_agents.config import live_model_enabled, model_name
from jurisflow_agents.custom_agents import custom_agent


def _draft_agent():
    if not live_model_enabled():
        return custom_agent("DraftAgent", "Mock drafting agent for local development.")
    return LlmAgent(
        name="DraftAgent",
        description="Generate German legal drafts using structured source material.",
        model=model_name(),
        instruction=(
            "Draft a German legal memo or pleading outline with sections for Sachverhalt, "
            "Rechtliche Würdigung, Beweisanträge, and Anträge."
        ),
    )


def build_draft_pipeline() -> SequentialAgent:
    return SequentialAgent(
        name="DraftPipeline",
        description="Input facts -> source bundle -> draft -> validation",
        sub_agents=[
            custom_agent("InputFacts", "Collects structured matter facts."),
            custom_agent("SourceBundle", "Builds the supporting source packet."),
            _draft_agent(),
            custom_agent("ValidationAgent", "Checks structure and citation completeness."),
        ],
    )
