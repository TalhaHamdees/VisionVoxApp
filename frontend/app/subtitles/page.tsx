'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Subtitles, Upload, Loader2, Video, Download, Settings, Type, Check } from 'lucide-react';

export default function SubtitlesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasSubtitles, setHasSubtitles] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(42);
  const [maxLinesPerSub, setMaxLinesPerSub] = useState(2);
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [autoPosition, setAutoPosition] = useState(true);
  const [translate, setTranslate] = useState(true);
  const [subtitleFile, setSubtitleFile] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [outputFile, setOutputFile] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasOutput, setHasOutput] = useState(false);

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Subtitles',
        title: 'Subtitle Generator',
        description: 'Create and edit subtitles for your videos'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  // Function for subtitle generation
  const generateSubtitles = async () => {
    if (!file) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('video', file);
      formData.append('maxCharsPerLine', maxCharsPerLine.toString());
      formData.append('maxLinesPerSub', maxLinesPerSub.toString());
      formData.append('style', selectedStyle);
      formData.append('autoPosition', autoPosition.toString());
      formData.append('translate', translate.toString());
      
      // Send request to API
      const response = await fetch('/api/subtitles?action=generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate subtitles: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSubtitleText(data.subtitles);
        setSubtitleFile(data.subtitleFile);
        setVideoFile(data.videoFile);
        setIsGenerating(false);
        setHasSubtitles(true);
      } else {
        throw new Error(data.message || 'Failed to generate subtitles');
      }
    } catch (error) {
      console.error('Error generating subtitles:', error);
      setError((error as Error).message);
      setIsGenerating(false);
    }
  };

  // Function to download subtitles
  const downloadSubtitles = () => {
    if (!subtitleFile) return;
    
    window.open(`/api/subtitles/${subtitleFile}`, '_blank');
  };

  // Function to apply subtitles to video
  const applySubtitlesToVideo = async () => {
    if (!videoFile || !subtitleFile) return;
    
    setIsApplying(true);
    setError(null);
    
    try {
      // Send request to API
      const response = await fetch('/api/subtitles?action=apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoFile,
          subtitleFile,
          style: selectedStyle,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply subtitles: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOutputFile(data.outputFile);
        setOutputUrl(data.outputUrl);
        setIsApplying(false);
        setHasOutput(true);
      } else {
        throw new Error(data.message || 'Failed to apply subtitles');
      }
    } catch (error) {
      console.error('Error applying subtitles:', error);
      setError((error as Error).message);
      setIsApplying(false);
    }
  };

  // Function to save subtitle changes
  const saveSubtitleChanges = () => {
    // In a real implementation, you would send the updated subtitles to the server
    // For now, we'll just show a success message
    alert('Subtitle changes saved successfully!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

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
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate Subtitles</TabsTrigger>
            <TabsTrigger value="edit">Edit Subtitles</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5 text-primary" />
                    Upload Video
                  </CardTitle>
                  <CardDescription>
                    Upload a video file to generate subtitles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="video-upload"
                      className="hidden"
                      accept="video/*"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="video-upload"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Video className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">
                        {file ? file.name : 'Drag and drop a video file here, or click to browse'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports MP4, MOV, AVI (max 500MB)
                      </p>
                    </label>
                  </div>
                  {file && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={generateSubtitles} 
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Subtitles...
                          </>
                        ) : (
                          <>
                            <Subtitles className="mr-2 h-4 w-4" />
                            Generate Subtitles
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Subtitle Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how your subtitles appear
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="chars-per-line">Max Characters Per Line: {maxCharsPerLine}</Label>
                    </div>
                    <Slider
                      id="chars-per-line"
                      min={20}
                      max={60}
                      step={1}
                      value={[maxCharsPerLine]}
                      onValueChange={(value) => setMaxCharsPerLine(value[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="lines-per-sub">Max Lines Per Subtitle: {maxLinesPerSub}</Label>
                    </div>
                    <Slider
                      id="lines-per-sub"
                      min={1}
                      max={3}
                      step={1}
                      value={[maxLinesPerSub]}
                      onValueChange={(value) => setMaxLinesPerSub(value[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subtitle-style">Subtitle Style</Label>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger id="subtitle-style">
                        <SelectValue placeholder="Select a style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="shadow">Shadow</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="auto-position" checked={autoPosition} onCheckedChange={setAutoPosition} />
                    <Label htmlFor="auto-position">Auto-position subtitles</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="translate" checked={translate} onCheckedChange={setTranslate} />
                    <Label htmlFor="translate">Translate subtitles</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {hasSubtitles && (
              <Card className="border border-border/50 shadow-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Type className="mr-2 h-5 w-5 text-primary" />
                    Generated Subtitles
                  </CardTitle>
                  <CardDescription>
                    Review and edit your generated subtitles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={subtitleText}
                    onChange={(e) => setSubtitleText(e.target.value)}
                    className="min-h-[200px] font-mono"
                  />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={saveSubtitleChanges}>
                      <Check className="mr-2 h-4 w-4" />
                      Apply Changes
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={downloadSubtitles}>
                      <Download className="mr-2 h-4 w-4" />
                      Download SRT
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={applySubtitlesToVideo}
                      disabled={isApplying}
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Video className="mr-2 h-4 w-4" />
                          Apply to Video
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {hasOutput && outputUrl && (
              <Card className="border border-border/50 shadow-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="mr-2 h-5 w-5 text-primary" />
                    Output Video with Subtitles
                  </CardTitle>
                  <CardDescription>
                    Your video with embedded subtitles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <video 
                      controls 
                      className="w-full h-auto"
                      src={outputUrl}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => window.open(outputUrl, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </Button>
                </CardFooter>
              </Card>
            )}

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-8">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Subtitle Style Preview</CardTitle>
                  <CardDescription>
                    Preview how your subtitles will look with different styles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="default">
                    <TabsList className="mb-4">
                      <TabsTrigger value="default">Default</TabsTrigger>
                      <TabsTrigger value="minimal">Minimal</TabsTrigger>
                      <TabsTrigger value="bold">Bold</TabsTrigger>
                      <TabsTrigger value="shadow">Shadow</TabsTrigger>
                      <TabsTrigger value="outline">Outline</TabsTrigger>
                    </TabsList>
                    <TabsContent value="default">
                      <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="bg-black/50 text-white px-4 py-1 mx-auto inline-block rounded">
                            This is how default subtitles will appear
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="minimal">
                      <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="text-white px-4 py-1 mx-auto inline-block">
                            This is how minimal subtitles will appear
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="bold">
                      <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="bg-black/50 text-white font-bold px-4 py-1 mx-auto inline-block rounded">
                            This is how bold subtitles will appear
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="shadow">
                      <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="text-white px-4 py-1 mx-auto inline-block drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            This is how shadow subtitles will appear
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="outline">
                      <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="text-white px-4 py-1 mx-auto inline-block" style={{ WebkitTextStroke: '1px black' }}>
                            This is how outline subtitles will appear
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="edit">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5 text-primary" />
                    Upload SRT File
                  </CardTitle>
                  <CardDescription>
                    Upload an existing SRT subtitle file to edit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="srt-upload"
                      className="hidden"
                      accept=".srt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setSubtitleText(event.target.result as string);
                              setHasSubtitles(true);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="srt-upload"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Subtitles className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">
                        Drag and drop an SRT file here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports SRT subtitle files
                      </p>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Editing Tools
                  </CardTitle>
                  <CardDescription>
                    Tools to help you edit subtitles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Common Operations</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        if (subtitleText) {
                          setSubtitleText(subtitleText.toUpperCase());
                        }
                      }}>
                        Convert to Uppercase
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (subtitleText) {
                          setSubtitleText(subtitleText.toLowerCase());
                        }
                      }}>
                        Convert to Lowercase
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (subtitleText) {
                          // Simple function to fix common timing issues
                          const fixed = subtitleText.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, (match, h, m, s, ms) => {
                            return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')},${ms.padStart(3, '0')}`;
                          });
                          setSubtitleText(fixed);
                        }
                      }}>
                        Fix Timing Format
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        if (subtitleText) {
                          // Simple function to add 1 second to all timestamps
                          const shifted = subtitleText.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, (match, h, m, s, ms) => {
                            let seconds = parseInt(s) + 1;
                            let minutes = parseInt(m);
                            let hours = parseInt(h);
                            
                            if (seconds >= 60) {
                              seconds = 0;
                              minutes += 1;
                            }
                            
                            if (minutes >= 60) {
                              minutes = 0;
                              hours += 1;
                            }
                            
                            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms}`;
                          });
                          setSubtitleText(shifted);
                        }
                      }}>
                        Shift +1 Second
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Find and Replace</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Find text" />
                      <Input placeholder="Replace with" />
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Replace All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {hasSubtitles && (
              <Card className="border border-border/50 shadow-sm mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Type className="mr-2 h-5 w-5 text-primary" />
                    Edit Subtitles
                  </CardTitle>
                  <CardDescription>
                    Edit your subtitles in SRT format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={subtitleText}
                    onChange={(e) => setSubtitleText(e.target.value)}
                    className="min-h-[300px] font-mono"
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      // Create a blob and download it
                      const blob = new Blob([subtitleText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'subtitles.srt';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Download SRT
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={saveSubtitleChanges}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 