import React, { useMemo, useState, useEffect } from 'react';
import * as Diff from 'diff';
import { cn } from '../../lib/utils';
import { Check, X, RotateCcw, MousePointerClick, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DiffViewer = ({ 
    original, 
    modified, 
    originalTitle,
    modifiedTitle,
    originalTags,
    modifiedTags,
    onAccept, 
    onReject, 
    onRevert 
}) => {
  const { t } = useTranslation();
  const diffs = useMemo(() => {
    if (!original && !modified) return [];
    // If one is empty, diff against empty string
    return Diff.diffWordsWithSpace(original || '', modified || '');
  }, [original, modified]);

  // State to track decisions for each diff part
  const [decisions, setDecisions] = useState({});

  // Reset decisions when diffs change
  useEffect(() => {
    setDecisions({});
  }, [diffs]);

  const toggleDecision = (index, type) => {
    setDecisions(prev => {
      const current = prev[index];
      let next;
      
      if (type === 'added') {
         if (!current) next = 'rejected';
         else if (current === 'rejected') next = 'accepted';
         else next = undefined;
      } else {
         if (!current) next = 'rejected'; // Restore it
         else if (current === 'rejected') next = 'accepted'; // Delete it
         else next = undefined;
      }

      return { ...prev, [index]: next };
    });
  };

  const handleApplyChanges = () => {
    let finalString = '';
    diffs.forEach((part, index) => {
        const decision = decisions[index];
        
        if (part.added) {
            if (decision !== 'rejected') {
                finalString += part.value;
            }
        } else if (part.removed) {
            if (decision === 'rejected') {
                finalString += part.value;
            }
        } else {
            finalString += part.value;
        }
    });
    
    onAccept(finalString);
  };

  // Check for changes
  const hasContentChanges = diffs.some(part => part.added || part.removed);
  const hasTitleChange = modifiedTitle && modifiedTitle !== originalTitle;
  const hasTagsChange = modifiedTags && JSON.stringify(modifiedTags) !== JSON.stringify(originalTags);
  const hasAnyChanges = hasContentChanges || hasTitleChange || hasTagsChange;

  if (!hasAnyChanges) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 bg-white rounded-lg border border-cream-200 text-cream-900 leading-relaxed whitespace-pre-wrap overflow-y-auto">
          {original}
          <div className="mt-4 text-center text-sm text-cream-500 italic">
            {t('write.diffViewer.noChanges')}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
            <button 
                onClick={onReject}
                className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-cream-700 hover:bg-cream-200 rounded-xl transition-colors font-medium text-sm"
            >
                <RotateCcw size={16} />
                {t('write.diffViewer.back')}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Metadata Changes Section */}
      {(hasTitleChange || hasTagsChange) && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 space-y-3 shrink-0">
            <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <Sparkles size={14} />
                {t('write.diffViewer.metadataChanges')}
            </h3>
            
            {hasTitleChange && (
                <div className="text-sm">
                    <span className="text-amber-700/70 font-medium uppercase text-xs block mb-1">{t('write.diffViewer.title')}</span>
                    <div className="flex items-center gap-2 bg-white/50 p-2 rounded border border-amber-100">
                        <span className="line-through text-cream-400">{originalTitle || t('write.diffViewer.untitled')}</span>
                        <span className="text-amber-400">→</span>
                        <span className="font-semibold text-amber-900">{modifiedTitle}</span>
                    </div>
                </div>
            )}

            {hasTagsChange && (
                 <div className="text-sm">
                    <span className="text-amber-700/70 font-medium uppercase text-xs block mb-1">{t('write.diffViewer.tags')}</span>
                    <div className="flex flex-col gap-2 bg-white/50 p-2 rounded border border-amber-100">
                        <div className="flex flex-wrap gap-1 opacity-60 grayscale">
                            {(originalTags || []).length > 0 
                                ? originalTags.map(t => <span key={t} className="px-1.5 py-0.5 bg-cream-200 rounded text-xs">#{t}</span>)
                                : <span className="text-xs italic">{t('write.diffViewer.noTags')}</span>}
                        </div>
                        <div className="text-amber-400 text-center rotate-90 sm:rotate-0">↓</div>
                        <div className="flex flex-wrap gap-1">
                            {(modifiedTags || []).map(t => <span key={t} className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-xs">#{t}</span>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Content Diff Section */}
      <div className="flex-1 bg-white rounded-lg border border-cream-200 overflow-hidden flex flex-col">
          <div className="p-2 bg-cream-50 border-b border-cream-100 flex items-center justify-between text-xs text-cream-600">
             <span>{t('write.diffViewer.instructions')}</span>
             <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-200"></span> {t('write.diffViewer.added')}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200"></span> {t('write.diffViewer.removed')}</span>
             </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans text-base">
            {diffs.map((part, index) => {
                const decision = decisions[index];
                
                if (part.added) {
                    const isRejected = decision === 'rejected';
                    return (
                        <span 
                            key={index} 
                            onClick={() => toggleDecision(index, 'added')}
                            className={cn(
                                "cursor-pointer transition-colors rounded px-0.5 relative group select-none",
                                isRejected 
                                    ? "bg-cream-100 text-cream-400 line-through decoration-cream-300" 
                                    : "bg-green-100 text-green-900 hover:bg-green-200"
                            )}
                            title={isRejected ? t('write.diffViewer.include') : t('write.diffViewer.discard')}
                        >
                            {part.value}
                            {!isRejected && <Check size={10} className="absolute -top-1.5 -right-1.5 bg-green-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </span>
                    );
                }
                
                if (part.removed) {
                    const isRejected = decision === 'rejected'; // Rejected deletion = Keep text
                    return (
                        <span 
                            key={index} 
                            onClick={() => toggleDecision(index, 'removed')}
                            className={cn(
                                "cursor-pointer transition-colors rounded px-0.5 relative group select-none",
                                isRejected 
                                    ? "bg-blue-50 text-cream-900 border-b-2 border-blue-200" // Kept (Restored)
                                    : "bg-red-50 text-red-900 line-through decoration-red-300 hover:bg-red-100" // Deleted
                            )}
                            title={isRejected ? t('write.diffViewer.delete') : t('write.diffViewer.restore')}
                        >
                            {part.value}
                            {isRejected && <RotateCcw size={10} className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </span>
                    );
                }
                
                return <span key={index}>{part.value}</span>;
            })}
          </div>
      </div>

      <div className="flex justify-end gap-3 mt-auto shrink-0">
        <button 
          onClick={onReject}
          className="px-4 py-2 rounded-xl border border-cream-200 text-cream-600 hover:bg-cream-50 hover:text-cream-900 transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X size={16} />
          {t('write.diffViewer.rejectAll')}
        </button>
        <button 
          onClick={handleApplyChanges}
          className="px-4 py-2 rounded-xl bg-cream-900 text-white hover:bg-cream-800 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
        >
          <Check size={16} />
          {t('write.diffViewer.applySelected')}
        </button>
      </div>
    </div>
  );
};
