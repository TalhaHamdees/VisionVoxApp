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

  // Placeholder function for subtitle generation
  const generateSubtitles = async () => {
    if (!file) return;
    
    setIsGenerating(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const demoSubtitles = `00:00:01,000 --> 00:00:04,000
Hello and welcome to this video about AI video editing.

00:00:04,500 --> 00:00:08,000
Today we're going to explore how artificial intelligence
is transforming the way we create content.

00:00:08,500 --> 00:00:12,000
Let's start by looking at some of the key features
that make AI video editors so powerful.`;
      
      setSubtitleText(demoSubtitles);
      setIsGenerating(false);
      setHasSubtitles(true);
    }, 2000);
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
                    <Switch id="auto-position" />
                    <Label htmlFor="auto-position">Auto-position subtitles</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="translate" />
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
                    <Button variant="outline" size="sm">
                      <Check className="mr-2 h-4 w-4" />
                      Apply Changes
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download SRT
                    </Button>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Video className="mr-2 h-4 w-4" />
                      Apply to Video
                    </Button>
                  </div>
                </CardFooter>
              </Card>
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
            {/* Placeholder for edit content */}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 