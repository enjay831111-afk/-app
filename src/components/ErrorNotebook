import React, { useState } from 'react';
import { ErrorCategory, WritingError, CATEGORY_CHINESE } from '../types';
import { BookOpen, AlertCircle, Sparkles, Keyboard, Trophy, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import TypingEngine from './TypingEngine';

interface ErrorNotebookProps {
  errors: WritingError[];
  onClearAllErrors: () => void;
  onSessionComplete: (wpm: number, accuracy: number, textLength: number, title: string) => void;
}

interface InlinePracticeState {
  targetText: string;
  typedText: string;
  isCompleted: boolean;
}

export default function ErrorNotebook({ errors, onClearAllErrors, onSessionComplete }: ErrorNotebookProps) {
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'All'>('All');
  const [reviewMode, setReviewMode]             = useState(false);
  const [currentReviewText, setCurrentReviewText] = useState('');
  const [reviewSessionStats, setReviewSessionStats] = useState<{ wpm: number; accuracy: number } | null>(null);
  const [practiceStates, setPracticeStates]     = useState<Record<string, InlinePracticeState>>({});

  const startInlinePractice = (id: string, text: string) => {
    setPracticeStates(prev => ({ ...prev, [id]: { targetText: text, typedText: '', isCompleted: false } }));
  };

  const renderInlinePractice = (id: string, targetText: string) => {
    const p = practiceStates[id];
    if (!p || p.targetText !== targetText) return null;
    const { typedText, isCompleted } = p;

    return (
      <div className="mt-3 p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-2.5 animate-fadeIn">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Keyboard className="h-3.5 w-3.5 text-amber-500" />
            {isCompleted ? '✅ 完成！' : '⌨️ 打一次正確句子'}
          </span>
          <button onClick={() => setPracticeStates(prev => { const n = { ...prev }; delete n[id]; return n; })}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer">收合</button>
        </div>

        <div className="font-mono text-xs leading-relaxed p-3.5 bg-white border border-slate-100 rounded-lg select-none max-h-24 overflow-y-auto shadow-2xs">
          {targetText.split('').map((char, i) => {
            let colorClass = 'text-slate-400';
            if (i < typedText.length) {
              colorClass = typedText[i] === char ? 'text-emerald-700 font-bold' : 'text-rose-500 font-bold bg-rose-50';
            } else if (i === typedText.length) {
              colorClass = 'text-slate-950 bg-amber-100 font-semibold animate-pulse';
            }
            return <span key={i} className={colorClass}>{char}</span>;
          })}
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typedText}
              onChange={(e) => {
                const val = e.target.value.slice(0, targetText.length);
                const isDone = val === targetText;
                setPracticeStates(prev => ({ ...prev, [id]: { targetText, typedText: val, isCompleted: isDone } }));
                if (isDone) onSessionComplete(55, 100, targetText.length, 'Notebook Active Re-typing');
              }}
              placeholder="照著上方打字..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 transition-all font-mono"
              style={{ fontSize: '16px' }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            />
            <button onClick={() => setPracticeStates(prev => ({ ...prev, [id]: { targetText, typedText: '', isCompleted: false } }))}
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 animate-fadeIn">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            完美輸入！肌肉記憶 +1。太棒了！
          </div>
        )}
      </div>
    );
  };

  const categories: ErrorCategory[] = [
    'Direct Translation', 'Missing Subject', 'Wrong Preposition',
    'Wrong Chunk', 'Word Choice', 'Grammar'
  ];

  const counts = categories.reduce((acc, cat) => {
    acc[cat] = errors.filter(e => e.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredErrors = selectedCategory === 'All'
    ? errors
    : errors.filter(e => e.category === selectedCategory);

  const startReviewSession = () => {
    if (errors.length === 0) return;
    const unique = Array.from(new Set(errors.map(e => e.corrected))).slice(0, 4);
    setCurrentReviewText(unique.join(' '));
    setReviewMode(true);
    setReviewSessionStats(null);
  };

  const handleReviewComplete = (wpm: number, accuracy: number, typedText: string) => {
    setReviewSessionStats({ wpm, accuracy });
    onSessionComplete(wpm, accuracy, typedText.length, 'Mistake Typing Review');
  };

  // ── Review Mode ──────────────────────────────────────────────────────
  if (reviewMode) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 md:p-8 shadow-xs animate-fadeIn" id="error-notebook-tab">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
              刻意盲打特訓中 (Practice Mode)
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-2">弱點句型肌肉記憶盲打訓練</h3>
            <p className="text-xs text-slate-500 mt-1">系統已彙整您先前被修正的正確句子，重複盲打以深植正確指尖記憶。</p>
          </div>
          <button onClick={() => setReviewMode(false)}
            className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold cursor-pointer text-center">
            退出複習練習
          </button>
        </div>

        {!reviewSessionStats ? (
          <TypingEngine mode="copy" targetText={currentReviewText} onComplete={handleReviewComplete} />
        ) : (
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto">
            <div className="inline-flex p-3 bg-emerald-600 text-white rounded-full">
              <Trophy className="h-8 w-8 text-amber-300" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">肌肉盲打練習完成！</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              親手敲擊正確的文法與句子，正在硬編碼正確語感進入大腦。太棒了，請繼續保持！
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-400 block font-medium">盲打速度</span>
                <span className="text-lg font-extrabold text-emerald-600">{reviewSessionStats.wpm} WPM</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100">
                <span className="text-xs text-slate-400 block font-medium">打字正確率</span>
                <span className="text-lg font-extrabold text-emerald-600">{reviewSessionStats.accuracy}%</span>
              </div>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <button onClick={startReviewSession}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-800 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition cursor-pointer">
                再練一次
              </button>
              <button onClick={() => setReviewMode(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer">
                返回錯題本
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Normal Mode ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5" id="error-notebook-tab">

      {/* Top: Info + Review CTA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-700 shrink-0" />
              個人專屬英文寫作錯題本
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              您在與 AI 對答過程中的文法、搭配詞或中式英文習慣，都會自動記錄分類於此。篩選特定類別，針對性複習英文死角。
            </p>
          </div>

          {/* Category filter — horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
               style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedCategory('All')}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'All' ? 'bg-emerald-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部 ({errors.length})
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat ? 'bg-emerald-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {CATEGORY_CHINESE[cat] || cat} ({counts[cat]})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col justify-between border border-emerald-800/30">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
              客製化盲打複習
            </span>
            <h4 className="text-sm sm:text-base font-bold mt-3">肌肉記憶客製盲打</h4>
            <p className="text-xs text-emerald-100/90 mt-1.5 leading-relaxed">
              將所有寫作錯誤句型，一鍵轉換為指尖盲打挑戰，加深正確語句的神經反應！
            </p>
          </div>
          <button onClick={startReviewSession} disabled={errors.length === 0}
            className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-emerald-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer">
            <Keyboard className="h-4 w-4" />
            啟動弱點句型盲打練習
          </button>
        </div>
      </div>

      {/* Error Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">
            {selectedCategory === 'All' ? '全部類別' : (CATEGORY_CHINESE[selectedCategory as ErrorCategory] || selectedCategory)}
            <span className="text-slate-400 font-mono ml-1">({filteredErrors.length})</span>
          </h4>
          {errors.length > 0 && (
            <button onClick={onClearAllErrors}
              className="text-xs text-slate-400 hover:text-rose-500 font-medium flex items-center gap-1.5 cursor-pointer transition">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">清空錯題筆記本</span>
              <span className="sm:hidden">清空</span>
            </button>
          )}
        </div>

        {filteredErrors.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-10 sm:p-12 text-center text-slate-400">
            <AlertCircle className="h-8 w-8 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">目前尚無此類別的紀錄</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              在 AI 智慧互動對白中暢聊，教練糾正您的英文時，正確句型分析將自動生成於此。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredErrors.map((err, idx) => (
              <div key={err.id || idx}
                className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 transition hover:shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md">
                    {CATEGORY_CHINESE[err.category] || err.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(err.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="bg-rose-50/50 rounded-xl p-3 border border-rose-100/30">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block mb-1">您的原始表達</span>
                    <p className="text-sm font-medium text-slate-700 line-through decoration-rose-400 decoration-2 break-words">{err.original}</p>
                  </div>
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/30">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">修正後的說法</span>
                    <p className="text-sm font-semibold text-slate-800 break-words">{err.corrected}</p>
                  </div>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-3.5 space-y-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI 教練糾錯解析</span>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{err.explanation}</p>
                  </div>
                  <div className="border-t border-slate-200/50 pt-2 flex items-start gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">母語地道說法</span>
                      <p className="text-xs font-semibold text-emerald-950 mt-0.5 italic break-words">"{err.nativeAlternative}"</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons — equal width, touch-friendly */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => startInlinePractice(`notebook_err_${err.id || idx}`, err.corrected)}
                    className="py-2.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition rounded-xl cursor-pointer shadow-2xs active:scale-95">
                    <Keyboard className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>打一次修正句</span>
                  </button>
                  <button onClick={() => startInlinePractice(`notebook_native_${err.id || idx}`, err.nativeAlternative)}
                    className="py-2.5 px-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition rounded-xl cursor-pointer shadow-2xs active:scale-95">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>打一次地道句</span>
                  </button>
                </div>

                {renderInlinePractice(`notebook_err_${err.id || idx}`, err.corrected)}
                {renderInlinePractice(`notebook_native_${err.id || idx}`, err.nativeAlternative)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
