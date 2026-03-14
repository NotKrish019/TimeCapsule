import { Outlet, NavLink } from 'react-router-dom';
import { Home, PlusCircle, Bookmark, MessageSquare, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { userProfile } = useAuth();
  
  const navItems = [
    { to: '/', name: 'Feed', icon: Home, end: true },
    { to: '/ask', name: 'Ask Senior', icon: MessageSquare },
    { to: '/post', name: 'Post', icon: PlusCircle, isPrimary: true },
    { to: '/notices', name: 'Notices', icon: ClipboardList },
    { to: '/saved', name: 'Saved', icon: Bookmark },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-brand-cream)] text-[var(--color-brand-charcoal)] font-sans pb-20 md:pb-0 md:pl-64 flex w-full">
      {/* Sidebar Navigation for Desktop */}
      <nav className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-md border-r border-gray-200 fixed top-0 bottom-0 left-0 p-6 z-50">
        <h1 className="text-2xl font-serif font-bold text-[var(--color-brand-green)] mb-10 text-center uppercase tracking-wider">Time Capsule</h1>
        
        <div className="flex flex-col gap-4 flex-grow">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end || false}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-all
                ${item.isPrimary ? 'bg-[var(--color-brand-lavender)] text-[var(--color-brand-charcoal)] border border-[var(--color-brand-charcoal)] shadow-sm font-semibold' : ''}
                ${isActive && !item.isPrimary ? 'bg-[var(--color-brand-green)] text-white' : ''}
                ${!isActive && !item.isPrimary ? 'hover:bg-gray-100/80 text-gray-700' : ''}`
              }
            >
              <item.icon size={22} className={item.isPrimary ? 'stroke-[2.5px]' : ''}/>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        {/* Profile Link Desktop */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `mt-auto flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-colors
            ${isActive ? 'bg-[var(--color-brand-green)] text-white' : 'hover:bg-gray-100/80 text-gray-700'}`
          }
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center shrink-0">
            <User size={18} className="text-gray-500" />
          </div>
          <div className="flex flex-col overflow-hidden text-left py-1">
            <span className="text-sm font-semibold truncate leading-tight">{userProfile?.name || 'Student'}</span>
            <span className="text-xs truncate opacity-80 leading-tight">{userProfile?.department || ''}</span>
          </div>
        </NavLink>
      </nav>

      {/* Mobile Top Header */}
      <header className="md:hidden flex h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 fixed top-0 left-0 right-0 z-40 items-center justify-between px-4">
        <h1 className="text-lg font-serif font-bold text-[var(--color-brand-green)] uppercase tracking-wider">Time Capsule</h1>
        <NavLink to="/profile" className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          <User size={18} className="text-gray-500" />
        </NavLink>
      </header>

      {/* Main Content Area */}
      <main className="w-full h-full min-h-screen pt-14 md:pt-0 max-w-[1400px] mx-auto px-4 sm:px-6">
        <Outlet />
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden flex fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2">
        <div className="flex justify-between items-center w-full h-[60px]">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end || false}
              style={{ flexBasis: '20%' }}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors
                ${isActive && !item.isPrimary ? 'text-[var(--color-brand-green)]' : ''}
                ${!isActive && !item.isPrimary ? 'text-gray-500' : ''}
                ${item.isPrimary ? 'relative -top-3' : ''}`
              }
            >
              {/* Use a render function pattern to avoid isActive scope issue */}
              {item.isPrimary ? (
                <div className="bg-[var(--color-brand-lavender)] border border-[var(--color-brand-charcoal)] rounded-full w-12 h-12 flex items-center justify-center shadow-sm">
                  <item.icon size={26} className="text-[var(--color-brand-charcoal)] stroke-[2.5px]" />
                </div>
              ) : (
                <>
                  <item.icon size={22} />
                  <span className="text-[10px] sm:text-xs font-medium tracking-tight whitespace-nowrap">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
