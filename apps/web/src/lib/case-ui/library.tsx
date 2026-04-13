"use client";

import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { z } from "zod";
import {
  CaseBrief,
  DeadlineBoard,
  DocumentBoard,
  DraftQueue,
  EvidenceMap,
  ResearchTimeline,
} from "@/components/case-ui/case-ui-components";

const CaseBriefComponent = defineComponent({
  name: "CaseBrief",
  props: z.object({ variant: z.enum(["compact", "full"]).optional() }),
  description: "Matter overview with counts and status.",
  component: ({ props }) => <CaseBrief variant={props.variant ?? "compact"} />,
});

const DocumentBoardComponent = defineComponent({
  name: "DocumentBoard",
  props: z.object({ variant: z.enum(["compact", "detailed"]).optional() }),
  description: "Uploaded case documents with summaries and processing status.",
  component: ({ props }) => <DocumentBoard variant={props.variant ?? "compact"} />,
});

const ResearchTimelineComponent = defineComponent({
  name: "ResearchTimeline",
  props: z.object({ limit: z.number().optional() }),
  description: "Recent legal research runs for the active case.",
  component: ({ props }) => <ResearchTimeline limit={props.limit ?? 4} />,
});

const DeadlineBoardComponent = defineComponent({
  name: "DeadlineBoard",
  props: z.object({}),
  description: "Procedural deadlines detected for the active case.",
  component: () => <DeadlineBoard />,
});

const DraftQueueComponent = defineComponent({
  name: "DraftQueue",
  props: z.object({}),
  description: "Generated legal drafts for the active case.",
  component: () => <DraftQueue />,
});

const EvidenceMapComponent = defineComponent({
  name: "EvidenceMap",
  props: z.object({}),
  description: "Evidence labels and linked source titles.",
  component: () => <EvidenceMap />,
});

export const jurisflowOpenUiLibrary = createLibrary({
  root: openuiLibrary.root,
  componentGroups: [
    ...(openuiLibrary.componentGroups ?? []),
    {
      name: "Jurisflow",
      components: ["CaseBrief", "DocumentBoard", "ResearchTimeline", "DeadlineBoard", "DraftQueue", "EvidenceMap"],
      notes: ["Use these components for real matter data. Do not pass invented legal facts into generic tables."],
    },
  ],
  components: [
    ...Object.values(openuiLibrary.components),
    CaseBriefComponent,
    DocumentBoardComponent,
    ResearchTimelineComponent,
    DeadlineBoardComponent,
    DraftQueueComponent,
    EvidenceMapComponent,
  ],
});
