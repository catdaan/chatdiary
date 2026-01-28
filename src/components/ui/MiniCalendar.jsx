import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, setMonth, setYear, getYear } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useDiary } from '../../context/DiaryContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function MiniCalendar({ selectedDate, onDateSelect }) {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const today = new Date();
  const navigate = useNavigate();
  const { getDiaryByDate } = useDiary();

  const localeMap = {
    'en': enUS,
    'en-US': enUS,
    'zh': zhCN,
    'zh-CN': zhCN,
    'zh-TW': zhTW
  };
  const currentLocale = localeMap[i18n.language] || enUS;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale: currentLocale });
  const calendarEnd = endOfWeek(monthEnd, { locale: currentLocale });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const years = Array.from({ length: 10 }, (_, i) => getYear(today) - 5 + i);
  
  // Generate months dynamically based on locale
  const months = Array.from({ length: 12 }, (_, i) => {
    return format(new Date(2024, i, 1), 'MMMM', { locale: currentLocale });
  });
  
  // Generate weekdays dynamically based on locale
  // We use a fixed week (e.g., first week of 2024 which starts on Monday or Sunday depending on locale preference?)
  // Actually, we should just generate based on the startOfWeek of the current locale.
  // But for the header 'S M T W...', we want short names.
  // Let's generate a week of days starting from the start of the week for this locale.
  const weekDays = eachDayOfInterval({
    start: startOfWeek(new Date(), { locale: currentLocale }),
    end: endOfWeek(new Date(), { locale: currentLocale })
  }).map(day => format(day, 'EEEEE', { locale: currentLocale }));

  const prevMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const nextMonth = (e) => {
    e.stopPropagation();
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDateClick = (day) => {
    const dateString = format(day, 'yyyy-MM-dd');
    const todayString = format(new Date(), 'yyyy-MM-dd');
    
    // 5. Future date: Allow navigation to show "Future" message
    // if (dateString > todayString) {
    //   return;
    // }

    const hasDiary = !!getDiaryByDate(dateString);

    if (hasDiary) {
      // 2. Past (has diary) & 3. Today (has diary): Diary Details
      navigate(`/date/${dateString}`);
    } else {
      // 1. Past (no diary) & 4. Today (no diary): Write/Chat Interface
      navigate(`/write?date=${dateString}`);
    }
  };

  const handleHeaderClick = () => {
    navigate('/calendar'); // Navigate to Timeline view
  };

  const handleMonthSelect = (monthIndex) => {
    setCurrentDate(setMonth(currentDate, monthIndex));
  };

  const handleYearSelect = (year) => {
    setCurrentDate(setYear(currentDate, year));
  };

  return (
    <div className="w-full bg-cream-50 rounded-xl p-3 border border-cream-200 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-cream-100 rounded-lg transition-colors p-1"
          onClick={handleHeaderClick}
          title="View Timeline"
        >
          <CalendarIcon size={14} className="text-cream-900/60" />
          <h3 className="text-sm font-semibold text-cream-900">
            {format(currentDate, 'MMMM yyyy', { locale: currentLocale })}
          </h3>
        </div>
        
        <div className="flex gap-1 items-center">
          <button 
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded-md transition-colors border",
              isPickerOpen 
                ? "bg-cream-900 text-white border-cream-900" 
                : "bg-white text-cream-900 border-cream-200 hover:bg-cream-100"
            )}
          >
            {isPickerOpen ? t('common.close') : t('common.select')}
          </button>
          <div className="flex gap-0.5">
            <button onClick={prevMonth} className="p-1 hover:bg-cream-200 rounded-full transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-cream-200 rounded-full transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Date Picker Overlay */}
        <AnimatePresence>
          {isPickerOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 bg-cream-50 z-10 flex flex-col gap-2 overflow-y-auto custom-scrollbar p-1"
            >
              <div className="grid grid-cols-3 gap-2 mb-4">
                {months.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => handleMonthSelect(i)}
                    className={cn(
                      "text-xs py-1.5 rounded-md transition-colors",
                      i === currentDate.getMonth() 
                        ? "bg-cream-900 text-white" 
                        : "hover:bg-cream-200 text-cream-900/80"
                    )}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="border-t border-cream-200 my-1" />
              <div className="grid grid-cols-4 gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => handleYearSelect(y)}
                    className={cn(
                      "text-xs py-1.5 rounded-md transition-colors",
                      y === currentDate.getFullYear()
                        ? "bg-cream-900 text-white"
                        : "hover:bg-cream-200 text-cream-900/80"
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar Grid */}
        <div className={cn("transition-opacity duration-300", isPickerOpen ? "opacity-20" : "opacity-100")}>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDays.map((day, i) => (
              <div key={`${day}-${i}`} className="text-[10px] text-cream-900/40 font-medium">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              const dateString = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const hasDiary = !!getDiaryByDate(dateString);
              
              const isSelected = selectedDate === dateString;
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center text-xs rounded-full transition-all cursor-pointer relative",
                    !isCurrentMonth && "text-cream-900/20",
                    isCurrentMonth && "text-cream-900/80 hover:bg-cream-100",
                    isToday && !isSelected && "bg-cream-900/10 text-cream-900 font-medium",
                    isSelected && "bg-cream-900 text-white font-medium shadow-md scale-105",
                    // If not today/selected but has diary, show a subtle indicator or style
                    !isToday && !isSelected && hasDiary && "font-semibold text-cream-900"
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {/* Dot for diary entry */}
                  {hasDiary && (
                    <div className={cn(
                      "w-1 h-1 rounded-full mt-0.5",
                      isSelected ? "bg-white" : "bg-cream-900/40"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
