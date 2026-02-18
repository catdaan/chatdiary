import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { db, STORES } from '../lib/db';

const DiaryContext = createContext({
  diaries: [],
  getDiaryByDate: (date) => {},
  addDiary: (diary) => {},
});

const MOCK_DIARIES = [
  {
    id: '1',
    date: format(new Date(), 'yyyy-MM-dd'),
    title: 'Start of a new journey',
    content: 'Today I decided to start keeping a diary with this AI app. The interface is so calming and beautiful.',
    mood: 'happy',
    comments: [
      { id: 'c1', author: 'ai', text: 'I am so glad you like it! Let us make many memories together.', date: new Date().toISOString() }
    ]
  },
  {
    id: '2',
    date: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), // Yesterday
    title: 'A quiet afternoon',
    content: 'Spent the afternoon reading in a coffee shop. The smell of roasted beans was everywhere.',
    mood: 'calm',
    comments: []
  },
  {
    id: '3',
    date: format(new Date(Date.now() - 86400000 * 3), 'yyyy-MM-dd'), // 3 days ago
    title: 'Rainy mood',
    content: 'It rained all day. Perfect weather for coding and listening to lo-fi beats.',
    mood: 'melancholic',
    comments: []
  }
];

export function DiaryProvider({ children }) {
  const [diaries, setDiaries] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Default Categories Data
  const DEFAULT_CATEGORIES_DATA = [
    { id: 'Daily Life', name: 'Daily Life', iconName: 'Coffee', color: 'bg-orange-100 text-orange-600' },
    { id: 'Work', name: 'Work', iconName: 'Briefcase', color: 'bg-blue-100 text-blue-600' },
    { id: 'Travel', name: 'Travel', iconName: 'Plane', color: 'bg-green-100 text-green-600' },
  ];

  const [customCategories, setCustomCategories] = useState([]);

  // Initialization: Load from DB or Migrate from LocalStorage
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Try to load from IndexedDB
        const storedDiaries = await db.getAll(STORES.DIARIES);
        const storedCategories = await db.getAll(STORES.CATEGORIES);
        
        // 2. Check if migration is needed (if DB is empty but LocalStorage has data)
        const hasDBData = storedDiaries.length > 0 || storedCategories.length > 0;
        const lsEntries = localStorage.getItem('chatdairy-entries');
        
        if (!hasDBData && lsEntries) {
          console.log("Migrating data from LocalStorage to IndexedDB...");
          
          // Migrate Diaries
          let parsedDiaries = [];
          try {
             parsedDiaries = JSON.parse(lsEntries);
             if (!Array.isArray(parsedDiaries)) parsedDiaries = MOCK_DIARIES;
          } catch {
             parsedDiaries = MOCK_DIARIES;
          }
          
          await db.putAll(STORES.DIARIES, parsedDiaries);
          setDiaries(parsedDiaries);
          
          // Migrate Categories
          const lsCategories = localStorage.getItem('chatdairy-categories');
          let parsedCategories = [];
          try {
             parsedCategories = JSON.parse(lsCategories) || [];
             // Apply old migration logic if needed
             if (parsedCategories.length > 0 && typeof parsedCategories[0] === 'string') {
                 parsedCategories = parsedCategories.map(name => ({ id: name, name, color: 'bg-indigo-100 text-indigo-600', iconName: 'Layers' }));
             }
             
             // Ensure defaults
             const hasDefaults = parsedCategories.some(c => c.name === 'Daily Life');
             if (!hasDefaults) {
                 parsedCategories = [...DEFAULT_CATEGORIES_DATA, ...parsedCategories];
             }
          } catch {
             parsedCategories = DEFAULT_CATEGORIES_DATA;
          }
          
          await db.putAll(STORES.CATEGORIES, parsedCategories);
          setCustomCategories(parsedCategories);
          
          // Mark migration done
          localStorage.removeItem('chatdairy-entries'); 
          localStorage.removeItem('chatdairy-categories');
          console.log("Migration completed and LocalStorage cleaned.");
          
        } else if (hasDBData) {
          // Load existing DB data
          setDiaries(storedDiaries);
          setCustomCategories(storedCategories);

          // Cleanup legacy LocalStorage if it exists (post-migration cleanup for existing users)
          if (localStorage.getItem('chatdairy-entries')) {
             localStorage.removeItem('chatdairy-entries');
             console.log("Cleaned up legacy chatdairy-entries from LocalStorage");
          }
          if (localStorage.getItem('chatdairy-categories')) {
             localStorage.removeItem('chatdairy-categories');
             console.log("Cleaned up legacy chatdairy-categories from LocalStorage");
          }
        } else {
          // New User: Initialize with Mocks/Defaults
          setDiaries(MOCK_DIARIES);
          setCustomCategories(DEFAULT_CATEGORIES_DATA);
          await db.putAll(STORES.DIARIES, MOCK_DIARIES);
          await db.putAll(STORES.CATEGORIES, DEFAULT_CATEGORIES_DATA);
        }
      } catch (error) {
        console.error("Failed to initialize database:", error);
        // Fallback to Mocks if everything fails
        setDiaries(MOCK_DIARIES);
        setCustomCategories(DEFAULT_CATEGORIES_DATA);
      } finally {
        setIsInitialized(true);
      }
    };
    
    init();
  }, []);

  // Persist Diaries to DB on change
  useEffect(() => {
    if (!isInitialized) return;
    const saveDiaries = async () => {
      try {
        // Optimization: In a real app, we should only save the changed item.
        // For now, to keep sync simple with state, we re-save all (or use put for specific items in add/update functions)
        // But `diaries` state is the source of truth for UI.
        // Let's rely on addDiary/updateDiary to update DB, but for safety (e.g. state drift), we can sync.
        // ACTUALLY: Writing all diaries every time is expensive in IDB if huge.
        // Better pattern: Update DB inside addDiary/updateDiary functions, and only use this effect for maybe backup?
        // Let's keep it simple for now but use putAll efficiently.
        // NOTE: To avoid blocking UI, we don't await this inside the effect strictly.
        await db.putAll(STORES.DIARIES, diaries);
      } catch (error) {
        console.error("Failed to save diaries to DB:", error);
      }
    };
    saveDiaries();
  }, [diaries, isInitialized]);

  // Persist Categories to DB on change
  useEffect(() => {
    if (!isInitialized) return;
    const saveCategories = async () => {
      try {
        await db.putAll(STORES.CATEGORIES, customCategories);
      } catch (error) {
        console.error("Failed to save categories to DB:", error);
      }
    };
    saveCategories();
  }, [customCategories, isInitialized]);

  const addCategory = (categoryData) => {
    // Handle both old signature (name, color) and new object signature
    let name, color, coverImage, iconName;
    if (typeof categoryData === 'string') {
        name = categoryData;
        color = arguments[1] || 'bg-indigo-100 text-indigo-600';
        coverImage = null;
        iconName = 'Layers';
    } else {
        ({ name, color = 'bg-indigo-100 text-indigo-600', coverImage = null, iconName = 'Layers' } = categoryData);
    }

    setCustomCategories(prev => {
      if (prev.some(c => c.name === name)) return prev;
      return [...prev, { id: name, name, color, coverImage, iconName }];
    });
  };

  const updateCategory = (originalName, updates) => {
    // updates can be { name, color, coverImage }
    // or old signature: newName, newColor
    let newName, newColor, newCoverImage;
    
    if (typeof updates === 'string') {
        newName = updates;
        newColor = arguments[2];
        newCoverImage = undefined;
    } else {
        ({ name: newName, color: newColor, coverImage: newCoverImage } = updates);
    }

    setCustomCategories(prev => prev.map(c => {
        if (c.name === originalName) {
            return { 
                ...c, 
                name: newName || c.name, 
                id: newName || c.id, 
                color: newColor || c.color,
                coverImage: newCoverImage !== undefined ? newCoverImage : c.coverImage
            };
        }
        return c;
    }));
    
    // Also update diaries that used this category
    if (newName && originalName !== newName) {
        setDiaries(prev => prev.map(d => {
            if (d.category === originalName) {
                return { ...d, category: newName };
            }
            return d;
        }));
    }
  };

  const deleteCategory = (name) => {
    setCustomCategories(prev => prev.filter(c => c.name !== name));
  };

  const getDiaryByDate = (dateString) => {
    return diaries.find(d => d.date === dateString);
  };

  const getDiariesByDate = (dateString) => {
    return diaries.filter(d => d.date === dateString);
  };

  const getDiaryById = (id) => {
    return diaries.find(d => d.id === id);
  };

  const addDiary = (newDiary) => {
    setDiaries(prev => {
      // Just append the new diary, allowing multiple per day
      // Ensure comments array exists
      const updatedDiaries = [...prev, { 
        ...newDiary, 
        createdAt: newDiary.createdAt || new Date().toISOString(),
        comments: newDiary.comments || [],
        chatHistory: newDiary.chatHistory || [] 
      }];
      return updatedDiaries;
    });
  };

  const updateDiary = (id, updates) => {
    setDiaries(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDiary = (id) => {
    setDiaries(prev => prev.filter(d => d.id !== id));
  };

  const deleteChatHistory = (id) => {
    setDiaries(prev => prev.map(d => {
      if (d.id === id) {
        const { chatHistory, ...rest } = d;
        return rest;
      }
      return d;
    }));
  };

  const addComment = (id, comment) => {
    setDiaries(prev => prev.map(d => {
      if (d.id === id) {
        const comments = d.comments || [];
        return { ...d, comments: [...comments, { ...comment, id: Date.now().toString(), date: new Date().toISOString() }] };
      }
      return d;
    }));
  };

  const deleteComment = (diaryId, commentId) => {
    setDiaries(prev => prev.map(d => {
      if (d.id === diaryId && d.comments) {
        return {
          ...d,
          comments: d.comments.filter(c => c.id !== commentId)
        };
      }
      return d;
    }));
  };

  return (
    <DiaryContext.Provider value={{ 
      diaries, 
      getDiaryByDate, 
      getDiariesByDate, 
      getDiaryById, 
      addDiary, 
      updateDiary, 
      deleteDiary,
      deleteChatHistory,
      addComment,
      deleteComment,
      customCategories,
      addCategory,
      updateCategory,
      deleteCategory
    }}>
      {children}
    </DiaryContext.Provider>
  );
}

export const useDiary = () => useContext(DiaryContext);
