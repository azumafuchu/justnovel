import React from 'react';
import { X, BookOpen, Database, Wand2, FileText, Download } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any, params?: any) => string;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <Database size={24} className="text-green-600" />,
      titleKey: 'guideStep1',
      descKey: 'guideDesc1',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    {
      icon: <BookOpen size={24} className="text-blue-600" />,
      titleKey: 'guideStep2',
      descKey: 'guideDesc2',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    {
      icon: <Wand2 size={24} className="text-purple-600" />,
      titleKey: 'guideStep3',
      descKey: 'guideDesc3',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    },
    {
      icon: <FileText size={24} className="text-orange-600" />,
      titleKey: 'guideStep4',
      descKey: 'guideDesc4',
      bg: 'bg-orange-50',
      border: 'border-orange-200'
    },
    {
      icon: <Download size={24} className="text-primary" />,
      titleKey: 'guideStep5',
      descKey: 'guideDesc5',
      bg: 'bg-gray-100',
      border: 'border-gray-300'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[1002] flex justify-center items-center animate-in fade-in duration-200 print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             {t('guideTitle')}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={`p-5 rounded-xl border ${step.border} ${step.bg} flex flex-col gap-3 hover:shadow-md transition-shadow`}
            >
              <div className="flex justify-between items-start">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  {step.icon}
                </div>
                <span className="text-4xl font-bold text-gray-200 select-none">
                  0{idx + 1}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">
                {t(step.titleKey)}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t(step.descKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-primary text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            {t('gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};