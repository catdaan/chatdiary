import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';

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
  const [diaries, setDiaries] = useState(() => {
    try {
      const saved = localStorage.getItem('chatdairy-entries');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : MOCK_DIARIES;
    } catch (e) {
      console.error("Failed to parse chatdairy-entries:", e);
      return MOCK_DIARIES;
    }
  });

  // Default Categories Data
  const DEFAULT_CATEGORIES_DATA = [
    { id: 'Daily Life', name: 'Daily Life', iconName: 'Coffee', color: 'bg-orange-100 text-orange-600' },
    { id: 'Work', name: 'Work', iconName: 'Briefcase', color: 'bg-blue-100 text-blue-600' },
    { id: 'Travel', name: 'Travel', iconName: 'Plane', color: 'bg-green-100 text-green-600' },
  ];

  // Custom Categories State (Now stores objects { id, name, color, coverImage, iconName })
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('chatdairy-categories');
      const initialized = localStorage.getItem('chatdairy-categories-initialized');
      
      let parsed = saved ? JSON.parse(saved) : [];
      
      if (!initialized) {
          // Migration 1: if stored as array of strings, convert to objects
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
              parsed = parsed.map(name => ({ id: name, name, color: 'bg-indigo-100 text-indigo-600', iconName: 'Layers' }));
          }
    
          // Migration 2: Ensure defaults exist (Migration from hardcoded defaults to persisted state)
          // Only do this if we haven't initialized before
          const hasDefaults = parsed.some(c => c.name === 'Daily Life');
          if (!hasDefaults) {
              // Merge defaults at the beginning
              parsed = [...DEFAULT_CATEGORIES_DATA, ...parsed];
          }
          
          // Mark as initialized
          localStorage.setItem('chatdairy-categories-initialized', 'true');
      }
      
      return parsed;
    } catch (e) {
      return DEFAULT_CATEGORIES_DATA;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('chatdairy-entries', JSON.stringify(diaries));
    } catch (error) {
      console.error("Failed to save diaries to localStorage:", error);
      if (error.name === 'QuotaExceededError') {
        alert("Storage is full! Failed to save diary. Please clear some data.");
      }
    }
  }, [diaries]);

  useEffect(() => {
    localStorage.setItem('chatdairy-categories', JSON.stringify(customCategories));
  }, [customCategories]);

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
