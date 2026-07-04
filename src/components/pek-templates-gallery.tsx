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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Bot,
  Database,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  Plus,
  Layers,
} from "lucide-react";
import { useAppStore, DEFAULT_TEMPLATES, BLOCK_CONFIGS, type BlockId, type Template } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ElementType> = {
  Globe,
  Bot,
  Database,
  BookOpen,
  GraduationCap,
};

export function PekTemplatesGallery() {
  const { setSelectedBlocks, setActiveTab, setShowTemplateDialog } = useAppStore();
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    blocks: [] as BlockId[],
  });

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const handleUseTemplate = (template: Template) => {
    setSelectedBlocks(template.blocks);
    setActiveTab("session");
    toast.success(`Modèle "${template.name}" appliqué — ${template.blocks.length} blocs sélectionnés`);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || newTemplate.blocks.length === 0) {
      toast.error("Nom et au moins un bloc requis");
      return;
    }

    const template: Template = {
      id: `tpl-custom-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      blocks: newTemplate.blocks,
      systemPrompt: newTemplate.systemPrompt,
      icon: "Layers",
    };

    setCustomTemplates((prev) => [...prev, template]);
    setNewTemplate({ name: "", description: "", systemPrompt: "", blocks: [] });
    toast.success("Modèle créé avec succès");
  };

  const toggleNewTemplateBlock = (block: BlockId) => {
    setNewTemplate((prev) => ({
      ...prev,
      blocks: prev.blocks.includes(block)
        ? prev.blocks.filter((b) => b !== block)
        : [...prev.blocks, block],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Modèles</h2>
            <p className="text-sm text-muted-foreground">
              {allTemplates.length} modèle{allTemplates.length > 1 ? "s" : ""}{" "}
              disponible{allTemplates.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un modèle</DialogTitle>
              <DialogDescription>
                Définissez un modèle réutilisable pour vos futures sessions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Nom du modèle</Label>
                <Input
                  id="tpl-name"
                  placeholder="Ex: Kit API REST"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-desc">Description</Label>
                <Textarea
                  id="tpl-desc"
                  placeholder="Description du modèle..."
                  className="min-h-[60px] resize-y"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tpl-prompt">System Prompt</Label>
                <Textarea
                  id="tpl-prompt"
                  placeholder="Instructions système pour le modèle..."
                  className="min-h-[80px] resize-y font-mono text-xs"
                  value={newTemplate.systemPrompt}
                  onChange={(e) =>
                    setNewTemplate((p) => ({ ...p, systemPrompt: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Blocs à inclure</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_CONFIGS.map((block) => {
                    const isSelected = newTemplate.blocks.includes(block.id);
                    return (
                      <label
                        key={block.id}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-all text-xs hover:bg-muted/50 ${
                          isSelected
                            ? "border-amber-500/50 bg-amber-500/5"
                            : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleNewTemplateBlock(block.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="font-medium">
                          {block.id}. {block.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateTemplate}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Créer le modèle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allTemplates.map((template, index) => {
          const Icon = ICON_MAP[template.icon] || Layers;

          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:border-amber-500/30 transition-all h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600/10 text-amber-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {template.blocks.map((block) => (
                      <Badge
                        key={block}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 font-mono"
                      >
                        {block}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/5"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Layers className="mr-1.5 h-3 w-3" />
                    Utiliser
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}