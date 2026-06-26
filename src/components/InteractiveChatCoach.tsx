import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ErrorCategory, WritingError, CATEGORY_CHINESE } from '../types';
import {
  Sparkles, MessageSquare, ShieldAlert, Award, ArrowUpRight,
  Send, BrainCircuit, RefreshCw, MessageCircle, BadgeHelp, CheckCircle,
  Flame, Keyboard, X, ChevronDown
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
  { title: "🎬 興趣與 culture (Hobbies & Culture)",      prompt: "What is a movie, book, or show that has deeply influenced you? What was it about, and what did you learn from it?" }
];

export default function InteractiveChatCoach({
  chatHistory, turnCount, currentErrorRanking,
  onSendMessage, onLoadForPractice, isPending,
  onSessionComplete, onReplaceLastAiMessage, onClearChatHistory
}: InteractiveChatCoachProps) {
  const [currentPrompt, setCurrentPrompt]       = useState(() => { try { return localStorage.getItem('english_typing_coach_current_prompt') || ''; } catch { return ''; } });
  const [hasStarted, setHasStarted]             = useState(() => { try { return localStorage.getItem('english_typing_coach_has_started') === 'true'; } catch { return false; } });
  const [activeTopicTitle, setActiveTopicTitle] = useState(() => { try { return localStorage.getItem('english_topic_title') || ''; } catch { return ''; } });
  const [typingWpm, setTypingWpm]               = useState(0);
  const [typingAccuracy, setTypingAccuracy]     = useState(100);
  const [sidebarOpen, setSidebarOpen]           = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const updateCurrentPrompt = (val: string) => {
    setCurrentPrompt(val);
    try { localStorage.setItem('english_typing_coach_current_prompt', val); } catch (e) { console.error(e); }
  };
  const updateHasStarted = (val: boolean) => {
    setHasStarted(val);
    try { localStorage.setItem('english_typing_coach_has_started', String(val)); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isPending]);

  // 🎯 核心控制：利用 DOM 監聽與定時器，徹底解決原生組件內的多餘元素，並搬移字數統計
  useEffect(() => {
    if (!hasStarted) return;

    const interval = setInterval(() => {
      const container = document.getElementById('chat-typing-container');
      if (!container) return;

      // 1. 抓取 TypingEngine 的 textarea 與它的包裝外層
      const textarea = container.querySelector('textarea');
      const textareaWrapper = textarea?.parentElement;

      if (textarea && textareaWrapper) {
        // 強制外層為相對定位，並給 textarea 底部留白，防止文字蓋到右下角 0/30
        textareaWrapper.style.position = 'relative';
        textarea.style.paddingBottom = '32px';

        // 2. 建立或更新專屬的輸入框內右下角字數指示器
        let innerCounter = textareaWrapper.querySelector('#inner-word-counter');
        if (!innerCounter) {
          innerCounter = document.createElement('div');
          innerCounter.id = 'inner-word-counter';
          innerCounter.setAttribute('style', `
            position: absolute !important;
            bottom: 12px !important;
            right: 14px !important;
            font-family: monospace !important;
            font-size: 12px !important;
            font-weight: bold !important;
            color: #64748b !important;
            background: rgba(255, 255, 255, 0.85) !important;
            padding: 1px 4px !important;
            border-radius: 4px !important;
            pointer-events: none !important;
            z-index: 20 !important;
          `);
          textareaWrapper.appendChild(innerCounter);
        }

        // 動態計算字數
        const updateInnerCount = () => {
          const val = textarea.value.trim();
          const words = val ? val.split(/\s+/).length : 0;
          innerCounter!.textContent = `${words}/30`;
        };

        // 綁定輸入事件（避免重複綁定）
        textarea.removeEventListener('input', updateInnerCount);
        textarea.addEventListener('input', updateInnerCount);
        updateInnerCount();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [hasStarted, chatHistory]);

  const startTopic = (prompt: string, title: string) => {
    updateCurrentPrompt(prompt);
    updateHasStarted(true);
    setSidebarOpen(false);
  };

  const handleTypingComplete = (finalWpm: number, finalAccuracy: number) => {
    setTypingWpm(finalWpm);
    setTypingAccuracy(finalAccuracy);
  };

  const handleSubmitMessage = async (text: string) => {
    if (!text.trim()) return;
    await onSendMessage(text, typingWpm, typingAccuracy);
    // 送出後立刻手動重置框內計數
    setTimeout(() => {
      const el = document.getElementById('inner-word-counter');
      if (el) el.textContent = '0/30';
    }, 50);
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
              className="w-full text-left p-3.5 rounded-2xl border border-slate-100 hover:bg-emerald-50/10 transition text-xs font-semibold text-slate-700 flex flex-col gap-1 bg-white">
              <span className="text-slate-900 font-bold">{topic.title}</span>
              <span className="text-[11px] font-medium text-slate-500 line-clamp-2">{topic.prompt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-700">{currentPrompt}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3" id="chat-coach-layout">
      
      {/* 🔴 終極暴力 CSS 樣式清理，徹底抹除 226.png 中的贅物 */}
      <style>{`
        /* 1. 斬斷最上方四大卡片（打字速度、正確率、字數統計、練習計時）*/
        #chat-typing-container .grid.grid-cols-2,
        #chat-typing-container .grid.grid-cols-4,
        #chat-typing-container div[class*="grid-cols-"],
        #chat-typing-container div:has(> div > .lucide-zap),
        #chat-typing-container div:has(> div > .lucide-percent) {
          display: none !important;
        }

        /* 2. 徹底消滅「✏️ 已輸入 0 字 (目標 30 字)」整行與旁邊原生的 "0 words" */
        #chat-typing-container .flex.items-center.justify-between.p-3,
        #chat-typing-container div:has(> .lucide-pen-tool),
        #chat-typing-container .text-slate-400.text-xs,
        #chat-typing-container span:contains("words"),
        #chat-typing-container div[class*="text-slate-400"] {
          /* 利用最廣泛的後代隱藏，把 textarea 下方、按鈕上方那區夾層文字全部蒸發 */
        }
        
        /* 補充針對夾層文字的強力射殺：直接隱藏按鈕前一個同級區塊 */
        #chat-typing-container textarea + div,
        #chat-typing-container .relative + .flex.justify-between,
        #chat-typing-container div.text-xs.text-slate-400,
        #chat-typing-container div:contains("已輸入") {
          display: none !important;
          opacity: 0 !important;
          height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        /* 3. 按鈕強制回歸 Flex Row 左右平分並排 */
        #chat-typing-container .mt-4,
        #chat-typing-container .space-y-2,
        #chat-typing-container .flex-col {
          display: flex !important;
          flex-direction: row !important;
          gap: 8px !important;
          margin-top: 8px !important;
          width: 100% !important;
        }

        /* 4. 按鈕改字：左重練、右送出 */
        #chat-typing-container button {
          flex: 1 !important;
          width: auto !important;
          margin: 0 !important;
          padding: 12px 0 !important;
          font-size: 14px !important;
          font-weight: 800 !important;
          border-radius: 14px !important;
        }
        #chat-typing-container button:first-child {
          font-size: 0 !important;
          background-color: #f1f5f9 !important;
          color: #475569 !important;
        }
        #chat-typing-container button:first-child::before {
          content: "重練" !important;
          font-size: 14px !important;
        }
        #chat-typing-container button:last-child {
          font-size: 0 !important;
          background-color: #065f46 !important;
          color: #ffffff !important;
        }
        #chat-typing-container button:last-child::before {
          content: "送出" !important;
          font-size: 14px !important;
        }

        /* 5. 手機端緊貼優化 */
        @media (max-width: 1023px) {
          #chat-main-feed-container { padding-bottom: 2px !important; }
          #chat-typing-container textarea {
            height: 90px !important;
            min-height: 90px !important;
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

        {/* Main Feed Container (網頁版移除了高度調整拉條，恢復乾淨直觀的佈局) */}
        <div id="chat-main-feed-container" className="lg:col-span-3 bg-slate-50/50 border border-slate-100 rounded-3xl p-3 sm:p-4 flex flex-col shadow-xs w-full"
             style={{ 
               height: window.innerWidth >= 1024 ? 'calc(100dvh - 180px)' : 'calc(100dvh - 140px)', 
               minHeight: 0 
             }}>

          {/* Messages Feed */}
          <div className="chat-messages-scroll space-y-4 pr-1 mb-2 flex-1 overflow-y-auto">
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

          {/* Typing Area */}
          {hasStarted && (
            <div className="shrink-0 flex flex-col overflow-hidden w-full">
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
