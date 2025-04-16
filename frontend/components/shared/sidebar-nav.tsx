import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  FileText,
  BarChart3,
  Video,
  Subtitles,
  Music,
  Image,
  User,
  Home,
  Settings,
  Layers
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from './dashboard-layout';

const modules = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    name: 'Scriptwriting',
    href: '/scriptwriting',
    icon: FileText
  },
  {
    name: 'Video Editor',
    href: '/editor',
    icon: Video
  },
  {
    name: 'Performance Analyzer',
    href: '/analyzer',
    icon: BarChart3
  },
  {
    name: 'Subtitle Generator',
    href: '/subtitles',
    icon: Subtitles
  },
  {
    name: 'Audio Generator',
    href: '/audio',
    icon: Music
  },
  {
    name: 'Image Enhancement',
    href: '/image-enhancement',
    icon: Image
  },
  {
    name: 'My Projects',
    href: '/projects',
    icon: Layers
  },
  {
    name: 'Account',
    href: '/account',
    icon: User
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

// We'll keep the props interface for backward compatibility
interface SidebarNavProps {
  collapsed?: boolean;
}

export function SidebarNav({ collapsed: propCollapsed }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Use the sidebar context to get the collapsed state
  const { sidebarCollapsed } = useSidebar();
  
  // Use the context value, but fall back to props if context is not available
  const collapsed = sidebarCollapsed ?? propCollapsed ?? false;

  // Handle navigation while preserving sidebar state
  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    
    // Use router.push to navigate programmatically
    // This preserves the sidebar state via localStorage and context
    router.push(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="space-y-1">
        {modules.map((module) => {
          const Icon = module.icon;
          const isActive = pathname === module.href;
          
          return (
            <Tooltip key={module.href} delayDuration={collapsed ? 300 : 9999999}>
              <TooltipTrigger asChild>
                <Link
                  href={module.href}
                  onClick={(e) => handleNavigation(e, module.href)}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ease-in-out',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-300 ease-in-out",
                    collapsed ? "" : "mr-3"
                  )} />
                  {!collapsed && (
                    <span className="transition-opacity duration-300 ease-in-out">
                      {module.name}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={collapsed ? "opacity-100" : "opacity-0"}>
                {module.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}