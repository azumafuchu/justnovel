import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Settings, X, Globe, Type, Cpu, RefreshCw, List } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  t: (key: any, params?: any) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, t }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [useModelSelect, setUseModelSelect] = useState(false);

  // Fix: Sync local state when modal opens or settings change externally
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
    setFormData(prev => {
      const updates: any = { [key]: value };
      
      // Auto-switch Base URL defaults to prevent user error
      if (key === 'apiMode') {
        if (value === 'openai' && prev.baseUrl.includes('googleapis.com')) {
          updates.baseUrl = 'https://api.openai.com';
        } else if (value === 'gemini' && prev.baseUrl.includes('openai.com')) {
          updates.baseUrl = 'https://generativelanguage.googleapis.com';
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleFetchModels = async () => {
    if (!formData.baseUrl || !formData.apiKey) {
      alert("Please enter Base URL and API Key first.");
      return;
    }

    setIsFetchingModels(true);
    try {
      // Clean base url and append /v1/models
      const baseUrl = formData.baseUrl.replace(/\/+$/, "");
      const url = `${baseUrl}/v1/models`;
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${formData.apiKey}`
        }
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        let msg = res.statusText;
        if (errData) {
            // Enhanced error extraction
            msg = errData.error?.message || errData.detail || errData.message || JSON.stringify(errData);
        }
        throw new Error(msg);
      }
      
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        const models = data.data.map((m: any) => m.id).sort();
        setAvailableModels(models);
        setUseModelSelect(true);
        if (models.length > 0 && !models.includes(formData.model)) {
            // Optionally select the first one, or keep current if valid
            // handleChange('model', models[0]); 
        }
      } else {
        throw new Error("Invalid response format: data.data is missing");
      }
    } catch (e) {
      alert(t('fetchError') + ": " + (e as Error).message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[999] flex justify-center items-center print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={24} /> {t('settings')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* General Config */}
          <div>
            <h4 className="font-bold text-sm text-gray-500 mb-2 border-b pb-1 flex items-center gap-1"><Globe size={14}/> General</h4>
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">{t('language')}</label>
              <select 
                className="w-full border rounded p-2 text-sm"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option value="zh_cn">简体中文 (Simplified Chinese)</option>
                <option value="zh_tw">繁體中文 (Traditional Chinese)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* API Config */}
          <div>
            <h4 className="font-bold text-sm text-gray-500 mb-2 border-b pb-1 flex items-center gap-1"><Cpu size={14}/> {t('apiConfig')}</h4>
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">{t('providerMode')}</label>
              <select 
                className="w-full border rounded p-2 text-sm"
                value={formData.apiMode}
                onChange={(e) => handleChange('apiMode', e.target.value)}
              >
                <option value="gemini">Google Gemini (Official SDK)</option>
                <option value="openai">OpenAI / Compatible (OneAPI)</option>
              </select>
            </div>
            
            {formData.apiMode === 'openai' && (
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('baseUrl')}</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 text-sm"
                  value={formData.baseUrl}
                  onChange={(e) => handleChange('baseUrl', e.target.value)}
                  placeholder="https://api.openai.com"
                />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">{t('apiKey')}</label>
              <input 
                type="password" 
                className="w-full border rounded p-2 text-sm"
                value={formData.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
              />
            </div>

            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-600">{t('modelName')}</label>
                {formData.apiMode === 'openai' && (
                   <button 
                    onClick={handleFetchModels}
                    disabled={isFetchingModels}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                   >
                     {isFetchingModels ? <RefreshCw size={10} className="animate-spin"/> : <List size={10} />}
                     {isFetchingModels ? t('fetching') : t('fetchModels')}
                   </button>
                )}
              </div>
              
              {useModelSelect && availableModels.length > 0 ? (
                <div className="flex gap-2">
                   <select 
                      className="flex-1 border rounded p-2 text-sm"
                      value={formData.model}
                      onChange={(e) => handleChange('model', e.target.value)}
                    >
                      {availableModels.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                   </select>
                   <button 
                     onClick={() => setUseModelSelect(false)}
                     className="text-xs text-gray-500 whitespace-nowrap px-2 hover:bg-gray-100 rounded"
                     title={t('enterManually')}
                   >
                     <Type size={14} />
                   </button>
                </div>
              ) : (
                <input 
                  type="text" 
                  className="w-full border rounded p-2 text-sm"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder={formData.apiMode === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o'}
                />
              )}
            </div>
          </div>

          {/* Appearance Config */}
          <div>
             <h4 className="font-bold text-sm text-gray-500 mb-2 border-b pb-1 flex items-center gap-1"><Type size={14}/> {t('appearance')}</h4>
             
             <div className="mb-3">
               <label className="block text-xs font-bold text-gray-600 mb-1">{t('fontFamily')}</label>
               <select 
                 className="w-full border rounded p-2 text-sm"
                 value={formData.fontFamily}
                 onChange={(e) => handleChange('fontFamily', e.target.value)}
               >
                 <option value="'Crimson Text', 'Noto Serif TC', serif">Crimson Text (Serif)</option>
                 <option value="'Noto Serif TC', serif">Noto Serif TC</option>
                 <option value="'Roboto', 'Noto Sans TC', sans-serif">Roboto (Sans)</option>
               </select>
             </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={handleSave}
            className="flex-1 bg-primary text-white py-2.5 rounded font-bold hover:bg-blue-900 transition-colors"
          >
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};