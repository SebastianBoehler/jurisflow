import { notFound } from "next/navigation";

import { MatterWorkspace } from "@/app/matters/[matterId]/matter-workspace";
import { fetchDeadlines, fetchDocuments, fetchDrafts, fetchEvidence, fetchMatter, fetchResearchResults, fetchResearchRuns } from "@/lib/api";

type MatterPageProps = {
  params: Promise<{ matterId: string }>;
};

export default async function MatterPage({ params }: MatterPageProps) {
  const { matterId } = await params;
  const [matter, documents, deadlines, researchRuns, drafts, evidence] = await Promise.all([
    fetchMatter(matterId).catch(() => null),
    fetchDocuments(matterId).catch(() => []),
    fetchDeadlines(matterId).catch(() => []),
    fetchResearchRuns(matterId).catch(() => []),
    fetchDrafts(matterId).catch(() => []),
    fetchEvidence(matterId).catch(() => [])
  ]);

  if (!matter) {
    notFound();
  }

  const researchResultsByRun = new Map(
    await Promise.all(
      researchRuns.map(async (run) => [run.id, await fetchResearchResults(run.id).catch(() => [])] as const)
    )
  );

  return (
    <MatterWorkspace
      deadlines={deadlines}
      documents={documents}
      drafts={drafts}
      evidence={evidence}
      initialResultsByRun={Object.fromEntries(researchResultsByRun)}
      initialRuns={researchRuns}
      matter={matter}
      matterId={matterId}
    />
  );
}
