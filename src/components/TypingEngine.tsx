import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Award, CheckCircle, Percent, Zap, Keyboard } from 'lucide-react';

interface TypingEngineProps {
  mode: 'copy' | 'free';
  targetText?: string;
  onComplete: (wpm: number, accuracy: number, text: string) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  minWordsForComplete?: number;
  actionButtonLabel?: string;
}

export default function TypingEngine({
  mode,
  targetText = '',
  onComplete,
  onTextChange,
  placeholder = '在此處開始寫下您的英文回答...',
  minWordsForComplete = 0,
  actionButtonLabel = '送出練習並分析'
}: TypingEngineProps) {
  const [inputText, setInputText]     = useState('');
  const [startTime, setStartTime]     = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive]       = useState(false);
  const [isFinished, setIsFinished]   = useState(false);
  const [wpm, setWpm]                 = useState(0);
  const [accuracy, setAccuracy]       = useState(100);
  const [totalErrors, setTotalErrors] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  // Mobile: show a tap-to-start overlay for copy mode so hidden textarea gets focus
  const [copyActivated, setCopyActivated] = useState(false);

  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);

  const resetEngine = () => {
    setInputText('');
    setStartTime(null);
    setElapsedTime(0);
    setIsActive(false);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    setTotalErrors(0);
    setBackspaceCount(0);
    setCopyActivated(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    resetEngine();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [targetText, mode]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    if (!isActive && !isFinished && value.length > 0) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    if (mode === 'copy') {
      if (value.length > targetText.length) return;
      if (value.length < inputText.length) setBackspaceCount(prev => prev + 1);

      let errors = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== targetText[i]) errors++;
      }
      if (value.length > inputText.length) {
        const idx = value.length - 1;
        if (value[idx] !== targetText[idx]) setTotalErrors(prev => prev + 1);
      }

      setInputText(value);
      onTextChange?.(value);
      if (value.length === targetText.length) finishTyping(value, errors);
    } else {
      setInputText(value);
      onTextChange?.(value);
    }
  };

  useEffect(() => {
    if (isActive && startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
        setElapsedTime(elapsed);

        if (mode === 'copy') {
          const words = inputText.length / 5;
          setWpm(Math.round(words / (elapsed / 60)) || 0);
          const typedLen = inputText.length;
          if (typedLen > 0) {
            let correct = 0;
            for (let i = 0; i < typedLen; i++) {
              if (inputText[i] === targetText[i]) correct++;
            }
            setAccuracy(Math.round((correct / typedLen) * 100));
          }
        } else {
          const wordsCount = getWordCount(inputText);
          setWpm(Math.round(wordsCount / (elapsed / 60)) || 0);
          setAccuracy(100);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, startTime, inputText, mode, targetText]);

  const getWordCount = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const finishTyping = (finalVal: string, finalErrors: number) => {
    setIsActive(false);
    setIsFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed  = startTime ? Math.max(1, (Date.now() - startTime) / 1000) : elapsedTime;
    const minutes  = elapsed / 60;
    let finalWpm   = 0;
    let finalAcc   = 100;

    if (mode === 'copy') {
      finalWpm = Math.round((finalVal.length / 5) / minutes) || 0;
      let correct = 0;
      for (let i = 0; i < finalVal.length; i++) {
        if (finalVal[i] === targetText[i]) correct++;
      }
      finalAcc = Math.round((correct / targetText.length) * 100);
    } else {
      finalWpm = Math.round(getWordCount(finalVal) / minutes) || 0;
      finalAcc = 100;
    }

    setWpm(finalWpm);
    setAccuracy(finalAcc);
    onComplete(finalWpm, finalAcc, finalVal);
  };

  const handleManualSubmit = () => finishTyping(inputText, totalErrors);

  // Mobile-friendly copy mode activation
  const activateCopyMode = () => {
    setCopyActivated(true);
    // Small delay so the DOM updates before focus
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const wordsInInput = getWordCount(inputText);

  const renderCopyText = () => (
    <div
      className="font-mono text-base leading-loose tracking-wide text-slate-400 select-none p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-xs cursor-text min-h-[140px] sm:min-h-[160px] relative transition-all duration-200 hover:border-emerald-500/30"
      id="typing-copy-board"
    >
      {targetText.split('').map((char, index) => {
        let colorClass  = 'text-slate-400';
        let borderClass = '';

        if (index < inputText.length) {
          colorClass = inputText[index] === char
            ? 'text-emerald-600 font-bold'
            : 'text-rose-500 font-bold bg-rose-50 border-b border-rose-400';
        } else if (index === inputText.length) {
          colorClass  = 'text-slate-900 bg-amber-100 font-semibold';
          borderClass = 'animate-pulse border-l-2 border-emerald-700';
        }

        if (char === ' ') {
          return (
            <span key={index} className={`${colorClass} ${borderClass} relative px-0.5`}>
              {index < inputText.length && inputText[index] !== ' ' ? '␣' : ' '}
            </span>
          );
        }
        return <span key={index} className={`${colorClass} ${borderClass}`}>{char}</span>;
      })}
    </div>
  );

  return (
    <div className="w-full bg-slate-50 rounded-3xl border border-slate-100 p-4 sm:p-6 md:p-8" id="typing-engine-container">

      {/* Stats Header — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { icon: <Zap className="h-4 w-4" />, label: '打字速度 (WPM)', value: wpm,         color: 'bg-emerald-50 text-emerald-700' },
          { icon: <Percent className="h-4 w-4" />, label: '打字正確率',   value: `${accuracy}%`, color: 'bg-amber-50 text-amber-600'   },
          {
            icon: <CheckCircle className="h-4 w-4" />,
            label: mode === 'copy' ? '完成進度' : '字數統計',
            value: mode === 'copy'
              ? `${Math.round((inputText.length / Math.max(1, targetText.length)) * 100)}%`
              : `${wordsInInput} 字`,
            color: 'bg-emerald-50 text-emerald-700'
          },
          {
            icon: <Play className="h-4 w-4" />,
            label: '練習計時',
            value: `${Math.floor(elapsedTime / 60)}:${(elapsedTime % 60).toString().padStart(2, '0')}`,
            color: 'bg-slate-100 text-slate-600'
          },
        ].map(({ icon, label, value, color }, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center space-x-2.5 shadow-xs">
            <div className={`p-2 rounded-xl ${color} shrink-0`}>{icon}</div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold leading-tight truncate">{label}</div>
              <div className="text-lg font-extrabold text-slate-800 leading-tight">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Board */}
      <div className="relative mb-5">
        {mode === 'copy' ? (
          <>
            {renderCopyText()}

            {/* Hidden textarea — pointer-events-auto so iOS taps register */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInput}
              disabled={isFinished}
              className="absolute inset-0 opacity-0 resize-none"
              style={{ fontSize: '16px' }}   /* prevents iOS auto-zoom */
              id="typing-hidden-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
            />

            {/* Mobile tap-to-start overlay — shown until user activates */}
            {!copyActivated && !isFinished && (
              <button
                onClick={activateCopyMode}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-emerald-800/80 text-white gap-2 cursor-pointer sm:hidden"
                aria-label="點擊啟動鍵盤開始打字"
              >
                <Keyboard className="h-8 w-8 text-amber-300" />
                <span className="text-sm font-bold">點擊啟動鍵盤開始打字</span>
              </button>
            )}
          </>
        ) : (
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInput}
              disabled={isFinished}
              placeholder={placeholder}
              rows={5}
              className="w-full font-sans leading-relaxed p-4 rounded-2xl border border-slate-100 bg-white shadow-xs focus:ring-4 focus:ring-emerald-50 focus:border-emerald-600 outline-none transition-all duration-200 resize-none"
              style={{ fontSize: '16px' }}   /* prevents iOS auto-zoom */
              id="free-typing-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
            />
            {minWordsForComplete > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs font-medium px-1">
                <span className={wordsInInput >= minWordsForComplete ? 'text-emerald-700 font-bold' : 'text-slate-400 font-semibold'}>
                  {wordsInInput >= minWordsForComplete ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      🎉 已達 30 字門檻！（{wordsInInput} 字）
                    </span>
                  ) : (
                    `✏️ 已輸入 ${wordsInInput} 字（目標 ${minWordsForComplete} 字）`
                  )}
                </span>
                <span className="text-slate-400 font-mono font-bold">{wordsInInput} words</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <button
          onClick={resetEngine}
          className="flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-emerald-50/10 hover:border-emerald-500/20 active:scale-95 transition-all font-semibold text-sm shadow-xs cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 text-emerald-700" />
          <span>重新練習 (Reset)</span>
        </button>

        {mode === 'free' && (
          <button
            onClick={handleManualSubmit}
            disabled={isFinished || inputText.trim().length === 0}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-emerald-950 font-extrabold rounded-xl active:scale-95 transition-all text-sm shadow-sm cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" />
            <span>{actionButtonLabel}</span>
          </button>
        )}
      </div>

      {/* Completion Card */}
      {isFinished && (
        <div className="mt-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl">
              <Award className="h-6 w-6 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">🎉 恭喜完成本次盲打練習！</h4>
              <p className="text-xs text-slate-500 mt-0.5">打字速度與正確率已同步更新學習數據！</p>
            </div>
          </div>
          <div className="flex space-x-6">
            <div className="text-center">
              <span className="text-xs text-slate-400 block font-medium">速度</span>
              <span className="text-xl font-extrabold text-emerald-700">{wpm} WPM</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-slate-400 block font-medium">正確率</span>
              <span className="text-xl font-extrabold text-emerald-700">{accuracy}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


