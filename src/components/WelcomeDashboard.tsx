import React, { useState, useEffect } from 'react';
import { ErrorRanking, TypingSession, WritingError, CATEGORY_CHINESE, WeeklyGoal, ErrorCategory } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  Award, Zap, Percent, Activity, Keyboard, Sparkles, MessageSquare, 
  History, Flame, ShieldAlert, ChevronRight, HelpCircle, Target, Edit2, Check, Calendar, Trophy
} from 'lucide-react';

interface WelcomeDashboardProps {
  sessions: TypingSession[];
  errors: WritingError[];
  errorRanking: ErrorRanking;
  onNavigate: (tab: 'dashboard' | 'classical' | 'chat' | 'notebook') => void;
  weeklyGoal: WeeklyGoal;
  onUpdateWeeklyGoal: (goal: WeeklyGoal) => void;
}

export default function WelcomeDashboard({
  sessions,
  errors,
  errorRanking,
  onNavigate,
  weeklyGoal,
  onUpdateWeeklyGoal
}: WelcomeDashboardProps) {
  // Local states for Goal editing
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editType, setEditType] = useState<'words' | 'minutes'>(weeklyGoal.type);
  const [editValue, setEditValue] = useState(weeklyGoal.value);

  // Sync editing form with prop updates
  useEffect(() => {
    setEditType(weeklyGoal.type);
    setEditValue(weeklyGoal.value);
  }, [weeklyGoal]);

  // Helper to find Monday of the current week (local time)
  const getStartOfWeek = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const startOfWeek = getStartOfWeek();
  const currentWeekSessions = sessions.filter(s => new Date(s.date) >= startOfWeek);
  
  // Calculate current week progress
  const currentWeekWords = currentWeekSessions.reduce((sum, s) => sum + Math.round(s.textLength / 5), 0);
  const currentWeekMinutes = currentWeekSessions.reduce((sum, s) => {
    const words = s.textLength / 5;
    const mins = s.wpm > 0 ? (words / s.wpm) : 0;
    return sum + mins;
  }, 0);

  // Rounded active typing minutes
  const activeMinutesRounded = Math.round(currentWeekMinutes * 10) / 10;

  // Determine current progression vs goal
  const progressValue = weeklyGoal.type === 'words' ? currentWeekWords : activeMinutesRounded;
  const progressPercent = Math.min(100, Math.round((progressValue / weeklyGoal.value) * 100)) || 0;
  const isGoalAchieved = progressValue >= weeklyGoal.value;

  // Compute Lifetime Stats
  const totalSessions = sessions.length;
  const bestWpm = sessions.reduce((max, s) => Math.max(max, s.wpm), 0);
  const avgWpm = totalSessions > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / totalSessions) 
    : 0;
  const avgAccuracy = totalSessions > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions) 
    : 100;
  const totalWordsTyped = sessions.reduce((sum, s) => sum + Math.round(s.textLength / 5), 0);

  // Parse error categories and counts for Ranking
  const rankingList = Object.entries(errorRanking)
    .map(([category, count]) => ({
      category: category as keyof ErrorRanking,
      count
    }))
    .sort((a, b) => b.count - a.count); // Sorted from highest to lowest frequency

  // Highlight top 3 errors
  const top3Categories = rankingList.slice(0, 3).filter(r => r.count > 0);

  // Helper to find Monday of any date
  const getMondayOfDate = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const currentMonday = getMondayOfDate(new Date());
  const weeksList: { start: Date; label: string }[] = [];

  for (let i = 4; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
    weeksList.push({ start, label });
  }

  const trendData = weeksList.map(week => {
    const nextWeekStart = new Date(week.start);
    nextWeekStart.setDate(week.start.getDate() + 7);
    
    const weekErrors = errors.filter(err => {
      const d = new Date(err.date);
      return d >= week.start && d < nextWeekStart;
    });

    const row: Record<string, any> = {
      name: week.label,
    };

    const categoriesList: ErrorCategory[] = [
      'Direct Translation',
      'Missing Subject',
      'Wrong Preposition',
      'Wrong Chunk',
      'Word Choice',
      'Grammar'
    ];
    categoriesList.forEach(cat => {
      row[cat] = 0;
    });

    weekErrors.forEach(err => {
      if (categoriesList.includes(err.category)) {
        row[err.category]++;
      }
    });

    return row;
  });

  const categoryChineseMap: Record<string, string> = {
    'Direct Translation': '中式直譯',
    'Missing Subject': '遺漏主詞',
    'Wrong Preposition': '介系詞錯誤',
    'Wrong Chunk': '搭配詞不當',
    'Word Choice': '單字選用不當',
    'Grammar': '文法錯誤'
  };

  const categoryColors: Record<string, string> = {
    'Direct Translation': '#047857', // Emerald
    'Missing Subject': '#f59e0b',   // Amber
    'Wrong Preposition': '#3b82f6', // Blue
    'Wrong Chunk': '#8b5cf6',       // Violet
    'Word Choice': '#ec4899',       // Pink
    'Grammar': '#ef4444'            // Red
  };

  return (
    <div className="space-y-6" id="welcome-dashboard">
      {/* Welcome Hero Banner - Luxurious Forest Green and Elegant Gold */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-md border border-emerald-800/30">
        <div className="absolute top-0 right-0 p-8 opacity-[0.06] animate-pulse">
          <Keyboard className="h-48 w-48 text-amber-400" />
        </div>
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
            ✨ AI 雙模英語教練與英打健身房
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            透過 AI 互動練習，輕鬆掌握英文盲打與道地表達
          </h1>
          <p className="text-xs md:text-sm text-emerald-100/90 leading-relaxed font-medium">
            同時訓練手指肌肉與英文直覺思維。在這裡，您可以進行經典英打挑戰、與 AI 教練暢聊熱門話題，系統會即時分析您的拼字速度與文法搭配，並為您打造專屬錯誤排行榜！
          </p>
          
          <div className="pt-3 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('chat')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold rounded-xl text-xs shadow-md shadow-emerald-950/40 transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="h-4 w-4 text-emerald-950" />
              <span>啟動 AI 互動對話對答</span>
            </button>
            <button
              onClick={() => onNavigate('classical')}
              className="px-5 py-2.5 bg-emerald-800 border border-emerald-700 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <Keyboard className="h-4 w-4 text-amber-400" />
              <span>經典文章複製盲打</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lifetime Stats Bento Grid with Green & Gold Accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-grid">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">速度最佳紀錄</span>
            <span className="text-lg font-extrabold text-slate-800" id="dash-best-wpm">{bestWpm} WPM</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">平均正確率</span>
            <span className="text-lg font-extrabold text-slate-800">{avgAccuracy}%</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">平均打字速度</span>
            <span className="text-lg font-extrabold text-slate-800">{avgWpm} WPM</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Keyboard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">累計輸入字數</span>
            <span className="text-lg font-extrabold text-slate-800">{totalWordsTyped} 字</span>
          </div>
        </div>
      </div>

      {/* 🎯 Weekly Goal Tracking Feature */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col space-y-4" id="weekly-goal-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                🎯 本週英文寫作與練習目標 (Weekly Training Goal)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                以週為單位（週一至週日），設定您的打字量或主動練習時間，培養指尖肌肉直覺！
              </p>
            </div>
          </div>

          {!isEditingGoal && (
            <button
              onClick={() => {
                setEditType(weeklyGoal.type);
                setEditValue(weeklyGoal.value);
                setIsEditingGoal(true);
              }}
              className="px-4 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-98 cursor-pointer shadow-2xs"
              id="btn-edit-goal"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>設定目標 (Edit Goal)</span>
            </button>
          )}
        </div>

        {isEditingGoal ? (
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 space-y-4 animate-fadeIn" id="goal-edit-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type Selection Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 block">1. 選擇本週目標指標：</span>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('words');
                      setEditValue(editType === 'words' ? editValue : 1000);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      editType === 'words'
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    📝 累積單字量 (Words Target)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType('minutes');
                      setEditValue(editType === 'minutes' ? editValue : 20);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      editType === 'minutes'
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    ⏱️ 練習打字時間 (Minutes Target)
                  </button>
                </div>
              </div>

              {/* Target Value Input */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 block">2. 設定每週目標數值：</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99999"
                    value={editValue}
                    onChange={(e) => setEditValue(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-extrabold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 transition-all font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {editType === 'words' ? '單字 (Words)' : '分鐘 (Minutes)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Presets Row */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 block">快速選擇預設量：</span>
              <div className="flex flex-wrap gap-2">
                {editType === 'words' ? (
                  [250, 500, 1000, 2500, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditValue(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        editValue === val
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold'
                          : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      {val === 250 ? '🌱 250字 (極簡易)' : 
                       val === 500 ? '🍀 500字 (簡易)' : 
                       val === 1000 ? '⚡ 1000字 (標準)' : 
                       val === 2500 ? '🔥 2500字 (進階)' : '👑 5000字 (魔王)'}
                    </button>
                  ))
                ) : (
                  [5, 10, 20, 30, 60].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditValue(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        editValue === val
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold'
                          : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      {val === 5 ? '🌱 5 分鐘' : 
                       val === 10 ? '🍀 10 分鐘' : 
                       val === 20 ? '⚡ 20 分鐘 (推薦)' : 
                       val === 30 ? '🔥 30 分鐘' : '👑 60 分鐘 (菁英)'}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2.5 border-t border-slate-200/60 pt-3">
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition active:scale-98 cursor-pointer"
              >
                取消 (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateWeeklyGoal({ type: editType, value: editValue });
                  setIsEditingGoal(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-extrabold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
                id="btn-save-goal"
              >
                <Check className="h-4 w-4" />
                <span>儲存設定 (Save Goal)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Goal Progress Header Details */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    本週進度 ({startOfWeek.toLocaleDateString()} 起)
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-700 leading-relaxed">
                  目前已達：
                  <span className="text-xl font-black text-emerald-800 font-mono mx-1">
                    {weeklyGoal.type === 'words' ? `${progressValue} 字` : `${progressValue} 分鐘`}
                  </span>
                  / 本週目標：
                  <span className="font-extrabold font-mono text-slate-800 mx-1">
                    {weeklyGoal.value} {weeklyGoal.type === 'words' ? '字' : '分鐘'}
                  </span>
                </div>
              </div>
              <div className="text-right sm:text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-bold">達成比率</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* High Definition Progress Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden relative shadow-inner" id="weekly-goal-progress-container">
              <div
                className={`h-full rounded-full transition-all duration-750 bg-gradient-to-r from-emerald-700 via-emerald-600 to-amber-400`}
                style={{ width: `${progressPercent}%` }}
                id="weekly-goal-progress-bar"
              />
            </div>

            {/* Motivational message or achievement card */}
            {isGoalAchieved ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs animate-fadeIn" id="goal-achieved-celebration">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 rounded-xl shadow-xs">
                  <Trophy className="h-5 w-5 text-emerald-950 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                    🏆 恭喜！您已成功解鎖本週目標！
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                  </h4>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-0.5">
                    太優秀了！透過不懈練習，您的手指肌肉正逐步與大腦的英文語感同步硬編碼。繼續保持高頻度的指尖觸擊，迎接自信書寫的明天！
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
                <span className="text-amber-500 text-xs mt-0.5 shrink-0">💡</span>
                <p>
                  <strong>教練打氣：</strong> 距離本週的目標還剩下{' '}
                  <span className="font-extrabold font-mono text-emerald-700 text-xs">
                    {weeklyGoal.type === 'words' 
                      ? `${Math.max(1, weeklyGoal.value - currentWeekWords)} 字`
                      : `${Math.max(0.1, Math.round((weeklyGoal.value - activeMinutesRounded) * 10) / 10)} 分鐘`
                    }
                  </span>
                  。每天只要完成一組 5-10 分鐘 of AI 互動對答或盲打練習，即可輕鬆達標！加油，累積定能成器！
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📈 錯誤類型趨勢圖 (Error Type Trend Chart) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col space-y-4" id="error-trend-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                📈 錯誤類型趨勢分析 (Weekly Error Type Trend Chart)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                分析每週各類型寫作錯誤的增減趨勢。折線往下代表該類型錯誤減少，持續進步！
              </p>
            </div>
          </div>
        </div>

        {errors.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <Activity className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold">尚無足夠的錯誤紀錄來繪製趨勢圖</p>
            <p className="text-[11px] text-slate-400 leading-normal max-w-[200px] mx-auto">
              在 AI 互動對答中持續練習，系統將自動分析並為您追蹤每週的成長軌跡！
            </p>
          </div>
        ) : (
          <div className="w-full h-80 pt-2" id="error-trend-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [value, categoryChineseMap[name] || name]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }}
                />
                <Legend 
                  formatter={(value) => categoryChineseMap[value as string] || value}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="Direct Translation"
                  name="Direct Translation"
                  stroke={categoryColors['Direct Translation']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Missing Subject"
                  name="Missing Subject"
                  stroke={categoryColors['Missing Subject']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Wrong Preposition"
                  name="Wrong Preposition"
                  stroke={categoryColors['Wrong Preposition']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Wrong Chunk"
                  name="Wrong Chunk"
                  stroke={categoryColors['Wrong Chunk']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Word Choice"
                  name="Word Choice"
                  stroke={categoryColors['Word Choice']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Grammar"
                  name="Grammar"
                  stroke={categoryColors['Grammar']}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: 📊 Personal Error Ranking */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="dashboard-ranking-panel">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
                  📊 個人寫作錯誤排行榜 (Personal Error Ranking)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  即時追蹤您的寫作習慣。系統將優先幫您消滅發生頻率最高的表達盲點。
                </p>
              </div>
              <button
                onClick={() => onNavigate('notebook')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                詳細筆記本 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Error alerts for top 3 frequent errors */}
            {top3Categories.length > 0 && (
              <div className="mb-4 bg-amber-500/5 border border-amber-200/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
                  <h4 className="text-xs font-extrabold text-amber-800">🎯 弱點高危警報 (優先修正前 3 名常犯錯誤)</h4>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                  您最常出現的寫作問題是：<span className="font-extrabold text-rose-600">{top3Categories.map(t => CATEGORY_CHINESE[t.category as keyof typeof CATEGORY_CHINESE] || t.category).join('、')}</span>。
                  AI 教練已經在互動對話中為您專門設計特定句型來協助您刻意練習！
                </p>
              </div>
            )}

            {/* Ranking list */}
            <div className="space-y-3.5 pt-2">
              {rankingList.map((item, idx) => {
                const totalErrorsCount = Object.values(errorRanking).reduce((a, b) => a + b, 0) || 1;
                const percent = Math.round((item.count / totalErrorsCount) * 100) || 0;
                
                // Color codes for categories (Green & Gold luxury scheme)
                const colors = [
                  { bar: 'bg-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  { bar: 'bg-amber-500', bg: 'bg-amber-50/70', text: 'text-amber-700' },
                  { bar: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                  { bar: 'bg-amber-400', bg: 'bg-amber-50/50', text: 'text-amber-600' },
                  { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-500' },
                  { bar: 'bg-amber-300', bg: 'bg-amber-50/30', text: 'text-amber-500' }
                ][idx % 6];

                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-slate-400 font-bold w-4">#{idx + 1}</span>
                        <span className={`font-extrabold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                          {CATEGORY_CHINESE[item.category as keyof typeof CATEGORY_CHINESE] || item.category}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-800 font-mono">{item.count} 次錯誤</span>
                        <span className="text-[10px] text-slate-400 font-mono">({percent}%)</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${Math.max(3, item.count > 0 ? percent : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              數據即時同步。消滅排行榜上的弱點，即可大幅提高您的英文寫作品質！
            </span>
          </div>
        </div>

        {/* Right column: Practice Log History */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between" id="dashboard-history-panel">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <History className="h-5 w-5 text-emerald-700" />
                練習歷程紀錄 (Logs)
              </h3>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                累計 {totalSessions} 次
              </span>
            </div>

            {totalSessions === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Keyboard className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">尚未登錄任何練習</p>
                <p className="text-[11px] text-slate-400 leading-normal max-w-[200px] mx-auto">
                  快去啟動一個英打或對話練習，在這裡記錄您的努力印記！
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {sessions.slice(0, 6).map((session) => (
                  <div
                    key={session.id}
                    className="border border-slate-50 hover:border-slate-100 bg-slate-50/30 hover:bg-slate-50/80 rounded-xl p-3 flex justify-between items-center transition duration-150"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-extrabold text-slate-800 max-w-[120px] sm:max-w-[180px] truncate">
                        {session.title === 'Suggested Native Phrase Practice' ? '母語推薦表達盲打' :
                         session.title === 'Interactive Q&A Drafting' ? 'AI 互動即時撰寫' :
                         session.title === 'Mistake Typing Review' ? '錯題重打修正' :
                         session.title || '練習歷程'}
                      </h4>
                      <div className="flex space-x-2 text-[10px] text-slate-400 font-mono">
                        <span className="capitalize text-emerald-700 font-semibold">
                          {session.mode === 'classical' ? '經典英打' :
                           session.mode === 'chat_response' ? 'AI互動' : '錯題複習'}
                        </span>
                        <span>•</span>
                        <span>{new Date(session.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex space-x-3.5 text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">速度</span>
                        <span className="text-xs font-extrabold text-emerald-600 font-mono">{session.wpm} WPM</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">正確率</span>
                        <span className="text-xs font-extrabold text-slate-700 font-mono">{session.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-100/50 text-[11px] text-slate-600 mt-6 leading-relaxed flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>肌肉記憶：</strong>盲打能讓英文句型直接深植於手指神經，使您用英文寫作與溝通時更加流暢。推薦每日練習 15 分鐘！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
