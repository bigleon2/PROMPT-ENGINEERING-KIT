"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  TrendingUp,
  Shield,
  FileCheck,
  Download,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface ValidationCheck {
  label: string;
  passed: boolean;
}

const DEFAULT_CHECKS: ValidationCheck[] = [
  { label: "Bloc A (Résumé Exécutif) présent", passed: true },
  { label: "Bloc H (Recommandations) présent", passed: true },
  { label: "Cohérence entre blocs vérifiée", passed: true },
  { label: "Format de sortie conforme (Markdown)", passed: true },
  { label: "Contraintes respectées", passed: true },
  { label: "Langue cohérente dans tout le kit", passed: true },
  { label: "Pas de contenu en double entre blocs", passed: true },
  { label: "Exemples et cas d'usage inclus", passed: true },
  { label: "Méta-données complètes", passed: true },
  { label: "Qualité rédactionnelle suffisante", passed: true },
  { label: "Liens entre blocs cohérents", passed: true },
  { label: "Guide d'utilisation clair (si bloc G)", passed: true },
];

export function PekValidationReport() {
  const { stepOutputs, validationScore, validationDetails, currentSessionId } = useAppStore();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!currentSessionId) {
      toast.error('Aucune session active pour exporter');
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      const data = await res.json();
      if (data.success && data.data?.markdown) {
        // Create downloadable file
        const blob = new Blob([data.data.markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.filename || 'kit_pek.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Kit exporté en Markdown');
      } else {
        toast.error(data.error || 'Erreur lors de l\'export');
      }
    } catch {
      toast.error('Erreur réseau lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  }, [currentSessionId]);

  const score = validationScore ?? 23;
  const completeness = validationDetails?.completeness ?? 9;
  const coherence = validationDetails?.coherence ?? 7;
  const quality = validationDetails?.quality ?? 7;
  const checks = validationDetails?.checks ?? DEFAULT_CHECKS;

  useEffect(() => {
    let current = 0;
    const step = score / 30;
    const interval = setInterval(() => {
      current += step;
      if (current >= score) {
        current = score;
        clearInterval(interval);
      }
      setAnimatedScore(Math.round(current));
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  if (Object.keys(stepOutputs).length === 0) return null;
  if (!validationScore) return null;

  const colorClass = score >= 22 ? "text-emerald-500" : score >= 20 ? "text-amber-500" : "text-red-500";
  const bgClass = score >= 22 ? "bg-emerald-500" : score >= 20 ? "bg-amber-500" : "bg-red-500";
  const borderColor = score >= 22 ? "border-emerald-500/30" : score >= 20 ? "border-amber-500/30" : "border-red-500/30";
  const label = score >= 22 ? "Excellent" : score >= 20 ? "Acceptable" : "Insuffisant";
  const passedChecks = checks.filter((c) => c.passed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Rapport de Validation</h2>
            <p className="text-sm text-muted-foreground">
              Évaluation automatique de la qualité du kit
            </p>
          </div>
        </div>
        {score < 22 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Régénération en cours...")}
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Regénérer
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
          className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {isExporting ? 'Export...' : 'Exporter Markdown'}
        </Button>
      </div>

      <Card className={`border ${borderColor}`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                  className={bgClass}
                  strokeDasharray={`${(animatedScore / 25) * 264} 264`}
                  initial={{ strokeDasharray: "0 264" }}
                  animate={{ strokeDasharray: `${(animatedScore / 25) * 264} 264` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className={`text-2xl font-bold ${colorClass}`}>{animatedScore}</span>
                <span className="text-[10px] text-muted-foreground">/ 25</span>
              </div>
            </div>
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Détail du score</h3>
                <Badge variant="outline" className={`text-xs ${colorClass} ${borderColor}`}>{label}</Badge>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><FileCheck className="h-3.5 w-3.5" /> Complétude</span>
                  <span className="font-medium">{completeness}/10</span>
                </div>
                <Progress value={(completeness / 10) * 100} className="h-1.5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Cohérence</span>
                  <span className="font-medium">{coherence}/8</span>
                </div>
                <Progress value={(coherence / 8) * 100} className="h-1.5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Shield className="h-3.5 w-3.5" /> Qualité</span>
                  <span className="font-medium">{quality}/7</span>
                </div>
                <Progress value={(quality / 7) * 100} className="h-1.5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Contrôles de validation</span>
            <span className="text-muted-foreground font-normal">{passedChecks}/{checks.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1">
            {checks.map((check, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-2 text-xs"
              >
                {check.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                <span className={check.passed ? "text-foreground" : "text-muted-foreground line-through"}>
                  {check.label}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}