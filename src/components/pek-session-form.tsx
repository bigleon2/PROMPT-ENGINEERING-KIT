"use client";

import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  FileText,
  Target,
  Shield,
  Lock,
  Info,
  Upload,
  ClipboardPaste,
  FileUp,
  FolderOpen,
  X,
  CheckCircle2,
} from "lucide-react";
import { useAppStore, BLOCK_CONFIGS, type BlockId } from "@/lib/store";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const sessionSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  sourceContent: z.string().min(20, "Le contenu source doit contenir au moins 20 caractères"),
  expectedResults: z.string().optional(),
  constraints: z.string().optional(),
  inputFormat: z.enum(["markdown", "json", "yaml", "code", "url", "pdf"]),
  complexity: z.enum(["simple", "moyen", "complexe"]),
  language: z.enum(["fr", "en"]),
  executionMode: z.enum(["cot", "chaining", "hybride"]),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

async function pollStepStatus(sessionId: string): Promise<void> {
  for (let stepNum = 1; stepNum <= 7; stepNum++) {
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/steps/${stepNum}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const stepData = data.data;

            useAppStore.getState().setSteps((prev) =>
              prev.map((s, i) => {
                if (i + 1 === stepNum) {
                  const newStatus = stepData.status === 'completed' ? 'done' as const
                    : stepData.status === 'running' ? 'active' as const
                    : stepData.status === 'error' ? 'error' as const
                    : s.status;
                  return {
                    ...s,
                    status: newStatus,
                    duration: stepData.duration || null,
                    output: stepData.output || undefined,
                  };
                }
                if (i + 1 === stepNum - 1 && stepData.status === 'running') {
                  return { ...s, status: 'done' as const };
                }
                return s;
              })
            );

            if (stepData.status === 'completed' && stepData.output) {
              useAppStore.getState().setStepOutput(stepNum - 1, stepData.output);
            }

            if (stepData.status === 'completed' || stepData.status === 'error') {
              break;
            }
          }
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
    }
  }
}

export function PekSessionForm() {
  const {
    selectedBlocks,
    toggleBlock,
    setIsGenerating,
    setActiveTab,
    setSteps,
    setCurrentStep,
    setStepOutput,
    resetPipeline,
    setCurrentSessionId,
    setSessions,
    setValidationScore,
    setValidationDetails,
  } = useAppStore();

  const [blockSelectionMode, setBlockSelectionMode] = useState<'manual' | 'auto'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadedFileInfo, setLoadedFileInfo] = useState<{
    files: { filename: string; lines: number; chars: number; format: string }[];
    totalLines: number;
    totalChars: number;
  } | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      description: "",
      sourceContent: "",
      expectedResults: "",
      constraints: "",
      inputFormat: "markdown",
      complexity: "moyen",
      language: "fr",
      executionMode: "cot",
    },
  });

  const handleFilesLoad = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;

    // Size check total
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 5 * 1024 * 1024) {
      toast.error("Taille totale trop volumineuse (max 5 Mo)");
      return;
    }

    setIsLoadingFile(true);
    setLoadedFileInfo(null);

    try {
      const allContents: string[] = [];
      const fileInfos: { filename: string; lines: number; chars: number; format: string }[] = [];
      let totalLines = 0;
      let totalChars = 0;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-source", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          const content = data.data.content as string;
          allContents.push(`═════════════════════════════════════════\nFICHIER : ${data.data.filename}\n═════════════════════════════════════════\n${content}\n`);
          fileInfos.push({ filename: data.data.filename, lines: data.data.lines, chars: data.data.chars, format: data.data.format });
          totalLines += data.data.lines;
          totalChars += data.data.chars;
        }
      }

      if (allContents.length === 0) {
        toast.error("Aucun fichier n'a pu être chargé");
        return;
      }

      const combined = allContents.join('\n');
      form.setValue("sourceContent", combined, { shouldValidate: true });

      // Auto-detect format from first file
      if (fileInfos[0].format && fileInfos[0].format !== "text") {
        const validFormats = ["markdown", "json", "yaml", "code", "url", "pdf"];
        if (validFormats.includes(fileInfos[0].format)) {
          form.setValue("inputFormat", fileInfos[0].format as SessionFormValues["inputFormat"], { shouldValidate: true });
        }
      }

      setLoadedFileInfo({ files: fileInfos, totalLines, totalChars });

      if (files.length === 1) {
        toast.success(`Fichier "${fileInfos[0].filename}" chargé (${totalLines} lignes)`);
      } else {
        toast.success(`${files.length} fichiers chargés (${totalLines} lignes totales)`);
      }
    } catch {
      toast.error("Erreur réseau lors du chargement");
    } finally {
      setIsLoadingFile(false);
    }
  }, [form]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length > 0) {
        handleFilesLoad(Array.from(e.dataTransfer.files));
      }
    },
    [handleFilesLoad]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        handleFilesLoad(Array.from(fileList));
      }
      e.target.value = "";
    },
    [handleFilesLoad]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        handleFilesLoad(Array.from(fileList));
      }
      e.target.value = "";
    },
    [handleFilesLoad]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = e.clipboardData.getData("text");
      if (pastedText) {
        // Let the default paste happen, then ensure form validation triggers
        requestAnimationFrame(() => {
          const current = form.getValues("sourceContent");
          form.setValue("sourceContent", current, { shouldValidate: true });
        });
      }
    },
    [form]
  );

  const clearLoadedFile = useCallback(() => {
    setLoadedFileInfo(null);
    form.setValue("sourceContent", "", { shouldValidate: true });
  }, [form]);

  const onSubmit = useCallback(
    async (formData: SessionFormValues) => {
      if (blockSelectionMode === 'manual' && selectedBlocks.length < 2) {
        toast.error("Selectionnez au moins 2 blocs pour generer un kit.");
        return;
      }

      resetPipeline();
      setIsGenerating(true);

      try {
        // 1. Create session via API
        const createRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            context: formData.description,
            sourceMaterial: formData.sourceContent,
            results: formData.expectedResults || '',
            constraints: formData.constraints || '',
            inputFormat: formData.inputFormat,
            selectedBlocks: blockSelectionMode === 'auto' ? 'auto' : selectedBlocks.join(','),
            complexity: formData.complexity,
            language: formData.language,
            executionMode: formData.executionMode,
          }),
        });

        const createData = await createRes.json();
        if (!createData.success || !createData.data?.id) {
          throw new Error(createData.error || 'Erreur de creation de session');
        }

        const sessionId = createData.data.id;
        setCurrentSessionId(sessionId);
        toast.success('Session creee. Lancement du pipeline CoT...');

        // 2. Start polling for step updates in background
        pollStepStatus(sessionId).then(() => {
          setIsGenerating(false);
        });

        // 3. Execute the pipeline (non-blocking)
        fetch(`/api/sessions/${sessionId}/execute`, { method: 'POST' })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              // Load final validation
              setSteps((prev) =>
                prev.map((s) =>
                  s.status !== 'error' ? { ...s, status: 'done' as const } : s
                )
              );
              setCurrentStep(6);
              setIsGenerating(false);

              // Fetch real validation from DB
              fetch(`/api/sessions/${sessionId}`)
                .then((r) => r.json())
                .then((sessionData) => {
                  if (sessionData.success && sessionData.data?.validations?.length > 0) {
                    const v = sessionData.data.validations[0];
                    setValidationScore(v.totalScore);
                    try {
                      const checks = typeof v.checks === 'string' ? JSON.parse(v.checks) : v.checks;
                      setValidationDetails({
                        completeness: v.completeness,
                        coherence: v.coherence,
                        quality: v.quality,
                        checks: Array.isArray(checks)
                          ? checks.map((c: { label: string; passed: boolean; detail?: string }) => ({
                              label: c.label,
                              passed: c.passed,
                            }))
                          : [],
                      });
                    } catch {
                      setValidationDetails({
                        completeness: v.completeness,
                        coherence: v.coherence,
                        quality: v.quality,
                        checks: [],
                      });
                    }
                  }
                })
                .catch(() => {
                  // Fallback: try to extract from step output
                  const validationStep = data.data?.steps?.find(
                    (s: { stepNumber: number }) => s.stepNumber === 6
                  );
                  if (validationStep?.output) {
                    const scoreMatch = validationStep.output.match(/(\d{1,2})\s*\/\s*25/);
                    if (scoreMatch) {
                      setValidationScore(parseInt(scoreMatch[1], 10));
                    }
                  }
                });

              toast.success('Kit genere avec succes !');
              // Refresh sessions list
              fetch('/api/sessions').then((r) => r.json()).then((r) => {
                if (r.success) setSessions(r.data);
              });
            } else {
              toast.error('Erreur: ' + (data.error || 'Pipeline echoue'));
              setIsGenerating(false);
            }
          })
          .catch((err) => {
            toast.error('Erreur reseau: ' + err.message);
            setIsGenerating(false);
          });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
        setIsGenerating(false);
      }
    },
    [selectedBlocks, blockSelectionMode, resetPipeline, setIsGenerating, setCurrentSessionId, setSteps, setCurrentStep, setStepOutput, setSessions, setValidationScore, setValidationDetails]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Nouvelle Session</h2>
          <p className="text-sm text-muted-foreground">
            Configurez votre session et lancez l&apos;analyse CoT
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                Informations de base
              </CardTitle>
              <CardDescription>
                Decrivez votre projet et le contexte de votre kit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du projet</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Kit Agent de Support Client"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description du contexte</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Decrivez le contexte global de votre projet et les objectifs du kit..."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source Content with File Upload */}
              <FormField
                control={form.control}
                name="sourceContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenu source du projet</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {/* Action buttons row */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoadingFile}
                          >
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Parcourir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
                            onClick={() => folderInputRef.current?.click()}
                            disabled={isLoadingFile}
                          >
                            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                            Dossier
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            fichiers multiples, dossier, ou collez directement (Ctrl+V)
                          </p>
                        </div>

                        {/* Hidden file input (multiple files) */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".txt,.md,.markdown,.json,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.cs,.php,.html,.css,.scss,.xml,.sql,.sh,.toml,.ini,.csv,.log,.vue,.svelte,.astro"
                          className="hidden"
                          onChange={handleFileInputChange}
                        />

                        {/* Hidden folder input */}
                        <input
                          ref={folderInputRef}
                          type="file"
                          {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                          className="hidden"
                          onChange={handleFolderInputChange}
                        />

                        {/* Dropzone area */}
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          className={`relative rounded-lg border-2 border-dashed transition-all ${
                            isDragOver
                              ? "border-amber-500 bg-amber-500/5"
                              : "border-border hover:border-amber-500/30"
                          }`}
                        >
                          {/* Loading overlay */}
                          {isLoadingFile && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                              <div className="flex items-center gap-2 text-sm text-amber-500">
                                <FileUp className="h-4 w-4 animate-bounce" />
                                <span>Chargement des fichiers...</span>
                              </div>
                            </div>
                          )}

                          {loadedFileInfo && !isLoadingFile && (
                            <div className="flex items-center justify-between px-3 py-2 bg-amber-500/5 border-b border-amber-500/10">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                {loadedFileInfo.files.length === 1 ? (
                                  <>
                                    <span className="text-xs font-medium truncate">{loadedFileInfo.files[0].filename}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500 shrink-0">
                                      {loadedFileInfo.files[0].format}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                      {loadedFileInfo.files[0].lines} lignes &middot; {(loadedFileInfo.files[0].chars / 1024).toFixed(1)} Ko
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs font-medium">
                                    {loadedFileInfo.files.length} fichiers &middot; {loadedFileInfo.totalLines} lignes &middot; {(loadedFileInfo.totalChars / 1024).toFixed(1)} Ko
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={clearLoadedFile}
                                className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                                title="Supprimer le contenu"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          )}

                          {/* Textarea */}
                          <Textarea
                            placeholder="Collez ici le contenu source (Ctrl+V), glissez un fichier, ou cliquez Parcourir pour selectionner un fichier de votre ordinateur..."
                            className="min-h-[200px] resize-y border-0 rounded-lg focus-visible:ring-0 shadow-none"
                            onPaste={handlePaste}
                            {...field}
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Le contenu source sera analyse par le pipeline CoT pour extraire les informations cles.
                      Formats acceptes : TXT, MD, JSON, YAML, code source, etc. (max 5 Mo).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Expectations & Constraints Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Resultats & Contraintes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="expectedResults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultats attendus <span className="text-muted-foreground font-normal text-xs ml-1.5">(optionnel)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Decrivez les resultats et livrables attendus du kit..."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="constraints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraintes <span className="text-muted-foreground font-normal text-xs ml-1.5">(optionnel)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Contraintes techniques, limites, exigences specifiques..."
                        className="min-h-[80px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="executionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode d&apos;execution</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cot">CoT (Chain-of-Thought)</SelectItem>
                        <SelectItem value="chaining">Prompt Chaining</SelectItem>
                        <SelectItem value="hybride">Hybride Auto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-muted-foreground">
                      {field.value === 'cot' && '7 etapes sequentielles avec accumulation de contexte'}
                      {field.value === 'chaining' && '4 etapes pipeline : Preparation → Traitement → Verification → Optimisation'}
                      {field.value === 'hybride' && 'Bascule automatiquement entre CoT et Chaining selon la complexite'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="inputFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format d&apos;entree <span className="text-muted-foreground font-normal text-xs ml-1.5">(optionnel)</span></FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="markdown">Markdown</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="yaml">YAML</SelectItem>
                          <SelectItem value="code">Code</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complexity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complexite</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="moyen">Moyen</SelectItem>
                          <SelectItem value="complexe">Complexe</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Langue</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Blocks Selection Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                Selection des Blocs
              </CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        blockSelectionMode === 'manual'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setBlockSelectionMode('manual')}
                    >
                      Manuel
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        blockSelectionMode === 'auto'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setBlockSelectionMode('auto')}
                    >
                      Automatique
                    </button>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {blockSelectionMode === 'auto' ? 'Auto' : `${selectedBlocks.length} selectionne${selectedBlocks.length > 1 ? 's' : ''}`}
                  </Badge>
                </div>
              </CardDescription>
            </CardHeader>
            {blockSelectionMode === 'auto' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Les blocs optimaux seront selectionnes automatiquement par l&apos;IA selon le contexte et la complexite.
                </p>
              </div>
            )}
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {BLOCK_CONFIGS.map((block) => {
                  const isSelected = selectedBlocks.includes(block.id);
                  return (
                    <label
                      key={block.id}
                      className={
                        "flex items-start gap-3 rounded-lg border p-3 " +
                        (blockSelectionMode === 'auto' || block.required
                          ? "cursor-default "
                          : "cursor-pointer ") +
                        "transition-all " +
                        (blockSelectionMode === 'auto' && block.recommended
                          ? "border-amber-500/30 bg-amber-500/5"
                          : isSelected
                            ? "border-amber-500/50 bg-amber-500/5"
                            : "border-border" + (blockSelectionMode === 'auto' ? " opacity-60" : ""))
                      }
                      aria-disabled={blockSelectionMode === 'auto' || block.required}
                    >
                      <Checkbox
                        checked={isSelected || (blockSelectionMode === 'auto' && block.recommended)}
                        onCheckedChange={() => toggleBlock(block.id)}
                        className="mt-0.5"
                        disabled={blockSelectionMode === 'auto' || block.required}
                        aria-disabled={blockSelectionMode === 'auto' || block.required}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {block.id}. {block.name}
                          </span>
                          {block.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-500"
                            >
                              Obligatoire
                            </Badge>
                          )}
                          {block.recommended && !block.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-500"
                            >
                              Recommande
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {block.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 transition-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Lancer l&apos;analyse CoT
            </Button>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Le pipeline executera les 7 etapes Chain-of-Thought automatiquement
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}