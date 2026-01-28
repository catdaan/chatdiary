import React from 'react';
import { Tag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TagEditor = ({ tags, setTags, inputValue, setInputValue }) => {
  const { t } = useTranslation();
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = inputValue.trim();
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setInputValue('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map((tag, index) => (
           <span key={index} className="bg-cream-100 text-cream-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 border border-cream-200">
             #{tag}
             <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
           </span>
        ))}
      </div>
      <div className="relative flex items-center">
         <Tag size={14} className="absolute left-2 text-cream-400" />
         <input
           type="text"
           value={inputValue}
           onChange={(e) => setInputValue(e.target.value)}
           onKeyDown={handleKeyDown}
           placeholder={t('write.tagEditor.placeholder')}
           className="pl-7 pr-2 py-1 bg-transparent border-none outline-none text-sm text-cream-900 placeholder:text-cream-400 w-24 focus:w-32 transition-all"
         />
      </div>
    </div>
  );
};
