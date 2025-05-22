import { Metadata } from "next";
import { Fragment } from "react";

export const metadata: Metadata = {
  title: "Thank You Note After Interview Generator | Professional Post-Interview Email Templates & Tips",
  description: "Create personalized thank you notes after job interviews in seconds. Our free generator offers professional templates, examples for phone/video interviews, and expert tips on timing and content. Stand out from other candidates today!",
  keywords: "thank you note after interview, interview thank you email, thank you letter template, post-interview thank you, job interview follow up, professional thank you email, thank you note examples, when to send thank you email, thank you note generator, interview thank you template, phone interview thank you, video interview follow up, group interview thank you, thank you email subject line, interview follow up best practices",
  openGraph: {
    title: "Thank You Note After Interview Generator | Professional Post-Interview Email Templates & Tips",
    description: "Create personalized thank you notes after job interviews in seconds. Our free generator offers professional templates, examples for phone/video interviews, and expert tips on timing and content.",
    url: "https://ainee.com/thank-you-note-after-interview-generator",
    siteName: "Ainee",
    images: [
      {
        url: "/thank-you-note-generator-og.jpg", // Make sure to create this image
        width: 1200,
        height: 630,
        alt: "Thank You Note Generator by Ainee",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thank You Note After Interview Generator | Professional Post-Interview Email Templates & Tips",
    description: "Create personalized thank you notes after job interviews in seconds. Our free generator offers professional templates, examples for phone/video interviews, and expert tips on timing and content.",
    images: ["/thank-you-note-generator-og.jpg"], // Make sure to create this image
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