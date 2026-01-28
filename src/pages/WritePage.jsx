import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useLayout } from '../components/layout/LayoutContext';
import { useTheme } from '../context/ThemeContext';
import { useDiary } from '../context/DiaryContext';
import { useAI } from '../context/AIContext';
import { 
  PenTool, MessageCircle, Wand2, ArrowRight, ArrowLeft, Calendar, 
  Sparkles, Save, RotateCcw, X, Trash2, Check, Book,
  Pencil, CheckSquare, Copy, Image as ImageIcon,
  Tag, Smile, Frown, Meh, Heart, Zap
} from 'lucide-react';
import { cn, compressImage } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { enUS, zhCN, zhTW } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AISettings from '../components/settings/AISettings';
import { TagEditor } from '../components/ui/TagEditor';
import { CategorySelector } from '../components/ui/CategorySelector';
import { MoodSelector } from '../components/ui/MoodSelector';
import { DiffViewer } from '../components/ui/DiffViewer';
import AIPolishAssistant from '../components/chat/AIPolishAssistant';

export default function WritePage() {
  const { i18n } = useTranslation();
  const [mode, setMode] = useState('chat');
  const { setRightSidebarOpen } = useLayout();
  const { theme, t } = useTheme();
  
  const localeMap = {
    'en': enUS,
    'en-US': enUS,
    'zh': zhCN,
    'zh-CN': zhCN,
    'zh-TW': zhTW
  };
  const currentLocale = localeMap[i18n.language] || enUS;

  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const modeParam = searchParams.get('mode');
  
  const { 
    generateDiary, 
    currentPersona, 
    messages, 
    isTyping, 
    sendMessage, 
    editMessage,
    deleteMessages,
    triggerAIResponse, 
    regenerateLastResponse,
    generateBriefing,
    activeDate,
    setActiveDate
  } = useAI(); 
  
  // Update active date if provided in URL
  useEffect(() => {
    if (dateParam && dateParam !== activeDate) {
      setActiveDate(dateParam);
    }
  }, [dateParam, activeDate, setActiveDate]);

  // Handle mode param
  useEffect(() => {
    if (modeParam && ['chat', 'manual'].includes(modeParam)) {
      setMode(modeParam);
    }
  }, [modeParam]);

  const { addDiary, diaries, customCategories, addCategory } = useDiary();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const [activeMessageId, setActiveMessageId] = useState(null); // For mobile: tap to show actions
  
  // Editing State
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMessageIds(new Set());
    setEditingMessageId(null); // Cancel editing if active
  };

  const toggleMessageSelection = (id) => {
    const newSelected = new Set(selectedMessageIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMessageIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedMessageIds.size === 0) return;
    if (window.confirm(t('write.deleteConfirm', { count: selectedMessageIds.size }))) {
        deleteMessages(Array.from(selectedMessageIds));
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setEditValue(msg.text);
    setIsSelectionMode(false); // Exit selection mode if active
  };

  const saveEdit = () => {
    if (editingMessageId && editValue.trim()) {
        editMessage(editingMessageId, editValue);
        setEditingMessageId(null);
        setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditValue('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Manual Mode State
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualMood, setManualMood] = useState('neutral');
  const [manualTags, setManualTags] = useState([]);
  const [manualCategory, setManualCategory] = useState('');
  const [manualTagInput, setManualTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Assistant State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);


  // Diary Reroll Popup State
  const [isDiaryRerollPopupOpen, setIsDiaryRerollPopupOpen] = useState(false);
  const [diaryRerollInstruction, setDiaryRerollInstruction] = useState('');

  const [diffMode, setDiffMode] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [polishedContent, setPolishedContent] = useState('');
  const [polishedTitle, setPolishedTitle] = useState(null);
  const [polishedTags, setPolishedTags] = useState(null);

  // Draft Persistence Logic
  useEffect(() => {
    if (!activeDate) return;
    const draftKey = `diary_draft_${activeDate}`;
    
    try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            setManualContent(parsed.content || '');
            setManualTitle(parsed.title || '');
            setManualMood(parsed.mood || 'neutral');
            setManualTags(parsed.tags || []);
            setManualCategory(parsed.category || '');
            setAssistantMessages(parsed.messages || []);
            setIsAssistantOpen(parsed.isAssistantOpen || false);
        } else {
            // No draft found for this date, reset to defaults
            setManualContent('');
            setManualTitle('');
            setManualMood('neutral');
            setManualTags([]);
            setManualCategory('');
            setAssistantMessages([]);
            setIsAssistantOpen(false);
        }
    } catch (e) {
        console.error("Failed to load draft", e);
        // On error, also reset to avoid stale state
        setManualContent('');
        setManualTitle('');
        setManualMood('neutral');
        setManualTags([]);
        setManualCategory('');
        setAssistantMessages([]);
        setIsAssistantOpen(false);
    }
  }, [activeDate]);

  // Close AI Assistant when switching to Chat Mode
  useEffect(() => {
    if (mode === 'chat') {
        setIsAssistantOpen(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!activeDate) return;
    const draftKey = `diary_draft_${activeDate}`;

    // Only save if there's actual content or changes to avoid overwriting with empty state on initial load
    // But we need to be careful not to prevent clearing.
    // A simple debounce could be good, but standard effect is fine for local storage.
    
    // Don't auto-save if we are currently saving the diary (prevent overwriting draft with partial state)
    if (isSaving) return;

    const draftData = {
        content: manualContent,
        title: manualTitle,
        mood: manualMood,
        tags: manualTags,
        category: manualCategory,
        messages: assistantMessages,
        isAssistantOpen: isAssistantOpen,
        timestamp: Date.now()
    };

    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [manualContent, manualTitle, manualMood, manualTags, manualCategory, assistantMessages, isAssistantOpen, isSaving]); // activeDate excluded to prevent saving old content to new date during switch

  const handleAssistantPreview = (data) => {
      // data is { content, title, tags }
      setOriginalContent(manualContent);
      setPolishedContent(data.content || manualContent);
      setPolishedTitle(data.title || null);
      setPolishedTags(data.tags || null);
      setDiffMode(true);
  };

  const handleAcceptDiff = (finalContent) => {
      // If finalContent is passed (from partial accept), use it.
      // Otherwise use the full polishedContent (legacy Accept All behavior if triggered directly)
      const contentToApply = typeof finalContent === 'string' ? finalContent : polishedContent;
      setManualContent(contentToApply);
      
      // Apply metadata if available
      if (polishedTitle) setManualTitle(polishedTitle);
      if (polishedTags) setManualTags(polishedTags);
      
      setDiffMode(false);
      setPolishedTitle(null);
      setPolishedTags(null);
  };

  const handleRejectDiff = () => {
      setDiffMode(false);
      setPolishedTitle(null);
      setPolishedTags(null);
  };

  // Generated Diary State (Extras)
  const [generatedMood, setGeneratedMood] = useState('neutral');
  const [generatedTags, setGeneratedTags] = useState([]);
  const [generatedTagInput, setGeneratedTagInput] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [generatedCategory, setGeneratedCategory] = useState('');
  const [generatedBriefing, setGeneratedBriefing] = useState(null);
  
  // Diary Generation State
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file);
      sendMessage('', { type: 'image', url: compressedDataUrl });
    } catch (error) {
      console.error("Image upload failed:", error);
      alert(t('write.alerts.uploadFailed'));
    } finally {
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Auto-scroll ref
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

  // Diary Generation State
  const [generatedDiary, setGeneratedDiary] = useState(null);

  // Calculate existing categories
  const existingCategories = useMemo(() => {
    return customCategories.map(c => c.name);
  }, [customCategories]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync Right Sidebar with Mode
  useEffect(() => {
    // If we switch to 'chat' mode, we might want to close the right sidebar 
    // because the main view IS the chat.
    if (mode === 'chat') {
        setRightSidebarOpen(false);
    }
  }, [mode, setRightSidebarOpen]);

  // Close right sidebar when unmounting (leaving the page)
  useEffect(() => {
    return () => {
      setRightSidebarOpen(false);
    };
  }, [setRightSidebarOpen]);

  const shouldShowTimestamp = (currentMsg, prevMsg) => {
    // Hide timestamp for the default greeting message (id 1)
    if (currentMsg.id === 1 || currentMsg.id === '1') return false;

    if (!prevMsg) return true;
    // Assuming msg.id is a timestamp (Date.now())
    const timeDiff = currentMsg.id - prevMsg.id;
    return timeDiff > 3 * 60 * 1000; // Show timestamp if gap > 3 minutes
  };

  const formatMessageTime = (timestamp) => {
     const date = new Date(timestamp);
     // If today, show time only. If not today, show date + time
     const now = new Date();
     if (date.toDateString() === now.toDateString()) {
         return format(date, 'p', { locale: currentLocale });
     }
     return format(date, 'MMM d, p', { locale: currentLocale });
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
    // Fix for iOS voice input ghost text
    if (textInputRef.current) {
      textInputRef.current.value = '';
    }
  };

  const handleTriggerAI = async () => {
    if (isTyping) return;
    await triggerAIResponse();
  };

  const handleGenerateDiary = async (instruction = '') => {
    setIsGenerating(true);
    try {
      // Filter messages to only include valid chat history
      // We trust that 'messages' already contains the correct context for the activeDate
      // (loaded from localStorage key specific to activeDate)
      const todaysMessages = messages.filter(msg => {
            // Skip default greeting
            if (msg.id === 1 || msg.id === '1') return false;
            // Ensure it's a valid message
            if (!msg.text && !msg.attachment) return false;
            return true;
      });

      if (todaysMessages.length === 0) {
        // Fallback: If no real messages, but we are here, maybe just warn?
        // But if user wants to generate, they usually have content.
        alert(t('write.alerts.noHistory', { date: activeDate || 'today' }));
        setIsGenerating(false);
        return;
      }

      const result = await generateDiary(todaysMessages, instruction);
      if (typeof result === 'object') {
        setGeneratedDiary(result.content);
        setGeneratedMood(result.mood?.toLowerCase() || 'neutral');
        setGeneratedTags(result.tags || []);
        setGeneratedTitle(result.title || 'Generated Entry');
        setGeneratedSummary(result.summary || '');
        setGeneratedCategory(result.category || '');
        setGeneratedBriefing(result.ai_briefing || null);
      } else {
        setGeneratedDiary(result);
        setGeneratedTitle('Generated Entry');
        setGeneratedBriefing(null);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      alert(t('write.alerts.generateFailed', { error: error.message }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle saving generated diary
  const handleSaveDiary = () => {
    if (generatedDiary) {
      try {
        // Use activeDate
        const dateStr = activeDate || format(new Date(), 'yyyy-MM-dd');
        
        // Auto-add category if new
        if (generatedCategory && !customCategories.some(c => c.name === generatedCategory)) {
            addCategory(generatedCategory);
        }

        // Filter messages to only include valid messages
        // We trust 'messages' state contains the correct context for this date
        const relevantMessages = messages.filter(msg => {
            // Skip default greeting
            if (msg.id === 1 || msg.id === '1') return false;
             // Ensure it's a valid message
             if (!msg.text && !msg.attachment) return false;
            return true;
        });

        addDiary({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          date: dateStr,
          title: generatedTitle || 'Daily Reflection',
          content: generatedDiary,
          mood: generatedMood,
          tags: generatedTags,
          summary: generatedSummary,
          category: generatedCategory,
          ai_briefing: generatedBriefing,
          // Don't save full chat history with images in the diaries array to save space
          // The chat history is already preserved in chat_messages storage
          chatHistory: relevantMessages.map(m => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            // Use timestamp or fallback to ID (if numeric) or parse ID
            timestamp: m.timestamp || (typeof m.id === 'number' ? m.id : parseInt(m.id)),
            // Exclude attachment to save space
          })) 
        });
        
        // DO NOT CLEAR MESSAGES HERE
        // The chat history should be preserved for the date.
        // Clearing setGeneratedDiary is fine as it's just the preview state.
        
        setGeneratedDiary(null); // Close preview
        setGeneratedMood('neutral');
        setGeneratedTags([]);
        setGeneratedTitle('');
        setGeneratedSummary('');
        setGeneratedCategory('');
        setGeneratedBriefing(null);
        
        navigate(`/date/${dateStr}`);
      } catch (error) {
        console.error("Error in handleSaveDiary:", error);
        alert(t('write.alerts.saveFailed', { error: error.message }));
      }
    }
  };

  const handleSaveManualDiary = async () => {
    if (!manualContent.trim() && !manualTitle.trim()) return;
    
    setIsSaving(true);
    
    // Auto-add category if new
    if (manualCategory && !customCategories.some(c => c.name === manualCategory)) {
        addCategory(manualCategory);
    }

    // Generate Briefing for Manual Entry
    let briefing = null;
    try {
        // Show some indication if needed, or just await (it might take a few seconds)
        briefing = await generateBriefing(manualContent, manualTitle || 'Untitled');
    } catch (e) {
        console.error("Failed to generate briefing for manual entry", e);
        // Continue saving even if briefing fails
    }

    try {
        const dateStr = activeDate || format(new Date(), 'yyyy-MM-dd');
        addDiary({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          date: dateStr,
          title: manualTitle || 'Untitled Entry',
          content: manualContent,
          mood: manualMood,
          tags: manualTags,
          category: manualCategory,
          ai_briefing: briefing,
          chatHistory: [] // Manual entry has no chat history attached by default unless we want to link it
        });
        
        // Don't clear state here to avoid triggering the draft auto-save effect with empty data
        // The component will unmount or navigate away anyway
        
        // Clear draft explicitly
        const draftKey = `diary_draft_${activeDate || format(new Date(), 'yyyy-MM-dd')}`;
        localStorage.removeItem(draftKey);
        
        // Reset assistant state is fine as it's not the main content
        setAssistantMessages([]);
        setIsAssistantOpen(false);

        navigate(`/date/${dateStr}`);
    } catch (error) {
        console.error("Failed to save diary:", error);
        alert(t('write.alerts.saveFailed', { error: 'Please try again' }));
        setIsSaving(false);
    }
  };

  // Future Date Check
  const isFutureDate = useMemo(() => {
    if (!activeDate) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return activeDate > todayStr;
  }, [activeDate]);

  if (isFutureDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="max-w-md animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-cream-100/50 rounded-full flex items-center justify-center mx-auto mb-6 text-cream-400/80">
            <Calendar size={32} />
          </div>
          <h2 className="text-xl font-serif font-medium text-cream-900 mb-2">
            {t('write.futureDate.title')}
          </h2>
          <p className="text-cream-600 mb-8 font-light italic">
            "{t('write.futureDate.quote')}"
          </p>
          <button
            onClick={() => navigate('/calendar')}
            className="px-6 py-2.5 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors text-sm font-medium flex items-center gap-2 mx-auto shadow-sm"
          >
            <ArrowLeft size={16} />
            {t('write.futureDate.goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 shrink-0 relative z-30 sticky top-0 bg-[#FDFBF7]/90 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            
            <div className="flex bg-cream-100/50 p-1 rounded-xl">
          <button 
            onClick={() => setMode('chat')}
            className={cn(
              "p-2 rounded-md transition-all flex items-center justify-center",
              mode === 'chat' ? "bg-white text-cream-900 shadow-sm" : "text-cream-900/60 hover:text-cream-900 hover:bg-white/50"
            )}
            title={t('write.chat.mode')}
          >
            <MessageCircle size={18} />
          </button>
          <button 
            onClick={() => setMode('manual')}
            className={cn(
              "p-2 rounded-md transition-all flex items-center justify-center",
              mode === 'manual' ? "bg-white text-cream-900 shadow-sm" : "text-cream-900/60 hover:text-cream-900 hover:bg-white/50"
            )}
            title={t('write.chat.manualMode')}
          >
            <PenTool size={18} />
          </button>
        </div>
        </div>

        {/* Active Date Label - Centered Absolute */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="px-3 py-1 bg-cream-100 rounded-lg border border-cream-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-cream-700 uppercase tracking-wide">
                  {t('write.recording')}: {activeDate ? format(parseISO(activeDate), 'PP', { locale: currentLocale }) : format(new Date(), 'PP', { locale: currentLocale })}
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
          {mode === 'chat' && (
            <>
              <button 
                onClick={toggleSelectionMode}
                className={cn(
                  "p-2 rounded-lg transition-all border border-cream-200 shadow-sm flex items-center justify-center",
                  isSelectionMode ? "bg-cream-900 text-white" : "bg-white text-cream-900 hover:bg-cream-50"
                )}
                title={isSelectionMode ? t('write.chat.cancelSelection') : t('write.chat.selectMessages')}
              >
                <CheckSquare size={18} />
              </button>
              
              <AnimatePresence>
                  {isSelectionMode && selectedMessageIds.size > 0 && (
                      <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={handleDeleteSelected}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-medium text-sm border border-red-200"
                      >
                          <Trash2 size={16} />
                          <span>{t('write.deleteSelected', { count: selectedMessageIds.size })}</span>
                      </motion.button>
                  )}
              </AnimatePresence>

                <button 
                  onClick={() => handleGenerateDiary()}
                  disabled={isGenerating}
                  className={cn(
                    "px-3 py-2 rounded-lg transition-all border border-cream-200 shadow-sm flex items-center gap-2 font-medium text-sm",
                    isGenerating ? "bg-cream-100 text-cream-400" : "bg-white text-cream-900 hover:text-amber-500 hover:bg-cream-50"
                  )}
                  title={t('write.generate')}
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-cream-400 border-t-cream-900 rounded-full animate-spin"></div>
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span className="hidden sm:inline">{isGenerating ? t('write.generating') : t('write.generate')}</span>
                </button>
             </>
          )}

          {mode === 'manual' && (
            <>
              <button 
                onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                className={cn(
                    "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-colors shadow-sm",
                    isAssistantOpen 
                        ? "bg-amber-50 text-amber-700 border-amber-200" 
                        : "bg-white text-cream-900 border-cream-200 hover:bg-cream-50"
                )}
              >
                  <Wand2 size={16} />
                  <span className="hidden sm:inline">{t('write.aiAssistant')}</span>
              </button>
              <button 
                onClick={handleSaveManualDiary}
                disabled={isSaving}
                className="flex items-center gap-2 text-sm font-medium bg-cream-900 text-white px-3 py-2 rounded-lg hover:bg-cream-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">{t('write.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span className="hidden sm:inline">{t('write.save')}</span>
                    </>
                  )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {mode === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col rounded-2xl border border-white/60 shadow-inner overflow-hidden relative"
              style={{
                backgroundColor: theme.chatBgImage ? 'transparent' : 'rgba(253, 251, 247, 0.5)',
                backgroundImage: theme.chatBgImage ? `url(${theme.chatBgImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              {/* Sticky Persona Indicator - Transparent */}
              <div className="px-4 py-2 flex justify-center z-10 sticky top-0 pointer-events-none">
                 <div 
                   className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs text-cream-600 flex items-center gap-1.5 cursor-pointer hover:bg-white transition-colors border border-cream-100/50 shadow-sm pointer-events-auto"
                   onClick={() => setIsSettingsOpen(true)}
                 >
                   <Sparkles size={12} />
                   <span className="font-medium text-cream-900">{currentPersona.name}</span>
                 </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-6 custom-scrollbar">
                {messages.map((msg, index) => {
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showTime = shouldShowTimestamp(msg, prevMsg);
                  const isEditing = editingMessageId === msg.id;
                  const isSelected = selectedMessageIds.has(msg.id);
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center my-6">
                          <span className="text-[10px] font-medium text-cream-400 bg-cream-100/60 px-2.5 py-1 rounded-full">
                            {formatMessageTime(msg.id)}
                          </span>
                        </div>
                      )}
                      
                      <div 
                        className={cn(
                          "flex w-full group relative mb-2",
                          msg.sender === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <div 
                            className={cn(
                              "flex items-center px-2 cursor-pointer transition-all",
                              msg.sender === 'user' ? "order-first" : "order-first"
                            )}
                            onClick={() => toggleMessageSelection(msg.id)}
                          >
                             <div className={cn(
                               "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                               isSelected 
                                 ? "bg-cream-900 border-cream-900 text-white" 
                                 : "bg-white border-cream-300 hover:border-cream-400"
                             )}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                             </div>
                          </div>
                        )}

                        {/* Message Bubble or Edit Form */}
                        {isEditing ? (
                           <div className={cn(
                             "w-full max-w-[80%] p-4 rounded-2xl bg-white border border-cream-200 shadow-lg z-10",
                             msg.sender === 'user' ? "rounded-tr-none" : "rounded-tl-none"
                           )}>
                              <textarea 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-full bg-transparent resize-none outline-none text-lg text-cream-900 min-h-[100px]"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-cream-600 hover:bg-cream-50 rounded-lg">{t('common.cancel')}</button>
                                <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-cream-900 text-white rounded-lg hover:bg-cream-800">{t('common.save')}</button>
                              </div>
                           </div>
                        ) : (
                           <div 
                              onClick={() => !isSelectionMode && setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
                              className={cn(
                              "max-w-[80%] p-4 rounded-2xl text-lg leading-relaxed shadow-sm relative transition-all cursor-pointer",
                              msg.sender === 'user' 
                                ? "bg-cream-900 text-white rounded-tr-none" 
                                : "bg-white text-cream-900 border border-cream-100 rounded-tl-none" 
                           )}>
                              {msg.attachment && msg.attachment.type === 'image' && (
                                <div className="mb-2 rounded-lg overflow-hidden">
                                  <img 
                                    src={msg.attachment.url} 
                                    alt="Uploaded" 
                                    className="max-w-full h-auto max-h-[300px] object-cover" 
                                  />
                                </div>
                              )}
                              {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}

                              {/* Action Buttons (Hover or Active) */}
                              {!isSelectionMode && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn(
                                  "absolute top-1/2 -translate-y-1/2 flex gap-2 transition-opacity z-10 px-2",
                                  msg.sender === 'user' ? "right-full" : "left-full",
                                  activeMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                )}>
                                   <button onClick={() => copyToClipboard(msg.text || '')} className="text-cream-400 hover:text-cream-900 transition-colors" title={t('write.chat.copy')}>
                                     <Copy size={16} />
                                   </button>
                                   {msg.text && (
                                     <button onClick={() => startEditing(msg)} className="text-cream-400 hover:text-cream-900 transition-colors" title={t('write.chat.edit')}>
                                       <Pencil size={16} />
                                     </button>
                                   )}
                                   <button onClick={() => deleteMessages([msg.id])} className="text-cream-400 hover:text-red-600 transition-colors" title={t('write.chat.delete')}>
                                     <Trash2 size={16} />
                                   </button>
                                   {msg.sender === 'ai' && index === messages.length - 1 && !isTyping && (
                                     <button 
                                       onClick={() => regenerateLastResponse()} 
                                       className="text-cream-400 hover:text-cream-900 transition-colors" 
                                       title={t('write.chat.regenerate')}
                                     >
                                        <RotateCcw size={16} />
                                     </button>
                                   )}
                                </div>
                              )}
                           </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-cream-100 shadow-sm flex items-center min-w-[80px] justify-center">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-cream-400 rounded-full typing-dot" />
                        <span className="w-2 h-2 bg-cream-400 rounded-full typing-dot" />
                        <span className="w-2 h-2 bg-cream-400 rounded-full typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 relative shrink-0 bg-white/60 backdrop-blur-md border-t border-white/50">
                <div className="relative">
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {/* Hidden File Input */}
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-cream-400 hover:text-cream-900 hover:bg-cream-100 rounded-xl transition-all"
                      title={t('write.chat.uploadImage')}
                    >
                      <ImageIcon size={24} />
                    </button>
                  </div>

                  <input 
                    ref={textInputRef}
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isComposing) {
                        handleSendMessage();
                      }
                    }}
                    placeholder={t('write.chat.placeholder')} 
                    className="w-full pl-14 pr-32 py-4 bg-white border border-cream-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cream-200 text-lg transition-all"
                    autoFocus
                  />
                  
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button 
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className="p-2 text-cream-400 hover:text-cream-900 hover:bg-cream-100 rounded-xl transition-all disabled:opacity-50"
                      title={t('write.chat.send')}
                    >
                      <ArrowRight size={24} />
                    </button>
                    
                    <div className="w-px h-6 bg-cream-200 mx-1"></div>
                    
                    <button 
                      onClick={handleTriggerAI}
                      disabled={isTyping || messages.length === 0 || messages[messages.length-1].sender === 'ai'}
                      className="px-3 py-2 bg-cream-900 text-white rounded-xl hover:bg-cream-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium"
                      title={t('write.chat.reply')}
                    >
                       <span>{t('write.chat.reply')}</span>
                       <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
          <div className="h-full bg-white rounded-2xl shadow-sm border border-cream-100 p-8 flex flex-col relative">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <input 
                  type="text" 
                  placeholder={t('write.manual.titlePlaceholder')} 
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="flex-1 min-w-[200px] text-3xl font-bold text-cream-900 placeholder:text-cream-900/20 border-none outline-none bg-transparent"
                />
                <MoodSelector value={manualMood} onChange={setManualMood} />
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-cream-500 mb-1 uppercase tracking-wide">{t('write.manual.category')}</label>
                  <CategorySelector 
                     value={manualCategory} 
                     onChange={setManualCategory} 
                     existingCategories={existingCategories}
                  />
                </div>
                <div className="flex-[2]">
                  <label className="block text-xs font-medium text-cream-500 mb-1 uppercase tracking-wide">{t('write.manual.tags')}</label>
                  <TagEditor 
                    tags={manualTags} 
                    setTags={setManualTags} 
                    inputValue={manualTagInput} 
                    setInputValue={setManualTagInput} 
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                {diffMode ? (
                    <div className="h-full overflow-y-auto p-1 custom-scrollbar">
                        <DiffViewer 
                            original={originalContent} 
                            modified={polishedContent} 
                            originalTitle={manualTitle}
                            modifiedTitle={polishedTitle}
                            originalTags={manualTags}
                            modifiedTags={polishedTags}
                            onAccept={handleAcceptDiff} 
                            onReject={handleRejectDiff}
                            onRevert={handleRejectDiff}
                        />
                    </div>
                ) : (
                    <ReactQuill 
                      theme="snow" 
                      value={manualContent} 
                      onChange={setManualContent} 
                      modules={modules}
                      placeholder={t('write.manual.contentPlaceholder')}
                      className="h-full"
                    />
                )}
              </div>
          </div>
          )}
        </AnimatePresence>

        {/* AI Assistant Popup */}
        <AnimatePresence>
            {isAssistantOpen && (
                <AIPolishAssistant 
                    isOpen={isAssistantOpen} 
                    onClose={() => setIsAssistantOpen(false)}
                    currentContent={manualContent}
                    onPreview={handleAssistantPreview}
                    messages={assistantMessages}
                    setMessages={setAssistantMessages}
                />
            )}
        </AnimatePresence>
      </div>
      
      {/* Generated Diary Preview Overlay - Kept if we want to support generation from chat */}
      <AnimatePresence>
        {(generatedDiary || isGenerating) && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col p-6 rounded-t-xl shadow-xl border-t border-cream-200"
          >
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-xl font-bold text-cream-900 flex items-center gap-2">
                 <Sparkles className="text-amber-400" />
                 {t('write.generated.title')}
               </h3>
               <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        setGeneratedDiary(null);
                        setIsGenerating(false);
                    }}
                    className="p-2 hover:bg-cream-100 rounded-full text-cream-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
               </div>
             </div>
             
             {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-cream-400">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-cream-200 border-t-cream-900 rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400 animate-pulse" size={16} />
                  </div>
                  <p className="font-medium animate-pulse">{t('write.generated.crafting')}</p>
                </div>
             ) : (
               <div className="flex-1 flex flex-col min-h-0">
                 <div className="mb-2 shrink-0 border-b border-cream-100 pb-2 space-y-2">
                   <input
                     type="text"
                     value={generatedTitle}
                     onChange={(e) => setGeneratedTitle(e.target.value)}
                     className="w-full text-2xl font-bold text-cream-900 border-none outline-none placeholder:text-cream-300 bg-transparent"
                     placeholder={t('write.generated.titlePlaceholder')}
                   />
                   <CategorySelector 
                      value={generatedCategory} 
                      onChange={setGeneratedCategory} 
                      existingCategories={existingCategories}
                   />
                 </div>

                 <div className="flex items-center gap-4 mb-4 flex-wrap shrink-0">
                    <MoodSelector value={generatedMood} onChange={setGeneratedMood} />
                    <TagEditor 
                      tags={generatedTags} 
                      setTags={setGeneratedTags} 
                      inputValue={generatedTagInput} 
                      setInputValue={setGeneratedTagInput} 
                    />
                 </div>

                 <div className="flex-1 overflow-hidden">
                   <ReactQuill 
                     theme="snow" 
                     value={generatedDiary} 
                     onChange={setGeneratedDiary} 
                     modules={modules}
                     className="h-full"
                   />
                 </div>
                 
                 <div className="flex gap-3 mt-4 shrink-0">
                    <button 
                      onClick={() => setIsDiaryRerollPopupOpen(true)}
                      disabled={isGenerating}
                      className="flex-1 py-3 rounded-xl border border-cream-200 text-cream-700 hover:bg-cream-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={18} />
                      {t('write.generated.reroll')}
                    </button>
                    <button 
                      onClick={handleSaveDiary}
                      disabled={isGenerating}
                      className="flex-1 py-3 rounded-xl bg-cream-900 text-white hover:bg-cream-800 transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-cream-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      {t('write.generated.save')}
                    </button>
                 </div>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100">
                <h3 className="text-lg font-bold text-cream-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-cream-400" />
                  AI Persona Settings
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 text-cream-400 hover:bg-cream-50 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <AISettings />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Diary Reroll Instruction Popup */}
      <AnimatePresence>
        {isDiaryRerollPopupOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100">
                <h3 className="text-lg font-bold text-cream-900 flex items-center gap-2">
                  <RotateCcw size={18} className="text-cream-400" />
                  Regenerate Diary
                </h3>
                <button 
                  onClick={() => setIsDiaryRerollPopupOpen(false)}
                  className="p-2 text-cream-400 hover:bg-cream-50 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-cream-600 mb-3">
                  Optional: Provide specific instructions for this version (e.g., "Make it more poetic", "Focus on the morning").
                </p>
                <textarea
                  value={diaryRerollInstruction}
                  onChange={(e) => setDiaryRerollInstruction(e.target.value)}
                  placeholder="Optional instruction..."
                  className="w-full h-24 p-3 bg-cream-50 border border-cream-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-cream-200 text-cream-900 placeholder:text-cream-400"
                  autoFocus
                />
                
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    onClick={() => setIsDiaryRerollPopupOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-cream-600 hover:bg-cream-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      handleGenerateDiary(diaryRerollInstruction);
                      setIsDiaryRerollPopupOpen(false);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Regenerate
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
