import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VisionVox | AI Video Creation Platform",
  description: "Create professional videos with AI-powered scriptwriting, editing, subtitles, and more.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any"
      },
      {
        url: "/favicon/VisionVoxFavicon.png?v=2",
        type: "image/png",
        sizes: "500x500"
      }
    ],
    shortcut: [
      {
        url: "/favicon/VisionVoxFavicon.png?v=2",
        type: "image/png",
        sizes: "500x500"
      }
    ],
    apple: [
      {
        url: "/favicon/VisionVoxFavicon.png?v=2",
        type: "image/png",
        sizes: "500x500"
      }
    ]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <main className="bg-white">
              {children}
              <Toaster />
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
