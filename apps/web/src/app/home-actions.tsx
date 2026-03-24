"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { createMatter, createSampleMatter } from "@/lib/api";

export function HomeActions() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isOpeningSample, setIsOpeningSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateMatter() {
    setIsCreating(true);
    setError(null);
    try {
      const matter = await createMatter({
        title: "Neue Akte",
        description: "Neu angelegte Akte zur weiteren juristischen Bearbeitung."
      });
      startTransition(() => {
        router.push(`/matters/${matter.id}`);
        router.refresh();
      });
    } catch {
      setError("Die Akte konnte nicht angelegt werden. Bitte pruefen Sie, ob die API erreichbar ist.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleOpenSample() {
    setIsOpeningSample(true);
    setError(null);
    try {
      const matter = await createSampleMatter();
      startTransition(() => {
        router.push(`/matters/${matter.id}`);
        router.refresh();
      });
    } catch {
      setError("Die Musterakte konnte nicht geoeffnet werden.");
    } finally {
      setIsOpeningSample(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <ShimmerButton onClick={handleOpenSample} disabled={isCreating || isOpeningSample}>
          {isOpeningSample ? "Musterakte wird geoeffnet..." : "Musterakte oeffnen"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </ShimmerButton>
        <Button
          className="border-white/14 bg-white/6 text-white hover:bg-white/10"
          onClick={handleCreateMatter}
          disabled={isCreating || isOpeningSample}
          variant="outline"
        >
          {isCreating ? "Akte wird angelegt..." : "Akte anlegen"}
        </Button>
      </div>
      <p className="text-sm text-white/62">Starten Sie mit einer Demoakte oder springen Sie direkt in eine leere Mandatsstruktur.</p>
      {error ? <p className="text-sm text-[#ffd2bf]">{error}</p> : null}
    </div>
  );
}
