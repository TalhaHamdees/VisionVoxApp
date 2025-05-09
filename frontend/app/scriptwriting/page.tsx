'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Sparkles, 
  Send, 
  Save, 
  Copy, 
  Download, 
  Loader2, 
  RefreshCw, 
  BarChart2, 
  AlertCircle,
  Volume2,
  Sliders,
  Play,
  Pause,
  VolumeX
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import React from 'react';

// API URL for script generation and audio generation
const SCRIPT_API_URL = process.env.NEXT_PUBLIC_SCRIPT_API_URL || 'http://localhost:8000';
const AUDIO_API_URL = process.env.NEXT_PUBLIC_AUDIO_API_URL || 'http://localhost:3001/api/audio';

// Define a type for saved scripts
type SavedScript = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  wordCount: number;
};

// Define a type for voice options
type Voice = {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  gender: string;
  accent: string;
  age: string;
  use_case?: string;
};

// Define a type for model options
type Model = {
  model_id: string;
  name: string;
  description: string;
  token_cost_factor: number;
};

export default function ScriptwritingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scriptTitle, setScriptTitle] = useState('');
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showSavedScripts, setShowSavedScripts] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isLoadingSavedScripts, setIsLoadingSavedScripts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Check if backend is running
  const checkBackendStatus = async () => {
    try {
      // Access the script backend using the SCRIPT_API_URL constant
      const response = await fetch(`${SCRIPT_API_URL}/health`);
      if (response.ok) {
        setIsBackendReady(true);
        setBackendError(null);
      } else {
        setIsBackendReady(false);
        setBackendError('Backend service is not responding properly.');
      }
    } catch (error) {
      console.error('Error checking backend status:', error);
      setIsBackendReady(false);
      setBackendError('Cannot connect to backend service.');
    }
  };

  // Fetch session ID for the current user
  const fetchSessionId = async () => {
    if (!user) return;
    
    try {
      // Generate a local session ID instead of calling the API
      const localSessionId = `session_${user.id}_${Date.now()}`;
      setSessionId(localSessionId);
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('visionvox_session_id', localSessionId);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session. Some features may be limited.",
        variant: "destructive",
      });
    }
  };

  // Load saved scripts from localStorage on component mount
  useEffect(() => {
    const loadSavedScripts = () => {
      const saved = localStorage.getItem('savedScripts');
      if (saved) {
        try {
          setSavedScripts(JSON.parse(saved));
        } catch (error) {
          console.error('Error parsing saved scripts:', error);
          // If there's an error parsing, initialize with empty array
          setSavedScripts([]);
        }
      }
    };

    loadSavedScripts();
  }, []);

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Scriptwriting',
        title: 'AI Script Generator',
        description: 'Create engaging, concise scripts for your videos'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  // Function to format script content for display
  const formatScriptContent = (content: string) => {
    // Remove any JSON formatting or code blocks that might have slipped through
    let cleanContent = content;
    
    // Remove markdown code blocks if present
    cleanContent = cleanContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
    
    // Remove any JSON syntax if present
    try {
      const jsonObj = JSON.parse(cleanContent);
      if (jsonObj.script_content) {
        cleanContent = jsonObj.script_content;
      }
    } catch (e) {
      // Not valid JSON, continue with current content
    }
    
    return cleanContent;
  };

  // Function to generate script using the backend API
  const generateScript = async () => {
    if (!scriptTitle || !prompt) return;
    
    setIsGenerating(true);
    
    try {
      // Show a toast notification that generation has started
      toast({
        title: "Generating Script",
        description: "This may take a few moments...",
      });
      
      const response = await fetch(`${SCRIPT_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_query: `Write a script about ${scriptTitle} with this outline: ${prompt}`,
          model: "ft:gpt-4.1-2025-04-14:personal:vvscripts:BRGxY5I9"
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate script');
      }
      
      const data = await response.json();
      const formattedContent = formatScriptContent(data.response);
      
      setScriptContent(formattedContent);
      setSessionId(data.session_id);
      setWordCount(data.word_count);
      toast({
        title: "Script Generated",
        description: `Generated a ${data.word_count} word script.`,
      });
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: "Error",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to refine the script using the backend API
  const refineScript = async () => {
    if (!refinementPrompt || !sessionId) return;
    
    setIsRefining(true);
    
    try {
      const response = await fetch(`${SCRIPT_API_URL}/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_refinement: refinementPrompt,
          session_id: sessionId,
          model: "ft:gpt-4.1-2025-04-14:personal:vvscripts:BRGxY5I9"
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refine script');
      }
      
      const data = await response.json();
      const formattedContent = formatScriptContent(data.response);
      
      setScriptContent(formattedContent);
      setWordCount(data.word_count);
      setRefinementPrompt('');
      toast({
        title: "Script Refined",
        description: "Your script has been refined based on your feedback.",
      });
    } catch (error) {
      console.error('Error refining script:', error);
      toast({
        title: "Error",
        description: "Failed to refine script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  // Function to copy script to clipboard
  const copyToClipboard = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      document.execCommand('copy');
      toast({
        title: "Copied",
        description: "Script copied to clipboard",
      });
    }
  };

  // Function to download script as a text file
  const downloadScript = () => {
    if (!scriptContent) return;
    
    const element = document.createElement('a');
    const file = new Blob([scriptContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${scriptTitle || 'script'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Downloaded",
      description: "Script downloaded as text file",
    });
  };

  // Function to save the current script
  const saveScript = () => {
    if (!scriptContent || !scriptTitle) {
      toast({
        title: "Cannot Save",
        description: "Please provide a title and generate content before saving.",
        variant: "destructive",
      });
      return;
    }

    const newScript: SavedScript = {
      id: Date.now().toString(),
      title: scriptTitle,
      content: scriptContent,
      createdAt: new Date().toISOString(),
      wordCount: wordCount || 0,
    };

    const updatedScripts = [...savedScripts, newScript];
    setSavedScripts(updatedScripts);
    
    // Save to localStorage
    localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));
    
    toast({
      title: "Saved",
      description: "Script saved successfully",
    });
  };

  // Function to load a saved script
  const loadScript = (script: SavedScript) => {
    setScriptTitle(script.title);
    setScriptContent(script.content);
    setWordCount(script.wordCount);
    setShowSavedScripts(false);
    
    toast({
      title: "Loaded",
      description: `Loaded script: ${script.title}`,
    });
  };

  // Function to delete a saved script
  const deleteScript = (id: string) => {
    const updatedScripts = savedScripts.filter(script => script.id !== id);
    setSavedScripts(updatedScripts);
    
    // Update localStorage
    localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));
    
    toast({
      title: "Deleted",
      description: "Script deleted successfully",
    });
  };

  // Function to analyze the script
  const analyzeScript = async () => {
    if (!scriptContent) {
      toast({
        title: "Cannot Analyze",
        description: "Please generate or write a script first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // For now, we'll simulate an API call with a timeout
      // In a real implementation, this would call a backend endpoint
      setTimeout(() => {
        // Simple analysis based on word count and content
        const wordCount = scriptContent.split(/\s+/).filter(Boolean).length;
        const sentences = scriptContent.split(/[.!?]+/).filter(Boolean).length;
        const avgWordsPerSentence = wordCount / sentences;
        
        // Determine readability
        let readability = "Medium";
        if (avgWordsPerSentence < 10) {
          readability = "Easy";
        } else if (avgWordsPerSentence > 20) {
          readability = "Complex";
        }
        
        // Determine tone (simplified)
        let tone = "Neutral";
        const lowerContent = scriptContent.toLowerCase();
        const excitingWords = ["amazing", "exciting", "incredible", "awesome", "fantastic"];
        const formalWords = ["therefore", "consequently", "furthermore", "moreover", "thus"];
        
        const excitingCount = excitingWords.filter(word => lowerContent.includes(word)).length;
        const formalCount = formalWords.filter(word => lowerContent.includes(word)).length;
        
        if (excitingCount > formalCount) {
          tone = "Enthusiastic";
        } else if (formalCount > excitingCount) {
          tone = "Formal";
        }
        
        // Generate strengths and suggestions
        const strengths = [];
        const suggestions = [];
        
        // Word count analysis
        if (wordCount >= 190 && wordCount <= 220) {
          strengths.push("Optimal word count for a short-form video script.");
        } else if (wordCount < 190) {
          suggestions.push("Consider adding more content to reach the optimal 190-220 word range.");
        } else {
          suggestions.push("Consider trimming content to stay within the optimal 190-220 word range.");
        }
        
        // Sentence length analysis
        if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
          strengths.push("Good sentence length variety for clear communication.");
        } else if (avgWordsPerSentence < 10) {
          suggestions.push("Consider using more complex sentences for variety.");
        } else {
          suggestions.push("Consider breaking down some longer sentences for better clarity.");
        }
        
        // Structure analysis
        if (scriptContent.includes("Introduction") || scriptContent.includes("Conclusion")) {
          strengths.push("Good script structure with clear sections.");
        } else {
          suggestions.push("Consider adding clear introduction and conclusion sections.");
        }
        
        setAnalysis({
          tone,
          readability,
          strengths,
          suggestions: suggestions.length ? suggestions : ["Your script looks good! No specific suggestions at this time."]
        });
        
        setShowAnalysis(true);
        setIsAnalyzing(false);
        
        toast({
          title: "Analysis Complete",
          description: "Script analysis is ready to view.",
        });
      }, 1500);
    } catch (error) {
      console.error('Error analyzing script:', error);
      toast({
        title: "Error",
        description: "Failed to analyze script. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  const uploadScript = () => {
    // Create a file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.md,.srt';
    
    // Handle file selection
    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          if (event.target?.result) {
            // Set the script content
            setScriptContent(event.target.result as string);
            toast({
              title: "Script Uploaded",
              description: `Successfully uploaded ${file.name}`,
            });
          }
        };
        
        reader.onerror = () => {
          toast({
            title: "Upload Failed",
            description: "Failed to read the file. Please try again.",
            variant: "destructive",
          });
        };
        
        reader.readAsText(file);
      }
    };
    
    // Trigger the file input click
    fileInput.click();
  };

  useEffect(() => {
    // Check if backend is ready
    checkBackendStatus();
    
    // Check for existing session ID in localStorage
    if (typeof window !== 'undefined' && user) {
      const storedSessionId = localStorage.getItem('visionvox_session_id');
      if (storedSessionId) {
        setSessionId(storedSessionId);
      } else {
        // Fetch session ID if user is logged in and no stored session exists
        fetchSessionId();
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-4">
        {backendError && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
            <h3 className="font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Script Generation Service Unavailable
            </h3>
            <p className="mt-1 text-sm">{backendError}</p>
            <p className="mt-2 text-sm">
              Please make sure the script backend server is running. Check the README.md for instructions.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                Generate Script
              </CardTitle>
              <CardDescription>
                Enter a title and outline to generate a script
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
                  Script Title
                </label>
                <Input
                  id="title"
                  placeholder="Enter a title for your script"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="outline" className="block text-sm font-medium text-foreground mb-1">
                  Outline
                </label>
                <Textarea
                  id="outline"
                  placeholder="Brief description of what the script should cover"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Provide a short outline of the main points you want covered in the script
                </p>
              </div>
              <div className="pt-2">
                <Button 
                  onClick={generateScript} 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!scriptTitle || !prompt || isGenerating || !isBackendReady}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Script
                    </>
                  )}
                </Button>
              </div>
              
              {sessionId && (
                <div className="pt-4 border-t border-border/50">
                  <label htmlFor="refinement" className="block text-sm font-medium text-foreground mb-1">
                    Refine Your Script
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="refinement"
                      placeholder="e.g. Make it more conversational"
                      value={refinementPrompt}
                      onChange={(e) => setRefinementPrompt(e.target.value)}
                    />
                    <Button 
                      onClick={refineScript} 
                      disabled={!refinementPrompt || isRefining}
                      variant="outline"
                    >
                      {isRefining ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide feedback to refine your script while maintaining word count (190-220 words)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Script Editor
              </CardTitle>
              <CardDescription>
                Edit your generated script or write one from scratch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                ref={textareaRef}
                placeholder="Your script will appear here..."
                className="min-h-[300px] font-mono"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="flex justify-between w-full">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadScript}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={uploadScript}>
                    <FileText className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={analyzeScript}
                    disabled={isAnalyzing || !scriptContent}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart2 className="mr-2 h-4 w-4" />
                    )}
                    Analyze
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSavedScripts(!showSavedScripts)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    My Scripts
                  </Button>
                  <Button 
                    size="sm"
                    onClick={saveScript}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
              
              {scriptContent.trim() !== '' && (
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-medium"
                  onClick={() => {
                    // Save script to localStorage for audio page
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('script_for_audio', scriptContent);
                      // Also save the script title
                      window.localStorage.setItem('script_title_for_audio', scriptTitle || 'Untitled Script');
                      toast({
                        title: "Script ready for audio generation",
                        description: "Your script has been transferred to the audio generator.",
                      });
                      router.push('/audio');
                    }
                  }}
                >
                  <Volume2 className="mr-2 h-5 w-5" />
                  Generate Audio
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Saved Scripts Dialog */}
        {showSavedScripts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">My Saved Scripts</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSavedScripts(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {savedScripts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    You haven't saved any scripts yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {savedScripts.map((script) => (
                      <div 
                        key={script.id} 
                        className="border rounded-md p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{script.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(script.createdAt).toLocaleDateString()} • {script.wordCount} words
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => loadScript(script)}
                            >
                              Load
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteScript(script.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                          {script.content.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSavedScripts(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Script Analysis Dialog */}
        {showAnalysis && analysis && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Script Analysis</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAnalysis(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Tone</h3>
                    <p className="text-2xl font-semibold text-primary">{analysis.tone}</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Readability</h3>
                    <p className="text-2xl font-semibold text-primary">{analysis.readability}</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <span className="inline-block w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2">✓</span>
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-2 mt-0.5">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
                    Suggestions for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-2 mt-0.5">!</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="p-4 border-t flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnalysis(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Script Templates</CardTitle>
              <CardDescription>
                Choose from pre-made templates to get started quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="youtube">
                <TabsList className="mb-4">
                  <TabsTrigger value="youtube">YouTube</TabsTrigger>
                  <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                  <TabsTrigger value="instagram">Instagram</TabsTrigger>
                  <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
                </TabsList>
                <TabsContent value="youtube" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Explainer Video', 'Product Review', 'Top 10 List'].map((template) => (
                      <Card 
                        key={template} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => {
                          setScriptTitle(template);
                          setPrompt(template.toLowerCase());
                          toast({
                            title: "Template Selected",
                            description: `${template} template loaded`,
                          });
                        }}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium">{template}</h3>
                          <p className="text-sm text-muted-foreground">YouTube {template.toLowerCase()} format</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tiktok" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Trending Topic', 'Tutorial', 'Story Time'].map((template) => (
                      <Card 
                        key={template} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => {
                          setScriptTitle(template);
                          setPrompt(template.toLowerCase());
                          toast({
                            title: "Template Selected",
                            description: `${template} template loaded`,
                          });
                        }}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium">{template}</h3>
                          <p className="text-sm text-muted-foreground">TikTok {template.toLowerCase()} format</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="instagram" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Reel', 'Story', 'Carousel'].map((template) => (
                      <Card 
                        key={template} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => {
                          setScriptTitle(template);
                          setPrompt(template.toLowerCase());
                          toast({
                            title: "Template Selected",
                            description: `${template} template loaded`,
                          });
                        }}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium">{template}</h3>
                          <p className="text-sm text-muted-foreground">Instagram {template.toLowerCase()} format</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="tutorial" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['Step-by-Step', 'Quick Tip', 'Comprehensive Guide'].map((template) => (
                      <Card 
                        key={template} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => {
                          setScriptTitle(template);
                          setPrompt(template.toLowerCase());
                          toast({
                            title: "Template Selected",
                            description: `${template} template loaded`,
                          });
                        }}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium">{template}</h3>
                          <p className="text-sm text-muted-foreground">Tutorial {template.toLowerCase()} format</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}