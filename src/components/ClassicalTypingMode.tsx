import React, { useState } from 'react';
import { RefreshCw, BookOpen, Flame, Sparkles, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import TypingEngine from './TypingEngine';

const PRESET_ARTICLES = [
  {
    title: "科技與軟體開發 (Technology & Software)",
    difficulty: "intermediate",
    text: "Building scalable web software requires deep consideration of architectural paradigms, data flow, and browser efficiency. Modern frameworks prioritize modular layouts and optimized runtime states, allowing engineers to craft cohesive user journeys that execute beautifully on both mobile screens and wide desktop canvases."
  },
  {
    title: "咖啡工藝的藝術 (Coffee Crafting)",
    difficulty: "easy",
    text: "Brewing a perfect cup of coffee is both a daily ritual and a delicate science. From sourcing premium organic beans to managing hot water temperatures, every minor factor impacts the final taste profile. Take your time, focus on the grind size, and savor the warm aroma of fresh espresso."
  },
  {
    title: "極簡設計的哲學 (Minimalist Design)",
    difficulty: "hard",
    text: "True architectural minimalism is not merely the absence of clutter but the deliberate consolidation of functional form. It demands rigorous spatial discipline, where every negative margin, custom typographical weight, and empty surface actively collaborates to establish a serene, balanced atmosphere that feels quiet yet powerful."
  },
  {
    title: "探索地平線之外 (Traveling)",
    difficulty: "intermediate",
    text: "Exploring unfamiliar cities opens our minds to brand new cultures, historic architectures, and vibrant local cuisines. When we step outside our secure routines, we learn to communicate through shared smiles, appreciate diverse lifestyles, and discover hidden parts of ourselves that we never knew existed."
  }
];

interface ClassicalTypingModeProps {
  onSessionComplete: (wpm: number, accuracy: number, textLength: number, title: string) => void;
  presetOverride?: { title: string; difficulty: string; text: string };
}

export default function ClassicalTypingMode({ onSessionComplete, presetOverride }: ClassicalTypingModeProps) {
  const [selectedArticle, setSelectedArticle] = useState(presetOverride || PRESET_ARTICLES[0]);
  const [customTopic, setCustomTopic]           = useState('');
  const [customDifficulty, setCustomDifficulty] = useState<'easy' | 'intermediate' | 'hard'>('intermediate');
  const [isGenerating, setIsGenerating]         = useState(false);
  const [genError, setGenError]                 = useState('');
  // Mobile: collapsible article selector panel
  const [panelOpen, setPanelOpen] = useState(false);

  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;
    setIsGenerating(true);
    setGenError('');
    try {
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: customTopic, difficulty: customDifficulty })
      });
      if (!response.ok) throw new Error('無法生成自訂文章。請檢查您的網路與金鑰設定。');
      const data = await response.json();
      if (data.text) {
        setSelectedArticle({ title: `AI自訂：${customTopic}`, difficulty: customDifficulty, text: data.text });
        setCustomTopic('');
        setPanelOpen(false); // collapse after generating on mobile
      } else {
        throw new Error('AI 生成器未回傳文章內容。');
      }
    } catch (err: any) {
      setGenError(err.message || '連線至 AI 伺服器時發生錯誤。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = (wpm: number, accuracy: number, typedText: string) => {
    onSessionComplete(wpm, accuracy, typedText.length, selectedArticle.title);
  };

  const diffLabel = (d: string) =>
    d === 'easy' ? '簡單' : d === 'hard' ? '困難' : '中等';

  return (
    <div className="space-y-4" id="classical-typing-tab">

      {/* ── Mobile collapsible article picker ── */}
      <div className="lg:hidden bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <button
          onClick={() => setPanelOpen(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="truncate">
              {selectedArticle.title}
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
              selectedArticle.difficulty === 'easy'
                ? 'bg-emerald-50 text-emerald-700'
                : selectedArticle.difficulty === 'hard'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-amber-50 text-amber-700'
            }`}>
              {diffLabel(selectedArticle.difficulty)}
            </span>
          </div>
          {panelOpen
            ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
        </button>

        {panelOpen && (
          <div className="border-t border-slate-100 p-4 space-y-5 animate-fadeIn">
            {/* Preset buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">精選文章</span>
              {PRESET_ARTICLES.map((art, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedArticle(art); setPanelOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl border transition text-xs font-semibold flex items-center justify-between cursor-pointer ${
                    selectedArticle.title === art.title
                      ? 'bg-emerald-800 border-emerald-800 text-white'
                      : 'bg-white border-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate pr-2">{art.title}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                    selectedArticle.title === art.title
                      ? 'bg-amber-400 text-emerald-950'
                      : art.difficulty === 'easy'
                        ? 'bg-emerald-50 text-emerald-700'
                        : art.difficulty === 'hard'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                  }`}>{diffLabel(art.difficulty)}</span>
                </button>
              ))}
            </div>

            {/* AI generator */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800">AI 主題生成</span>
              </div>
              <form onSubmit={handleGenerateCustom} className="space-y-2">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="輸入主題：古羅馬、爵士樂..."
                  disabled={isGenerating}
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 bg-slate-50/50"
                  style={{ fontSize: '16px' }}
                />
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'intermediate', 'hard'] as const).map(diff => (
                    <button key={diff} type="button"
                      onClick={() => setCustomDifficulty(diff)}
                      disabled={isGenerating}
                      className={`py-2 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer transition ${
                        customDifficulty === diff
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-100 text-slate-500'
                      }`}>
                      {diffLabel(diff)}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={isGenerating || !customTopic.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50">
                  {isGenerating
                    ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>生成中...</span></>
                    : <><Sparkles className="h-3.5 w-3.5" /><span>一鍵生成專屬文章</span></>}
                </button>
              </form>
              {genError && (
                <p className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                  ⚠️ {genError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop: side-by-side layout (unchanged) ── */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-700" />
                選擇練習文章
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                選擇下方精選文章，或輸入主題讓 AI 教練打造專屬文章。
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider block">經典精選：</span>
              {PRESET_ARTICLES.map((art, idx) => (
                <button key={idx} onClick={() => setSelectedArticle(art)}
                  className={`w-full text-left p-3 rounded-xl border transition text-xs font-semibold flex items-center justify-between cursor-pointer hover-3d-shadow ${
                    selectedArticle.title === art.title
                      ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs'
                      : 'bg-white border-slate-100 text-slate-700 hover:border-emerald-500/30'
                  }`}>
                  <span className="truncate pr-2">{art.title}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    selectedArticle.title === art.title
                      ? 'bg-amber-400 text-emerald-950'
                      : art.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700'
                      : art.difficulty === 'hard' ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>{diffLabel(art.difficulty)}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI 智慧主題文章生成</span>
              </div>
              <form onSubmit={handleGenerateCustom} className="space-y-3">
                <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="例如：古羅馬歷史、賽博龐克、爵士樂..." disabled={isGenerating}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600 bg-slate-50/50"
                  style={{ fontSize: '16px' }} />
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'intermediate', 'hard'] as const).map(diff => (
                    <button key={diff} type="button" onClick={() => setCustomDifficulty(diff)} disabled={isGenerating}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer transition ${
                        customDifficulty === diff ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-100 text-slate-500'
                      }`}>{diffLabel(diff)}</button>
                  ))}
                </div>
                <button type="submit" disabled={isGenerating || !customTopic.trim()}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50">
                  {isGenerating
                    ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Gemini 正在撰寫中...</span></>
                    : <><Sparkles className="h-3.5 w-3.5" /><span>一鍵生成專屬文章</span></>}
                </button>
              </form>
              {genError && <p className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg leading-normal">⚠️ {genError}</p>}
            </div>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3.5 text-[11px] text-emerald-800 leading-normal mt-6">
            <Flame className="h-3.5 w-3.5 text-amber-500 inline mr-1.5" />
            目前練習：<strong>{selectedArticle.title}</strong> ({diffLabel(selectedArticle.difficulty)})
          </div>
        </div>

        {/* Typing arena */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-2xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="text-sm font-extrabold text-slate-800">{selectedArticle.title}</h4>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md">
              {diffLabel(selectedArticle.difficulty) === '簡單' ? '簡單 (Easy)' : diffLabel(selectedArticle.difficulty) === '困難' ? '困難 (Hard)' : '中等 (Intermediate)'}
            </span>
          </div>
          <TypingEngine mode="copy" targetText={selectedArticle.text} onComplete={handleComplete} />
        </div>
      </div>

      {/* ── Mobile: Typing arena below the collapsible ── */}
      <div className="lg:hidden">
        <TypingEngine mode="copy" targetText={selectedArticle.text} onComplete={handleComplete} />
      </div>
    </div>
  );
}
