import React, { useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, BookOpen, PenTool, History, Settings, MessageCircle, Menu, PanelRightClose, PanelRightOpen, GripVertical, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLayout } from './LayoutContext';
import { useTheme } from '../../context/ThemeContext';
import MiniCalendar from '../ui/MiniCalendar';
import ChatSidebar from '../chat/ChatSidebar';

export default function DesktopLayout() {
  const { 
    isSidebarCollapsed, 
    toggleSidebar, 
    isRightSidebarOpen, 
    toggleRightSidebar,
    rightSidebarWidth,
    setRightSidebarWidth
  } = useLayout();

  const { t } = useTheme();

  const NAV_ITEMS = [
    { path: '/categories', icon: BookOpen, label: t('nav.categories') },
    { path: `/write?date=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`, icon: PenTool, label: t('nav.write') },
    { path: '/profile', icon: User, label: t('nav.profile') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const isResizingRef = useRef(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 250 && newWidth < 600) {
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setRightSidebarWidth]);

  const handleMouseDown = (e) => {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-diary-bg">
      {/* Left Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarCollapsed ? 80 : 280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col h-full bg-cream-50/50 border-r border-cream-200/60 shadow-sm relative z-20"
      >
        <div className={cn("flex items-center transition-all", isSidebarCollapsed ? "justify-center p-4" : "p-6 gap-3")}>
          <button 
            onClick={toggleSidebar}
            className={cn(
              "p-2 rounded-xl hover:bg-cream-100 text-cream-900 transition-colors",
              !isSidebarCollapsed && "-ml-2"
            )}
          >
            <div className="w-8 h-8 bg-cream-900 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
              D
            </div>
          </button>
          
          <motion.span 
            animate={{ opacity: isSidebarCollapsed ? 0 : 1, width: isSidebarCollapsed ? 0 : 'auto' }}
            className="text-xl font-bold text-cream-900 whitespace-nowrap overflow-hidden"
          >
            {t('layout.title')}
          </motion.span>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto px-4 custom-scrollbar",
          isSidebarCollapsed && "overflow-visible" // Hide scrollbar/allow tooltip overflow when collapsed
        )}>
          {/* Mini Calendar or Calendar Icon */}
          <div className="mb-6">
            {!isSidebarCollapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-visible"
              >
                <MiniCalendar />
              </motion.div>
            ) : (
              <NavLink
                to="/calendar"
                className={({ isActive }) => cn(
                  "flex items-center justify-center w-full aspect-square rounded-xl transition-all group relative",
                  isActive 
                    ? "bg-white text-cream-900 shadow-sm border border-cream-100" 
                    : "text-cream-900/60 hover:bg-cream-50 hover:text-cream-900"
                )}
              >
                <Calendar size={20} />
                <div className="absolute left-full ml-2 px-2 py-1 bg-cream-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {t('nav.calendar')}
                </div>
              </NavLink>
            )}
          </div>
          
          {/* Nav Items */}
          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                  isActive 
                    ? "bg-cream-900 text-white shadow-md" 
                    : "text-cream-600 hover:bg-cream-100 hover:text-cream-900",
                  isSidebarCollapsed && "justify-center px-2"
                )}
              >
                <item.icon size={20} strokeWidth={2} />
                
                {!isSidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}

                {/* Tooltip for collapsed state */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-cream-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-cream-200/60 mt-auto">
          {!isSidebarCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-cream-100/50 rounded-xl p-4 text-center"
            >
              <p className="text-xs text-cream-900/60 italic font-serif">
                "{t('layout.quote')}"
              </p>
            </motion.div>
          )}
        </div>
      </motion.aside>

      {/* Middle Content Area */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col h-full">
        {/* Top bar for mobile trigger or breadcrumbs if needed, keeping it clean for now */}
        <div className="flex-1 p-6 md:p-8 h-full overflow-hidden flex flex-col">
           <Outlet />
        </div>
      </main>

      {/* Right Chat Sidebar */}
      {isRightSidebarOpen && (
        <aside 
          ref={sidebarRef}
          style={{ width: rightSidebarWidth }}
          className="bg-white border-l border-cream-200 flex flex-col shadow-xl relative z-20 transition-none h-screen"
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 cursor-col-resize hover:bg-cream-300 transition-all z-30 flex items-center justify-center group"
          >
             <div className="h-8 w-1 bg-cream-300 rounded-full group-hover:bg-cream-400" />
          </div>

          <div className="p-4 border-b border-cream-200 flex items-center justify-between bg-white/50 backdrop-blur-sm">
            <h2 className="font-semibold flex items-center gap-2 text-cream-900">
              <MessageCircle size={18} />
              {t('layout.aiAssistant')}
            </h2>
            <div className="flex items-center gap-2">
               <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">{t('layout.online')}</span>
               <button onClick={toggleRightSidebar} className="p-1 hover:bg-cream-100 rounded-md text-cream-900/50 hover:text-cream-900 transition-colors">
                 <PanelRightClose size={16} />
               </button>
            </div>
          </div>
          
          <ChatSidebar />
        </aside>
      )}
    </div>
  );
}