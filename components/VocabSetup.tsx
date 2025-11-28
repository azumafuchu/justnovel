

import React from 'react';
import { VocabStats } from '../types';
import { Upload, Trash2, Download, Layers, Folder, Database } from 'lucide-react';

interface VocabSetupProps {
  stats: VocabStats;
  onImportFile: (level: number, file: File) => void;
  onImportUrl: (level: number, url: string) => Promise<void>;
  onClear: () => void;
  onLoadDefault: () => void;
  isLoaded: boolean;
  t: (key: any, params?: any) => string;
}

export const VocabSetup: React.FC<VocabSetupProps> = ({ stats, onImportFile, onImportUrl, onClear, onLoadDefault, isLoaded, t }) => {
  const levels = [1, 2, 3, 4, 5, 6];

  const handleUrlSubmit = (level: number) => {
    const input = document.getElementById(`url-l${level}`) as HTMLInputElement;
    if (input && input.value) {
      onImportUrl(level, input.value);
      input.value = '';
    }
  };

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const name = file.name.toLowerCase();
        let level = 0;
        
        const match = name.match(/(?:^|[^0-9])([1-6])(?:[^0-9]|$)/);
        
        if (match) {
            level = parseInt(match[1]);
        } else {
             if (name.includes('l1') || name.includes('level1')) level = 1;
             else if (name.includes('l2') || name.includes('level2')) level = 2;
             else if (name.includes('l3') || name.includes('level3')) level = 3;
             else if (name.includes('l4') || name.includes('level4')) level = 4;
             else if (name.includes('l5') || name.includes('level5')) level = 5;
             else if (name.includes('l6') || name.includes('level6')) level = 6;
        }

        if (level > 0 && level <= 6) {
          onImportFile(level, file);
        }
      });
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-100">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <Folder size={20} /> {t('vocabImportTitle')}
        </h2>
        <div className="flex gap-2">
            <button 
              onClick={onLoadDefault}
              className="text-xs px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded flex items-center gap-1 transition-colors border border-green-200 font-bold"
            >
              <Database size={14} /> {t('loadBuiltIn')}
            </button>
            <label 
              title="Upload multiple files (e.g., 1.txt, 2.txt)"
              className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded flex items-center gap-1 transition-colors cursor-pointer border border-blue-200 font-bold"
            >
                <Layers size={14} /> {t('batchUpload')}
                <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept=".txt"
                    onChange={handleBatchUpload}
                />
            </label>
            <button 
              onClick={onClear}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded flex items-center gap-1 transition-colors border border-gray-200"
            >
              <Trash2 size={12} /> {t('clearCache')}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map(lvl => (
          <div key={lvl} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="font-bold text-gray-600 w-12 text-sm">{t('level')} {lvl}</span>
            
            <label className="cursor-pointer bg-white border hover:bg-blue-50 text-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors">
              <Upload size={12} /> {t('file')}
              <input 
                type="file" 
                className="hidden" 
                accept=".txt"
                onChange={(e) => e.target.files?.[0] && onImportFile(lvl, e.target.files[0])}
              />
            </label>

            <input 
              id={`url-l${lvl}`}
              type="text" 
              placeholder={t('orUrl')} 
              className="flex-1 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            
            <button 
              onClick={() => handleUrlSubmit(lvl)}
              className="bg-primary text-white p-1.5 rounded hover:bg-blue-800 transition-colors"
            >
              <Download size={12} />
            </button>

            <span className={`text-xs font-bold w-16 text-right truncate ${stats[lvl as keyof VocabStats] > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {stats[lvl as keyof VocabStats] > 0 ? `${stats[lvl as keyof VocabStats]}` : t('empty')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};