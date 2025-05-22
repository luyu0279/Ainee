import { Metadata } from "next";
import { metadata as pageMetadata } from "./metadata";
import { Fragment } from "react";

export const metadata: Metadata =  {
    title: "Ainee | Free AI Flashcard Maker | No Login Required | Instant Generation",
    description: "Create high-quality flashcards instantly with Ainee's free AI flashcard generator. No login required. Upload PDFs, PPT, images, or paste text to generate study-ready flashcards in seconds. Better AI Flashcard Maker than Quizlet with advanced AI technology. Study smarter with our adaptive learning system.",
    keywords: "ai flashcard maker, ai flashcard maker free, flashcard maker ai, ai flashcards, quizlet ai flashcards alternative, ai flashcard generator, flashcards ai, flashcard ai, quizlet ai flashcards, free ai flashcard generator, pdf to flashcards, ppt to flashcards, image to flashcards, no login flashcards, ai study tool, anki alternative, spaced repetition flashcards",
    openGraph: {
      title: "Ainee | Free AI Flashcard Maker | No Login Required | Instant Generation",
      description: "Create high-quality flashcards instantly with Ainee's free AI flashcard generator. No login required. Upload PDFs, PPT, images, or paste text to generate study-ready flashcards in seconds.",
      url: "https://ainee.com/ai-flashcard-maker",
      siteName: "Ainee",
      images: [
        {
          url: "/ai-flashcard-maker-og.jpg",
          width: 1200,
          height: 630,
          alt: "AI Flashcard Maker by Ainee",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Ainee | Free AI Flashcard Maker | No Login Required | Instant Generation",
      description: "Create high-quality flashcards instantly with Ainee's free AI flashcard generator. No login required. Upload PDFs, PPT, images, or paste text to generate study-ready flashcards in seconds.",
      images: ["/ai-flashcard-maker-og.jpg"],
    },
  };

export default function AiFlashcardMakerLayout({
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
