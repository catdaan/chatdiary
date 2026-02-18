
import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, HardDrive, Download, Upload, Github, Save, RefreshCw, Check, AlertCircle, 
  Trash2, Database, ChevronDown, ChevronUp, Info, Clock, ArrowDownCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { backupService } from '../../services/backupService';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';

const BackupItem = ({ 
  icon: Icon, 
  title, 
  description, 
  isOpen, 
  onToggle, 
  children, 
  isDanger = false,
  statusBadge = null
}) => {
  return (
    <div className={cn(
      "border rounded-xl overflow-hidden transition-all duration-200",
      isOpen 
        ? "border-cream-300 bg-cream-50/50 shadow-sm" 
        : "border-cream-200 hover:border-cream-300 bg-white"
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2.5 rounded-lg transition-colors",
            isDanger 
              ? "bg-red-50 text-red-500" 
              : isOpen ? "bg-cream-200 text-cream-900" : "bg-cream-100 text-cream-600"
          )}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className={cn(
              "font-bold text-base",
              isDanger ? "text-red-600" : "text-cream-900"
            )}>
              {title}
            </h3>
            {description && (
              <p className={cn(
                "text-sm mt-0.5",
                isDanger ? "text-red-400" : "text-cream-500"
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {statusBadge}
          <div className={cn(
            "transition-transform duration-200 text-cream-400",
            isOpen && "rotate-180"
          )}>
            <ChevronDown size={20} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={cn(
              "px-4 pb-4 pt-0",
              isDanger ? "text-red-600" : "text-cream-900"
            )}>
              <div className={cn(
                "pt-4 border-t",
                isDanger ? "border-red-100" : "border-cream-100"
              )}>
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BackupSettings = () => {
  const { t } = useTranslation();
  // --- UI State ---
  const [openSection, setOpenSection] = useState('local'); // 'local', 'github', 'gdrive', 'reset'

  // --- Local Backup State ---
  const fileInputRef = useRef(null);
  
  // --- GitHub State ---
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('backup_github_token') || '');
  const [githubGistId, setGithubGistId] = useState(() => localStorage.getItem('backup_github_gist_id') || '');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => localStorage.getItem('backup_auto_enabled') === 'true');
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [isRestoringGithub, setIsRestoringGithub] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState(null);

  // --- Google Drive State ---
  const [gdriveToken, setGdriveToken] = useState(() => localStorage.getItem('backup_gdrive_token') || '');
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('backup_github_token', githubToken);
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem('backup_github_gist_id', githubGistId);
  }, [githubGistId]);

  useEffect(() => {
    localStorage.setItem('backup_auto_enabled', autoBackupEnabled);
  }, [autoBackupEnabled]);

  useEffect(() => {
    localStorage.setItem('backup_gdrive_token', gdriveToken);
  }, [gdriveToken]);

  // --- Handlers ---
  const handleDownload = async () => {
    try {
      await backupService.downloadBackup();
    } catch (e) {
      console.error(e);
      alert(t('settings.backup.local.downloadError'));
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (confirm(t('settings.backup.local.restoreConfirm'))) {
        await backupService.restoreData(data);
        alert(t('settings.backup.local.restoreSuccess'));
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      alert(t('settings.backup.local.restoreError'));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGithubSync = async () => {
    if (!githubToken) {
      setGithubSyncStatus({ type: 'error', message: t('settings.backup.github.tokenRequired') });
      return;
    }
    setIsSyncingGithub(true);
    setGithubSyncStatus(null);
    try {
      const result = await backupService.syncToGitHubGist(githubToken, githubGistId || null);
      if (result.id) setGithubGistId(result.id);
      setGithubSyncStatus({ type: 'success', message: t('settings.backup.github.syncSuccess') });
    } catch (e) {
      console.error(e);
      setGithubSyncStatus({ type: 'error', message: e.message });
    } finally {
      setIsSyncingGithub(false);
    }
  };

  const handleGithubRestore = async () => {
    if (!githubToken || !githubGistId) {
      setGithubSyncStatus({ type: 'error', message: t('settings.backup.github.tokenAndGistRequired') });
      return;
    }
    if (!confirm(t('settings.backup.github.restoreConfirm'))) return;

    setIsRestoringGithub(true);
    setGithubSyncStatus(null);
    try {
      await backupService.restoreFromGist(githubToken, githubGistId);
      alert(t('settings.backup.local.restoreSuccess'));
      window.location.reload();
    } catch (e) {
      console.error(e);
      setGithubSyncStatus({ type: 'error', message: t('settings.backup.github.restoreError', { error: e.message }) });
    } finally {
      setIsRestoringGithub(false);
    }
  };

  const handleDriveUpload = async () => {
    if (!gdriveToken) {
      setDriveStatus({ type: 'error', message: t('settings.backup.github.tokenRequired') });
      return;
    }
    setIsUploadingDrive(true);
    setDriveStatus(null);
    try {
      await backupService.uploadToGoogleDrive(gdriveToken);
      setDriveStatus({ type: 'success', message: t('settings.backup.gdrive.success') });
    } catch (e) {
      console.error(e);
      setDriveStatus({ type: 'error', message: t('settings.backup.gdrive.error', { error: e.message }) });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-cream-900 flex items-center gap-2">
          <Database className="text-cream-900" />
          {t('settings.backup.title')}
        </h2>
      </div>

      <div className="space-y-4">
        
        {/* Local / iCloud */}
        <BackupItem
          icon={HardDrive}
          title={t('settings.backup.local.title')}
          description={t('settings.backup.local.description')}
          isOpen={openSection === 'local'}
          onToggle={() => toggleSection('local')}
        >
          <div className="space-y-4">
            <p className="text-sm text-cream-600 bg-cream-50 p-3 rounded-lg border border-cream-100 flex gap-2">
              <Info size={16} className="text-cream-400 shrink-0 mt-0.5" />
              <span>
                <Trans i18nKey="settings.backup.local.info" components={{ strong: <strong /> }} />
              </span>
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={handleDownload}
                className="flex-1 min-w-[160px] py-3 bg-cream-900 hover:bg-cream-800 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download size={18} />
                {t('settings.backup.local.download')}
              </button>

              <div className="relative flex-1 min-w-[160px]">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-white border border-cream-200 hover:bg-cream-50 text-cream-900 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Upload size={18} />
                  {t('settings.backup.local.restore')}
                </button>
              </div>
            </div>
          </div>
        </BackupItem>

        {/* GitHub */}
        <BackupItem
          icon={Github}
          title={t('settings.backup.github.title')}
          description={t('settings.backup.github.description')}
          isOpen={openSection === 'github'}
          onToggle={() => toggleSection('github')}
          statusBadge={githubGistId && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium flex items-center gap-1">
              <Check size={12} /> {t('settings.backup.github.linked')}
            </span>
          )}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-cream-900">{t('settings.backup.github.pat')}</label>
              <input 
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300 font-mono text-sm"
              />
              <p className="text-xs text-cream-500">
                <Trans i18nKey="settings.backup.github.patHelp" components={{ code: <code /> }} /> <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cream-900 underline hover:text-cream-700">{t('settings.backup.github.getToken')}</a>
              </p>
            </div>

            {githubGistId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-cream-900">{t('settings.backup.github.gistId')}</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={githubGistId}
                    readOnly
                    className="flex-1 p-3 bg-cream-100 border border-cream-200 rounded-xl text-cream-500 font-mono text-sm"
                  />
                  <button 
                    onClick={() => setGithubGistId('')}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title={t('settings.backup.github.unlink')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Auto Backup Toggle */}
            <div className="flex items-center justify-between p-3 bg-cream-50 rounded-xl border border-cream-100">
                <div className="flex items-center gap-3">
                    <Clock className="text-cream-500" size={20} />
                    <div>
                        <span className="text-sm font-medium text-cream-900 block">{t('settings.backup.github.autoBackup')}</span>
                        <span className="text-xs text-cream-500">{t('settings.backup.github.autoBackupHelp')}</span>
                    </div>
                </div>
                <button 
                    onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                    className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        autoBackupEnabled ? "bg-cream-900" : "bg-cream-200"
                    )}
                >
                    <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        autoBackupEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={handleGithubSync}
                disabled={isSyncingGithub || !githubToken}
                className="flex-1 py-3 bg-cream-900 hover:bg-cream-800 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSyncingGithub ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                {githubGistId ? t('settings.backup.github.sync') : t('settings.backup.github.create')}
              </button>

              <button 
                onClick={handleGithubRestore}
                disabled={isRestoringGithub || !githubToken || !githubGistId}
                className="flex-1 py-3 bg-white border border-cream-200 hover:bg-cream-50 disabled:opacity-50 text-cream-900 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isRestoringGithub ? <RefreshCw className="animate-spin" size={18} /> : <ArrowDownCircle size={18} />}
                {t('settings.backup.github.import')}
              </button>
            </div>
              
            {githubSyncStatus && (
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                  githubSyncStatus.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                )}>
                  {githubSyncStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  {githubSyncStatus.message}
                </div>
              )}
          </div>
        </BackupItem>

        {/* Google Drive */}
        <BackupItem
          icon={Cloud}
          title={t('settings.backup.gdrive.title')}
          description={t('settings.backup.gdrive.description')}
          isOpen={openSection === 'gdrive'}
          onToggle={() => toggleSection('gdrive')}
        >
           <div className="space-y-4">
             <div className="p-3 bg-cream-50 text-cream-600 rounded-lg text-sm flex gap-2 border border-cream-100">
               <Info size={16} className="shrink-0 mt-0.5 text-cream-400" />
               <p>
                 <Trans i18nKey="settings.backup.gdrive.info" components={{ strong: <strong /> }} />
               </p>
             </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-cream-900">{t('settings.backup.gdrive.token')}</label>
              <input 
                type="password"
                value={gdriveToken}
                onChange={(e) => setGdriveToken(e.target.value)}
                placeholder="ya29..."
                className="w-full p-3 bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cream-300 font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={handleDriveUpload}
                disabled={isUploadingDrive || !gdriveToken}
                className="flex-1 py-3 bg-cream-900 hover:bg-cream-800 disabled:opacity-50 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isUploadingDrive ? <RefreshCw className="animate-spin" size={18} /> : <Cloud size={18} />}
                {t('settings.backup.gdrive.upload')}
              </button>

              {driveStatus && (
                <div className={cn(
                  "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                  driveStatus.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                )}>
                  {driveStatus.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                  {driveStatus.message}
                </div>
              )}
            </div>
          </div>
        </BackupItem>

        {/* Reset */}
        <BackupItem
          icon={Trash2}
          title={t('settings.backup.reset.title')}
          description={t('settings.backup.reset.description')}
          isOpen={openSection === 'reset'}
          onToggle={() => toggleSection('reset')}
          isDanger={true}
        >
          <div className="space-y-4">
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
              <Trans i18nKey="settings.backup.reset.warning" components={{ strong: <strong /> }} />
            </p>
            <button 
              onClick={() => {
                if (confirm(t('settings.backup.reset.confirmAlert'))) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              {t('settings.backup.reset.confirmBtn')}
            </button>
          </div>
        </BackupItem>

      </div>
    </div>
  );
};

export default BackupSettings;
