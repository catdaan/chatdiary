import React, { useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  Languages, 
  Palette, 
  Image as ImageIcon, 
  Code, 
  RotateCcw,
  Check,
  Upload,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function InterfaceSettings() {
  const { theme, updateTheme, resetTheme, t } = useTheme();
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateTheme({ chatBgImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const LANGUAGES = [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
    { code: 'ja-JP', name: '日本語' }
  ];

  const PRESET_COLORS = [
    { name: 'Classic Brown', primary: '#4A453E', bg: '#FDFBF7' },
    { name: 'Midnight Blue', primary: '#1e293b', bg: '#f8fafc' },
    { name: 'Forest Green', primary: '#14532d', bg: '#f0fdf4' },
    { name: 'Rose Gold', primary: '#881337', bg: '#fff1f2' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-cream-900 flex items-center gap-2">
          <Palette className="w-6 h-6 text-cream-900" />
          {t('settings.interface.title')}
        </h2>
        <button
          onClick={resetTheme}
          className="text-xs text-cream-500 hover:text-cream-900 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-cream-50 border border-transparent hover:border-cream-200"
        >
          <RotateCcw size={14} />
          {t('settings.interface.reset')}
        </button>
      </div>

      {/* Language */}
      <div className="space-y-3 mt-6">
        <h3 className="text-sm font-bold text-cream-900 flex items-center gap-2">
          <Languages size={16} />
          {t('settings.interface.language')}
        </h3>
        <div className="relative">
          <select
            value={theme.language}
            onChange={(e) => updateTheme({ language: e.target.value })}
            className="w-full appearance-none bg-white border border-cream-200 text-cream-900 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-cream-900/10 focus:border-cream-300 cursor-pointer font-medium transition-all"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-cream-400 pointer-events-none" size={16} />
        </div>
      </div>

      <div className="h-px bg-cream-200/50" />

      {/* Theme Colors */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-cream-900 flex items-center gap-2">
          <Palette size={16} />
          {t('settings.interface.theme')}
        </h3>
        
        <div className="space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-xs font-medium text-cream-500 mb-2">{t('settings.interface.presets')}</label>
            <div className="flex gap-3">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => updateTheme({ primaryColor: preset.primary, backgroundColor: preset.bg })}
                  className="group relative w-10 h-10 rounded-full border-2 border-white ring-1 ring-cream-200 shadow-sm hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: preset.bg }}
                  title={preset.name}
                >
                  <div 
                    className="absolute inset-0 rounded-full border-[4px]" 
                    style={{ borderColor: preset.primary }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-cream-500">{t('settings.interface.primaryColor')}</label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-cream-200 bg-cream-50 hover:border-cream-300 transition-colors">
                    <div 
                      className="w-6 h-6 rounded-md border border-black/10 shadow-sm"
                      style={{ backgroundColor: theme.primaryColor }} 
                    />
                    <span className="font-mono text-xs text-cream-600 uppercase">{theme.primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-cream-500">{t('settings.interface.backgroundColor')}</label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    type="color"
                    value={theme.backgroundColor}
                    onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-cream-200 bg-cream-50 hover:border-cream-300 transition-colors">
                    <div 
                      className="w-6 h-6 rounded-md border border-black/10 shadow-sm"
                      style={{ backgroundColor: theme.backgroundColor }} 
                    />
                    <span className="font-mono text-xs text-cream-600 uppercase">{theme.backgroundColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-cream-200/50" />

      {/* Chat Background */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-cream-900 flex items-center gap-2">
          <ImageIcon size={16} />
          {t('settings.interface.chatBackground')}
        </h3>
        <div className="flex items-start gap-4">
          <div 
            className="w-24 h-36 bg-cream-50 rounded-lg border-2 border-dashed border-cream-200 flex items-center justify-center overflow-hidden relative shrink-0"
            style={{ 
              backgroundImage: theme.chatBgImage ? `url(${theme.chatBgImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            {!theme.chatBgImage && <ImageIcon className="text-cream-300" size={24} />}
          </div>
          
          <div className="space-y-3 flex-1 py-1">
            <p className="text-sm text-cream-500 leading-relaxed">
              {t('settings.interface.uploadDesc')}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-cream-100 text-cream-900 text-xs font-medium rounded-lg hover:bg-cream-200 transition-colors flex items-center gap-1.5"
              >
                <Upload size={14} />
                {t('settings.interface.upload')}
              </button>
              {theme.chatBgImage && (
                <button
                  onClick={() => updateTheme({ chatBgImage: null })}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  {t('settings.interface.remove')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-cream-200/50" />

      {/* Custom CSS */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-cream-900 flex items-center gap-2">
          <Code size={16} />
          {t('settings.interface.customCss')}
        </h3>
        <div className="space-y-2">
          <p className="text-xs text-cream-500">
            {t('settings.interface.customCssDesc')}
          </p>
          <textarea
            value={theme.bubbleCss}
            onChange={(e) => updateTheme({ bubbleCss: e.target.value })}
            placeholder={`.message-user { \n  border-radius: 16px;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n}`}
            className="w-full h-32 p-3 bg-cream-50 text-cream-900 font-mono text-xs rounded-xl outline-none focus:ring-2 focus:ring-cream-400 resize-none custom-scrollbar border border-cream-200"
          />
        </div>
      </div>
    </div>
  );
}