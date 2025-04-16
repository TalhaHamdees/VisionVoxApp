"use client"

import type React from "react"
import { useRef } from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  Check,
  Loader2,
  Mail,
  UserIcon,
  Shield,
  Bell,
  Key,
  Camera,
  LogOut,
  ExternalLink,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function AccountPage() {
  const { user, loading, updateProfile } = useAuth()
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [projectUpdates, setProjectUpdates] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    // Set page title
    const pageTitleEvent = new CustomEvent("updatePageTitle", {
      detail: {
        badge: "Account",
        title: "Account Settings",
        description: "Manage your account preferences and settings",
      },
    })
    window.dispatchEvent(pageTitleEvent)

    // Initialize form with user data
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setProfilePhoto(user.image || null)
    }
  }, [user, loading, router])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setUpdateSuccess(false)
    setIsUpdating(true)

    try {
      // Use the updateProfile function from auth context
      await updateProfile({
        name,
        email,
        image: profilePhoto || undefined
      });
      
      setIsUpdating(false)
      setUpdateSuccess(true)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 3000)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to update profile');
      setIsUpdating(false);
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setUpdateSuccess(false)

    if (newPassword !== confirmPassword) {
      setFormError("New passwords don't match")
      return
    }

    setIsUpdating(true)

    // Simulate API call
    setTimeout(() => {
      setIsUpdating(false)
      setUpdateSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Reset success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false)
      }, 3000)
    }, 1000)
  }

  const handlePhotoClick = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // Check file type
    if (!file.type.startsWith('image/')) {
      setFormError('Please upload an image file')
      setIsUploading(false)
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size should be less than 5MB')
      setIsUploading(false)
      return
    }

    // Read file as data URL
    const reader = new FileReader()
    reader.onload = (event) => {
      setProfilePhoto(event.target?.result as string)
      setIsUploading(false)
    }
    reader.onerror = () => {
      setFormError('Error reading file')
      setIsUploading(false)
    }
    reader.readAsDataURL(file)
  }

  const removeProfilePhoto = () => {
    setProfilePhoto(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
        </div>
        <p className="text-muted-foreground mt-6 font-medium">Loading your account...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-5xl px-4">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Account Overview */}
        <Card className="w-full md:w-1/3 border shadow-sm overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Account Overview
            </CardTitle>
            <CardDescription>Your account information and status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-6 pt-6">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                <AvatarImage src={profilePhoto || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div 
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md cursor-pointer hover:bg-primary/90 transition-colors"
                onClick={handlePhotoClick}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center">
                <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                {user.email}
              </p>
            </div>

            <Badge
              variant="outline"
              className="bg-primary/10 text-primary hover:bg-primary/15 px-3 py-1 text-xs font-medium"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Active Account
            </Badge>

            <div className="w-full space-y-4 pt-2">
              {/* Member since and Last login sections removed */}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t pt-5 pb-5 bg-muted/10">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full justify-between">
              Go to Dashboard
              <ExternalLink className="h-4 w-4 ml-1 text-muted-foreground" />
            </Button>
            <Button variant="ghost" className="w-full justify-between text-red-500 hover:text-red-600 hover:bg-red-50">
              Sign Out
              <LogOut className="h-4 w-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>

        {/* Settings Tabs */}
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/30 rounded-lg">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4 pt-6">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleProfileUpdate} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email address"
                        className="bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Profile Photo
                      </Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border shadow">
                          <AvatarImage src={profilePhoto || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={handlePhotoClick}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                                  Change Photo
                                </>
                              )}
                            </Button>
                            {profilePhoto && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={removeProfilePhoto}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recommended: Square JPG or PNG, max 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>

                    {updateSuccess && (
                      <Alert className="bg-green-50 text-green-800 border-green-200 flex items-center gap-2">
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <AlertDescription className="font-medium">Profile updated successfully!</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4 pt-6">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    Password
                  </CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handlePasswordUpdate} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-medium">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 h-10 border-muted-foreground/20 focus:border-primary"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm font-medium">
                        New Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 h-10 border-muted-foreground/20 focus:border-primary"
                          placeholder="••••••••"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters and include a number and special character.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 h-10 border-muted-foreground/20 focus:border-primary"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {formError && (
                      <Alert className="bg-red-50 text-red-800 border-red-200 flex items-center gap-2">
                        <div className="bg-red-100 p-1 rounded-full">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <AlertDescription className="font-medium">{formError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="pt-2">
                      <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
                        {isUpdating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>

                    {updateSuccess && (
                      <Alert className="bg-green-50 text-green-800 border-green-200 flex items-center gap-2">
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <AlertDescription className="font-medium">Password updated successfully!</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4 pt-6">
              <Card className="border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Manage how we contact you</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="email-notifications" className="text-base font-medium">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">Receive emails about your account activity</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="project-updates" className="text-base font-medium">
                          Project Updates
                        </Label>
                        <p className="text-sm text-muted-foreground">Get notified about your project status changes</p>
                      </div>
                      <Switch
                        id="project-updates"
                        checked={projectUpdates}
                        onCheckedChange={setProjectUpdates}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="space-y-1">
                        <Label htmlFor="security-alerts" className="text-base font-medium">
                          Security Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts about security incidents and suspicious activities
                        </p>
                      </div>
                      <Switch
                        id="security-alerts"
                        checked={securityAlerts}
                        onCheckedChange={setSecurityAlerts}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="pt-2">
                      <Button className="w-full sm:w-auto" onClick={() => setUpdateSuccess(true)}>
                        Save Preferences
                      </Button>
                    </div>

                    {updateSuccess && (
                      <Alert className="bg-green-50 text-green-800 border-green-200 flex items-center gap-2">
                        <div className="bg-green-100 p-1 rounded-full">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                        <AlertDescription className="font-medium">Notification preferences updated!</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}