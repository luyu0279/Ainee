'use client';

import { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';

interface CornellNotes {
  title: string;
  date: string;
  subject: string;
  topic: string;
  notes: string;
  questions: string[];
  summary: string;
}

interface CornellNotesPage {
  page: number;
  cornell_notes: CornellNotes;
}

interface DownloadButtonsProps {
  cornellNotesPages: CornellNotesPage[];
  currentPage: number;
  templateStyle: string;
  cueColumnWidth: number;
  summaryHeight: number;
  includeHeader: boolean;
  fontStyle: string;
}

export default function DownloadButtons({
  cornellNotesPages,
  currentPage,
  templateStyle,
  cueColumnWidth,
  summaryHeight,
  includeHeader,
  fontStyle
}: DownloadButtonsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDownload = async () => {
    if (!isClient) return;
    setIsDownloading(true);

    try {
      const currentPageData = cornellNotesPages[currentPage];
      if (!currentPageData) return;

      const tempContainer = document.createElement('div');
      tempContainer.style.width = '794px';
      tempContainer.style.display = 'block';
      tempContainer.style.backgroundColor = 'white';

      const pageDiv = document.createElement('div');
      pageDiv.style.width = '794px';
      pageDiv.style.height = '1123px';
      pageDiv.style.padding = '20px';
      pageDiv.style.boxSizing = 'border-box';
      pageDiv.style.position = 'relative';

      if (includeHeader) {
        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.marginBottom = '20px';
        headerDiv.style.backgroundColor = templateStyle === 'blue' ? '#EFF6FF' : 
                                       templateStyle === 'green' ? '#F0FDF4' : '#F3F4F6';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = `Topic: ${currentPageData.cornell_notes.title || "Introduction to Machine Learning"}`;
        titleSpan.style.fontSize = '14px';

        const dateSpan = document.createElement('span');
        dateSpan.textContent = `Date: ${currentPageData.cornell_notes.date || "April 9, 2024"}`;
        dateSpan.style.fontSize = '14px';

        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(dateSpan);
        pageDiv.appendChild(headerDiv);
      }

      const contentDiv = document.createElement('div');
      contentDiv.style.display = 'flex';
      contentDiv.style.height = `calc(100% - ${includeHeader ? '80px' : '0px'} - ${40 + (summaryHeight * 6)}px)`;
      contentDiv.style.border = '1px solid #e5e7eb';

      const cueDiv = document.createElement('div');
      cueDiv.style.width = `${cueColumnWidth}%`;
      cueDiv.style.borderRight = '1px solid #e5e7eb';
      cueDiv.style.padding = '10px';
      cueDiv.style.backgroundColor = templateStyle === 'blue' ? '#F8FAFC' : 
                                   templateStyle === 'green' ? '#F0FDF4' : '#F9FAFB';

      if (currentPageData.cornell_notes.questions && currentPageData.cornell_notes.questions.length > 0) {
        currentPageData.cornell_notes.questions.forEach(q => {
          const questionP = document.createElement('p');
          questionP.textContent = q;
          questionP.style.marginBottom = '10px';
          questionP.style.fontSize = '14px';
          cueDiv.appendChild(questionP);
        });
      }

      const notesDiv = document.createElement('div');
      notesDiv.style.width = `${100 - cueColumnWidth}%`;
      notesDiv.style.padding = '10px';
      notesDiv.style.overflowWrap = 'break-word';

      const notesP = document.createElement('div');
      notesP.innerHTML = currentPageData.cornell_notes.notes || "";
      notesP.style.fontSize = '14px';
      notesP.style.lineHeight = '1.5';
      notesDiv.appendChild(notesP);

      contentDiv.appendChild(cueDiv);
      contentDiv.appendChild(notesDiv);
      pageDiv.appendChild(contentDiv);

      const summaryDiv = document.createElement('div');
      summaryDiv.style.borderTop = '1px solid #e5e7eb';
      summaryDiv.style.marginTop = '20px';
      summaryDiv.style.padding = '10px';
      summaryDiv.style.height = `${40 + (summaryHeight * 6)}px`;
      summaryDiv.style.backgroundColor = templateStyle === 'blue' ? '#EFF6FF' : 
                                       templateStyle === 'green' ? '#F0FDF4' : '#F3F4F6';

      const summaryP = document.createElement('p');
      summaryP.textContent = currentPageData.cornell_notes.summary || "";
      summaryP.style.fontSize = '14px';
      summaryP.style.fontStyle = 'italic';
      summaryDiv.appendChild(summaryP);

      pageDiv.appendChild(summaryDiv);
      tempContainer.appendChild(pageDiv);
      document.body.appendChild(tempContainer);

      const opt = {
        margin: 0,
        filename: `cornell-notes-page-${currentPage + 1}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(tempContainer).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
      const tempContainer = document.querySelector('div[style*="width: 794px"]');
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  };

  const handleDownloadAll = async () => {
    if (!isClient) return;
    setIsDownloading(true);

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '794px';
      tempContainer.style.display = 'block';
      tempContainer.style.backgroundColor = 'white';

      for (let i = 0; i < cornellNotesPages.length; i++) {
        const page = cornellNotesPages[i];
        const pageDiv = document.createElement('div');
        pageDiv.style.width = '794px';
        pageDiv.style.height = '1123px';
        pageDiv.style.padding = '20px';
        pageDiv.style.boxSizing = 'border-box';
        pageDiv.style.position = 'relative';
        pageDiv.style.pageBreakAfter = 'always';
        pageDiv.style.marginBottom = '20px';

        if (includeHeader) {
          const headerDiv = document.createElement('div');
          headerDiv.style.display = 'flex';
          headerDiv.style.justifyContent = 'space-between';
          headerDiv.style.marginBottom = '20px';
          headerDiv.style.backgroundColor = templateStyle === 'blue' ? '#EFF6FF' : 
                                         templateStyle === 'green' ? '#F0FDF4' : '#F3F4F6';

          const titleSpan = document.createElement('span');
          titleSpan.textContent = `Topic: ${page.cornell_notes.title || "Introduction to Machine Learning"}`;
          titleSpan.style.fontSize = '14px';

          const dateSpan = document.createElement('span');
          dateSpan.textContent = `Date: ${page.cornell_notes.date || "April 9, 2024"}`;
          dateSpan.style.fontSize = '14px';

          headerDiv.appendChild(titleSpan);
          headerDiv.appendChild(dateSpan);
          pageDiv.appendChild(headerDiv);
        }

        const contentDiv = document.createElement('div');
        contentDiv.style.display = 'flex';
        contentDiv.style.height = `calc(100% - ${includeHeader ? '80px' : '0px'} - ${40 + (summaryHeight * 6)}px)`;
        contentDiv.style.border = '1px solid #e5e7eb';

        const cueDiv = document.createElement('div');
        cueDiv.style.width = `${cueColumnWidth}%`;
        cueDiv.style.borderRight = '1px solid #e5e7eb';
        cueDiv.style.padding = '10px';
        cueDiv.style.backgroundColor = templateStyle === 'blue' ? '#F8FAFC' : 
                                     templateStyle === 'green' ? '#F0FDF4' : '#F9FAFB';

        if (page.cornell_notes.questions && page.cornell_notes.questions.length > 0) {
          page.cornell_notes.questions.forEach(q => {
            const questionP = document.createElement('p');
            questionP.textContent = q;
            questionP.style.marginBottom = '10px';
            questionP.style.fontSize = '14px';
            cueDiv.appendChild(questionP);
          });
        }

        const notesDiv = document.createElement('div');
        notesDiv.style.width = `${100 - cueColumnWidth}%`;
        notesDiv.style.padding = '10px';
        notesDiv.style.overflowWrap = 'break-word';

        const notesP = document.createElement('div');
        notesP.innerHTML = page.cornell_notes.notes || "";
        notesP.style.fontSize = '14px';
        notesP.style.lineHeight = '1.5';
        notesDiv.appendChild(notesP);

        contentDiv.appendChild(cueDiv);
        contentDiv.appendChild(notesDiv);
        pageDiv.appendChild(contentDiv);

        const summaryDiv = document.createElement('div');
        summaryDiv.style.borderTop = '1px solid #e5e7eb';
        summaryDiv.style.marginTop = '20px';
        summaryDiv.style.padding = '10px';
        summaryDiv.style.height = `${40 + (summaryHeight * 6)}px`;
        summaryDiv.style.backgroundColor = templateStyle === 'blue' ? '#EFF6FF' : 
                                         templateStyle === 'green' ? '#F0FDF4' : '#F3F4F6';

        const summaryP = document.createElement('p');
        summaryP.textContent = page.cornell_notes.summary || "";
        summaryP.style.fontSize = '14px';
        summaryP.style.fontStyle = 'italic';
        summaryDiv.appendChild(summaryP);

        pageDiv.appendChild(summaryDiv);
        tempContainer.appendChild(pageDiv);
      }

      document.body.appendChild(tempContainer);

      const opt = {
        margin: 0,
        filename: 'cornell-notes-all.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        }
      };

      await html2pdf().set(opt).from(tempContainer).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
      const tempContainer = document.querySelector('div[style*="width: 794px"]');
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  };

  if (!isClient) {
    return (
      <div className="flex space-x-2">
        <button className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium opacity-50 cursor-not-allowed">
          Loading...
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleDownloadAll}
        disabled={isDownloading}
        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download All Notes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        All
      </button>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download Current Page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Page {cornellNotesPages.length > 0 ? currentPage + 1 : 1}
      </button>
    </>
  );
} 