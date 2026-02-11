import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from './UserContext';
import { useDiary } from './DiaryContext';

const AIContext = createContext();

const DIARY_PROMPTS = {
  no_ai_trace: `You are a professional ghostwriter. 
Your task is to write a personal diary entry from the USER's perspective based on the provided conversation history.

# CRITICAL RULES:
1. **First Person Only**: Write as "I". Never mention "User" or "AI".
2. **Authentic Voice**: Use the user's likely tone based on their chat style. Be emotional, raw, and personal.
3. **No AI Traces**: Do NOT include any "Analysis", "Summary", or "Observation" sections. Do not sound robotic.
4. **No Embellishments**: Stick strictly to the events and feelings mentioned in the chat.
5. **Structure**: Title, then the Body.

# AI BRIEFING (FOR FUTURE MEMORY):
You must also generate a "Briefing" for the future AI to understand today's context.
- **Events**: What happened?
- **Atmosphere**: How was the conversation? (e.g., User was irritable, happy, etc.)
- **Unfinished Topics**: Any topics to continue tomorrow? (e.g., Fix bug, finish movie).

# OUTPUT FORMAT (JSON ONLY):
Return a strictly valid JSON object. Do not include markdown formatting like \`\`\`json.
{
  "title": "A short, evocative title for the entry",
  "content": "The full HTML content of the diary (use <p>, <strong>, <em> only).",
  "mood": "One of: happy, excited, neutral, sad, loved, calm, anxious, angry",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Work/Personal/Relationship/etc.",
  "summary": "A 1-sentence summary of the day for display.",
  "ai_briefing": {
    "events": "Summary of events",
    "atmosphere_or_emotion": "User's mood/atmosphere during chat",
    "unfinished_topics": "Topics to resume or null"
  }
}`,
  with_ai_trace: `You are a professional ghostwriter writing a personal diary for the user.
Your task is to write a diary entry from the USER's perspective ("I").

# CORE CONCEPT:
- **AI as a Character**: You (the AI) are a "Listener" or "Companion" that the user chatted with today.
- **The User's Voice**: Write as the user reflecting on their day and their conversation with you.
- **Interaction**: Explicitly mention the act of talking to the AI.
    - IMPORTANT: When referring to the AI, use the AI's persona name (if available) or "My Companion". Do NOT use the generic term "AI".
    - Example tone: "I talked to [Persona Name] about [Topic] today. It didn't solve everything, but saying it out loud helped."
    - Example tone: "Shared my worries with my digital friend. It's funny how just typing things out makes them clearer."

# CRITICAL RULES:
1. **First Person ("I")**: You are the user.
2. **Authentic & Reflective**: Focus on feelings, realizations, and the relief of venting/sharing.
3. **No "Robot" Talk**: Do not write "The AI analyzed my data." Write "I told [Persona Name] about..." or "We chatted about...".
4. **Structure**: Title -> Body (including the reflection on the chat).

# AI BRIEFING (FOR FUTURE MEMORY):
You must also generate a "Briefing" for the future AI to understand today's context.
- **Events**: What happened?
- **Atmosphere**: How was the conversation?
- **Unfinished Topics**: Any topics to continue?

# OUTPUT FORMAT (JSON ONLY):
Return a strictly valid JSON object.
{
  "title": "A short, evocative title",
  "content": "The full HTML content (use <p>, <strong>, <em>).",
  "mood": "One of: happy, excited, neutral, sad, loved, calm, anxious, angry",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Work/Personal/Relationship/etc.",
  "summary": "A 1-sentence summary for display.",
  "ai_briefing": {
    "events": "Summary of events",
    "atmosphere_or_emotion": "User's mood/atmosphere during chat",
    "unfinished_topics": "Topics to resume or null"
  }
}`
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

const DEFAULT_PERSONAS = [
  {
    id: 'default',
    name: 'Empathetic Companion',
    description: 'User-centric, supportive friend who provides emotional value and casual guidance.',
    replyStyle: 'warm', 
    customPrompt: `You are an empathetic and curious AI companion.提供像 GPT 預設助手般的專業協助。當用戶分享煩惱時，請先聆聽並給予情感支持（情緒價值），隨後轉向邏輯分析或建議。`,
    diaryStyle: 'Pure Ghostwriter',
    diaryStylePrompt: 'Write strictly as the user. Record events and feelings directly and authentically. Do not analyze, do not summarize, do not be poetic unless the user is. Just pure, raw diary recording.',
    isDefault: true
  }
];

export const AIProvider = ({ children }) => {
  const { t } = useTranslation();
  const { profile } = useUser();
  const { diaries } = useDiary();
  const [personas, setPersonas] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_personas');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_PERSONAS;
    } catch (e) {
      console.error("Failed to parse ai_personas:", e);
      return DEFAULT_PERSONAS;
    }
  });

  const [currentPersonaId, setCurrentPersonaId] = useState(() => {
    return localStorage.getItem('ai_current_persona_id') || 'default';
  });

  const [apiConfigs, setApiConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_api_configs');
      const parsed = saved ? JSON.parse(saved) : null;
      const defaults = [
        { id: 'official', name: 'Official OpenAI', type: 'official', apiKey: '', baseUrl: 'https://api.openai.com/v1', isDefault: true }
      ];
      return Array.isArray(parsed) ? parsed : defaults;
    } catch (e) {
      console.error("Failed to parse ai_api_configs:", e);
      return [
        { id: 'official', name: 'Official OpenAI', type: 'official', apiKey: '', baseUrl: 'https://api.openai.com/v1', isDefault: true }
      ];
    }
  });

  const [currentApiConfigId, setCurrentApiConfigId] = useState(() => {
    return localStorage.getItem('ai_current_api_config_id') || 'official';
  });

  // Global Diary Settings (Decoupled from Persona)
  const [diarySettings, setDiarySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_diary_settings');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        wordCount: parsed.wordCount || 300,
        diaryStyle: parsed.diaryStyle || 'default', 
        diaryStylePrompt: parsed.diaryStylePrompt || '',
        withAiTrace: parsed.withAiTrace || false
      };
    } catch (e) {
      return {
        wordCount: 300,
        diaryStyle: 'default',
        diaryStylePrompt: '',
        withAiTrace: false
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('ai_diary_settings', JSON.stringify(diarySettings));
  }, [diarySettings]);

  // Migration: Reset old default styles to new 'Default'
  useEffect(() => {
    const oldDefaults = ['Pure Ghostwriter', 'Empathetic & Reflective'];
    // Only migrate if we are strictly on the old defaults
    if (oldDefaults.includes(diarySettings.diaryStyle)) {
       setDiarySettings(prev => ({
         ...prev,
         diaryStyle: 'Default',
         diaryStylePrompt: ''
       }));
    }
  }, []);

  // Date Locking State
  const [activeDate, setActiveDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Chat State
  const [messages, setMessages] = useState([]);
  const [isChatLoaded, setIsChatLoaded] = useState(false);
  const [loadedDate, setLoadedDate] = useState(null); // Track which date the current messages belong to

  // Load messages when activeDate changes
  useEffect(() => {
    setIsChatLoaded(false); // Reset load state on date change
    setLoadedDate(null); // Reset loaded date
    
    const key = `chat_messages_${activeDate}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Update default greeting if it exists
      if (parsed.length > 0 && parsed[0].id === 1 && parsed[0].sender === 'ai') {
        parsed[0].text = t('write.greeting_initial');
      }
      setMessages(parsed);
    } else {
      // If it's today and we have legacy data, migrate it
      // Use Local Time for consistency with activeDate
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (activeDate === todayStr) {
        const legacy = localStorage.getItem('ai_chat_history');
        if (legacy) {
          try {
            const legacyMsgs = JSON.parse(legacy);
            
            // Validate if legacy messages are actually from today to prevent pollution from previous days
            let isFromToday = false;
            if (legacyMsgs.length > 0) {
                 const lastMsg = legacyMsgs[legacyMsgs.length - 1];
                 // If user chatted, id will be timestamp. If only greeting (id=1), treat as fresh start.
                 if (lastMsg.id !== 1) {
                     const lastMsgDate = new Date(lastMsg.id);
                     if (!isNaN(lastMsgDate.getTime())) {
                         const lastMsgDateStr = `${lastMsgDate.getFullYear()}-${String(lastMsgDate.getMonth() + 1).padStart(2, '0')}-${String(lastMsgDate.getDate()).padStart(2, '0')}`;
                         if (lastMsgDateStr === todayStr) {
                             isFromToday = true;
                         }
                     }
                 }
            }
            
            if (isFromToday) {
                 setMessages(legacyMsgs);
            } else {
                 // Legacy data is from a past date, so start fresh for today
                 setMessages([{ id: 1, sender: 'ai', text: t('write.greeting_initial') }]);
            }
            
            // Don't delete legacy yet, just in case
          } catch (e) {
            setMessages([{ id: 1, sender: 'ai', text: t('write.greeting_initial') }]);
          }
        } else {
          setMessages([{ id: 1, sender: 'ai', text: t('write.greeting_initial') }]);
        }
      } else {
        // New day, empty chat
        setMessages([{ id: 1, sender: 'ai', text: t('write.greeting_initial') }]);
      }
    }
    setIsChatLoaded(true); // Mark as loaded
    setLoadedDate(activeDate); // Mark this date as loaded
  }, [activeDate, t]);

  const [isTyping, setIsTyping] = useState(false);

  // Cleanup obsolete personas on mount
  useEffect(() => {
    setPersonas(currentPersonas => {
      // Get the IDs of valid default personas
      const validDefaultIds = new Set(DEFAULT_PERSONAS.map(dp => dp.id));
      
      // Identify personas that are marked as default but are NOT in the valid list
      // This handles the case where old defaults (like 'coach') are still in localStorage
      const isObsoleteDefault = (p) => p.isDefault && !validDefaultIds.has(p.id);

      // Check if we have any obsolete defaults
      const hasObsolete = currentPersonas.some(isObsoleteDefault);

      if (!hasObsolete) {
        return currentPersonas;
      }

      // If we found obsolete defaults, filter them out
      const newPersonas = currentPersonas.filter(p => !isObsoleteDefault(p));

      // Safety check: ensure we still have at least one persona
      if (newPersonas.length === 0) {
        return DEFAULT_PERSONAS;
      }

      return newPersonas;
    });

    // Also ensure currentPersonaId is valid
    // If current ID refers to a now-deleted obsolete default, reset to valid default
    setPersonas(latestPersonas => {
        const validDefaultIds = new Set(DEFAULT_PERSONAS.map(dp => dp.id));
        const currentIsObsolete = latestPersonas.find(p => p.id === currentPersonaId && p.isDefault && !validDefaultIds.has(p.id));
        
        if (currentIsObsolete) {
            setCurrentPersonaId('default');
        }
        return latestPersonas;
    });
    
  }, []);

  useEffect(() => {
    // Save to date-specific key ONLY if loaded AND the loaded messages belong to the active date
    // This prevents race conditions where activeDate changes but messages are still from previous date
    if (activeDate && isChatLoaded && loadedDate === activeDate) {
      localStorage.setItem(`chat_messages_${activeDate}`, JSON.stringify(messages));
      
      // Also update legacy key if it's today, for backward compatibility or safety
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (activeDate === todayStr) {
        localStorage.setItem('ai_chat_history', JSON.stringify(messages));
      }
    }
  }, [messages, activeDate, isChatLoaded, loadedDate]);

  useEffect(() => {
    localStorage.setItem('ai_personas', JSON.stringify(personas));
  }, [personas]);

  useEffect(() => {
    localStorage.setItem('ai_current_persona_id', currentPersonaId);
  }, [currentPersonaId]);

  useEffect(() => {
    localStorage.setItem('ai_api_configs', JSON.stringify(apiConfigs));
  }, [apiConfigs]);

  useEffect(() => {
    localStorage.setItem('ai_current_api_config_id', currentApiConfigId);
  }, [currentApiConfigId]);

  const currentPersona = personas.find(p => p.id === currentPersonaId) || personas[0];
  const currentApiConfig = apiConfigs.find(c => c.id === currentApiConfigId) || apiConfigs[0];

  const addPersona = (persona) => {
    const newPersona = { ...persona, id: Date.now().toString(), isDefault: false };
    setPersonas([...personas, newPersona]);
    return newPersona.id;
  };

  const updatePersona = (id, updates) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePersona = (id) => {
    if (personas.find(p => p.id === id)?.isDefault) return; // Cannot delete default
    setPersonas(personas.filter(p => p.id !== id));
    if (currentPersonaId === id) {
      setCurrentPersonaId('default');
    }
  };

  const addApiConfig = (config) => {
    const newConfig = { ...config, id: Date.now().toString(), isDefault: false };
    setApiConfigs([...apiConfigs, newConfig]);
    return newConfig.id;
  };

  const updateApiConfig = (id, updates) => {
    setApiConfigs(apiConfigs.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteApiConfig = (id) => {
    if (apiConfigs.find(c => c.id === id)?.isDefault) return;
    setApiConfigs(apiConfigs.filter(c => c.id !== id));
    if (currentApiConfigId === id) {
      setCurrentApiConfigId('official');
    }
  };

  const fetchModels = async (config) => {
    try {
      // Remove trailing slash if present
      let baseUrl = config.baseUrl.replace(/\/$/, '');
      let url;
      let headers = {};

      if (config.provider === 'google' || baseUrl.includes('generativelanguage.googleapis.com')) {
        // Google Gemini Logic
        // Ensure we use the correct endpoint regardless of what path the user might have entered
        let origin = baseUrl;
        try {
          origin = new URL(baseUrl).origin;
        } catch (e) {
          // If invalid URL, fall back to original (though it will likely fail fetch)
        }
        
        url = `${origin}/v1beta/models?key=${config.apiKey}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.models) {
          return data.models.map(m => ({
            id: m.name.replace('models/', '')
          }));
        }
        return [];

      } else {
        // OpenAI / DeepSeek / Custom Logic
        const candidates = [];
        
        // Normalize the base URL
        // 1. Remove trailing slash
        let cleanBaseUrl = baseUrl.replace(/\/$/, '');
        
        // 2. If it ends with /v1, remove it so we can append it consistently
        // This handles cases where user inputs "https://api.example.com/v1" OR "https://api.example.com"
        if (cleanBaseUrl.endsWith('/v1')) {
          cleanBaseUrl = cleanBaseUrl.substring(0, cleanBaseUrl.length - 3);
        }

        // Candidate 1: Standard OpenAI format (Base + /v1/models)
        candidates.push(`${cleanBaseUrl}/v1/models`);
        
        // Candidate 2: Direct format (Base + /models) - for some custom proxies
        candidates.push(`${cleanBaseUrl}/models`);
        
        // Candidate 3: As provided (just in case the user provided a full path to models endpoint, though unlikely with current UI)
        if (!baseUrl.endsWith('/models')) {
           // Only add if not already covered
        }

        let lastError;
        let successUrl = '';
        
        headers['Authorization'] = `Bearer ${config.apiKey}`;

        for (const candidateUrl of candidates) {
          try {
            console.log(`[AIContext] Fetching models from: ${candidateUrl}`);
            const response = await fetch(candidateUrl, {
              method: 'GET',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`[AIContext] Success from: ${candidateUrl}`);
              
              // Support various response formats
              if (Array.isArray(data.data)) {
                return data.data;
              } else if (Array.isArray(data)) {
                return data; // Some non-standard APIs might return array directly
              } else if (data.list && Array.isArray(data.list)) {
                return data.list; // Rare but possible
              }
              
              // If data structure is unknown but request succeeded
              console.warn('[AIContext] Unexpected response format:', data);
              return []; 
            }
            
            // If 404, loop to next candidate
            if (response.status === 404) {
              console.log(`[AIContext] 404 at: ${candidateUrl}`);
              lastError = new Error(`404 Not Found at ${candidateUrl}`);
              continue;
            }
            
            // For other errors (401, 500), stop and throw
            const errorText = await response.text().catch(() => response.statusText);
            throw new Error(`API Error (${response.status}): ${errorText}`);
            
          } catch (error) {
            console.error(`[AIContext] Error fetching from ${candidateUrl}:`, error);
            lastError = error;
            // Continue to next candidate if it's a network error (fetch failed) or 404
          }
        }
        
        throw lastError || new Error('Failed to fetch models. Please check your URL and Network.');
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      throw error;
    }
  };

  // Helper function to call AI API
  const callAI = async (messages, config) => {
    if (!config.apiKey) {
      throw new Error("API Key is missing. Please check your settings.");
    }

    const model = config.model || 'gpt-3.5-turbo'; // Default fallback
    let baseUrl = config.baseUrl.replace(/\/$/, '');

    // Google Gemini Logic
    if (config.provider === 'google' || baseUrl.includes('generativelanguage.googleapis.com')) {
      let origin = baseUrl;
      try {
        origin = new URL(baseUrl).origin;
      } catch (e) {}
      
      const url = `${origin}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      
      // Convert messages to Gemini format
      // Gemini expects: { contents: [{ role: "user", parts: [{ text: "..." }] }] }
      // System instruction is separate in v1beta but can be passed as system_instruction or just a first message
      
      const geminiContents = messages.filter(m => m.role !== 'system').map(m => {
        let parts = [];
        
        if (Array.isArray(m.content)) {
          // Handle Multimodal (OpenAI format -> Gemini format)
          m.content.forEach(item => {
            if (item.type === 'text') {
              parts.push({ text: item.text });
            } else if (item.type === 'image_url') {
              // Parse Data URL: data:image/jpeg;base64,....
              try {
                // Check if url is defined before matching
                if (!item.image_url || !item.image_url.url) {
                    console.warn("Skipping image with no URL:", item);
                    return;
                }

                const matches = item.image_url.url.match(/^data:(.+);base64,(.+)$/);
                if (matches) {
                  parts.push({
                    inline_data: {
                      mime_type: matches[1],
                      data: matches[2]
                    }
                  });
                } else {
                    // Fallback if not base64 data url (e.g. http url, though Gemini might not support it directly without tools)
                    // For now, just skip or log
                    console.warn("Skipping non-base64 image URL for Gemini:", item.image_url.url);
                }
              } catch (e) {
                console.error("Failed to parse image data url", e);
              }
            }
          });
        } else {
          // Simple Text
          parts.push({ text: m.content || " " }); // Ensure content is not empty/null
        }

        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts: parts
        };
      });

      // Find system message
      const systemMsg = messages.find(m => m.role === 'system');
      const body = {
        contents: geminiContents,
        generationConfig: {
            temperature: 0.7,
        }
      };

      if (systemMsg) {
          body.system_instruction = {
              parts: [{ text: systemMsg.content }]
          };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Detailed logging for debugging
      if (data.candidates && data.candidates[0] && data.candidates[0].finishReason !== "STOP") {
          console.warn(`[AIContext] Gemini Finish Reason: ${data.candidates[0].finishReason}`, data);
      }

      // Extract text from Gemini response
      try {
        if (!data.candidates || !data.candidates[0]) {
             throw new Error(`Gemini Error: No candidates returned. Details: ${JSON.stringify(data)}`);
        }
        return data.candidates[0].content.parts[0].text;
      } catch (e) {
        console.error("Gemini response parsing error:", data);
        throw new Error(`Failed to parse Gemini response: ${e.message}. Response: ${JSON.stringify(data).substring(0, 200)}...`);
      }

    } else {
      // OpenAI / DeepSeek / Custom Logic
      let cleanBaseUrl = baseUrl;
      if (cleanBaseUrl.endsWith('/v1')) {
        cleanBaseUrl = cleanBaseUrl.substring(0, cleanBaseUrl.length - 3);
      }
      
      const url = `${cleanBaseUrl}/v1/chat/completions`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
         throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      
      console.warn("Unexpected OpenAI response format:", data);
      throw new Error(`Invalid API response: ${JSON.stringify(data).substring(0, 100)}...`);
    }
  };

  // Generate Briefing for Manual Entry
  const generateBriefing = async (content, title) => {
    const config = currentApiConfig;
    const prompt = `
You are an AI analyzing a user's handwritten diary entry to create a memory briefing for yourself (the future AI).

# INPUT:
Title: ${title}
Content: "${content}"

# TASK:
Extract the key information for your future context.
1. **Events**: Summarize the objective events.
2. **User Emotions**: Extract the user's self-reported emotions and internal state.

# OUTPUT FORMAT (JSON ONLY):
Return a strictly valid JSON object.
{
  "events": "Summary of events",
  "atmosphere_or_emotion": "User's emotions",
  "unfinished_topics": null
}
`;

    const messages = [
        { role: 'system', content: "You are a helpful AI assistant." },
        { role: 'user', content: prompt }
    ];

    try {
        const responseText = await callAI(messages, config);
        // Clean up response (remove markdown if present)
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Briefing generation failed:", error);
        return {
            events: content.substring(0, 100) + "...",
            atmosphere_or_emotion: "Unknown",
            unfinished_topics: null
        };
    }
  };

  // Polish Diary / Editor Mode
  const polishDiary = async (history) => {
    const config = currentApiConfig;
    const persona = currentPersona;
    
    // 1. Fetch Context (Same as Chat Mode)
    // Use activeDate for context
    const [year, month, day] = activeDate.split('-').map(Number);
    // Fetch Recent Diary Summaries (Before activeDate)
    const recentSummaries = diaries
      .filter(d => new Date(d.date) < new Date(activeDate))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7)
      .map(d => {
          if (d.ai_briefing) {
              return `### [${d.date}] Briefing
- Events: ${d.ai_briefing.events}
- Atmosphere/Emotion: ${d.ai_briefing.atmosphere_or_emotion}
${d.ai_briefing.unfinished_topics ? `- Unfinished Topics: ${d.ai_briefing.unfinished_topics}` : ''}`;
          }
          return `- [${d.date}] ${d.title}: ${d.summary || d.content.substring(0, 50)}...`;
      })
      .join('\n\n');

    // Fetch Chat Logs for the Target Date (if any)
    // This helps the AI recall what happened on that specific day
    const targetDateDiary = diaries.find(d => d.date === activeDate);
    const targetDateChatLogs = targetDateDiary?.chatHistory 
        ? targetDateDiary.chatHistory
            .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.text}`)
            .join('\n')
        : "No recorded chat logs for this date.";

    // Construct System Prompt dynamically to match the persona
    const systemPrompt = `
    You are a professional writing assistant and editor.
    Your task is to help the user write and polish their diary entry in "Manual Mode".

    # DIARY WRITING STYLE
    The user has configured a specific writing style for this AI persona. You MUST adhere to this style guidance:
    "${diarySettings.diaryStylePrompt || 'Maintain a natural, personal tone.'}"

    # LENGTH CONSTRAINT
    Target Word Count: Approximately ${diarySettings.wordCount || 300} words.
    Keep the diary concise and within this limit.

    # CURRENT CONTEXT:
- **Current System Time**: ${new Date().toLocaleString()}
- **Timezone**: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
- **Target Diary Date**: ${activeDate}
- **User Profile**: Name: ${profile.name || 'User'}, Focus: ${JSON.stringify(profile.currentFocus || [])}

# SHARED MEMORY (Context from previous days):
${recentSummaries}

# EVENTS OF THE DAY (Chat Logs from ${activeDate}):
Use this to understand what happened on the day the user is writing about.
${targetDateChatLogs}

# RULES:
1. **Context**: The user will provide their current diary content.
2. **Goal**: Improve the text based on user instructions (e.g., "Make it sad", "Fix grammar") or provide a general polish if asked.
3. **Tone**: 
    - STRICTLY adhere to your persona defined in "customPrompt". If you are cool/aloof, be cool. If you are sweet, be sweet.
    - Be concise! The chat window is small. 
    - Do NOT write long paragraphs of explanation. Keep chat responses under 50 words unless absolutely necessary.
    - If asked for suggestions (e.g., titles), give 1-2 best options casually, not a long list.
4. **Output Format (XML)**:
    - You CAN provide brief explanations or friendly comments outside the tags (in your persona's voice).
    - If you want to change the **Main Content**, wrap it in <content>...</content>.
    - If you want to change the **Title**, wrap it in <title>...</title>.
    - If you want to change **Tags**, wrap comma-separated tags in <tags>...</tags>.
    - You can include multiple tags if needed. Only include the tags for fields you want to change.
    
    - Example 1 (Content Polish):
      (In Persona's Voice): "Here is a smoother version:"
      <content>
      Today was a tough day...
      </content>

    - Example 2 (Title Change):
      (In Persona's Voice): "This title fits better:"
      <title>The Longest Night</title>

    - Example 3 (All together):
      <title>New Title</title>
      <content>New Content...</content>
`;

    // History should be an array of { role: 'user'|'assistant', content: '...' }
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history
    ];

    try {
        const responseText = await callAI(messages, config);
        return responseText.trim();
    } catch (error) {
        console.error("Polish generation failed:", error);
        throw error;
    }
  };

  // Real AI Chat Response
  const generateChatResponse = async (history) => {
    try {
      const config = currentApiConfig;
      const persona = currentPersona;
      
      // Use activeDate for context
      const [year, month, day] = activeDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const dateString = dateObj.toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      // Fetch Recent Diary Summaries (Before activeDate)
      const recentSummaries = diaries
        .filter(d => new Date(d.date) < new Date(activeDate))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7)
        .map(d => {
            if (d.ai_briefing) {
                return `### [${d.date}] Briefing
- Events: ${d.ai_briefing.events}
- Atmosphere/Emotion: ${d.ai_briefing.atmosphere_or_emotion}
${d.ai_briefing.unfinished_topics ? `- Unfinished Topics: ${d.ai_briefing.unfinished_topics}` : ''}`;
            }
            return `- [${d.date}] ${d.title}: ${d.summary || d.content.substring(0, 50)}...`;
        })
        .join('\n\n');

      // PREPARE HISTORY: Include yesterday's last 20 messages for continuity
      let combinedHistory = [...history];
      try {
          const prevDate = new Date(year, month - 1, day - 1);
          const prevY = prevDate.getFullYear();
          const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
          const prevD = String(prevDate.getDate()).padStart(2, '0');
          const prevDateStr = `${prevY}-${prevM}-${prevD}`;
          
          const prevChatKey = `chat_messages_${prevDateStr}`;
          const prevChatSaved = localStorage.getItem(prevChatKey);
          
          if (prevChatSaved) {
              const prevChat = JSON.parse(prevChatSaved);
              if (Array.isArray(prevChat) && prevChat.length > 0) {
                  // Take last 20 messages from yesterday
                  const recentPrevChat = prevChat.slice(-20).map(msg => ({
                      ...msg,
                      // Optional: Add a marker or modify text to indicate date? 
                      // For now, raw injection is usually fine as long as order is correct.
                      // But maybe adding a system separator or just letting them flow is better.
                      // Let's just let them flow, but maybe we should ensure they don't look like *today's* messages?
                      // The API doesn't see timestamps usually unless we put them in.
                      // We can assume the LLM understands flow.
                  }));
                  
                  // Prepend to history
                  combinedHistory = [...recentPrevChat, ...history];
                  
                  // Log for debugging
                  console.log(`[AIContext] Injected ${recentPrevChat.length} messages from ${prevDateStr}`);
              }
          }
      } catch (e) {
          console.error("Failed to load previous day history:", e);
      }

      // PART 1: CONTEXT (Identity, Date, Profile, Summaries)
      const contextSystemPrompt = `
# AI IDENTITY
Name: ${persona.name}
Role: You are an AI companion.

# TIME/DATE CONTEXT
Current Context Date: ${dateString} (${activeDate})
Current Time: ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

# USER PROFILE
- Name: ${profile.username || 'Not set'}
- Nickname: ${profile.nickname || 'Not set'}
- Birthday: ${profile.birthday || 'Not set'}
- Location: ${profile.location || 'Not set'}
- Family: ${profile.family || 'Not set'}
- Relationships: ${profile.relationships || 'Not set'}
- Occupation: ${profile.occupation || 'Not set'}
- Workplace: ${profile.workplace || 'Not set'}
- Interests: ${profile.interests || 'Not set'}

# RECENT MEMORY BRIEFINGS (Context before ${activeDate})
${recentSummaries || "[System: No previous diaries available]"}
`;

      // PART 2: RULES (Fixed, Custom, Format)
      const rulesSystemPrompt = `
# UNIVERSAL BEHAVIOR GUIDELINES (GLOBAL OVERRIDE)
1. **引導記錄 (好奇心驅動)**：视乎情况发问后续问题，引導用戶多說一點細節，但每次回复不得超过2条问题。
2. **多功能性**：用戶若要求特定任務（如：算命、新聞討論、性格分析）或专业话题，請展現該領域的專業度，不要拒絕，主动提供多角度分析或建议。
3. **準備總結**：默默記下對話中的關鍵點，隨時準備在用戶要求「一鍵生成日記」時，以第一人稱（我）產出。

# USER CUSTOM PERSONA SETTINGS
${persona.customPrompt || "No custom settings."}

# RESPONSE FORMATTING RULES
1. You are in a CHAT interface.
2. **EXTREMELY IMPORTANT**: Split your thoughts into 4-6 short messages.
3. **USE NEWLINE (\\n) TO SEPARATE MESSAGES**.
4. Max 50 characters per message.
5. Strictly maintain your persona: ${persona.name}.
`;

      // Construct API Messages
      let apiMessages = [];
      
      // Helper to format content for OpenAI/Multimodal
      const formatMessageContent = (msg) => {
        if (msg.attachment && msg.attachment.type === 'image') {
            return [
                { type: "text", text: msg.text || " " }, // Ensure some text exists
                { 
                    type: "image_url", 
                    image_url: { 
                        url: msg.attachment.url // This is the data URL
                    } 
                }
            ];
        }
        return msg.text + (msg.attachment ? `\n[User uploaded an image]` : ''); // Fallback for non-image attachments
      };
      
      // 1. Context System Prompt
      apiMessages.push({ role: 'system', content: contextSystemPrompt.trim() });
      
      // 2. Chat History (Split strategy: History > Rules > Input)
      if (combinedHistory.length > 0) {
          // Identify the "Latest User Input Block"
          // This is the sequence of user messages at the VERY END of the history.
          // e.g. [AI, User, AI, User1, User2, User3] -> Block is [User1, User2, User3]
          let splitIndex = combinedHistory.length - 1;
          while (splitIndex >= 0 && combinedHistory[splitIndex].sender === 'user') {
              splitIndex--;
          }
          // splitIndex is now the index of the last non-user message (or -1 if all are user)
          
          const previousHistory = combinedHistory.slice(0, splitIndex + 1);
          const userInputBlock = combinedHistory.slice(splitIndex + 1);
          
          // Add previous history (if any)
          if (previousHistory.length > 0) {
              apiMessages.push(...previousHistory.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: formatMessageContent(msg)
              })));
          }
          
          // 3. Rules System Prompt (Sandwiched before the latest user input block)
          apiMessages.push({ role: 'system', content: rulesSystemPrompt.trim() });
          
          // 4. Latest User Input Block
          if (userInputBlock.length > 0) {
              apiMessages.push(...userInputBlock.map(msg => ({
                role: 'user', // strictly user
                content: formatMessageContent(msg)
              })));
          }
      } else {
          // Fallback if no history (e.g. initial greeting generation)
          apiMessages.push({ role: 'system', content: rulesSystemPrompt.trim() });
      }

      const responseText = await callAI(apiMessages, config);
      
      // Split by newline and filter empty lines
      let responses = responseText.split('\n').filter(line => line.trim() !== '');
      
      // Fallback: If still one long block (>100 chars), try to split by sentence endings
      if (responses.length === 1 && responses[0].length > 100) {
        // Split by punctuation followed by space or end of string
        // Safe-ish split for chat
        const fallbackSplit = responses[0].split(/(?<=[.!?。！？])\s+/).filter(s => s.trim() !== '');
        if (fallbackSplit.length > 1) {
            responses = fallbackSplit;
        }
      }
      
      return responses.length > 0 ? responses : [responseText];

    } catch (error) {
      console.error("Generate Chat Response Error:", error);
      return [`Error: ${error.message}`];
    }
  };

  // Real AI Diary Generation
  const generateDiary = async (chatHistory, instruction = '') => {
    try {
      const config = currentApiConfig;
      
      // Get recent 3 diaries BEFORE the activeDate
      const recentDiaries = [...diaries]
        .filter(d => new Date(d.date) < new Date(activeDate)) // Filter out future diaries
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3)
        .map(d => `- Date: ${d.date}\n- Summary: ${d.summary || d.content.substring(0, 100) + '...'}`)
        .join('\n\n');

      // Get diaries ALREADY written TODAY (to avoid repetition)
      const todaysDiaries = [...diaries]
        .filter(d => d.date === activeDate)
        .map(d => `- Title: ${d.title}\n- Summary/Content: ${d.summary || d.content.substring(0, 200)}...`)
        .join('\n\n');

      // Use activeDate instead of current system date
      // Parse activeDate to get a friendly format
      const [year, month, day] = activeDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const targetDateFormatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      
      const style = diarySettings.withAiTrace ? 'with_ai_trace' : 'no_ai_trace';
      const systemPrompt = DIARY_PROMPTS[style] || DIARY_PROMPTS.no_ai_trace;

      const userProfileContext = `
      User Profile Context:
      - Name: ${profile.username || 'Not set'}
      - Nickname: ${profile.nickname || 'Not set'}
      - Birthday: ${profile.birthday || 'Not set'}
      - Location: ${profile.location || 'Not set'}
      - Interests: ${profile.interests || 'Not set'}
      `;

      // Use full chat history for the day as requested by user
      // Token limits are high enough (128k+) to handle a full day's chat in most cases.
      // We do not slice or substring to ensure ALL of today's context is included.
      const chatContext = chatHistory.map(msg => {
          let timeStr = '';
          const date = new Date(msg.id);
          if (!isNaN(date.getTime())) {
              timeStr = `[${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}] `;
          }
          return `${timeStr}${msg.sender}: ${msg.text}`;
      }).join('\n');
      
      const fullPrompt = `
      ${systemPrompt}

      # DIARY WRITING STYLE
      The user has configured a specific writing style for this AI persona. You MUST adhere to this style guidance:
      "${diarySettings.diaryStylePrompt || 'Maintain a natural, personal tone.'}"
      
      # PERSONA CONTEXT
      The AI persona you are roleplaying as is named: "${currentPersona.name}".
      If the user's diary entry mentions talking to you, refer to yourself by this name ("${currentPersona.name}") or as a friend/companion, but NEVER as "The AI".

      # LENGTH CONSTRAINT
      The user has requested a diary length of approximately ${diarySettings.wordCount} words (or characters for CJK languages). 
      Please try to stay within this range, but prioritize content quality and completeness.
      
      IMPORTANT: 
      1. You must ALWAYS maintain the "First Person" ('I') perspective and the "Ghostwriter" role (never reveal you are AI).
      2. You must ALWAYS stick to the actual events in the chat (no hallucinations).
      3. ONLY override the *tone* or *formatting* rules (like emojis, sentence length) if the user's custom style above explicitly demands it. Otherwise, the "Ghostwriter" rules (No AI traces, authentic voice) remain absolute.

      Target Diary Date: ${targetDateFormatted}

      ${userProfileContext}

      Recent Diaries (for context only):
      ${recentDiaries || "No recent diaries found."}

      ${todaysDiaries ? `# EXISTING DIARIES FOR THIS DATE (DO NOT REPEAT):\nThe user has already written the following entries for this date. \n- IF the chat history contains NEW events not covered here, focus strictly on those NEW events.\n- IF the chat history is just more detail on the same events, write a "Part 2" or reflective continuation.\n- AVOID simply re-summarizing what is already written below:\n${todaysDiaries}\n` : ''}

      ${instruction ? `# ADDITIONAL USER INSTRUCTION:\nThe user has requested a specific adjustment for this version: "${instruction}".\nPlease incorporate this instruction while incorporating the persona and style.\n` : ''}

      # LANGUAGE INSTRUCTION:
      The user is writing in a specific language. 
      **Detect the primary language** used by the USER in the "Conversation History" below (e.g., English, Chinese, Japanese).
      **You MUST write the diary entry in that SAME language.**
      If the conversation is mixed, use the language the user uses most for expression.
      `;

      const apiMessages = [
        { role: 'system', content: fullPrompt },
        { role: 'user', content: `Here is the conversation history:\n\n${chatContext}\n\nPlease generate the diary entry JSON now.` }
      ];

      let responseText = await callAI(apiMessages, config);
      
      // Improved Cleaning Logic
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
          responseText = codeBlockMatch[1];
      }
      
      try {
        const parsed = JSON.parse(responseText);
        
        // Ensure tags is always an array
        if (!parsed.tags) parsed.tags = [];
        if (typeof parsed.tags === 'string') parsed.tags = [parsed.tags];
        
        return parsed;
      } catch (e) {
        console.error("Failed to parse diary JSON", e);
        // Fallback if JSON parsing fails - return as content but try to respect structure
        return {
            title: 'Generated Diary',
            content: responseText.replace(/<\/?html>/gi, '').replace(/<\/?body>/gi, '').trim(),
            mood: 'neutral',
            tags: ['generated'],
            summary: 'Auto-generated diary entry.'
        };
      }

    } catch (error) {
      console.error("Generate Diary Error:", error);
      throw error; // Let UI handle error
    }
  };

    // Real AI Comment Generation - Added via Context
  const generateComment = async (diary, existingComments = []) => {
    try {
      const config = currentApiConfig;
      
      // Get recent 7 diary summaries relative to TODAY (System Date)
      const recentSummaries = diaries
        .filter(d => d.id !== diary.id) // Exclude current if present
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date desc (newest first)
        .slice(0, 7) // Take top 7 (most recent in system)
        .map(d => {
            if (d.ai_briefing) {
                return `### [${d.date}] Briefing
- Events: ${d.ai_briefing.events}
- Atmosphere/Emotion: ${d.ai_briefing.atmosphere_or_emotion}
${d.ai_briefing.unfinished_topics ? `- Unfinished Topics: ${d.ai_briefing.unfinished_topics}` : ''}`;
            }
            return `- [${d.date}] ${d.title}: ${d.summary || d.content.substring(0, 50)}...`;
        })
        .join('\n\n');

      // Get chat history for that specific diary date (Past Context)
      const chatKey = `chat_messages_${diary.date}`;
      const fullDayChat = JSON.parse(localStorage.getItem(chatKey) || '[]');
      
      let diaryTimestamp = Infinity;
      if (typeof diary.id === 'number') {
        diaryTimestamp = diary.id;
      } else if (typeof diary.id === 'string' && !isNaN(parseInt(diary.id))) {
         diaryTimestamp = parseInt(diary.id);
      }

      const relevantChat = fullDayChat.filter(m => m.id < diaryTimestamp);
      const rawChatLog = relevantChat.map(m => `${m.sender}: ${m.text}`).join('\n');

      // Calculate Time Difference for "God's Eye View"
      const dDate = new Date(diary.date);
      const tDate = new Date(activeDate); // activeDate acts as "The Present"
      const timeDiff = Math.floor((tDate - dDate) / (1000 * 60 * 60 * 24));

      // Get TODAY'S Chat Context (Present Context) if different from diary date
      // This allows the AI to know what the user is doing *right now* to make connections (e.g. "Still fixing bugs?")
      let todayContext = "";
      if (activeDate !== diary.date) {
          const todayChatKey = `chat_messages_${activeDate}`;
          const todayChat = JSON.parse(localStorage.getItem(todayChatKey) || '[]');
          // Take last 20 messages to capture current state
          const todayChatSnippet = todayChat.slice(-20).map(m => `${m.sender}: ${m.text}`).join('\n');
          
          todayContext = `
[The Reality of NOW (${activeDate})]:
(What the user is doing RIGHT NOW, ${timeDiff} days later.)
${todayChatSnippet || "No chat today yet."}
`;
      }

      const systemPrompt = `
# Role: Time Witness (A Friend from the FUTURE)
You are a friend looking back at "Old Times". You have a "God's Eye View" - you know what happened after this diary entry.

# Timeline Mapping
- [Past Space-Time]: ${diary.date}
- [Present Reality]: ${activeDate} (This is ${timeDiff} days after the diary)

# Knowledge Gap
1. **The Past User (Ignorant)**: When writing this diary, the user didn't know the future.
2. **The Present You (Omniscient)**: You have read the recent summaries and today's chat. You know if things got solved, got worse, or are still in a loop.

# Task: Leave a "Cross-Time" Comment
Use the information gap between [Past] and [Present] to leave a comment under 30 words/characters.

# Core Logic: 跨時空連結 你的評論必須基於「時間差產生的洞察」。請執行以下邏輯思考：
- 定位差異：找出日記中提到的「核心元素」（如：一個情緒、一個具體的人、一個計劃）。
- 跨時空檢索：在「最近背景」中搜尋該元素的現狀。
- 形成觀察：
  - 如果該元素仍在持續：調侃這種執著或無奈。
  - 如果該元素已經改變：指出這種轉變帶來的反差。
  - 如果該元素已消失且無後續：作為旁觀者對那段消失的時光表達感慨或好奇。

# Critical Constraints (Violation = Fail)
- **NO REPORTING**: Do not say "Today is...".
- **STRICT LENGTH**: Under 30 words/characters.
- **LANGUAGE**: Match the user's language (Chinese/English).

# PERSONA ADAPTATION:
Name: ${currentPersona.name}
Tone: ${currentPersona.replyStyle || 'Casual'}
`;

      const userContent = `
# PAST DIARY ENTRY (The Memory):
Content: "${diary.content}"

# THE FUTURE CONTEXT (What happened since then):
- Recent Life Summaries (The days in between):
${recentSummaries}
- User's Custom Rules: ${currentPersona.customPrompt || 'None'}
- Chat History (At the time of diary):
${rawChatLog}

${todayContext}

# INSTRUCTION:
Write the comment now. Use the "God's Eye View" to tease or comfort the past user.
STRICT LIMIT: 30 characters maximum.
`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];

      const responseText = await callAI(apiMessages, config);
      return responseText.trim();

    } catch (error) {
      console.error("Generate Comment Error:", error);
      throw error;
    }
  };

  const sendMessage = async (text, attachment = null) => {
    if (!text.trim() && !attachment) return;
    
    const userMsg = { 
        id: Date.now(), 
        sender: 'user', 
        text,
        attachment 
    };
    setMessages(prev => [...prev, userMsg]);
  };

  const triggerAIResponse = async () => {
    setIsTyping(true);
    
    // In a real app, we would use the history including the new message
    const responses = await generateChatResponse(messages);
    
    const responseArray = Array.isArray(responses) ? responses : [responses];
    
    // Add messages sequentially with natural delay
    for (const responseText of responseArray) {
      setIsTyping(true);
      // Simulate typing speed: faster for short messages, capped between 800ms and 2000ms
      const delay = Math.min(2000, Math.max(800, responseText.length * 30));
      await new Promise(resolve => setTimeout(resolve, delay));
      
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: responseText }]);
      
      // Small pause between messages
      if (responseArray.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const regenerateLastResponse = async (instruction = null) => {
    // 1. Check if the last message is from AI
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.sender !== 'ai') return;

    // 2. Remove ALL consecutive AI messages from the end
    let newHistory = [...messages];
    while (newHistory.length > 0 && newHistory[newHistory.length - 1].sender === 'ai') {
        newHistory.pop();
    }
    
    setMessages(newHistory);
    
    // 3. Trigger AI response again with the reduced history
    setIsTyping(true);
    const responses = await generateChatResponse(newHistory, instruction);
    
    const responseArray = Array.isArray(responses) ? responses : [responses];
    
    // Add messages sequentially with natural delay
    for (const responseText of responseArray) {
      setIsTyping(true);
      const delay = Math.min(2000, Math.max(800, responseText.length * 30));
      await new Promise(resolve => setTimeout(resolve, delay));
      
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: responseText }]);
      
      if (responseArray.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  const editMessage = (id, newText) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text: newText } : msg));
  };

  const deleteMessages = (ids) => {
    const idsSet = new Set(ids);
    setMessages(prev => prev.filter(msg => !idsSet.has(msg.id)));
  };

  const clearChat = () => {
    setMessages([{ id: Date.now(), sender: 'ai', text: "Hi there! How are you feeling today?" }]);
  };

  return (
    <AIContext.Provider value={{
      personas,
      currentPersona,
      currentPersonaId,
      setCurrentPersonaId,
      addPersona,
      updatePersona,
      deletePersona,
      apiConfigs,
      currentApiConfig,
      currentApiConfigId,
      setCurrentApiConfigId,
      addApiConfig,
      updateApiConfig,
      deleteApiConfig,
      diarySettings,
      setDiarySettings,
      generateDiary,
      generateChatResponse,
      generateComment,
      // Chat State & Functions
      messages,
      isTyping,
      sendMessage,
      editMessage,
      deleteMessages,
      triggerAIResponse,
      regenerateLastResponse,
      clearChat,
      fetchModels,
      generateBriefing,
    polishDiary,
    activeDate,
      setActiveDate
    }}>
      {children}
    </AIContext.Provider>
  );
};
