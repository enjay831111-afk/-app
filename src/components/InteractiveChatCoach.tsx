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

  // ⚡ 電腦版打字輸入筐預設高度 180px
  const [typingBoxHeight, setTypingBoxHeight] = useState(180);
  const isDraggingRef = useRef(false);

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

  // ⚡ 電腦版專用：滑鼠拖拽拉伸高度
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const layoutContainer = document.getElementById('chat-main-feed-container');
      if (!layoutContainer) return;

      const containerRect = layoutContainer.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      
      if (newHeight > 120 && newHeight < 500) {
        setTypingBoxHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = 'unset';
      document.body.style.userSelect = 'unset';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
    <div className="flex flex-col gap-3" id="chat-coach-layout">

      {/* Mobile Topic Bar */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-xs text-xs font-bold text-slate-700 cursor-pointer hover:border-emerald-300 transition shrink-0"
        >
          <BrainCircuit className="h-4 w-4 text-emerald-700" />
          主題
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
        {hasStarted && (
          <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-1.5">
            <p className="text-[11px] font-semibold text-emerald-800 truncate">{currentPrompt}</p>
          </div>
        )}
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ minHeight: 0 }}>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex-col">
          <SidebarContent />
        </div>

        {/* Chat Feed Box */}
        {/* 手機版移除固定高度與大內襯，高度改為 100% 填滿，藉由 flex-1 推至螢幕最底 */}
        <div id="chat-main-feed-container" className="lg:col-span-3 bg-slate-50/50 border border-slate-100 rounded-3xl p-2.5 sm:p-4 flex flex-col shadow-xs w-full"
             style={{ 
               minHeight: 0, 
               height: window.innerWidth >= 1024 ? 'clamp(520px, calc(100dvh - 180px), 860px)' : 'calc(100dvh - 140px)' 
             }}>

          {/* Feed Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 px-1 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 leading-tight">AI 英語互動對白訓練</h3>
                <p className="text-[10px] text-slate-400 font-medium">對答回合：{turnCount}</p>
              </div>
            </div>
            {turnCount > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isFriendMode ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
              }`}>
                {isFriendMode ? '💬 摯友' : '🎓 教練'}
              </span>
            )}
          </div>

          {/* Scrollable Messages */}
          <div className="chat-messages-scroll space-y-4 pr-1 mb-1 flex-1 overflow-y-auto" style={{ minHeight: '60px' }}>
            {!hasStarted ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8 space-y-3">
                <MessageSquare className="h-10 w-10 text-emerald-700/60" />
                <p className="text-sm font-semibold text-slate-600">歡迎來到 AI 互動對話練習</p>
                <p className="text-xs text-slate-400 max-w-sm">請點擊上方「選擇對話主題」開始！</p>
              </div>
            ) : (
              <>
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0">AI</div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 block mb-1">教練提問 (Coach Question)</span>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">{currentPrompt}</p>
                    {chatHistory.length === 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">不想回答這個提問？</span>
                        <button onClick={handleRegenerateInitialQuestion} disabled={isRegenerating || isPending}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition cursor-pointer">
                          <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          換個提問
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {chatHistory.map((msg, idx) => (
                  <div key={msg.id || idx} className="space-y-4">
                    {msg.role === 'user' && (
                      <div className="flex items-start justify-end gap-2 pl-8 sm:pl-12">
                        <div className="bg-emerald-800 text-white rounded-2xl p-3 shadow-sm border border-emerald-700 min-w-0">
                          <p className="text-sm font-semibold leading-relaxed">{msg.text}</p>
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
                                {msg.isFriendTurn ? '💬 好友私房回信' : '🎓 專業教練指導'}
                              </span>
                              <p className="text-sm font-semibold text-slate-700 leading-relaxed">{msg.text}</p>
                            </div>
                          </div>
                        </div>
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
                  <div className="flex space-x-1.5">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ⚡ 電腦版拉伸控制線 */}
          {hasStarted && (
            <div
              className="hidden lg:flex w-full h-1.5 my-1 bg-slate-200/40 hover:bg-emerald-600/20 rounded-full cursor-row-resize items-center justify-center shrink-0"
              onMouseDown={() => { isDraggingRef.current = true; }}
            >
              <GripHorizontal className="h-3 w-3 text-slate-400" />
            </div>
          )}

          {/* Typing Input Section */}
          {hasStarted && (
            <div 
              className="shrink-0 flex flex-col overflow-hidden" 
              style={{ height: window.innerWidth >= 1024 ? `${typingBoxHeight}px` : 'auto' }}
            >
              {/* ⚡ 核心樣式控制：覆蓋 TypingEngine 內部的排版，完美緊貼底部並實現左右並排 */}
              <style>{`
                /* 隱藏打字引擎內建的頂部多餘數據欄 */
                #chat-typing-container .typing-stats-row,
                #chat-typing-container [class*="grid-cols-4"],
                #chat-typing-container [class*="space-x-4"] {
                  display: none !important;
                }

                /* 強制將原本上下排列的按鈕欄改為：左右橫向並排 (Flex-Row) */
                #chat-typing-container .flex-col {
                  flex-direction: row !important;
                  display: flex !important;
                  gap: 8px !important;
                  width: 100% !important;
                  margin-top: 4px !important;
                }

                /* 修正按鈕群組在行動端的間距與佈局 */
                #chat-typing-container .mt-4,
                #chat-typing-container .space-y-2,
                #chat-typing-container .space-x-2 {
                  display: flex !important;
                  flex-direction: row !important;
                  gap: 8px !important;
                  space-x: 0 !important;
                  space-y: 0 !important;
                  margin-top: 6px !important;
                  width: 100% !important;
                }

                /* 左右兩個按鈕平分寬度 */
                #chat-typing-container button {
                  flex: 1 !important;
                  width: auto !important;
                  margin: 0 !important;
                  padding-top: 10px !important;
                  padding-bottom: 10px !important;
                  font-size: 13px !important;
                  font-weight: 800 !important;
                  border-radius: 12px !important;
                }

                /* 🪄 透過 CSS 文字強行替換子組件內容為「重練」 */
                #chat-typing-container button:first-child {
                  font-size: 0 !important; /* 隱藏原本的 重新練習(Reset) 字樣 */
                  background-color: #f1f5f9 !important; /* 優雅的灰底 */
                  color: #475569 !important;
                }
                #chat-typing-container button:first-child::before {
                  content: "重練" !important;
                  font-size: 13px !important;
                  font-weight: 800 !important;
                }

                /* 🪄 透過 CSS 文字強行替換右側按鈕為「送出」 */
                #chat-typing-container button:last-child {
                  font-size: 0 !important;
                  background-color: #065f46 !important; /* 深翡翠綠 */
                  color: #ffffff !important;
                }
                #chat-typing-container button:last-child::before {
                  content: "送出" !important;
                  font-size: 13px !important;
                  font-weight: 800 !important;
                }

                /* 行動端專屬緊貼優化：將輸入框壓榨到極致，留白全消，直接靠齊底部頁籤 */
                @media (max-width: 1023px) {
                  #chat-main-feed-container {
                    padding-bottom: 4px !important;
                    margin-bottom: 0 !important;
                  }
                  #chat-typing-container textarea {
                    height: 72px !important; /* 略微縮減輸入框高度，釋放空間 */
                    min-height: 72px !important;
                    font-size: 15px !important;
                    margin-bottom: 2px !important;
                    border-radius: 14px !important;
                  }
                }
              `}</style>
              
              <div id="chat-typing-container" className="w-full">
                <TypingEngine
                  mode="free"
                  onComplete={(wpm, accuracy, text) => {
                    handleTypingComplete(wpm, accuracy);
                    handleSubmitMessage(text);
                  }}
                  minWordsForComplete={30}
                  actionButtonLabel="送出"
                  placeholder="在此輸入您的英文回覆..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
