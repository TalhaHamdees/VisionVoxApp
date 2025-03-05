'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart3, LineChart, PieChart, Youtube, Search, Loader2, ArrowRight, FileText } from 'lucide-react';

export default function AnalyzerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Analytics',
        title: 'YouTube Video Performance Analyzer',
        description: 'Analyze your YouTube videos to improve engagement and retention'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  // Placeholder function for video analysis
  const analyzeVideo = async () => {
    if (!videoUrl) return;
    
    setIsAnalyzing(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasResults(true);
    }, 2000);
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
        <Card className="border border-border/50 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Youtube className="mr-2 h-5 w-5 text-primary" />
              Analyze YouTube Video
            </CardTitle>
            <CardDescription>
              Enter a YouTube video URL to analyze its performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={analyzeVideo} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
                disabled={!videoUrl || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Video
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasResults && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <div className="p-2 rounded-md bg-primary/10 mr-3">
                      <LineChart className="h-5 w-5 text-primary" />
                    </div>
                    Audience Retention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">68%</div>
                  <p className="text-sm text-muted-foreground mb-3">Average view duration</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>0:00</span>
                      <span>5:30</span>
                    </div>
                    <div className="h-10 bg-muted/30 rounded-md relative overflow-hidden">
                      <div className="absolute inset-0 flex items-end">
                        <div style={{ height: '100%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '90%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '85%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '80%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '75%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '65%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '60%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '50%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '45%', width: '10%' }} className="bg-primary/80"></div>
                        <div style={{ height: '40%', width: '10%' }} className="bg-primary/80"></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <div className="p-2 rounded-md bg-primary/10 mr-3">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    Engagement Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Likes</span>
                        <span className="font-medium">245</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Comments</span>
                        <span className="font-medium">32</span>
                      </div>
                      <Progress value={40} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Shares</span>
                        <span className="font-medium">18</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Click-through Rate</span>
                        <span className="font-medium">4.2%</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <div className="p-2 rounded-md bg-primary/10 mr-3">
                      <PieChart className="h-5 w-5 text-primary" />
                    </div>
                    Audience Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Age 18-24</span>
                        <span className="font-medium">35%</span>
                      </div>
                      <Progress value={35} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Age 25-34</span>
                        <span className="font-medium">42%</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Age 35-44</span>
                        <span className="font-medium">15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Age 45+</span>
                        <span className="font-medium">8%</span>
                      </div>
                      <Progress value={8} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/50 shadow-sm mb-8">
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  AI-generated insights based on your video's performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="strengths">
                  <TabsList className="mb-4">
                    <TabsTrigger value="strengths">Strengths</TabsTrigger>
                    <TabsTrigger value="weaknesses">Areas to Improve</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                  </TabsList>
                  <TabsContent value="strengths" className="space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Strong Opening Hook</h3>
                      <p className="text-sm text-muted-foreground">Your video has excellent retention in the first 30 seconds, indicating a strong opening that captures viewer attention.</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Good Engagement Rate</h3>
                      <p className="text-sm text-muted-foreground">Your like-to-view ratio is above average for your channel size, showing that viewers are engaging positively with your content.</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="weaknesses" className="space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Mid-Video Drop-off</h3>
                      <p className="text-sm text-muted-foreground">There's a significant drop in retention around the 2:30 mark, suggesting that viewers may be losing interest at this point.</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Low Comment Engagement</h3>
                      <p className="text-sm text-muted-foreground">Your comment count is lower than average, indicating that viewers aren't being prompted to engage in discussion.</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="recommendations" className="space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Restructure Mid-Section</h3>
                      <p className="text-sm text-muted-foreground">Consider adding a pattern interrupt or new information around the 2:30 mark to maintain viewer interest.</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Add Clear Call-to-Action</h3>
                      <p className="text-sm text-muted-foreground">Include a specific question or prompt for viewers to respond to in the comments to increase engagement.</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                      <h3 className="font-medium mb-2">Target Younger Audience</h3>
                      <p className="text-sm text-muted-foreground">Your content resonates well with the 25-34 age group. Consider creating more content that appeals to this demographic.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => router.push('/scriptwriting')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Optimized Script
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 