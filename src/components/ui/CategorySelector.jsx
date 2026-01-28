import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export const CategorySelector = ({ value, onChange, existingCategories = [] }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Combine defaults with existing ones, remove duplicates
  const allCategories = [...new Set(existingCategories)];
  
  // Filter logic: 
  // 1. If input is empty, show all.
  // 2. If input matches current value (user hasn't started typing new search), show all.
  // 3. Otherwise, filter by input.
  const showAll = !inputValue || inputValue === value;
  const filteredCategories = showAll 
    ? allCategories 
    : allCategories.filter(cat => cat.toLowerCase().includes(inputValue.toLowerCase()));

  // Check if we need to show "Create new" option
  // Show if input is not empty, and input is not in the list (exact match)
  const showCreateOption = inputValue && !allCategories.some(cat => cat.toLowerCase() === inputValue.toLowerCase());

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset input to value if not saved
        if (inputValue !== value) {
            setInputValue(value || '');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputValue, value]);

  const handleSelect = (cat) => {
    onChange(cat);
    setInputValue(cat);
    setIsOpen(false);
  };

  const handleCreate = () => {
      if (inputValue.trim()) {
          onChange(inputValue.trim());
          setIsOpen(false);
      }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleCreate();
    }
  };

  const clearInput = (e) => {
      e.stopPropagation();
      onChange('');
      setInputValue('');
      inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-cream-900 focus:outline-none focus:border-cream-400 focus:ring-1 focus:ring-cream-400 pr-16" // More padding for buttons
          placeholder={t('write.categorySelector.placeholder')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
                <button 
                    onClick={clearInput}
                    className="p-1 text-cream-400 hover:text-cream-600 rounded-full hover:bg-cream-100 transition-colors"
                    title={t('write.categorySelector.clear')}
                >
                    <X size={14} />
                </button>
            )}
            <button 
                className="p-1 text-cream-400 hover:text-cream-600 cursor-pointer transition-colors"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) inputRef.current?.focus();
                }}
            >
                <ChevronDown size={16} />
            </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-cream-200 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          {filteredCategories.length > 0 && filteredCategories.map((cat) => (
            <div
              key={cat}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer hover:bg-cream-50 flex items-center justify-between",
                cat === value ? "bg-cream-50 text-cream-900 font-medium" : "text-cream-700"
              )}
              onClick={() => handleSelect(cat)}
            >
              <span>{cat}</span>
              {cat === value && <Check size={14} className="text-cream-600" />}
            </div>
          ))}
          
          {showCreateOption && (
             <div 
                className="px-3 py-2 text-sm cursor-pointer hover:bg-cream-50 flex items-center gap-2 text-amber-600 border-t border-cream-50 font-medium"
                onClick={handleCreate}
             >
                <Plus size={14} />
                <span>{t('write.categorySelector.create', { value: inputValue })}</span>
             </div>
          )}

          {filteredCategories.length === 0 && !showCreateOption && (
             <div className="px-3 py-2 text-sm text-cream-400 italic">
                {t('write.categorySelector.noCategories')}
             </div>
          )}
        </div>
      )}
    </div>
  );
};
