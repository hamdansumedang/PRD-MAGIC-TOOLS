import { useState, useEffect } from "react";
import { Plus, History, FileText, ChevronRight, Download, Trash2, Cpu, ArrowLeft, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { PRD, ViewMode } from "./types";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.NEW);
  const [history, setHistory] = useState<PRD[]>([]);
  const [currentPRD, setCurrentPRD] = useState<PRD | null>(null);
  const [idea, setIdea] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("prd_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: PRD[]) => {
    setHistory(newHistory);
    localStorage.setItem("prd_history", JSON.stringify(newHistory));
  };

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/prd/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, context }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const data = await response.json();
      
      const newPRD: PRD = {
        id: crypto.randomUUID(),
        title: idea.length > 30 ? idea.substring(0, 30) + "..." : idea,
        idea,
        context,
        content: data.prd,
        createdAt: new Date().toISOString(),
      };

      const updatedHistory = [newPRD, ...history];
      saveHistory(updatedHistory);
      setCurrentPRD(newPRD);
      setViewMode(ViewMode.VIEW);
      setIdea("");
      setContext("");
    } catch (error) {
      console.error(error);
      alert("Gagal membuat PRD. Silakan periksa koneksi Anda.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Hapus PRD ini?")) {
      const updated = history.filter(p => p.id !== id);
      saveHistory(updated);
      if (currentPRD?.id === id) {
        setCurrentPRD(null);
        setViewMode(ViewMode.NEW);
      }
    }
  };

  const downloadMarkdown = (prd: PRD) => {
    const blob = new Blob([prd.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prd.title.replace(/\s+/g, "_")}_PRD.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* Sidebar */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-brand-line bg-white/50 backdrop-blur-sm">
        <div className="p-6 border-b border-brand-line">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand-accent flex items-center justify-center text-white rounded-sm shadow-lg shadow-brand-accent/20">
              <Cpu size={24} />
            </div>
            <div>
              <h1 className="font-mono text-xs font-bold uppercase tracking-tighter leading-tight">
                Architect<br />
                <span className="text-brand-accent">PRD AI</span>
              </h1>
            </div>
          </div>
          
          <button
            onClick={() => setViewMode(ViewMode.NEW)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all group",
              viewMode === ViewMode.NEW 
                ? "bg-brand-ink text-brand-bg shadow-lg shadow-brand-ink/20" 
                : "border border-brand-line hover:bg-brand-ink hover:text-brand-bg"
            )}
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span>Dokumen Baru</span>
            </div>
            <ChevronRight size={14} className={cn("transition-transform", viewMode === ViewMode.NEW && "rotate-90")} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="mono-label">Riwayat Log</div>
            <History size={14} className="opacity-40" />
          </div>

          <div className="space-y-1">
            {history.length === 0 ? (
              <div className="px-2 py-8 text-center">
                <FileText size={32} className="mx-auto mb-3 opacity-10" />
                <p className="text-xs opacity-40 italic">Belum ada dokumen yang diarsipkan.</p>
              </div>
            ) : (
              history.map((prd) => (
                <div
                  key={prd.id}
                  onClick={() => {
                    setCurrentPRD(prd);
                    setViewMode(ViewMode.VIEW);
                  }}
                  className={cn(
                    "group relative flex flex-col p-3 cursor-pointer transition-all",
                    currentPRD?.id === prd.id 
                      ? "bg-white border-l-4 border-brand-accent shadow-sm" 
                      : "hover:bg-white/40 border-l-4 border-transparent"
                  )}
                >
                  <h3 className="text-xs font-bold truncate pr-6">{prd.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="mono-label text-[9px]">
                      {format(new Date(prd.createdAt), "MMM d, HH:mm")}
                    </span>
                    <button
                      onClick={(e) => handleDelete(prd.id, e)}
                      className="opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-brand-line">
          <div className="p-3 bg-brand-ink/5 rounded-sm">
            <div className="mono-label mb-1">Status Sistem</div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono opacity-60">Gemini-3-Flash.Aktif</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto bg-[#F0EFEE] scroll-smooth">
        <AnimatePresence mode="wait">
          {viewMode === ViewMode.NEW ? (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-3xl mx-auto py-20 px-6"
            >
              <div className="mb-12">
                <div className="mono-label mb-2 text-brand-accent">Asy-Syifaa Framework</div>
                <h2 className="text-4xl font-mono font-bold uppercase tracking-tight leading-none mb-4">
                  Rancang ide besar<br />Anda berikutnya.
                </h2>
                <p className="text-sm opacity-60 max-w-lg leading-relaxed">
                  Masukkan konsep produk Anda di bawah ini. AI kami akan merancang PRD komprehensif 14 bagian berdasarkan standar perusahaan (enterprise).
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="mono-label">Ide / Nama Produk</label>
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="misal: Hub Logistik Terdesentralisasi Generasi Baru"
                    className="w-full bg-white border border-brand-line px-4 py-4 text-lg focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all placeholder:opacity-30"
                  />
                </div>

                <div className="space-y-3">
                  <label className="mono-label">Konteks / Kebutuhan Khusus (Opsional)</label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Jelaskan batasan spesifik, industri target, atau fitur utama yang ingin Anda tekankan..."
                    rows={6}
                    className="w-full bg-white border border-brand-line px-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all resize-none placeholder:opacity-30"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !idea.trim()}
                  className={cn(
                    "w-full py-4 flex items-center justify-center gap-3 transition-all font-mono uppercase tracking-widest text-sm",
                    isGenerating || !idea.trim()
                      ? "bg-brand-ink/10 cursor-not-allowed opacity-50"
                      : "bg-brand-accent text-white hover:scale-[1.01] active:scale-95 shadow-xl shadow-brand-accent/30"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sedang Merancang PRD...</span>
                    </>
                  ) : (
                    <>
                      <Cpu size={18} />
                      <span>Buat Struktur PRD</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-brand-line">
                  <div className="space-y-2">
                    <div className="mono-label">Mesin Framework</div>
                    <div className="text-[11px] opacity-40 leading-snug">
                      Didukung oleh Asy-Syifaa Framework, mencakup Visi, Arsitektur, dan Manajemen Risiko.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="mono-label">Standar Output</div>
                    <div className="text-[11px] opacity-40 leading-snug">
                      Markdown kelas Enterprise, siap untuk GitHub, Notion, atau wiki internal.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-full flex flex-col"
            >
              {currentPRD && (
                <>
                  <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-brand-line px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setViewMode(ViewMode.NEW)}
                        className="p-2 hover:bg-brand-ink/5 rounded-full transition-colors"
                      >
                        <ArrowLeft size={18} />
                      </button>
                      <div>
                        <h2 className="text-sm font-bold truncate max-w-xs">{currentPRD.title}</h2>
                        <span className="mono-label text-[9px]">{format(new Date(currentPRD.createdAt), "MMMM d, yyyy 'at' HH:mm")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => downloadMarkdown(currentPRD)}
                        className="flex items-center gap-2 px-4 py-2 border border-brand-line hover:bg-brand-ink hover:text-brand-bg transition-all text-sm font-mono uppercase tracking-tight"
                      >
                        <Download size={14} />
                        <span>Ekspor MD</span>
                      </button>
                    </div>
                  </header>

                  <div className="flex-1 max-w-4xl mx-auto py-12 px-8 w-full">
                    <div className="bg-white shadow-2xl p-8 sm:p-12 border border-brand-line">
                      <div className="markdown-body">
                        <ReactMarkdown>{currentPRD.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative Overlays */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 mono-label vertical-rl rotate-180">
          ARCHITECT.SYSTEM.LOG_v3.2.1
        </div>
        <div className="absolute bottom-4 left-80 p-4 opacity-5 mono-label">
          ASY_SYIFAA.FRAMEWORK.COMPLIANT
        </div>
      </div>
    </div>
  );
}

