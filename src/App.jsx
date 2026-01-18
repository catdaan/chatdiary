import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import TimelinePage from './pages/TimelinePage';
import DiaryEntryPage from './pages/DiaryEntryPage';
import CategoriesPage from './pages/CategoriesPage';
import WritePage from './pages/WritePage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import { DiaryProvider } from './context/DiaryContext';
import { AIProvider } from './context/AIContext';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <DiaryProvider>
      <UserProvider>
        <AIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/write" replace />} />
                <Route path="calendar" element={<TimelinePage />} />
                <Route path="date/:date" element={<DiaryEntryPage />} />
                <Route path="diary/:id" element={<DiaryEntryPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="write" element={<WritePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </HashRouter>
        </AIProvider>
      </UserProvider>
    </DiaryProvider>
  );
}

export default App;
