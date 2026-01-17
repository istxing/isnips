// Type definitions for ClipIndex extension

export interface ClipCard {
  id: string;
  url: string;
  clipText: string;
  domain: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Highlight {
  id: string;
  text: string;
  url: string;
  timestamp: number;
}

export interface Settings {
  language: 'zh-CN' | 'en' | 'ja';
  blockedSites: string[];
}

export type Language = 'zh-CN' | 'en' | 'ja';

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

export interface MessageRequest {
  action: string;
  data?: any;
  cardId?: string;
  updates?: Partial<ClipCard>;
  filters?: {
    search?: string;
  };
  highlight?: Highlight;
  url?: string;
  highlightId?: string;
  key?: string;
  value?: any;
  defaultValue?: any;
}

export interface MessageResponse {
  success: boolean;
  cards?: ClipCard[];
  highlights?: Highlight[];
  value?: any;
  card?: ClipCard;
  error?: string;
}
