import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VocabSetup } from './components/VocabSetup';
import { NovelImporter } from './components/NovelImporter';
import { ChapterList } from './components/ChapterList';
import { PDFView } from './components/PDFView';
import { SettingsModal } from './components/SettingsModal';
import { GuideModal } from './components/GuideModal';
import { Chapter, VocabDB, VocabStats, AppSettings, VocabResult, VocabSet, Language } from './types';
import { DEFAULT_SETTINGS, TRANSLATIONS } from './constants';
import { parseNovel, analyzeTextForVocab } from './utils/textProcessing';
import { AIService } from './services/aiService';
import { Settings as SettingsIcon, Layout, BookOpen, CheckCircle, Download, AlertTriangle, Save, UploadCloud } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'staging' | 'pdf'>('staging');
  
  // Lazy Initialize Settings with Error Handling
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error("Failed to parse settings", e);
      return DEFAULT_SETTINGS;
    }
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // API Timer & Status State
  const [processingState, setProcessingState] = useState<{ type: 'chapter' | 'batch' | 'segment', id: string | number } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const startTimeRef = useRef<number>(0);
  const [completionModal, setCompletionModal] = useState<{ show: boolean, msg: string, seconds: number } | null>(null);
  
  // Error Modal State
  const [errorModal, setErrorModal] = useState<{ show: boolean, title: string, msg: string } | null>(null);

  // Vocab State
  const [vocabDB, setVocabDB] = useState<VocabDB>({ 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() });
  
  // Translation Helper
  const t = (key: keyof typeof TRANSLATIONS.en, params: Record<string, any> = {}) => {
    let lang = settings.language;
    // Fallback if language is invalid
    if (!TRANSLATIONS[lang]) lang = 'en';
    
    let str = TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
    return str;
  };

  // Derived Stats
  const vocabStats = useMemo(() => {
    const stats: VocabStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    Object.entries(vocabDB).forEach(([lvl, set]) => {
      stats[parseInt(lvl) as keyof VocabStats] = (set as VocabSet).size;
    });
    return stats;
  }, [vocabDB]);

  const isVocabLoaded = useMemo(() => (Object.values(vocabStats) as number[]).reduce((a, b) => a + b, 0) > 0, [vocabStats]);

  // Novel State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);

  // PDF State (Persisted) with Error Handling
  const [pdfItems, setPdfItems] = useState<{type: 'header' | 'content' | 'break', data: any}[]>(() => {
    try {
      const saved = localStorage.getItem('pdf_content');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load PDF content", e);
      return [];
    }
  });

  // Services
  const aiService = useMemo(() => new AIService(settings), [settings]);

  // --- Effects ---
  useEffect(() => {
    // Only Sync Settings updates to storage (Initial load handled by useState)
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Load Vocab with error handling
    let hasLocalData = false;
    setVocabDB(prev => {
      const newDB = { ...prev };
      for (let i = 1; i <= 6; i++) {
        try {
          const saved = localStorage.getItem(`vocab_l${i}`);
          if (saved) {
            const loadedSet = new Set<string>(JSON.parse(saved));
            if (loadedSet.size > 0) hasLocalData = true;
            newDB[i as keyof VocabDB] = loadedSet;
          }
        } catch (e) {
          console.error(`Failed to load vocab level ${i}`, e);
        }
      }
      return newDB;
    });

    // Auto load defaults if empty (after a short delay to ensure state update)
    setTimeout(() => {
       const totalWords = (Object.values(vocabStats) as number[]).reduce((a, b) => a + b, 0);
       // If both localstorage and current state are effectively empty, load built-in
       if (!hasLocalData && totalWords === 0) {
           loadDefaultVocab(true);
       }
    }, 100);

    // Load Novel Progress with error handling
    const savedNovel = localStorage.getItem('novel_progress');
    if (savedNovel) {
      try {
        const data = JSON.parse(savedNovel);
        if (data.chapters) {
          setChapters(data.chapters);
          setCurrentFileName(data.fileName || '');
        }
      } catch (e) { 
        console.error("Failed to load novel progress", e); 
      }
    }
  }, []);

  // Persist PDF Items
  useEffect(() => {
    localStorage.setItem('pdf_content', JSON.stringify(pdfItems));
  }, [pdfItems]);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (processingState) {
      setTimerSeconds(0);
      interval = setInterval(() => {
        if (startTimeRef.current > 0) {
           setTimerSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [processingState]);

  // --- Handlers ---

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleVocabImport = (level: number, text: string) => {
    const words = text.match(/\b[a-zA-Z-]{2,}\b/g);
    if (words) {
      setVocabDB(prevDB => {
        const newSet = new Set(prevDB[level]);
        words.forEach(w => newSet.add(w.toLowerCase()));
        
        // Save to storage
        localStorage.setItem(`vocab_l${level}`, JSON.stringify(Array.from(newSet)));
        
        return { ...prevDB, [level]: newSet };
      });
    }
  };

  const loadDefaultVocab = async (silent = false) => {
    try {
      const promises = [1, 2, 3, 4, 5, 6].map(async (level) => {
         const res = await fetch(`vocab/${level}.txt`);
         if (!res.ok) throw new Error(`Level ${level} missing`);
         const text = await res.text();
         handleVocabImport(level, text);
      });
      await Promise.all(promises);
      if (!silent) alert(t('loadSuccess'));
    } catch (e) {
      console.error(e);
      if (!silent) alert(t('loadFail'));
    }
  };

  const handleVocabFile = async (level: number, file: File) => {
    const text = await file.text();
    handleVocabImport(level, text);
  };

  const handleVocabUrl = async (level: number, url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const text = await res.text();
      handleVocabImport(level, text);
    } catch (e) {
      alert("Failed to load URL");
    }
  };

  const clearVocab = () => {
    if (!confirm("Clear all vocabulary?")) return;
    for (let i = 1; i <= 6; i++) localStorage.removeItem(`vocab_l${i}`);
    setVocabDB({ 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() });
  };

  const handleNovelImport = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      let text = '';
      
      // 1. Try UTF-8 first
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        text = decoder.decode(arrayBuffer);
      } catch (e) {
        // 2. Fallback to GB18030 (Superset of GBK/GB2312)
        console.warn("UTF-8 decode failed, trying GB18030");
        const decoder = new TextDecoder('gb18030');
        text = decoder.decode(arrayBuffer);
      }

      const parsedChapters = parseNovel(text);
      setChapters(parsedChapters);
      setCurrentFileName(file.name);
      saveNovelState(file.name, parsedChapters);
    } catch (e) {
      console.error(e);
      alert("Failed to parse novel. Please ensure it is a valid text file.");
    }
  };

  const clearNovel = () => {
    if (!confirm(t('clearNovel') + "?")) return;
    setChapters([]);
    setCurrentFileName('');
    setPdfItems([]);
    localStorage.removeItem('novel_progress');
    localStorage.removeItem('pdf_content');
  };

  const handleClearPdf = () => {
    if (confirm(t('confirmClearPdf'))) {
        setPdfItems([]);
        localStorage.removeItem('pdf_content');
    }
  };

  const saveNovelState = (fileName: string, chaps: Chapter[]) => {
    localStorage.setItem('novel_progress', JSON.stringify({ fileName, chapters: chaps }));
  };

  const validateApiConfig = () => {
    if (!settings.apiKey) {
      setErrorModal({
        show: true,
        title: "API Not Configured",
        msg: t('apiMissing')
      });
      return false;
    }
    return true;
  };

  const handleTranslateChapter = async (index: number) => {
    if (!validateApiConfig()) return;
    
    const chapter = chapters[index];
    const segmentsToTrans = chapter.segments.filter(s => !s.isChapterHeader).map(s => s.text);
    
    if (segmentsToTrans.length === 0) return;

    startTimeRef.current = Date.now();
    setProcessingState({ type: 'chapter', id: index });

    // Update status to translating
    const newChapters = [...chapters];
    newChapters[index].segments.forEach(s => { if (!s.isChapterHeader) s.status = 'translating'; });
    setChapters(newChapters);

    try {
      const translatedTexts = await aiService.translateSegments(segmentsToTrans);
      
      // Update with results
      let tIdx = 0;
      newChapters[index].segments.forEach(s => {
        if (!s.isChapterHeader && tIdx < translatedTexts.length) {
          s.enText = translatedTexts[tIdx];
          s.status = 'pending'; // Ready for notes
          tIdx++;
        }
      });
      newChapters[index].isTranslated = true;
      setChapters(newChapters);
      saveNovelState(currentFileName, newChapters);
      
      // Stop Timer & Show Completion
      const duration = Math.ceil((Date.now() - startTimeRef.current) / 1000);
      setCompletionModal({ show: true, msg: t('taskCompleted'), seconds: duration });
    } catch (e: any) {
      setErrorModal({ show: true, title: "Translation API Error", msg: e.message });
      newChapters[index].segments.forEach(s => { if (!s.isChapterHeader) s.status = 'error'; });
      setChapters(newChapters);
    } finally {
      setProcessingState(null);
      startTimeRef.current = 0;
    }
  };

  const addToPdfState = (isHeader: boolean, cn: string, en?: string, vocab?: any[]) => {
    setPdfItems(prev => {
      const items = [...prev];
      if (isHeader) {
        items.push({ type: 'header', data: { text: cn } });
      } else {
        items.push({ type: 'content', data: { cn, en, vocab } });
      }
      return items;
    });
  };

  const handleGenerateNotes = async (segmentIds: string[]) => {
     if (!validateApiConfig()) return;

     startTimeRef.current = Date.now();
     setProcessingState({ type: segmentIds.length > 1 ? 'batch' : 'segment', id: segmentIds.length === 1 ? segmentIds[0] : 'batch' });

     // 1. Prepare payload and set loading state
     const newChapters = [...chapters];
     const payload: any[] = [];

     segmentIds.forEach(id => {
       for (const chap of newChapters) {
         const seg = chap.segments.find(s => s.id === id);
         if (seg && seg.enText) {
            seg.status = 'processing';
            const targets = analyzeTextForVocab(seg.enText, vocabDB);
            payload.push({
              id: seg.id,
              en: seg.enText,
              focus_words: targets.map(t => t.word)
            });
         }
       }
     });
     setChapters(newChapters);

     // 2. Call API
     try {
       const results = await aiService.generateVocabNotes(payload);
       
       const succeededIds = new Set<string>();
       
       // 3. Update state
       results.forEach((res: VocabResult) => {
          succeededIds.add(res.id);
          for (const chap of newChapters) {
            const seg = chap.segments.find(s => s.id === res.id);
            if (seg) {
              seg.vocabResult = res;
              seg.status = 'done';
            }
          }
       });

       // Identify failures
       const failedItems: string[] = [];
       payload.forEach(p => {
           if (!succeededIds.has(p.id)) {
               // Find segment to mark as error
               for (const chap of newChapters) {
                   const seg = chap.segments.find(s => s.id === p.id);
                   if (seg) {
                       seg.status = 'error';
                       // extract short text for display
                       const previewText = seg.text.length > 40 ? seg.text.substring(0, 40) + '...' : seg.text;
                       failedItems.push(previewText);
                   }
               }
           }
       });

       setChapters(newChapters);
       saveNovelState(currentFileName, newChapters);

       // Stop Timer
       const duration = Math.ceil((Date.now() - startTimeRef.current) / 1000);

       if (failedItems.length > 0) {
           setErrorModal({
               show: true,
               title: "There was an unexpected error.",
               msg: `Finish what you were doing. \n\nFailed to generate notes for ${failedItems.length} paragraphs. \n\nFailed items:\n${failedItems.map(i => `• ${i}`).join('\n')}`
           });
       } else {
           setCompletionModal({ show: true, msg: t('taskCompleted'), seconds: duration });
       }

     } catch (e: any) {
       setErrorModal({ show: true, title: "Notes Generation Error", msg: e.message });
       // Revert status
       segmentIds.forEach(id => {
         for (const chap of newChapters) {
           const seg = chap.segments.find(s => s.id === id);
           if (seg) seg.status = 'pending';
         }
       });
       setChapters(newChapters);
     } finally {
       setProcessingState(null);
       startTimeRef.current = 0;
     }
  };

  const handleBatchAddPdf = (segmentIds: string[]) => {
     let addedCount = 0;
     segmentIds.forEach(id => {
        for (const chap of chapters) {
           const seg = chap.segments.find(s => s.id === id);
           if (seg) {
              // Add if it's a chapter header OR if it is done (has results)
              if (seg.isChapterHeader || seg.status === 'done') {
                 addToPdfState(seg.isChapterHeader, seg.text, seg.enText, seg.vocabResult?.vocab);
                 addedCount++;
              }
           }
        }
     });
  };

  const handleExportPdf = () => {
    console.log("Export button clicked - triggering window.print()");
    try {
      // Switch to Native Browser Print
      window.print();
    } catch (error) {
      console.error("Print dialog failed to open:", error);
      alert("Failed to open print dialog. Please try Ctrl+P (Cmd+P) manually.");
    }
  };

  // --- Project Import/Export ---
  const handleExportProject = () => {
    if (!currentFileName) return;
    const data = {
      version: 28,
      timestamp: Date.now(),
      fileName: currentFileName,
      chapters,
      pdfItems
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_${currentFileName.replace('.txt', '')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProject = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.chapters && data.fileName) {
        setChapters(data.chapters);
        setCurrentFileName(data.fileName);
        setPdfItems(data.pdfItems || []);
        saveNovelState(data.fileName, data.chapters);
        alert(t('projectLoaded'));
      } else {
        throw new Error("Invalid project file format");
      }
    } catch (e) {
      alert("Failed to import project: " + (e as Error).message);
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl text-primary flex items-center gap-2">
            <BookOpen className="text-primary" /> {t('appTitle')}
            </h1>
            <button 
                onClick={() => setIsGuideOpen(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                title={t('guideTitle')}
            >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                >
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <path d="M12 17h.01"/>
                </svg>
            </button>
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="text-gray-600 hover:text-primary flex items-center gap-1 font-medium">
          <SettingsIcon size={18} /> {t('settings')}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b flex justify-center gap-8 pt-2 print:hidden">
        <button 
          onClick={() => setActiveTab('staging')} 
          className={`pb-3 px-4 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'staging' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
        >
          <Layout size={18} /> {t('tabStaging')}
        </button>
        <button 
          onClick={() => setActiveTab('pdf')} 
          className={`pb-3 px-4 font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pdf' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
        >
          <BookOpen size={18} /> {t('tabPdf')}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-100/50">
        <div className={`max-w-6xl mx-auto p-6 ${activeTab === 'staging' ? 'block' : 'hidden'} print:hidden`}>
          {!currentFileName && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <VocabSetup 
                stats={vocabStats} 
                onImportFile={handleVocabFile} 
                onImportUrl={handleVocabUrl} 
                onClear={clearVocab}
                onLoadDefault={() => loadDefaultVocab(false)}
                isLoaded={isVocabLoaded}
                t={t}
              />
              <NovelImporter 
                isDisabled={!isVocabLoaded} 
                hasNovel={!!currentFileName} 
                fileName={currentFileName}
                onImport={handleNovelImport}
                onImportProject={handleImportProject}
                onClear={clearNovel}
                t={t}
              />
            </div>
          )}

          {currentFileName && (
            <>
              {/* Project Toolbar */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4 flex justify-between items-center animate-in fade-in">
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
                     <BookOpen size={16}/> {currentFileName}
                   </span>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={handleExportProject}
                      className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 font-bold flex items-center gap-1"
                    >
                      <Save size={14} /> {t('exportProject')}
                    </button>
                    <label className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded border border-gray-200 hover:bg-gray-100 font-bold flex items-center gap-1 cursor-pointer">
                      <UploadCloud size={14} /> {t('importProject')}
                      <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && handleImportProject(e.target.files[0])} />
                    </label>
                 </div>
              </div>

              <ChapterList 
                chapters={chapters}
                currentChapterIndex={currentChapterIndex}
                onSelectChapter={setCurrentChapterIndex}
                onTranslateChapter={handleTranslateChapter}
                onGenerateNotes={handleGenerateNotes}
                onBatchAddPdf={handleBatchAddPdf}
                processingState={processingState}
                timer={timerSeconds}
                t={t}
              />
            </>
          )}
        </div>

        <div className={`w-full min-h-full bg-gray-200 overflow-y-auto ${activeTab === 'pdf' ? 'block' : 'hidden'} print:block print:bg-white`}>
           <div className="py-8 print:py-0">
             <PDFView 
               pdfItems={pdfItems} 
               vocabDB={vocabDB} 
               onRemoveItem={(index) => setPdfItems(prev => prev.filter((_, i) => i !== index))}
               onClearPdf={handleClearPdf}
               fontFamily={settings.fontFamily}
               t={t}
             />
           </div>
           
           {/* Floating Export Button moved out of here to root level */}
        </div>
      </div>

      {/* Floating Export Button (Root Level) */}
      {activeTab === 'pdf' && (
        <div className="fixed bottom-8 right-8 z-[100] print:hidden">
          <button 
            onClick={handleExportPdf} 
            className="bg-primary hover:bg-blue-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold text-lg transition-transform hover:scale-110 active:scale-95 border-2 border-white/20"
          >
            <Download size={24} /> {t('exportPdf')}
          </button>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={saveSettings}
        t={t}
      />

      <GuideModal 
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        t={t}
      />

      {/* Completion Modal */}
      {completionModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex justify-center items-center animate-in fade-in print:hidden">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            <CheckCircle size={48} className="text-green-500" />
            <h3 className="text-xl font-bold text-gray-800">{completionModal.msg}</h3>
            <p className="text-gray-600">{t('taskTime', { seconds: completionModal.seconds })}</p>
            <button 
              onClick={() => setCompletionModal(null)}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-blue-800"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/50 z-[1001] flex justify-center items-center animate-in zoom-in-95 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px] border-l-4 border-red-500 relative flex flex-col max-h-[80vh]">
             <div className="flex items-center gap-3 mb-4 text-red-600 flex-shrink-0">
               <AlertTriangle size={32} />
               <h3 className="text-xl font-bold">{errorModal.title}</h3>
             </div>
             
             <div className="text-gray-600 mb-6 bg-red-50 p-4 rounded text-sm font-medium leading-relaxed break-words overflow-y-auto flex-1 whitespace-pre-line">
                {errorModal.msg}
             </div>
             
             <div className="flex justify-end gap-3 flex-shrink-0">
               {(errorModal.msg.includes("API Key") || errorModal.title.includes("Config")) && (
                 <button 
                   onClick={() => { setErrorModal(null); setIsSettingsOpen(true); }}
                   className="px-4 py-2 text-primary font-bold hover:bg-gray-100 rounded transition-colors"
                 >
                   Go to Settings
                 </button>
               )}
               <button 
                 onClick={() => setErrorModal(null)}
                 className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors shadow-sm"
               >
                 Close
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;