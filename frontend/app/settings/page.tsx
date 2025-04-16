"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import {
  Moon,
  Sun,
  Monitor,
  Save,
  RefreshCw,
  Volume2,
  Video,
  ImageIcon,
  FileText,
  Subtitles,
  Cog,
  Check,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  // Theme settings
  const { theme, setTheme } = useTheme()

  // General settings
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState(5)
  const [showTips, setShowTips] = useState(true)
  const [confirmBeforeExit, setConfirmBeforeExit] = useState(true)

  // Audio settings
  const [defaultVoice, setDefaultVoice] = useState("")
  const [defaultAudioQuality, setDefaultAudioQuality] = useState("standard")
  const [defaultVolume, setDefaultVolume] = useState(80)
  const [enableNoiseReduction, setEnableNoiseReduction] = useState(true)

  // Video settings
  const [defaultResolution, setDefaultResolution] = useState("1080p")
  const [defaultFrameRate, setDefaultFrameRate] = useState("30")
  const [autoEnhanceVideo, setAutoEnhanceVideo] = useState(false)

  // Image settings
  const [defaultImageQuality, setDefaultImageQuality] = useState("high")
  const [autoEnhanceImages, setAutoEnhanceImages] = useState(false)

  // Subtitle settings
  const [defaultSubtitleStyle, setDefaultSubtitleStyle] = useState("default")
  const [autoGenerateSubtitles, setAutoGenerateSubtitles] = useState(false)

  // Script settings
  const [defaultScriptTemplate, setDefaultScriptTemplate] = useState("youtube")

  // Load settings from localStorage on initial load
  useEffect(() => {
    try {
      // General settings
      const savedAutoSave = localStorage.getItem("settings_autoSave")
      if (savedAutoSave !== null) setAutoSave(JSON.parse(savedAutoSave))

      const savedAutoSaveInterval = localStorage.getItem("settings_autoSaveInterval")
      if (savedAutoSaveInterval !== null) setAutoSaveInterval(JSON.parse(savedAutoSaveInterval))

      const savedShowTips = localStorage.getItem("settings_showTips")
      if (savedShowTips !== null) setShowTips(JSON.parse(savedShowTips))

      const savedConfirmBeforeExit = localStorage.getItem("settings_confirmBeforeExit")
      if (savedConfirmBeforeExit !== null) setConfirmBeforeExit(JSON.parse(savedConfirmBeforeExit))

      // Audio settings
      const savedDefaultVoice = localStorage.getItem("settings_defaultVoice")
      if (savedDefaultVoice) setDefaultVoice(savedDefaultVoice)

      const savedDefaultAudioQuality = localStorage.getItem("settings_defaultAudioQuality")
      if (savedDefaultAudioQuality) setDefaultAudioQuality(savedDefaultAudioQuality)

      const savedDefaultVolume = localStorage.getItem("settings_defaultVolume")
      if (savedDefaultVolume !== null) setDefaultVolume(JSON.parse(savedDefaultVolume))

      const savedEnableNoiseReduction = localStorage.getItem("settings_enableNoiseReduction")
      if (savedEnableNoiseReduction !== null) setEnableNoiseReduction(JSON.parse(savedEnableNoiseReduction))

      // Video settings
      const savedDefaultResolution = localStorage.getItem("settings_defaultResolution")
      if (savedDefaultResolution) setDefaultResolution(savedDefaultResolution)

      const savedDefaultFrameRate = localStorage.getItem("settings_defaultFrameRate")
      if (savedDefaultFrameRate) setDefaultFrameRate(savedDefaultFrameRate)

      const savedAutoEnhanceVideo = localStorage.getItem("settings_autoEnhanceVideo")
      if (savedAutoEnhanceVideo !== null) setAutoEnhanceVideo(JSON.parse(savedAutoEnhanceVideo))

      // Image settings
      const savedDefaultImageQuality = localStorage.getItem("settings_defaultImageQuality")
      if (savedDefaultImageQuality) setDefaultImageQuality(savedDefaultImageQuality)

      const savedAutoEnhanceImages = localStorage.getItem("settings_autoEnhanceImages")
      if (savedAutoEnhanceImages !== null) setAutoEnhanceImages(JSON.parse(savedAutoEnhanceImages))

      // Subtitle settings
      const savedDefaultSubtitleStyle = localStorage.getItem("settings_defaultSubtitleStyle")
      if (savedDefaultSubtitleStyle) setDefaultSubtitleStyle(savedDefaultSubtitleStyle)

      const savedAutoGenerateSubtitles = localStorage.getItem("settings_autoGenerateSubtitles")
      if (savedAutoGenerateSubtitles !== null) setAutoGenerateSubtitles(JSON.parse(savedAutoGenerateSubtitles))

      // Script settings
      const savedDefaultScriptTemplate = localStorage.getItem("settings_defaultScriptTemplate")
      if (savedDefaultScriptTemplate) setDefaultScriptTemplate(savedDefaultScriptTemplate)
    } catch (error) {
      console.error("Error loading settings from localStorage:", error)
    }
  }, [])

  // Save all settings to localStorage
  const saveSettings = () => {
    try {
      // General settings
      localStorage.setItem("settings_autoSave", JSON.stringify(autoSave))
      localStorage.setItem("settings_autoSaveInterval", JSON.stringify(autoSaveInterval))
      localStorage.setItem("settings_showTips", JSON.stringify(showTips))
      localStorage.setItem("settings_confirmBeforeExit", JSON.stringify(confirmBeforeExit))

      // Audio settings
      localStorage.setItem("settings_defaultVoice", defaultVoice)
      localStorage.setItem("settings_defaultAudioQuality", defaultAudioQuality)
      localStorage.setItem("settings_defaultVolume", JSON.stringify(defaultVolume))
      localStorage.setItem("settings_enableNoiseReduction", JSON.stringify(enableNoiseReduction))

      // Video settings
      localStorage.setItem("settings_defaultResolution", defaultResolution)
      localStorage.setItem("settings_defaultFrameRate", defaultFrameRate)
      localStorage.setItem("settings_autoEnhanceVideo", JSON.stringify(autoEnhanceVideo))

      // Image settings
      localStorage.setItem("settings_defaultImageQuality", defaultImageQuality)
      localStorage.setItem("settings_autoEnhanceImages", JSON.stringify(autoEnhanceImages))

      // Subtitle settings
      localStorage.setItem("settings_defaultSubtitleStyle", defaultSubtitleStyle)
      localStorage.setItem("settings_autoGenerateSubtitles", JSON.stringify(autoGenerateSubtitles))

      // Script settings
      localStorage.setItem("settings_defaultScriptTemplate", defaultScriptTemplate)

      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings to localStorage:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Reset all settings to defaults
  const resetSettings = () => {
    // General settings
    setAutoSave(true)
    setAutoSaveInterval(5)
    setShowTips(true)
    setConfirmBeforeExit(true)

    // Audio settings
    setDefaultVoice("")
    setDefaultAudioQuality("standard")
    setDefaultVolume(80)
    setEnableNoiseReduction(true)

    // Video settings
    setDefaultResolution("1080p")
    setDefaultFrameRate("30")
    setAutoEnhanceVideo(false)

    // Image settings
    setDefaultImageQuality("high")
    setAutoEnhanceImages(false)

    // Subtitle settings
    setDefaultSubtitleStyle("default")
    setAutoGenerateSubtitles(false)

    // Script settings
    setDefaultScriptTemplate("youtube")

    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    })
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">Customize your application preferences</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={resetSettings} className="h-10 px-4 py-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button onClick={saveSettings} className="h-10 px-4 py-2 bg-primary">
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </div>

          <Separator className="my-2" />

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 md:grid-cols-7 gap-2">
              <TabsTrigger value="general" className="flex items-center">
                <Cog className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">General</span>
                <span className="md:hidden">General</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center">
                <Sun className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Appearance</span>
                <span className="md:hidden">Appear.</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center">
                <Volume2 className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Audio</span>
                <span className="md:hidden">Audio</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center">
                <Video className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Video</span>
                <span className="md:hidden">Video</span>
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center">
                <ImageIcon className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Image</span>
                <span className="md:hidden">Image</span>
              </TabsTrigger>
              <TabsTrigger value="subtitles" className="flex items-center">
                <Subtitles className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Subtitles</span>
                <span className="md:hidden">Subs</span>
              </TabsTrigger>
              <TabsTrigger value="script" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Script</span>
                <span className="md:hidden">Script</span>
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Cog className="mr-2 h-5 w-5 text-primary" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Configure general application settings and behaviors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="auto-save" className="text-base font-medium">
                          Auto Save
                        </Label>
                        <p className="text-sm text-muted-foreground">Automatically save your work periodically</p>
                      </div>
                      <Switch
                        id="auto-save"
                        checked={autoSave}
                        onCheckedChange={setAutoSave}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    {autoSave && (
                      <div className="space-y-3 p-4 rounded-lg border bg-card">
                        <Label htmlFor="auto-save-interval" className="text-sm font-medium">
                          Auto Save Interval (minutes)
                        </Label>
                        <div className="flex items-center space-x-4">
                          <Slider
                            id="auto-save-interval"
                            min={1}
                            max={30}
                            step={1}
                            value={[autoSaveInterval]}
                            onValueChange={(value) => setAutoSaveInterval(value[0])}
                            className="flex-1"
                          />
                          <span className="w-12 text-center font-medium bg-muted px-2 py-1 rounded-md">
                            {autoSaveInterval}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="show-tips" className="text-base font-medium">
                          Show Tips
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Display helpful tips and suggestions while using the app
                        </p>
                      </div>
                      <Switch
                        id="show-tips"
                        checked={showTips}
                        onCheckedChange={setShowTips}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="confirm-exit" className="text-base font-medium">
                          Confirm Before Exit
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show a confirmation dialog before exiting with unsaved changes
                        </p>
                      </div>
                      <Switch
                        id="confirm-exit"
                        checked={confirmBeforeExit}
                        onCheckedChange={setConfirmBeforeExit}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Sun className="mr-2 h-5 w-5 text-primary" />
                    Appearance Settings
                  </CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="space-y-4">
                    <Label htmlFor="theme" className="text-base font-medium">
                      Theme
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border cursor-pointer transition-all ${
                          theme === "light"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-primary/50 hover:bg-accent/10"
                        }`}
                        onClick={() => setTheme("light")}
                      >
                        <div className="bg-background rounded-full p-3 mb-3">
                          <Sun className={`h-6 w-6 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className="font-medium">Light</span>
                        {theme === "light" && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>

                      <div
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border cursor-pointer transition-all ${
                          theme === "dark"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-primary/50 hover:bg-accent/10"
                        }`}
                        onClick={() => setTheme("dark")}
                      >
                        <div className="bg-background rounded-full p-3 mb-3">
                          <Moon className={`h-6 w-6 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className="font-medium">Dark</span>
                        {theme === "dark" && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>

                      <div
                        className={`flex flex-col items-center justify-center p-6 rounded-lg border cursor-pointer transition-all ${
                          theme === "system"
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "hover:border-primary/50 hover:bg-accent/10"
                        }`}
                        onClick={() => setTheme("system")}
                      >
                        <div className="bg-background rounded-full p-3 mb-3">
                          <Monitor
                            className={`h-6 w-6 ${theme === "system" ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </div>
                        <span className="font-medium">System</span>
                        {theme === "system" && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audio Settings */}
            <TabsContent value="audio">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Volume2 className="mr-2 h-5 w-5 text-primary" />
                    Audio Settings
                  </CardTitle>
                  <CardDescription>Configure audio generation and playback settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-voice" className="text-base font-medium">
                        Default Voice
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select the voice that will be used for audio generation
                      </p>
                      <Select value={defaultVoice} onValueChange={setDefaultVoice}>
                        <SelectTrigger id="default-voice" className="w-full">
                          <SelectValue placeholder="Select a default voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="JBFqnCBsd6RMkjVDRZzb">George</SelectItem>
                          <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel</SelectItem>
                          <SelectItem value="EXAVITQu4vr4xnSDxMaL">Bella</SelectItem>
                          <SelectItem value="VR6AewLTigWG4xSOukaG">Adam</SelectItem>
                          <SelectItem value="pNInz6obpgDQGcFmaJgB">Josh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-audio-quality" className="text-base font-medium">
                        Default Audio Quality
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Set the quality level for generated audio</p>
                      <Select value={defaultAudioQuality} onValueChange={setDefaultAudioQuality}>
                        <SelectTrigger id="default-audio-quality" className="w-full">
                          <SelectValue placeholder="Select default audio quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="ultra">Ultra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-volume" className="text-base font-medium">
                        Default Volume
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Set the default volume level for audio playback
                      </p>
                      <div className="flex items-center space-x-4">
                        <Slider
                          id="default-volume"
                          min={0}
                          max={100}
                          step={1}
                          value={[defaultVolume]}
                          onValueChange={(value) => setDefaultVolume(value[0])}
                          className="flex-1"
                        />
                        <span className="w-16 text-center font-medium bg-muted px-3 py-1 rounded-md">
                          {defaultVolume}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="noise-reduction" className="text-base font-medium">
                          Enable Noise Reduction
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically apply noise reduction to generated audio
                        </p>
                      </div>
                      <Switch
                        id="noise-reduction"
                        checked={enableNoiseReduction}
                        onCheckedChange={setEnableNoiseReduction}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Video Settings */}
            <TabsContent value="video">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Video className="mr-2 h-5 w-5 text-primary" />
                    Video Settings
                  </CardTitle>
                  <CardDescription>Configure video editing and export settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-resolution" className="text-base font-medium">
                        Default Resolution
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Set the default resolution for video exports</p>
                      <Select value={defaultResolution} onValueChange={setDefaultResolution}>
                        <SelectTrigger id="default-resolution" className="w-full">
                          <SelectValue placeholder="Select default resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p (HD)</SelectItem>
                          <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                          <SelectItem value="1440p">1440p (2K)</SelectItem>
                          <SelectItem value="2160p">2160p (4K)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-framerate" className="text-base font-medium">
                        Default Frame Rate
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Set the default frame rate for video exports</p>
                      <Select value={defaultFrameRate} onValueChange={setDefaultFrameRate}>
                        <SelectTrigger id="default-framerate" className="w-full">
                          <SelectValue placeholder="Select default frame rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 fps (Film)</SelectItem>
                          <SelectItem value="30">30 fps (Standard)</SelectItem>
                          <SelectItem value="60">60 fps (Smooth)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="auto-enhance-video" className="text-base font-medium">
                          Auto Enhance Video
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically enhance video quality when importing
                        </p>
                      </div>
                      <Switch
                        id="auto-enhance-video"
                        checked={autoEnhanceVideo}
                        onCheckedChange={setAutoEnhanceVideo}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Image Settings */}
            <TabsContent value="image">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                    Image Settings
                  </CardTitle>
                  <CardDescription>Configure image enhancement and export settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-image-quality" className="text-base font-medium">
                        Default Image Quality
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Set the default quality for image exports</p>
                      <Select value={defaultImageQuality} onValueChange={setDefaultImageQuality}>
                        <SelectTrigger id="default-image-quality" className="w-full">
                          <SelectValue placeholder="Select default image quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="ultra">Ultra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="auto-enhance-images" className="text-base font-medium">
                          Auto Enhance Images
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically enhance image quality when importing
                        </p>
                      </div>
                      <Switch
                        id="auto-enhance-images"
                        checked={autoEnhanceImages}
                        onCheckedChange={setAutoEnhanceImages}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subtitle Settings */}
            <TabsContent value="subtitles">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Subtitles className="mr-2 h-5 w-5 text-primary" />
                    Subtitle Settings
                  </CardTitle>
                  <CardDescription>Configure subtitle generation and display settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-subtitle-style" className="text-base font-medium">
                        Default Subtitle Style
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Choose the default style for subtitles</p>
                      <Select value={defaultSubtitleStyle} onValueChange={setDefaultSubtitleStyle}>
                        <SelectTrigger id="default-subtitle-style" className="w-full">
                          <SelectValue placeholder="Select default subtitle style" />
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

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="auto-generate-subtitles" className="text-base font-medium">
                          Auto Generate Subtitles
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically generate subtitles when importing videos
                        </p>
                      </div>
                      <Switch
                        id="auto-generate-subtitles"
                        checked={autoGenerateSubtitles}
                        onCheckedChange={setAutoGenerateSubtitles}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Script Settings */}
            <TabsContent value="script">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/40 pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <FileText className="mr-2 h-5 w-5 text-primary" />
                    Script Settings
                  </CardTitle>
                  <CardDescription>Configure script generation and template settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="grid gap-6">
                    <div className="space-y-3 p-4 rounded-lg border bg-card">
                      <Label htmlFor="default-script-template" className="text-base font-medium">
                        Default Script Template
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">Choose the default template for new scripts</p>
                      <Select value={defaultScriptTemplate} onValueChange={setDefaultScriptTemplate}>
                        <SelectTrigger id="default-script-template" className="w-full">
                          <SelectValue placeholder="Select default script template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}