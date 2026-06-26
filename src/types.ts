export type ErrorCategory =
  | 'Direct Translation'
  | 'Missing Subject'
  | 'Wrong Preposition'
  | 'Wrong Chunk'
  | 'Word Choice'
  | 'Grammar';

export const CATEGORY_CHINESE: Record<ErrorCategory, string> = {
  'Direct Translation': '中式直譯 (Direct Translation)',
  'Missing Subject': '遺漏主詞 (Missing Subject)',
  'Wrong Preposition': '介系詞錯誤 (Wrong Preposition)',
  'Wrong Chunk': '搭配詞不當 (Wrong Chunk)',
  'Word Choice': '單字選用不當 (Word Choice)',
  'Grammar': '文法錯誤 (Grammar)'
};

export interface WritingError {
  id: string;
  category: ErrorCategory;
  original: string;
  corrected: string;
  explanation: string;
  nativeAlternative: string;
  date: string;
}

export interface TypingSession {
  id: string;
  mode: 'classical' | 'chat_response' | 'error_review';
  wpm: number;
  accuracy: number;
  date: string;
  textLength: number;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isFriendTurn?: boolean;
  wordCount?: number;
  analysis?: {
    correctedText: string;
    isCorrect: boolean;
    errorsFound: Omit<WritingError, 'id' | 'date'>[];
    understandableEnglish: string;
    nativeSpeakerVersion: string;
    highlyNaturalVersion: string;
    isTooShort: boolean;
    wordCount: number;
  };
}

export interface ErrorRanking {
  'Direct Translation': number;
  'Missing Subject': number;
  'Wrong Preposition': number;
  'Wrong Chunk': number;
  'Word Choice': number;
  'Grammar': number;
}

export interface WeeklyGoal {
  type: 'words' | 'minutes';
  value: number;
}
