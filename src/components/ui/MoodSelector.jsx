import React from 'react';
import { Smile, Zap, Meh, Frown, Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export const moods = [
  { id: 'happy', icon: Smile, color: 'text-green-500' },
  { id: 'excited', icon: Zap, color: 'text-yellow-500' },
  { id: 'neutral', icon: Meh, color: 'text-gray-500' },
  { id: 'sad', icon: Frown, color: 'text-blue-500' },
  { id: 'loved', icon: Heart, color: 'text-pink-500' },
];

export const MoodSelector = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
  <div className="flex items-center gap-1 bg-cream-50 rounded-lg p-1 border border-cream-200">
    {moods.map(m => {
      const Icon = m.icon;
      const isSelected = value === m.id;
      return (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "p-1.5 rounded-md transition-all hover:bg-white",
            isSelected ? "bg-white shadow-sm ring-1 ring-cream-200" : "opacity-50 hover:opacity-100"
          )}
          title={t(`moods.${m.id}`)}
        >
          <Icon size={16} className={cn(isSelected ? m.color : "text-cream-600")} />
        </button>
      );
    })}
  </div>
);
};
