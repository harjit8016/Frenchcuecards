export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordCategory = 'all' | 'verbs' | 'questions' | 'family' | 'connectors' | 'grammar';
export type AppMode = 'flashcards' | 'reels';

export interface VocabularyWord {
  id: string;
  level: CEFRLevel;
  category?: 'verbs' | 'questions' | 'family' | 'connectors' | 'grammar' | 'general';
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  meaning_pa: string; // Punjabi meaning in Gurmukhi (ਪੰਜਾਬੀ ਅਰਥ)
  example_fr: string; // French example sentence
  example_pa: string; // Punjabi translation of example sentence
}

export interface TeacherAdCard {
  id: string;
  isAd: true;
  level: CEFRLevel;
  title_fr: string;
  title_pa: string;
  subtitle_fr: string;
  subtitle_pa: string;
  bio_pa: string;
  linkUrl: string;
  instagramHandle: string;
  badge: string;
}

export type FeedCardItem = 
  | (VocabularyWord & { isAd?: false })
  | TeacherAdCard;

export interface LevelMetadata {
  level: CEFRLevel;
  title: string;
  punjabiTitle: string;
  description: string;
  count: number;
}

