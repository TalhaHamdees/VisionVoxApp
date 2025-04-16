import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Save, FileDown, FilePlus, FolderOpen, MoreVertical, ChevronDown } from "lucide-react";

import RenderControls from "../rendering/render-controls";
import { useEditorContext } from "../../contexts/editor-context";
import { ProjectState } from "../../hooks/use-project-persistence";
import { format } from "date-fns";

/**
 * Dynamic import of the ThemeToggle component to enable client-side rendering only.
 * This prevents hydration mismatches since theme detection requires browser APIs.
 */
const ThemeToggleClient = dynamic(
  () => import("@/components/theme-toggle").then((mod) => mod.ThemeToggle),
  { ssr: false }
);

/**
 * EditorHeader component renders the top navigation bar of the editor interface.
 *
 * @component
 * @description
 * This component provides the main navigation and control elements at the top of the editor:
 * - A sidebar trigger button for showing/hiding the sidebar
 * - Project name and save controls
 * - A theme toggle switch for light/dark mode
 * - Rendering controls for media export
 *
 * The header is sticky-positioned at the top of the viewport and includes
 * responsive styling for both light and dark themes.
 *
 * @example
 * ```tsx
 * <EditorHeader />
 * ```
 *
 * @returns {JSX.Element} A header element containing navigation and control components
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
    getRecentProjects
  } = useEditorContext();
  
  // State for dialogs
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [recentProjects, setRecentProjects] = useState<ProjectState[]>([]);
  
  // Handle save button click
  const handleSaveClick = () => {
    if (isNewProject) {
      // Show save dialog for new projects
      setProjectNameInput(currentProjectName);
      setIsSaveDialogOpen(true);
    } else {
      // Save existing project directly
      saveProject();
    }
  };
  
  // Handle save dialog confirm
  const handleSaveConfirm = () => {
    if (projectNameInput.trim()) {
      saveProject(projectNameInput.trim());
      setIsSaveDialogOpen(false);
    }
  };
  
  // Handle open projects dialog
  const handleOpenClick = () => {
    setRecentProjects(getRecentProjects());
    setIsOpenDialogOpen(true);
  };
  
  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    loadProject(projectId);
    setIsOpenDialogOpen(false);
  };

  return (
    <header
      className="sticky top-0 flex shrink-0 items-center gap-2 
      bg-white dark:bg-gray-900/10
      border-l 
      border-b border-gray-200 dark:border-gray-800
      p-2.5 px-4"
    >
      {/* Sidebar toggle button with theme-aware styling */}
      <SidebarTrigger className="-ml-1 text-gray-700 dark:text-gray-300" />

      {/* Vertical separator for visual organization */}
      <Separator orientation="vertical" className="mr-2 h-5" />
      
      {/* Project name and controls */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
          {currentProjectName}
        </span>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1"
          onClick={handleSaveClick}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleSaveClick} className="gap-2">
              <Save className="h-4 w-4" />
              <span>Save</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setProjectNameInput(currentProjectName);
              setIsSaveDialogOpen(true);
            }} className="gap-2">
              <FileDown className="h-4 w-4" />
              <span>Save As...</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={newProject} className="gap-2">
              <FilePlus className="h-4 w-4" />
              <span>New Project</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenClick} className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>Open Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Theme toggle component (client-side only) */}
      <ThemeToggleClient />

      {/* Spacer to push rendering controls to the right */}
      <div className="flex-grow" />

      {/* Media rendering controls */}
      <RenderControls handleRender={renderMedia} state={state} />
      
      {/* Save Project Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
            <DialogDescription>
              Enter a name for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
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
            <Button onClick={handleSaveConfirm}>
              Save Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Open Project Dialog */}
      <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Open Project</DialogTitle>
            <DialogDescription>
              Select a project to open.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto">
            {recentProjects.length > 0 ? (
              <div className="space-y-2">
                {recentProjects.map((project) => (
                  <div 
                    key={project.id}
                    className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleProjectSelect(project.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last modified: {format(new Date(project.lastModified), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No saved projects found.
              </p>
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
  );
}
