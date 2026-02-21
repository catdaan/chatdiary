import React, { useState, useRef } from 'react';
import { 
  Settings2, Save, X, Plus, Trash2, Check, User, Server, Globe, 
  Settings, Sparkles, Key, Database, Download, Upload, RefreshCw
} from 'lucide-react';
import { useAI } from '../context/AIContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import AISettings from '../components/settings/AISettings';
import InterfaceSettings from '../components/settings/InterfaceSettings';
import BackupSettings from '../components/settings/BackupSettings';
import UsageGuide from '../components/settings/UsageGuide';
import { useTranslation } from 'react-i18next';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com' },
  { id: 'google', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com' },
  { id: 'custom', name: 'Custom / Local', baseUrl: '' }
];

const ApiSettings = () => {
  const { t } = useTranslation();
  const { 
    apiConfigs, currentApiConfigId, setCurrentApiConfigId,
    addApiConfig, updateApiConfig, deleteApiConfig, fetchModels
  } = useAI();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo'
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleEdit = (config) => {
    setEditingId(config.id);
    setEditForm({
      name: config.name,
      provider: config.provider || (config.type === 'official' ? 'openai' : 'custom'), // Fallback for old data
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model || 'gpt-3.5-turbo'
    });
    setAvailableModels([]); // Reset models on edit
  };

  const handleSave = () => {
    const providerConfig = PROVIDERS.find(p => p.id === editForm.provider);
    const finalBaseUrl = editForm.provider === 'custom' ? editForm.baseUrl : providerConfig.baseUrl;

    const configData = {
      ...editForm,
      type: editForm.provider === 'custom' ? 'custom' : 'official', // Maintain backward compatibility or simplify
      baseUrl: finalBaseUrl
    };

    if (editingId === 'new') {
      addApiConfig(configData);
    } else {
      updateApiConfig(editingId, configData);
    }
    setEditingId(null);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      name: t('settings.api.addNew'),
      provider: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo'
    });
    setAvailableModels([]);
  };

  const handleProviderChange = (e) => {
    const newProviderId = e.target.value;
    const providerConfig = PROVIDERS.find(p => p.id === newProviderId);
    setEditForm({
      ...editForm,
      provider: newProviderId,
      baseUrl: providerConfig.id === 'custom' ? '' : providerConfig.baseUrl,
      name: editingId === 'new' ? providerConfig.name : editForm.name
    });
  };

  const handleFetchModels = async () => {
    if (!editForm.apiKey) {
      alert(t('settings.api.pleaseEnterApiKey'));
      return;
    }
    setIsLoadingModels(true);
    try {
      const models = await fetchModels({
        baseUrl: editForm.baseUrl,
        apiKey: editForm.apiKey,
        provider: editForm.provider
      });
      setAvailableModels(models);
      if (models.length > 0) {
        setEditForm(prev => ({ ...prev, model: models[0].id }));
      }
    } catch (error) {
      alert(t('settings.api.failedToFetchModels', { error: error.message }));
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-cream-900 flex items-center gap-2">
          <Server className="text-cream-900" />
          {t('settings.api.title')}
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
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.api.configName')}</label>
              <input 
                value={editForm.name}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
                placeholder={t('settings.api.myApi')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.api.provider')}</label>
              <select
                value={editForm.provider}
                onChange={handleProviderChange}
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">
                {t('settings.api.apiKey')}
                {editForm.provider === 'google' && (
                  <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    Free Tier Available
                  </span>
                )}
              </label>
              <input 
                type="password"
                value={editForm.apiKey}
                onChange={e => setEditForm({...editForm, apiKey: e.target.value})}
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
                placeholder="sk-..."
              />
              <div className="mt-1 text-xs text-cream-500 flex justify-end">
                {editForm.provider === 'openai' && (
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="hover:text-cream-900 underline decoration-cream-300 underline-offset-2 transition-colors">
                    Get OpenAI API Key &rarr;
                  </a>
                )}
                {editForm.provider === 'deepseek' && (
                  <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="hover:text-cream-900 underline decoration-cream-300 underline-offset-2 transition-colors">
                    Get DeepSeek API Key &rarr;
                  </a>
                )}
                {editForm.provider === 'google' && (
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="hover:text-cream-900 underline decoration-cream-300 underline-offset-2 transition-colors">
                    Get Free Gemini API Key &rarr;
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.api.baseUrl')}</label>
              <input 
                value={editForm.baseUrl}
                onChange={e => setEditForm({...editForm, baseUrl: e.target.value})}
                disabled={editForm.provider !== 'custom'}
                className={cn(
                  "w-full p-3 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300",
                  editForm.provider !== 'custom' ? "bg-cream-100 text-cream-400 cursor-not-allowed" : "bg-cream-50"
                )}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cream-900 mb-1">{t('settings.api.model')}</label>
              <div className="flex gap-2">
                {availableModels.length > 0 ? (
                  <select
                    value={editForm.model}
                    onChange={e => setEditForm({...editForm, model: e.target.value})}
                    className="flex-1 p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
                  >
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>{model.id}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    value={editForm.model}
                    onChange={e => setEditForm({...editForm, model: e.target.value})}
                    className="flex-1 p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300"
                    placeholder={t('settings.api.modelPlaceholder')}
                  />
                )}
                <button
                  onClick={handleFetchModels}
                  disabled={isLoadingModels || !editForm.apiKey}
                  className="px-4 py-2 bg-cream-100 text-cream-900 rounded-xl hover:bg-cream-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={t('settings.api.fetchModels')}
                >
                  <RefreshCw size={18} className={isLoadingModels ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-cream-900 text-white rounded-xl hover:bg-cream-800 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {t('settings.api.saveConfig')}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-3 bg-cream-100 text-cream-900 rounded-xl hover:bg-cream-200 transition-colors font-medium"
              >
                {t('settings.api.cancel')}
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
            {apiConfigs.map(config => (
              <div 
                key={config.id}
                onClick={() => setCurrentApiConfigId(config.id)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all relative group",
                  config.id === currentApiConfigId
                    ? "bg-cream-900 text-white border-cream-900 shadow-lg scale-[1.02]"
                    : "bg-white border-cream-200 hover:border-cream-300 hover:shadow-md text-cream-900"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Server size={18} className={config.id === currentApiConfigId ? "text-cream-200" : "text-cream-400"} />
                    <h3 className="font-bold">{config.name}</h3>
                  </div>
                  {config.id === currentApiConfigId && <Check size={18} className="text-green-400" />}
                </div>
                
                <div className="mb-3">
                  <p className={cn("text-sm font-mono", config.id === currentApiConfigId ? "text-cream-100" : "text-cream-600")}>
                    {config.baseUrl || 'https://api.openai.com/v1'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md uppercase tracking-wider font-medium",
                      config.id === currentApiConfigId ? "bg-white/20" : "bg-cream-100 text-cream-700"
                    )}>
                      {config.provider}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-md font-mono",
                      config.id === currentApiConfigId ? "bg-white/10 text-cream-200" : "bg-cream-50 text-cream-500 border border-cream-100"
                    )}>
                      {config.model}
                    </span>
                  </div>
                </div>

                <div className="absolute right-2 bottom-2 flex gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(config); }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      config.id === currentApiConfigId ? "hover:bg-white/20 text-white" : "hover:bg-cream-100 text-cream-600"
                    )}
                  >
                    <Settings2 size={14} />
                  </button>
                  {apiConfigs.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteApiConfig(config.id); }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        config.id === currentApiConfigId ? "hover:bg-red-500/50 text-white" : "hover:bg-red-100 text-red-500"
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
              {t('settings.api.addNew')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteApiConfig(deleteId);
            if (editingId === deleteId) setEditingId(null);
          }
        }}
        title={t('settings.api.deleteConfirmTitle')}
        message={t('settings.api.deleteConfirmMessage')}
        confirmText={t('settings.api.delete')}
        isDangerous={true}
      />
    </div>
  );
};

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <div className="p-4 h-full overflow-y-auto custom-scrollbar pb-20">
      <h1 className="text-2xl font-bold text-cream-900 mb-6">{t('settings.title')}</h1>
      
      <div className="space-y-8 max-w-3xl">
        <ApiSettings />
        <AISettings />
        <InterfaceSettings />
        <BackupSettings />
        <UsageGuide />
      </div>
    </div>
  );
}