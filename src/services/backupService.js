
import { format } from 'date-fns';

const APP_KEYS = [
  'chatdairy-entries',
  'user_profile',
  'ai_personas',
  'ai_current_persona_id',
  'ai_api_configs',
  'ai_current_api_config_id',
  'ai_diary_settings',
  'app_theme',
  'i18nextLng'
];

const DYNAMIC_KEY_PREFIXES = [
  'chat_messages_',
  'diary_draft_'
];

export const backupService = {
  // --- Local Storage Helpers ---

  getAllData: () => {
    const data = {};
    
    // Static Keys
    APP_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    // Dynamic Keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (DYNAMIC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key);
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      data
    };
  },

  restoreData: (backupData) => {
    if (!backupData || !backupData.data) {
      throw new Error('Invalid backup data format');
    }

    const { data } = backupData;

    // Clear existing app data to prevent conflicts/zombies
    // Note: We only clear known keys to avoid wiping other apps on localhost
    APP_KEYS.forEach(key => localStorage.removeItem(key));
    
    // Clear dynamic keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (DYNAMIC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Restore
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    });

    return true;
  },

  // --- File Backup (Local / iCloud) ---

  downloadBackup: () => {
    const backup = backupService.getAllData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatdairy-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // --- GitHub Backup ---

  /**
   * Sync to GitHub Gist
   * @param {string} token - GitHub Personal Access Token
   * @param {string} gistId - Existing Gist ID (optional)
   */
  syncToGitHubGist: async (token, gistId = null) => {
    const backup = backupService.getAllData();
    const filename = `chatdairy-backup.json`;
    const content = JSON.stringify(backup, null, 2);

    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const body = {
      description: "ChatDairy Backup",
      public: false,
      files: {
        [filename]: {
          content: content
        }
      }
    };

    let url = 'https://api.github.com/gists';
    let method = 'POST';

    if (gistId) {
      url = `https://api.github.com/gists/${gistId}`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'GitHub Sync Failed');
    }

    const result = await response.json();
    
    // Update last sync time
    localStorage.setItem('backup_last_sync', new Date().toISOString());
    
    return result;
  },

  /**
   * Restore from GitHub Gist
   * @param {string} token 
   * @param {string} gistId 
   */
  restoreFromGist: async (token, gistId) => {
    if (!token || !gistId) throw new Error('Token and Gist ID required');

    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch Gist');
    }

    const gist = await response.json();
    const file = gist.files['chatdairy-backup.json'] || Object.values(gist.files).find(f => f.language === 'JSON');

    if (!file) {
      throw new Error('No backup file found in this Gist');
    }

    // If file.truncated is true, we need to fetch raw_url
    let contentStr = file.content;
    if (file.truncated) {
      const rawRes = await fetch(file.raw_url);
      contentStr = await rawRes.text();
    }

    const data = JSON.parse(contentStr);
    return backupService.restoreData(data);
  },

  // --- Auto Backup ---

  initAutoBackup: () => {
    const checkAndSync = async () => {
      const enabled = localStorage.getItem('backup_auto_enabled') === 'true';
      if (!enabled) return;

      const token = localStorage.getItem('backup_github_token');
      const gistId = localStorage.getItem('backup_github_gist_id');
      
      if (!token) return; // Cannot sync without token

      const lastSync = localStorage.getItem('backup_last_sync');
      const now = new Date();
      
      // Sync if never synced or last sync was > 1 hour ago
      const shouldSync = !lastSync || (now - new Date(lastSync) > 60 * 60 * 1000);

      if (shouldSync) {
        console.log('[AutoBackup] Starting background sync...');
        try {
          await backupService.syncToGitHubGist(token, gistId);
          console.log('[AutoBackup] Sync successful');
        } catch (e) {
          console.error('[AutoBackup] Sync failed', e);
        }
      }
    };

    // Run check immediately
    checkAndSync();

    // Set up interval (every 30 mins)
    return setInterval(checkAndSync, 30 * 60 * 1000);
  },

  // --- Google Drive Backup (Simple Upload) ---
  // Note: This requires a valid Access Token which must be obtained via OAuth flow.
  // Since we don't have a backend to handle client secrets, we rely on the user 
  // providing a token or using a client-side implicit flow if we implement the UI for it.
  
  /**
   * Upload to Google Drive
   * @param {string} accessToken - Valid Google OAuth2 Access Token
   */
  uploadToGoogleDrive: async (accessToken) => {
    const backup = backupService.getAllData();
    const fileContent = JSON.stringify(backup, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });
    
    const metadata = {
      name: `chatdairy-backup-${format(new Date(), 'yyyy-MM-dd')}.json`,
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google Drive Upload Failed');
    }

    return await response.json();
  }
};
