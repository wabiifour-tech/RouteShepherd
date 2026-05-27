'use client';

import { useAppStore, type ViewType } from '@/lib/store';
import { Bus, Map, LayoutDashboard, Users, Menu, X, Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useState, useSyncExternalStore, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const roleBadgeColors: Record<string, string> = {
  passenger: 'bg-[#1B5E20] text-white',
  coordinator: 'bg-[#F9A825] text-[#1B5E20]',
  driver: 'bg-blue-600 text-white',
};

export default function NavBar() {
  const { currentView, setCurrentView, user, isAuthenticated, setUser } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  // Fetch unread notification count
  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      if (!isAuthenticated || !user) {
        if (!cancelled) setUnreadCount(0);
        return;
      }
      try {
        const res = await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Silent fail
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated, user]);

  // Build nav items based on auth state and role
  const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    { view: 'landing', label: 'Home', icon: <Bus className="h-4 w-4" /> },
  ];

  if (isAuthenticated && user) {
    if (user.role === 'passenger') {
      navItems.push({ view: 'passenger', label: 'Passenger', icon: <Users className="h-4 w-4" /> });
    }
    if (user.role === 'coordinator') {
      navItems.push({ view: 'coordinator', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> });
    }
    if (user.role === 'driver') {
      navItems.push({ view: 'driver', label: 'Driver', icon: <Map className="h-4 w-4" /> });
    }
  }

  const handleLogout = async () => {
    setUser(null);
    localStorage.removeItem('rs_user');
    setCurrentView('landing');
    try {
      await signOut({ redirect: false });
    } catch {
      // Ignore sign-out errors
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden">
            <img src="/logo-3d-premium.png" alt="RouteShepherd" className="h-9 w-9 rounded-lg object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-[#1B5E20] dark:text-[#4CAF50]">
              RouteShepherd
            </span>
            <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">
              Intelligent Transit Coordination
            </span>
          </div>
        </button>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant={currentView === item.view ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView(item.view)}
              className={cn(
                'gap-2 transition-all',
                currentView === item.view
                  ? 'bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90 dark:bg-[#2E7D32] dark:hover:bg-[#2E7D32]/90'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          {mounted && isAuthenticated && user && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => {
                // Navigate to the relevant view that shows notifications
                if (user.role === 'passenger') setCurrentView('passenger');
                else if (user.role === 'coordinator') setCurrentView('coordinator');
                else if (user.role === 'driver') setCurrentView('driver');
              }}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </Button>
          )}

          {mounted && isAuthenticated && user && (
            <div className="hidden sm:flex items-center gap-2">
              <Badge className={cn('text-xs', roleBadgeColors[user.role] || 'bg-gray-500 text-white')}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                {user.name || user.email}
              </span>
            </div>
          )}

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 p-3">
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b">
                <Badge className={cn('text-xs', roleBadgeColors[user.role] || 'bg-gray-500 text-white')}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <span className="text-sm text-muted-foreground truncate">
                  {user.name || user.email}
                </span>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-[10px] ml-auto">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            )}
            {navItems.map((item) => (
              <Button
                key={item.view}
                variant={currentView === item.view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setCurrentView(item.view);
                  setMobileOpen(false);
                }}
                className={cn(
                  'justify-start gap-2',
                  currentView === item.view
                    ? 'bg-[#1B5E20] text-white hover:bg-[#1B5E20]/90'
                    : 'text-muted-foreground'
                )}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="justify-start gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
