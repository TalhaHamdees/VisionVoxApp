"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { type CaptionOverlay, OverlayType, type SoundOverlay, type Caption } from "../../../types"
import { useEditorContext } from "../../../contexts/editor-context"
import { Wand2, FileText, Volume2, Settings2, ChevronDown, AlignLeft, AlignCenter, AlignRight, Sliders } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning"
import { useTimeline } from "../../../contexts/timeline-context"

interface CaptionGeneratorProps {
  localOverlay: CaptionOverlay
  setLocalOverlay: (overlay: CaptionOverlay) => void
}

// Caption generation settings
interface CaptionSettings {
  wordsPerLine: number
  maxLines: number
  splitBySentence: boolean
  readingSpeed: number // Words per minute
  position: 'top' | 'middle' | 'bottom'
  alignment: 'left' | 'center' | 'right'
  spacing: number // Spacing between captions in ms
  startDelay: number // Initial delay in ms
  endDelay: number // Ending delay in ms
}

const defaultSettings: CaptionSettings = {
  wordsPerLine: 7,
  maxLines: 2,
  splitBySentence: true,
  readingSpeed: 160, // 160 words per minute is average reading speed
  position: 'bottom',
  alignment: 'center',
  spacing: 500, // 500ms between captions
  startDelay: 0,
  endDelay: 1000,
}

/**
 * CaptionGenerator Component
 *
 * @component
 * @description
 * Advanced caption generation with granular customization options
 */
export const CaptionGenerator: React.FC<CaptionGeneratorProps> = ({ localOverlay, setLocalOverlay }) => {
  const { overlays, addOverlay, durationInFrames } = useEditorContext()
  const { findNextAvailablePosition } = useTimelinePositioning()
  const { visibleRows } = useTimeline()
  
  const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null)
  const [script, setScript] = useState("")
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [settings, setSettings] = useState<CaptionSettings>(defaultSettings)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Get all sound overlays from the editor
  const soundOverlays = overlays.filter((overlay) => overlay.type === OverlayType.SOUND) as SoundOverlay[]

  // Update individual settings
  const updateSetting = <K extends keyof CaptionSettings>(key: K, value: CaptionSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Generate captions from text with custom settings
  const generateCaptionsFromText = () => {
    if (!script.trim()) {
      toast({
        title: "Text Required",
        description: "Please enter some text to generate captions.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Split text by sentences or just by words
      const sentences = settings.splitBySentence
        ? script
            .split(/[.!?]+/)
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 0)
        : [script.trim()]

      const processedCaptions: Caption[] = []
      let currentStartTime = settings.startDelay

      // Process each sentence based on settings
      sentences.forEach(sentence => {
        // Split the sentence into words
        const words = sentence.split(/\s+/).filter(word => word.trim().length > 0)
        
        // Group words according to wordsPerLine and maxLines settings
        for (let i = 0; i < words.length; i += settings.wordsPerLine * settings.maxLines) {
          const chunkWords = words.slice(i, i + settings.wordsPerLine * settings.maxLines)
          const wordGroups: string[][] = []
          
          // Divide into lines based on wordsPerLine
          for (let j = 0; j < chunkWords.length; j += settings.wordsPerLine) {
            wordGroups.push(chunkWords.slice(j, j + settings.wordsPerLine))
          }
          
          // Join words into lines, then join lines with line breaks
          const captionText = wordGroups.map(group => group.join(' ')).join('\n')
          
          // Calculate timing based on reading speed
          const msPerWord = (60 * 1000) / settings.readingSpeed
          const captionDuration = chunkWords.length * msPerWord
          
          // Create caption words with timing
          const captionWords = chunkWords.map((word, index) => ({
            word: word.trim(),
            startMs: currentStartTime + index * msPerWord,
            endMs: currentStartTime + (index + 1) * msPerWord,
            confidence: 0.99,
          }))
          
          // Create the caption
          processedCaptions.push({
            text: captionText,
            startMs: currentStartTime,
            endMs: currentStartTime + captionDuration,
            timestampMs: null,
            confidence: 0.99,
            words: captionWords,
          })
          
          // Update the start time for the next caption
          currentStartTime += captionDuration + settings.spacing
        }
      })
      
      // Add ending delay
      const totalDurationMs = currentStartTime + settings.endDelay
      const calculatedDurationInFrames = Math.ceil((totalDurationMs / 1000) * 30)
      
      // Find position on timeline
      const position = findNextAvailablePosition(overlays, visibleRows, durationInFrames)
      
      // Calculate caption position based on settings
      let top = 414 // Default middle position
      if (settings.position === 'top') top = 200
      if (settings.position === 'bottom') top = 600
      
      // Create caption overlay
      const newCaptionOverlay: CaptionOverlay = {
        id: Date.now(),
        type: OverlayType.CAPTION,
        from: position.from,
        durationInFrames: calculatedDurationInFrames,
        captions: processedCaptions,
        left: 230,
        top: top,
        width: 833,
        height: 269,
        rotation: 0,
        isDragging: false,
        row: position.row,
      }
      
      // Add the caption overlay to the editor
      addOverlay(newCaptionOverlay)
      
      // Success notification
      toast({
        title: "Captions Generated",
        description: `Generated ${processedCaptions.length} caption segments.`,
      })
      
      // Clear the script input
      setScript("")
    } catch (error) {
      console.error("Error generating captions:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate captions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate captions from selected audio
  const generateCaptionsFromAudio = async () => {
    if (!selectedAudioId) {
      toast({
        title: "Audio Required",
        description: "Please select an audio file to generate captions from.",
        variant: "destructive",
      })
      return
    }

    // Find the selected audio overlay
    const audioOverlay = soundOverlays.find(overlay => overlay.id === selectedAudioId)
    if (!audioOverlay) {
      toast({
        title: "Audio Not Found",
        description: "The selected audio file could not be found.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Not Fully Implemented Yet",
      description: "Audio-based caption generation with all settings will be available soon.",
    })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="text" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-gradient-to-b from-gray-50 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-md border border-gray-200 dark:border-gray-700 shadow-sm p-1 gap-1">
          <TabsTrigger
            value="text"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
            data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
            rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
            hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <FileText className="w-3.5 h-3.5" />
              From Text
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="audio"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
            data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
            rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
            hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Volume2 className="w-3.5 h-3.5" />
              From Audio
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Text-based Caption Generation */}
        <TabsContent value="text" className="space-y-4 mt-4 animate-in fade-in-50 duration-200">
          <div className="space-y-3">
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Type or paste your script here..."
              className="min-h-[150px] bg-white dark:bg-gray-800/50 
              border-gray-300 dark:border-gray-700 resize-none
              text-gray-900 dark:text-gray-200 
              placeholder:text-gray-400 dark:placeholder:text-gray-500 
              focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 
              transition-all rounded-lg shadow-sm"
            />
            
            {/* Basic Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <AlignLeft className="h-3 w-3 text-blue-500" />
                  Words Per Line
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[settings.wordsPerLine]}
                    min={3}
                    max={12}
                    step={1}
                    onValueChange={([value]) => updateSetting('wordsPerLine', value)}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md w-8 text-center">
                    {settings.wordsPerLine}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <AlignLeft className="h-3 w-3 text-blue-500" />
                  Max Lines
                </Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[settings.maxLines]}
                    min={1}
                    max={4}
                    step={1}
                    onValueChange={([value]) => updateSetting('maxLines', value)}
                    className="flex-1"
                  />
                  <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md w-8 text-center">
                    {settings.maxLines}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Advanced Settings Collapsible */}
          <Collapsible
            open={showAdvancedSettings}
            onOpenChange={setShowAdvancedSettings}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Advanced Settings</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-blue-500" />
                    Reading Speed (WPM)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[settings.readingSpeed]}
                      min={100}
                      max={300}
                      step={10}
                      onValueChange={([value]) => updateSetting('readingSpeed', value)}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md w-14 text-center">
                      {settings.readingSpeed}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-blue-500" />
                    Spacing (ms)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[settings.spacing]}
                      min={0}
                      max={2000}
                      step={100}
                      onValueChange={([value]) => updateSetting('spacing', value)}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md w-14 text-center">
                      {settings.spacing}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-blue-500" />
                    Start Delay (ms)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={100}
                    value={settings.startDelay}
                    onChange={(e) => updateSetting('startDelay', Number(e.target.value))}
                    className="h-8 text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-blue-500" />
                    End Delay (ms)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={100}
                    value={settings.endDelay}
                    onChange={(e) => updateSetting('endDelay', Number(e.target.value))}
                    className="h-8 text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
              
              <Separator className="my-2" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <AlignLeft className="h-3 w-3 text-blue-500" />
                    Position
                  </Label>
                  <Select
                    value={settings.position}
                    onValueChange={(value) => updateSetting('position', value as 'top' | 'middle' | 'bottom')}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <AlignCenter className="h-3 w-3 text-blue-500" />
                    Alignment
                  </Label>
                  <Select
                    value={settings.alignment}
                    onValueChange={(value) => updateSetting('alignment', value as 'left' | 'center' | 'right')}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Select alignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      <AlignLeft className="h-3 w-3 text-blue-500" />
                      Split by Sentence
                    </Label>
                    <Switch
                      checked={settings.splitBySentence}
                      onCheckedChange={(checked) => updateSetting('splitBySentence', checked)}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, captions will be created by splitting the text into sentences.
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <Button
            onClick={generateCaptionsFromText}
            disabled={!script.trim() || isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 h-10"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                Generating...
              </div>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Captions from Text
              </>
            )}
          </Button>
        </TabsContent>

        {/* Audio-based Caption Generation */}
        <TabsContent value="audio" className="space-y-4 mt-4 animate-in fade-in-50 duration-200">
          <div className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-gradient-to-b from-blue-50/80 to-blue-50/40 dark:from-blue-900/30 dark:to-blue-900/10 shadow-sm">
            <h3 className="text-sm font-medium flex items-center text-blue-700 dark:text-blue-400 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-md mr-2">
                <Volume2 className="h-4 w-4" />
              </div>
              Generate Captions from Audio
            </h3>

            {soundOverlays.length === 0 ? (
              <Alert className="bg-gradient-to-r from-amber-50/80 to-amber-50/40 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200 dark:border-amber-800 shadow-sm">
                <div className="flex items-start">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                  <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                    Add audio files to your timeline first to generate captions.
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="audio-source"
                    className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Select Audio Source
                  </Label>
                  <Select
                    value={selectedAudioId?.toString() || ""}
                    onValueChange={(value) => setSelectedAudioId(Number.parseInt(value))}
                  >
                    <SelectTrigger
                      id="audio-source"
                      className="bg-white dark:bg-gray-800 border-blue-200/70 dark:border-blue-900/50 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                      <SelectValue placeholder="Choose audio track" />
                    </SelectTrigger>
                    <SelectContent>
                      {soundOverlays.map((overlay) => (
                        <SelectItem key={overlay.id} value={overlay.id.toString()}>
                          {overlay.content || `Audio ${overlay.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Audio-specific settings can be added here */}
                
                <Button
                  onClick={generateCaptionsFromAudio}
                  disabled={!selectedAudioId || isGenerating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 mt-4"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Captions from Audio
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CaptionGenerator
