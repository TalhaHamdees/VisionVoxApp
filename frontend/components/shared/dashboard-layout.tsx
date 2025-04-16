"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { SidebarNav } from "@/components/shared/sidebar-nav"
import { Menu, X, User, LogOut, ChevronLeft, ChevronRight, Bell, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Create a context for sidebar state
interface SidebarContextType {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextType>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
})

// Hook to use sidebar context
export const useSidebar = () => useContext(SidebarContext)

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const [pageTitle, setPageTitle] = useState<{
    badge?: string
    title?: string
    description?: string
    extraContent?: React.ReactNode
  }>({})

  // Load sidebar state from localStorage on component mount
  useEffect(() => {
    // Set a default state immediately to prevent flicker
    const savedState = localStorage.getItem("sidebarCollapsed")
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true")
    }

    // Listen for storage events to sync sidebar state across tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sidebarCollapsed" && e.newValue !== null) {
        setSidebarCollapsed(e.newValue === "true")
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Extract page title information from children
  useEffect(() => {
    // This will be populated by the page components
    const handlePageTitleUpdate = (event: CustomEvent) => {
      setPageTitle(event.detail)
    }

    window.addEventListener("updatePageTitle" as any, handlePageTitleUpdate)

    return () => {
      window.removeEventListener("updatePageTitle" as any, handlePageTitleUpdate)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    // Save to localStorage to persist across page navigations
    localStorage.setItem("sidebarCollapsed", String(newState))
  }

  // Create sidebar context value
  const sidebarContextValue = {
    sidebarCollapsed,
    toggleSidebar,
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return "U"
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarContext.Provider value={sidebarContextValue}>
        <div className="min-h-screen bg-background flex overflow-hidden">
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 bg-card border-r shadow-sm transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            } ${sidebarCollapsed ? "lg:w-20" : "lg:w-64 w-72"}`}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <Link href="/" className="flex items-center">
                <div className="relative w-10 h-10 flex items-center justify-center rounded-md bg-primary/10">
                  <Image
                    src="/logo/VisionVoxLogo.png"
                    alt="VisionVox Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span
                  className={`ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                  }`}
                >
                  VisionVox
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close sidebar</span>
              </Button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
              <SidebarNav collapsed={sidebarCollapsed} />
            </div>

            {/* Collapse toggle button (desktop only) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSidebar}
                  className="absolute -right-3 top-20 hidden lg:flex items-center justify-center h-6 w-6 rounded-full border bg-background shadow-sm"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
            {/* Top navigation */}
            <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b h-16 flex items-center px-4 lg:px-6 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden mr-2 rounded-full hover:bg-muted"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>

              {/* Page title area */}
              {pageTitle.title && (
                <div className="flex-1 flex items-center">
                  {pageTitle.badge && (
                    <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary mr-3">
                      {pageTitle.badge}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">{pageTitle.title}</h1>
                    {pageTitle.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{pageTitle.description}</p>
                    )}
                  </div>
                  {pageTitle.extraContent && <div className="ml-auto">{pageTitle.extraContent}</div>}
                </div>
              )}

              <div className="ml-auto flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                      <Bell className="h-5 w-5" />
                      <span className="sr-only">Notifications</span>
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                      <Settings className="h-5 w-5" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 overflow-hidden border hover:bg-muted"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarContext.Provider>
    </TooltipProvider>
  )
}