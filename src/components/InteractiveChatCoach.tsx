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

  // 核心：用來與原生 textarea 綁定並動態更換數字的 State
  const [wordCountStr, setWordCountStr] = useState('0/30');

  // 電腦版打字輸入筐預設高度
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
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isPending]);

  // 監聽並強行綁定打字框，抹除舊元件文字，並在對話框內部右下角注入「X/30」
  useEffect(() => {
    if (!hasStarted) return;

    const timer = setTimeout(() => {
      const parent = document.getElementById('chat-typing-container');
      const textarea = parent?.querySelector('textarea');
      const textareaWrapper = textarea?.parentElement;

      if (textarea && textareaWrapper) {
        // 設定包裹容器為相對定位，方便我們把計數器絕對定位到對話框內部右下角
        textareaWrapper.style.position = 'relative';
        textarea.style.paddingBottom = '28px'; // 留白避免文字蓋到數字

        // 檢查是否已經加過我們自訂的計數器面板，沒加過就生一個出來
        let countBadge = textareaWrapper.querySelector('#custom-inner-word-counter');
        if (!countBadge) {
          countBadge = document.createElement('div');
          countBadge.id = 'custom-inner-word-counter';
          // 壓在輸入框內部的右下角樣式
          countBadge.setAttribute('style', `
            position: absolute !important;
            bottom: 12px !important;
            right: 14px !important;
            font-family: monospace !important;
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #64748b !important;
            background-color: rgba(255, 255, 255, 0.75) !important;
            padding: 1px 5px !important;
            border-radius: 4px !important;
            pointer-events: none !important;
            z-index: 10 !important;
          `);
          textareaWrapper.appendChild(countBadge);
        }

        const calculateWords = () => {
          const text = textarea.value.trim();
          const count = text ? text.split(/\s+/).length : 0;
          countBadge!.textContent = `${count}/30`;
        };

        // 綁定輸入事件
        textarea.addEventListener('input', calculateWords);
        // 初始化呼叫
        calculateWords();

        return () => {
          textarea.removeEventListener('input', calculateWords);
        };
      }
    }, 400); // 稍微延遲確保子組件載入完畢

    return () => clearTimeout(timer);
  }, [hasStarted, chatHistory]);

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
    // 送出後清空計數顯示
    setTimeout(() => {
      const badge = document.getElementById('custom-inner-word-counter');
      if (badge) badge.textContent = '0/30';
    }, 50);
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
        <div className="font-mono text-xs leading-relaxed p-3.5 bg-white border border-slate-100 rounded-lg shadow-2xs">
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
      </div>
      {!hasStarted ? (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {PRESET_TOPICS.map((topic, idx) => (
            <button key={idx} onClick={() => startTopic(topic.prompt, topic.title)}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-100 hover:bg-emerald-50/10 transition text-xs font-semibold text-slate-700 flex flex-col gap-1 shadow-2xs bg-white">
              <span className="text-slate-900 font-bold">{topic.title}</span>
              <span className="text-[11px] font-medium text-slate-500 line-clamp-2">{topic.prompt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">當前主題</span>
            <button onClick={() => { updateHasStarted(false); updateCurrentPrompt(''); updateActiveTopicTitle(''); onClearChatHistory(); setSidebarOpen(false); }}
              className="text-[10px] text-emerald-700 font-semibold underline">更換話題</button>
          </div>
          <p className="text-xs font-semibold text-slate-700">{currentPrompt}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3" id="chat-coach-layout">
      
      {/* 🔮 頂級樣式清洗與重排 */}
      <style>{`
        /* 1. 徹底消滅帶有鉛筆圖標的那一整條「已輸入0字 (目標30字)」提示列 */
        #chat-typing-container .flex.items-center.justify-between.p-3,
        #chat-typing-container .typing-stats-row,
        #chat-typing-container [class*="bg-emerald-50/60"],
        #chat-typing-container [class*="border-emerald-100"] {
          display: none !important;
        }

        /* 2. 徹底消滅原生 textarea 右下角自帶的 "0 words" 純文字 */
        #chat-typing-container .absolute.bottom-3.right-4.text-xs.text-slate-400,
        #chat-typing-container .absolute.bottom-4.right-4,
        #chat-typing-container [class*="text-slate-400"][style*="bottom"] {
          display: none !important;
        }

        /* 3. 強制讓底部的按鈕變成靈活的 Flex 左右橫向並排 */
        #chat-typing-container .mt-4,
        #chat-typing-container .space-y-2 {
          display: flex !important;
          flex-direction: row !important;
          gap: 8px !important;
          margin-top: 6px !important;
          width: 100% !important;
        }

        /* 按鈕視覺美化與文字精簡覆蓋 */
        #chat-typing-container button {
          flex: 1 !important;
          width: auto !important;
          margin: 0 !important;
          padding: 10px 0 !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          border-radius: 12px !important;
        }
        #chat-typing-container button:first-child {
          font-size: 0 !important;
          background-color: #f1f5f9 !important;
          color: #475569 !important;
        }
        #chat-typing-container button:first-child::before {
          content: "重練" !important;
          font-size: 13px !important;
        }
        #chat-typing-container button:last-child {
          font-size: 0 !important;
          background-color: #065f46 !important;
          color: #ffffff !important;
        }
        #chat-typing-container button:last-child::before {
          content: "送出" !important;
          font-size: 13px !important;
        }

        @media (max-width: 1023px) {
          #chat-main-feed-container { padding-bottom: 4px !important; }
          #chat-typing-container textarea {
            height: 82px !important;
            min-height: 82px !important;
            font-size: 15px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>

      {/* Mobile Topic Bar */}
      <div className="lg:hidden flex items-center gap-2">
        <button onClick={() => setSidebarOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 shrink-0">
          <BrainCircuit className="h-4 w-4 text-emerald-700" /> 主題 <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
        {hasStarted && (
          <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-1.5">
            <p className="text-[11px] font-semibold text-emerald-800 truncate">{currentPrompt}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ minHeight: 0 }}>
        <div className="hidden lg:flex lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex-col">
          <SidebarContent />
        </div>

        {/* Main Chat Feed */}
        <div id="chat-main-feed-container" className="lg:col-span-3 bg-slate-50/50 border border-slate-100 rounded-3xl p-2.5 sm:p-4 flex flex-col shadow-xs w-full"
             style={{ height: window.innerWidth >= 1024 ? 'clamp(520px, calc(100dvh - 180px), 860px)' : 'calc(100dvh - 140px)', minHeight: 0 }}>

          <div className="chat-messages-scroll space-y-4 pr-1 mb-1 flex-1 overflow-y-auto">
            {hasStarted && (
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shrink-0">AI</div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{currentPrompt}</p>
                </div>
              </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div key={msg.id || idx} className="space-y-4">
                {msg.role === 'user' && (
                  <div className="flex items-start justify-end gap-2 pl-12">
                    <div className="bg-emerald-800 text-white rounded-2xl p-3 shadow-sm text-sm font-semibold">{msg.text}</div>
                    <div className="h-8 w-8 rounded-full bg-emerald-950 text-amber-300 flex items-center justify-center text-xs font-bold shrink-0">ME</div>
                  </div>
                )}
                {msg.role === 'model' && (
                  <div className="flex items-start space-x-3 pr-8">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold shrink-0">AI</div>
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs text-sm font-semibold text-slate-700">{msg.text}</div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Resizer bar */}
          {hasStarted && (
            <div className="hidden lg:flex w-full h-1.5 my-1 bg-slate-200/40 hover:bg-emerald-600/20 rounded-full cursor-row-resize items-center justify-center shrink-0"
                 onMouseDown={() => { isDraggingRef.current = true; }}>
              <GripHorizontal className="h-3 w-3 text-slate-400" />
            </div>
          )}

          {/* Typing Box Input */}
          {hasStarted && (
            <div className="shrink-0 flex flex-col overflow-hidden" style={{ height: window.innerWidth >= 1024 ? `${typingBoxHeight}px` : 'auto' }}>
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
