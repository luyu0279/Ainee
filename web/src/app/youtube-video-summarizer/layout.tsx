import { Metadata } from "next";
import { metadata as pageMetadata } from "./metadata";
import { Fragment } from "react";
export const metadata: Metadata =  {
  title: "YouTube Summarizer with AI - Online Free No Login Required",
  description: "Access free transcripts and subtitles for YouTube videos online, and then utilize ChatGPT\\Claude\\Deepseek for video summarization. Enhance your learning efficiency at no cost! With Ainee, easily obtain YouTube video summaries and subtitles without any login required.",
  keywords: "video summarizer, youtube summarizer, summarizing tool, youtube transcripts, TLDR ai, youtube video ai summarizer, video summarizer ai, ai summarizer, summarize youtube video, online ai summarizer",
  openGraph: {
    title: "YouTube Summarizer with AI - Online Free No Login Required",
    description: "Access free transcripts and subtitles for YouTube videos online. Enhance learning efficiency with AI-powered summaries at no cost, no login required.",
    url: "https://ainee.com/youtube-video-summarizer",
    siteName: "Ainee",
    images: [
      {
        url: "/youtube-summarizer-og.jpg", // Make sure to create this image
        width: 1200,
        height: 630,
        alt: "YouTube Video Summarizer by Ainee",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Summarizer with AI - Online Free No Login Required",
    description: "Access free transcripts and subtitles for YouTube videos online. Enhance learning efficiency with AI-powered summaries at no cost, no login required.",
    images: ["/youtube-summarizer-og.jpg"], // Make sure to create this image
  },
}; 

export default function ThankYouNoteGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Fragment>
      {children}
    </Fragment>
  );
} 