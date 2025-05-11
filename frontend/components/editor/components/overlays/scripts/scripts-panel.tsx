import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useEditorContext } from "../../../contexts/editor-context";
import { SoundOverlay, OverlayType } from "../../../types";
import { Pencil, Save, FileText, Plus, Loader2, X, Subtitles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSidebar } from "../../../contexts/sidebar-context";

interface Script {
  audioId: number;
  title: string;
  content: string;
}

/**
 * ScriptsPanel Component
 * 
 * @component
 * @description
 * Provides an interface for managing scripts associated with audio tracks in the editor.
 * Features include:
 * - Listing all audio tracks in the project
 * - Creating, editing, and viewing scripts for each audio
 * - Auto-saving scripts
 * - Visual indication of which audio tracks have associated scripts
 *
 * The component helps users to keep track of audio content and makes it easier
 * to reference when creating captions or making edits.
 */
const ScriptsPanel: React.FC = () => {
  const { overlays } = useEditorContext();
  const { setActivePanel } = useSidebar();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newScript, setNewScript] = useState<Script | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Get all sound overlays from the editor
  const soundOverlays = overlays.filter(
    (overlay) => overlay.type === OverlayType.SOUND
  ) as SoundOverlay[];

  // Load scripts from localStorage
  useEffect(() => {
    try {
      // Check for scripts in localStorage from audio generator
      const scriptsFolder = localStorage.getItem('visionvox_scripts_folder');
      if (scriptsFolder) {
        const parsedScripts = JSON.parse(scriptsFolder);
        if (Array.isArray(parsedScripts) && parsedScripts.length > 0) {
          // Map scripts to our format, converting string audioId to number
          const mappedScripts = parsedScripts.map(script => ({
            audioId: parseInt(script.audioId),
            title: script.title || `Audio ${script.audioId}`,
            content: script.content,
          }));
          
          // Update state with these scripts 
          setScripts(prevScripts => {
            // Merge with existing scripts, avoiding duplicates
            const newScripts = [...prevScripts];
            
            mappedScripts.forEach(script => {
              const existingIndex = newScripts.findIndex(s => s.audioId === script.audioId);
              if (existingIndex === -1) {
                newScripts.push(script);
              } else {
                // Update existing script
                newScripts[existingIndex] = script;
              }
            });
            
            return newScripts;
          });
          
          console.log('Loaded scripts from localStorage:', mappedScripts);
        }
      }
      
      // Check if there's an active script to highlight
      const activeScriptId = localStorage.getItem('visionvox_active_script');
      if (activeScriptId) {
        setEditingId(parseInt(activeScriptId));
        // Clear the flag after using it
        localStorage.removeItem('visionvox_active_script');
      }
    } catch (error) {
      console.error('Error loading scripts from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    // Initialize with empty scripts for all audio tracks
    const initialScripts = soundOverlays
      .filter(overlay => !scripts.some(script => script.audioId === overlay.id))
      .map((overlay) => ({
        audioId: overlay.id,
        title: overlay.content || `Audio ${overlay.id}`,
        content: "",
      }));
    
    if (initialScripts.length > 0) {
      setScripts(prev => [...prev, ...initialScripts]);
    }
  }, [soundOverlays, scripts]);

  const handleEditScript = (audioId: number) => {
    setEditingId(audioId);
    setNewScript(null);
  };

  const handleNewScript = () => {
    // Check if there are sound overlays without scripts
    const availableAudios = soundOverlays.filter(
      overlay => !scripts.some(script => script.audioId === overlay.id)
    );
    
    if (availableAudios.length > 0) {
      const overlay = availableAudios[0];
      const newScriptObj = {
        audioId: overlay.id,
        title: overlay.content || `Audio ${overlay.id}`,
        content: "",
      };
      setNewScript(newScriptObj);
      setEditingId(overlay.id);
    }
  };

  const handleSaveScript = (audioId: number, content: string) => {
    setSaving(true);
    
    // Simulate saving with a short delay
    setTimeout(() => {
      const updatedScripts = scripts.map((script) =>
        script.audioId === audioId ? { ...script, content } : script
      );
      
      setScripts(updatedScripts);
      
      // Save to localStorage
      try {
        // Convert to format expected by localStorage
        const scriptsForStorage = updatedScripts.map(script => ({
          id: script.audioId.toString(),
          audioId: script.audioId.toString(),
          title: script.title,
          content: script.content,
          createdAt: new Date().toISOString()
        }));
        
        localStorage.setItem('visionvox_scripts_folder', JSON.stringify(scriptsForStorage));
      } catch (error) {
        console.error('Error saving scripts to localStorage:', error);
      }
      
      setEditingId(null);
      setNewScript(null);
      setSaving(false);
    }, 500);
  };

  const handleDeleteScript = (audioId: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this script?");
    if (!confirmed) return;
    
    const updatedScripts = scripts.filter(script => script.audioId !== audioId);
    setScripts(updatedScripts);
    
    // Update localStorage
    try {
      const scriptsForStorage = updatedScripts.map(script => ({
        id: script.audioId.toString(),
        audioId: script.audioId.toString(), 
        title: script.title,
        content: script.content,
        createdAt: new Date().toISOString()
      }));
      
      localStorage.setItem('visionvox_scripts_folder', JSON.stringify(scriptsForStorage));
    } catch (error) {
      console.error('Error saving scripts to localStorage:', error);
    }
    
    if (editingId === audioId) {
      setEditingId(null);
    }
  };

  // Filter scripts based on search term
  const filteredScripts = scripts.filter(script => 
    script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    script.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get audio details for a specific script
  const getAudioDetails = (audioId: number) => {
    const audio = soundOverlays.find(overlay => overlay.id === audioId);
    return {
      filename: audio?.content || `Audio ${audioId}`,
      src: audio?.src || "",
      duration: audio?.durationInFrames ? Math.round(audio.durationInFrames / 30) : 0 // Assuming 30fps
    };
  };
  
  // Add function to send script text to captions panel
  const handleGenerateCaptions = (content: string) => {
    // Store the script content in local storage for the captions panel to use
    localStorage.setItem('visionvox_temp_script', content);
    
    // Switch to captions panel
    setActivePanel(OverlayType.CAPTION);
  };

  return (
    <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-900/40">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Audio Scripts</h3>
        <Button
          size="sm"
          onClick={handleNewScript}
          disabled={soundOverlays.length === scripts.length || newScript !== null}
          className="h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Script
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search scripts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white dark:bg-gray-800/50"
        />
      </div>
      
      {soundOverlays.length === 0 && (
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
            Add audio files in the Audio panel first to create scripts.
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1 pr-3 -mr-3">
        <div className="space-y-3">
          {filteredScripts.map((script) => {
            const isEditing = editingId === script.audioId;
            const audioDetails = getAudioDetails(script.audioId);
            
            return (
              <Card key={script.audioId} className="overflow-hidden border-gray-200 dark:border-gray-700">
                <CardContent className="p-0">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{script.title}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {audioDetails.duration}s • {audioDetails.src.split('/').pop() || "Unknown file"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {!isEditing ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditScript(script.audioId)}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                          className="h-7 w-7 p-0"
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5 text-gray-500" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteScript(script.audioId)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator className="h-px bg-gray-200 dark:bg-gray-700" />
                  
                  {isEditing ? (
                    <div className="p-3">
                      <Textarea
                        placeholder="Enter script content..."
                        defaultValue={script.content}
                        className="min-h-[150px] bg-white dark:bg-gray-800/30 text-sm"
                        id={`script-${script.audioId}`}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const textarea = document.getElementById(`script-${script.audioId}`) as HTMLTextAreaElement;
                            handleSaveScript(script.audioId, textarea.value);
                          }}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      {script.content ? (
                        <div className="text-sm whitespace-pre-wrap">
                          {script.content}
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs flex items-center"
                              onClick={() => handleGenerateCaptions(script.content)}
                            >
                              <Subtitles className="h-3.5 w-3.5 mr-1" />
                              Generate Captions
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                          No script content yet. Click edit to add a script.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {filteredScripts.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No scripts matching "{searchTerm}"
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScriptsPanel; 