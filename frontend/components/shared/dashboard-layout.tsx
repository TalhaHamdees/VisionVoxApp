'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { SidebarNav } from '@/components/shared/sidebar-nav';
import { Menu, X, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Create a context for sidebar state
interface SidebarContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
});

// Hook to use sidebar context
export const useSidebar = () => useContext(SidebarContext);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState<{
    badge?: string;
    title?: string;
    description?: string;
    extraContent?: React.ReactNode;
  }>({});

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    // Set a default state immediately to prevent flicker
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
    
    // Listen for storage events to sync sidebar state across tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed' && e.newValue !== null) {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Extract page title information from children
  useEffect(() => {
    // This will be populated by the page components
    const handlePageTitleUpdate = (event: CustomEvent) => {
      setPageTitle(event.detail);
    };

    window.addEventListener('updatePageTitle' as any, handlePageTitleUpdate);
    
    return () => {
      window.removeEventListener('updatePageTitle' as any, handlePageTitleUpdate);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    // Save to localStorage to persist across page navigations
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  // Create sidebar context value
  const sidebarContextValue = {
    sidebarCollapsed,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <div className="min-h-screen bg-background flex">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 bg-card border-r transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            sidebarCollapsed ? 'lg:w-20' : 'w-64'
          }`}
        >
          <div className="h-16 flex items-center justify-between px-4 border-b">
            <Link href="/" className="flex items-center">
              <Image 
                src="/logo/VisionVoxLogo.png" 
                alt="VisionVox Logo" 
                width={40} 
                height={40} 
                className="mr-2"
              />
              <span 
                className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-in-out ${
                  sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                }`}
              >
                VisionVox
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>
          <div className="p-4">
            <SidebarNav collapsed={sidebarCollapsed} />
          </div>
          
          {/* Collapse toggle button (desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="absolute right-0 top-20 transform translate-x-1/2 hidden lg:flex items-center justify-center h-8 w-8 rounded-full border bg-background shadow-sm"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          {/* Top navigation */}
          <header className="sticky top-0 z-30 bg-background border-b h-16 flex items-center px-4 lg:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden mr-2"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open sidebar</span>
            </Button>

            {/* Page title area */}
            {pageTitle.title && (
              <div className="flex-1 flex items-center">
                {pageTitle.badge && (
                  <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary mr-3">
                    {pageTitle.badge}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{pageTitle.title}</h1>
                  {pageTitle.description && (
                    <p className="text-sm text-muted-foreground">{pageTitle.description}</p>
                  )}
                </div>
                {pageTitle.extraContent && (
                  <div className="ml-auto">{pageTitle.extraContent}</div>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
} 