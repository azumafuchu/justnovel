
import React, { useState } from 'react';
import { Chapter } from '../types';
import { ChevronRight, FolderOpen, Globe, Wand2, CheckSquare, Square, FileText, Pin, Loader2, PlusCircle } from 'lucide-react';

interface ChapterListProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onTranslateChapter: (index: number) => void;
  onGenerateNotes: (segmentIds: string[]) => void;
  onBatchAddPdf: (segmentIds: string[]) => void;
  processingState: { type: 'chapter' | 'batch' | 'segment', id: string | number } | null;
  timer: number;
  t: (key: any, params?: any) => string;
}

export const ChapterList: React.FC<ChapterListProps> = ({ 
  chapters, 
  currentChapterIndex, 
  onSelectChapter,
  onTranslateChapter,
  onGenerateNotes,
  onBatchAddPdf,
  processingState,
  timer,
  t
}) => {
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set());

  // Chapter List View
  if (currentChapterIndex === -1) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-primary font-bold text-lg mb-2">
           <FolderOpen /> {t('directory')}
        </div>
        <div className="text-sm text-gray-500 mb-2">{t('totalChapters', { count: chapters.length })}</div>
        {chapters.map((chap, idx) => (
          <div 
            key={idx}
            onClick={() => onSelectChapter(idx)}
            className="bg-white p-4 rounded-lg border-l-4 border-yellow-500 shadow-sm hover:shadow-md cursor-pointer flex justify-between items-center transition-all"
          >
            <span className="font-medium text-gray-800">{chap.title}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{chap.segments.length} {t('segments')}</span>
              {chap.isTranslated && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{t('translated')}</span>}
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Single Chapter View
  const chapter = chapters[currentChapterIndex];
  
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedSegments);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSegments(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSegments.size === chapter.segments.length) {
      setSelectedSegments(new Set());
    } else {
      setSelectedSegments(new Set(chapter.segments.map(s => s.id)));
    }
  };

  const handleBatchGenerate = () => {
    onGenerateNotes(Array.from(selectedSegments));
    setSelectedSegments(new Set());
  };

  const handleBatchAdd = () => {
    onBatchAddPdf(Array.from(selectedSegments));
    setSelectedSegments(new Set());
  };

  const isTranslating = processingState?.type === 'chapter' && processingState?.id === currentChapterIndex;
  const isBatchProcessing = processingState?.type === 'batch';

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Navigation Toolbar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 p-4 shadow-sm rounded-lg flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-primary font-bold cursor-pointer hover:underline" onClick={() => onSelectChapter(-1)}>
          <FolderOpen size={18} /> {t('directory')} <span className="text-gray-400">/</span> <span className="text-gray-700">{chapter.title}</span>
        </div>
        
        <div className="flex gap-2">
          {!chapter.isTranslated ? (
            <button 
              onClick={() => onTranslateChapter(currentChapterIndex)}
              disabled={isTranslating}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} 
              {isTranslating ? `${t('processing')} ${timer}s` : t('phase1')}
            </button>
          ) : (
             <div className="flex items-center gap-3">
                <button 
                  onClick={toggleSelectAll}
                  className="text-gray-600 hover:text-primary flex items-center gap-1 text-sm font-medium"
                >
                  {selectedSegments.size === chapter.segments.length ? <CheckSquare size={16}/> : <Square size={16}/>}
                  {t('selectAll')}
                </button>

                {/* Batch Add to PDF */}
                <button 
                  onClick={handleBatchAdd}
                  disabled={selectedSegments.size === 0}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:text-gray-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <PlusCircle size={16} /> 
                  {t('addPdf')}
                </button>

                {/* Batch Generate */}
                <button 
                  onClick={handleBatchGenerate}
                  disabled={selectedSegments.size === 0 || isBatchProcessing}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  {isBatchProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} 
                  {isBatchProcessing ? `${t('processing')} ${timer}s` : t('phase2', { count: selectedSegments.size })}
                </button>
             </div>
          )}
        </div>
      </div>

      {/* Segments List */}
      <div className="flex flex-col gap-3">
        {chapter.segments.map(seg => {
            const isSegProcessing = processingState?.type === 'segment' && processingState?.id === seg.id;
            return (
              <div 
                key={seg.id}
                data-id={seg.id}
                className={`
                  relative p-4 rounded-lg border-l-4 shadow-sm transition-all
                  ${seg.isChapterHeader 
                    ? 'bg-orange-50 border-yellow-500' 
                    : seg.status === 'done' 
                      ? 'bg-green-50 border-green-500' 
                      : chapter.isTranslated 
                        ? 'bg-yellow-50 border-yellow-300' 
                        : 'bg-white border-gray-300'}
                `}
              >
                <div className="flex gap-3">
                  <div className="pt-1">
                    <input 
                      type="checkbox" 
                      checked={selectedSegments.has(seg.id)}
                      onChange={() => toggleSelect(seg.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex-1">
                    {seg.isChapterHeader ? (
                      <h3 className="text-lg font-bold font-cn text-orange-800 flex items-center gap-2">
                        <Pin size={16} /> {seg.text}
                      </h3>
                    ) : (
                      <>
                        <p className="text-gray-700 font-cn text-[15px] leading-relaxed mb-2">{seg.text}</p>
                        {seg.enText && (
                          <p className="text-primary font-serif text-lg leading-relaxed border-t border-dashed border-gray-200 pt-2">
                            {seg.enText}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Status Indicator Only - Buttons Removed */}
                  <div className="flex flex-col gap-2 justify-start min-w-[80px] items-end">
                    {seg.status === 'done' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                           <FileText size={12}/> {t('done')}
                        </span>
                    )}
                    {(seg.status === 'processing' || isSegProcessing) && (
                         <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-bold">
                           {timer}s
                         </span>
                    )}
                    {seg.isChapterHeader && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">
                           Title
                        </span>
                    )}
                  </div>
                </div>
              </div>
            );
        })}
      </div>
      
      {/* Legend Footer */}
      <div className="flex justify-end gap-2 mt-4 px-4">
        {['L1-2', 'L3', 'L4', 'L5', 'L6', 'Extra'].map((label, idx) => {
           const colors = ['bg-gray-100 text-gray-500 border-gray-300', 'bg-l3-bg text-l3-line', 'bg-l4-bg text-l4-line', 'bg-l5-bg text-l5-line', 'bg-l6-bg text-l6-line', 'bg-hard-bg text-hard-line'];
           return (
             <span key={idx} className={`text-[10px] px-2 py-1 rounded border font-bold ${colors[idx]}`}>{label}</span>
           )
        })}
      </div>
    </div>
  );
};
