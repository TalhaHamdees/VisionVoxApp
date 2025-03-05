'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Image, Upload, Loader2, Download, Wand2, ZoomIn, Sparkles, RefreshCw } from 'lucide-react';

export default function ImageEnhancementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [hasEnhanced, setHasEnhanced] = useState(false);
  const [enhancementLevel, setEnhancementLevel] = useState(50);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Images',
        title: 'Image Enhancement',
        description: 'Enhance and upscale your images with AI'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  // Placeholder function for image enhancement
  const enhanceImage = async () => {
    if (!file) return;
    
    setIsEnhancing(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsEnhancing(false);
      setHasEnhanced(true);
      // For demo purposes, we'll just use the same image
      setEnhancedUrl(previewUrl);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
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
        <Tabs defaultValue="enhance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="enhance">Enhance Image</TabsTrigger>
            <TabsTrigger value="upscale">Upscale Image</TabsTrigger>
            <TabsTrigger value="restore">Restore Image</TabsTrigger>
          </TabsList>
          
          <TabsContent value="enhance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="mr-2 h-5 w-5 text-primary" />
                    Upload Image
                  </CardTitle>
                  <CardDescription>
                    Upload an image to enhance its quality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Image className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">
                        {file ? file.name : 'Drag and drop an image here, or click to browse'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports JPG, PNG, WEBP (max 10MB)
                      </p>
                    </label>
                  </div>
                  
                  {previewUrl && (
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="w-full h-auto object-contain max-h-[300px]" 
                      />
                    </div>
                  )}
                  
                  {file && (
                    <div className="flex justify-center">
                      <Button 
                        onClick={enhanceImage} 
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={isEnhancing}
                      >
                        {isEnhancing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Enhance Image
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
                    <Sparkles className="mr-2 h-5 w-5 text-primary" />
                    Enhancement Settings
                  </CardTitle>
                  <CardDescription>
                    Customize how your image will be enhanced
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="enhancement-level">Enhancement Level: {enhancementLevel}%</Label>
                    </div>
                    <Slider
                      id="enhancement-level"
                      min={0}
                      max={100}
                      step={1}
                      value={[enhancementLevel]}
                      onValueChange={(value) => setEnhancementLevel(value[0])}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="upscale" defaultChecked />
                      <Label htmlFor="upscale">Upscale Resolution</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="denoise" defaultChecked />
                      <Label htmlFor="denoise">Remove Noise</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="sharpen" defaultChecked />
                      <Label htmlFor="sharpen">Sharpen Details</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="color-correction" defaultChecked />
                      <Label htmlFor="color-correction">Color Correction</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="face-enhancement" defaultChecked />
                      <Label htmlFor="face-enhancement">Face Enhancement</Label>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {hasEnhanced && enhancedUrl && (
              <div className="mt-8">
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ZoomIn className="mr-2 h-5 w-5 text-primary" />
                      Enhanced Result
                    </CardTitle>
                    <CardDescription>
                      Compare the original and enhanced images
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="comparison">
                      <TabsList className="mb-4">
                        <TabsTrigger value="comparison">Side by Side</TabsTrigger>
                        <TabsTrigger value="original">Original</TabsTrigger>
                        <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
                      </TabsList>
                      <TabsContent value="comparison">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium mb-2 text-center">Original</p>
                            <div className="rounded-lg overflow-hidden border border-border/50">
                              <img 
                                src={previewUrl!} 
                                alt="Original" 
                                className="w-full h-auto object-contain max-h-[400px]" 
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 text-center">Enhanced</p>
                            <div className="rounded-lg overflow-hidden border border-border/50">
                              <img 
                                src={enhancedUrl} 
                                alt="Enhanced" 
                                className="w-full h-auto object-contain max-h-[400px]" 
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="original">
                        <div className="rounded-lg overflow-hidden border border-border/50">
                          <img 
                            src={previewUrl!} 
                            alt="Original" 
                            className="w-full h-auto object-contain max-h-[600px] mx-auto" 
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="enhanced">
                        <div className="rounded-lg overflow-hidden border border-border/50">
                          <img 
                            src={enhancedUrl} 
                            alt="Enhanced" 
                            className="w-full h-auto object-contain max-h-[600px] mx-auto" 
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Download className="mr-2 h-4 w-4" />
                      Download Enhanced Image
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upscale">
            {/* Placeholder for upscale content */}
          </TabsContent>

          <TabsContent value="restore">
            {/* Placeholder for restore content */}
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Card className="border border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Enhancement Examples</CardTitle>
              <CardDescription>
                See examples of our AI image enhancement in action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-2">Low Resolution to High Resolution</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Low+Res" 
                        alt="Low Resolution" 
                        className="w-full h-auto" 
                      />
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=High+Res" 
                        alt="High Resolution" 
                        className="w-full h-auto" 
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Noise Removal</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Noisy" 
                        alt="Noisy Image" 
                        className="w-full h-auto" 
                      />
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Clean" 
                        alt="Clean Image" 
                        className="w-full h-auto" 
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Color Correction</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Faded" 
                        alt="Faded Colors" 
                        className="w-full h-auto" 
                      />
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Vibrant" 
                        alt="Vibrant Colors" 
                        className="w-full h-auto" 
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Face Enhancement</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Original" 
                        alt="Original Face" 
                        className="w-full h-auto" 
                      />
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img 
                        src="https://placehold.co/400x300?text=Enhanced" 
                        alt="Enhanced Face" 
                        className="w-full h-auto" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 