import React, { useState, useEffect } from 'react';
import { 
  Settings2, Save, Plus, Trash2, Check, User, Sparkles
} from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useTranslation } from 'react-i18next';

const DIARY_STYLE_PRESETS = [
  {
    name: 'Default',
    prompt: ''
  }
];

const AISettings = () => {
  const { t } = useTranslation();
  const { 
    personas, currentPersonaId, setCurrentPersonaId, 
    addPersona, updatePersona, deletePersona,
    diarySettings, setDiarySettings
  } = useAI();
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', description: '', replyStyle: 'warm', customPrompt: ''
  });

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState(null);

  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetForm, setNewPresetForm] = useState({ name: '', prompt: '' });

  // Load custom presets from localStorage or use default
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('diary_style_custom_presets');
      const parsed = saved ? JSON.parse(saved) : [];
      // Filter out any lingering 'Empathetic & Reflective' presets from old versions
      return parsed.filter(p => p.name !== 'Empathetic & Reflective');
    } catch (e) {
      console.error("Failed to load custom presets", e);
      return [];
    }
  });

  // Combine built-in presets with custom ones
  const allPresets = [...DIARY_STYLE_PRESETS, ...customPresets];

  // Save custom presets whenever they change
  useEffect(() => {
    localStorage.setItem('diary_style_custom_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  // Ensure 'Empathetic & Reflective' or 'Custom' is cleared from current settings if active
  useEffect(() => {
    if (diarySettings.diaryStyle === 'Empathetic & Reflective' || diarySettings.diaryStyle === 'Custom') {
      setDiarySettings({
        ...diarySettings,
        diaryStyle: 'Default',
        diaryStylePrompt: ''
      });
    }
  }, [diarySettings, setDiarySettings]);

  const handleAddPreset = () => {
    if (!newPresetForm.name.trim() || !newPresetForm.prompt.trim()) return;
    
    // Check for duplicate names
    if (allPresets.some(p => p.name === newPresetForm.name)) {
      alert('A preset with this name already exists.');
      return;
    }

    const newPreset = { ...newPresetForm };
    setCustomPresets([...customPresets, newPreset]);
    
    // Auto-select the new preset (Global Settings)
    setDiarySettings({
      ...diarySettings,
      diaryStyle: newPreset.name,
      diaryStylePrompt: newPreset.prompt
    });
    
    setNewPresetForm({ name: '', prompt: '' });
    setIsAddingPreset(false);
  };

  const handleDeletePreset = (name, e) => {
    e.stopPropagation(); // Prevent selection when deleting
    if (confirm(`Delete preset "${name}"?`)) {
      const updated = customPresets.filter(p => p.name !== name);
      setCustomPresets(updated);
      
      // If currently selected, revert to default (Global Settings)
      if (diarySettings.diaryStyle === name) {
        setDiarySettings({
          ...diarySettings,
          diaryStyle: DIARY_STYLE_PRESETS[0].name,
          diaryStylePrompt: DIARY_STYLE_PRESETS[0].prompt
        });
      }
    }
  };

  const handleDeleteClick = (id) => {
    setPersonaToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (personaToDelete) {
      deletePersona(personaToDelete);
      setPersonaToDelete(null);
      if (editingId === personaToDelete) {
        setEditingId(null);
      }
    }
  };

  const handleEdit = (persona) => {
    setEditingId(persona.id);
    let nameToEdit = persona.name;
    if (persona.id === 'default' && (persona.name === 'Default' || persona.name === 'Empathetic Companion')) {
      nameToEdit = t('settings.ai.defaultPersona.name');
    }

    setEditForm({
      name: nameToEdit,
      description: persona.id === 'default' ? t('settings.ai.defaultPersona.description') : persona.description,
      replyStyle: persona.replyStyle,
      customPrompt: persona.customPrompt || ''
    });
  };

  const handleSave = () => {
    let finalName = editForm.name.trim();
    const editingPersona = personas.find(p => p.id === editingId);
    
    // Special handling for Default Persona: revert to 'Default' if name is empty or matches localized default
    if (editingPersona?.isDefault) {
      const localizedDefaultName = t('settings.ai.defaultPersona.name');
      if (!finalName || finalName === 'Default' || finalName === localizedDefaultName) {
        finalName = 'Default';
      }
    }

    if (editingId === 'new') {
      const newId = addPersona({
        name: editForm.name,
        description: editForm.description,
        replyStyle: editForm.replyStyle,
        customPrompt: editForm.customPrompt
      });
      setCurrentPersonaId(newId);
    } else {
      updatePersona(editingId, {
        name: editForm.name,
        description: editForm.description,
        replyStyle: editForm.replyStyle,
        customPrompt: editForm.customPrompt
      });
    }
    setEditingId(null);
  };

  const isEditingDefault = personas.find(p => p.id === editingId)?.isDefault;

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      name: t('settings.ai.createNew'),
      description: t('settings.ai.newPersonaDesc'),
      replyStyle: 'warm',
      customPrompt: ''
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 h-full overflow-y-auto custom-scrollbar">
      <ConfirmDialog 
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t('settings.ai.deleteConfirmTitle')}
        message={t('settings.ai.deleteConfirmMessage')}
        confirmText={t('settings.ai.delete')}
        isDangerous={true}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-cream-900 flex items-center gap-2">
          <Settings2 className="text-cream-900" />
          {t('settings.ai.title')}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {editingId ? (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.ai.name')}</label>
              <input 
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
                onBlur={() => {
                  const editingPersona = personas.find(p => p.id === editingId);
                  if (editingPersona?.isDefault && !editForm.name.trim()) {
                    setEditForm(prev => ({ ...prev, name: t('settings.ai.defaultPersona.name') }));
                  }
                }}
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.ai.description')}</label>
              <input 
                value={editForm.description}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
                disabled={isEditingDefault}
                className={cn(
                  "w-full p-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300",
                  isEditingDefault ? "bg-cream-100 text-cream-500 cursor-not-allowed" : "bg-cream-50"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.ai.replyStyle')}</label>
              <select 
                value={editForm.replyStyle}
                onChange={e => setEditForm({...editForm, replyStyle: e.target.value})}
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
              >
                <option value="warm">{t('settings.ai.styles.warm')}</option>
                <option value="analytical">{t('settings.ai.styles.analytical')}</option>
                <option value="concise">{t('settings.ai.styles.concise')}</option>
                <option value="humorous">{t('settings.ai.styles.humorous')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.ai.customPrompt')}</label>
              <textarea 
                value={isEditingDefault ? t('settings.ai.defaultSystemPromptHidden') : editForm.customPrompt}
                onChange={e => setEditForm({...editForm, customPrompt: e.target.value})}
                disabled={isEditingDefault}
                rows={4}
                className={cn(
                  "w-full p-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300",
                  isEditingDefault ? "bg-cream-100 text-cream-400 italic cursor-not-allowed" : "bg-cream-50"
                )}
                placeholder={t('settings.ai.promptPlaceholder')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              {!personas.find(p => p.id === editingId)?.isDefault && (
                <button 
                  onClick={() => handleDeleteClick(editingId)}
                  className="px-4 py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  title={t('settings.ai.delete')}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button 
                onClick={() => setEditingId(null)}
                className="flex-1 py-3 rounded-xl border border-cream-200 text-cream-900 hover:bg-cream-50 transition-colors"
              >
                {t('settings.ai.cancel')}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-cream-900 text-white hover:bg-cream-800 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {t('settings.ai.savePersona')}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {personas.map(persona => (
              <div 
                key={persona.id}
                onClick={() => setCurrentPersonaId(persona.id)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all relative group",
                  currentPersonaId === persona.id 
                    ? "bg-cream-900 text-white border-cream-900 shadow-lg scale-[1.02]" 
                    : "bg-white border-cream-200 hover:border-cream-300 hover:shadow-md text-cream-900"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <User size={18} className={currentPersonaId === persona.id ? "text-cream-200" : "text-cream-400"} />
                    <h3 className="font-bold">
                      {persona.id === 'default' && (persona.name === 'Empathetic Companion' || persona.name === 'Default')
                        ? t('settings.ai.defaultPersona.name') 
                        : persona.name}
                    </h3>
                  </div>
                  {currentPersonaId === persona.id && <Check size={18} className="text-green-400" />}
                </div>
                <p className={cn("text-sm mb-3", currentPersonaId === persona.id ? "text-cream-100" : "text-cream-600")}>
                  {persona.id === 'default' ? t('settings.ai.defaultPersona.description') : persona.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-md capitalize",
                    currentPersonaId === persona.id ? "bg-white/20" : "bg-cream-100 text-cream-700"
                  )}>
                    {t(`settings.ai.styles.${persona.replyStyle}`) || persona.replyStyle}
                  </span>
                </div>
                
                <div className={cn(
                  "absolute right-2 bottom-2 transition-opacity flex gap-1",
                  currentPersonaId === persona.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(persona); }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      currentPersonaId === persona.id ? "hover:bg-white/20 text-white" : "hover:bg-cream-100 text-cream-600"
                    )}
                  >
                    <Settings2 size={14} />
                  </button>
                  {!persona.isDefault && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(persona.id); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        currentPersonaId === persona.id ? "hover:bg-red-500/50 text-white" : "hover:bg-red-100 text-red-500"
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <button 
              onClick={handleAddNew}
              className="w-full py-4 border-2 border-dashed border-cream-200 rounded-xl text-cream-400 hover:text-cream-900 hover:border-cream-400 transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              {t('settings.ai.createNew')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Diary Generation Style Card */}
      {!editingId && (
        <div className="bg-cream-50 rounded-xl border border-cream-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-cream-900" />
            <h3 className="font-bold text-lg text-cream-900">{t('settings.ai.globalStyle.title')}</h3>
          </div>
          <p className="text-sm text-cream-600 mb-4">
            {t('settings.ai.globalStyle.description')}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-cream-500 mb-1">{t('settings.ai.globalStyle.preset')}</label>
              <div className="flex gap-2">
                <select 
                  value={diarySettings.diaryStyle}
                  onChange={(e) => {
                    const styleName = e.target.value;
                    const preset = allPresets.find(p => p.name === styleName);
                    
                    let newPrompt = diarySettings.diaryStylePrompt;
                    if (preset) {
                        newPrompt = preset.prompt;
                    }

                    setDiarySettings({
                      ...diarySettings, 
                      diaryStyle: styleName,
                      diaryStylePrompt: newPrompt
                    });
                  }}
                  className="flex-1 p-2.5 bg-white border border-cream-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-300 text-sm"
                >
                  {allPresets.map(preset => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name === 'Default' ? t('settings.ai.globalStyle.defaultPreset') : preset.name}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsAddingPreset(!isAddingPreset)}
                  className="p-2.5 bg-white border border-cream-200 rounded-lg text-cream-600 hover:text-cream-900 hover:border-cream-300 transition-colors"
                  title={t('settings.ai.globalStyle.addPreset')}
                >
                  <Plus size={18} />
                </button>
                {customPresets.some(p => p.name === diarySettings.diaryStyle) && (
                   <button 
                     onClick={(e) => handleDeletePreset(diarySettings.diaryStyle, e)}
                     className="p-2.5 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                     title="Delete Current Preset"
                   >
                     <Trash2 size={18} />
                   </button>
                )}
              </div>

              {/* Add New Preset Form */}
              <AnimatePresence>
                {isAddingPreset && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-3 bg-white rounded-lg border border-cream-200 space-y-3 overflow-hidden"
                  >
                    <h4 className="text-xs font-bold text-cream-900">{t('settings.ai.globalStyle.newPresetTitle')}</h4>
                    <input 
                      placeholder={t('settings.ai.globalStyle.presetNamePlaceholder')}
                      value={newPresetForm.name}
                      onChange={e => setNewPresetForm({...newPresetForm, name: e.target.value})}
                      className="w-full p-2 bg-cream-50 border border-cream-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cream-300"
                    />
                    <textarea 
                      placeholder={t('settings.ai.globalStyle.stylePromptPlaceholder')}
                      value={newPresetForm.prompt}
                      onChange={e => setNewPresetForm({...newPresetForm, prompt: e.target.value})}
                      rows={2}
                      className="w-full p-2 bg-cream-50 border border-cream-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cream-300 resize-y"
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setIsAddingPreset(false)}
                        className="px-3 py-1.5 text-xs text-cream-600 hover:bg-cream-50 rounded"
                      >
                        {t('settings.ai.cancel')}
                      </button>
                      <button 
                        onClick={handleAddPreset}
                        disabled={!newPresetForm.name || !newPresetForm.prompt}
                        className="px-3 py-1.5 text-xs bg-cream-900 text-white rounded hover:bg-cream-800 disabled:opacity-50"
                      >
                        {t('settings.ai.globalStyle.addPreset')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-xs font-medium text-cream-500 mb-1">
                {t('settings.ai.globalStyle.wordCount')}: <span className="font-bold text-cream-900">{diarySettings.wordCount}</span> {t('settings.ai.globalStyle.words')}
              </label>
              <input 
                type="range" 
                min="100" 
                max="1000" 
                step="50"
                value={diarySettings.wordCount}
                onChange={(e) => setDiarySettings({ ...diarySettings, wordCount: parseInt(e.target.value) })}
                className="w-full h-2 bg-cream-200 rounded-lg appearance-none cursor-pointer accent-cream-900"
              />
              <div className="flex justify-between text-[10px] text-cream-400 mt-1">
                <span>100</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            {/* With AI Trace Toggle */}
            <div className="flex items-center justify-between p-3 bg-white border border-cream-200 rounded-lg">
                <div>
                    <label className="block text-xs font-bold text-cream-900 mb-0.5">{t('settings.ai.globalStyle.withAiTrace')}</label>
                    <p className="text-[10px] text-cream-500">{t('settings.ai.globalStyle.withAiTraceDesc')}</p>
                </div>
                <button 
                    onClick={() => setDiarySettings({...diarySettings, withAiTrace: !diarySettings.withAiTrace})}
                    className={cn(
                        "w-10 h-6 rounded-full transition-colors relative shrink-0",
                        diarySettings.withAiTrace ? "bg-cream-900" : "bg-cream-200"
                    )}
                >
                    <div className={cn(
                        "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm",
                        diarySettings.withAiTrace ? "left-5" : "left-1"
                    )} />
                </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-cream-500 mb-1">
                {t('settings.ai.globalStyle.stylePrompt')} 
                {diarySettings.diaryStyle !== 'Default' && <span className="text-cream-400 font-normal ml-1">{t('settings.ai.globalStyle.editable')}</span>}
              </label>
              <textarea 
                value={diarySettings.diaryStyle === 'Default' ? 'Default' : diarySettings.diaryStylePrompt}
                onChange={(e) => {
                  const newPrompt = e.target.value;
                  // Update current settings
                  setDiarySettings({
                    ...diarySettings,
                    diaryStylePrompt: newPrompt
                  });
                  
                  // Also update the custom preset if it exists
                  if (customPresets.some(p => p.name === diarySettings.diaryStyle)) {
                    setCustomPresets(prev => prev.map(p => 
                      p.name === diarySettings.diaryStyle 
                        ? { ...p, prompt: newPrompt } 
                        : p
                    ));
                  }
                }}
                disabled={diarySettings.diaryStyle === 'Default'}
                rows={3}
                className={cn(
                  "w-full p-3 bg-white border border-cream-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cream-300 text-sm resize-none",
                  diarySettings.diaryStyle === 'Default' 
                    ? "bg-cream-50 text-cream-400 cursor-not-allowed" 
                    : "text-cream-900"
                )}
                placeholder="Style instructions..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettings;