"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useEditorContext } from "../../../contexts/editor-context"
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning"
import { useTimeline } from "../../../contexts/timeline-context"
import type { CaptionOverlay, Caption, SoundOverlay } from "../../../types"
import { OverlayType } from "../../../types"
import { CaptionSettings } from "./caption-settings"
import { Upload, Mic, Loader2, Split, Volume2, FileText, Wand2, Subtitles, AlertCircle, X, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import TranscriptionService from "@/lib/services/transcription-service"

/**
 * Interface for word timing data from uploaded files
 * @interface WordData
 */
interface WordData {
  word: string
  start: number
  end: number
  confidence: number
}

/**
 * Interface for the structure of uploaded caption files
 * @interface WordsFileData
 */
interface WordsFileData {
  words: WordData[]
}

/**
 * CaptionsPanel Component
 *
 * @component
 * @description
 * Main interface for managing captions in the video editor.
 * Provides functionality for:
 * - Uploading caption files (.json)
 * - Manual script entry
 * - Caption generation from text
 * - Caption editing and styling
 * - Automatic caption generation from audio
 *
 * The component handles both the initial caption creation process
 * and the management of existing captions through different states
 * and interfaces.
 *
 * Features:
 * - File upload support
 * - Text-to-caption conversion
 * - Automatic timing calculation
 * - Position management in the timeline
 * - Integration with the editor's overlay system
 *
 * @example
 * \`\`\`tsx
 * <CaptionsPanel />
 * \`\`\`
 */
export const CaptionsPanel: React.FC = () => {
  const [script, setScript] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [splitBySentence, setSplitBySentence] = useState(true)
  const [showAutoDialog, setShowAutoDialog] = useState(false)
  const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null)
  const [apiKey, setApiKey] = useState<string>("")
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState<boolean | null>(null)

  const { addOverlay, overlays, selectedOverlayId, durationInFrames, changeOverlay, currentFrame } = useEditorContext()

  const { findNextAvailablePosition } = useTimelinePositioning()
  const { visibleRows } = useTimeline()
  const [localOverlay, setLocalOverlay] = useState<CaptionOverlay | null>(null)

  // Get all sound overlays for audio-based caption generation
  const soundOverlays = overlays.filter((overlay) => overlay.type === OverlayType.SOUND) as SoundOverlay[]

  // Check if API key is configured on the server
  useEffect(() => {
    async function checkApiKeyConfig() {
      try {
        const response = await fetch("/api/elevenlabs/check-config")
        const data = await response.json()
        setIsApiKeyConfigured(data.isConfigured)
      } catch (error) {
        console.error("Error checking API key configuration:", error)
        setIsApiKeyConfigured(false)
      }
    }

    if (showAutoDialog && isApiKeyConfigured === null) {
      checkApiKeyConfig()
    }
  }, [showAutoDialog, isApiKeyConfigured])

  useEffect(() => {
    if (selectedOverlayId === null) {
      return
    }

    const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId)

    if (selectedOverlay?.type === OverlayType.CAPTION) {
      setLocalOverlay(selectedOverlay as CaptionOverlay)
    }
  }, [selectedOverlayId, overlays])

  useEffect(() => {
    // Check if there's a temporary script waiting to be used
    const tempScript = localStorage.getItem("visionvox_temp_script")
    if (tempScript && !script) {
      setScript(tempScript)
      // Clear the temporary script to avoid reusing it unintentionally
      localStorage.removeItem("visionvox_temp_script")
    }
  }, [script])

  // Function to fetch a blob from a URL
  const fetchBlobFromUrl = async (url: string): Promise<Blob> => {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error("Failed to fetch audio file")
    }

    const blob = await response.blob()
    console.log("Fetched audio blob:", {
      type: blob.type,
      size: blob.size,
      url: url,
    })

    // Check if the blob has a valid audio MIME type
    if (!blob.type.startsWith("audio/")) {
      console.warn("Audio blob doesn't have an audio MIME type:", blob.type)
    }

    return blob
  }

  // Generate captions from selected audio using ElevenLabs transcription
  const handleGenerateFromAudio = async () => {
    console.log("handleGenerateFromAudio called with selectedAudioId:", selectedAudioId)
    console.log("Available sound overlays:", soundOverlays)

    // Check if we need a custom API key
    if (!isApiKeyConfigured && !apiKey) {
      setShowApiKeyInput(true)
      toast({
        title: "API Key Required",
        description:
          "Please enter your ElevenLabs API key to generate captions or configure it in your environment variables.",
        variant: "destructive",
      })
      return
    }

    // Get the currently selected value from the dropdown if selectedAudioId is null
    const audioId =
      selectedAudioId ||
      (document.getElementById("audio-source-dialog")?.textContent &&
        Number.parseInt(document.getElementById("audio-source-dialog")?.textContent || "0"))

    console.log("Using audioId:", audioId)

    // Find the overlay directly from the list instead of using selectedAudioId
    const audioOverlay =
      soundOverlays.find((overlay) => overlay.id === audioId) || (soundOverlays.length > 0 ? soundOverlays[0] : null)

    if (!audioOverlay || !audioOverlay.src) {
      toast({
        title: "Audio Required",
        description: "Please select an audio file to generate captions from.",
        variant: "destructive",
      })
      return
    }

    // Close the dialog
    setShowAutoDialog(false)

    // Start generating
    setIsGenerating(true)

    try {
      console.log("Using audio overlay:", audioOverlay)

      // Get the audio file as a blob
      const audioBlob = await fetchBlobFromUrl(audioOverlay.src)

      // Make sure we have an appropriate file type for ElevenLabs
      let processedBlob = audioBlob

      // If the file doesn't have an audio MIME type, try to create one based on file extension
      if (!audioBlob.type.startsWith("audio/")) {
        const srcLower = audioOverlay.src.toLowerCase()
        let mimeType = "audio/mpeg" // Default to mp3

        if (srcLower.endsWith(".wav")) {
          mimeType = "audio/wav"
        } else if (srcLower.endsWith(".mp3")) {
          mimeType = "audio/mpeg"
        } else if (srcLower.endsWith(".ogg")) {
          mimeType = "audio/ogg"
        } else if (srcLower.endsWith(".m4a")) {
          mimeType = "audio/mp4"
        }

        // Create a new blob with the correct MIME type
        processedBlob = new Blob([audioBlob], { type: mimeType })
        console.log("Created new blob with MIME type:", mimeType)
      }

      toast({
        title: "Transcribing Audio",
        description: "Your audio is being transcribed with ElevenLabs. This may take a moment.",
      })

      // Only pass API key if environment variable is not configured
      const captions = await TranscriptionService.audioToCaptions(
        processedBlob,
        {},
        !isApiKeyConfigured ? apiKey : undefined,
      )

      // Adjust start times to match the audio's position on the timeline
      const adjustedCaptions = captions.map((caption) => ({
        ...caption,
        startMs: caption.startMs + (audioOverlay.from / 30) * 1000,
        endMs: caption.endMs + (audioOverlay.from / 30) * 1000,
        timestampMs: caption.timestampMs ? caption.timestampMs + (audioOverlay.from / 30) * 1000 : null,
        words: caption.words.map((word) => ({
          ...word,
          startMs: word.startMs + (audioOverlay.from / 30) * 1000,
          endMs: word.endMs + (audioOverlay.from / 30) * 1000,
        })),
      }))

      // Calculate position on timeline
      const position = findNextAvailablePosition(overlays, visibleRows, durationInFrames)

      // Create caption overlay
      const newCaptionOverlay: CaptionOverlay = {
        id: Date.now(),
        type: OverlayType.CAPTION,
        from: audioOverlay.from, // Align with audio
        durationInFrames: audioOverlay.durationInFrames,
        captions: adjustedCaptions,
        left: 230,
        top: 414,
        width: 833,
        height: 269,
        rotation: 0,
        isDragging: false,
        row: position.row,
      }

      addOverlay(newCaptionOverlay)

      toast({
        title: "Captions Generated",
        description: `Successfully generated ${adjustedCaptions.length} caption segments from your audio.`,
      })
    } catch (error) {
      console.error("Error generating captions from audio:", error)
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate captions from audio.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setSelectedAudioId(null)
    }
  }

  const generateCaptions = () => {
    if (!script.trim()) {
      setErrorMessage("Please enter some text to generate captions")
      return
    }

    setIsGenerating(true)
    setErrorMessage(null)

    try {
      const sentences = splitBySentence
        ? script
            .split(/[.!?]+/)
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 0)
        : [script.trim()]

      let currentStartTime = 0
      const wordsPerMinute = 160
      const msPerWord = (60 * 1000) / wordsPerMinute

      const processedCaptions: Caption[] = sentences.map((sentence) => {
        // Make sure words are properly split with spaces
        const words = sentence.split(/\s+/).filter((word) => word.trim().length > 0)
        const sentenceStartTime = currentStartTime

        const processedWords = words.map((word, index) => ({
          word: word.trim(),
          startMs: sentenceStartTime + index * msPerWord,
          endMs: sentenceStartTime + (index + 1) * msPerWord,
          confidence: 0.99,
        }))

        // Ensure text has proper spaces between words
        const caption: Caption = {
          text: words.join(" ").trim(),
          startMs: sentenceStartTime,
          endMs: sentenceStartTime + words.length * msPerWord,
          timestampMs: null,
          confidence: 0.99,
          words: processedWords,
        }

        currentStartTime = caption.endMs + 500
        return caption
      })

      // Calculate total duration in frames
      const totalDurationMs = currentStartTime
      const calculatedDurationInFrames = Math.ceil((totalDurationMs / 1000) * 30)

      const position = findNextAvailablePosition(overlays, visibleRows, durationInFrames)

      const newCaptionOverlay: CaptionOverlay = {
        id: Date.now(),
        type: OverlayType.CAPTION,
        from: position.from, // Use the position from findNextAvailablePosition
        durationInFrames: calculatedDurationInFrames,
        captions: processedCaptions,
        left: 230,
        top: 414,
        width: 833,
        height: 269,
        rotation: 0,
        isDragging: false,
        row: position.row,
      }

      addOverlay(newCaptionOverlay)
      setScript("")
    } catch (error) {
      console.error("Error generating captions:", error)
      setErrorMessage("Failed to generate captions. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateOverlay = (updatedOverlay: CaptionOverlay) => {
    setLocalOverlay(updatedOverlay)
    changeOverlay(updatedOverlay.id, updatedOverlay)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsGenerating(true)
    setErrorMessage(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string) as WordsFileData

        // Group words into chunks based on user preference
        const processedCaptions: Caption[] = []
        if (splitBySentence) {
          // Logic for sentence-based grouping
          let currentSentence: WordData[] = []
          let sentenceText = ""

          for (let i = 0; i < jsonData.words.length; i++) {
            const word = jsonData.words[i]
            currentSentence.push(word)
            sentenceText += word.word + " "

            // Check if end of sentence (period, question mark, exclamation)
            if (word.word.match(/[.!?]$/) || i === jsonData.words.length - 1) {
              if (currentSentence.length > 0) {
                const startMs = currentSentence[0].start * 1000
                const endMs = currentSentence[currentSentence.length - 1].end * 1000

                processedCaptions.push({
                  text: sentenceText.trim(),
                  startMs,
                  endMs,
                  timestampMs: null,
                  confidence: currentSentence.reduce((acc, w) => acc + w.confidence, 0) / currentSentence.length,
                  words: currentSentence.map((w) => ({
                    word: w.word,
                    startMs: w.start * 1000,
                    endMs: w.end * 1000,
                    confidence: w.confidence,
                  })),
                })

                currentSentence = []
                sentenceText = ""
              }
            }
          }
        } else {
          // Group words into fixed-size chunks
          for (let i = 0; i < jsonData.words.length; i += 5) {
            const wordChunk = jsonData.words.slice(i, i + 5)
            const startMs = wordChunk[0].start * 1000
            const endMs = wordChunk[wordChunk.length - 1].end * 1000

            const captionText = wordChunk.map((w) => w.word).join(" ")

            processedCaptions.push({
              text: captionText,
              startMs,
              endMs,
              timestampMs: null,
              confidence: wordChunk.reduce((acc, w) => acc + w.confidence, 0) / wordChunk.length,
              words: wordChunk.map((w) => ({
                word: w.word,
                startMs: w.start * 1000,
                endMs: w.end * 1000,
                confidence: w.confidence,
              })),
            })
          }
        }

        // Calculate total duration
        const totalDurationMs = processedCaptions[processedCaptions.length - 1].endMs
        const calculatedDurationInFrames = Math.ceil((totalDurationMs / 1000) * 30)

        const position = findNextAvailablePosition(overlays, visibleRows, durationInFrames)

        const newCaptionOverlay: CaptionOverlay = {
          id: Date.now(),
          type: OverlayType.CAPTION,
          from: position.from, // Use the position from findNextAvailablePosition
          durationInFrames: calculatedDurationInFrames,
          captions: processedCaptions,
          left: 230,
          top: 414,
          width: 833,
          height: 269,
          rotation: 0,
          isDragging: false,
          row: position.row,
        }

        addOverlay(newCaptionOverlay)
      } catch (error) {
        console.error("Error processing file:", error)
        // If it's not JSON, treat it as plain text
        const text = e.target?.result
        if (typeof text === "string") {
          setScript(text)
        } else {
          setErrorMessage("Invalid file format. Please upload a valid JSON file.")
        }
      } finally {
        setIsGenerating(false)
      }
    }

    reader.onerror = () => {
      setErrorMessage("Failed to read the file. Please try again.")
      setIsGenerating(false)
    }

    reader.readAsText(file)
  }

  // Speech recognition simulation
  const startSpeechRecognition = () => {
    setIsListening(true)

    // This is a placeholder for actual speech recognition implementation
    // In a real implementation, we would use the Web Speech API or a similar service
    setTimeout(() => {
      setScript((prev) => prev + (prev ? " " : "") + "This is a simulated transcription from speech recognition.")
      setIsListening(false)
    }, 3000)
  }

  // Open auto-captions dialog if there are audio tracks, otherwise show a message
  const openAutoCaptionsDialog = () => {
    if (soundOverlays.length === 0) {
      toast({
        title: "No Audio Found",
        description: "Please add audio to your timeline first to generate automatic captions.",
        variant: "destructive",
      })
      return
    }

    setShowAutoDialog(true)
  }

  return (
    <div className="flex flex-col gap-6 p-4 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-900/80 dark:to-gray-900/40 rounded-lg">
      {/* Auto-Caption Dialog */}
      <Dialog open={showAutoDialog} onOpenChange={setShowAutoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Subtitles className="h-5 w-5" />
              Generate Automatic Captions
            </DialogTitle>
            <DialogDescription>
              Select an audio track from your timeline to generate captions with ElevenLabs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="audio-source-dialog" className="text-sm font-medium flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                Select Audio Track
              </Label>
              <Select
                value={selectedAudioId?.toString() || ""}
                onValueChange={(value) => {
                  console.log("Selected value:", value, "Type:", typeof value)
                  if (value && value.trim() !== "") {
                    const parsedId = Number.parseInt(value)
                    console.log("Parsed ID:", parsedId, "isNaN:", Number.isNaN(parsedId))
                    setSelectedAudioId(parsedId)

                    // Find the selected audio overlay to verify it exists
                    const audioOverlay = soundOverlays.find((overlay) => overlay.id === parsedId)
                    console.log("Found audio overlay:", audioOverlay)
                  } else {
                    console.log("Setting selectedAudioId to null")
                    setSelectedAudioId(null)
                  }
                }}
              >
                <SelectTrigger
                  id="audio-source-dialog"
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

            {isApiKeyConfigured === false && (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Label htmlFor="api-key-input" className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                    ElevenLabs API Key
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="h-7 px-2 text-xs"
                  >
                    {showApiKeyInput ? "Hide" : "Show"}
                  </Button>
                </div>

                {showApiKeyInput && (
                  <div className="flex gap-2">
                    <input
                      id="api-key-input"
                      type="password"
                      placeholder="Enter your ElevenLabs API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}

                <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                  <span>For persistent usage, set ELEVENLABS_API_KEY in your .env.local file</span>
                </div>
              </div>
            )}

            {isApiKeyConfigured === true && (
              <div className="text-xs text-green-600 dark:text-green-400 flex items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                API key configured in environment variables
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowAutoDialog(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleGenerateFromAudio}
              disabled={isGenerating || (isApiKeyConfigured === false && !apiKey)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Captions {selectedAudioId ? `(ID: ${selectedAudioId})` : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!localOverlay ? (
        <>
          {/* Prominent Auto-Captions Button */}
          <Button
            onClick={openAutoCaptionsDialog}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-md"
            disabled={isGenerating}
          >
            <div className="bg-blue-500/30 p-1.5 rounded-md mr-2">
              <Subtitles className="w-5 h-5" />
            </div>
            <span className="font-medium">Generate Automatic Captions</span>
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-3 py-1 text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                or generate manually
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {errorMessage && (
              <Alert
                variant="destructive"
                className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 border-gray-200 dark:border-gray-700 
                  hover:border-blue-500/50 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-800/50 dark:to-gray-900/50 
                  hover:bg-gradient-to-b hover:from-blue-50/50 hover:to-white dark:hover:from-blue-900/20 dark:hover:to-gray-900/50 h-28 
                  flex flex-col items-center justify-center gap-3 text-sm group transition-all duration-200 shadow-sm hover:shadow"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={isGenerating}
                >
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium transition-colors">
                      Upload Caption File
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Supported formats: .json, .txt, .srt, .vtt
                    </span>
                  </div>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt,.srt,.vtt,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-x-0 -top-3 flex items-center justify-center">
                  <span className="px-3 py-1 text-xs text-gray-600 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800">
                    or
                  </span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      size="sm"
                      variant={isListening ? "destructive" : "outline"}
                      className={`h-8 px-3 ${
                        isListening ? "bg-red-600 hover:bg-red-700 text-white" : "border-gray-300 dark:border-gray-600"
                      }`}
                      onClick={startSpeechRecognition}
                      disabled={isGenerating || isListening}
                    >
                      {isListening ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 mr-1.5" />
                          Speech to Text
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant={splitBySentence ? "secondary" : "outline"}
                      onClick={() => setSplitBySentence(!splitBySentence)}
                      className={`h-8 px-3 ml-auto ${
                        splitBySentence
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-800"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <Split className="w-3.5 h-3.5 mr-1.5" />
                      Split by Sentence: {splitBySentence ? "On" : "Off"}
                    </Button>
                  </div>

                  <div className="relative">
                    <Textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Type or paste your script here..."
                      className="min-h-[200px] bg-white dark:bg-gray-800/50 
                      border-gray-300 dark:border-gray-700 
                      text-gray-900 dark:text-gray-200 
                      placeholder:text-gray-400 dark:placeholder:text-gray-500 
                      focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/30 
                      transition-all rounded-lg shadow-sm"
                      disabled={isGenerating || isListening}
                    />
                    {!script && (
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 bg-gray-50/80 dark:bg-gray-800/80 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                        <Info className="w-3 h-3" />
                        Enter text to generate captions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={generateCaptions}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200
                disabled:bg-gradient-to-r disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-500 disabled:dark:from-gray-800 disabled:dark:to-gray-700 
                disabled:dark:text-gray-600 disabled:opacity-100 disabled:cursor-not-allowed disabled:shadow-none"
                disabled={!script.trim() || isGenerating || isListening}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Captions
                  </>
                )}
              </Button>
              {script && (
                <Button
                  variant="outline"
                  className="text-sm text-gray-600 dark:text-gray-400 
                  hover:text-gray-700 dark:hover:text-gray-300 
                  hover:bg-gray-100/80 dark:hover:bg-gray-800/80 
                  border-gray-300 dark:border-gray-600 transition-colors"
                  onClick={() => setScript("")}
                  disabled={isGenerating || isListening}
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
        <CaptionSettings
          currentFrame={currentFrame}
          localOverlay={localOverlay}
          setLocalOverlay={handleUpdateOverlay}
          startFrame={localOverlay.from}
          captions={localOverlay.captions}
        />
      )}
    </div>
  )
}
