import { Metadata } from "next";
import { Fragment } from "react";

export const metadata: Metadata = {
  title: "Ainee | Cornell Notes AI generator | Transform Documents to Cornell Notes | Free Templates",
  description: "Convert your PDF, Word, and PowerPoint documents into Cornell note format. Download free Cornell notes templates in Word, PDF, Google Docs, and Notion formats. An efficient learning tool that helps students improve note-taking efficiency and academic performance.",
  keywords: "Cornell Notes, Cornell note converter, Cornell notes template, PDF to Cornell notes, Word to Cornell notes, Cornell notes download, Cornell notes Google Docs, Cornell notes Notion, study note tool, note conversion tool, college note method, effective learning method, Cornell note taking",
  openGraph: {
    title: "Ainee | Cornell Notes AI generator | Transform Documents to Cornell Notes | Free Templates",
    description: "Convert your PDF, Word, and PowerPoint documents into Cornell note format. Download free Cornell notes templates in Word, PDF, Google Docs, and Notion formats.",
    url: "https://ainee.com/cornell-notes-generator",
    siteName: "Ainee",
    images: [
      {
        url: "/cornell-notes-generator-og.jpg",
        width: 1200,
        height: 630,
        alt: "Cornell Notes Generator by Ainee",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ainee | Cornell Notes AI generator | Transform Documents to Cornell Notes | Free Templates",
    description: "Convert your PDF, Word, and PowerPoint documents into Cornell note format. Download free Cornell notes templates in Word, PDF, Google Docs, and Notion formats.",
    images: ["/cornell-notes-generator-og.jpg"],
  },
};

export default function CornellNoteGeneratorLayout({
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
