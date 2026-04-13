export const DEFAULT_CASE_DASHBOARD = `
root = Stack([caseHeader, evidenceRow, workRow])
caseHeader = CaseBrief("full")
evidenceRow = Stack([documents, research], "row", "m", "stretch", "start", true)
documents = DocumentBoard("compact")
research = ResearchTimeline(4)
workRow = Stack([deadlines, drafts, evidence], "row", "m", "stretch", "start", true)
deadlines = DeadlineBoard()
drafts = DraftQueue()
evidence = EvidenceMap()
`.trim();
