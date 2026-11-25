import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  Bell,
  Bot,
  Calculator,
  CalendarClock,
  Home,
  LayoutDashboard,
  Leaf,
  Menu,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { CityLocation, PageId } from '../types/airwise.ts';
import { Logo } from './Logo.tsx';

interface WorkspaceLayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  location: CityLocation;
  unreadAlertsCount: number;
  children: ReactNode;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Smart AQI Dashboard', icon: LayoutDashboard },
  { id: 'assistant', label: 'AI Family Assistant', icon: Bot },
  { id: 'routine', label: 'Daily Routine Planner', icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Air Optimizer', icon: ShieldCheck },
  { id: 'sustainability', label: 'Sustainability Hub', icon: Leaf },
  { id: 'calculator', label: 'Carbon Calculator', icon: Calculator },
  { id: 'insights', label: 'Pollution Insights', icon: TrendingUp },
  { id: 'community', label: 'Community Hub', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings & Privacy', icon: Settings },
];

export function WorkspaceLayout({
  activePage,
  onNavigate,
  location,
  unreadAlertsCount,
  children,
}: WorkspaceLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const currentItem = NAV_ITEMS.find((i) => i.id === activePage) ?? NAV_ITEMS[0];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  function handleCloseDrawer() {
    setMobileMenuOpen(false);
    menuTriggerRef.current?.focus();
  }

  function handleNav(page: PageId) {
    onNavigate(page);
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#102A43] lg:flex">
      <a
        href="#main-workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#102A43] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
      >
        Skip to workspace content
      </a>

      <span className="sr-only" aria-live="polite">
        Active section: {currentItem.label} for {location.name}
      </span>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white"
        aria-label="Workspace Navigation"
      >
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Logo onClick={() => handleNav('landing')} />
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Workspace sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                  active
                    ? 'bg-[#102A43] text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-[#102A43]'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? 'text-[#20C997]' : 'text-slate-600'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.id === 'notifications' && unreadAlertsCount > 0 && (
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                    }`}
                    aria-label={`${unreadAlertsCount} unread alerts`}
                  >
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
          >
            <Home className="h-4 w-4 text-slate-600" aria-hidden="true" />
            <span>Back to Overview</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div
            className="fixed inset-0 bg-[#102A43]/40 backdrop-blur-xs"
            onClick={handleCloseDrawer}
          />
          <div
            ref={drawerRef}
            className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <Logo onClick={() => handleNav('landing')} />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleCloseDrawer}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Mobile workspace sections">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                      active
                        ? 'bg-[#102A43] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadAlertsCount > 0 && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-amber-900">
                        {unreadAlertsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => handleNav('landing')}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Back to Overview</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden text-slate-600 sm:inline">Workspace</span>
              <span className="hidden text-slate-400 sm:inline" aria-hidden="true">/</span>
              <h1 className="font-display text-base font-bold text-[#102A43] truncate sm:text-lg">
                {currentItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>{location.name}, {location.countryCode}</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('assistant')}
              className="rounded-lg bg-[#102A43] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] whitespace-nowrap shrink-0"
            >
              Ask AI Assistant
            </button>
          </div>
        </header>

        <main
          id="main-workspace"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
