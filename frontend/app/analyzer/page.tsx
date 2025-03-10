"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  LineChart,
  PieChart,
  Youtube,
  Search,
  Loader2,
  ArrowRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ThumbsUp,
  MessageSquare,
  Share2,
  Info,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RetentionChartRecharts } from "@/components/analytics/retention-chart-recharts"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Types for YouTube API responses
interface YouTubeVideoStats {
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  averageViewDuration: number
  retentionData: number[]
  audienceData: {
    ageGroups: { [key: string]: number }
    genderGroups: { [key: string]: number }
    geoGroups: { [key: string]: number }
  }
  engagementSpikes: { time: number; score: number; event: string; type?: string }[]
  dropOffPoints: { time: number; percentage: number; type?: string }[]
  isRealData: boolean
  duration: number // Video duration in seconds
  title: string
  publishedAt: string
  videoId: string
  isShort: boolean
}

interface ScriptFeedback {
  strengths: { title: string; description: string }[]
  weaknesses: { title: string; description: string }[]
  recommendations: { title: string; description: string }[]
  scriptSuggestions: string
}

export default function AnalyzerPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [videoUrl, setVideoUrl] = useState("")
  const [videoId, setVideoId] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasResults, setHasResults] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [videoStats, setVideoStats] = useState<YouTubeVideoStats | null>(null)
  const [scriptFeedback, setScriptFeedback] = useState<ScriptFeedback | null>(null)
  const [scriptContent, setScriptContent] = useState("")
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const authWindowRef = useRef<Window | null>(null)
  const authCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isTestingAuth, setIsTestingAuth] = useState(false)
  const [activeTab, setActiveTab] = useState("strengths")
  const [saveToMyScripts, setSaveToMyScripts] = useState(false)
  // Add a new state variable for the connection card highlight effect
  const [showConnectionHighlight, setShowConnectionHighlight] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failure' | null>(null)
  const [highlightFading, setHighlightFading] = useState(false)

  // Set page title
  useEffect(() => {
    setTimeout(() => {
      const pageTitleEvent = new CustomEvent("updatePageTitle", {
      detail: {
          badge: "Analytics",
          title: "YouTube Video Performance Analyzer",
          description: "Analyze your YouTube videos to improve engagement and retention",
        },
    });
    window.dispatchEvent(pageTitleEvent);
    }, 0);
  }, []);


  // Check if user is already authorized with YouTube
  useEffect(() => {
    const checkYouTubeAuth = async () => {
      try {
        const response = await fetch("/api/youtube/auth-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()
        setIsAuthorized(data.isAuthorized)
      } catch (error) {
        console.error("Error checking YouTube auth status:", error)
        setIsAuthorized(false)
      }
    }

    if (user) {
      checkYouTubeAuth()
    }
  }, [user])

  // Handle YouTube auth window message
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return

      if (event.data.type === "youtube-auth-success") {
        setIsAuthorized(true)
        setIsAuthenticating(false)
        setShowAuthDialog(false)
        toast({
          title: "Successfully connected to YouTube",
          description: "You can now analyze your YouTube videos",
        })

        // Close the auth window if it's still open
        if (authWindowRef.current && !authWindowRef.current.closed) {
          authWindowRef.current.close()
        }

        // Clear the interval
        if (authCheckIntervalRef.current) {
          clearInterval(authCheckIntervalRef.current)
          authCheckIntervalRef.current = null
        }
      }
    }

    window.addEventListener("message", handleAuthMessage)
    return () => {
      window.removeEventListener("message", handleAuthMessage)

      // Clear interval on unmount
      if (authCheckIntervalRef.current) {
        clearInterval(authCheckIntervalRef.current)
      }
    }
  }, [])

  // Extract video ID from URL
  const extractVideoId = (url: string) => {
    // Remove any @ symbol that might be at the beginning
    const cleanUrl = url.replace(/^@/, "")

    // Handle standard YouTube URLs
    const standardRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const standardMatch = cleanUrl.match(standardRegExp)

    if (standardMatch && standardMatch[2].length === 11) {
      return standardMatch[2]
    }

    // Handle YouTube Shorts URLs
    const shortsRegExp = /^.*(youtube.com\/shorts\/)([^#&?]*).*/
    const shortsMatch = cleanUrl.match(shortsRegExp)

    if (shortsMatch && shortsMatch[2].length === 11) {
      return shortsMatch[2]
    }

    return null
  }

  // Authenticate with YouTube
  const authenticateYouTube = () => {
    setIsAuthenticating(true)

    // Open a popup window for authentication
    const width = 600
    const height = 700
    const left = window.innerWidth / 2 - width / 2
    const top = window.innerHeight / 2 - height / 2

    authWindowRef.current = window.open(
      "/api/youtube/auth",
      "YouTube Authentication",
      `width=${width},height=${height},left=${left},top=${top}`,
    )

    // Check if the window is closed periodically
    authCheckIntervalRef.current = setInterval(() => {
      if (authWindowRef.current && authWindowRef.current.closed) {
        setIsAuthenticating(false)
        if (authCheckIntervalRef.current) {
          clearInterval(authCheckIntervalRef.current)
          authCheckIntervalRef.current = null
        }
      }
    }, 1000)
  }

  // Analyze video
  const analyzeVideo = async () => {
    console.log("🔍 Starting video analysis for URL:", videoUrl)
    // Extract video ID from YouTube URL
    const id = extractVideoId(videoUrl)

    if (!id) {
      console.error("❌ Invalid YouTube URL")
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube video URL",
        variant: "destructive",
      })
      return
    }

    // Check if user is authorized with YouTube
    if (!isAuthorized) {
      console.error("❌ Not authorized with YouTube")
      toast({
        title: "Authentication Required",
        description: "Please connect your YouTube account to analyze videos",
        variant: "destructive",
      })
      setShowAuthDialog(true)
      return
    }

    console.log("📹 Extracted video ID:", id)
    setVideoId(id)
    setIsAnalyzing(true)

    try {
      // Fetch basic video statistics from YouTube API
      console.log("📊 Fetching basic video statistics...")
      const videoResponse = await fetch("/api/youtube/video-stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId: id }),
      })

      console.log("📊 Video stats API response status:", videoResponse.status)

      if (!videoResponse.ok) {
        const errorData = await videoResponse.text()
        console.error("❌ Failed to fetch video statistics:", errorData)

        // Try to parse the error as JSON
        let errorMessage = "Failed to fetch video statistics"
        try {
          const parsedError = JSON.parse(errorData)
          errorMessage = parsedError.error || errorMessage
        } catch (e) {
          // If parsing fails, use the raw error text (truncated)
          errorMessage = `${errorMessage}: ${errorData.substring(0, 100)}...`
        }

        toast({
          title: "Analysis Failed",
          description: errorMessage,
          variant: "destructive",
        })

        // If unauthorized, show auth dialog
        if (videoResponse.status === 401) {
          setIsAuthorized(false)
          setShowAuthDialog(true)
        }

        throw new Error(errorMessage)
      }

      const videoData = await videoResponse.json()
      console.log("📊 Basic video stats received:", videoData)

      // Fetch detailed audience retention data using the new endpoint
      console.log("📈 Fetching detailed audience retention data...")
      const retentionResponse = await fetch("/api/youtube/audience-retention", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoId: id }),
      })

      console.log("📈 Retention API response status:", retentionResponse.status)

      if (!retentionResponse.ok) {
        const errorData = await retentionResponse.text()
        console.error("❌ Failed to fetch audience retention data:", errorData)

        // Try to parse the error as JSON
        let errorMessage = "Failed to fetch audience retention data"
        try {
          const parsedError = JSON.parse(errorData)
          errorMessage = parsedError.error || errorMessage
        } catch (e) {
          // If parsing fails, use the raw error text (truncated)
          errorMessage = `${errorMessage}: ${errorData.substring(0, 100)}...`
        }

        // Continue with basic video stats, but show a warning about missing retention data
        toast({
          title: "Partial Analysis",
          description: errorMessage,
          variant: "destructive",
        })

        // Use the basic video stats without detailed retention data
        setVideoStats(videoData)
      } else {
        // Combine basic video stats with detailed retention data
        const retentionData = await retentionResponse.json()
        console.log("📈 Detailed retention data received:", retentionData)

        // Merge the data
        const combinedData = {
          ...videoData,
          retentionData: retentionData.retentionData.map((point: any) => point.watchRatio),
          averageViewDuration: retentionData.averageViewDuration,
          dropOffPoints: retentionData.dropOffPoints.map((point: any) => ({
            time: Math.round(point.timeRatio * videoData.duration),
            percentage: point.percentage,
            type: point.type,
          })),
          engagementSpikes: retentionData.engagementSpikes.map((spike: any) => ({
            time: Math.round(spike.timeRatio * videoData.duration),
            score: spike.score,
            event: spike.event,
            type: spike.type,
          })),
          isRealData: true,
        }

        console.log("📊 Combined data:", combinedData)
        setVideoStats(combinedData)

        // Generate script feedback based on video performance
        console.log("📝 Generating script feedback...")
        const feedbackResponse = await fetch("/api/youtube/script-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoId: id, stats: combinedData }),
        })

        console.log("📝 Script feedback API response status:", feedbackResponse.status)

        if (!feedbackResponse.ok) {
          const errorData = await feedbackResponse.text()
          console.error("❌ Failed to generate script feedback:", errorData)
          throw new Error("Failed to generate script feedback")
        }

        const feedbackData = await feedbackResponse.json()
        console.log("📝 Script feedback data received:", feedbackData)
        setScriptFeedback(feedbackData)

        setHasResults(true)

        toast({
          title: "Analysis Complete",
          description: "YouTube Analytics data has been successfully retrieved",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("❌ Error analyzing video:", error)
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze video",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Generate optimized script
  const generateOptimizedScript = async () => {
    if (!videoStats || !scriptFeedback) return

    setIsGeneratingScript(true)

    try {
      const response = await fetch("/api/youtube/generate-script", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          stats: videoStats,
          feedback: scriptFeedback,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate optimized script")
      }

      const data = await response.json()
      setScriptContent(data.script)

      toast({
        title: "Script Generated",
        description: "Your optimized script has been created based on video performance",
      })
    } catch (error) {
      console.error("Error generating script:", error)
      toast({
        title: "Script Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate script",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingScript(false)
    }
  }

  // Transfer script to scriptwriting page
  const transferToScriptwriter = () => {
    if (scriptContent) {
      // Save script to localStorage for the scriptwriting page to use
      localStorage.setItem("analyzer_script", scriptContent)
      router.push("/scriptwriting")
    }
  }

  // Add a useEffect to handle the timeout for removing the highlight
  useEffect(() => {
    let fadeTimer: NodeJS.Timeout
    let removeTimer: NodeJS.Timeout
    
    if (showConnectionHighlight) {
      // Set timer for starting the fade out
      fadeTimer = setTimeout(() => {
        setHighlightFading(true)
      }, 1500)
      
      // Set timer for completely removing the highlight
      removeTimer = setTimeout(() => {
        setShowConnectionHighlight(false)
        setConnectionTestResult(null)
        setHighlightFading(false)
      }, 2000)
    }
    
    return () => {
      if (fadeTimer) clearTimeout(fadeTimer)
      if (removeTimer) clearTimeout(removeTimer)
    }
  }, [showConnectionHighlight])

  // Modify the testYouTubeAuth function to show the highlight instead of the dialog when not authorized
  const testYouTubeAuth = async () => {
    setIsTestingAuth(true)
    setHighlightFading(false) // Reset fading state

    try {
      console.log("🔍 Testing YouTube authentication...")

      // If not authorized, show the highlight effect instead of the dialog
      if (!isAuthorized) {
        setConnectionTestResult('failure')
        setShowConnectionHighlight(true)
        setIsTestingAuth(false)
        return
      }

      const response = await fetch("/api/youtube/auth-test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("🔍 Auth test response status:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        console.error("❌ Auth test failed:", errorData)

        // If the token is invalid, show the highlight effect
        if (response.status === 401) {
          setIsAuthorized(false)
          setConnectionTestResult('failure')
          setShowConnectionHighlight(true)
        }

        return
      }

      const data = await response.json()
      console.log("🔍 Auth test data:", data)

      setConnectionTestResult('success')
      setShowConnectionHighlight(true)
      setIsAuthorized(true)
    } catch (error) {
      console.error("❌ Error testing authentication:", error)
      setConnectionTestResult('failure')
      setShowConnectionHighlight(true)
    } finally {
      setIsTestingAuth(false)
    }
  }

  // Replace the connection status card with the updated version that includes the highlight effect
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl">
        {/* Connection Status Bar */}
        <div
          className={`mb-8 flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg bg-card/60 border transition-all duration-500 ${
            showConnectionHighlight
              ? connectionTestResult === 'success'
                ? `border-green-500 shadow-[0_0_15px_rgba(34,197,94,${highlightFading ? '0.1' : '0.5'})]`
                : `border-red-500 shadow-[0_0_15px_rgba(239,68,68,${highlightFading ? '0.1' : '0.5'})]`
              : "border-border/40 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-3 h-3 rounded-full ${isAuthorized ? "bg-green-500" : "bg-red-500"} animate-pulse`}></div>
            <div>
              <h3 className="font-medium text-foreground">YouTube Connection</h3>
              <p className="text-sm text-muted-foreground">
                {isAuthorized
                  ? "Your YouTube account is connected and ready for analysis"
                  : "Connect your YouTube account to analyze your videos"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={testYouTubeAuth}
              disabled={isTestingAuth}
              size="sm"
              className="shadow-sm transition-all hover:shadow"
            >
              {isTestingAuth ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4 text-red-500" />
                  Test Connection
                </>
              )}
            </Button>
            {!isAuthorized && (
              <Button
                onClick={() => setShowAuthDialog(true)}
                size="sm"
                className="shadow-sm transition-all hover:shadow bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                <Youtube className="mr-2 h-4 w-4" />
                Connect to YouTube
              </Button>
            )}
          </div>
        </div>

        {/* Video URL Input Card */}
        <Card className="border border-border/40 shadow-md mb-10 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 border-b border-border/30 pb-4">
            <CardTitle className="flex items-center text-xl">
              <Youtube className="mr-3 h-5 w-5 text-red-500" />
              Analyze YouTube Video
            </CardTitle>
            <CardDescription className="text-muted-foreground/90">
              Enter a YouTube video URL to analyze its performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
              <Input
                placeholder="Enter YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                  className="flex-1 shadow-sm focus-visible:ring-primary/70 pl-10"
                  disabled={!isAuthorized || isAnalyzing}
              />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  <Youtube className="h-4 w-4" />
                </div>
              </div>
              <Button 
                onClick={analyzeVideo} 
                className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-sm transition-all hover:shadow whitespace-nowrap"
                disabled={!isAuthorized || !videoUrl || isAnalyzing}
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
            {!isAuthorized && (
              <Alert
                variant="default"
                className="mt-4 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Required</AlertTitle>
                <AlertDescription>Please connect your YouTube account to analyze videos.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {hasResults && videoStats && (
          <div className="mt-10 space-y-10">
            {/* Video Info Card */}
            <Card className="border border-border/40 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <Youtube className="mr-2 h-5 w-5 text-red-500" />
                      Video Information
                    </CardTitle>
                    <CardDescription>Details about the analyzed video</CardDescription>
                  </div>
                  {videoStats.isShort && (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                    >
                      YouTube Short
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Title</h4>
                    <p className="font-medium text-foreground">{videoStats.title}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Published</h4>
                    <p className="font-medium text-foreground">
                      {new Date(videoStats.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Duration</h4>
                    <p className="font-medium text-foreground">{formatTime(videoStats.duration)}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary/70" />
                        <h4 className="text-sm font-medium">Views</h4>
                      </div>
                      <p className="text-2xl font-bold">{videoStats.viewCount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <ThumbsUp className="h-4 w-4 text-primary/70" />
                        <h4 className="text-sm font-medium">Likes</h4>
                      </div>
                      <p className="text-2xl font-bold">{videoStats.likeCount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-primary/70" />
                        <h4 className="text-sm font-medium">Comments</h4>
                      </div>
                      <p className="text-2xl font-bold">{videoStats.commentCount.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Share2 className="h-4 w-4 text-primary/70" />
                        <h4 className="text-sm font-medium">Shares</h4>
                      </div>
                      <p className="text-2xl font-bold">{videoStats.shareCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Audience Retention Chart */}
            <Card className="border border-border/40 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-lg">
                      <LineChart className="mr-2 h-5 w-5 text-primary" />
                      Audience Retention
                    </CardTitle>
                    <CardDescription>How viewers engage with your content over time</CardDescription>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 text-sm font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          {videoStats.averageViewDuration}% average view duration
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of total video length watched on average</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <RetentionChartRecharts
                  retentionData={videoStats.retentionData}
                  duration={videoStats.duration}
                  dropOffPoints={videoStats.dropOffPoints}
                  engagementSpikes={videoStats.engagementSpikes}
                />

                {/* Key Insights */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Drop-off Points */}
                  <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <h3 className="font-medium text-amber-800 dark:text-amber-400 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Key Drop-off Points
                    </h3>
                    <div className="space-y-2">
                      {videoStats.dropOffPoints.slice(0, 3).map((point, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{formatTime(point.time)}</span>
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {point.percentage}% drop-off
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Engagement Spikes */}
                  <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
                    <h3 className="font-medium text-green-800 dark:text-green-400 mb-2 flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Key Engagement Spikes
                    </h3>
                    <div className="space-y-2">
                      {videoStats.engagementSpikes.slice(0, 3).map((spike, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{formatTime(spike.time)}</span>
                          <span className="text-green-700 dark:text-green-400 font-medium">{spike.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              {/* Audience Demographics */}
              <Card className="border border-border/40 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <Users className="mr-2 h-5 w-5 text-foreground" />
                    Audience Demographics
                  </CardTitle>
                  <CardDescription>Who is watching your video</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* Age Groups */}
                  <div className="mb-8">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground mr-2">
                        <span className="text-sm font-medium">A</span>
                      </div>
                      <h4 className="text-base font-medium">Age Groups</h4>
                    </div>
                    <div className="space-y-5">
                      {Object.entries(videoStats.audienceData.ageGroups)
                        .filter(([_, percentage]) => percentage > 0) // Only show groups with data
                        .sort(([ageA, _a], [ageB, _b]) => {
                          // Custom sort for age groups
                          const ageOrder = {
                            'age13-17': 1,
                            '13-17': 1,
                            'age18-24': 2,
                            '18-24': 2,
                            'age25-34': 3,
                            '25-34': 3,
                            'age35-44': 4,
                            '35-44': 4,
                            'age45-54': 5,
                            '45-54': 5,
                            'age55-64': 6,
                            '55-64': 6,
                            'age65+': 7,
                            '65-': 7,
                            '55+': 8
                          };
                          return (ageOrder[ageA as keyof typeof ageOrder] || 99) - (ageOrder[ageB as keyof typeof ageOrder] || 99);
                        })
                        .map(([age, percentage]) => {
                          // Format age group label
                          const displayAge = age.startsWith('age') 
                            ? age.replace('age', '') 
                            : age;
                          
                          return (
                            <div key={age} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{displayAge}</span>
                                <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                              </div>
                              <Progress 
                                value={percentage} 
                                className="h-2.5 w-full bg-muted/50" 
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Gender Distribution */}
                  <div className="mb-8">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground mr-2">
                        <span className="text-sm font-medium">G</span>
                      </div>
                      <h4 className="text-base font-medium">Gender</h4>
                    </div>
                    <div className="space-y-5">
                      {Object.entries(videoStats.audienceData.genderGroups)
                        .filter(([_, percentage]) => percentage > 0) // Only show groups with data
                        .sort(([_, percentageA], [__, percentageB]) => Number(percentageB) - Number(percentageA))
                        .map(([gender, percentage]) => (
                          <div key={gender} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize">{gender}</span>
                              <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={percentage} 
                              className="h-2.5 w-full bg-muted/50" 
                            />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Geographic Distribution */}
                    <div>
                    <div className="flex items-center mb-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground mr-2">
                        <span className="text-sm font-medium">L</span>
                      </div>
                      <h4 className="text-base font-medium">Top Locations</h4>
                    </div>
                    <div className="space-y-5">
                      {Object.entries(videoStats.audienceData.geoGroups)
                        .filter(([_, percentage]) => percentage > 0) // Only show groups with data
                        .sort(([_, percentageA], [__, percentageB]) => Number(percentageB) - Number(percentageA))
                        .slice(0, 5) // Show only top 5 locations
                        .map(([location, percentage]) => (
                          <div key={location} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{location}</span>
                              <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={percentage} 
                              className="h-2.5 w-full bg-muted/50" 
                            />
                      </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Metrics */}
              <Card className="border border-border/40 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                    Engagement Metrics
                  </CardTitle>
                  <CardDescription>How viewers interact with your video</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium flex items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
                            <span className="text-xs">V</span>
                          </span>
                          Views
                        </span>
                        <span className="font-semibold">{videoStats.viewCount.toLocaleString()}</span>
                      </div>
                      <Progress value={100} className="h-2.5 bg-muted" />
                    </div>

                    {/* Calculate like-to-view ratio and compare to average */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium flex items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
                            <ThumbsUp className="h-3 w-3" />
                          </span>
                          Likes
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{videoStats.likeCount.toLocaleString()}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ({((videoStats.likeCount / videoStats.viewCount) * 100).toFixed(1)}%)
                          </span>
                          {videoStats.likeCount / videoStats.viewCount > 0.04 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              Above avg
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={(videoStats.likeCount / videoStats.viewCount) * 100}
                        className="h-2.5 bg-muted"
                      />
                    </div>

                    {/* Calculate comment-to-view ratio and compare to average */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium flex items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
                            <MessageSquare className="h-3 w-3" />
                          </span>
                          Comments
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{videoStats.commentCount.toLocaleString()}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ({((videoStats.commentCount / videoStats.viewCount) * 100).toFixed(2)}%)
                          </span>
                          {videoStats.commentCount / videoStats.viewCount > 0.005 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              Above avg
                            </span>
                          )}
                        </div>
                      </div>
                      <Progress
                        value={(videoStats.commentCount / videoStats.viewCount) * 100 * 10}
                        className="h-2.5 bg-muted"
                      />
                    </div>

                    {/* Calculate share-to-view ratio */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground font-medium flex items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
                            <Share2 className="h-3 w-3" />
                          </span>
                          Shares
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{videoStats.shareCount.toLocaleString()}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            ({((videoStats.shareCount / videoStats.viewCount) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={(videoStats.shareCount / videoStats.viewCount) * 100 * 20}
                        className="h-2.5 bg-muted"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {scriptFeedback && (
              <Card className="border border-border/40 shadow-md mb-10 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <PieChart className="mr-2 h-5 w-5 text-primary" />
                    Performance Insights
                  </CardTitle>
                  <CardDescription>AI-generated insights based on your video's performance</CardDescription>
              </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-6 w-full justify-start bg-muted/50 p-1">
                      <TabsTrigger
                        value="strengths"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Strengths
                      </TabsTrigger>
                      <TabsTrigger
                        value="weaknesses"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Areas to Improve
                      </TabsTrigger>
                      <TabsTrigger
                        value="recommendations"
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        Recommendations
                      </TabsTrigger>
                  </TabsList>
                    <TabsContent value="strengths" className="space-y-4 mt-0">
                      {scriptFeedback.strengths.map((strength, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                        >
                          <h3 className="font-medium text-green-800 dark:text-green-400 mb-2">{strength.title}</h3>
                          <p className="text-sm text-green-700 dark:text-green-300/90">{strength.description}</p>
                    </div>
                      ))}
                  </TabsContent>
                    <TabsContent value="weaknesses" className="space-y-4 mt-0">
                      {scriptFeedback.weaknesses.map((weakness, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
                        >
                          <h3 className="font-medium text-amber-800 dark:text-amber-400 mb-2">{weakness.title}</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300/90">{weakness.description}</p>
                    </div>
                      ))}
                  </TabsContent>
                    <TabsContent value="recommendations" className="space-y-4 mt-0">
                      {scriptFeedback.recommendations.map((recommendation, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10"
                        >
                          <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-2">{recommendation.title}</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300/90">{recommendation.description}</p>
                    </div>
                      ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
                <CardFooter className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 bg-muted/20 border-t border-border/30 px-6 py-4">
                  <div className="flex items-center">
                    <Info className="h-4 w-4 text-primary mr-2 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Use these insights to create a better performing script
                    </p>
                  </div>
                  <Button
                    onClick={generateOptimizedScript}
                    disabled={isGeneratingScript}
                    className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-sm transition-all hover:shadow w-full sm:w-auto"
                  >
                    {isGeneratingScript ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Optimized Script
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {scriptContent && (
              <Card className="border border-border/40 shadow-md mb-10 overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/30 pb-3">
                  <CardTitle className="flex items-center text-lg">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    Optimized Script
                  </CardTitle>
                  <CardDescription>
                    This script has been optimized based on your video's performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Textarea
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm border-border/50 shadow-inner bg-card resize-y focus-visible:ring-primary/70"
                  />
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-4 bg-muted/20 border-t border-border/30 px-6 py-4">
                  <div className="flex items-center">
                    <Switch
                      id="auto-save"
                      className="data-[state=checked]:bg-primary"
                      checked={saveToMyScripts}
                      onCheckedChange={setSaveToMyScripts}
                    />
                    <Label htmlFor="auto-save" className="ml-2 cursor-pointer">
                      Save to My Scripts
                    </Label>
                  </div>
                  <Button
                    onClick={transferToScriptwriter}
                    className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-sm transition-all hover:shadow w-full sm:w-auto"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Edit in Script Editor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
            </Card>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="shadow-sm transition-all hover:shadow"
              >
                Back to Dashboard
              </Button>
              {!scriptContent && (
              <Button 
                  className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-sm transition-all hover:shadow"
                  onClick={() => router.push("/scriptwriting")}
              >
                <FileText className="mr-2 h-4 w-4" />
                  Create New Script
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* YouTube Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md border-border/40 shadow-lg bg-card/95 backdrop-blur-sm">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="flex items-center text-xl">
              <Youtube className="mr-2 h-5 w-5 text-red-500" />
              Connect to YouTube
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/90">
              Connect your YouTube account to analyze your videos and improve your content.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 mb-5">
              <h3 className="font-medium mb-3 flex items-center text-foreground">
                <Youtube className="h-4 w-4 mr-2 text-red-500" />
                Why connect to YouTube?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-3">
                <li className="flex items-start">
                  <ThumbsUp className="h-4 w-4 mr-2 mt-0.5 text-primary/70" />
                  <span>Access detailed performance metrics for your videos</span>
                </li>
                <li className="flex items-start">
                  <MessageSquare className="h-4 w-4 mr-2 mt-0.5 text-primary/70" />
                  <span>Get AI-powered feedback to improve your content</span>
                </li>
                <li className="flex items-start">
                  <Share2 className="h-4 w-4 mr-2 mt-0.5 text-primary/70" />
                  <span>Generate optimized scripts based on what works</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              We'll only access your YouTube analytics data to provide insights. You can revoke access at any time.
            </p>
          </div>
          <DialogFooter className="sm:justify-between border-t border-border/30 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(false)}
              className="shadow-sm transition-all hover:shadow"
            >
              Cancel
            </Button>
            <Button
              onClick={authenticateYouTube}
              disabled={isAuthenticating}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-sm transition-all hover:shadow"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Connect to YouTube
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

