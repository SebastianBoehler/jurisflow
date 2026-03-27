"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { createMatter } from "@/lib/api";

export function HomeActions() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateMatter() {
    setIsCreating(true);
    setError(null);
    try {
      await createMatter({
        title: "Neue Akte",
        description: "Neu angelegte Akte zur weiteren juristischen Bearbeitung."
      });
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch {
      setError("Die Akte konnte nicht angelegt werden. Bitte pruefen Sie, ob die API erreichbar ist.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="ember"
          size="lg"
          onClick={handleCreateMatter}
          disabled={isCreating}
        >
          <Plus className="size-4" />
          {isCreating ? "Wird angelegt..." : "Neue Akte"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
