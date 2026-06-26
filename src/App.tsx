import React, { useState, useEffect, useCallback } from 'react';
import { TypingSession, WritingError, ErrorRanking, ChatMessage, WeeklyGoal } from './types';
import WelcomeDashboard from './components/WelcomeDashboard';
import ClassicalTypingMode from './components/ClassicalTypingMode';
import InteractiveChatCoach from './components/InteractiveChatCoach';
import ErrorNotebook from './components/ErrorNotebook';
import ConfirmModal from './components/ConfirmModal';
import ErrorBoundary from './components/ErrorBoundary';
import {
  Keyboard, Sparkles, MessageSquare, BookOpen, Activity, Sun, Moon, HardDrive
} from 'lucide-react';

// ── localStorage usage helper ──────────────────────────────
const getStorageUsagePercent = (): number => {
  try {
    const used = Object.keys(localStorage)
      .filter(k => k.startsWith('english_typing'))
      .reduce((acc, k) => acc + (localStorage.getItem(k)?.length ?? 0), 0);
    return Math.min(100, Math.round((used / (5 * 1024 * 1024)) * 100));
  } catch {
    return 0;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classical' | 'chat' | 'notebook'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('english_typing_theme') as 'light' | 'dark') || 'light'; }
    catch { return 'light'; }
  });

  // ── Confirm modal state ────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string;
    confirmLabel?: string; danger?: boolean; onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const openConfirm = (opts: typeof confirmModal) => setConfirmModal({ ...opts, isOpen: true });
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  // ── Storage usage ──────────────────────────────────────────
  const [storagePercent, setStoragePercent] = useState(0);
  const refreshStorageUsage = useCallback(() => setStoragePercent(getStorageUsagePercent()), []);

  useEffect(() => {
    try {
      localStorage.setItem('english_typing_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (e) { console.error(e); }
  }, [theme]);

  // ── Core state ─────────────────────────────────────────────
  const [sessions, setSessions]         = useState<TypingSession[]>([]);
  const [errors, setErrors]             = useState<WritingError[]>([]);
  const [errorRanking, setErrorRanking] = useState<ErrorRanking>({
    'Direct Translation': 0, 'Missing Subject': 0, 'Wrong Preposition': 0,
    'Wrong Chunk': 0, 'Word Choice': 0, 'Grammar': 0
  });
  const [weeklyGoal, setWeeklyGoal]     = useState<WeeklyGoal>({ type: 'words', value: 1000 });
  const [chatHistory, setChatHistory]   = useState<ChatMessage[]>([]);
  const [turnCount, setTurnCount]       = useState(1);
  const [isPending, setIsPending]       = useState(false);
  const [customPracticeText, setCustomPracticeText] = useState<string | null>(null);

  // ── Load from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem('english_typing_sessions');
      const e = localStorage.getItem('english_typing_errors');
      const r = localStorage.getItem('english_typing_ranking');
      const c = localStorage.getItem('english_typing_chat');
      const t = localStorage.getItem('english_typing_turn');
      const g = localStorage.getItem('english_typing_weekly_goal');
      if (s) setSessions(JSON.parse(s));
      if (e) setErrors(JSON.parse(e));
      if (r) setErrorRanking(JSON.parse(r));
      if (c) setChatHistory(JSON.parse(c));
      if (t) setTurnCount(JSON.parse(t));
      if (g) setWeeklyGoal(JSON.parse(g));
    } catch (e) { console.error('Failed to load localStorage:', e); }
    refreshStorageUsage();
  }, []);

  // ── Save helper ────────────────────────────────────────────
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      refreshStorageUsage();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        openConfirm({
          isOpen: true,
          title: '本地儲存空間已滿',
          message: '建議至「寫作錯題本」清除舊紀錄以釋放空間，避免學習資料遺失。',
          confirmLabel: '前往清除',
          danger: true,
          onConfirm: () => { setActiveTab('notebook'); closeConfirm(); }
        });
      } else {
        console.error('localStorage write failed:', e);
      }
    }
  }, []);

  // ── Debounced chatHistory → localStorage ───────────────────
  useEffect(() => {
    const t = setTimeout(() => saveToStorage('english_typing_chat', chatHistory), 400);
    return () => clearTimeout(t);
  }, [chatHistory]);

  // ── Handlers ───────────────────────────────────────────────
  const handleUpdateWeeklyGoal = (g: WeeklyGoal) => {
    setWeeklyGoal(g);
    saveToStorage('english_typing_weekly_goal', g);
  };

  const handleSessionComplete = (wpm: number, accuracy: number, textLength: number, title: string) => {
    const s: TypingSession = {
      id: `session_${Date.now()}`, mode: activeTab === 'classical' ? 'classical'
        : activeTab === 'notebook' ? 'error_review' : 'chat_response',
      wpm, accuracy, date: new Date().toISOString(), textLength, title
    };
    const updated = [s, ...sessions];
    setSessions(updated);
    saveToStorage('english_typing_sessions', updated);
  };

  const handleLoadForPractice = (text: string) => {
    setCustomPracticeText(text);
    setActiveTab('classical');
  };

  const handleClearAllErrors = () => {
    openConfirm({
      isOpen: true,
      title: '確認清空錯題本',
      message: '這將永久刪除所有寫作錯誤記錄並重設錯誤排行榜，此操作無法復原。',
      confirmLabel: '確認清空',
      danger: true,
      onConfirm: () => {
        const empty: ErrorRanking = {
          'Direct Translation': 0, 'Missing Subject': 0, 'Wrong Preposition': 0,
          'Wrong Chunk': 0, 'Word Choice': 0, 'Grammar': 0
        };
        setErrors([]);
        setErrorRanking(empty);
        saveToStorage('english_typing_errors', []);
        saveToStorage('english_typing_ranking', empty);
        closeConfirm();
      }
    });
  };

  const handleSendMessage = async (text: string, typingWpm: number, typingAccuracy: number) => {
    setIsPending(true);
    handleSessionComplete(typingWpm, typingAccuracy, text.length, 'Interactive Q&A Drafting');

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`, role: 'user', text,
      timestamp: new Date().toISOString(),
      wordCount: text.trim().split(/\s+/).length
    };
    const updatedChat = [...chatHistory, userMsg];
    setChatHistory(updatedChat);

    try {
      const rankArray = Object.entries(errorRanking).map(([category, count]) => ({ category, count: count as number }));
      const response = await fetch('/api/analyze-response', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text.slice(0, 2000),
          // Send last 6 turns to AI (context window management)
          // Note: UI shows full history; AI only sees last 6 messages
          chatHistory: chatHistory.slice(-6).map(m => ({ role: m.role, text: m.text })),
          turnCount,
          currentErrorRanking: rankArray
        })
      });

      if (!response.ok) throw new Error('無法與文法剖析引擎通訊，請確認網路與 GEMINI_API_KEY。');

      const analysisData = await response.json();

      const aiMsg: ChatMessage = {
        id: `msg_ai_${Date.now()}`, role: 'model',
        text: analysisData.replyText,
        timestamp: new Date().toISOString(),
        // isFriendTurn authoritative from server; frontend just mirrors for display
        isFriendTurn: analysisData.isFriendTurn ?? (turnCount % 3 === 0),
        analysis: analysisData
      };

      if (analysisData.errorsFound?.length > 0) {
        const newErrors: WritingError[] = analysisData.errorsFound.map((err: any, i: number) => ({
          id: `error_${Date.now()}_${i}`,
          category: err.category as WritingError['category'],
          original: err.original, corrected: err.corrected,
          explanation: err.explanation, nativeAlternative: err.nativeAlternative,
          date: new Date().toISOString()
        }));
        const updatedErrors = [...newErrors, ...errors];
        setErrors(updatedErrors);
        saveToStorage('english_typing_errors', updatedErrors);

        const updatedRanking = { ...errorRanking };
        newErrors.forEach(e => { if (updatedRanking[e.category] !== undefined) updatedRanking[e.category]++; });
        setErrorRanking(updatedRanking);
        saveToStorage('english_typing_ranking', updatedRanking);
      }

      setChatHistory([...updatedChat, aiMsg]);

      const next = turnCount + 1;
      setTurnCount(next);
      saveToStorage('english_typing_turn', next);

    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        id: `msg_ai_err_${Date.now()}`, role: 'model',
        text: `⚠️ 錯誤：${err.message || '連線至 AI 時發生問題，請確認 GEMINI_API_KEY。'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsPending(false);
    }
  };

  const handleReplaceLastAiMessage = (newText: string) => {
    setChatHistory(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'model') { updated[i] = { ...updated[i], text: newText }; break; }
      }
      return updated;
    });
  };

  const handleClearChatHistory = () => {
    setChatHistory([]);
    setTurnCount(1);
    saveToStorage('english_typing_chat', []);
    saveToStorage('english_typing_turn', 1);
  };

  // ── Tab config ─────────────────────────────────────────────
  const TAB_ITEMS = [
    { key: 'dashboard', icon: Activity,      labelZh: '總覽',   labelFull: '總覽儀表板 (Overview)' },
    { key: 'classical', icon: Keyboard,      labelZh: '盲打',   labelFull: '經典盲打 (Typing)'     },
    { key: 'chat',      icon: MessageSquare, labelZh: 'AI教練', labelFull: 'AI 互動教練 (AI Coach)' },
    { key: 'notebook',  icon: BookOpen,      labelZh: '錯題本', labelFull: '寫作錯題本 (Notebook)' },
  ] as const;

  // ── Storage usage badge color ──────────────────────────────
  const storageColor = storagePercent >= 80 ? 'text-rose-500' : storagePercent >= 50 ? 'text-amber-500' : 'text-emerald-600';

  return (
    <div
      className={`min-h-dvh font-sans antialiased flex flex-col transition-colors duration-300 ${
        theme === 'dark' ? 'dark bg-[#060c0b] text-slate-100 dark-theme-override' : 'bg-[#FBFDFD] text-slate-800'
      }`}
    >
      {/* ── Confirm Modal ───────────────────────────────── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* ── Header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">

          <div onClick={() => setActiveTab('dashboard')}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-90 select-none transition group shrink-0">
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-800 to-emerald-950 rounded-xl flex items-center justify-center text-amber-400 border border-emerald-700/50 shadow-md shadow-emerald-950/20 group-hover:scale-105 transition-transform duration-200">
              <Keyboard className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="font-sans font-extrabold text-sm text-slate-900 tracking-tight block group-hover:text-emerald-700 transition-colors">AI 英文盲打與寫作教練</span>
              <span className="text-[9px] text-emerald-700 font-extrabold tracking-wider uppercase">English Touch-Typing Gym & Writing Coach</span>
            </div>
            <span className="sm:hidden font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">AI 英打教練</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-50 border border-slate-100 p-1 rounded-xl">
            {TAB_ITEMS.map(({ key, icon: Icon, labelFull }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover-3d-shadow ${
                  activeTab === key ? 'bg-emerald-800 text-white shadow-sm font-extrabold border border-emerald-700' : 'text-slate-600 hover:text-emerald-800'
                }`}>
                <Icon className="h-3.5 w-3.5" />
                <span>{labelFull}</span>
              </button>
            ))}
          </nav>

          {/* Right utils */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
              className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#132220] text-slate-600 dark:text-amber-400 transition cursor-pointer flex items-center justify-center hover-3d-shadow"
              title={theme === 'light' ? '切換深色模式' : '切換日光模式'}>
              {theme === 'light' ? <Moon className="h-4 w-4 text-emerald-800" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>

            {/* Storage usage indicator */}
            <button
              onClick={() => setActiveTab('notebook')}
              title={`本地儲存已用 ${storagePercent}%，點擊前往清理`}
              className="hidden sm:flex items-center gap-1.5 text-right cursor-pointer group">
              <HardDrive className={`h-3.5 w-3.5 ${storageColor} group-hover:scale-110 transition-transform`} />
              <div>
                <span className="text-[9px] text-slate-400 block font-bold leading-none">儲存用量</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      storagePercent >= 80 ? 'bg-rose-500' : storagePercent >= 50 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`} style={{ width: `${storagePercent}%` }} />
                  </div>
                  <span className={`text-[9px] font-extrabold font-mono ${storageColor}`}>{storagePercent}%</span>
                </div>
              </div>
            </button>

            <div className="text-right hidden sm:block">
              <span className="text-[9px] text-slate-400 block font-bold">歷史最佳</span>
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {sessions.reduce((m, s) => Math.max(m, s.wpm), 0)} WPM
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-slate-400 block font-bold">語病盲點</span>
              <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">{errors.length} 次</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 mobile-content-pad">

        {activeTab === 'classical' && customPracticeText && (
          <div className="mb-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-xs text-emerald-950 font-semibold leading-relaxed truncate">
                <strong>金句成功載入！</strong> 已將 AI 教練推薦的道地說法載入盲打系統。
              </p>
            </div>
            <button onClick={() => setCustomPracticeText(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-extrabold underline shrink-0 cursor-pointer">取消</button>
          </div>
        )}

        <ErrorBoundary fallbackLabel="總覽儀表板發生錯誤，請重新載入此區塊。">
          {activeTab === 'dashboard' && (
            <WelcomeDashboard
              sessions={sessions} errors={errors} errorRanking={errorRanking}
              onNavigate={setActiveTab} weeklyGoal={weeklyGoal}
              onUpdateWeeklyGoal={handleUpdateWeeklyGoal}
            />
          )}
        </ErrorBoundary>

        <ErrorBoundary fallbackLabel="經典盲打模式發生錯誤，請重新載入。">
          {activeTab === 'classical' && (
            <ClassicalTypingMode
              key={customPracticeText || 'standard'}
              onSessionComplete={(wpm, acc, len, title) =>
                handleSessionComplete(wpm, acc, len, customPracticeText ? 'AI 母語金句盲打練習' : title)}
              presetOverride={customPracticeText
                ? { title: 'AI 母語地道金句', difficulty: 'intermediate', text: customPracticeText }
                : undefined}
            />
          )}
        </ErrorBoundary>

        <ErrorBoundary fallbackLabel="AI 互動教練發生錯誤，請重新載入。">
          {activeTab === 'chat' && (
            <InteractiveChatCoach
              chatHistory={chatHistory}
              turnCount={turnCount}
              currentErrorRanking={Object.entries(errorRanking).map(([c, n]) => ({ category: c, count: n as number }))}
              onSendMessage={handleSendMessage}
              onLoadForPractice={handleLoadForPractice}
              isPending={isPending}
              onSessionComplete={handleSessionComplete}
              onReplaceLastAiMessage={handleReplaceLastAiMessage}
              onClearChatHistory={handleClearChatHistory}
            />
          )}
        </ErrorBoundary>

        <ErrorBoundary fallbackLabel="錯題本發生錯誤，請重新載入。">
          {activeTab === 'notebook' && (
            <ErrorNotebook
              errors={errors}
              onClearAllErrors={handleClearAllErrors}
              onSessionComplete={handleSessionComplete}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around py-1">
          {TAB_ITEMS.map(({ key, icon: Icon, labelZh }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors min-w-[60px] cursor-pointer ${
                activeTab === key ? 'text-emerald-700' : 'text-slate-400 active:text-emerald-600'
              }`}>
              <Icon className={`h-5 w-5 transition-transform ${activeTab === key ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-bold ${activeTab === key ? 'text-emerald-700' : 'text-slate-400'}`}>{labelZh}</span>
              {activeTab === key && <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Footer (desktop) ────────────────────────────── */}
      <footer className="hidden md:block bg-white border-t border-slate-100 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-medium">
          AI 英文盲打與寫作教練 © {new Date().getFullYear()} — 指尖肌肉記憶 × 雙模 AI 剖析
        </div>
      </footer>
    </div>
  );
}
