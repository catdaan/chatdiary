import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Calendar, MapPin, Briefcase, Heart, Smile, 
  Save, Star, Target, Book, Shield, ShieldAlert, 
  Zap, Building2, Map, Cat, Camera, Plus, Trash2, Tag, X,
  Link, Image as ImageIcon, Upload
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { compressImage } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// --- Sub-components ---

const NotionInput = ({ label, icon: Icon, value, name, onChange, placeholder, type = "text", className = "" }) => (
  <div className={`group flex items-start gap-3 p-2 -mx-2 rounded-lg transition-colors ${className}`}>
    <div className="mt-1 text-cream-400 transition-colors">
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-medium text-cream-500 mb-0.5">{label}</label>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={Math.max(1, (value?.match(/\n/g) || []).length + 1)}
          className="w-full bg-transparent border-none p-0 text-cream-900 placeholder:text-cream-300 focus:ring-0 resize-none text-sm leading-relaxed"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent border-none p-0 text-cream-900 placeholder:text-cream-300 focus:ring-0 text-sm font-medium"
        />
      )}
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-cream-200/60 p-5 shadow-sm space-y-4 ${className}`}>
    <div className="flex items-center gap-2 text-cream-900 font-semibold pb-3 border-b border-cream-100">
      <Icon size={18} className="text-cream-400" />
      <h3>{title}</h3>
    </div>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const Divider = () => <div className="h-px bg-cream-200/60 my-2" />;

// --- Timeline Editor ---
const TimelineEditor = ({ items, onChange, placeholderYear, placeholderContent, addText }) => {
  const safeItems = Array.isArray(items) ? items : [];

  const addItem = () => {
    onChange([...safeItems, { year: '', content: '' }]);
  };

  const removeItem = (index) => {
    const newItems = safeItems.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...safeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {safeItems.map((item, index) => (
        <div key={index} className="flex gap-3 items-start group relative pl-4 border-l-2 border-cream-200">
          <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-cream-300 ring-2 ring-white" />
          <div className="w-24 shrink-0">
             <input
              type="text"
              value={item.year}
              onChange={(e) => updateItem(index, 'year', e.target.value)}
              placeholder={placeholderYear || "Year/Time"}
              className="w-full bg-transparent border-none p-0 text-cream-500 placeholder:text-cream-300 focus:ring-0 text-sm font-medium text-right"
            />
          </div>
          <div className="flex-1">
             <textarea
              value={item.content}
              onChange={(e) => updateItem(index, 'content', e.target.value)}
              placeholder={placeholderContent || "What happened?"}
              rows={Math.max(1, (item.content?.match(/\n/g) || []).length + 1)}
              className="w-full bg-transparent border-none p-0 text-cream-900 placeholder:text-cream-300 focus:ring-0 resize-none text-sm leading-relaxed"
            />
          </div>
          <button onClick={() => removeItem(index)} className="opacity-0 group-hover:opacity-100 text-cream-300 hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-2 text-xs text-cream-400 hover:text-cream-600 transition-colors pl-4">
        <Plus size={14} /> {addText || "Add Milestone"}
      </button>
    </div>
  );
};

// --- Relationship Editor ---
const RelationshipEditor = ({ items, onChange, placeholderName, placeholderRelation, placeholderNote, addText }) => {
  const addItem = () => {
    onChange([...items, { name: '', relation: '', note: '' }]);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="bg-cream-50/50 rounded-lg p-3 space-y-2 group relative">
           <button onClick={() => removeItem(index)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cream-300 hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
          <div className="flex gap-2">
             <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
              placeholder={placeholderName || "Name"}
              className="flex-1 bg-transparent border-b border-cream-200 focus:border-cream-400 p-1 text-cream-900 placeholder:text-cream-300 focus:ring-0 text-sm font-semibold"
            />
            <input
              type="text"
              value={item.relation}
              onChange={(e) => updateItem(index, 'relation', e.target.value)}
              placeholder={placeholderRelation || "Relationship"}
              className="w-1/3 bg-transparent border-b border-cream-200 focus:border-cream-400 p-1 text-cream-600 placeholder:text-cream-300 focus:ring-0 text-xs text-right"
            />
          </div>
          <textarea
            value={item.note}
            onChange={(e) => updateItem(index, 'note', e.target.value)}
            placeholder={placeholderNote || "Notes about them..."}
            rows={Math.max(1, (item.note?.match(/\n/g) || []).length + 1)}
            className="w-full bg-transparent border-none p-0 text-cream-700 placeholder:text-cream-300 focus:ring-0 resize-none text-xs leading-relaxed"
          />
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-2 text-xs text-cream-400 hover:text-cream-600 transition-colors">
        <Plus size={14} /> {addText || "Add Relationship"}
      </button>
    </div>
  );
};

// --- Tag Editor ---
const TagEditor = ({ tags, onChange, placeholder }) => {
  const [input, setInput] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
        setInput('');
      }
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span key={i} className="bg-cream-100 text-cream-800 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 border border-cream-200 group">
          {tag}
          <button onClick={() => removeTag(tag)} className="text-cream-400 hover:text-red-500">
            <X size={12} />
          </button>
        </span>
      ))}
      <div className="relative flex items-center min-w-[100px]">
        <Tag size={14} className="absolute left-0 text-cream-400" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Add interest..."}
          className="w-full pl-5 bg-transparent border-none p-0 text-cream-900 placeholder:text-cream-300 focus:ring-0 text-sm"
        />
      </div>
    </div>
  );
};


// --- Pet Editor ---
const PetEditor = ({ items, onChange, placeholderName, placeholderType, placeholderNote, addText }) => {
  const safeItems = Array.isArray(items) ? items : [];
  
  const addItem = () => {
    onChange([...safeItems, { name: '', type: '', note: '' }]);
  };

  const removeItem = (index) => {
    onChange(safeItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...safeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {safeItems.map((item, index) => (
        <div key={index} className="bg-cream-50/50 rounded-lg p-3 space-y-2 group relative">
           <button onClick={() => removeItem(index)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cream-300 hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
          <div className="flex gap-2">
             <input
              type="text"
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
              placeholder={placeholderName || "Pet Name"}
              className="flex-1 bg-transparent border-b border-cream-200 focus:border-cream-400 p-1 text-cream-900 placeholder:text-cream-300 focus:ring-0 text-sm font-semibold"
            />
            <input
              type="text"
              value={item.type}
              onChange={(e) => updateItem(index, 'type', e.target.value)}
              placeholder={placeholderType || "Type (Cat, Dog...)"}
              className="w-1/3 bg-transparent border-b border-cream-200 focus:border-cream-400 p-1 text-cream-600 placeholder:text-cream-300 focus:ring-0 text-xs text-right"
            />
          </div>
          <textarea
            value={item.note}
            onChange={(e) => updateItem(index, 'note', e.target.value)}
            placeholder={placeholderNote || "About them..."}
            rows={Math.max(1, (item.note?.match(/\n/g) || []).length + 1)}
            className="w-full bg-transparent border-none p-0 text-cream-700 placeholder:text-cream-300 focus:ring-0 resize-none text-xs leading-relaxed"
          />
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-2 text-xs text-cream-400 hover:text-cream-600 transition-colors">
        <Plus size={14} /> {addText || "Add Pet"}
      </button>
    </div>
  );
};

// --- Focus Editor ---
const FocusEditor = ({ items, onChange, placeholder, addText }) => {
  const safeItems = Array.isArray(items) ? items : [];
  
  const addItem = () => {
    onChange([...safeItems, '']);
  };

  const removeItem = (index) => {
    onChange(safeItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, value) => {
    const newItems = [...safeItems];
    newItems[index] = value;
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      {safeItems.map((item, index) => (
        <div key={index} className="flex gap-2 items-center group">
          <div className="flex-1 bg-cream-50/50 rounded-lg px-3 py-2 border border-transparent focus-within:border-cream-300 focus-within:bg-white transition-all">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder || "I'm focusing on..."}
              className="w-full bg-transparent border-none p-0 text-cream-900 placeholder:text-cream-300 focus:ring-0 text-sm"
            />
          </div>
          <button 
            onClick={() => removeItem(index)} 
            className="opacity-0 group-hover:opacity-100 text-cream-300 hover:text-red-400 transition-all p-2"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="flex items-center gap-2 text-xs text-cream-400 hover:text-cream-600 transition-colors">
        <Plus size={14} /> {addText || "Add Focus Area"}
      </button>
    </div>
  );
};

const ProfilePage = () => {
  const { profile, updateProfile } = useUser();
  const { t } = useTranslation();
  const [formData, setFormData] = useState(profile);
  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const fileInputRef = useRef(null);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAvatarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Ensure arrays are initialized if missing from old data
    setFormData({
      ...profile,
      lifeExperience: Array.isArray(profile.lifeExperience) ? profile.lifeExperience : [],
      coreRelationships: Array.isArray(profile.coreRelationships) ? profile.coreRelationships : [],
      interests: Array.isArray(profile.interests) ? profile.interests : [],
      pets: Array.isArray(profile.pets) ? profile.pets : [],
      shortTermGoals: Array.isArray(profile.shortTermGoals) 
        ? profile.shortTermGoals 
        : (profile.shortTermGoals ? [profile.shortTermGoals] : [])
    });
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleDirectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image size should be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (tempAvatarUrl) {
      setFormData(prev => ({ ...prev, avatar: tempAvatarUrl }));
      setIsDirty(true);
      setShowAvatarUrlInput(false);
      setTempAvatarUrl('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(formData);
    setIsDirty(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="h-full overflow-y-auto bg-cream-50/30">
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 pb-32">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-80 shrink-0 space-y-6">
          <div className="md:sticky md:top-8 space-y-6">
            {/* Avatar & Name */}
            <div className="text-center space-y-4 relative">
              <div className="relative group w-24 h-24 mx-auto">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full bg-cream-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-transparent hover:border-cream-300 relative"
                >
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl text-cream-400">
                      {formData.username?.[0]?.toUpperCase() || <User size={40} />}
                    </div>
                  )}
                </div>

                {/* Edit Icon & Dropdown */}
                <div className="absolute -bottom-1 -right-1 z-20" ref={dropdownRef}>
                   <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAvatarDropdown(!showAvatarDropdown);
                    }}
                    className="p-2 bg-white rounded-full shadow-md border border-cream-200 text-cream-500 hover:text-cream-700 hover:border-cream-300 transition-all"
                    title="Change Avatar"
                  >
                    <ImageIcon size={14} />
                  </button>

                  {/* Dropdown Menu */}
                  {showAvatarDropdown && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-36 bg-white rounded-lg shadow-xl border border-cream-100 py-1 overflow-hidden z-30 flex flex-col">
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-xs font-medium text-cream-700 hover:bg-cream-50 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAvatarDropdown(false);
                          setShowAvatarUrlInput(false);
                        }}
                      >
                        <Upload size={12} />
                        {t('profile.avatar.upload')}
                      </button>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-xs font-medium text-cream-700 hover:bg-cream-50 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setShowAvatarUrlInput(true);
                          setShowAvatarDropdown(false);
                        }}
                      >
                        <Link size={12} />
                        {t('profile.avatar.link')}
                      </button>
                    </div>
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              {/* URL Input Modal - Moved outside avatar container for better positioning */}
              <AnimatePresence>
                {showAvatarUrlInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute z-50 top-[108px] left-0 right-0 mx-auto w-64 bg-white rounded-xl shadow-xl border border-cream-200 p-4"
                  >
                    <h3 className="text-sm font-semibold text-cream-900 mb-2 text-left">{t('profile.avatar.linkTitle')}</h3>
                    <input
                      type="text"
                      placeholder="https://example.com/image.png"
                      className="w-full bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-sm text-cream-900 placeholder:text-cream-400 focus:outline-none focus:ring-2 focus:ring-cream-300 mb-3"
                      value={tempAvatarUrl}
                      onChange={(e) => setTempAvatarUrl(e.target.value)}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarUrlInput(false);
                          setTempAvatarUrl('');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-cream-600 hover:text-cream-800 transition-colors"
                      >
                        {t('profile.common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleUrlSubmit}
                        className="px-3 py-1.5 text-xs font-medium bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
                      >
                        {t('profile.common.confirm')}
                      </button>
                    </div>
                    {/* Arrow pointing up */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-cream-200 transform rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={t('profile.basicInfo.yourName')}
                  className="w-full bg-transparent border-none p-0 text-3xl font-bold text-cream-900 placeholder:text-cream-300 focus:ring-0 text-center"
                />
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder={t('profile.basicInfo.nickname')}
                  className="w-full bg-transparent border-none p-0 text-lg text-cream-500 placeholder:text-cream-300 focus:ring-0 text-center"
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-2 px-2">
              <NotionInput label={t('profile.basicInfo.identity')} icon={User} name="identity" value={formData.identity} onChange={handleChange} placeholder={t('profile.basicInfo.identityPlaceholder')} />
              <Divider />
              <NotionInput label={t('profile.basicInfo.birthday')} icon={Calendar} name="birthday" type="date" value={formData.birthday} onChange={handleChange} />
              <Divider />
              <NotionInput label={t('profile.basicInfo.residence')} icon={MapPin} name="residence" value={formData.residence} onChange={handleChange} placeholder={t('profile.basicInfo.residencePlaceholder')} />
              <Divider />
              <NotionInput label={t('profile.basicInfo.schoolWork')} icon={Building2} name="schoolWork" value={formData.schoolWork} onChange={handleChange} placeholder={t('profile.basicInfo.schoolWorkPlaceholder')} />
              <Divider />
              <NotionInput label={t('profile.basicInfo.location')} icon={Map} name="schoolWorkLocation" value={formData.schoolWorkLocation} onChange={handleChange} placeholder={t('profile.basicInfo.locationPlaceholder')} />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={!isDirty}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                ${isDirty 
                  ? 'bg-cream-900 text-white hover:bg-cream-800 shadow-md transform hover:-translate-y-0.5' 
                  : 'bg-cream-200 text-cream-400 cursor-not-allowed'}
              `}
            >
              <Save size={18} />
              {isDirty ? t('profile.save.button') : t('profile.save.saved')}
            </button>
          </div>
        </aside>

        {/* Right Content */}
        <main className="flex-1 space-y-6">
          <header className="mb-8">
            <h2 className="text-2xl font-bold text-cream-900">
              {t('profile.title')}
            </h2>
            <p className="text-cream-600 mt-1">{t('profile.subtitle')}</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Core Self (Consolidated) */}
            <SectionCard title={t('profile.sections.coreSelf')} icon={Zap} className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-cream-800 flex items-center gap-2"><Smile size={14}/> {t('profile.fields.personality')}</h4>
                    <textarea
                      name="personality"
                      value={formData.personality}
                      onChange={handleChange}
                      placeholder={t('profile.fields.personalityPlaceholder')}
                      rows={4}
                      className="w-full bg-cream-50/50 rounded-lg border-none p-3 text-cream-900 placeholder:text-cream-300 focus:ring-1 focus:ring-cream-300 resize-none text-sm"
                    />
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-cream-800 flex items-center gap-2"><Star size={14}/> {t('profile.fields.values')}</h4>
                    <textarea
                      name="valuesPositive"
                      value={formData.valuesPositive}
                      onChange={handleChange}
                      placeholder={t('profile.fields.valuesPlaceholder')}
                      rows={4}
                      className="w-full bg-cream-50/50 rounded-lg border-none p-3 text-cream-900 placeholder:text-cream-300 focus:ring-1 focus:ring-cream-300 resize-none text-sm"
                    />
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-cream-800 flex items-center gap-2"><ShieldAlert size={14}/> {t('profile.fields.dislikes')}</h4>
                    <textarea
                      name="valuesNegative"
                      value={formData.valuesNegative}
                      onChange={handleChange}
                      placeholder={t('profile.fields.dislikesPlaceholder')}
                      rows={4}
                      className="w-full bg-cream-50/50 rounded-lg border-none p-3 text-cream-900 placeholder:text-cream-300 focus:ring-1 focus:ring-cream-300 resize-none text-sm"
                    />
                 </div>
              </div>
            </SectionCard>

            {/* 2. Life Experience (Timeline) */}
            <SectionCard title={t('profile.sections.lifeExperience')} icon={Book} className="lg:col-span-2">
              <TimelineEditor 
                items={formData.lifeExperience} 
                onChange={(newItems) => handleDirectChange('lifeExperience', newItems)} 
                placeholderYear={t('profile.timeline.yearPlaceholder')}
                placeholderContent={t('profile.timeline.contentPlaceholder')}
                addText={t('profile.timeline.add')}
              />
            </SectionCard>

            {/* Bottom Section: Focus & Interests (Left), Connections (Right) */}
            <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Goals */}
                <SectionCard title={t('profile.sections.currentFocus')} icon={Target}>
                  <FocusEditor 
                    items={formData.shortTermGoals} 
                    onChange={(newItems) => handleDirectChange('shortTermGoals', newItems)} 
                    placeholder={t('profile.focus.placeholder')}
                    addText={t('profile.focus.add')}
                  />
                </SectionCard>

                {/* Interests (Tags) */}
                <SectionCard title={t('profile.sections.interests')} icon={Smile}>
                  <TagEditor 
                    tags={formData.interests} 
                    onChange={(newTags) => handleDirectChange('interests', newTags)} 
                    placeholder={t('profile.interests.add')}
                  />
                </SectionCard>
              </div>

              {/* Right Column */}
              <div className="h-full">
                {/* Connections (Structured) */}
                <SectionCard title={t('profile.sections.connections')} icon={Heart} className="h-full">
                  <RelationshipEditor 
                    items={formData.coreRelationships} 
                    onChange={(newItems) => handleDirectChange('coreRelationships', newItems)} 
                    placeholderName={t('profile.connections.namePlaceholder')}
                    placeholderRelation={t('profile.connections.relationPlaceholder')}
                    placeholderNote={t('profile.connections.notePlaceholder')}
                    addText={t('profile.connections.add')}
                  />
                  <div className="mt-4 pt-4 border-t border-cream-100">
                    <div className="flex items-center gap-2 text-cream-900 font-semibold mb-2">
                      <Cat size={18} className="text-cream-400" />
                      <h4 className="text-sm">{t('profile.pets.title')}</h4>
                    </div>
                    <PetEditor 
                      items={formData.pets} 
                      onChange={(newItems) => handleDirectChange('pets', newItems)} 
                      placeholderName={t('profile.pets.namePlaceholder')}
                      placeholderType={t('profile.pets.typePlaceholder')}
                      placeholderNote={t('profile.pets.notePlaceholder')}
                      addText={t('profile.pets.add')}
                    />
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </main>

      </form>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-50 bg-green-50 text-green-800 px-4 py-3 rounded-xl shadow-lg border border-green-200 flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {t('profile.save.success')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
