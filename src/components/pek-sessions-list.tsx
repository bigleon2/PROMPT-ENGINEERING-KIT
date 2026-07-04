"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  History,
  Trash2,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  Inbox,
  Star,
} from "lucide-react";
import { useAppStore, type Session } from "@/lib/store";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    icon: Clock,
    variant: "outline" as const,
    className: "text-muted-foreground border-muted-foreground/30",
  },
  running: {
    label: "En cours",
    icon: AlertCircle,
    variant: "secondary" as const,
    className: "bg-amber-500/10 text-amber-500",
  },
  completed: {
    label: "Terminé",
    icon: CheckCircle2,
    variant: "secondary" as const,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  error: {
    label: "Erreur",
    icon: AlertCircle,
    variant: "destructive" as const,
    className: "",
  },
};

const COMPLEXITY_COLORS = {
  simple: "text-emerald-500 border-emerald-500/30",
  moyen: "text-amber-500 border-amber-500/30",
  complexe: "text-red-500 border-red-500/30",
};

const DEFAULT_STEP_NAMES = [
  "Compréhension",
  "Décomposition",
  "Extraction",
  "Structuration",
  "Génération",
  "Validation",
  "Amélioration",
];

export function PekSessionsList() {
  const { sessions, setSessions, setCurrentSessionId, setActiveTab } =
    useAppStore();

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const mapped: Session[] = data.data.map((s: any) => ({
          id: s.id,
          projectId: s.projectId || '',
          title: s.title,
          status: s.status === 'in_progress' ? 'running' as const
            : s.status === 'completed' ? 'completed' as const
            : s.status === 'error' ? 'error' as const
            : 'pending' as const,
          complexity: s.complexity || 'moyen',
          score: s.validations?.[0]?.totalScore ?? null,
          createdAt: s.createdAt,
          completedAt: s.updatedAt,
        }));
        setSessions(mapped);
      }
    } catch {
      // use mock data as fallback
    }
  }, [setSessions]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
    setSessions(sessions.filter((s) => s.id !== id));
    toast.success("Session supprimée");
  };

  const handleView = async (session: Session) => {
    try {
      const res = await fetch(`/api/sessions/${session.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const sess = data.data;
        setCurrentSessionId(session.id);

        // Load steps into pipeline view
        if (sess.steps && sess.steps.length > 0) {
          const loadedSteps = sess.steps.map((s: any, i: number) => ({
            id: i + 1,
            name: s.name || DEFAULT_STEP_NAMES[i],
            description: '',
            status: s.status === 'completed' ? 'done' as const
              : s.status === 'running' ? 'active' as const
              : s.status === 'error' ? 'error' as const
              : 'pending' as const,
            duration: s.duration || null,
          }));
          useAppStore.getState().setSteps(loadedSteps);

          // Load step outputs
          sess.steps.forEach((s: any, i: number) => {
            if (s.output) {
              useAppStore.getState().setStepOutput(i, s.output);
            }
          });

          // Load validation
          if (sess.validations?.[0]) {
            const v = sess.validations[0];
            useAppStore.getState().setValidationScore(v.totalScore);
            useAppStore.getState().setValidationDetails({
              completeness: v.completeness,
              coherence: v.coherence,
              quality: v.quality,
              checks: JSON.parse(v.checks || '[]'),
            });
          }

          setActiveTab("session");
          toast.info(`Session "${session.title}" chargée`);
        }
      }
    } catch {
      setCurrentSessionId(session.id);
      setActiveTab("session");
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Historique de vos analyses
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Aucune session
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
            Lancez votre première analyse CoT pour voir vos sessions ici.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadSessions}>
            <FileText className="mr-2 h-3 w-3" />
            Rafraîchir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Sessions</h2>
            <p className="text-sm text-muted-foreground">
              {sessions.length} session{sessions.length > 1 ? "s" : ""}{" "}
              enregistrée{sessions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {sessions.map((session, index) => {
            const statusConfig = STATUS_CONFIG[session.status];
            const StatusIcon = statusConfig.icon;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:border-amber-500/30 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">
                          {session.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(new Date(session.createdAt), "d MMM yyyy à HH:mm", {
                            locale: fr,
                          })}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={statusConfig.variant}
                        className={`text-[10px] shrink-0 ${statusConfig.className}`}
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${COMPLEXITY_COLORS[session.complexity]}`}
                      >
                        {session.complexity}
                      </Badge>
                      {session.score !== null && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 text-amber-500" />
                          <span
                            className={
                              session.score >= 22
                                ? "text-emerald-500 font-medium"
                                : session.score >= 20
                                  ? "text-amber-500 font-medium"
                                  : "text-red-500 font-medium"
                            }
                          >
                            {session.score}/25
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleView(session)}
                      >
                        <Eye className="mr-1.5 h-3 w-3" />
                        Voir
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la session ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              La session &quot;{session.title}&quot; sera définitivement supprimée.
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(session.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}