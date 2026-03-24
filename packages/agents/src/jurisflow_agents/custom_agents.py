from google.adk.agents import BaseAgent


class CustomAgent(BaseAgent):
    """Lightweight custom agent used as a placeholder for non-LLM pipeline steps."""

    def describe(self) -> str:
        return self.description or self.name


def custom_agent(name: str, description: str) -> CustomAgent:
    return CustomAgent(name=name, description=description)

