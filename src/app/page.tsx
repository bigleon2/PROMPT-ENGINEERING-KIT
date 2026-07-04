"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { PekHeader } from "@/components/pek-header";
import { PekFooter } from "@/components/pek-footer";
import { PekSessionForm } from "@/components/pek-session-form";
import { PekCoTPipeline } from "@/components/pek-cot-pipeline";
import { PekStepOutput } from "@/components/pek-step-output";
import { PekSessionsList } from "@/components/pek-sessions-list";
import { PekTemplatesGallery } from "@/components/pek-templates-gallery";
import { PekGuide } from "@/components/pek-guide";
import { PekValidationReport } from "@/components/pek-validation-report";
import { PekKnowledgePanel } from "@/components/pek-knowledge-panel";

const TAB_CONTENT = {
  session: {
    title: "Nouvelle Session",
    component: PekSessionForm,
  },
  sessions: {
    title: "Sessions",
    component: PekSessionsList,
  },
  templates: {
    title: "Modèles",
    component: PekTemplatesGallery,
  },
  guide: {
    title: "Guide",
    component: PekGuide,
  },
  knowledge: {
    title: "Knowledge",
    component: PekKnowledgePanel,
  },
};

export default function Home() {
  const { activeTab, steps, isGenerating, stepOutputs } = useAppStore();

  const hasStartedPipeline = steps.some((s) => s.status !== "pending");

  const ActiveComponent = TAB_CONTENT[activeTab as keyof typeof TAB_CONTENT]?.component;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PekHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Active Tab Content */}
            {ActiveComponent && <ActiveComponent />}

            {/* Pipeline Section - shown when pipeline has started */}
            {activeTab === "session" && hasStartedPipeline && (
              <div className="space-y-6">
                <PekCoTPipeline />
                <PekStepOutput />
                <PekValidationReport />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <PekFooter />
    </div>
  );
}