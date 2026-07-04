"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, Zap } from "lucide-react";

export function PekKnowledgePanel() {
  const {
    knowledgeAgents,
    knowledgeSkills,
    isKnowledgeLoaded,
    setKnowledgeAgents,
    setKnowledgeSkills,
    setKnowledgeLoaded,
  } = useAppStore();

  useEffect(() => {
    if (isKnowledgeLoaded) return;

    let cancelled = false;

    async function fetchKnowledge() {
      try {
        const res = await fetch("/api/knowledge");
        if (!res.ok) throw new Error("Erreur API");
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setKnowledgeAgents(json.data.agents);
          setKnowledgeSkills(json.data.skills);
        }
      } catch {
        // silently fail — panel shows empty state
      } finally {
        if (!cancelled) setKnowledgeLoaded(true);
      }
    }

    fetchKnowledge();
    return () => {
      cancelled = true;
    };
  }, [isKnowledgeLoaded, setKnowledgeAgents, setKnowledgeSkills, setKnowledgeLoaded]);

  // Group skills by category
  const skillsByCategory = knowledgeSkills.reduce<
    Record<string, { name: string; category: string }[]>
  >((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  const specializedAgents = knowledgeAgents.filter((a) => a.type === "spécialisé");
  const genericAgents = knowledgeAgents.filter((a) => a.type === "générique");

  // Loading skeleton
  if (!isKnowledgeLoaded) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Base de Connaissances
            </h2>
            <p className="text-sm text-muted-foreground">
              Écosystème d&apos;orchestration — Agents &amp; Skills
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Skeleton for Agents */}
          <Card className="border-amber-200/50 dark:border-amber-900/30">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skeleton for Skills */}
          <Card className="border-amber-200/50 dark:border-amber-900/30">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-28 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-500">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Base de Connaissances
          </h2>
          <p className="text-sm text-muted-foreground">
            Écosystème d&apos;orchestration — {knowledgeAgents.length} agents &amp;{" "}
            {knowledgeSkills.length} skills
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Agents Section */}
        <Card className="border-amber-200/50 dark:border-amber-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-amber-500" />
                Agents
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-600/10 text-amber-600 dark:text-amber-400 text-xs">
                {knowledgeAgents.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Agents spécialisés et génériques de l&apos;écosystème
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[480px] pr-2">
              <div className="space-y-2">
                {/* Specialized agents */}
                {specializedAgents.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-1">
                    Spécialisés
                  </p>
                )}
                {specializedAgents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}

                {/* Generic agents */}
                {genericAgents.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 pt-3">
                    Génériques
                  </p>
                )}
                {genericAgents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}

                {knowledgeAgents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun agent trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Skills Section */}
        <Card className="border-amber-200/50 dark:border-amber-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Skills Opérationnels
              </CardTitle>
              <Badge variant="secondary" className="bg-amber-600/10 text-amber-600 dark:text-amber-400 text-xs">
                {knowledgeSkills.length}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Skills répartis en {Object.keys(skillsByCategory).length} catégories
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[480px] pr-2">
              <div className="space-y-4">
                {Object.entries(skillsByCategory).map(([category, skills]) => (
                  <div key={category} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                      {category}
                    </p>
                    {skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                      >
                        <span className="text-sm font-medium truncate mr-2">
                          {skill.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] border-amber-300/40 text-amber-700 dark:text-amber-400 dark:border-amber-800/40"
                        >
                          {category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ))}

                {knowledgeSkills.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun skill trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Compact agent card */
function AgentCard({
  agent,
}: {
  agent: { name: string; description: string; type: string };
}) {
  const isSpecialized = agent.type === "spécialisé";

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate font-mono">
            {agent.name}
          </p>
          {agent.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          )}
        </div>
        <Badge
          variant="secondary"
          className={`shrink-0 text-[10px] ${
            isSpecialized
              ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-600/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {agent.type}
        </Badge>
      </div>
    </div>
  );
}