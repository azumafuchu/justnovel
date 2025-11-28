import React, { useState } from 'react';
import { VocabDB } from '../types';
import { getWordLevel, formatChapterTitle } from '../utils/textProcessing';
import { X, ArrowUp, ArrowDown, AlignVerticalJustifyCenter, Trash2 } from 'lucide-react';

interface PDFViewProps {
  pdfItems: { type: 'header' | 'content' | 'break', data: any }[];
  vocabDB: VocabDB;
  onRemoveItem: (index: number) => void;
  onClearPdf: () => void;
  fontFamily: string;
  t: (key: any, params?: any) => string;
}

const Legend = () => (
  <div className="flex flex-wrap gap-2 justify-center mt-2 mb-2 pointer-events-none opacity-80 scale-90">
    {[
      { l: 'L3', c: 'bg-l3-line' },
      { l: 'L4', c: 'bg-l4-line' },
      { l: 'L5', c: 'bg-l5-line' },
      { l: 'L6', c: 'bg-l6-line' },
    ].map((item, i) => (
      <span key={i} className={`px-2 py-px rounded-[2px] text-[9px] font-medium text-white tracking-wider ${item.c}`}>
        {item.l}
      </span>
    ))}
  </div>
);

// ForwardRef allows react-to-print to target this component's DOM node
export const PDFView = React.forwardRef<HTMLDivElement, PDFViewProps>(({ pdfItems, vocabDB, onRemoveItem, onClearPdf, fontFamily, t }, ref) => {
  
  // State for vertical offset of Chinese text (Gap between EN and CN)
  const [cnOffset, setCnOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pdf_cn_offset');
      return saved ? parseInt(saved) : -2; 
    } catch {
      return -2;
    }
  });

  const updateOffset = (val: number) => {
    setCnOffset(val);
    localStorage.setItem('pdf_cn_offset', String(val));
  };

  // Helpers for sidebar cards
  const getLevelClass = (level: number) => {
    switch(level) {
      case 3: return 'border-l3-line';
      case 4: return 'border-l4-line';
      case 5: return 'border-l5-line';
      case 6: return 'border-l6-line';
      default: return 'border-hard-line';
    }
  };
  
  const getHighlightBg = (level: number) => {
    switch(level) {
      case 3: return 'bg-l3-bg';
      case 4: return 'bg-l4-bg';
      case 5: return 'bg-l5-bg';
      case 6: return 'bg-l6-bg';
      default: return 'bg-hard-bg';
    }
  };

  // Helpers for underlines in text
  const getBorderColor = (level: number) => {
    switch(level) {
      case 3: return 'border-l3-line';
      case 4: return 'border-l4-line';
      case 5: return 'border-l5-line';
      case 6: return 'border-l6-line';
      default: return 'border-hard-line';
    }
  };

  const getTextColor = (level: number) => {
    switch(level) {
      case 3: return 'text-l3-line';
      case 4: return 'text-l4-line';
      case 5: return 'text-l5-line';
      case 6: return 'text-l6-line';
      default: return 'text-hard-line';
    }
  };

  const getBadgeColor = (level: number) => {
    switch(level) {
      case 3: return 'bg-l3-line';
      case 4: return 'bg-l4-line';
      case 5: return 'bg-l5-line';
      case 6: return 'bg-l6-line';
      default: return 'bg-hard-line';
    }
  };

  const getLevelLabel = (level: number) => {
    if (level === 99) return 'Extra';
    return `L${level}`;
  };

  const renderHighlightedText = (text: string, vocab: any[]) => {
    if (!vocab) return text;
    
    const vocabMap = new Map();
    vocab.forEach((v: any) => vocabMap.set(v.w.toLowerCase(), v));

    // Split keeping delimiters to preserve punctuation/spaces
    const parts = text.split(/(\b[a-zA-Z]+\b)/g);
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const lower = part.toLowerCase();
      const v = vocabMap.get(lower);

      if (v) {
        const level = parseInt(v.l) || getWordLevel(v.w, vocabDB);
        
        // Skip basic words (L1-2) unless they are strictly L3+ or Extra (99)
        if (level < 3 && level !== 99) {
          elements.push(<span key={i}>{part}</span>);
          continue;
        }
        
        const isExtra = level === 99;

        // --- STICKY PUNCTUATION LOGIC ---
        // Look ahead to the next part. If it starts with punctuation, 
        // glue it to this word to prevent wrapping separation.
        let suffix = null;
        if (i + 1 < parts.length) {
          const nextPart = parts[i + 1];
          // Matches standard punctuation that should stick to the left
          const punctMatch = nextPart.match(/^([.,!?;:’'”")\]}]+)/);
          if (punctMatch) {
             suffix = punctMatch[1];
             // Remove the captured punctuation from the next part so it doesn't render twice
             parts[i + 1] = nextPart.substring(suffix.length);
          }
        }

        const WordUnit = (
          <span 
            className="group inline-flex flex-col items-center mx-[1px] break-inside-avoid"
            style={{ 
              verticalAlign: 'baseline',
              pageBreakInside: 'avoid', 
              breakInside: 'avoid',
              textIndent: '0' 
            }}
          >
             {/* English Word */}
             <span className={
               isExtra 
                ? "px-1 pt-[1px] leading-none font-serif font-normal border-b border-dashed border-hard-line text-slate-900 transition-colors box-decoration-clone"
                : `px-1 pt-[1px] leading-none rounded-t-[3px] font-serif font-normal border-b border-dashed ${getBorderColor(level)} ${getHighlightBg(level)} ${getTextColor(level)} transition-colors box-decoration-clone`
             }>
              {part}
            </span>
             {/* Chinese Meaning */}
            <span 
              className={`text-[0.45em] font-sans font-normal whitespace-nowrap leading-none pointer-events-none text-slate-700`}
              style={{ marginTop: `${cnOffset}px` }}
            >
              {v.cm}
            </span>
          </span>
        );

        if (suffix) {
          // Glue the word and punctuation together in a non-breaking wrapper
          elements.push(
            <span key={i} style={{ whiteSpace: 'nowrap', display: 'inline' }}>
              {WordUnit}
              <span>{suffix}</span>
            </span>
          );
        } else {
          elements.push(<React.Fragment key={i}>{WordUnit}</React.Fragment>);
        }

      } else {
        elements.push(<span key={i}>{part}</span>);
      }
    }

    return elements;
  };

  // Group processing logic:
  // We need to merge consecutive 'content' items into a single block to allow 
  // the text column and vocab column to flow independently (Tetris/Waterfall).
  const processedGroups: any[] = [];
  let currentContentGroup: { item: any, index: number }[] = [];

  pdfItems.forEach((item, index) => {
    if (item.type === 'content') {
      currentContentGroup.push({ item, index });
    } else {
      // If we have accumulated content, push it as a group first
      if (currentContentGroup.length > 0) {
        processedGroups.push({ type: 'group', items: currentContentGroup });
        currentContentGroup = [];
      }
      // Push the non-content item (header/break)
      processedGroups.push({ type: 'item', item, index });
    }
  });
  // Push any remaining content group
  if (currentContentGroup.length > 0) {
    processedGroups.push({ type: 'group', items: currentContentGroup });
  }

  if (pdfItems.length === 0) {
     return (
        <div className="w-[210mm] min-h-[50vh] bg-white shadow-sm mx-auto p-20 text-center text-gray-400 border border-gray-100 rounded print:border-none">
          {t('pdfEmpty')}
        </div>
     );
  }

  return (
    <>
      {/* Floating Control Panel (Print Hidden) */}
      <div className="fixed bottom-32 right-8 z-[100] print:hidden flex flex-col gap-1 bg-white p-2 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 animate-in slide-in-from-right-10">
        <div className="text-[10px] text-center text-gray-400 font-bold mb-1 uppercase tracking-wider flex justify-center items-center gap-1">
          <AlignVerticalJustifyCenter size={12}/> CN Gap
        </div>
        <button 
          onClick={() => updateOffset(cnOffset - 1)} 
          className="p-2 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors active:scale-95" 
          title="Decrease Gap (Closer)"
        >
          <ArrowUp size={18}/>
        </button>
        <div className="text-center text-xs font-mono font-bold text-primary py-1 border-y border-gray-100 bg-gray-50">
          {cnOffset > 0 ? `+${cnOffset}` : cnOffset}px
        </div>
        <button 
          onClick={() => updateOffset(cnOffset + 1)} 
          className="p-2 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors active:scale-95" 
          title="Increase Gap (Further)"
        >
          <ArrowDown size={18}/>
        </button>
      </div>

      {/* Clear Button (Left of Export Button) */}
      <button 
        onClick={onClearPdf} 
        className="fixed bottom-8 right-72 z-50 print:hidden bg-white text-red-500 border border-red-200 hover:bg-red-50 px-4 py-3 rounded-full shadow-lg flex items-center gap-2 font-bold transition-transform hover:scale-105"
        title={t('clearPdf')}
      >
        <Trash2 size={18}/> {t('clearPdf')}
      </button>

      <div 
        id="pdf-root" 
        ref={ref}
        className="w-[210mm] min-h-screen bg-white shadow-xl mx-auto relative group/page print:w-full print:h-auto print:min-h-0 print:shadow-none print:m-0 print:bg-transparent"
      >
        <div 
          className="w-full h-full relative"
          // Reverted padding to standard 20mm all around as part of CSS Context fix
          style={{ padding: '20mm' }}
        >
           {processedGroups.map((group, gIdx) => (
             <React.Fragment key={gIdx}>
                
                {/* 1. INDIVIDUAL ITEMS (Header / Break) */}
                {group.type === 'item' && (
                  <>
                    {group.item.type === 'header' && (
                      <div 
                        className="break-inside-avoid page-break-box mb-4 pdf-avoid-break"
                        style={{ pageBreakInside: 'avoid' }}
                      >
                        <div className="group relative text-center">
                          <button onClick={() => onRemoveItem(group.index)} className="absolute -right-8 top-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden p-2"><X size={20}/></button>
                          <h1 className="text-4xl font-bold text-slate-800 font-serif mb-3 tracking-wide">
                            {formatChapterTitle(group.item.data.text)}
                          </h1>
                          <div className="flex items-center justify-center gap-4 mb-2">
                              <div className="h-px w-12 bg-gray-300"></div>
                              <h2 className="text-sm font-cn text-slate-500 tracking-[0.2em] uppercase">
                              {group.item.data.text}
                              </h2>
                              <div className="h-px w-12 bg-gray-300"></div>
                          </div>
                          <Legend />
                        </div>
                      </div>
                    )}
                    
                    {group.item.type === 'break' && (
                       <div className="html2pdf__page-break relative group print:break-after-page">
                          <div className="print:hidden w-full border-t-2 border-dashed border-gray-300 my-4 flex justify-center">
                              <span className="bg-white px-2 text-xs text-gray-400 font-bold -mt-2">Page Break</span>
                              <button onClick={() => onRemoveItem(group.index)} className="absolute right-0 -top-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white border border-red-100 rounded-full"><X size={14}/></button>
                          </div>
                       </div>
                    )}
                  </>
                )}

                {/* 2. CONTENT GROUP (Decoupled Columns) */}
                {group.type === 'group' && (
                  <div className="grid grid-cols-[3fr_1fr] gap-12 items-start mb-0">
                    
                    {/* LEFT COLUMN: All Text Paragraphs - WATER FLOW */}
                    {/* CRITICAL FIX: Changed from flex-col to block to prevent print slicing issues */}
                    <div className="block">
                      {group.items.map((entry: any, i: number) => (
                        <div 
                          key={i} 
                          // Force block context and remove height constraints
                          className="group relative mb-0 !block !h-auto !min-h-0"
                        >
                           <button onClick={() => onRemoveItem(entry.index)} className="absolute -left-8 top-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden p-1"><X size={16}/></button>
                           <div className="text-col !block !h-auto !min-h-0">
                              <div 
                                className="text-justify text-2xl leading-[2.8] text-slate-800 !block !h-auto !min-h-0"
                                style={{ 
                                  fontFamily: fontFamily,
                                  orphans: 2, // Flow naturally, prevent single lines
                                  widows: 2,  // Flow naturally, prevent single lines
                                  breakInside: 'auto' // Allow paragraph to split across pages
                                }}
                              >
                                {renderHighlightedText(entry.item.data.en, entry.item.data.vocab)}
                              </div>
                              {/* Symmetrical Spacing for Translation Block */}
                              <div className="text-sm text-slate-500 font-cn my-6 pl-4 border-l-2 border-slate-200 leading-relaxed opacity-90 break-inside-avoid">
                                {entry.item.data.cn}
                              </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* RIGHT COLUMN: All Vocab Cards (Tetris Stack) */}
                    <div className="flex flex-col gap-2 pt-0">
                      {group.items.flatMap((entry: any) => 
                        (entry.item.data.vocab || [])
                          .filter((v: any) => {
                             const l = parseInt(v.l) || getWordLevel(v.w, vocabDB);
                             // STRICTLY EXCLUDE EXTRA WORDS (99) from Sidebar
                             return l >= 3 && l <= 6; 
                          })
                          .map((v: any, vIdx: number) => {
                             const level = parseInt(v.l) || getWordLevel(v.w, vocabDB);
                             return (
                                <div 
                                  key={`${entry.index}-${vIdx}`} 
                                  // KEEP: pdf-avoid-break here to prevent slicing small cards
                                  // ADD: display: block and margin-bottom to ensure safe print boundaries
                                  className={`
                                    break-inside-avoid border-l-2 pl-3 py-2 rounded-r-sm pdf-avoid-break mb-2
                                    ${getLevelClass(level)} ${getHighlightBg(level)}
                                  `}
                                  style={{ 
                                    pageBreakInside: 'avoid', 
                                    breakInside: 'avoid',
                                    display: 'block'
                                  }}
                                >
                                  <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                    <span className="font-bold text-[15px] text-slate-800 font-sans">{v.w}</span>
                                    <span className={`px-1.5 py-[1px] rounded-[2px] text-[8px] text-white font-normal tracking-wide ${getBadgeColor(level)}`}>
                                      {getLevelLabel(level)}
                                    </span>
                                  </div>
                                  <span className="text-slate-600 block font-sans leading-normal text-[11px] whitespace-pre-wrap">{v.def}</span>
                                </div>
                             )
                          })
                      )}
                    </div>

                  </div>
                )}

             </React.Fragment>
           ))}
        </div>
      </div>
    </>
  );
});

PDFView.displayName = 'PDFView';