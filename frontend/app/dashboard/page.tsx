'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { FileVideo, FolderPlus, HardDrive, Import, Layers, Loader2, Plus, User, Video, VideoIcon, FileText, BarChart3, Subtitles, Music, Image } from 'lucide-react';

// Define the Stats interface
interface Stats {
  totalScripts: number;
  totalAudio: number;
  totalVideos: number;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
  }>;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalScripts: 0,
    totalAudio: 0,
    totalVideos: 0,
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Dashboard',
        title: 'Creator Dashboard',
        description: 'Overview of your content creation activities'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground flex items-center">
                  <FileVideo className="mr-2 h-5 w-5 text-primary" />
                  Recent Projects
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Add project</span>
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">Your recently edited video projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
                <VideoIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">You don't have any recent projects.</p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/editor')}
                  className="border-border text-foreground hover:bg-accent"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Project
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground flex items-center">
                  <HardDrive className="mr-2 h-5 w-5 text-primary" />
                  Account Stats
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">Your account usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Storage Used:</span>
                    <span className="font-medium">0 MB / 1 GB</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg border border-border/50 bg-card p-4">
                    <div className="text-muted-foreground text-sm mb-1">Projects</div>
                    <div className="text-2xl font-bold">0</div>
                  </div>
                  
                  <div className="rounded-lg border border-border/50 bg-card p-4">
                    <div className="text-muted-foreground text-sm mb-1">Exports</div>
                    <div className="text-2xl font-bold">0</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground flex items-center">
                <Layers className="mr-2 h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-muted-foreground">Common tasks you can perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 justify-start"
                onClick={() => router.push('/editor')}
              >
                <Video className="mr-2 h-4 w-4" />
                New Video Project
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-border text-foreground hover:bg-accent justify-start"
                onClick={() => router.push('/scriptwriting')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Script
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-border text-foreground hover:bg-accent justify-start"
                onClick={() => router.push('/analyzer')}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Performance
              </Button>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-4">Speed Up Your Editing Workflow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/scriptwriting')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <FileText className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Scriptwriting</h3>
              <p className="text-sm text-muted-foreground">Create engaging scripts with AI assistance</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/editor')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Video className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Video Editor</h3>
              <p className="text-sm text-muted-foreground">Edit videos with our smart web-based editor</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/analyzer')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Performance Analyzer</h3>
              <p className="text-sm text-muted-foreground">Analyze YouTube video performance metrics</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/subtitles')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Subtitles className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Subtitle Generator</h3>
              <p className="text-sm text-muted-foreground">Generate and customize video subtitles</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/audio')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Music className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Audio Generator</h3>
              <p className="text-sm text-muted-foreground">Generate AI voiceovers and enhance audio</p>
            </CardContent>
          </Card>

          <Card 
            className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => router.push('/image-enhancement')}
          >
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Image className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-medium text-lg mb-1">Image Enhancement</h3>
              <p className="text-sm text-muted-foreground">Enhance image quality with AI</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 