import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Book, PenTool, History, Settings, X, MessageCircle, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLayout } from './LayoutContext';
import ChatSidebar from '../chat/ChatSidebar';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/categories', icon: Book, label: 'Categories' },
  { path: '/write', icon: PenTool, label: 'Write', isPrimary: true },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileLayout() {
  const { isRightSidebarOpen, toggleRightSidebar } = useLayout();

  return (
    <div className="flex flex-col h-[100dvh] bg-diary-bg text-cream-900 font-sans relative overflow-hidden supports-[height:100dvh]:h-[100dvh]">
      <main className="flex-1 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))] px-4 pt-[calc(1rem+env(safe-area-inset-top))] scroll-smooth">
        <Outlet />
      </main>

      {/* Right Sidebar Overlay */}
      <AnimatePresence>
        {isRightSidebarOpen && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={toggleRightSidebar}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                />
                <motion.aside
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 flex flex-col"
                >
                     <div className="p-4 border-b border-cream-200 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                        <h2 className="font-semibold flex items-center gap-2 text-cream-900">
                          <MessageCircle size={18} />
                          AI Assistant
                        </h2>
                        <button onClick={toggleRightSidebar} className="p-2 hover:bg-cream-100 rounded-full text-cream-900/50 hover:text-cream-900 transition-colors">
                             <X size={20} />
                        </button>
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <ChatSidebar />
                     </div>
                </motion.aside>
            </>
        )}
      </AnimatePresence>

      {/* Floating Card Navigation */}
      <nav className="fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl z-40">
        <div className="flex justify-center items-center h-16 px-1 gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center w-full h-full transition-all duration-300",
                isActive ? "text-cream-900" : "text-cream-900/40 hover:text-cream-900/60",
                item.isPrimary && "text-cream-900"
              )}
            >
              {({ isActive }) => (
                <>
                  {item.isPrimary ? (
                    <div className={cn(
                      "absolute -top-6 bg-cream-900 text-white p-3.5 rounded-full shadow-lg shadow-cream-900/20 transition-transform duration-300",
                      isActive && "scale-110"
                    )}>
                      <item.icon size={24} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-all" />
                      {isActive && (
                         <span className="w-1 h-1 bg-cream-900 rounded-full animate-in fade-in zoom-in" />
                      )}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
