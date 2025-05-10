"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import dynamic from "next/dynamic"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Save, FileDown, FilePlus, FolderOpen, ChevronDown, Settings, HelpCircle, Share2, Download, Upload, History } from 'lucide-react'

import RenderControls from "../rendering/render-controls"
import { useEditorContext } from "../../contexts/editor-context"
import type { ProjectState } from "../../hooks/use-project-persistence"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Dynamic import of the ThemeToggle component to enable client-side rendering only.
 * This prevents hydration mismatches since theme detection requires browser APIs.
 */
const ThemeToggleClient = dynamic(() => import("@/components/theme-toggle").then((mod) => mod.ThemeToggle), {
  ssr: false,
})

/**
 * EditorHeader component renders the top navigation bar of the editor interface.
 */
export function EditorHeader() {
  /**
   * Destructure required values from the editor context
   */
  const {
    renderMedia,
    state,
    saveProject,
    loadProject,
    newProject,
    currentProjectName,
    setCurrentProjectName,
    isNewProject,
    getRecentProjects,
  } = useEditorContext()

  // State for dialogs
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false)
  const [projectNameInput, setProjectNameInput] = useState("")
  const [recentProjects, setRecentProjects] = useState<ProjectState[]>([])

  // Handle save button click
  const handleSaveClick = () => {
    if (isNewProject) {
      // Show save dialog for new projects
      setProjectNameInput(currentProjectName)
      setIsSaveDialogOpen(true)
    } else {
      // Save existing project directly
      saveProject()
    }
  }

  // Handle save dialog confirm
  const handleSaveConfirm = () => {
    if (projectNameInput.trim()) {
      saveProject(projectNameInput.trim())
      setIsSaveDialogOpen(false)
    }
  }

  // Handle open projects dialog
  const handleOpenClick = () => {
    setRecentProjects(getRecentProjects())
    setIsOpenDialogOpen(true)
  }

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    loadProject(projectId)
    setIsOpenDialogOpen(false)
  }

// Update the header component
return (
  <TooltipProvider delayDuration={300}>
    <header className="sticky top-0 flex shrink-0 items-center gap-2 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-3 py-1.5 z-50">
      {/* Logo and project name section */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-gray-700 dark:text-gray-300" />

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-md bg-gray-900 dark:bg-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 8V16L12 20L20 16V8L12 4L4 8Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:stroke-black"
                />
              </svg>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">VideoEditor</span>
          </div>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
              {currentProjectName}
            </span>
            {isNewProject && (
              <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 h-4">
                Unsaved
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Project actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleSaveClick}>
              <Save className="h-3 w-3" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save project</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Project options</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={handleSaveClick} className="gap-2 text-xs py-1.5">
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
              <div className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">⌘S</div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setProjectNameInput(currentProjectName)
                setIsSaveDialogOpen(true)
              }}
              className="gap-2 text-xs py-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Save As...</span>
              <div className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">⇧⌘S</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={newProject} className="gap-2 text-xs py-1.5">
              <FilePlus className="h-3.5 w-3.5" />
              <span>New Project</span>
              <div className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">⌘N</div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenClick} className="gap-2 text-xs py-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Open Project</span>
              <div className="ml-auto text-[10px] text-gray-500 dark:text-gray-400">⌘O</div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs py-1.5">
              <Download className="h-3.5 w-3.5" />
              <span>Export Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs py-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span>Import Project</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs py-1.5">
              <History className="h-3.5 w-3.5" />
              <span>Project History</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spacer to push items to the right */}
      <div className="flex-grow" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help & documentation</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <ThemeToggleClient />

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Media rendering controls */}
        <RenderControls handleRender={renderMedia} state={state} />
      </div>

      {/* Save Project Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
            <DialogDescription>Enter a name for your project.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              placeholder="Project name"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfirm}>Save Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Project Dialog */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Open Project</DialogTitle>
            <DialogDescription>Select a project to open.</DialogDescription>
          </DialogHeader>
          <div className="py-3 max-h-[350px] overflow-y-auto">
            {recentProjects.length > 0 ? (
              <div className="space-y-1.5">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-200 dark:border-gray-800"
                    onClick={() => handleProjectSelect(project.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Last modified: {format(new Date(project.lastModified), "MMM d, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-md">
                <FolderOpen className="h-6 w-6 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">No saved projects found</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  Create a new project and save it to see it here
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpenDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  </TooltipProvider>
)
}
