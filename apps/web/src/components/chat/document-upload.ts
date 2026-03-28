import { fetchDocument } from "@/lib/api";
import type { UploadedDocumentState } from "@/components/chat/use-chat-runtime";

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 60;

export async function waitForDocumentProcessing(documentId: string): Promise<UploadedDocumentState> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const document = await fetchDocument(documentId);
    if (document.processing_status === "ready" || document.processing_status === "failed") {
      return document;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Dokument wird noch verarbeitet. Bitte versuchen Sie es in wenigen Augenblicken erneut.");
}
