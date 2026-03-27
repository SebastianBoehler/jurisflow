"use client";

import { Scale, Search } from "lucide-react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessage } from "@/components/chat/chat-message";
import { useEphemeralChat } from "@/components/chat/use-ephemeral-chat";

const STARTER_PROMPTS = [
  "Wie weit muss ein Blitzer vom Ortsschild entfernt stehen?",
  "Welche Voraussetzungen gelten für eine fristlose Kündigung wegen Zahlungsverzugs?",
  "Welche Anforderungen stellt § 626 BGB an die Zwei-Wochen-Frist?",
];

export function EphemeralChatPage() {
  const { isSubmitting, messages, submit } = useEphemeralChat();
  const hasConversation = messages.length > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-8 pt-6 sm:px-8">
        <header className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground">JURISFLOW</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">Juristische Recherche</h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-muted-foreground sm:flex">
            <Scale className="h-4 w-4" />
            Deep Research
          </div>
        </header>

        <section className="flex flex-1 flex-col">
          {!hasConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-16 pt-12 text-center">
              <div className="max-w-2xl">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Ein Fenster. Eine Frage.</p>
                <h2 className="mt-5 text-5xl font-semibold tracking-[-0.06em] text-foreground">
                  Rechtliche Recherche ohne Dashboard.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                  Die Unterhaltung startet erst mit deiner ersten Frage und verschwindet wieder beim Neuladen.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition hover:border-foreground/20 hover:bg-muted"
                    onClick={() => void submit(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-6 pb-10 pt-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}

          <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-background via-background to-transparent pb-2 pt-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>Automatische Auswahl der passenden Quellen und Folgeabfragen.</span>
            </div>
            <ChatComposer disabled={isSubmitting} onSubmit={submit} />
          </div>
        </section>
      </div>
    </main>
  );
}
