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
  { title: "💻 我的職涯與科技 (Career & Tech)", prompt: "What are your career goals, and how do you feel about the rise of Artificial Intelligence in your industry?" },
  { title: "✈️ 旅遊與冒險 (Travel Adventures)", prompt: "Describe your dream travel destination. What would you do there, and why does this place appeal to you so much?" },
  { title: "☕ 日常生活與習慣 (Daily Life)", prompt: "Describe your perfect morning routine. How does it make you feel, and why is starting the day right important to you?" },
  { title: "🎬 興趣與文化 (Hobbies & Culture)", prompt: "What is a movie, book, or show that has deeply influenced you? What was it about, and what did you learn from it?" }
];

interface InlinePracticeState { targetText: string; typedText: string; isCompleted: boolean; }

export default function InteractiveChatCoach({
  chatHistory, turnCount, currentErrorRanking, onSendMessage, onLoadForPractice, isPending,
  onSessionComplete, onReplaceLastAiMessage, onClearChatHistory
}: InteractiveChatCoachProps) {
  const [currentPrompt, setCurrentPrompt] = useState(() => { try { return localStorage.getItem('english_typing_coach_current_prompt') || ''; } catch { return ''; } });
  const [hasStarted, setHasStarted] = useState(() => { try { return localStorage.getItem('english_typing_coach_has_started') === 'true'; } catch { return false; } });
  const [activeTopicTitle, setActiveTopicTitle] = useState(() => { try { return localStorage.getItem('english_typing_coach_active_topic') || ''; } catch { return ''; } });
  const [typingWpm, setTypingWpm] = useState(0);
  const [typingAccuracy, setTypingAccuracy] = useState(100);
  const [practiceStates, setPracticeStates] = useState<Record<string, InlinePracticeState>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingBoxHeight, setTypingBoxHeight] = useState(200);
  const isDraggingRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const updateCurrentPrompt = (val: string) => { setCurrentPrompt(val); try { localStorage.setItem('english_typing_coach_current_prompt', val); } catch {} };
  const updateHasStarted = (val: boolean) => { setHasStarted(val); try { localStorage.setItem('english_typing_coach_has_started', String(val)); } catch {} };
  const updateActiveTopicTitle = (val: string) => { setActiveTopicTitle(val); try { localStorage.setItem('english_typing_coach_active_topic', val); } catch {} };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isPending]);

  // UI 自動化清潔邏輯
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      const container = document.getElementById('chat-typing-container');
      if (!container) return;
      const allDivs = container.getElementsByTagName('div');
      for (let i = 0; i < allDivs.length; i++) {
        if (allDivs[i].textContent?.includes('已輸入') || allDivs[i].textContent?.includes('words')) allDivs[i].style.display = 'none';
      }
      const btns = container.getElementsByTagName('button');
      if (btns.length >= 2) {
        if (btns[0].textContent !== '重練') btns[0].textContent = '重練';
        if (btns[1].textContent !== '送出') btns[1].textContent = '送出';
      }
    }, 100);
    return () => clearInterval(interval);
  }, [hasStarted]);

  return (
    <div className="flex flex-col gap-4" id="chat-coach-layout">
      <style>{`
        #chat-typing-container .typing-stats-row, #chat-typing-container [class*="grid-cols-4"] { display: none !important; }
        
        @media (max-width: 1023px) {
          #chat-main-feed-container { height: 100dvh !important; max-height: 100dvh !important; padding-bottom: 0px !important; }
          .chat-messages-scroll { flex: 1 !important; overflow-y: auto !important; }
          #chat-typing-container { margin-top: auto !important; background: white; border-top: 1px solid #e2e8f0; padding: 10px; }
          #chat-typing-container textarea { min-height: 90px !important; }
        }
        @media (min-width: 1024px) {
          #chat-main-feed-container { height: clamp(520px, 80dvh, 860px) !important; }
        }
      `}</style>

      <div id="chat-main-feed-container" className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col shadow-sm">
        <div className="chat-messages-scroll space-y-4 flex-1 overflow-y-auto">
          {!hasStarted ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm font-bold">請選擇主題開始對話</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-2xl text-sm font-semibold text-emerald-900">{currentPrompt}</div>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-800 text-white ml-auto' : 'bg-slate-100'}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {hasStarted && (
          <div id="chat-typing-container" className="w-full shrink-0">
            <TypingEngine
              mode="free"
              onComplete={(wpm, acc, text) => onSendMessage(text, wpm, acc)}
              minWordsForComplete={30}
              actionButtonLabel="送出回答並進行剖析"
              placeholder="在此輸入您的英文回覆... 試著寫滿 30 個單字以上！"
            />
          </div>
        )}
      </div>
    </div>
  );
}
