const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  ready: "Fertig",
  queued: "In Warteschlange",
  processing: "In Bearbeitung",
  failed: "Fehlgeschlagen",
  complete: "Abgeschlossen",
  pending: "Ausstehend",
  skipped: "Übersprungen"
};

const DEADLINE_KIND_LABELS: Record<string, string> = {
  statement_deadline: "Stellungnahmefrist",
  appeal_deadline: "Berufungsfrist"
};

const RESEARCH_SOURCE_LABELS: Record<string, string> = {
  federal_law: "Bundesrecht",
  state_law: "Landesrecht",
  case_law: "Rechtsprechung",
  eu_law: "EU-Recht",
  internal_docs: "Interne Dokumente",
  general_web: "Web-Recherche"
};

export function formatStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function formatDeadlineKind(kind: string) {
  return DEADLINE_KIND_LABELS[kind] ?? kind;
}

export function formatResearchSource(source: string) {
  return RESEARCH_SOURCE_LABELS[source] ?? source;
}

export function formatRelativeRunTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
