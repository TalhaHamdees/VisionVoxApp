import { useState, useEffect, useCallback } from 'react';
import { Overlay, AspectRatio } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Define the project state interface
export interface ProjectState {
  id: string;
  name: string;
  overlays: Overlay[];
  currentFrame: number;
  aspectRatio: AspectRatio;
  lastModified: Date;
  thumbnail?: string;
  type: 'video';
}

// Define the return type for the hook
interface UseProjectPersistenceReturn {
  saveProject: (name?: string) => string;
  loadProject: (projectId: string) => ProjectState | null;
  autoSave: () => void;
  getRecentProjects: () => ProjectState[];
  currentProjectId: string | null;
  currentProjectName: string;
  setCurrentProjectName: (name: string) => void;
  isNewProject: boolean;
}

/**
 * Custom hook for project persistence
 * Handles saving, loading, and auto-saving project state
 */
export const useProjectPersistence = (
  overlays: Overlay[],
  currentFrame: number,
  aspectRatio: AspectRatio
): UseProjectPersistenceReturn => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string>('Untitled Project');
  const [isNewProject, setIsNewProject] = useState<boolean>(true);
  const [lastSavedState, setLastSavedState] = useState<string>('');

  // Initialize project on component mount
  useEffect(() => {
    // Check URL for project ID
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('projectId');
    
    if (projectId) {
      // Try to load the project
      const loadedProject = loadProject(projectId);
      if (loadedProject) {
        setCurrentProjectId(projectId);
        setCurrentProjectName(loadedProject.name);
        setIsNewProject(false);
      } else {
        // Project not found, create a new one
        initializeNewProject();
      }
    } else {
      // No project ID in URL, create a new one
      initializeNewProject();
    }
    
    // Set up auto-save interval
    const autoSaveInterval = setInterval(() => {
      autoSave();
    }, 60000); // Auto-save every minute
    
    return () => {
      clearInterval(autoSaveInterval);
    };
  }, []);

  // Initialize a new project
  const initializeNewProject = useCallback(() => {
    const newId = uuidv4();
    setCurrentProjectId(newId);
    setCurrentProjectName('Untitled Project');
    setIsNewProject(true);
    
    // Update URL with new project ID
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', newId);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Save current project state
  const saveProject = useCallback((name?: string): string => {
    if (!currentProjectId) return '';
    
    // Create project state object
    const projectState: ProjectState = {
      id: currentProjectId,
      name: name || currentProjectName,
      overlays,
      currentFrame,
      aspectRatio,
      lastModified: new Date(),
      type: 'video'
    };
    
    // Try to generate a thumbnail (in a real implementation)
    // This would capture the current frame from the video player
    
    // Save to localStorage
    try {
      // Update project name if provided
      if (name) {
        setCurrentProjectName(name);
      }
      
      // Save project data
      localStorage.setItem(`visionvox_project_${currentProjectId}`, JSON.stringify(projectState));
      
      // Update project list
      const projectList = getProjectList();
      if (!projectList.includes(currentProjectId)) {
        projectList.push(currentProjectId);
        localStorage.setItem('visionvox_project_list', JSON.stringify(projectList));
      }
      
      // Update last saved state hash for comparison
      setLastSavedState(JSON.stringify(overlays));
      
      // Mark as existing project
      setIsNewProject(false);
      
      return currentProjectId;
    } catch (error) {
      console.error('Error saving project:', error);
      return '';
    }
  }, [currentProjectId, currentProjectName, overlays, currentFrame, aspectRatio]);

  // Auto-save function
  const autoSave = useCallback(() => {
    // Only auto-save if there are changes
    const currentStateHash = JSON.stringify(overlays);
    if (currentStateHash !== lastSavedState && currentProjectId) {
      saveProject();
    }
  }, [saveProject, overlays, lastSavedState, currentProjectId]);

  // Load a project by ID
  const loadProject = useCallback((projectId: string): ProjectState | null => {
    try {
      const projectData = localStorage.getItem(`visionvox_project_${projectId}`);
      if (!projectData) return null;
      
      const projectState: ProjectState = JSON.parse(projectData);
      
      // Update URL with project ID
      const url = new URL(window.location.href);
      url.searchParams.set('projectId', projectId);
      window.history.replaceState({}, '', url.toString());
      
      return projectState;
    } catch (error) {
      console.error('Error loading project:', error);
      return null;
    }
  }, []);

  // Get list of project IDs
  const getProjectList = useCallback((): string[] => {
    try {
      const projectList = localStorage.getItem('visionvox_project_list');
      return projectList ? JSON.parse(projectList) : [];
    } catch (error) {
      console.error('Error getting project list:', error);
      return [];
    }
  }, []);

  // Get recent projects with metadata
  const getRecentProjects = useCallback((): ProjectState[] => {
    try {
      const projectIds = getProjectList();
      const projects: ProjectState[] = [];
      
      for (const id of projectIds) {
        const projectData = localStorage.getItem(`visionvox_project_${id}`);
        if (projectData) {
          const project: ProjectState = JSON.parse(projectData);
          projects.push(project);
        }
      }
      
      // Sort by last modified date (newest first)
      return projects.sort((a, b) => 
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      );
    } catch (error) {
      console.error('Error getting recent projects:', error);
      return [];
    }
  }, [getProjectList]);

  return {
    saveProject,
    loadProject,
    autoSave,
    getRecentProjects,
    currentProjectId,
    currentProjectName,
    setCurrentProjectName,
    isNewProject
  };
}; 