
import { Chapter, VocabDB, TargetWord } from '../types';
import { IRREGULAR_VERBS } from '../constants';

// Helper: Convert Chinese numbers to Arabic (e.g. 一百二十三 -> 123)
const chineseToNumber = (cn: string): string => {
  const map: Record<string, number> = {
    '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, 
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100, '千': 1000,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };

  let result = 0;
  let current = 0;
  let hasUnit = false;

  // Simple direct mapping for mixed strings or pure digits
  if (/^\d+$/.test(cn)) return cn;

  for (let i = 0; i < cn.length; i++) {
    const char = cn[i];
    const val = map[char];
    
    if (val !== undefined) {
      if (val >= 10) {
        // It's a unit (10, 100, 1000)
        if (current === 0 && !hasUnit && val === 10) current = 1; // Handle "十" at start as 10
        result += current * val;
        current = 0;
        hasUnit = true;
      } else {
        current = val;
      }
    }
  }
  result += current;
  return result.toString();
};

export const parseNovel = (text: string): Chapter[] => {
  // Normalize line endings
  const lines = text.split(/\r?\n/);
  
  // Enhanced Chapter Regex
  // Matches: 
  // - Chinese: 第x章, 第x卷, etc.
  // - English: Chapter 1, Chapter.1, Chapter. 1, Part 1, Vol.1, Book 1
  // - Special: Prologue, Epilogue, Introduction, etc.
  const chapterRegex = /^\s*(?:第[0-9零一二三四五六七八九十百千]+[章卷回節篇]|(?:Chapter|Part|Vol|Book)\s*\.?\s*[\dIVX]+|序[章言]?|楔子|番外|后记|後記|尾声|尾聲|Introduction|Prologue|Epilogue)/i;

  const chapters: Chapter[] = [];
  let currentChap: Chapter = { title: "Start", segments: [], isTranslated: false };
  let globalIdCounter = 0;

  lines.forEach(line => {
    const clean = line.trim();
    if (!clean) return;

    if (chapterRegex.test(clean)) {
      // Archive current chapter if it has content or is not the initial dummy
      if (currentChap.segments.length > 0 || currentChap.title !== "Start") {
        chapters.push(currentChap);
      }
      
      // Start new chapter
      currentChap = { title: clean, segments: [], isTranslated: false };
      
      // Add title as a header segment
      currentChap.segments.push({
        id: `seg-${globalIdCounter++}`,
        text: clean,
        isChapterHeader: true,
        status: 'pending'
      });
    } else {
      // Content segment - No merging, strict line-by-line
      currentChap.segments.push({
        id: `seg-${globalIdCounter++}`,
        text: clean,
        isChapterHeader: false,
        status: 'pending'
      });
    }
  });

  // Push last chapter
  if (currentChap.segments.length > 0) {
    chapters.push(currentChap);
  }

  return chapters;
};

export const formatChapterTitle = (title: string): string => {
  // 1. Check for standard "Chapter X" pattern already in English
  if (/^Chapter\s*\.?\s*(\d+)/i.test(title)) {
    // Normalise
    return title.replace(/^Chapter\s*\.?\s*(\d+).*/i, "Chapter $1");
  }

  // 2. Check for Chinese "第X章"
  const match = title.match(/^第\s*([0-9零一二三四五六七八九十百千]+)\s*[章卷]/);
  if (match) {
    const numPart = match[1];
    const arabicNum = chineseToNumber(numPart);
    return `Chapter ${arabicNum}`;
  }

  // 3. Special Titles
  if (/序[章言]?|Introduction|Prologue/i.test(title)) return "Prologue";
  if (/尾声|尾聲|Epilogue/i.test(title)) return "Epilogue";

  // Fallback: just return it, or maybe "Chapter" if it looks like a header
  return title;
};

export const getLemma = (word: string, vocabDB: VocabDB): string => {
  word = word.toLowerCase();
  if (IRREGULAR_VERBS[word]) return IRREGULAR_VERBS[word];

  const checkLevel = (w: string) => {
    for (let i = 1; i <= 6; i++) {
      if (vocabDB[i].has(w)) return i;
    }
    return 0;
  };

  if (word.endsWith('ly')) {
    let base = word.slice(0, -2);
    if (checkLevel(base) > 0) return base;
    if (word.endsWith('ily')) return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('est') && word.length > 5) return word.slice(0, -3);
  
  return word;
};

export const getWordLevel = (word: string, vocabDB: VocabDB): number => {
  const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const lemma = getLemma(cleanWord, vocabDB);
  
  if (cleanWord.length < 2) return 0;
  
  // Check exact match
  for (let i = 1; i <= 6; i++) {
    if (vocabDB[i].has(cleanWord)) return i;
  }
  // Check lemma match
  for (let i = 1; i <= 6; i++) {
    if (vocabDB[i].has(lemma)) return i;
  }
  
  return 99; // Hard/Out
};

export const analyzeTextForVocab = (text: string, vocabDB: VocabDB): TargetWord[] => {
  const words: string[] = text.match(/\b[a-zA-Z]+\b/g) || [];
  const targetWords: TargetWord[] = [];
  const uniqueCheck = new Set<string>();

  words.forEach(w => {
    const lowerW = w.toLowerCase();
    const level = getWordLevel(lowerW, vocabDB);
    const isCapitalized = w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
    
    // Skip names (capitalized words not in dictionary)
    if (level === 99 && isCapitalized) return;

    if ((level >= 3 || level === 99) && !uniqueCheck.has(lowerW)) {
      targetWords.push({ word: w, level: level });
      uniqueCheck.add(lowerW);
    }
  });

  return targetWords;
};
