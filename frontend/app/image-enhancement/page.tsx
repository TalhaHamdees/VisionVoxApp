"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/shared/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import {
  Upload,
  Loader2,
  Download,
  Wand2,
  ZoomIn,
  Sparkles,
  LucideImage,
  CheckCircle,
  ArrowLeftRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function ImageEnhancementPage() {
  // Auth and routing
  const { user, loading } = useAuth()
  const router = useRouter()

  // File and processing states
  const [file, setFile] = useState<File | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [hasEnhanced, setHasEnhanced] = useState(false)
  const [enhancementLevel] = useState(70)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null)
  const [enhancementOptions, setEnhancementOptions] = useState({
    upscale: true,
  })

  // UI states
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<"fit" | "actual">("fit")

  // Image dimensions
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null)
  const [enhancedDimensions, setEnhancedDimensions] = useState<{ width: number; height: number } | null>(null)

  // Comparison slider
  const [sliderPosition, setSliderPosition] = useState(50)
  const sliderContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent("updatePageTitle", {
      detail: {
        badge: "Images",
        title: "Image Enhancement",
        description: "Enhance and upscale your images with AI",
      },
    })
    window.dispatchEvent(pageTitleEvent)
  }, [])

  // Function to analyze image quality
  const analyzeImage = async (imageFile: File) => {
    console.log("Analyzing image file:", imageFile.name)
    const formData = new FormData()
    formData.append("image", imageFile)
    console.log("FormData created with image file")

    try {
      console.log("Sending analyze request...")
      const response = await fetch("/api/image-enhancement?action=analyze", {
        method: "POST",
        body: formData,
      })

      console.log("Analyze response status:", response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Analysis failed with status:", response.status, "Error:", errorText)
        throw new Error(`Failed to analyze image: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Analysis data received:", data)
      setAnalysisResult(data.qualityCheck)
      return data
    } catch (error) {
      console.error("Error analyzing image:", error)
      setError("Failed to analyze image quality")
      return null
    }
  }

  // Function to get image dimensions
  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = reject
      img.src = url
    })
  }

  // Enhanced image enhancement function
  const enhanceImage = async () => {
    if (!file) return

    console.log("Starting image enhancement for file:", file.name)
    setIsEnhancing(true)
    setError(null)

    try {
      // First analyze the image
      console.log("Analyzing image...")
      const analysis = await analyzeImage(file)
      console.log("Analysis result:", analysis)

      // Get original image dimensions
      if (previewUrl) {
        try {
          const dimensions = await getImageDimensions(previewUrl)
          setOriginalDimensions(dimensions)
          console.log("Original dimensions:", dimensions)
        } catch (error) {
          console.error("Error getting original dimensions:", error)
        }
      }

      // Prepare form data for enhancement
      const formData = new FormData()
      formData.append("image", file)
      formData.append("enhancementLevel", enhancementLevel.toString())

      // Append enhancement options
      Object.entries(enhancementOptions).forEach(([key, value]) => {
        formData.append(key, value.toString())
      })

      console.log("Sending enhancement request with options:", enhancementOptions)
      // Send enhancement request
      const response = await fetch("/api/image-enhancement?action=enhance", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Enhancement failed with status:", response.status, "Error:", errorText)
        throw new Error(`Failed to enhance image: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.success) {
        setEnhancedUrl(data.enhancedImage)
        setHasEnhanced(true)

        // Get enhanced image dimensions
        setTimeout(async () => {
          if (data.enhancedImage) {
            try {
              const dimensions = await getImageDimensions(data.enhancedImage)
              setEnhancedDimensions(dimensions)
              console.log("Enhanced dimensions:", dimensions)
            } catch (error) {
              console.error("Error getting enhanced dimensions:", error)
            }
          }
        }, 500) // Small delay to ensure the image is loaded
      } else {
        throw new Error(data.message || "Enhancement failed")
      }
    } catch (error) {
      console.error("Error enhancing image:", error)
      setError((error as Error).message)
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      console.log("File selected:", selectedFile.name, "Size:", selectedFile.size, "Type:", selectedFile.type)
      setFile(selectedFile)

      // Create a preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string)
          console.log("Preview URL created")
        }
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleOptionChange = (option: keyof typeof enhancementOptions) => {
    setEnhancementOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }))
  }

  const resetOptions = () => {
    setEnhancementOptions({
      upscale: true,
    })
  }

  // Function to download the enhanced image
  const downloadEnhancedImage = () => {
    if (!enhancedUrl) return

    // Create a link element
    const link = document.createElement("a")
    link.href = enhancedUrl
    link.download = `enhanced-${file?.name || "image"}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type.startsWith("image/")) {
        setFile(droppedFile)

        // Create a preview URL
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setPreviewUrl(e.target.result as string)
          }
        }
        reader.readAsDataURL(droppedFile)
      } else {
        setError("Please upload an image file (JPG, PNG, WEBP)")
      }
    }
  }

  // Comparison slider handlers
  const handleSliderChange = (value: number[]) => {
    setSliderPosition(value[0])
  }

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    if (sliderContainerRef.current) {
      isDraggingRef.current = true
      document.addEventListener("mousemove", handleSliderMouseMove)
      document.addEventListener("mouseup", handleSliderMouseUp)
    }
  }

  const handleSliderMouseMove = (e: MouseEvent) => {
    if (isDraggingRef.current && sliderContainerRef.current) {
      const container = sliderContainerRef.current
      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const percentage = Math.round((x / rect.width) * 100)
      setSliderPosition(percentage)
    }
  }

  const handleSliderMouseUp = () => {
    isDraggingRef.current = false
    document.removeEventListener("mousemove", handleSliderMouseMove)
    document.removeEventListener("mouseup", handleSliderMouseUp)
  }

  // Touch events for mobile
  const handleSliderTouchStart = (e: React.TouchEvent) => {
    if (sliderContainerRef.current) {
      isDraggingRef.current = true
      document.addEventListener("touchmove", handleSliderTouchMove, { passive: false })
      document.addEventListener("touchend", handleSliderTouchEnd)
    }
  }

  const handleSliderTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    if (isDraggingRef.current && sliderContainerRef.current && e.touches[0]) {
      const container = sliderContainerRef.current
      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width))
      const percentage = Math.round((x / rect.width) * 100)
      setSliderPosition(percentage)
    }
  }

  const handleSliderTouchEnd = () => {
    isDraggingRef.current = false
    document.removeEventListener("touchmove", handleSliderTouchMove)
    document.removeEventListener("touchend", handleSliderTouchEnd)
  }

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleSliderMouseMove)
      document.removeEventListener("mouseup", handleSliderMouseUp)
      document.removeEventListener("touchmove", handleSliderTouchMove)
      document.removeEventListener("touchend", handleSliderTouchEnd)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Image Upscaler</h1>

        <div className="grid grid-cols-1 gap-8">
          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Card */}
            <Card className="border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Upload className="mr-2 h-5 w-5 text-primary" />
                  Upload Image
                </CardTitle>
                <CardDescription>Upload an image to upscale its resolution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload area */}
                <div
                  className={cn(
                    "border-2 rounded-lg p-6 text-center transition-colors duration-200",
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5",
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    <LucideImage className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {file ? file.name : "Drag and drop an image here, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground">Supports JPG, PNG, WEBP (max 10MB)</p>
                  </label>
                </div>

                {previewUrl && (
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={previewUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-auto object-contain max-h-[300px]"
                    />
                  </div>
                )}

                {file && (
                  <div className="flex justify-center">
                    <Button
                      onClick={enhanceImage}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      disabled={isEnhancing}
                    >
                      {isEnhancing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Upscaling...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Upscale Image
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card className="border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Sparkles className="mr-2 h-5 w-5 text-primary" />
                  Upscaling Information
                </CardTitle>
                <CardDescription>How our AI upscaler works</CardDescription>
                <div className="mt-2 p-3 bg-muted/30 rounded-md text-xs">
                  <p className="font-medium">Powered by ESRGAN (Enhanced Super-Resolution GAN)</p>
                  <p className="mt-1">
                    ESRGAN is an advanced AI model specialized in upscaling images while recovering fine details and
                    textures. It excels at enhancing low-resolution images to appear sharper and more detailed.
                  </p>
                  <p className="mt-1">
                    This implementation uses pure ESRGAN without additional post-processing for the most authentic
                    AI-enhanced results.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold mb-2">Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span>4x resolution increase</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span>Enhanced details and textures</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span>Automatic image type detection</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span>Optimized for photos and illustrations</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results section */}
          {hasEnhanced && (
            <div className="mt-8">
              <Card className="border border-border/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-xl">
                      <ZoomIn className="mr-2 h-5 w-5 text-primary" />
                      Upscaled Result
                    </CardTitle>
                    <Badge variant="secondary" className="ml-2">
                      AI Upscaled
                    </Badge>
                  </div>
                  <CardDescription>Compare the original and upscaled images</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="comparison" className="w-full">
                    <TabsList className="w-full mb-6 grid grid-cols-4">
                      <TabsTrigger value="comparison">Side by Side</TabsTrigger>
                      <TabsTrigger value="slider">Slider Comparison</TabsTrigger>
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="enhanced">Upscaled</TabsTrigger>
                    </TabsList>

                    {/* Side by Side Comparison */}
                    <TabsContent value="comparison">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Original</p>
                            <Badge variant="outline" className="text-xs">
                              {originalDimensions
                                ? `${originalDimensions.width}×${originalDimensions.height}`
                                : "Loading..."}
                            </Badge>
                          </div>
                          <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5">
                            <div
                              className="relative overflow-hidden"
                              style={{ minHeight: "200px", maxHeight: "400px" }}
                            >
                              <img
                                src={previewUrl! || "/placeholder.svg"}
                                alt="Original"
                                className="w-full h-auto object-contain max-h-[400px]"
                                style={{ maxWidth: "100%" }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Upscaled</p>
                            <Badge variant="outline" className="text-xs bg-primary/10">
                              {enhancedDimensions
                                ? `${enhancedDimensions.width}×${enhancedDimensions.height}`
                                : "Processing..."}
                            </Badge>
                          </div>
                          <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5">
                            <div
                              className="relative overflow-hidden"
                              style={{ minHeight: "200px", maxHeight: "400px" }}
                            >
                              {enhancedUrl ? (
                                <img
                                  src={enhancedUrl || "/placeholder.svg"}
                                  alt="Upscaled"
                                  className="w-full h-auto object-contain max-h-[400px]"
                                  style={{ maxWidth: "100%" }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-[400px] bg-muted/20">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Slider Comparison */}
                    <TabsContent value="slider">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Drag the slider to compare</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Original
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-primary/10">
                              Upscaled
                            </Badge>
                          </div>
                        </div>

                        {/* Slider control */}
                        <div className="mb-4">
                          <Slider
                            value={[sliderPosition]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={handleSliderChange}
                            className="py-4"
                          />
                        </div>

                        {/* Image comparison with slider */}
                        <div
                          ref={sliderContainerRef}
                          className="relative rounded-lg overflow-hidden border border-border/50 bg-black/5 cursor-col-resize"
                          style={{ minHeight: "300px", maxHeight: "500px" }}
                          onMouseDown={handleSliderMouseDown}
                          onTouchStart={handleSliderTouchStart}
                        >
                          {previewUrl && enhancedUrl ? (
                            <>
                              {/* Original image (left side) */}
                              <div
                                className="absolute top-0 left-0 h-full overflow-hidden"
                                style={{ width: `${sliderPosition}%` }}
                              >
                                <img
                                  src={previewUrl || "/placeholder.svg"}
                                  alt="Original"
                                  className="h-full w-auto object-cover"
                                  style={{
                                    maxWidth: "none",
                                    width: `${100 / (sliderPosition / 100)}%`,
                                    objectPosition: "left top",
                                  }}
                                />
                              </div>

                              {/* Enhanced image (right side) */}
                              <div
                                className="absolute top-0 right-0 h-full overflow-hidden"
                                style={{ width: `${100 - sliderPosition}%`, left: `${sliderPosition}%` }}
                              >
                                <img
                                  src={enhancedUrl || "/placeholder.svg"}
                                  alt="Enhanced"
                                  className="h-full w-auto object-cover"
                                  style={{
                                    maxWidth: "none",
                                    width: `${100 / ((100 - sliderPosition) / 100)}%`,
                                    objectPosition: "right top",
                                    transform: `translateX(-${sliderPosition}%)`,
                                  }}
                                />
                              </div>

                              {/* Slider handle */}
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-white shadow-md cursor-col-resize z-10"
                                style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
                              >
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-[400px] bg-muted/20">
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Original Image */}
                    <TabsContent value="original">
                      <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5">
                        <div className="relative overflow-hidden" style={{ minHeight: "300px", maxHeight: "600px" }}>
                          <img
                            src={previewUrl! || "/placeholder.svg"}
                            alt="Original"
                            className="w-full h-auto object-contain max-h-[600px] mx-auto"
                            style={{ maxWidth: "100%" }}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Enhanced Image */}
                    <TabsContent value="enhanced">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant={zoomLevel === "fit" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setZoomLevel("fit")}
                              className="text-xs"
                            >
                              Fit to Screen
                            </Button>
                            <Button
                              variant={zoomLevel === "actual" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setZoomLevel("actual")}
                              className="text-xs"
                            >
                              Actual Size
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {zoomLevel === "actual" ? "Showing actual upscaled size" : "Scaled to fit screen"}
                          </p>
                        </div>
                        <div className="rounded-lg overflow-hidden border border-border/50 bg-black/5">
                          <div
                            className={`relative overflow-${zoomLevel === "fit" ? "hidden" : "auto"}`}
                            style={{
                              minHeight: "300px",
                              maxHeight: zoomLevel === "fit" ? "600px" : "600px",
                            }}
                          >
                            {enhancedUrl ? (
                              <img
                                src={enhancedUrl || "/placeholder.svg"}
                                alt="Upscaled"
                                className={`${zoomLevel === "fit" ? "w-full h-auto object-contain max-h-[600px] mx-auto" : "w-auto h-auto"}`}
                                style={{ maxWidth: zoomLevel === "fit" ? "100%" : "none" }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-[600px] bg-muted/20">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-end bg-muted/10 py-4">
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    onClick={downloadEnhancedImage}
                    disabled={!enhancedUrl}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Upscaled Image
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

