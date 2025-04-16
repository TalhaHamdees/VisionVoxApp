"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import {
  FileVideo,
  HardDrive,
  Layers,
  Loader2,
  Plus,
  Video,
  VideoIcon,
  FileText,
  BarChart3,
  Subtitles,
  Music,
  Image,
  Clock,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
  Lightbulb,
  TrendingUp,
  Bell,
} from "lucide-react"
import { format } from "date-fns"

// Define the Stats interface
interface Stats {
  totalScripts: number
  totalAudio: number
  totalVideos: number
  storageUsed: number
  storageLimit: number
  exports: number
  recentActivity: Array<{
    id: string
    type: string
    title: string
    date: Date
    action?: string
  }>
}

// Project interface
interface Project {
  id: string
  name: string
  type: "video" | "script" | "audio" | "image"
  updatedAt: Date
  createdAt: Date
  thumbnail?: string
  description?: string
}

// Tips for content creators
const creatorTips = [
  {
    title: "Optimize Video Length",
    description: "Videos between 7-15 minutes tend to perform best for engagement.",
    icon: <Clock className="h-5 w-5 text-primary" />,
  },
  {
    title: "Use Custom Thumbnails",
    description: "Custom thumbnails can increase click-through rates by up to 30%.",
    icon: <Image className="h-5 w-5 text-primary" />,
  },
  {
    title: "Script Your Content",
    description: "Pre-scripted videos are more concise and have better pacing.",
    icon: <FileText className="h-5 w-5 text-primary" />,
  },
  {
    title: "Analyze Performance",
    description: "Regularly check analytics to understand what content resonates.",
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
  },
]

// Function to get projects from localStorage
const getProjectsFromStorage = (): Project[] => {
  try {
    // Get project list from localStorage
    const projectList = localStorage.getItem('visionvox_project_list');
    if (!projectList) return [];
    
    const projectIds = JSON.parse(projectList) as string[];
    const projects: Project[] = [];
    
    // Load each project's data
    for (const id of projectIds) {
      const projectData = localStorage.getItem(`visionvox_project_${id}`);
      if (projectData) {
        const projectState = JSON.parse(projectData);
        
        // Convert to Project format
        projects.push({
          id: projectState.id,
          name: projectState.name,
          type: projectState.type,
          thumbnail: projectState.thumbnail || '',
          createdAt: new Date(projectState.lastModified),
          updatedAt: new Date(projectState.lastModified),
          description: `${projectState.overlays?.length || 0} overlays`
        });
      }
    }
    
    return projects;
  } catch (error) {
    console.error('Error loading projects from localStorage:', error);
    return [];
  }
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalScripts: 0,
    totalAudio: 0,
    totalVideos: 0,
    storageUsed: 0,
    storageLimit: 1024, // 1GB in MB
    exports: 0,
    recentActivity: []
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchUserData();
    }
  }, [user, loading, router]);

  // Function to fetch user data from the backend
  const fetchUserData = async () => {
    setIsLoading(true);
    
    try {
      // Load projects from localStorage
      const loadedProjects = getProjectsFromStorage();
      setRecentProjects(loadedProjects);
      
      // Count project types
      const videoProjects = loadedProjects.filter(p => p.type === 'video').length;
      const scriptProjects = loadedProjects.filter(p => p.type === 'script').length;
      const audioProjects = loadedProjects.filter(p => p.type === 'audio').length;
      
      // Calculate storage usage (in a real app, this would come from the backend)
      // For now, we'll estimate based on project count
      const estimatedStorageUsed = loadedProjects.length * 5; // 5MB per project estimate
      
      // Set stats based on loaded projects
      setStats({
        totalScripts: scriptProjects,
        totalAudio: audioProjects,
        totalVideos: videoProjects,
        storageUsed: estimatedStorageUsed,
        storageLimit: 1024, // 1GB in MB
        exports: Math.floor(loadedProjects.length / 2), // Estimate exports as half of projects
        recentActivity: loadedProjects.slice(0, 4).map(project => ({
          id: project.id,
          type: project.type,
          title: project.name,
          date: project.updatedAt,
          action: 'edited'
        }))
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      // Set empty stats on error
      setStats({
        totalScripts: 0,
        totalAudio: 0,
        totalVideos: 0,
        storageUsed: 0,
        storageLimit: 1024,
        exports: 0,
        recentActivity: []
      });
      
      setRecentProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Get time of day for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'script': return <FileText className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  // Get color for activity badge
  const getActivityColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'script': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'audio': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'image': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Get project icon based on type
  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'script': return <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'audio': return <Music className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'image': return <Image className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default: return <Layers className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Calculate storage percentage
  const getStoragePercentage = () => {
    if (stats.storageLimit === 0) return 0;
    return (stats.storageUsed / stats.storageLimit) * 100;
  };

  // Format storage size
  const formatStorage = (sizeInMB: number) => {
    if (sizeInMB < 1) return '0 MB';
    if (sizeInMB < 1024) return `${sizeInMB.toFixed(1)} MB`;
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

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
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-2/3">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
                {getGreeting()}, {user.name.split(' ')[0]}!
              </h1>
              <p className="text-muted-foreground text-lg">
                Welcome to your VisionVox dashboard. Here's an overview of your content creation journey.
              </p>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Video Projects</p>
                      <p className="text-3xl font-bold">{stats.totalVideos}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Scripts</p>
                      <p className="text-3xl font-bold">{stats.totalScripts}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Audio Files</p>
                      <p className="text-3xl font-bold">{stats.totalAudio}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Projects */}
            <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-foreground flex items-center">
                    <FileVideo className="mr-2 h-5 w-5 text-primary" />
                    Recent Projects
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm gap-1 font-medium hover:bg-accent"
                    onClick={() => router.push('/projects')}
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-muted-foreground">
                  Your recently edited projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                      <Loader2 className="h-8 w-8 text-primary animate-spin relative" />
                    </div>
                  </div>
                ) : recentProjects.length > 0 ? (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <div 
                        key={project.id}
                        className="flex items-center p-4 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-primary/20 transition-all cursor-pointer group"
                        onClick={() => {
                          switch (project.type) {
                            case 'video': router.push('/editor'); break;
                            case 'script': router.push('/scriptwriting'); break;
                            case 'audio': router.push('/audio'); break;
                            case 'image': router.push('/image-enhancement'); break;
                          }
                        }}
                      >
                        <div className="mr-4">
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                            {getProjectIcon(project.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-primary transition-colors">{project.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated {format(project.updatedAt, 'MMM d, yyyy')}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-10 text-center">
                    <div className="bg-background p-4 rounded-full inline-flex mb-4 shadow-sm">
                      <VideoIcon className="h-10 w-10 text-primary/60" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No recent projects</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Create your first project to get started with VisionVox's powerful content creation tools.
                    </p>
                    <Button
                      onClick={() => router.push('/editor')}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="w-full md:w-1/3 space-y-8">
            {/* Account Stats */}
            <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-foreground flex items-center">
                  <HardDrive className="mr-2 h-5 w-5 text-primary" />
                  Account Stats
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your account usage statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground font-medium">Storage Used:</span>
                      <span className="font-medium">{formatStorage(stats.storageUsed)} / {formatStorage(stats.storageLimit)}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <Progress 
                        value={getStoragePercentage()} 
                        className={`h-full ${getStoragePercentage() > 80 ? 'bg-red-500' : 'bg-primary'}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      {(100 - getStoragePercentage()).toFixed(1)}% available
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="rounded-lg border border-border/50 bg-card p-4 hover:border-primary/20 transition-colors">
                      <div className="text-muted-foreground text-sm mb-1 font-medium">Projects</div>
                      <div className="text-2xl font-bold">{stats.totalVideos + stats.totalScripts + stats.totalAudio}</div>
                    </div>
                    
                    <div className="rounded-lg border border-border/50 bg-card p-4 hover:border-primary/20 transition-colors">
                      <div className="text-muted-foreground text-sm mb-1 font-medium">Exports</div>
                      <div className="text-2xl font-bold">{stats.exports}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Activity Timeline */}
            <Card className="border border-border/50 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your latest actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                      <Loader2 className="h-8 w-8 text-primary animate-spin relative" />
                    </div>
                  </div>
                ) : stats.recentActivity.length > 0 ? (
                  <div className="relative space-y-5">
                    {stats.recentActivity.map((activity, index) => (
                      <div key={activity.id} className="flex">
                        <div className="mr-4 relative">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          {index < stats.recentActivity.length - 1 && (
                            <div className="absolute top-10 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pt-1 pb-5">
                          <p className="font-medium">{activity.title}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <span className="capitalize">{activity.action}</span>
                            <span className="mx-1">•</span>
                            <span>{format(activity.date, 'MMM d, h:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4">
                    <div className="bg-background p-3 rounded-full inline-flex mb-3 shadow-sm">
                      <Bell className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                    <p className="text-sm text-muted-foreground">
                      Your activity will appear here as you work on projects.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-5 flex items-center">
            <Zap className="mr-2 h-6 w-6 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="h-auto py-6 px-5 bg-primary text-primary-foreground hover:bg-primary/90 justify-start shadow-sm hover:shadow-md transition-all"
              onClick={() => router.push('/editor')}
            >
              <Video className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-medium text-base">New Video</div>
                <div className="text-xs opacity-90 mt-1">Create a video project</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-6 px-5 border-border text-foreground hover:bg-accent justify-start shadow-sm hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => router.push('/scriptwriting')}
            >
              <FileText className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-medium text-base">New Script</div>
                <div className="text-xs opacity-90 mt-1">Write a new script</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-6 px-5 border-border text-foreground hover:bg-accent justify-start shadow-sm hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => router.push('/audio')}
            >
              <Music className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-medium text-base">Generate Audio</div>
                <div className="text-xs opacity-90 mt-1">Create AI voiceovers</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto py-6 px-5 border-border text-foreground hover:bg-accent justify-start shadow-sm hover:shadow-md transition-all hover:border-primary/20"
              onClick={() => router.push('/projects')}
            >
              <Layers className="mr-3 h-6 w-6" />
              <div className="text-left">
                <div className="font-medium text-base">All Projects</div>
                <div className="text-xs opacity-90 mt-1">View your projects</div>
              </div>
            </Button>
          </div>
        </div>
        
        {/* Tools Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-5 flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-primary" />
            Content Creation Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card 
              className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/20"
              onClick={() => router.push('/scriptwriting')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-5 group-hover:bg-primary/10 transition-colors">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">Scriptwriting</h3>
                <p className="text-sm text-muted-foreground">Create engaging scripts with AI assistance</p>
              </CardContent>
            </Card>

            <Card 
              className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/20"
              onClick={() => router.push('/editor')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-5 group-hover:bg-primary/10 transition-colors">
                  <Video className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">Video Editor</h3>
                <p className="text-sm text-muted-foreground">Edit videos with our smart web-based editor</p>
              </CardContent>
            </Card>

            <Card 
              className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/20"
              onClick={() => router.push('/analyzer')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-5 group-hover:bg-primary/10 transition-colors">
                  <BarChart3 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">Performance Analyzer</h3>
                <p className="text-sm text-muted-foreground">Analyze YouTube video performance metrics</p>
              </CardContent>
            </Card>

            <Card 
              className="border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/20"
              onClick={() => router.push('/subtitles')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-muted/50 p-4 rounded-full mb-5 group-hover:bg-primary/10 transition-colors">
                  <Subtitles className="h-10 w-10 text-primary" />
                </div>
                <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">Subtitle Generator</h3>
                <p className="text-sm text-muted-foreground">Generate and customize video subtitles</p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Creator Tips */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-5 flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-primary" />
            Creator Tips
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {creatorTips.map((tip, index) => (
              <Card key={index} className="border border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1 bg-muted/50 p-2 rounded-full">
                      {tip.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-base mb-2">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}