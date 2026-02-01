import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, MessageCircle, PenTool, Wand2, Settings } from 'lucide-react';

export default function UsageGuide() {
  const { t } = useTranslation();

  const GUIDES = [
    {
      icon: MessageCircle,
      title: t('settings.usage.chat'),
      desc: t('settings.usage.chatDesc'),
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      icon: PenTool,
      title: t('settings.usage.manual'),
      desc: t('settings.usage.manualDesc'),
      color: 'text-purple-500',
      bg: 'bg-purple-50'
    },
    {
      icon: Wand2,
      title: t('settings.usage.polish'),
      desc: t('settings.usage.polishDesc'),
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      icon: Settings,
      title: t('settings.usage.settings'),
      desc: t('settings.usage.settingsDesc'),
      color: 'text-gray-500',
      bg: 'bg-gray-50'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-cream-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-cream-900" />
          {t('settings.usage.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {GUIDES.map((guide, index) => (
          <div key={index} className="flex gap-4 p-4 rounded-xl border border-cream-100 hover:border-cream-200 hover:shadow-sm transition-all">
            <div className={`p-3 rounded-xl h-fit ${guide.bg} ${guide.color}`}>
              <guide.icon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-cream-900 mb-1">{guide.title}</h3>
              <p className="text-sm text-cream-600 leading-relaxed">
                {guide.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
