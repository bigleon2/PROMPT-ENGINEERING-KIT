"use client";

import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Copy, Check, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store";
import { useState, useCallback } from "react";
import { toast } from "sonner";
// Lightweight code block - no heavy syntax highlighter dependency

export function PekStepOutput() {
  const { steps, currentStep, stepOutputs, isGenerating } = useAppStore();
  const [copied, setCopied] = useState(false);

  const output = stepOutputs[currentStep];
  const currentStepData = steps[currentStep];

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erreur lors de la copie");
    }
  }, [output]);

  if (!currentStepData) return null;

  // Show loading skeleton when generating for current step
  if (isGenerating && !output) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/50 bg-muted/20 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">
              Étape {currentStep + 1} — {currentStepData.name}
            </h3>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </motion.div>
    );
  }

  if (!output) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">
            Étape {currentStep + 1} — {currentStepData.name}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              Copié
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copier
            </>
          )}
        </Button>
      </div>

      {/* Markdown Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 sm:p-6 [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!text-xs [&_table]:text-xs [&_th]:p-2 [&_td]:p-2 [&_th]:border [&_td]:border [&_blockquote]:border-l-amber-500 [&_blockquote]:border-l-2 [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_hr]:my-3">
        <ReactMarkdown
          components={{
            code(props) {
              const { children, className, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");

              // Check if it's inline code or a code block
              const isInline =
                !match &&
                !codeString.includes("\n") &&
                codeString.length < 100;

              if (isInline) {
                return (
                  <code
                    className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-amber-600 dark:text-amber-400"
                    {...rest}
                  >
                    {children}
                  </code>
                );
              }

              return (
                <pre className="rounded-lg bg-zinc-900 dark:bg-zinc-800 p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-zinc-100">{codeString}</code>
                </pre>
              );
            },
          }}
        >
          {output}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}