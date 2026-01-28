import React, { useState, useMemo } from 'react';
import { useDiary } from '../context/DiaryContext';
import { format, parseISO } from 'date-fns';
import { enUS, zhCN, zhTW, ja } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, CalendarDays, Trash2, Tag, Smile, Frown, Meh, Heart, Zap, Cat, Sparkles, Quote, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MiniCalendar from '../components/ui/MiniCalendar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { cn } from '../lib/utils';

export default function TimelinePage() {
  const { t, i18n } = useTranslation();
  const localeMap = {
    'en': enUS,
    'en-US': enUS,
    'zh': zhCN,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ja': ja
  };
  const currentLocale = localeMap[i18n.language] || enUS;

  const { diaries, deleteDiary } = useDiary();
  const navigate = useNavigate();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState(null);

  // Group diaries by date
  const groupedDiaries = useMemo(() => {
    // Filter by selected date if set
    const filtered = selectedDate 
      ? diaries.filter(d => d.date === selectedDate)
      : diaries;

    // First sort all diaries
    const sorted = [...filtered].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

    // Then group them
    return sorted.reduce((groups, diary) => {
      if (!groups[diary.date]) {
        groups[diary.date] = [];
      }
      groups[diary.date].push(diary);
      return groups;
    }, {});
  }, [diaries, selectedDate]);

  // Calculate Memories (On This Day in previous years)
  const memories = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    return diaries.filter(diary => {
      const d = new Date(diary.date);
      return d.getMonth() === currentMonth && 
             d.getDate() === currentDay && 
             d.getFullYear() !== currentYear;
    });
  }, [diaries]);

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setDiaryToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (diaryToDelete) {
      deleteDiary(diaryToDelete);
      setDiaryToDelete(null);
    }
  };

  // Helper to get mood icon
  const getMoodIcon = (mood) => {
    switch(mood?.toLowerCase()) {
      case 'happy': return <Smile size={14} />;
      case 'sad': return <Frown size={14} />;
      case 'neutral': return <Meh size={14} />;
      case 'excited': return <Zap size={14} />;
      case 'loved': return <Heart size={14} />;
      default: return <Cat size={14} />;
    }
  };

  // Helper to get category color border class (Morandi colors)
  const getCategoryBorderClass = (category) => {
    const map = {
      'Daily Life': '!border-l-[#A4B494]', // Sage Green
      'Work': '!border-l-[#9FB8AD]',       // Blue Grey
      'Travel': '!border-l-[#B6C6C8]',     // Grey Blue
      'Emotions': '!border-l-[#DBC4C3]',   // Dusty Rose
      'Dreams': '!border-l-[#BEC3C8]',     // Cool Grey
      'Reading': '!border-l-[#E2D5C4]',    // Warm Beige
    };
    return map[category] || '!border-l-[#D1D5DB]'; // Default light grey
  };

  const handleDateSelect = (date) => {
    if (selectedDate === date) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ConfirmDialog 
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('timeline.delete_title')}
        message={t('timeline.delete_confirm')}
        confirmText={t('timeline.delete_button')}
        isDangerous={true}
      />

      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-cream-900 flex items-center gap-2">
          <CalendarIcon className="text-cream-900" />
          {t('timeline.title')}
        </h1>
        <button 
          onClick={() => setShowCalendar(!showCalendar)}
          className={cn(
            "p-2 rounded-xl transition-all flex items-center gap-2 text-sm font-medium",
            showCalendar 
              ? "bg-cream-900 text-white shadow-md" 
              : "bg-white text-cream-900 shadow-sm border border-cream-100 hover:bg-cream-50"
          )}
          title={showCalendar ? t('timeline.hide_calendar') : t('timeline.select_date')}
        >
          <CalendarDays size={20} />
        </button>
      </div>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden shrink-0"
          >
            <MiniCalendar />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-1 pr-4">
        {/* Memories Widget - Memoir Style */}
        {memories.length > 0 && (
          <div className="mb-10 w-[100%] px-4 pl-12">
            
            <div className="space-y-4">
              {memories.map(diary => {
                const bgImage = diary.images && diary.images.length > 0 ? diary.images[0] : null;
                
                return (
                  <div 
                    key={diary.id}
                    onClick={() => navigate(`/diary/${diary.id}`)}
                    className="bg-white rounded-[12px] py-4 px-6 shadow-sm border border-cream-100 cursor-pointer hover:shadow-md transition-all relative overflow-hidden group text-center"
                  >
                    {bgImage ? (
                      <>
                        <div 
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                          style={{ backgroundImage: `url(${bgImage})` }}
                        />
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
                      </>
                    ) : (
                      null
                    )}
                    
                    <div className="relative z-10 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-cream-400 uppercase tracking-[0.2em] mb-1">
                         {new Date().getFullYear() - new Date(diary.date).getFullYear()} Year{new Date().getFullYear() - new Date(diary.date).getFullYear() > 1 ? 's' : ''} Ago • {format(parseISO(diary.date), 'MMMM do')}
                      </span>
                      
                      <div className="mb-1 text-cream-300">
                          <Quote size={16} className="fill-current opacity-20" />
                      </div>

                      <p className="text-cream-800 text-lg leading-relaxed font-serif italic mb-3 max-w-3xl mx-auto">
                        "{diary.summary || diary.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...'}"
                      </p>
                      
                      <div className="w-8 h-px bg-cream-200 mb-2" />
                      
                      <div className="text-xs font-medium text-cream-400 group-hover:text-cream-600 transition-colors flex items-center gap-1">
                        Read Memory <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(groupedDiaries).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-cream-900/40">
            <p>{t('timeline.no_memories')}</p>
          </div>
        ) : (
          <div className="pb-12">
            {Object.entries(groupedDiaries).map(([date, dayDiaries], groupIndex) => (
              <div key={date} className="mb-10 relative">
                {/* Date Header */}
                <div className="flex items-baseline gap-3 mb-6 ml-0">
                   <h2 className="text-3xl font-bold text-cream-900 tracking-tight">
                     {format(parseISO(date), 'MMM d', { locale: currentLocale })}
                   </h2>
                   <span className="text-sm font-bold text-cream-400 uppercase tracking-widest">
                     {format(parseISO(date), 'EEE', { locale: currentLocale })}
                   </span>
                </div>

                {/* Timeline Container for this Day */}
                <div className="relative ml-6 border-l-2 border-cream-200 pl-10 space-y-8 pb-4">
                   {dayDiaries.map((diary, index) => {
                     const timeString = diary.createdAt 
                       ? format(new Date(diary.createdAt), 'HH:mm')
                       : null;

                     return (
                       <motion.div 
                         key={diary.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 + groupIndex * 0.1 }}
                        className="relative group"
                        onClick={() => navigate(`/diary/${diary.id}`)}
                      >
                         {/* Timeline Dot */}
                         <div className="absolute -left-[37px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cream-50 border-[3px] border-cream-300 box-border z-10 transition-colors group-hover:border-cream-400" />

                         <div className={cn(
                           "bg-white rounded-[10px] p-5 shadow-sm border border-cream-100 group-hover:shadow-md group-hover:border-cream-200 transition-all cursor-pointer relative",
                           "border-l-[4px]", // Make left border thicker
                           diary.category ? getCategoryBorderClass(diary.category) : 'border-l-cream-200'
                         )}>
                           
                           {/* Content */}
                           <div className="space-y-2 mb-3">
                              {diary.title && (
                                <h3 className="font-bold text-cream-900 text-lg leading-tight">{diary.title}</h3>
                              )}
                              <div 
                                className="text-cream-900/80 text-sm leading-relaxed line-clamp-3 font-serif"
                                dangerouslySetInnerHTML={{ __html: diary.content }} 
                              />
                           </div>

                           {/* Footer: Time, Category & Tags */}
                           <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-cream-50">
                             {timeString && (
                               <span className="text-xs font-semibold text-cream-400 mr-2 tabular-nums">
                                 {timeString}
                               </span>
                             )}
                             
                             {diary.mood && (
                                <span className="px-2 py-0.5 bg-cream-50 text-cream-500 rounded-full text-xs border border-cream-100 flex items-center gap-1">
                                  {getMoodIcon(diary.mood)}
                                  {t(`moods.${diary.mood.toLowerCase()}`, { defaultValue: diary.mood })}
                                </span>
                             )}
                             {diary.category && (
                               <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-medium border border-amber-100 flex items-center gap-1">
                                 <Tag size={10} />
                                 {diary.category}
                                </span>
                             )}
                             {diary.tags && Array.isArray(diary.tags) && diary.tags.map((tag, i) => (
                               <span key={i} className="text-xs text-cream-400 font-medium">
                                 #{tag}
                               </span>
                             ))}
                           </div>

                           {/* Delete Button (Hover) */}
                           <button
                             onClick={(e) => handleDeleteClick(e, diary.id)}
                             className="absolute top-4 right-4 p-2 text-cream-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                             title={t('timeline.delete_title')}
                           >
                             <Trash2 size={16} />
                           </button>

                         </div>
                       </motion.div>
                     );
                   })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
