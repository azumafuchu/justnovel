

import React, { useRef } from 'react';
import { BookOpen, UploadCloud, Trash2, FileJson } from 'lucide-react';

interface NovelImporterProps {
  isDisabled: boolean;
  hasNovel: boolean;
  fileName?: string;
  onImport: (file: File) => void;
  onImportProject: (file: File) => void;
  onClear: () => void;
  t: (key: any, params?: any) => string;
}

export const NovelImporter: React.FC<NovelImporterProps> = ({ 
  isDisabled, 
  hasNovel, 
  fileName, 
  onImport, 
  onImportProject,
  onClear, 
  t 
}) => {
  const txtInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.json')) {
        onImportProject(file);
      } else {
        onImport(file);
      }
    }
  };

  const handleTxtClick = () => {
    if (!isDisabled) txtInputRef.current?.click();
  };

  const handleJsonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled) jsonInputRef.current?.click();
  };

  return (
    <div 
      className={`
        border-3 border-dashed rounded-xl p-8 text-center transition-all duration-200 mb-6 flex flex-col items-center justify-center gap-4
        ${isDisabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70' : 'border-gray-300 bg-white hover:bg-blue-50 hover:border-primary'}
        ${hasNovel ? 'border-green-300 bg-green-50' : ''}
      `}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={txtInputRef}
        className="hidden" 
        accept=".txt"
        onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
      />
      <input 
        type="file" 
        ref={jsonInputRef}
        className="hidden" 
        accept=".json"
        onChange={(e) => e.target.files?.[0] && onImportProject(e.target.files[0])}
      />

      {hasNovel ? (
        <div className="w-full flex justify-between items-center px-4">
          <div className="flex-1"></div>
          <div className="flex flex-col items-center flex-1">
            <BookOpen size={48} className="text-green-600 mb-2" />
            <h3 className="text-lg font-bold text-green-700">
              {t('current')}: {fileName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{t('novelLoaded')}</p>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-xs px-3 py-1 bg-white border border-red-200 text-red-500 rounded hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 size={12} /> {t('clearNovel')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main TXT Import */}
          <div 
            className="flex flex-col items-center cursor-pointer w-full py-4"
            onClick={handleTxtClick}
          >
            <UploadCloud size={48} className={isDisabled ? "text-gray-300" : "text-gray-400"} />
            <h3 className="text-lg font-bold text-gray-600 mt-2">{t('importNovelTitle')}</h3>
            <p className="text-sm text-gray-400 mt-1">{isDisabled ? t('importFirst') : t('dragDrop')}</p>
          </div>

          {!isDisabled && (
            <>
              <div className="w-full flex items-center gap-2 px-12">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-xs text-gray-400 font-bold">{t('or')}</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* JSON Backup Import */}
              <button 
                onClick={handleJsonClick}
                className="text-sm px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-2 transition-all shadow-sm font-medium"
              >
                <FileJson size={16} /> {t('restoreBackup')}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};