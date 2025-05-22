import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { FileUploadProvider } from "@/contexts/FileUploadContext";
import "./globals.css";
import GoogleAnalytics from "@/components/google-analytics";
import { ConditionalNav } from "@/components/conditional-nav";
import { ConditionalFooter } from "@/components/conditional-footer";
import { RecordingProvider } from '@/contexts/RecordingContext';
import { StagewiseToolbar } from '@stagewise/toolbar-next';

const inter = Inter({ subsets: ["latin"] });

// Stagewise configuration
const stagewiseConfig = {
  plugins: []
};

export const metadata: Metadata = {
  title: "Ainee: AI Notetaking and Learning Companion – Speed Up Your Learning, Enhance Your Insight Sharing",
  description: "Your ultimate AI-powered notetaking and learning companion. Capture lecture notes in real-time and effortlessly transform audio, text, files, and YouTube videos into formatted notes, mindmaps, quizzes, flashcards, podcasts, and more."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <head>
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        <RecordingProvider>
        <AuthProvider>
          <FileUploadProvider>
            <ConditionalNav />
            <main className="flex-1">{children}</main>
            <ConditionalFooter />
            <Toaster />
            {process.env.NODE_ENV === 'development' && (
              <StagewiseToolbar config={stagewiseConfig} />
            )}
          </FileUploadProvider>
        </AuthProvider>
        </RecordingProvider>
      </body>
    </html>
  );
}
