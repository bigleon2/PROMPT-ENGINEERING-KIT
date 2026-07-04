"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const STEP_ICONS = {
  pending: Circle,
  active: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

const STEP_COLORS = {
  pending: "text-muted-foreground/40",
  active: "text-amber-500",
  done: "text-emerald-500",
  error: "text-red-500",
};

const STEP_BG_COLORS = {
  pending: "border-border",
  active: "border-amber-500/50 bg-amber-500/5",
  done: "border-emerald-500/30 bg-emerald-500/5",
  error: "border-red-500/30 bg-red-500/5",
};

export function PekCoTPipeline() {
  const { steps, currentStep, setCurrentStep, isGenerating, setActiveTab, stepOutputs } =
    useAppStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer while generating
  const isGen = isGenerating;
  useEffect(() => {
    if (!isGen) return;
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(interval);
      setElapsedTime(0);
    };
  }, [isGen]);

  const hasStarted = steps.some((s) => s.status !== "pending");
  const hasAnyOutput = Object.keys(stepOutputs).length > 0;

  if (!hasStarted) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Pipeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
            <ChevronRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Pipeline Chain-of-Thought</h2>
            <p className="text-sm text-muted-foreground">
              {isGenerating
                ? `Étape ${currentStep + 1}/7 en cours...`
                : hasAnyOutput
                  ? "Analyse terminée"
                  : "En attente de démarrage"}
            </p>
          </div>
        </div>
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* Desktop: Horizontal Stepper */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Connection line */}
          <div className="absolute top-5 left-0 right-0 h-px bg-border" />
          <motion.div
            className="absolute top-5 left-0 h-px bg-amber-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${(currentStep / (steps.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />

          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.status];
            const isActive = index === currentStep;
            const hasOutput = stepOutputs[index];

            return (
              <motion.button
                key={step.id}
                onClick={() => hasOutput && setCurrentStep(index)}
                disabled={!hasOutput && step.status === "pending"}
                className={cn(
                  "relative z-10 flex flex-col items-center gap-2 min-w-[100px] group transition-colors",
                  hasOutput ? "cursor-pointer" : "cursor-default"
                )}
                whileTap={hasOutput ? { scale: 0.95 } : undefined}
              >
                <motion.div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    STEP_BG_COLORS[step.status],
                    hasOutput && step.status === "done" && "hover:border-amber-500/50 hover:bg-amber-500/5"
                  )}
                  animate={isActive && isGenerating ? { rotate: 360 } : {}}
                  transition={
                    isActive && isGenerating
                      ? { duration: 1.5, repeat: Infinity, ease: "linear" }
                      : {}
                  }
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      STEP_COLORS[step.status],
                      step.status === "active" && "animate-spin"
                    )}
                  />
                </motion.div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      isActive
                        ? "text-amber-500"
                        : step.status === "done"
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.id}. {step.name}
                  </p>
                  {step.duration && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(step.duration / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="md:hidden space-y-1">
        <AnimatePresence mode="wait">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.status];
            const isActive = index === currentStep;
            const hasOutput = stepOutputs[index];

            return (
              <motion.button
                key={step.id}
                onClick={() => hasOutput && setCurrentStep(index)}
                disabled={!hasOutput && step.status === "pending"}
                className={cn(
                  "relative z-10 flex items-center gap-3 rounded-lg border p-3 w-full text-left transition-all",
                  STEP_BG_COLORS[step.status],
                  hasOutput && "hover:bg-muted/50"
                )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    step.status === "active" && "bg-amber-500/10",
                    step.status === "done" && "bg-emerald-500/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      STEP_COLORS[step.status],
                      step.status === "active" && "animate-spin"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-amber-500" : "text-foreground"
                    )}
                  >
                    {step.id}. {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                {step.duration && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {(step.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Back to form link */}
      {!isGenerating && (
        <p className="text-center">
          <button
            onClick={() => setActiveTab("session")}
            className="text-xs text-amber-500 hover:underline"
          >
            ← Modifier la session et relancer
          </button>
        </p>
      )}
    </motion.div>
  );
}