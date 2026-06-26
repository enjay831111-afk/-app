import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ErrorCategory, WritingError, CATEGORY_CHINESE } from '../types';
import {
  Sparkles, MessageSquare, ShieldAlert, Award, ArrowUpRight,
  Send, BrainCircuit, RefreshCw, MessageCircle, BadgeHelp, CheckCircle,
  Flame, Keyboard, X, ChevronDown, GripHorizontal
} from 'lucide-react';
import TypingEngine from './TypingEngine';

interface InteractiveChatCoachProps {
  chatHistory: ChatMessage[];
  turnCount: number;
  currentErrorRanking: { category: string; count: number }[];
  onSendMessage: (text: string, wpm: number, accuracy: number) => Promise<void>;
  onLoadForPractice: (text: string) => void;
  isPending: boolean;
  onSessionComplete?: (wpm: number, accuracy: number, textLength: number, title: string) => void;
  onReplaceLastAiMessage: (newText: string) => void;
  onClearChatHistory: () => void;
}

const PRESET_TOPICS = [
  { title: "💻 我的職涯與科技 (Career & Tech)",        prompt: "What are your career goals, and how do you feel about the rise of Artificial Intelligence in your industry?" },
  { title: "✈️ 旅遊與冒險 (Travel Adventures)",        prompt: "Describe your dream travel destination. What would you do there, and why does this place appeal to you so much?" },
  { title: "☕ 日常生活與習慣 (Daily Life)",             prompt: "Describe your perfect morning routine. How does it make you feel, and why is starting the day right important to you?" },
  { title: "🎬 興趣與文化 (Hobbies & Culture)",         prompt: "What is a movie, book, or show that has deeply influenced you? What was it about, and what did you learn from it?" }
];

interface InlinePracticeState {
  targetText: string;
  typedText: string;
  isCompleted: boolean;
}

export default function InteractiveChatCoach({
  chatHistory, turnCount, currentErrorRanking,
  onSendMessage, onLoadForPractice, isPending,
  onSessionComplete, onReplaceLastAiMessage, onClearChatHistory
}: InteractiveChatCoachProps) {
  const [currentPrompt, setCurrentPrompt]       = useState(() => { try { return localStorage.getItem('english_typing_coach_current_prompt') || ''; } catch { return ''; } });
  const [hasStarted, setHasStarted]             = useState(() => { try { return localStorage.getItem('english_typing_coach_has_started') === 'true'; } catch { return false; } });
  const [activeTopicTitle, setActiveTopicTitle] = useState(() => { try { return localStorage.getItem('english_typing_coach_active_topic') || ''; } catch { return ''; } });
  const [typingWpm, setTypingWpm]               = useState(0);
  const [typingAccuracy, setTypingAccuracy]     = useState(100);
  const [practiceStates, setPracticeStates]     = useState<Record<string, InlinePracticeState>>({});
  const [customPromptTitle, setCustomPromptTitle] = useState('');
  const [customPromptDesc, setCustomPromptDesc]   = useState('');
  const [isRegenerating, setIsRegenerating]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── 拖曳高度相關 State 與 Ref ───
  const [chatFeedHeight, setChatFeedHeight] = useState(450); // 預設歷史訊息對話框高度為 450px
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const updateCurrentPrompt = (val: string) => {
    setCurrentPrompt(val);
    try { localStorage.setItem('english_typing_coach_current_prompt', val); } catch (e) { console.error(e); }
  };
  const updateHasStarted = (val: boolean) => {
    setHasStarted(val);
    try { localStorage.setItem('english_typing_coach_has_started', String(val)); } catch (e) { console.error(e); }
  };
  const updateActiveTopicTitle = (val: string) => {
    setActiveTopicTitle(val);
    try { localStorage.setItem('english_typing_coach_active_topic', val); } catch (e) { console.error(e); }
  };

  // ─── 處理拖曳事件監聽 ───
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = chatFeedHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - startYRef.current;
      // 限制拖曳高度在 250px 到 750px 之間，防止拉到不見
      const newHeight = Math.max(250, Math.min(750, startHeightRef.current + deltaY));
      setChatFeedHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatFeedHeight]);

  const handleRegenerateInitialQuestion = async () => {
    if (isRegenerating || isPending) return;
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopicTitle || '自訂對話主題', currentQuestion: currentPrompt, chatHistory: [] })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '無法產生新提問。');
      const data = await response.json();
      if (data.question) updateCurrentPrompt(data.question);
    } catch (err: any) {
      console.error(err);
      alert('產生新提問失敗：' + (err.message || '連線逾時'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerateFollowUpQuestion = async (lastText: string) => {
    if (isRegenerating || isPending) return;
    setIsRegenerating(true);
    try {
      const chatContext = chatHistory.slice(0, -1).map(m => ({ role: m.role, text: m.text }));
      const response = await fetch('/api/generate-question', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopicTitle || '自訂對話主題', currentQuestion: lastText, chatHistory: chatContext })
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '無法產生新提問。');
      const data = await response.json();
      if (data.question) onReplaceLastAiMessage(data.question);
    } catch (err: any) {
      console.error(err);
      alert('產生新提問失敗：' + (err.message || '連線逾時'));
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isPending]);

  const startTopic = (prompt: string, title: string) => {
    updateCurrentPrompt(prompt);
    updateHasStarted(true);
    updateActiveTopicTitle(title);
    setSidebarOpen(false);
  };

  const handleTypingComplete = (finalWpm: number, finalAccuracy: number) => {
    setTypingWpm(finalWpm);
    setTypingAccuracy(finalAccuracy);
  };

  const handleSubmitMessage = async (text: string) => {
    if (!text.trim()) return;
    await onSendMessage(text, typingWpm, typingAccuracy);
  };

  const startInlinePractice = (practiceId: string, text: string) => {
    setPracticeStates(prev => ({ ...prev, [practiceId]: { targetText: text, typedText: '', isCompleted: false } }));
  };

  const renderInlinePractice = (practiceId: string, text: string) => {
    const state = practiceStates[practiceId];
    if (!state) return null;
    return (
      <div className="mt-3 p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-2.5 animate-fadeIn">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <Keyboard className="h-3.5 w-3.5 text-amber-500" />
            {state.isCompleted ? '✅ 已完成此句打字練習！' : '⌨️ 立即盲打此句'}
          </span>
          <button onClick={() => setPracticeStates(prev => { const n = { ...prev }; delete n[practiceId]; return n; })}
            className="text-[10px] text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer transition">✕ 關閉</button>
        </div>
        <div className="font-mono text-xs leading-relaxed p-3.5 bg-white border border-slate-100 rounded-lg select-none cursor-text max-h-24 overflow-y-auto shadow-2xs">
          {text.split('').map((char, idx) => {
            const typed = state.typedText;
            let colorClass = 'text-slate-400';
            let bgClass    = '';
            if (idx < typed.length) {
              colorClass = typed[idx] === char ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold';
              bgClass    = typed[idx] !== char ? 'bg-rose-50' : '';
            } else if (idx === typed.length) {
              colorClass = 'text-slate-900 bg-amber-100 font-semibold';
            }
            return <span key={idx} className={`${colorClass} ${bgClass}`}>{char}</span>;
          })}
        </div>
        {!state.isCompleted && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.typedText}
              onChange={(e) => {
                const val = e.target.value.slice(0, text.length);
                const isComplete = val === text;
                setPracticeStates(prev => ({ ...prev, [practiceId]: { ...prev[practiceId], typedText: val, isCompleted: isComplete } }));
              }}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 transition-all font-mono"
              style={{ fontSize: '16px' }}
              placeholder="在此打字..."
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            />
            <button onClick={() => setPracticeStates(prev => ({ ...prev, [practiceId]: { ...prev[practiceId], typedText: '' } }))}
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {state.isCompleted && (
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 animate-fadeIn">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            完美！此句已成功輸入一遍，肌肉記憶 +1。
          </div>
        )}
      </div>
    );
  };

  const isFriendMode = turnCount % 3 === 0 && turnCount > 0;

  const SidebarContent = () => (
    <div className="space-y-5 h-full flex flex-col">
      <div>
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-emerald-700" />
          AI 智慧對話沙龍
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          選擇主題，在右側用英文回答，AI 即時糾錯分析！
        </p>
      </div>

      {!hasStarted ? (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          <span className="text-xs font-semibold text-slate-400 block px-1">選擇對話主題：</span>
          {PRESET_TOPICS.map((topic, idx) => (
            <button key={idx} onClick={() => startTopic(topic.prompt, topic.title)}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-100 hover:border-emerald-500/30 hover:bg-emerald-50/10 transition cursor-pointer text-xs font-semibold text-slate-700 flex flex-col gap-1 shadow-2xs bg-white hover-3d-shadow">
              <span className="text-slate-900 font-bold">{topic.title}</span>
              <span className="text-[11px] font-medium text-slate-500 line-clamp-2">{topic.prompt}</span>
            </button>
          ))}
          <div className="border-t border-slate-100 pt-3.5 space-y-2">
            <span className="text-xs font-extrabold text-slate-400 block px-1">✍️ 自訂對話主題：</span>
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <input type="text" value={customPromptTitle} onChange={(e) => setCustomPromptTitle(e.target.value)}
                placeholder="主題名稱（如：週末計畫...）"
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50/50 bg-white"
                style={{ fontSize: '16px' }} />
              <textarea value={customPromptDesc} onChange={(e) => setCustomPromptDesc(e.target.value)}
                placeholder="寫下引導提問（英文）" rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50/50 bg-white resize-none font-mono"
                style={{ fontSize: '16px' }} />
              <button
                onClick={() => { if (!customPromptDesc.trim()) return; startTopic(customPromptDesc.trim(), customPromptTitle.trim() || '自訂對話主題'); }}
                disabled={!customPromptDesc.trim()}
                className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                啟動自訂對話主題
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">當前主題</span>
            <button onClick={() => { updateHasStarted(false); updateCurrentPrompt(''); updateActiveTopicTitle(''); onClearChatHistory(); setSidebarOpen(false); }}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer">更換話題</button>
          </div>
          <p className="text-xs font-semibold text-slate-700 leading-relaxed">{currentPrompt}</p>
        </div>
      )}

      <div className="bg-gradient-to-br from-emerald-950/5 to-amber-500/5 rounded-2xl p-4 border border-emerald-100/50 space-y-3 mt-auto">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-500" />
          <h4 className="text-xs font-bold text-slate-800">動態對話與糾錯機制</h4>
        </div>
        <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
          {[
            ['好友模式 (每 3 輪切換)', 'amber'],
            ['長句申論訓練 (30 字)', 'emerald-600'],
            ['弱點優先精準糾錯', 'emerald-500'],
          ].map(([text, dot], i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full bg-${dot} mt-1 shrink-0`}></span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4" id="chat-coach-layout">

      {/* ── Mobile: topic bar + drawer trigger ──────────── */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-xs text-xs font-bold text-slate-700 cursor-pointer hover:border-emerald-300 transition"
        >
          <BrainCircuit className="h-4 w-4 text-emerald-700" />
          {hasStarted ? '更換 / 查看主題' : '選擇對話主題'}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
        {hasStarted && (
          <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-800 truncate">{currentPrompt}</p>
          </div>
        )}
      </div>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 animate-slideUp max-h-[80dvh] flex flex-col"
               style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-extrabold text-slate-800">對話主題選擇</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl bg-slate-100 cursor-pointer">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ minHeight: 0 }}>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex-col">
          <SidebarContent />
        </div>

        {/* Chat feed + typing box */}
        <div className="lg:col-span-3 bg-slate-50/50 border border-slate-100 rounded-3xl p-3 sm:p-4 flex flex-col shadow-xs"
             style={{ minHeight: 0 }}>

          {/* Feed Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 leading-tight">AI 英語互動對白訓練</h3>
                <p className="text-[10px] text-slate-400 font-medium">對答回合：{turnCount} | 每 3 輪切換摯友風格</p>
              </div>
            </div>
            {turnCount > 0 && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                isFriendMode
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
              }`}>
                {isFriendMode ? '💬 摯友模式' : '🎓 教練模式'}
              </span>
            )}
          </div>

          {/* ─── 可調整高度的歷史對話內容區 ─── */}
          <div 
            className="chat-messages-scroll space-y-5 pr-1 overflow-y-auto"
            style={{ height: `${chatFeedHeight}px`, minHeight: '200px' }}
          >
            {!hasStarted ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8 space-y-3">
                <MessageSquare className="h-10 w-10 text-emerald-700/60" />
                <p className="text-sm font-semibold text-slate-600">歡迎來到 AI 互動對話練習</p>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  請點擊上方「選擇對話主題」，選擇主題後即可開始！
                </p>
              </div>
            ) : (
              <>
                {/* Initial prompt bubble */}
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0">AI</div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 block mb-1">教練提問 (Coach Question)</span>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">{currentPrompt}</p>
                    {chatHistory.length === 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">不想回答這個提問？</span>
                        <button onClick={handleRegenerateInitialQuestion} disabled={isRegenerating || isPending}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition cursor-pointer disabled:opacity-50">
                          <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          {isRegenerating ? '更換中...' : '換個提問'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat history */}
                {chatHistory.map((msg, idx) => (
                  <div key={msg.id || idx} className="space-y-4">
                    {msg.role === 'user' && (
                      <div className="flex items-start justify-end gap-2 pl-8 sm:pl-12">
                        <div className="bg-emerald-800 text-white rounded-2xl p-3 sm:p-4 shadow-sm border border-emerald-700 min-w-0">
                          <p className="text-sm font-semibold leading-relaxed">{msg.text}</p>
                          {msg.wordCount && (
                            <div className="mt-2 pt-1 border-t border-emerald-700/60 flex flex-wrap justify-between items-center text-[10px] text-amber-200 font-mono gap-1">
                              <span>輸入字數：{msg.wordCount} 字</span>
                              <span className="hidden sm:inline">已記錄盲打正確率與速度</span>
                            </div>
                          )}
                        </div>
                        <div className="h-8 w-8 rounded-full bg-emerald-950 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0 shadow-sm border border-emerald-800">ME</div>
                      </div>
                    )}

                    {msg.role === 'model' && (
                      <div className="flex flex-col space-y-4 pr-4 sm:pr-8">
                        <div className="flex items-start space-x-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm">AI</div>
                          <div className="space-y-3 flex-1 min-w-0">
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs">
                              <span className={`text-[9px] font-bold block mb-1 tracking-wider uppercase ${msg.isFriendTurn ? 'text-amber-600' : 'text-emerald-700'}`}>
                                {msg.isFriendTurn ? '💬 好友私房回信 (Friend Reply)' : '🎓 專業教練指導 (Coach Answer)'}
                              </span>
                              <p className="text-sm font-semibold text-slate-700 leading-relaxed">{msg.text}</p>
                              {idx === chatHistory.length - 1 && (
                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[10px] text-slate-400">不想回答這個提問？</span>
                                  <button onClick={() => handleRegenerateFollowUpQuestion(msg.text)} disabled={isRegenerating || isPending}
                                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition cursor-pointer disabled:opacity-50">
                                    <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                                    {isRegenerating ? '更換中...' : '換個提問'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {msg.analysis?.isTooShort && (
                              <div className="bg-amber-500/5 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                                <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                  <h5 className="text-xs font-extrabold text-amber-800">⚠️ 長句申論訓練</h5>
                                  <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                                    您的回答僅有 {msg.analysis.wordCount} 個單字（低標 30 字）。試著多描述 <strong>Why / How / 感受</strong>！
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {msg.analysis && (
                          <div className="pl-11 space-y-4">
                            {!msg.analysis.isCorrect && msg.analysis.errorsFound?.length > 0 && (
                              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs space-y-3">
                                <span className="text-xs font-extrabold text-rose-500 block border-b border-slate-50 pb-2">
                                  📊 本回合寫作錯誤診斷
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {msg.analysis.errorsFound.map((err, errIdx) => (
                                    <div key={errIdx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                                      <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded">
                                        {CATEGORY_CHINESE[err.category as ErrorCategory] || err.category}
                                      </span>
                                      <div className="space-y-1 text-[11px]">
                                        <p className="text-slate-500"><span className="font-semibold text-rose-500 line-through">"{err.original}"</span> → <span className="font-semibold text-emerald-600">"{err.corrected}"</span></p>
                                        <p className="text-slate-600 leading-relaxed"><strong className="text-slate-700">糾錯解析:</strong> {err.explanation}</p>
                                        <p className="text-emerald-900 font-medium italic"><strong className="text-emerald-800 font-sans not-italic">道地說法:</strong> "{err.nativeAlternative}"</p>
                                      </div>
                                      <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-200/40">
                                        <button onClick={() => startInlinePractice(`${msg.id}_err_${errIdx}`, err.corrected)}
                                          className="py-1.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-extrabold flex items-center gap-1 transition rounded-lg cursor-pointer shadow-2xs">
                                          <Keyboard className="h-3 w-3 text-amber-400" />打一次修正句
                                        </button>
                                        <button onClick={() => startInlinePractice(`${msg.id}_native_${errIdx}`, err.nativeAlternative)}
                                          className="py-1.5 px-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 text-[10px] font-extrabold flex items-center gap-1 transition rounded-lg cursor-pointer shadow-2xs">
                                          <Sparkles className="h-3 w-3" />打一次道地句
                                        </button>
                                      </div>
                                      {renderInlinePractice(`${msg.id}_err_${errIdx}`, err.corrected)}
                                      {renderInlinePractice(`${msg.id}_native_${errIdx}`, err.nativeAlternative)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-2xs space-y-4">
                              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                                <span className="text-xs font-extrabold text-slate-800">⭐ Native Speaker Upgrade (母語表達三階進化)</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  { label: '⭐ Understandable', labelColor: 'text-slate-400', text: msg.analysis.understandableEnglish, key: 'upgrade_1', bg: 'bg-slate-50 border-slate-100' },
                                  { label: '⭐⭐ Native Speaker', labelColor: 'text-emerald-700', text: msg.analysis.nativeSpeakerVersion, key: 'upgrade_2', bg: 'bg-emerald-50/20 border-emerald-100/50' },
                                  { label: '⭐⭐⭐ Highly Natural', labelColor: 'text-amber-600', text: msg.analysis.highlyNaturalVersion, key: 'upgrade_3', bg: 'bg-amber-50/20 border-amber-100' },
                                ].map(({ label, labelColor, text, key, bg }) => (
                                  <div key={key} className={`${bg} rounded-xl p-3.5 border flex flex-col gap-2`}>
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${labelColor}`}>{label}</span>
                                    <p className="text-xs font-semibold text-slate-800 leading-relaxed flex-1">"{text}"</p>
                                    <div className="flex flex-col gap-1.5 pt-1">
                                      <button onClick={() => onLoadForPractice(text)}
                                        className="py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1 transition cursor-pointer">
                                        載入經典盲打 <ArrowUpRight className="h-3 w-3 text-slate-400" />
                                      </button>
                                      <button onClick={() => startInlinePractice(`${msg.id}_${key}`, text)}
                                        className="py-1.5 px-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs">
                                        <Keyboard className="h-3 w-3 text-amber-400" />立即打一次
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {renderInlinePractice(`${msg.id}_upgrade_1`, msg.analysis.understandableEnglish)}
                              {renderInlinePractice(`${msg.id}_upgrade_2`, msg.analysis.nativeSpeakerVersion)}
                              {renderInlinePractice(`${msg.id}_upgrade_3`, msg.analysis.highlyNaturalVersion)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {isPending && (
              <div className="flex items-start space-x-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shrink-0">AI</div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-2">
                  <span className="text-xs text-slate-400 font-bold block">AI 教練正在分析您的句子...</span>
                  <div className="flex space-x-1.5">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ─── 🛠️ 新增：可拖曳灰色拉桿 (Resize Slider) ─── */}
          {hasStarted && (
            <div 
              onMouseDown={handleMouseDown}
              className="w-full h-5 my-1 flex items-center justify-center cursor-row-resize hover:bg-slate-200/50 active:bg-slate-300/80 rounded-md transition-colors group select-none shrink-0"
              title="上下拖曳可調整對話框大小"
            >
              <div className="w-16 h-1 bg-slate-300 group-hover:bg-slate-400 rounded-full flex items-center justify-center">
                <GripHorizontal className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
              </div>
            </div>
          )}

          {/* Typing input */}
          {hasStarted && (
            <div className="border-t border-slate-100 pt-2 shrink-0">
              <TypingEngine
                mode="free"
                onComplete={(wpm, accuracy, text) => {
                  handleTypingComplete(wpm, accuracy);
                  handleSubmitMessage(text);
                }}
                minWordsForComplete={30}
                actionButtonLabel="送出回答並進行剖析"
                placeholder="在此輸入您的英文回覆... 試著寫滿 30 個單字以上！"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
