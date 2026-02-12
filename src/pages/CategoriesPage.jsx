
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Book, Heart, Star, Coffee, Briefcase, Plane, ArrowLeft, Folder, Smile, Layers, Plus, X, Settings, Pencil, Check, Sparkles, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { cn, compressImage } from '../lib/utils';
import { useDiary } from '../context/DiaryContext';
import DiaryItem from '../components/diary/DiaryItem';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { enUS, zhCN, zhTW, ja } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ICON_MAP = {
  'Book': Book,
  'Heart': Heart,
  'Star': Star,
  'Coffee': Coffee,
  'Briefcase': Briefcase,
  'Plane': Plane,
  'Layers': Layers,
  'Folder': Folder
};

const CATEGORY_COLORS = [
    { name: 'Indigo', value: 'bg-indigo-100 text-indigo-600' },
    { name: 'Purple', value: 'bg-purple-100 text-purple-600' },
    { name: 'Pink', value: 'bg-pink-100 text-pink-600' },
    { name: 'Rose', value: 'bg-rose-100 text-rose-600' },
    { name: 'Orange', value: 'bg-orange-100 text-orange-600' },
    { name: 'Amber', value: 'bg-amber-100 text-amber-600' },
    { name: 'Yellow', value: 'bg-yellow-100 text-yellow-700' },
    { name: 'Lime', value: 'bg-lime-100 text-lime-700' },
    { name: 'Green', value: 'bg-green-100 text-green-600' },
    { name: 'Emerald', value: 'bg-emerald-100 text-emerald-600' },
    { name: 'Teal', value: 'bg-teal-100 text-teal-600' },
    { name: 'Cyan', value: 'bg-cyan-100 text-cyan-600' },
    { name: 'Sky', value: 'bg-sky-100 text-sky-600' },
    { name: 'Blue', value: 'bg-blue-100 text-blue-600' },
    { name: 'Slate', value: 'bg-slate-100 text-slate-600' },
];

export default function CategoriesPage() {
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

  const { diaries, customCategories, addCategory, updateCategory, deleteCategory } = useDiary();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isManaging, setIsManaging] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  
  // Add/Edit Dialog State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null for add mode, object for edit mode
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryColorInput, setCategoryColorInput] = useState(CATEGORY_COLORS[0].value);
  const [categoryImageInput, setCategoryImageInput] = useState(null);
  const fileInputRef = useRef(null);

  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const navigate = useNavigate();

  // Calculate stats and merge categories
  const categoriesWithStats = useMemo(() => {
    const stats = {};
    
    // Count stats from diaries
    diaries.forEach(d => {
      const cat = d.category || 'Uncategorized';
      stats[cat] = (stats[cat] || 0) + 1;
    });

    // 1. Process Custom Categories (Now includes defaults)
    const customs = customCategories.map(cat => {
      const isDefault = ['Daily Life', 'Work', 'Travel'].includes(cat.name);
      return {
        id: cat.name,
        name: isDefault ? t(`categories.defaults.${cat.name}`) : cat.name,
        originalName: cat.name,
        icon: ICON_MAP[cat.iconName] || Layers, 
        color: cat.color || 'bg-indigo-100 text-indigo-600',
        coverImage: cat.coverImage,
        count: stats[cat.name] || 0,
        isCustom: true // All are editable now
      };
    });

    // 2. Find "Ghost" categories (in diaries but not in defaults or custom)
    const knownNames = new Set(customs.map(c => c.originalName));
    const ghostCategories = [];
    
    diaries.forEach(d => {
        if (d.category && !knownNames.has(d.category) && d.category !== 'Uncategorized') {
            knownNames.add(d.category);
            ghostCategories.push({
                id: d.category,
                name: d.category,
                originalName: d.category,
                icon: Folder,
                color: 'bg-gray-100 text-gray-600',
                count: stats[d.category] || 0,
                isCustom: true, // Treat as custom so they can be managed
                isGhost: true
            });
        }
    });

    // 3. Process Uncategorized
    const uncategorized = stats['Uncategorized'] ? [{
      id: 'Uncategorized',
      name: t('categories.defaults.Uncategorized'),
      originalName: 'Uncategorized',
      icon: Folder,
      color: 'bg-slate-100 text-slate-600',
      count: stats['Uncategorized'],
      isCustom: false
    }] : [];

    return [...customs, ...ghostCategories, ...uncategorized];
  }, [diaries, customCategories, t]);

  // Filter and Group Diaries for Timeline Layout
  const groupedFilteredDiaries = useMemo(() => {
    if (!selectedCategory) return {};
    
    const filtered = diaries.filter(d => {
        const cat = d.category || 'Uncategorized';
        return cat === selectedCategory;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return filtered.reduce((groups, diary) => {
      if (!groups[diary.date]) {
        groups[diary.date] = [];
      }
      groups[diary.date].push(diary);
      return groups;
    }, {});
  }, [diaries, selectedCategory]);

  const openAddDialog = () => {
      setEditingCategory(null);
      setCategoryNameInput('');
      setCategoryColorInput(CATEGORY_COLORS[0].value);
      setCategoryImageInput(null);
      setShowEditDialog(true);
  };

  const openEditDialog = (cat) => {
      setEditingCategory(cat);
      setCategoryNameInput(cat.originalName || cat.name);
      setCategoryColorInput(cat.color);
      setCategoryImageInput(cat.coverImage);
      setShowEditDialog(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            // Compress image to avoid huge base64 strings (limit to 800px width)
            const compressedDataUrl = await compressImage(file, 800, 0.7);
            setCategoryImageInput(compressedDataUrl);
        } catch (error) {
            console.error("Failed to compress image:", error);
            alert(t('common.error_image_upload_failed') || "Image upload failed. Please try a smaller image.");
        }
    }
  };

  const handleSaveCategory = () => {
    if (categoryNameInput.trim()) {
        const categoryData = {
            name: categoryNameInput.trim(),
            color: categoryColorInput,
            coverImage: categoryImageInput
        };

        if (editingCategory) {
            // Edit Mode
            updateCategory(editingCategory.originalName || editingCategory.name, categoryData);
        } else {
            // Add Mode
            addCategory(categoryData);
        }
        setShowEditDialog(false);
    }
  };

  const confirmDeleteCategory = (category) => {
      setCategoryToDelete(category);
  };

  const handleDeleteCategory = () => {
      if (categoryToDelete) {
          deleteCategory(categoryToDelete.originalName || categoryToDelete.name);
          setCategoryToDelete(null);
      }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Edit/Add Dialog */}
      {showEditDialog && createPortal(
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-lg font-bold text-cream-900 mb-4">
                    {editingCategory ? t('categories.edit_dialog.edit_title') : t('categories.edit_dialog.add_title')}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-cream-400 uppercase tracking-wider mb-1 block">{t('categories.edit_dialog.name_label')}</label>
                        <input 
                            type="text" 
                            autoFocus
                            value={categoryNameInput}
                            onChange={(e) => setCategoryNameInput(e.target.value)}
                            placeholder={t('categories.edit_dialog.name_placeholder')}
                            className="w-full px-4 py-2 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-cream-400 uppercase tracking-wider mb-2 block">{t('categories.edit_dialog.cover_label')}</label>
                        <div className="flex items-center gap-4">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "w-16 aspect-[3/4] rounded-md border-2 border-dashed border-cream-200 flex items-center justify-center cursor-pointer hover:border-cream-400 hover:bg-cream-50 transition-all overflow-hidden relative",
                                    categoryImageInput ? "border-solid border-0" : ""
                                )}
                            >
                                {categoryImageInput ? (
                                    <>
                                        <img src={categoryImageInput} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <Pencil size={12} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <ImageIcon size={16} className="text-cream-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm font-medium text-cream-600 hover:text-cream-900 underline decoration-cream-300 underline-offset-4"
                                >
                                    {categoryImageInput ? t('categories.edit_dialog.change_image') : t('categories.edit_dialog.upload_image')}
                                </button>
                                {categoryImageInput && (
                                    <button
                                        onClick={() => setCategoryImageInput(null)}
                                        className="ml-4 text-xs font-medium text-red-400 hover:text-red-600"
                                    >
                                        {t('categories.edit_dialog.remove_image')}
                                    </button>
                                )}
                                <p className="text-[10px] text-cream-400 mt-1">
                                    {t('categories.edit_dialog.recommendation')}
                                </p>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-cream-400 uppercase tracking-wider mb-2 block">{t('categories.edit_dialog.color_label')}</label>
                        <div className="grid grid-cols-5 gap-2">
                            {CATEGORY_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => setCategoryColorInput(color.value)}
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                        color.value.split(' ')[0], // Extract bg class
                                        categoryColorInput === color.value ? "ring-2 ring-offset-2 ring-cream-400 scale-110" : "hover:scale-105"
                                    )}
                                    title={color.name}
                                >
                                    {categoryColorInput === color.value && <Check size={14} className="text-current opacity-70" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button 
                        onClick={() => setShowEditDialog(false)}
                        className="px-4 py-2 text-cream-600 hover:bg-cream-50 rounded-lg transition-colors"
                    >
                        {t('categories.edit_dialog.cancel')}
                    </button>
                    <button 
                        onClick={handleSaveCategory}
                        disabled={!categoryNameInput.trim()}
                        className="px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors disabled:opacity-50"
                    >
                        {editingCategory ? t('categories.edit_dialog.save') : t('categories.edit_dialog.create')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
      )}

      <ConfirmDialog 
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        title={t('categories.delete_dialog.title')}
        message={t('categories.delete_dialog.message', { name: categoryToDelete?.name })}
        confirmText={t('categories.delete_dialog.confirm')}
        isDangerous={true}
      />

      {/* Header - Transparent Background */}
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
            {selectedCategory ? (
            <button 
                onClick={() => setSelectedCategory(null)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors text-cream-600 group backdrop-blur-sm"
            >
                <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            ) : (
            <Book className="text-cream-900 ml-1" size={28} />
            )}
            
            <div>
                <h1 className="text-2xl font-bold text-cream-900 leading-none">
                    {selectedCategory ? (['Daily Life', 'Work', 'Travel', 'Uncategorized'].includes(selectedCategory) ? t(`categories.defaults.${selectedCategory}`) : selectedCategory) : t('categories.title')}
                </h1>
                {selectedCategory && (
                    <span className="text-xs font-medium text-cream-500 mt-1 block">
                        {t('categories.entries', { count: Object.values(groupedFilteredDiaries).flat().length })}
                    </span>
                )}
            </div>
        </div>

        {!selectedCategory && (
            <button 
                onClick={() => setIsManaging(!isManaging)}
                className={cn(
                    "px-3 py-2 rounded-lg transition-all border border-cream-200 shadow-sm flex items-center gap-2 font-medium text-sm",
                    isManaging 
                        ? "bg-cream-100 text-amber-500" 
                        : "bg-white text-cream-900 hover:text-amber-500 hover:bg-cream-50"
                )}
            >
                {isManaging ? <Check size={16} /> : <Settings size={16} />}
                {isManaging ? t('categories.done') : t('categories.manage')}
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-2">
        <AnimatePresence mode="wait">
            {!selectedCategory ? (
                /* Categories View */
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-10 gap-y-20 p-4"
                >
                    {categoriesWithStats.map((cat) => (
                    <div 
                        key={cat.id} 
                        className="group relative flex flex-col gap-2"
                    >
                         {/* Edit/Delete Buttons (Only in Manage Mode) - Overlay on Cover */}
                         {isManaging && cat.isCustom && (
                            <div className={cn(
                                "absolute top-0 left-0 w-full aspect-[3/4] z-20 flex items-center justify-center gap-4 bg-black/40 backdrop-blur-[2px] transition-all duration-200 rounded-xl opacity-100"
                            )}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(cat);
                                    }}
                                    className="text-white/70 hover:text-white transition-all hover:scale-110"
                                    title={t('categories.actions.edit')}
                                >
                                    <Pencil size={20} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        confirmDeleteCategory(cat);
                                    }}
                                    className="text-white/70 hover:text-red-400 transition-all hover:scale-110"
                                    title={t('categories.actions.delete')}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        )}

                        {/* Book Cover */}
                        <div 
                            onClick={(e) => {
                                if (isManaging && cat.isCustom) {
                                    e.stopPropagation();
                                    setActiveCategoryId(activeCategoryId === cat.id ? null : cat.id);
                                } else if (!isManaging) {
                                    setSelectedCategory(cat.originalName || cat.name);
                                }
                            }}
                            className={cn(
                            "relative w-full aspect-[3/4] rounded-xl shadow-sm transition-all duration-300",
                            !isManaging && "cursor-pointer group-hover:-translate-y-2 group-hover:shadow-lg",
                            isManaging && "opacity-90",
                            isManaging && cat.isCustom && "cursor-pointer",
                            "overflow-hidden flex items-center justify-center bg-cream-100", // Default bg
                            !cat.coverImage && cat.color // Apply color ONLY if no image
                        )}>
                            {cat.coverImage ? (
                                <img src={cat.coverImage} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                                /* Default Icon View */
                                <cat.icon size={32} className="opacity-80 mix-blend-multiply" />
                            )}
                            
                            {/* Spine/Binding Effect */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10 z-10" />
                        </div>

                        {/* Metadata Below Cover */}
                        <div className="flex flex-col items-center text-center mt-2">
                            <span className="text-sm font-bold text-cream-900 truncate w-full px-1">
                                {cat.name}
                            </span>
                            <span className="text-[10px] font-medium text-cream-400 uppercase tracking-tight">
                                {t('categories.entries', { count: cat.count })}
                            </span>
                        </div>
                        
                        {/* Shadow/Shelf effect (Floor shadow) */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-2 bg-black/5 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </div>
                    ))}

                    {/* Add New Category Button */}
                    {isManaging && (
                        <div className="group relative flex flex-col gap-2">
                            <div 
                                onClick={openAddDialog}
                                className="relative w-full aspect-[3/4] rounded-xl border-2 border-dashed border-cream-200 flex items-center justify-center cursor-pointer hover:border-cream-400 hover:bg-cream-50 transition-all group-hover:-translate-y-2"
                            >
                                <Plus size={32} className="text-cream-300 group-hover:text-cream-500 transition-colors" />
                                
                                {/* Spine/Binding Effect */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/5" />
                            </div>
                            <div className="flex flex-col items-center text-center mt-2">
                                <span className="text-sm font-bold text-cream-400 group-hover:text-cream-600 transition-colors">
                                    {t('categories.edit_dialog.add_title')}
                                </span>
                            </div>
                        </div>
                    )}
                </motion.div>
            ) : (
                /* Timeline View for Category */
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="px-6 py-4"
                >
                    {Object.keys(groupedFilteredDiaries).length > 0 ? (
                        <div className="space-y-12 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-cream-100">
                            {Object.entries(groupedFilteredDiaries).map(([date, dayDiaries]) => (
                                <div key={date} className="relative pl-8">
                                    {/* Date Header */}
                                    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-white border-4 border-cream-100 z-10" />
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-cream-900 uppercase tracking-widest">
                                            {format(parseISO(date), 'MMM d, yyyy', { locale: currentLocale })}
                                        </h3>
                                        <p className="text-[10px] font-medium text-cream-400 uppercase tracking-tighter">
                                            {format(parseISO(date), 'EEEE', { locale: currentLocale })}
                                        </p>
                                    </div>
                                    
                                    {/* Diaries for this day */}
                                    <div className="space-y-4">
                                        {dayDiaries.map(diary => (
                                            <div key={diary.id} className="group relative">
                                                <DiaryItem 
                                                    diary={diary} 
                                                    onClick={() => navigate(`/diary/${diary.date}`)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-cream-400">
                            <Folder size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">{t('categories.no_diaries')}</p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
