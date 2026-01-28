import React, { useState, useEffect, useMemo } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { useAI } from '../../context/AIContext';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { enUS, zhCN, zhTW, ja } from 'date-fns/locale';
import { PenTool, Save, X, MessageCircle, Sparkles, User, Bot, Trash2, MessageSquare, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import ConfirmDialog from '../ui/ConfirmDialog';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { TagEditor } from '../ui/TagEditor';
import { CategorySelector } from '../ui/CategorySelector';
import { MoodSelector, moods } from '../ui/MoodSelector';

export default function DiaryItem({ diary }) {
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

  const { updateDiary, addComment, deleteDiary, deleteChatHistory, deleteComment, diaries, customCategories, addCategory } = useDiary();
  const { generateChatResponse, generateComment, currentPersona } = useAI();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(diary.title);
  const [editContent, setEditContent] = useState(diary.content);
  const [editCategory, setEditCategory] = useState(diary.category || '');
  const [editTags, setEditTags] = useState(diary.tags || []);
  const [editMood, setEditMood] = useState(diary.mood || 'neutral');
  const [tagInput, setTagInput] = useState('');
  
  const [newComment, setNewComment] = useState('');
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [showChatHistoryDeleteConfirm, setShowChatHistoryDeleteConfirm] = useState(false);

  // ReactQuill Modules
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  // Calculate existing categories
  const existingCategories = useMemo(() => {
    return customCategories.map(c => c.name);
  }, [customCategories]);

  // Sync state when diary prop changes (e.g. after update)
  useEffect(() => {
    setEditTitle(diary.title);
    setEditContent(diary.content);
    setEditCategory(diary.category || '');
    setEditTags(diary.tags || []);
    setEditMood(diary.mood || 'neutral');
  }, [diary]);

  const handleDeleteDiary = () => {
    deleteDiary(diary.id);
  };

  const handleSave = () => {
    // Auto-add category if new
    const trimmedCategory = editCategory.trim();
    if (trimmedCategory && !customCategories.some(c => c.name === trimmedCategory)) {
        addCategory(trimmedCategory);
    }

    updateDiary(diary.id, {
      title: editTitle,
      content: editContent,
      category: trimmedCategory,
      tags: editTags,
      mood: editMood
    });
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(diary.id, {
      author: 'user',
      text: newComment
    });
    setNewComment('');
  };

  const handleAIComment = async () => {
    setIsGeneratingComment(true);
    try {
      console.log("Generating comment for diary:", diary.id);
      const commentText = await generateComment(diary, diary.comments);
      
      addComment(diary.id, {
        author: 'ai',
        text: commentText
      });
    } catch (error) {
      console.error("Failed to generate comment:", error);
      alert(`Failed to generate comment: ${error.message}`);
    } finally {
      setIsGeneratingComment(false);
    }
  };

  const handleDeleteComment = () => {
    if (commentToDelete) {
      deleteComment(diary.id, commentToDelete);
      setCommentToDelete(null);
      setShowCommentDeleteConfirm(false);
    }
  };

  const handleDeleteChatHistory = () => {
    deleteChatHistory(diary.id);
    setShowChatHistoryDeleteConfirm(false);
  };

  return (
    <div className="mb-12 border-b border-cream-200 pb-12 last:border-0 last:pb-0">
      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteDiary}
        title={t('diary_item.delete_diary_title')}
        message={t('diary_item.delete_diary_message')}
        confirmText={t('common.delete')}
        isDangerous={true}
      />

      <ConfirmDialog 
        isOpen={showCommentDeleteConfirm}
        onClose={() => setShowCommentDeleteConfirm(false)}
        onConfirm={handleDeleteComment}
        title={t('diary_item.delete_comment_title')}
        message={t('diary_item.delete_comment_message')}
        confirmText={t('common.delete')}
        isDangerous={true}
      />

      {/* Item Header / Controls */}
      <div className="mb-6 flex items-center justify-end">
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-cream-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title={t('diary_item.delete_diary')}
            >
              <Trash2 size={18} />
            </button>
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 text-cream-900/60 hover:text-cream-900 hover:bg-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Pencil size={18} />
              {t('diary_item.edit')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="p-2 text-cream-900/60 hover:text-cream-900 hover:bg-cream-100 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-cream-900 text-white rounded-lg shadow-sm hover:bg-cream-800 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Save size={16} />
              {t('diary_item.save')}
            </button>
          </div>
        )}
      </div>

      {/* Diary Content */}
      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-cream-100 mb-6 relative group min-h-[400px]">
        {isEditing ? (
          <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-3xl md:text-4xl font-bold text-cream-900 border-b border-cream-100 pb-2 focus:border-cream-300 outline-none bg-transparent flex-1 min-w-[200px]"
                  placeholder={t('diary_item.title_placeholder')}
                />
                <MoodSelector value={editMood} onChange={setEditMood} />
            </div>
            
            {/* Metadata Edit Inputs */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-cream-500 mb-1 uppercase tracking-wide">{t('diary_item.category_label')}</label>
                <CategorySelector 
                   value={editCategory} 
                   onChange={setEditCategory} 
                   existingCategories={existingCategories}
                />
              </div>
              <div className="flex-[2]">
                <label className="block text-xs font-medium text-cream-500 mb-1 uppercase tracking-wide">{t('diary_item.tags_label')}</label>
                <TagEditor 
                  tags={editTags} 
                  setTags={setEditTags} 
                  inputValue={tagInput} 
                  setInputValue={setTagInput} 
                />
              </div>
            </div>

            <div className="flex-1">
              <ReactQuill 
                theme="snow" 
                value={editContent} 
                onChange={setEditContent} 
                modules={modules}
                placeholder={t('diary_item.content_placeholder')}
                className="h-full"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
               {diary.mood && (() => {
                  const moodObj = moods.find(m => m.id === diary.mood);
                  if (moodObj) {
                    const Icon = moodObj.icon;
                    return <Icon size={32} className={moodObj.color} title={diary.mood} />;
                  }
                  return null;
               })()}
               <h1 className="text-3xl md:text-4xl font-bold text-cream-900 leading-tight">
                 {diary.title}
               </h1>
            </div>
            
            {/* Metadata: Tags and Category */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
                {diary.category && (
                    <span className="px-3 py-1 bg-cream-100 text-cream-600 rounded-full text-xs font-medium uppercase tracking-wide">
                        {diary.category}
                    </span>
                )}
                {diary.tags && diary.tags.length > 0 && diary.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-cream-50 text-cream-500 rounded-full text-xs border border-cream-100">
                        #{tag}
                    </span>
                ))}
            </div>

            <div 
              className="prose prose-stone max-w-none text-cream-900/80 leading-loose text-lg font-serif [&_p]:indent-[2em] [&_p]:mb-4"
              dangerouslySetInnerHTML={{ __html: diary.content }}
            />
          </>
        )}
      </div>

      {/* Chat History Section */}
      {diary.chatHistory && diary.chatHistory.length > 0 && (
        <div className="mt-8 pt-8 border-t border-cream-200/50">
          <button 
            onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
            className="w-full flex items-center justify-between text-left group"
          >
            <h3 className="text-lg font-bold text-cream-900 flex items-center gap-2">
              <MessageSquare size={20} />
              {t('diary_item.chat_history')}
              <span className="text-xs font-normal text-cream-500 ml-2 bg-cream-100 px-2 py-0.5 rounded-full">
                {t('diary_item.messages_count', { count: diary.chatHistory.length })}
              </span>
            </h3>
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowChatHistoryDeleteConfirm(true);
                    }}
                    className="p-1.5 text-cream-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title={t('diary_item.delete_chat_history_title')}
                >
                    <Trash2 size={16} />
                </button>
                {isChatHistoryOpen ? (
                <ChevronUp className="text-cream-400 group-hover:text-cream-600 transition-colors" size={20} />
                ) : (
                <ChevronDown className="text-cream-400 group-hover:text-cream-600 transition-colors" size={20} />
                )}
            </div>
          </button>

          <ConfirmDialog 
            isOpen={showChatHistoryDeleteConfirm}
            onClose={() => setShowChatHistoryDeleteConfirm(false)}
            onConfirm={handleDeleteChatHistory}
            title={t('diary_item.delete_chat_history_title')}
            message={t('diary_item.delete_chat_history_confirm')}
            confirmText={t('common.delete')}
            isDangerous={true}
          />
          
          <AnimatePresence>
            {isChatHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-2 mt-4 bg-cream-50/30 rounded-xl border border-cream-100/50">
                  {diary.chatHistory.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex gap-3",
                        msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0 shadow-sm",
                        msg.sender === 'user' ? "bg-cream-900" : "bg-amber-500"
                      )}>
                        {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl max-w-[80%] text-sm leading-relaxed shadow-sm",
                        msg.sender === 'user' 
                          ? "bg-white text-cream-900 border border-cream-100 rounded-tr-none" 
                          : "bg-white text-cream-900 border border-cream-100 rounded-tl-none"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-8 pt-8 border-t border-cream-200/50">
        <h3 className="text-lg font-bold text-cream-900 flex items-center gap-2 mb-6">
          <MessageCircle size={20} />
          {t('diary_item.comments')}
          <span className="text-xs font-normal text-cream-500 ml-2 bg-cream-100 px-2 py-0.5 rounded-full">
            {diary.comments?.length || 0}
          </span>
        </h3>

        <div className="space-y-4 mb-6">
          {diary.comments?.map((comment) => (
            <motion.div 
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl relative group",
                comment.author === 'ai' 
                  ? "bg-gradient-to-br from-cream-50 to-white border border-cream-100" 
                  : "bg-white border border-cream-100"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {comment.author === 'ai' ? (
                    <div className="w-6 h-6 rounded-full bg-cream-900 flex items-center justify-center text-white">
                      <Bot size={14} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-cream-200 flex items-center justify-center text-cream-600">
                      <User size={14} />
                    </div>
                  )}
                  <span className="text-sm font-bold text-cream-900">
                    {comment.author === 'ai' ? t('diary_item.ai_author', { name: comment.personaName || 'AI' }) : t('diary_item.user_author')}
                  </span>
                  <span className="text-xs text-cream-400">
                    {format(parseISO(comment.date), 'p', { locale: currentLocale })}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setCommentToDelete(comment.id);
                    setShowCommentDeleteConfirm(true);
                  }}
                  className="p-1.5 text-cream-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title={t('diary_item.delete_comment')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-cream-700 leading-relaxed text-sm pl-8 whitespace-pre-wrap">{comment.text}</p>
            </motion.div>
          ))}

          {(!diary.comments || diary.comments.length === 0) && (
            <div className="text-center py-8 text-cream-400 text-sm bg-cream-50/50 rounded-xl border border-dashed border-cream-200">
              {t('diary_item.no_comments')}
            </div>
          )}
        </div>

        <div className="flex gap-3">
           <button
             onClick={handleAIComment}
             disabled={isGeneratingComment}
             className="p-3 bg-cream-100 hover:bg-cream-200 text-cream-900 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
             title={t('diary_item.ask_ai')}
           >
             {isGeneratingComment ? (
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
               >
                 <Sparkles size={20} />
               </motion.div>
             ) : (
               <Sparkles size={20} />
             )}
           </button>
           <div className="flex-1 relative">
             <input
               type="text"
               value={newComment}
               onChange={(e) => setNewComment(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
               placeholder={t('diary_item.add_comment_placeholder')}
               className="w-full h-full pl-4 pr-12 py-3 bg-cream-50 border-none rounded-xl focus:ring-2 focus:ring-cream-200 outline-none text-cream-900 placeholder:text-cream-400"
             />
             <button 
               onClick={handleAddComment}
               disabled={!newComment.trim()}
               className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-cream-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cream-800 transition-colors"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}