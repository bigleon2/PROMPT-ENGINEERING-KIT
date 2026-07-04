"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Layers, Shield, Award } from "lucide-react";

const METHODOLOGY_STEPS = [
  {
    id: "1",
    title: "Compréhension",
    description:
      "Analyse approfondie du contexte, des objectifs et des contraintes du projet. Le système identifie les éléments clés, les dépendances et les exigences spécifiques.",
    details: [
      "Analyse sémantique du contenu source",
      "Identification des acteurs et personas",
      "Extraction des objectifs principaux et secondaires",
      "Cartographie des contraintes techniques",
    ],
  },
  {
    id: "2",
    title: "Décomposition",
    description:
      "Découpage du projet en blocs fonctionnels cohérents. Identification des dépendances entre composants et définition de l'ordre de génération optimal.",
    details: [
      "Identification des blocs pertinents (A-J)",
      "Analyse des dépendances inter-blocs",
      "Définition de l'ordre de génération",
      "Validation de la couverture fonctionnelle",
    ],
  },
  {
    id: "3",
    title: "Extraction",
    description:
      "Extraction des données clés, patterns et structures à partir du contenu source. Normalisation et classification des informations.",
    details: [
      "Extraction des entités et relations",
      "Identification des patterns récurrents",
      "Classification des données par type",
      "Normalisation des formats",
    ],
  },
  {
    id: "4",
    title: "Structuration",
    description:
      "Organisation logique du contenu dans le format PEK standard. Mise en place de la hiérarchie et des sections pour chaque bloc.",
    details: [
      "Application du template PEK standard",
      "Création de la hiérarchie de sections",
      "Définition des liens entre blocs",
      "Mise en forme des métadonnées",
    ],
  },
  {
    id: "5",
    title: "Génération",
    description:
      "Génération du contenu détaillé pour chaque bloc sélectionné, en respectant les standards de qualité PEK et les contraintes définies.",
    details: [
      "Génération séquentielle par bloc",
      "Application des templates de contenu",
      "Intégration des données extraites",
      "Respect des contraintes de format",
    ],
  },
  {
    id: "6",
    title: "Validation",
    description:
      "Vérification complète de la cohérence, de la complétude et de la qualité du kit généré. Scoring sur 25 points.",
    details: [
      "Vérification de la complétude (10 pts)",
      "Test de cohérence interne (8 pts)",
      "Évaluation de la qualité rédactionnelle (7 pts)",
      "Génération du rapport de validation",
    ],
  },
  {
    id: "7",
    title: "Amélioration",
    description:
      "Optimisation et affinage du kit final basé sur les résultats de la validation. Itérations pour atteindre le score cible.",
    details: [
      "Correction des erreurs identifiées",
      "Amélioration de la clarté rédactionnelle",
      "Optimisation de la structure",
      "Validation finale du kit",
    ],
  },
];

const BLOCS = [
  {
    id: "A",
    name: "Résumé Exécutif",
    required: true,
    description:
      "Vue d'ensemble du kit incluant les objectifs, le périmètre et les points clés. C'est le point d'entrée du kit qui donne une compréhension immédiate du projet.",
  },
  {
    id: "B",
    name: "Architecture & Composants",
    required: false,
    description:
      "Description détaillée de l'architecture technique, des composants principaux, de leurs interactions et des dépendances.",
  },
  {
    id: "C",
    name: "Prompt / Instructions",
    required: false,
    description:
      "Prompts principaux et instructions détaillées pour l'utilisation du système, avec exemples et variantes.",
  },
  {
    id: "D",
    name: "Données & Schemas",
    required: false,
    description:
      "Structures de données, schémas de validation, formats d'entrée/sortie et exemples de payloads.",
  },
  {
    id: "E",
    name: "Contraintes & Règles",
    required: false,
    description:
      "Règles métier, contraintes techniques, limites du système et garde-fous à respecter.",
  },
  {
    id: "F",
    name: "Résultats & Outputs",
    required: false,
    description:
      "Formats de sortie attendus, exemples concrets, cas d'utilisation et résultats de référence.",
  },
  {
    id: "G",
    name: "Guide d'Utilisation",
    required: false,
    recommended: true,
    description:
      "Instructions pas-à-pas pour utiliser le kit, avec workflows typiques et bonnes pratiques.",
  },
  {
    id: "H",
    name: "Recommandations",
    required: true,
    description:
      "Bonnes pratiques, optimisations de performance, conseils d'expert et pièges à éviter.",
  },
  {
    id: "I",
    name: "Tests & Validation",
    required: false,
    description:
      "Cas de test, critères de validation, scénarios d'erreur et procédures de vérification.",
  },
  {
    id: "J",
    name: "Glossaire & Références",
    required: false,
    description:
      "Termes techniques, acronymes, sources externes et références pour approfondir.",
  },
];

export function PekGuide() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Guide</h2>
          <p className="text-sm text-muted-foreground">
            Méthodologie et documentation PEK v4.0
          </p>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["methodology", "blocs"]}
        className="space-y-3"
      >
        {/* Methodology Section */}
        <AccordionItem
          value="methodology"
          className="rounded-xl border border-border/50 bg-muted/20 px-4"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Méthodologie Chain-of-Thought (7 étapes)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Le pipeline PEK utilise une approche Chain-of-Thought en 7 étapes
                pour garantir la qualité et la cohérence de chaque kit généré.
                Chaque étape construit sur les résultats de la précédente.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {METHODOLOGY_STEPS.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">
                        {step.id}
                      </span>
                      <span className="text-sm font-medium">{step.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {step.description}
                    </p>
                    <ul className="space-y-1">
                      {step.details.map((detail, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-muted-foreground/70 flex items-start gap-1.5"
                        >
                          <span className="text-amber-500/50 mt-0.5">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Blocs Section */}
        <AccordionItem
          value="blocs"
          className="rounded-xl border border-border/50 bg-muted/20 px-4"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Layers className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Blocs A-J</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Chaque kit PEK est composé de blocs modulaires (A à J) qui
                couvrent tous les aspects d&apos;un projet de prompt engineering.
                Les blocs A et H sont obligatoires.
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {BLOCS.map((bloc) => (
                  <div
                    key={bloc.id}
                    className="rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-amber-500">
                        {bloc.id}.
                      </span>
                      <span className="text-sm font-medium">{bloc.name}</span>
                      {bloc.required && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500"
                        >
                          Obligatoire
                        </Badge>
                      )}
                      {bloc.recommended && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-500"
                        >
                          Recommandé
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bloc.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Constraints Section */}
        <AccordionItem
          value="constraints"
          className="rounded-xl border border-border/50 bg-muted/20 px-4"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Contraintes & Limites</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/50 p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Contraintes techniques
                </h4>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Format de sortie : Markdown structuré avec en-têtes cohérents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Longueur maximale par bloc : 2000 mots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Blocs obligatoires : A (Résumé) et H (Recommandations)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Langue par défaut : Français (configurable)</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border/50 p-4 space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Limites connues
                </h4>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Les sources PDF nécessitent une extraction OCR préalable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Les projets multi-langues sont mieux gérés en anglais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>La complexité &quot;complexe&quot; peut nécessiter plus de temps de traitement</span>
                  </li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Quality Control Section */}
        <AccordionItem
          value="quality"
          className="rounded-xl border border-border/50 bg-muted/20 px-4"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Contrôle Qualité</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Chaque kit est évalué sur un score de <strong className="text-foreground">25 points</strong> répartis comme suit :
              </p>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-border/50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-500">10</div>
                  <div className="text-xs font-medium text-foreground mt-1">Complétude</div>
                  <div className="text-[11px]">Tous les blocs requis présents et remplis</div>
                </div>
                <div className="rounded-lg border border-border/50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-500">8</div>
                  <div className="text-xs font-medium text-foreground mt-1">Cohérence</div>
                  <div className="text-[11px]">Cohérence interne et logique entre blocs</div>
                </div>
                <div className="rounded-lg border border-border/50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-500">7</div>
                  <div className="text-xs font-medium text-foreground mt-1">Qualité</div>
                  <div className="text-[11px]">Clarté, précision et utilité du contenu</div>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Barème de qualité
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>
                      <strong className="text-emerald-500">≥ 22/25</strong> — Excellent,
                      prêt à l&apos;export
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                    <span>
                      <strong className="text-amber-500">20-21/25</strong> — Acceptable,
                      améliorations recommandées
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>
                      <strong className="text-red-500">&lt; 20/25</strong> — Insuffisant,
                      régénération requise
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}