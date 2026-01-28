import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

const DEFAULT_PROFILE = {
  // Basic Info
  username: '',
  nickname: '',
  birthday: '',
  identity: '',
  schoolWork: '',
  schoolWorkLocation: '',
  residence: '',
  
  // Deep Info
  personality: '',
  valuesPositive: '',
  valuesNegative: '',
  lifeExperience: [], // Changed to array of { year, content }
  shortTermGoals: [], // Changed to array of strings
  
  // Connections & Interests
  coreRelationships: [], // Changed to array of { name, relation, note }
  interests: [], // Changed to array of strings
  pets: [] // Changed to array of { name, type, note }
};

export const UserProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      const parsed = saved ? JSON.parse(saved) : null;
      
      if (parsed && typeof parsed === 'object') {
        // Migration logic for old fields
        const migrated = { ...DEFAULT_PROFILE, ...parsed };
        
        // Map old fields if new ones are empty
        if (!migrated.residence && parsed.location) migrated.residence = parsed.location;
        if (!migrated.schoolWork && parsed.workplace) migrated.schoolWork = parsed.workplace;
        if (!migrated.identity && parsed.occupation) migrated.identity = parsed.occupation;
        
        // Migrate lifeExperience to array if it was a string
        if (typeof migrated.lifeExperience === 'string' && migrated.lifeExperience) {
          migrated.lifeExperience = [{ year: 'Past', content: migrated.lifeExperience }];
        } else if (!Array.isArray(migrated.lifeExperience)) {
          migrated.lifeExperience = [];
        }

        // Migrate coreRelationships to array if it was a string
        if (typeof migrated.coreRelationships === 'string') {
          const parts = [];
          if (parsed.family) parts.push({ name: 'Family', relation: 'Family', note: parsed.family });
          if (parsed.relationships) parts.push({ name: 'Relationships', relation: 'Friends', note: parsed.relationships });
          if (migrated.coreRelationships && !parsed.family && !parsed.relationships) {
             parts.push({ name: 'Others', relation: 'General', note: migrated.coreRelationships });
          }
          migrated.coreRelationships = parts;
        } else if (!Array.isArray(migrated.coreRelationships)) {
          migrated.coreRelationships = [];
        }

        // Migrate interests to array if it was a string
        if (typeof migrated.interests === 'string') {
          migrated.interests = migrated.interests ? migrated.interests.split(',').map(i => i.trim()).filter(Boolean) : [];
        } else if (!Array.isArray(migrated.interests)) {
           migrated.interests = [];
        }

        // Migrate pets to array if it was a string
        if (typeof migrated.pets === 'string' && migrated.pets) {
          migrated.pets = [{ name: 'Pet', type: 'Pet', note: migrated.pets }];
        } else if (!Array.isArray(migrated.pets)) {
          migrated.pets = [];
        }
        
        return migrated;
      }
      return DEFAULT_PROFILE;
    } catch (e) {
      console.error("Failed to parse user_profile:", e);
      return DEFAULT_PROFILE;
    }
  });

  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, [profile]);

  const updateProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};
