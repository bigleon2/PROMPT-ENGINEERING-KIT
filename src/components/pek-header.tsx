"use client";

import { useTheme } from "next-themes";
import { BrainCircuit, Sun, Moon, Menu, Plus, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/lib/store";
import { useSyncExternalStore, useCallback } from "react";

const NAV_ITEMS = [
  { key: "session", label: "Nouvelle Session" },
  { key: "sessions", label: "Sessions" },
  { key: "templates", label: "Modèles" },
  { key: "knowledge", label: "Knowledge" },
  { key: "guide", label: "Guide" },
];

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function PekHeader() {
  const { theme, setTheme } = useTheme();
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, resetPipeline } = useAppStore();
  const mounted = useMounted();

  const handleNewSession = useCallback(() => {
    resetPipeline();
    setActiveTab("session");
    setSidebarOpen(false);
  }, [resetPipeline, setActiveTab, setSidebarOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/10 text-amber-500">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold tracking-tight leading-none">
              Prompt-Engineering-Kit
              <span className="ml-1.5 text-xs font-medium text-amber-500">v4.0</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Super-Agent Hybride CoT + Chaining
            </p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-sm font-semibold tracking-tight leading-none">PEK</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">v4.0</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.key}
              variant={activeTab === item.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(item.key)}
              className={`text-xs font-medium transition-colors ${
                activeTab === item.key
                  ? "bg-amber-600/10 text-amber-500 hover:bg-amber-600/15 hover:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.key === "session" && <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              {item.key === "knowledge" && <BookOpen className="mr-1.5 h-3.5 w-3.5" />}
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Basculer le thème</span>
            </Button>
          )}

          {/* New Session Button (Desktop) */}
          <Button
            size="sm"
            onClick={handleNewSession}
            className="hidden sm:flex bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nouvelle Session
          </Button>

          {/* Mobile Menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="flex items-center gap-2 text-amber-500">
                <BrainCircuit className="h-5 w-5" />
                PEK v4.0
              </SheetTitle>
              <div className="mt-6 flex flex-col gap-2">
                {NAV_ITEMS.map((item) => (
                  <Button
                    key={item.key}
                    variant={activeTab === item.key ? "secondary" : "ghost"}
                    className={`w-full justify-start text-sm ${
                      activeTab === item.key
                        ? "bg-amber-600/10 text-amber-500"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      setActiveTab(item.key);
                      setSidebarOpen(false);
                    }}
                  >
                    {item.key === "session" && <Sparkles className="mr-2 h-4 w-4" />}
                    {item.key === "knowledge" && <BookOpen className="mr-2 h-4 w-4" />}
                    {item.label}
                  </Button>
                ))}
                <div className="my-2 h-px bg-border" />
                <Button
                  onClick={handleNewSession}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Session
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}