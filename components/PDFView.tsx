
import React, { useMemo } from 'react';
import { VocabDB } from '../types';
import { getWordLevel, formatChapterTitle } from '../utils/textProcessing';
import { X, Trash2 } from 'lucide-react';

interface PDFViewProps {
  pdfItems: { type: 'header' | 'content' | 'break', data: any }[];
  vocabDB: VocabDB;
  onRemoveItem: (index: number) => void;
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
      { l: 'Extra', c: 'bg-hard-line' },
    ].map((item, i) => (
      <span key={i} className={`px-2 py-px rounded-[2px] text-[9px] font-medium text-white tracking-wider ${item.c}`}>
        {item.l}
      </span>
    ))}
  </div>
);

export const PDFView: React.FC<PDFViewProps> = ({ pdfItems, vocabDB, onRemoveItem, fontFamily, t }) => {
  
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

    return parts.map((part, i) => {
      const lower = part.toLowerCase();
      const v = vocabMap.get(lower);
      if (v) {
        const level = parseInt(v.l) || getWordLevel(v.w, vocabDB);
        
        if (level < 3 && level !== 99) return <span key={i}>{part}</span>;
        
        // Revised structure matching user request:
        // English -> Thinner/Denser Dashed Underline (border-b) -> No Bold -> Chinese (mt-0, font-normal)
        return (
          <span key={i} className="group relative inline-block mx-[2px] align-baseline">
             {/* English Word: Colored text, Tight dashed underline (border-b = 1px for finer line), no bold (font-normal) */}
             <span className={`px-1 pb-0 pt-[2px] leading-none rounded-t-[3px] font-serif font-normal border-b border-dashed ${getBorderColor(level)} ${getHighlightBg(level)} ${getTextColor(level)} transition-colors`}>
              {part}
            </span>
             {/* Chinese Meaning: Absolute positioning strictly below the line with NO gap (mt-0), Font Normal (no bold) */}
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-0 text-[0.45em] text-slate-700 font-sans font-normal whitespace-nowrap leading-none pointer-events-none">
              {v.cm}
            </span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const groupedItems = useMemo(() => {
    const groups: any[] = [];
    let currentContentGroup: { type: 'content-group', items: any[] } | null = null;

    pdfItems.forEach((item, index) => {
      if (item.type === 'content') {
        if (!currentContentGroup) {
          currentContentGroup = { type: 'content-group', items: [] };
          groups.push(currentContentGroup);
        }
        currentContentGroup.items.push({ originalIndex: index, data: item.data });
      } else {
        currentContentGroup = null; 
        groups.push({ ...item, originalIndex: index });
      }
    });
    return groups;
  }, [pdfItems]);

  if (pdfItems.length === 0) {
     return (
        <div className="w-[210mm] min-h-[50vh] bg-white shadow-sm mx-auto p-20 text-center text-gray-400 border border-gray-100 rounded">
          {t('pdfEmpty')}
        </div>
     );
  }

  return (
    <div id="pdf-root" className="w-[210mm] min-h-screen bg-white shadow-xl mx-auto relative group/page">
      <div 
        className="w-full h-full relative"
        style={{ padding: '20mm 15mm' }}
      >
         {groupedItems.map((group, gIdx) => (
           <React.Fragment key={gIdx}>
              {/* Header */}
              {group.type === 'header' && (
                <div className="break-inside-avoid">
                  <div 
                    className="group relative mb-10 mt-6 text-center"
                  >
                    <button onClick={() => onRemoveItem(group.originalIndex)} className="absolute -right-8 top-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden p-2"><X size={20}/></button>
                    
                    <h1 className="text-4xl font-bold text-slate-800 font-serif mb-3 tracking-wide">
                      {formatChapterTitle(group.data.text)}
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="h-px w-12 bg-gray-300"></div>
                        <h2 className="text-sm font-cn text-slate-500 tracking-[0.2em] uppercase">
                        {group.data.text}
                        </h2>
                        <div className="h-px w-12 bg-gray-300"></div>
                    </div>
                    <Legend />
                  </div>
                </div>
              )}

              {/* Content Group (Cluster of paragraphs) */}
              {group.type === 'content-group' && (
                 <div className="mb-6 pb-6">
                   <div className="grid grid-cols-[2.5fr_1fr] gap-8 items-start">
                      {/* LEFT COLUMN: Stack all text paragraphs */}
                      {/* Reduced gap from 10 to 6 for tighter packing */}
                      <div className="text-col flex flex-col gap-6">
                         {group.items.map((item: any, iIdx: number) => (
                            <div 
                              key={iIdx} 
                              className="group relative break-inside-avoid"
                              style={{ pageBreakInside: 'avoid' }}
                            >
                                <button onClick={() => onRemoveItem(item.originalIndex)} className="absolute -left-8 top-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden p-1"><X size={16}/></button>
                                
                                <div 
                                  className="text-justify text-2xl leading-[2.8] text-slate-800"
                                  style={{ fontFamily: fontFamily }}
                                >
                                  {renderHighlightedText(item.data.en, item.data.vocab)}
                                </div>
                                <div className="text-sm text-slate-500 font-cn mt-3 pl-4 border-l border-slate-200 leading-relaxed opacity-80">
                                  {item.data.cn}
                                </div>
                            </div>
                         ))}
                      </div>

                      {/* RIGHT COLUMN: Stack all vocab cards tightly */}
                      <div className="flex flex-col gap-2 pt-2 sticky top-0">
                         {group.items.flatMap((item: any) => item.data.vocab || [])
                             .filter((v: any, index: number, self: any[]) => {
                                const l = parseInt(v.l) || getWordLevel(v.w, vocabDB);
                                return l >= 3 || l === 99;
                             })
                             .map((v: any, vIdx: number) => {
                               const level = parseInt(v.l) || getWordLevel(v.w, vocabDB);
                               return (
                                  <div 
                                    key={vIdx} 
                                    className={`
                                      border-l-2 pl-3 py-2 rounded-r-sm break-inside-avoid
                                      ${getLevelClass(level)} ${getHighlightBg(level)}
                                      transition-all hover:pl-4
                                    `}
                                    style={{ pageBreakInside: 'avoid' }}
                                  >
                                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                      {/* HEADWORD: Force sans-serif */}
                                      <span className="font-bold text-[15px] text-slate-800 font-sans">{v.w}</span>
                                      <span className={`px-1.5 py-[1px] rounded-[2px] text-[8px] text-white font-normal tracking-wide ${getBadgeColor(level)}`}>
                                        {getLevelLabel(level)}
                                      </span>
                                    </div>
                                    {/* DEFINITION: Force sans-serif */}
                                    <span className="text-slate-600 block font-sans transform origin-left leading-normal text-[11px]">{v.def}</span>
                                  </div>
                               )
                             })
                         }
                      </div>
                   </div>
                 </div>
              )}
           </React.Fragment>
         ))}
      </div>
    </div>
  );
};
