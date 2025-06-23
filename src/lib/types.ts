export interface LogEntry {
  id: string;
  botType: 'ChatGPT' | 'Perplexity AI';
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: string; // hh:mm:ss
  date: string; // YYYY-MM-DD formatted
}

export type BotType = 'chatgpt' | 'perplexity';