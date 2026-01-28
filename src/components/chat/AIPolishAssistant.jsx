import React, { useState, useEffect, useRef } from 'react';
import { X, Wand2, RefreshCw, MessageSquare, RotateCcw } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function AIPolishAssistant({ isOpen, onClose, currentContent, onPreview, messages, setMessages }) {
  const { t } = useTranslation();
  const { polishDiary, isTyping, currentPersona } = useAI();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Initialize with greeting if empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { id: 'init', role: 'assistant', content: t('write.polish.greeting') }
      ]);
    }
  }, [isOpen, messages.length, setMessages, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (text = input) => {
    if (!text.trim() || isProcessing) return;
    
    const newMsg = { id: Date.now(), role: 'user', content: text };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInput('');
    // Fix for iOS voice input ghost text
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setIsProcessing(true);

    try {
        // Construct history for AI
        const apiHistory = updatedMessages
            .filter(m => m.id !== 'init')
            .map(m => ({ role: m.role, content: m.content }));
        
        // Inject context
        const contextMessage = { 
            role: 'user', 
            content: `Here is my current diary draft:\n\n"${currentContent}"\n\n(Please use this as the context for my requests)` 
        };
        
        const finalHistory = [contextMessage, ...apiHistory];
        
        const response = await polishDiary(finalHistory);
        
        const aiMsg = { id: Date.now() + 1, role: 'assistant', content: response };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: t('write.polish.error') }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOneClickPolish = () => {
    handleSend("Please polish this diary entry to make it flow better and correct any mistakes.");
  };

  const handleReroll = async () => {
    if (isProcessing) return;
    
    // Find the last assistant message to remove
    const lastMsgIndex = messages.length - 1;
    const lastMsg = messages[lastMsgIndex];
    
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.id === 'init') return;
    
    // Remove the last assistant message
    const newMessages = messages.slice(0, -1);
    setMessages(newMessages);
    setIsProcessing(true);
    
    try {
        // Construct history from the new state (without the last AI response)
        const apiHistory = newMessages
            .filter(m => m.id !== 'init')
            .map(m => ({ role: m.role, content: m.content }));
        
        // Inject context (same as handleSend)
        const contextMessage = { 
            role: 'user', 
            content: `Here is my current diary draft:\n\n"${currentContent}"\n\n(Please use this as the context for my requests)` 
        };
        
        const finalHistory = [contextMessage, ...apiHistory];
        
        const response = await polishDiary(finalHistory);
        
        const aiMsg = { id: Date.now() + 1, role: 'assistant', content: response };
        setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: t('write.polish.errorReroll') }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const extractPolishedData = (text) => {
    // Helper to extract content from tags
    const getTagContent = (tagName) => {
      const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`);
      const match = text.match(regex);
      return match ? match[1].trim() : null;
    };

    // Support both old <polished> and new <content> tags for backward compatibility
    const content = getTagContent('content') || getTagContent('polished');
    const title = getTagContent('title');
    const tagsStr = getTagContent('tags');
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null;

    if (!content && !title && !tags) return null;

    return { content, title, tags };
  };

  const cleanTextForDisplay = (text) => {
    // Remove all XML tags for display
    return text
      .replace(/<content>[\s\S]*?<\/content>/g, '')
      .replace(/<polished>[\s\S]*?<\/polished>/g, '')
      .replace(/<title>[\s\S]*?<\/title>/g, '')
      .replace(/<tags>[\s\S]*?<\/tags>/g, '')
      .trim();
  };

  const renderMarkdownContent = (text) => {
    // We only need to parse **bold** manually
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return (
      <div className="whitespace-pre-wrap">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </div>
    );
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-cream-200 z-50 flex flex-col overflow-hidden font-sans"
    >
        {/* Header */}
        <div className="p-4 border-b border-cream-100 flex items-center justify-between bg-cream-50/50">
            <div className="flex items-center gap-2 text-cream-900 font-semibold">
                <Wand2 size={18} className="text-amber-500" />
                <span>{currentPersona?.name || t('write.polish.defaultName')}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-cream-200/50 rounded-full transition-colors text-cream-600">
                <X size={18} />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream-50/30 custom-scrollbar">
            {messages.map((msg, index) => {
                const polishedData = msg.role === 'assistant' ? extractPolishedData(msg.content) : null;
                const rawText = msg.role === 'assistant' ? cleanTextForDisplay(msg.content) : msg.content;
                // Split by double newlines to get paragraphs, filter out empty ones
                const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim());
                if (paragraphs.length === 0 && rawText.trim()) paragraphs.push(rawText);
                
                return (
                <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                    {paragraphs.map((paragraph, pIndex) => (
                        <div key={pIndex} className={cn(
                            "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                            msg.role === 'user' 
                                ? "bg-cream-900 text-white rounded-tr-none" 
                                : "bg-white text-cream-900 border border-cream-200 rounded-tl-none",
                             // Add margin top for subsequent paragraphs if needed, though flex gap handles it
                        )}>
                            <div className="whitespace-pre-wrap">
                                {msg.role === 'assistant' 
                                    ? renderMarkdownContent(paragraph)
                                    : paragraph}
                            </div>
                        </div>
                    ))}
                    
                    {/* Metadata Preview inside chat */}
                    {msg.role === 'assistant' && polishedData && (
                        <div className="flex flex-col gap-1.5 mt-1 ml-1 mb-1">
                            {polishedData.title && (
                                <div className="flex items-start gap-2 text-xs text-cream-700">
                                    <span className="bg-cream-200/50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-cream-600 mt-0.5 shrink-0">{t('write.polish.title')}</span>
                                    <span className="font-medium bg-white px-2 py-1 rounded-md border border-cream-100 shadow-sm">{polishedData.title}</span>
                                </div>
                            )}
                            {polishedData.tags && (
                                <div className="flex items-start gap-2 text-xs text-cream-700">
                                    <span className="bg-cream-200/50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-cream-600 mt-0.5 shrink-0">{t('write.polish.tags')}</span>
                                    <div className="flex flex-wrap gap-1">
                                        {polishedData.tags.map(t => (
                                            <span key={t} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[10px]">#{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {polishedData.content && (
                                <div className="flex items-start gap-2 text-xs text-cream-700">
                                    <span className="bg-cream-200/50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold text-cream-600 mt-0.5 shrink-0">{t('write.polish.content')}</span>
                                    <span className="italic text-cream-500 py-0.5">{t('write.polish.polishedAvailable')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {msg.role === 'assistant' && msg.id !== 'init' && (
                        <div className="flex items-center gap-2 mt-1">
                            {polishedData && (
                                <button 
                                    onClick={() => onPreview(polishedData)}
                                    className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium px-1 bg-amber-50/50 py-1 rounded-md border border-amber-100/50 hover:bg-amber-100 transition-colors"
                                >
                                    <RefreshCw size={10} />
                                    {t('write.polish.compareApply')}
                                </button>
                            )}
                            {/* Reroll button for the latest assistant message */}
                            {index === messages.length - 1 && !isProcessing && (
                                <button
                                    onClick={handleReroll}
                                    className="text-xs flex items-center gap-1 text-cream-500 hover:text-cream-700 font-medium px-1 py-1 rounded-md hover:bg-cream-100 transition-colors"
                                    title={t('write.polish.reroll')}
                                >
                                    <RotateCcw size={10} />
                                    {t('write.polish.reroll')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            );})}
            {isProcessing && (
                <div className="mr-auto items-start max-w-[85%]">
                     <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-cream-200 shadow-sm flex gap-1">
                        <span className="w-1.5 h-1.5 bg-cream-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-cream-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-cream-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                     </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cream-100 bg-white">
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                    onClick={handleOneClickPolish}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-full text-xs font-medium border border-amber-200 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                    <Wand2 size={12} />
                    {t('write.polish.oneClick')}
                </button>
                <button 
                     onClick={() => handleSend("Make it more emotional")}
                     disabled={isProcessing}
                     className="px-3 py-1.5 bg-cream-50 text-cream-700 hover:bg-cream-100 rounded-full text-xs font-medium border border-cream-200 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                    {t('write.polish.emotional')}
                </button>
                <button 
                     onClick={() => handleSend("Fix grammar only")}
                     disabled={isProcessing}
                     className="px-3 py-1.5 bg-cream-50 text-cream-700 hover:bg-cream-100 rounded-full text-xs font-medium border border-cream-200 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                    {t('write.polish.grammar')}
                </button>
            </div>
            
            <div className="flex items-center gap-2 bg-cream-50 p-2 rounded-xl border border-cream-200 focus-within:border-cream-400 transition-colors">
                <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t('write.polish.placeholder')}
                    disabled={isProcessing}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-cream-900 placeholder:text-cream-400"
                />
                <button 
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isProcessing}
                    className="p-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path></svg>
                </button>
            </div>
        </div>
    </motion.div>
  );
}
