"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Edit, Video, Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  // Handler for navigation that checks authentication status
  const handleNavigation = (path: string) => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push(path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      {/* Header/Navbar */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/logo/VisionVoxLogo.png" 
              alt="VisionVox Logo" 
              width={40} 
              height={40} 
              className="mr-2"
            />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              VisionVox
            </span>
          </Link>
          <div className="flex gap-3">
            {user ? (
              <Button onClick={() => router.push("/dashboard")} variant="ghost" className="font-medium">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => handleNavigation("/login")} variant="ghost" className="font-medium">
                  Sign In
                </Button>
                <Button
                  onClick={() => handleNavigation("/register")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Create Professional Videos <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            Powered by AI
          </span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-3xl">
          VisionVox is an AI-powered video creation platform that helps you create professional videos in minutes. 
          Edit, enhance, and share your videos with ease.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Button
            onClick={() => handleNavigation("/register")}
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Get Started Free
          </Button>
          <Button
            onClick={() => user ? router.push("/editor") : handleNavigation("/login")}
            size="lg"
            variant="outline"
          >
            Try Editor
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card rounded-xl p-8 text-center shadow-sm hover:shadow-md transition-all border border-border/50 hover:border-primary/20 group">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Edit className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Script Generation</h3>
              <p className="text-muted-foreground">
                Create engaging scripts effortlessly with our AI-powered writing assistant
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card rounded-xl p-8 text-center shadow-sm hover:shadow-md transition-all border border-border/50 hover:border-primary/20 group">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Video Editor</h3>
              <p className="text-muted-foreground">
                Edit and arrange your video content with our intuitive timeline interface
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card rounded-xl p-8 text-center shadow-sm hover:shadow-md transition-all border border-border/50 hover:border-primary/20 group">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">All-in-One Solution</h3>
              <p className="text-muted-foreground">
                Streamline your content creation workflow from script to final video
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-card border border-border/50 rounded-2xl p-8 md:p-12 text-center shadow-lg">
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              Get Started Today
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Ready to Create Amazing Videos?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Join Vision Vox today and experience the future of video content creation. Start with AI-powered script
              generation and bring your vision to life.
            </p>
            <Button
              onClick={() => handleNavigation("/register")}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            >
              Create Your Free Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
