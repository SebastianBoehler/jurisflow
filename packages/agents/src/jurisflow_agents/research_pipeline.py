from google.adk.agents import LoopAgent, ParallelAgent, SequentialAgent

from jurisflow_agents.custom_agents import custom_agent


def build_research_pipeline() -> SequentialAgent:
    parallel_search = ParallelAgent(
        name="ParallelSearch",
        description="Run source-specific legal searches in parallel.",
        sub_agents=[
            custom_agent("FederalLawSearchAgent", "Search official federal statutes."),
            custom_agent("StateLawSearchAgent", "Search landesrecht and administrative directives."),
            custom_agent("CaseLawSearchAgent", "Search official federal case-law."),
            custom_agent("EuLawSearchAgent", "Search EUR-Lex for EU-law."),
            custom_agent("InternalDocsSearchAgent", "Search uploaded matter documents."),
        ],
    )
    search_loop = LoopAgent(
        name="DeepResearchLoop",
        description="Execute an initial search round and one optional follow-up round.",
        sub_agents=[
            parallel_search,
            custom_agent("GapAnalysisAgent", "Assess gaps and propose targeted follow-up searches."),
        ],
        max_iterations=2,
    )
    return SequentialAgent(
        name="ResearchPipeline",
        description="Recon -> router -> specialist search -> decision -> rerank -> synthesis",
        sub_agents=[
            custom_agent("ReconnaissanceAgent", "Use web research to identify likely norms and authorities before planning."),
            custom_agent("RouterAgent", "Route the question into source-specific legal search strategies."),
            search_loop,
            custom_agent("Reranker", "Blend, deduplicate, and prioritize findings."),
            custom_agent("SynthesisAgent", "Produce a legal research memo summary."),
        ],
    )
