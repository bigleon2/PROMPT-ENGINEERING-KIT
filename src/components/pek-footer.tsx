"use client";

import { BrainCircuit } from "lucide-react";

export function PekFooter() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-amber-500/60" />
            <p className="text-xs">
              Prompt-Engineering-Kit v4.0 — Basé sur la méthodologie Chain-of-Thought en 7 étapes
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} PEK Team. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}