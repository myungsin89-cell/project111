
export interface BookImage {
  id: string;
  url: string;
  size: 'sm' | 'md' | 'lg' | 'full';
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string; // 소제목 추가
  content: string;
  images: BookImage[];
  currentCollaborator?: {
    name: string;
    color: string;
  };
}

export interface Book {
  id: string;
  title: string;
  description: string;
  sections: Section[];
  aiPersona: string;
  targetAudience: string;
}

export interface AISuggestion {
  text: string;
  type: 'continuation' | 'phrase' | 'idea';
}

export interface VocabularyRecommendation {
  word: string;
  meaning: string;
  nuance: string;
}

export enum SidebarTab {
  TOC = 'TOC',
  AI_ASSISTANT = 'AI_ASSISTANT',
  CONFIG = 'CONFIG',
  VOCABULARY = 'VOCABULARY'
}
