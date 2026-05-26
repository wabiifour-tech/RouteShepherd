'use client';

import { useAppStore, type ViewType } from '@/lib/store';
import { Bus, Map, LayoutDashboard, Users, Menu, X, Moon, Sun } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
  { view: 'landing', label: 'Home', icon: <Bus className="h-4 w-4" /> },
  { view: 'passenger', label: 'Passenger', icon: <Users className="h-4 w-4" /> },
  { view: 'coordinator', label: 'Coordinator', icon: <LayoutDashboard className="h-4 w-4" /> },
  { view: 'driver', label: 'Driver', icon: <Map className="h-4 w-4" /> },
];

export default function NavBar() {
  const { currentView, setCurrentView } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B5E20]">
            <Bus className="h-5 w-5 text-[#F9A825]" />
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
          </div>
        </div>
      )}
    </nav>
  );
}
