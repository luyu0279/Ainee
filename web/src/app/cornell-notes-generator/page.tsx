"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Head from "next/head";
import { OpenAPIConfig } from "@/apis/core/OpenAPI";
import { Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post } from "@/apis/models/Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post";
import ApiLibs from "@/lib/ApiLibs";
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';

// Create a client-side component for download functionality
const DownloadButtons = dynamic(() => import('./DownloadButtons'), {
  ssr: false,
  loading: () => <div className="flex space-x-2">
    <button className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium opacity-50 cursor-not-allowed">
      Loading...
    </button>
  </div>
});

// 创建 API 服务实例
const config: OpenAPIConfig = {
  BASE: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  VERSION: "1.0.0",
  WITH_CREDENTIALS: false,
  CREDENTIALS: "include",
  TOKEN: undefined,
  USERNAME: undefined,
  PASSWORD: undefined,
  HEADERS: undefined,
  ENCODE_PATH: undefined,
};

export default function CornellNoteGenerator() {
  // State management
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [templateStyle, setTemplateStyle] = useState("blue");
  const [cueColumnWidth, setCueColumnWidth] = useState(30);
  const [summaryHeight, setSummaryHeight] = useState(15);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [processingLevel, setProcessingLevel] = useState("standard");
  const [noteDensity, setNoteDensity] = useState(3);
  const [pageDivision, setPageDivision] = useState("auto");
  const [selectedTemplate, setSelectedTemplate] = useState('cornell-note-paper');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [cornellNotes, setCornellNotes] = useState<{
    title: string;
    date: string;
    subject: string;
    topic: string;
    notes: string;
    questions: string[];
    summary: string;
  }>({
    title: "",
    date: "",
    subject: "",
    topic: "",
    notes: "",
    questions: [],
    summary: ""
  });
  const [cornellNotesPages, setCornellNotesPages] = useState<{
    page: number;
    cornell_notes: {
      title: string;
      date: string;
      subject: string;
      topic: string;
      notes: string;
      questions: string[];
      summary: string;
    };
  }[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [fontStyle, setFontStyle] = useState('default');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const templates = [
    {
      id: 'cornell-note-paper',
      name: 'Cornell Note Paper',
      pptUrl: '/template/1.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/1E3TvKaxa5OWc94qn8QYD3x9e2PFCgXDsdxqRmWM4Y64/template/preview'
    },
    {
      id: 'high-school-cornell-notes',
      name: 'High School Cornell Notes',
      pptUrl: '/template/2.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/16Jo_KF5lnw-CTFzcXquyeRlM53tMqGIm51A8VACMzlQ/template/preview'
    },
    {
      id: 'simple-cornell-notes',
      name: 'Simple Cornell Notes',
      pptUrl: '/template/3.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/1RF4NWu2rtuM6Zv7RJZPw11fDASAH-K_er4RglGEyxbk/template/preview'
    },
    {
      id: 'cornell-notes-printable',
      name: 'Cornell Notes Printable',
      pptUrl: '/template/4.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/1blnhMS9kj00BvzVBNDmNaRkQ_0utP2mcjYKDyFCz1X8/template/preview'
    },
    {
      id: 'cornell-notes-notebook',
      name: 'Cornell Notes Notebook',
      pptUrl: '/template/5.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/1TWQezkWYgOGgR7eyXFA6kUlzPh9YWHx2vxqRuXkgKGo/template/preview'
    },
    {
      id: 'cornell-notes-format',
      name: 'Cornell Notes Format',
      pptUrl: '/template/6.pptx',
      googleDocsUrl: 'https://docs.google.com/presentation/d/1eUwmJjekQrdSQHfZneWM3av8KHE77TmnXIE4rV0mUUI/template/preview'
    }
  ];

  // Event handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'md', 'txt', 'html'];
      
      if (fileExtension && allowedExtensions.includes(fileExtension)) {
        setFile(file);
      } else {
        alert('Unsupported file format. Please upload a supported file type.');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'md', 'txt', 'html'];
      
      if (fileExtension && allowedExtensions.includes(fileExtension)) {
        setFile(file);
      } else {
        alert('Unsupported file format. Please upload a supported file type.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 为了测试，暂时移除文件检查
    handleGenerate();
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('iframe')) {
      return; // 如果点击的是 iframe 内部，不处理拖动
    }
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleGenerate = async () => {
    if (!file) {
      alert('Please upload a file first');
      return;
    }

    setIsProcessing(true);
    try {
      const requestData: Body_upload_file_with_params_api_ainee_web_cornell_notes_generate_post = {
        file: file,
        note_density: noteDensity.toString(),
        page_division: pageDivision,
      };

      const response = await ApiLibs.aineeWeb.uploadFileWithParamsApiAineeWebCornellNotesGeneratePost(requestData);
      
      if (response.data?.pages) {
        const formattedPages = response.data.pages.map(page => ({
          page: page.page ?? 0,
          cornell_notes: {
            title: page.cornell_notes?.title || "",
            date: page.cornell_notes?.date || "",
            subject: "",
            topic: "",
            notes: page.cornell_notes?.notes || "",
            questions: page.cornell_notes?.questions || [],
            summary: page.cornell_notes?.summary || "",
          }
        }));
        
        setCornellNotesPages(formattedPages);
        if (formattedPages.length > 0) {
          setCurrentPage(0);
          setCornellNotes(formattedPages[0].cornell_notes);
          setShowPreview(true); // Add this line to show the preview
        }
      } else {
        alert('Failed to generate Cornell notes');
      }
    } catch (error) {
      console.error('Error generating Cornell notes:', error);
      alert('An error occurred while generating Cornell notes');
    } finally {
      setIsProcessing(false);
    }
  };

  // 引用预览元素
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Navigation functions for multi-page Cornell notes
  const goToNextPage = () => {
    if (currentPage < cornellNotesPages.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      setCornellNotes(cornellNotesPages[nextPage].cornell_notes);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      setCornellNotes(cornellNotesPages[prevPage].cornell_notes);
    }
  };

  // Handle new note confirmation
  const handleNewNote = () => {
    setShowConfirmDialog(true);
  };

  // Confirm new note creation
  const confirmNewNote = () => {
    setFile(null);
    setShowPreview(false);
    setShowConfirmDialog(false);
  };

  // Cancel new note creation
  const cancelNewNote = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#006400]/5 via-[#69DA00]/5 to-[#50E3C2]/5">
      <Head>
        <title>Ainee - Your AI Workshop</title>
        <meta name="description" content="Build AI tools with zero coding" />
        <link rel="icon" href="/images/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap" rel="stylesheet" />
      </Head>
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Background with styling */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#006400]/5 via-[#69DA00]/5 to-[#50E3C2]/5 backdrop-blur-sm overflow-hidden">
          {/* Enhanced grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          {/* Animated gradient orbs */}
          <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(0,100,0,0.08),transparent)] pointer-events-none"></div>
          <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(255,255,255,0.08),transparent)] pointer-events-none"></div>
          
          {/* Central glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl opacity-10 aspect-square h-96 rounded-full bg-gradient-to-br from-[#006400] via-[#69DA00] to-[#50E3C2]"></div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Left column - Text content */}
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                Transform Your Documents into <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#006400] to-[#69DA00]">Cornell Notes</span>
              </h1>
              <h2 className="text-xl md:text-2xl mb-6 font-light text-gray-700">
                Upload any PDF, Word, or PowerPoint file and instantly convert it
              </h2>
              <p className="text-lg mb-8 text-gray-600">
                Improve retention and organize your study materials with ease using the powerful Cornell note-taking format.
              </p>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center md:justify-start">
                <a 
                  href="#upload" 
                  className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gradient-to-r from-[#006400] to-[#69DA00] text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Get Started
                </a>
                <a 
                  href="#templates" 
                  className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-white border border-[#006400]/20 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Download Templates
                </a>
              </div>
            </div>

            {/* Right column - Cornell Note Example */}
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg w-full max-w-md border border-white/20 cornell-note-example">
                {/* Cornell Note Header */}
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="font-medium text-gray-800">Topic: Ainee Cornell Notes AI Generator</h3>
                  <p className="text-sm text-gray-500">Date: 2025-04-10</p>
                </div>
                
                {/* Cornell Note Body */}
                <div className="flex">
                  {/* Cue Column */}
                  <div className="w-1/3 pr-4 border-r border-gray-200">
                    <p className="text-sm font-medium mb-3 text-[#006400]">What is the Ainee Cornell Notes AI Generator?                     </p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Key components?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Benefits?</p>
                  </div>
                  
                  {/* Notes Column */}
                  <div className="w-2/3 pl-4">
                    <p className="text-sm mb-3 text-gray-700">Ainee Cornell Notes AI Generator: A tool to transform documents into Cornell notes using AI.</p>
                    <p className="text-sm mb-3 text-gray-700">Key Components: Upload - AI Processing - Download</p>
                    <p className="text-sm mb-3 text-gray-700">Benefits:Instant Conversion,AI-Powered.Fully Customizable,Multiple Formats,Privacy Focused,Image Support.</p>
                  </div>
                </div>
                
                {/* Summary Section */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 italic">
                  The Ainee Cornell Notes AI Generator is a tool designed to convert documents into Cornell notes using AI.                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="upload" className="py-10 md:py-14 bg-white/70 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#006400] to-[#69DA00] text-center mb-8">Cornell Notes AI Generator</h2>
            
            {/* Add print styles */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #previewRef, #previewRef * {
                  visibility: visible;
                }
                #previewRef {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 21cm;
                  height: 29.7cm;
                  margin: 0;
                  padding: 0;
                  border: none;
                  box-shadow: none;
                  page-break-after: always;
                }
              }
            `}</style>
            
            {!isProcessing && !showPreview ? (
              <>
                {/* File Upload and Settings in a grid layout */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* File Upload Area */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/30 h-full flex flex-col">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Upload Document</h3>
                    
                    <div 
                      className={`drop-zone flex-1 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-white border-2 border-dashed ${file ? 'border-[#4D4DFF]/40 bg-[#4D4DFF]/5' : 'border-gray-300 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'} transition-colors`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      {file ? (
                        <>
                          <div className="flex items-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4D4DFF] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{file.name}</span>
                          </div>
                          <p className="text-xs text-gray-500">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-[#4D4DFF]/10 rounded-full flex items-center justify-center text-[#4D4DFF] mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <h3 className="text-base font-medium mb-1 text-gray-800">Drag & Drop your file here</h3>
                          <p className="text-xs text-gray-600 mb-1">Or click to upload</p>
                          <p className="text-xs text-gray-500">Supported formats: PDF,Word,PowerPoint,Excel,Markdown,Text,HTML </p>
                        </>
                      )}
                      <input 
                        id="file-input"
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.md,.txt,.html"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  {/* Content Settings */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-white/30 h-full">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Content Settings</h3>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">AI Processing Level</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent"
                        value={processingLevel}
                        onChange={(e) => setProcessingLevel(e.target.value)}
                      >
                        <option value="standard">Standard - Generate cues and summary</option>
                        <option value="advanced">Advanced - Detailed organization and analysis</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Note Density</label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Concise</span>
                        <input 
                          type="range" 
                          min="1" 
                          max="5" 
                          value={noteDensity}
                          onChange={(e) => setNoteDensity(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm text-gray-500">Detailed</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Page Division</label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent"
                        value={pageDivision}
                        onChange={(e) => setPageDivision(e.target.value)}
                      >
                        <option value="auto">Auto (Recommended)</option>
                        <option value="section">One page per section</option>
                        <option value="single">All content on single note</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Generate Button */}
                <div className="text-center mb-8">
                  <button 
                    onClick={handleSubmit}
                    className="px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white hover:opacity-90 transition-colors shadow-sm"
                  >
                    Generate Cornell Notes
                  </button>
                </div>
              </>
            ) : isProcessing ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 md:p-8 shadow-lg border border-white/20">
                <h3 className="text-lg font-medium mb-4 text-gray-800">Processing your document...</h3>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full animate-pulse" style={{ width: '75%' }}></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments depending on document size.</p>
              </div>
            ) : (
              // Preview section
              <div className="grid md:grid-cols-4 gap-8">
                {/* Template Settings */}
                <div className="md:col-span-1">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-white/30 sticky top-4">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Template Settings</h3>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Template Style</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div 
                          className={`border rounded-md p-2 flex justify-center cursor-pointer transition-colors ${templateStyle === 'blue' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setTemplateStyle('blue')}
                        >
                          <div className="h-12 w-12 cornell-note bg-white overflow-hidden" style={{transform: 'scale(0.7)'}}>
                            <div className="h-2 bg-blue-100"></div>
                            <div className="flex h-8">
                              <div className="w-3 bg-blue-50"></div>
                              <div className="flex-1"></div>
                            </div>
                            <div className="h-2 bg-blue-100"></div>
                          </div>
                        </div>
                        <div 
                          className={`border rounded-md p-2 flex justify-center cursor-pointer transition-colors ${templateStyle === 'gray' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setTemplateStyle('gray')}
                        >
                          <div className="h-12 w-12 cornell-note bg-white overflow-hidden" style={{transform: 'scale(0.7)'}}>
                            <div className="h-2 bg-gray-100"></div>
                            <div className="flex h-8">
                              <div className="w-3 bg-gray-50"></div>
                              <div className="flex-1"></div>
                            </div>
                            <div className="h-2 bg-gray-100"></div>
                          </div>
                        </div>
                        <div 
                          className={`border rounded-md p-2 flex justify-center cursor-pointer transition-colors ${templateStyle === 'green' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setTemplateStyle('green')}
                        >
                          <div className="h-12 w-12 cornell-note bg-white overflow-hidden" style={{transform: 'scale(0.7)'}}>
                            <div className="h-2 bg-green-100"></div>
                            <div className="flex h-8">
                              <div className="w-3 bg-green-50"></div>
                              <div className="flex-1"></div>
                            </div>
                            <div className="h-2 bg-green-100"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Cue Column Width</label>
                      <input 
                        type="range" 
                        min="20" 
                        max="40" 
                        value={cueColumnWidth} 
                        onChange={(e) => setCueColumnWidth(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Narrow</span>
                        <span>Default</span>
                        <span>Wide</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Summary Height</label>
                      <input 
                        type="range" 
                        min="10" 
                        max="30" 
                        value={summaryHeight}
                        onChange={(e) => setSummaryHeight(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Small</span>
                        <span>Default</span>
                        <span>Large</span>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">Font Style</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div 
                          className={`border rounded-md p-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${fontStyle === 'default' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setFontStyle('default')}
                        >
                          <p className="text-sm font-normal text-gray-800">Default</p>
                          <p className="text-xs text-gray-500">Sans-serif</p>
                        </div>
                        <div 
                          className={`border rounded-md p-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${fontStyle === 'serif' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setFontStyle('serif')}
                        >
                          <p className="text-sm font-serif text-gray-800">Serif</p>
                          <p className="text-xs text-gray-500">Classic look</p>
                        </div>
                        <div 
                          className={`border rounded-md p-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${fontStyle === 'mono' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setFontStyle('mono')}
                        >
                          <p className="text-sm font-mono text-gray-800">Monospace</p>
                          <p className="text-xs text-gray-500">Technical</p>
                        </div>
                        <div 
                          className={`border rounded-md p-2 flex flex-col items-center justify-center cursor-pointer transition-colors ${fontStyle === 'handwriting' ? 'border-[#4D4DFF] bg-[#4D4DFF]/5' : 'border-gray-200 hover:border-[#4D4DFF]/40 hover:bg-[#4D4DFF]/5'}`}
                          onClick={() => setFontStyle('handwriting')}
                        >
                          <p className="text-sm text-gray-800" style={{ fontFamily: 'Architects Daughter, cursive' }}>Handwriting</p>
                          <p className="text-xs text-gray-500">Student notes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Include Header</label>
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={includeHeader}
                          onChange={(e) => setIncludeHeader(e.target.checked)}
                          className="h-4 w-4 text-[#006400] border-gray-300 rounded focus:ring-[#006400]"
                        />
                        <span className="ml-2 text-sm text-gray-600">Add name, date, and subject fields</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Content */}
                <div className="md:col-span-3">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">Your Cornell Notes</h3>
                        <div className="flex items-center">
                          <button
                            onClick={handleNewNote}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                            title="Create New"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            New
                          </button>
                          <div className="ml-4 space-x-2 flex">
                            <DownloadButtons 
                              cornellNotesPages={cornellNotesPages}
                              currentPage={currentPage}
                              templateStyle={templateStyle}
                              cueColumnWidth={cueColumnWidth}
                              summaryHeight={summaryHeight}
                              includeHeader={includeHeader}
                              fontStyle={fontStyle}
                            />
                          </div>
                          
                          {/* Page Navigation Controls - Moved to header */}
                          {cornellNotesPages.length > 1 && (
                            <div className="flex items-center ml-2">
                              <button
                                onClick={goToPrevPage}
                                disabled={currentPage === 0}
                                className={`w-6 h-6 flex items-center justify-center rounded ${
                                  currentPage === 0 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                                title="Previous Page"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              
                              <span className="text-xs font-medium text-gray-500 mx-2">
                                Page {currentPage + 1} of {cornellNotesPages.length}
                              </span>
                              
                              <button
                                onClick={goToNextPage}
                                disabled={currentPage === cornellNotesPages.length - 1}
                                className={`w-6 h-6 flex items-center justify-center rounded ${
                                  currentPage === cornellNotesPages.length - 1 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                                title="Next Page"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Cornell Note Preview */}
                      <div 
                        ref={previewRef} 
                        id="previewRef" 
                        className={`bg-white border border-gray-200 mb-8 rounded-lg overflow-hidden shadow-sm max-w-3xl mx-auto ${
                          fontStyle === 'serif' ? 'font-serif' : 
                          fontStyle === 'mono' ? 'font-mono' : 
                          fontStyle === 'default' ? 'font-sans' : 
                          ''
                        }`}
                        style={{ 
                          aspectRatio: '1 / 1.414',
                          fontFamily: fontStyle === 'handwriting' ? 'Architects Daughter, cursive' : ''
                        }}
                      >
                        {includeHeader && (
                          <div className={`p-4 ${templateStyle === 'blue' ? 'bg-blue-100' : templateStyle === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <div className="flex justify-between text-sm">
                              <span>Topic: {cornellNotes.title || "Introduction to Machine Learning"}</span>
                              <span>Date: {cornellNotes.date || "April 9, 2024"}</span>
                            </div>
                          </div>
                        )}
                        <div 
                          className="flex" 
                          style={{ 
                            height: `calc(100% - 52px - ${40 + (summaryHeight * 6)}px)` 
                          }}
                        >
                          <div 
                            className={`p-4 ${templateStyle === 'blue' ? '!bg-blue-50' : templateStyle === 'green' ? '!bg-green-50' : '!bg-gray-50'}`}
                            style={{
                              width: `${cueColumnWidth}%`,
                              height: '100%'
                            }}
                          >
                            <p className="text-gray-500 font-medium mb-3">Key questions & terms</p>
                            {(cornellNotes.questions || ["What is Machine Learning?", "Types of ML?", "Supervised Learning", "Unsupervised Learning", "Key applications?"]).map((question, index) => (
                              <p key={index} className="mb-[24px] text-sm leading-8">{question}</p>
                            ))}
                          </div>
                          <div 
                            className="p-4 overflow-y-auto"
                            style={{
                              width: `${100 - cueColumnWidth}%`,
                              backgroundImage: `
                                linear-gradient(rgba(229, 231, 235, 0.5) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(229, 231, 235, 0.5) 1px, transparent 1px)
                              `,
                              backgroundSize: '20px 20px',
                              height: '100%'
                            }}
                          >
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({node, ...props}) => <p className="mb-[24px] text-sm leading-8" {...props} />,
                                  strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                                  em: ({node, ...props}) => <em className="italic" {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4" {...props} />,
                                  li: ({node, ...props}) => <li className="mb-2" {...props} />,
                                }}
                              >
                                {cornellNotes.notes || "Machine Learning is a subset of artificial intelligence that enables computers to learn from data without explicit programming."}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                        <div 
                          className={`p-4 ${templateStyle === 'blue' ? 'bg-blue-100' : templateStyle === 'green' ? 'bg-green-100' : 'bg-gray-100'}`}
                          style={{
                            height: `calc(${40 + (summaryHeight * 6)}px)`,
                            backgroundImage: `
                              linear-gradient(rgba(229, 231, 235, 0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(229, 231, 235, 0.5) 1px, transparent 1px)
                            `,
                            backgroundSize: '20px 20px',
                            overflow: 'auto'
                          }}
                        >
                          <p className="text-sm font-medium mb-1">Summary:</p>
                          <p className="text-sm leading-8">{cornellNotes.summary || "Machine learning enables computers to learn from data without explicit programming. The main approaches include supervised learning, unsupervised learning, and reinforcement learning."}</p>
                        </div>
                      </div>
                      
                      <div className="text-center text-sm text-gray-500 mb-4">
                        <p>Preview is sized to match A4 paper (21.0 × 29.7 cm)</p>
                        <p className="mt-1">
                          Current font: 
                          <span className="font-medium ml-1">
                            {fontStyle === 'default' ? 'Sans-serif' : 
                            fontStyle === 'serif' ? 'Serif' : 
                            fontStyle === 'mono' ? 'Monospace' : 
                            fontStyle === 'handwriting' ? 'Handwriting' :
                            'Sans-serif'}
                          </span>
                        </p>
                      </div>

                      {/* Confirmation Dialog */}
                      {showConfirmDialog && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <div className="flex items-center text-amber-500 mb-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <h3 className="text-lg font-medium">Confirm New Note</h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                              Creating a new note will clear your current content. This action cannot be undone. Would you like to proceed?
                            </p>
                            <div className="flex justify-end space-x-3">
                              <button 
                                onClick={cancelNewNote}
                                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={confirmNewNote}
                                className="px-4 py-2 rounded-md bg-[#006400] text-white text-sm font-medium hover:bg-[#006400]/90 transition-colors"
                              >
                                Proceed
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-12 md:py-16 bg-white/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center mb-8">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#4D4DFF]/10 to-[#69DA00]/10 flex items-center justify-center mb-4 border border-white/50 shadow-sm">
                <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Upload Your Document</h3>
              <p className="text-gray-600">Upload your PDF, Word document, or PowerPoint presentation through our secure interface.</p>
            </div>
            
            <div className="flex flex-col items-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#4D4DFF]/10 to-[#69DA00]/10 flex items-center justify-center mb-4 border border-white/50 shadow-sm">
                <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">AI Processing</h3>
              <p className="text-gray-600">Our system analyzes your content, identifies key concepts, and organizes them into the Cornell format.</p>
            </div>
            
            <div className="flex flex-col items-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#4D4DFF]/10 to-[#69DA00]/10 flex items-center justify-center mb-4 border border-white/50 shadow-sm">
                <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Download Your Notes</h3>
              <p className="text-gray-600">Review, customize, and download your Cornell notes in multiple formats for effective studying.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Feature Highlights Section */}
      <section className="py-12 md:py-16 bg-white/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center mb-8">Why Use Our Cornell Notes Generator</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#4D4DFF]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4D4DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Instant Conversion</h3>
              <p className="text-gray-600 text-sm">Transform any document into Cornell notes in seconds, saving hours of manual formatting time.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#69DA00]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#69DA00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">AI-Powered Processing</h3>
              <p className="text-gray-600 text-sm">Our system intelligently identifies key points, generates relevant questions, and creates comprehensive summaries.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#50E3C2]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#50E3C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Fully Customizable</h3>
              <p className="text-gray-600 text-sm">Adjust template styles, column proportions, and content density to match your personal preferences.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#4D4DFF]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#4D4DFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Multiple Formats Support</h3>
              <p className="text-gray-600 text-sm">Work with PDF, Word documents, PowerPoint presentations, and more to create consistent Cornell notes.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#69DA00]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#69DA00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Privacy Focused</h3>
              <p className="text-gray-600 text-sm">Your documents are processed securely and never stored permanently on our servers.</p>
            </div>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
              <div className="w-12 h-12 rounded-full bg-[#50E3C2]/10 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#50E3C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Image Support</h3>
              <p className="text-gray-600 text-sm">Retain diagrams, charts, and images from your original documents within your Cornell notes.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* About Cornell Notes Section */}
      <section className="py-12 md:py-16 bg-white/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center mb-8">About Cornell Notes Method</h2>
          
          <div className="flex flex-col lg:flex-row items-center gap-8 max-w-5xl mx-auto">
            <div className="lg:w-1/2">
              <h3 className="text-xl md:text-2xl font-semibold mb-4 text-gray-800">What is the Cornell Note-Taking Method?</h3>
              <p className="text-gray-600 mb-4">The Cornell Note-Taking Method was developed in the 1950s by Walter Pauk, a professor at Cornell University. It's designed to help students organize and review their notes more effectively.</p>
              
              <h4 className="text-lg font-semibold mb-2 mt-6 text-gray-800">The Structure</h4>
              <p className="text-gray-600 mb-4">Cornell notes divide the page into three sections:</p>
              <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
                <li><strong className="text-[#006400]">Notes Column (70%)</strong> - The main area for recording lecture notes</li>
                <li><strong className="text-[#006400]">Cue Column (30%)</strong> - Area for questions, key terms, and main ideas</li>
                <li><strong className="text-[#006400]">Summary Area</strong> - Space at the bottom to summarize the content</li>
              </ul>
              
              <h4 className="text-lg font-semibold mb-2 text-gray-800">The 5 R's Process</h4>
              <ul className="list-disc pl-6 mb-6 text-gray-600 space-y-2">
                <li><strong className="text-[#006400]">Record</strong> - Write down facts and ideas in the notes column</li>
                <li><strong className="text-[#006400]">Reduce</strong> - Summarize these ideas in the cue column</li>
                <li><strong className="text-[#006400]">Recite</strong> - Cover the notes column and using the cues, recite the information</li>
                <li><strong className="text-[#006400]">Reflect</strong> - Think about the material and form your own opinions</li>
                <li><strong className="text-[#006400]">Review</strong> - Spend time reviewing your notes regularly</li>
              </ul>
            </div>
            
            <div className="lg:w-1/2">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="font-medium text-gray-700">Title: Cornell Note-Taking Method Explained</h3>
                  <p className="text-sm text-gray-500">Date: 2024-04-09</p>
                </div>
                <div className="flex">
                  <div className="w-1/3 pr-4 border-r border-gray-200">
                    <p className="text-sm font-medium mb-3 text-[#006400]">What?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Who?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">When?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Structure?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Process?</p>
                    <p className="text-sm font-medium mb-3 text-[#006400]">Benefits?</p>
                  </div>
                  <div className="w-2/3 pl-4">
                    <p className="text-sm mb-2 text-gray-700">A systematic format for condensing and organizing notes.</p>
                    <p className="text-sm mb-2 text-gray-700">Developed by Walter Pauk, a professor at Cornell University.</p>
                    <p className="text-sm mb-2 text-gray-700">Created in the 1950s and published in "How to Study in College".</p>
                    <p className="text-sm mb-2 text-gray-700">Three distinct sections: notes column (70%), cue column (30%), and summary area.</p>
                    <p className="text-sm mb-2 text-gray-700">The 5 R's: Record, Reduce, Recite, Reflect, and Review.</p>
                    <p className="text-sm mb-2 text-gray-700">Improves critical thinking, enhances material retention, fosters active learning, and creates an organized study resource.</p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 italic">The Cornell Note-Taking Method is a structured system that divides notes into organized sections, promoting active engagement with material through questioning, summarizing, and regular review, ultimately leading to better understanding and retention.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 max-w-5xl mx-auto">
            <h3 className="text-xl md:text-2xl font-semibold mb-6 text-center text-gray-800">Benefits of Cornell Notes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#4D4DFF]/10 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4D4DFF]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">Active Learning</h4>
                </div>
                <p className="text-gray-600 text-sm">Engages you in the material through questioning and summarizing, rather than passive note-taking.</p>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#69DA00]/10 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#69DA00]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">Improved Organization</h4>
                </div>
                <p className="text-gray-600 text-sm">Structures information in a logical format that makes review and studying more efficient.</p>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#50E3C2]/10 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#50E3C2]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">Enhanced Recall</h4>
                </div>
                <p className="text-gray-600 text-sm">Creates connections between ideas and questions, strengthening memory and understanding.</p>
              </div>
              
              <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/50">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#4D4DFF]/10 flex items-center justify-center mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#4D4DFF]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-800">Test Preparation</h4>
                </div>
                <p className="text-gray-600 text-sm">Naturally creates a study guide with questions similar to those likely to appear on exams.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Templates Section */}
      <section id="templates" className="py-12 md:py-16 bg-white/80 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Download Cornell Notes Templates</h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              Get started with our ready-to-use Cornell note templates in various formats
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
            {/* Template Options */}
            <div className="lg:w-1/4 lg:pl-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50 sticky top-8">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Templates</h3>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button 
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center transition-colors ${
                        selectedTemplate === template.id 
                          ? 'bg-[#006400]/10 text-[#006400]' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#006400]/10 flex items-center justify-center mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#006400]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                        </svg>
                      </div>
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Preview Area */}
            <div className="lg:w-3/4">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/50">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {templates.find(t => t.id === selectedTemplate)?.name}
                  </h3>
                  <div className="flex space-x-3">
                    <a 
                      href={templates.find(t => t.id === selectedTemplate)?.pptUrl}
                      download={`ainee.com ${templates.find(t => t.id === selectedTemplate)?.name}.pptx`}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-[#4D4DFF]/20 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Image src="/icon/powerpoint.svg" alt="PowerPoint" width={16} height={16} className="mr-1" />
                      Download PPT
                    </a>
                    <a 
                      href={templates.find(t => t.id === selectedTemplate)?.googleDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-[#4D4DFF]/20 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <Image src="/icon/google-docs.svg" alt="Google Docs" width={16} height={16} className="mr-1" />
                      Edit in Google Docs
                    </a>
                  </div>
                </div>
                
                {/* Template Preview */}
                <div className="bg-gray-50 rounded-lg p-2 min-h-[500px] flex flex-col items-center justify-center">
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-full max-w-4xl aspect-[4/3] bg-white rounded-lg shadow-lg overflow-hidden relative">
                      <div className="absolute top-1 right-1 z-10 flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                        <button 
                          onClick={() => setZoomLevel(Math.max(100, zoomLevel - 25))}
                          className={`p-1 rounded transition-colors ${
                            zoomLevel <= 100 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                          }`}
                          title="Zoom out"
                          disabled={zoomLevel <= 100}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <span className="text-sm text-gray-600">{zoomLevel}%</span>
                        <button 
                          onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Zoom in"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <div 
                        className="w-full h-full overflow-auto"
                        style={{ 
                          cursor: isDragging ? 'grabbing' : 'grab',
                          position: 'relative'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div 
                          style={{ 
                            position: 'absolute',
                            top: position.y,
                            left: position.x,
                            width: '100%',
                            height: '100%',
                            transform: `scale(${zoomLevel / 100})`,
                            transformOrigin: 'center'
                          }}
                        >
                          <iframe 
                            src={templates.find(t => t.id === selectedTemplate)?.googleDocsUrl.replace('/template/preview', '/embed')}
                            className="w-full h-full border-0"
                            title={`${templates.find(t => t.id === selectedTemplate)?.name} Preview`}
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                      Preview of {templates.find(t => t.id === selectedTemplate)?.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ Section */}
      <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm mt-20 rounded-2xl">
        <div className="flex flex-col justify-center items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Frequently asked questions</h2>
          <p className="text-[#737373] mt-3 text-lg italic text-center">
            Cornell Notes Generator FAQ
          </p>
        </div>
        
        <div className="mt-10 md:mt-12 max-w-sm md:max-w-3xl w-full px-4 md:px-0">
          <div className="w-full space-y-5">
            {/* Question 1 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(0)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 0}
              >
                <span className="text-[#3E1953] font-semibold">What file types can I convert to Cornell notes?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 0 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 0 ? '1000px' : '0',
                  opacity: openFaq === 0 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>Our tool supports a wide range of document formats, including PDF, DOCX, DOC, PPT, PPTX, TXT, and more. If you have a specific format not listed, you can contact us for support.</p>
                </div>
              </div>
            </div>

            {/* Question 2 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 1}
              >
                <span className="text-[#3E1953] font-semibold">How accurate is the AI-powered conversion?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 1 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 1 ? '1000px' : '0',
                  opacity: openFaq === 1 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>Our system uses advanced natural language processing to identify key concepts, create relevant questions, and generate summaries. While generally very accurate, you can always edit the notes after conversion to refine the content.</p>
                </div>
              </div>
            </div>

            {/* Question 3 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 2}
              >
                <span className="text-[#3E1953] font-semibold">Can I customize the Cornell note template?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 2 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 2 ? '1000px' : '0',
                  opacity: openFaq === 2 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>Yes! You can adjust the column proportions, colors, spacing, and other visual elements to match your preferences. We offer several pre-designed templates as well as custom options.</p>
                </div>
              </div>
            </div>

            {/* Question 4 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(3)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 3}
              >
                <span className="text-[#3E1953] font-semibold">Is there a limit to the document size I can convert?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 3 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 3 ? '1000px' : '0',
                  opacity: openFaq === 3 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>Free users can convert documents up to 20 pages. For larger documents, we offer premium plans with increased limits and additional features.</p>
                </div>
              </div>
            </div>

            {/* Question 5 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(4)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 4}
              >
                <span className="text-[#3E1953] font-semibold">How can I save or share my Cornell notes?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 4 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 4 ? '1000px' : '0',
                  opacity: openFaq === 4 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>After conversion, you can download your notes as PDF, share them via email, or print them directly. Premium users can also access cloud storage options for easy synchronization across devices.</p>
                </div>
              </div>
            </div>

            {/* Question 6 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(5)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 5}
              >
                <span className="text-[#3E1953] font-semibold">Is my data secure and private?</span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 5 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div 
                style={{ 
                  maxHeight: openFaq === 5 ? '1000px' : '0',
                  opacity: openFaq === 5 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>Absolutely. We process your documents securely and don't store them permanently. Your uploads are automatically deleted after processing, and we never share your content with third parties.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-[#006400] to-[#69DA00] text-white relative overflow-hidden">
        {/* Background with styling */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Animated gradient orbs */}
        <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
        <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(255,255,255,0.08),transparent)] pointer-events-none"></div>
        
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 animate-fade-in">
              Ready to Transform Your Study Materials?
            </h2>
            <p className="text-xl opacity-90 mb-8 animate-fade-in-up">
              Turn any document into effective Cornell notes with just a few clicks. Improve your learning, retention, and study efficiency today.
            </p>
            <a 
              href="#upload" 
              className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-white text-[#4D4DFF] font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 animate-fade-in-up"
            >
              Start Converting Now
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
