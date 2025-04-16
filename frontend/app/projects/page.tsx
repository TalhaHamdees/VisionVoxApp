"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Download,
  Clock,
  Video,
  FileText,
  Music,
  Image,
  Layers,
  ChevronDown,
} from "lucide-react"
import { format } from "date-fns"

// Project type definition
type ProjectType = "video" | "script" | "audio" | "image" | "all"

interface Project {
  id: string
  name: string
  type: ProjectType
  thumbnail: string
  createdAt: Date
  updatedAt: Date
  description?: string
}

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

export default function ProjectsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<ProjectType>("all")
  const [sortBy, setSortBy] = useState<"name" | "updatedAt" | "createdAt">("updatedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return;
    }

    // Set page title
    const pageTitleEvent = new CustomEvent("updatePageTitle", {
      detail: {
        badge: "Projects",
        title: "My Projects",
        description: "Manage all your VisionVox projects",
      },
    })
    window.dispatchEvent(pageTitleEvent)

    // Load real projects from localStorage
    setIsLoading(true);
    try {
      const loadedProjects = getProjectsFromStorage();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loading, router])

  // Filter projects based on active tab and search query
  const filteredProjects = projects.filter((project) => {
    const matchesType = activeTab === "all" || project.type === activeTab
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      false
    return matchesType && matchesSearch
  })

  // Sort projects based on selected criteria
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") {
      return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    } else {
      const dateA = sortBy === "createdAt" ? a.createdAt : a.updatedAt
      const dateB = sortBy === "createdAt" ? b.createdAt : b.updatedAt
      return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
    }
  })

  // Get project icon based on type
  const getProjectIcon = (type: ProjectType) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "script":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "image":
        return <Image className="h-4 w-4" />
      default:
        return <Layers className="h-4 w-4" />
    }
  }

  // Handle creating a new project
  const handleCreateProject = (type: ProjectType) => {
    switch (type) {
      case "video":
        router.push("/editor")
        break
      case "script":
        router.push("/scriptwriting")
        break
      case "audio":
        router.push("/audio")
        break
      case "image":
        router.push("/image-enhancement")
        break
      default:
        router.push("/dashboard")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your projects...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {/* Header with search and actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
                <SelectItem value="createdAt">Date Created</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-10 w-10 flex items-center justify-center"
              aria-label={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === "asc" ? "rotate-180" : ""}`} />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 h-10">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create New</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCreateProject("video")} className="gap-2 cursor-pointer">
                <Video className="h-4 w-4" />
                <span>Video Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateProject("script")} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4" />
                <span>Script</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateProject("audio")} className="gap-2 cursor-pointer">
                <Music className="h-4 w-4" />
                <span>Audio</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCreateProject("image")} className="gap-2 cursor-pointer">
                <Image className="h-4 w-4" />
                <span>Image</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project type tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as ProjectType)}>
        <TabsList className="grid grid-cols-5 w-full md:w-auto mb-2">
          <TabsTrigger value="all" className="flex items-center justify-center gap-1.5 px-3 py-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">All</span>
            <span className="sr-only sm:not-sr-only">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center justify-center gap-1.5 px-3 py-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Videos</span>
          </TabsTrigger>
          <TabsTrigger value="script" className="flex items-center justify-center gap-1.5 px-3 py-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Scripts</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center justify-center gap-1.5 px-3 py-2">
            <Music className="h-4 w-4" />
            <span className="hidden sm:inline">Audio</span>
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center justify-center gap-1.5 px-3 py-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Images</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderProjectList(sortedProjects)}
        </TabsContent>
        <TabsContent value="video" className="mt-6">
          {renderProjectList(sortedProjects)}
        </TabsContent>
        <TabsContent value="script" className="mt-6">
          {renderProjectList(sortedProjects)}
        </TabsContent>
        <TabsContent value="audio" className="mt-6">
          {renderProjectList(sortedProjects)}
        </TabsContent>
        <TabsContent value="image" className="mt-6">
          {renderProjectList(sortedProjects)}
        </TabsContent>
      </Tabs>
    </div>
  )

  // Helper function to render project list
  function renderProjectList(projects: Project[]) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-primary/10 animate-ping"
              style={{ animationDuration: "2s" }}
            ></div>
            <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
          </div>
          <p className="text-muted-foreground mt-6 font-medium">Loading your projects...</p>
        </div>
      )
    }

    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30">
          <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
            <Layers className="h-12 w-12 text-primary/60" />
          </div>
          <h3 className="text-xl font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            {searchQuery
              ? "Try adjusting your search terms or filters to find what you're looking for."
              : "Create your first project to get started with VisionVox."}
          </p>
          <Button onClick={() => handleCreateProject("video")} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create New Project
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="overflow-hidden hover:shadow-md transition-all duration-300 group border-muted/60 hover:border-primary/20"
          >
            <div
              className="aspect-video bg-muted relative cursor-pointer"
              onClick={() => {
                switch (project.type) {
                  case "video":
                    router.push("/editor")
                    break
                  case "script":
                    router.push("/scriptwriting")
                    break
                  case "audio":
                    router.push("/audio")
                    break
                  case "image":
                    router.push("/image-enhancement")
                    break
                }
              }}
            >
              {/* This would be a real thumbnail in production */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
                <div className="bg-background/80 p-3 rounded-full mb-2">{getProjectIcon(project.type)}</div>
                <span className="text-sm font-medium bg-background/80 px-3 py-1 rounded-full">
                  {project.type.charAt(0).toUpperCase() + project.type.slice(1)} Project
                </span>
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-1 mt-1">{project.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="cursor-pointer">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="pb-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="px-2 py-0 h-5 font-normal">
                  {project.type}
                </Badge>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Updated {format(project.updatedAt, "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 pb-4">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  switch (project.type) {
                    case "video":
                      router.push("/editor")
                      break
                    case "script":
                      router.push("/scriptwriting")
                      break
                    case "audio":
                      router.push("/audio")
                      break
                    case "image":
                      router.push("/image-enhancement")
                      break
                  }
                }}
              >
                Open Project
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }
}