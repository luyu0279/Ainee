"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function MainNav() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isToolsOpen, setIsToolsOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = React.useState(false);
  const toolsMenuRef = React.useRef<HTMLDivElement>(null);
  const toolsButtonRef = React.useRef<HTMLButtonElement>(null);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const userButtonRef = React.useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = React.useRef<HTMLDivElement>(null);
  const mobileUserButtonRef = React.useRef<HTMLDivElement>(null);
  const { userInfo, logout } = useAuth();
  const router = useRouter();

  const userAvatar = userInfo?.picture || userInfo?.picture || "/images/default-avatar.png";

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    document.body.style.overflow = !isOpen ? 'hidden' : 'unset';
  };

  const toggleToolsMenu = () => {
    setIsToolsOpen(!isToolsOpen);
    setIsUserMenuOpen(false);
    setIsMobileUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    setIsToolsOpen(false);
    setIsMobileUserMenuOpen(false);
  };

  const toggleMobileUserMenu = () => {
    setIsMobileUserMenuOpen(!isMobileUserMenuOpen);
    setIsUserMenuOpen(false);
    setIsToolsOpen(false);
  };

  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem('ainee_token');
    
    // Dispatch logout event for Chrome extension
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('aineeLogout');
      window.dispatchEvent(event);
    }
    
    // Refresh the page to reset state
    window.location.href = '/';
  };

  // Handle click outside to close the dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Tools menu
      if (
        isToolsOpen && 
        toolsMenuRef.current && 
        !toolsMenuRef.current.contains(event.target as Node) &&
        toolsButtonRef.current &&
        !toolsButtonRef.current.contains(event.target as Node)
      ) {
        setIsToolsOpen(false);
      }

      // Desktop user menu
      if (
        isUserMenuOpen && 
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target as Node) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }

      // Mobile user menu
      if (
        isMobileUserMenuOpen && 
        mobileUserMenuRef.current && 
        !mobileUserMenuRef.current.contains(event.target as Node) &&
        mobileUserButtonRef.current &&
        !mobileUserButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen, isUserMenuOpen, isMobileUserMenuOpen]);

  return (
    <>
      <Link href="/" className="flex items-center space-x-2 mr-8">
        <Image src="/logo-web.svg" alt="Ainee Logo" width={120} height={32} />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-8">
        <Link
          href="/"
          className={cn(
            "flex items-center font-medium text-muted-foreground",
            "transition-colors hover:text-foreground text-[14px] cursor-pointer"
          )}
        >
          Home
        </Link>
        
        {/* Tools Dropdown */}
        <div className="relative text-[14px] text-muted-foreground" ref={toolsMenuRef}>
          <button
            ref={toolsButtonRef}
            onClick={toggleToolsMenu}
            className={cn(
              "flex items-center font-medium text-muted-foreground",
              "transition-colors hover:text-foreground text-[14px] cursor-pointer"
            )}
          >
            Tools
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              className="ml-1"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M6 9l6 6 6-6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </button>
          
          {isToolsOpen && (
            <div className="absolute top-full left-0 mt-2 py-2 w-96 bg-white rounded-md shadow-lg z-50 border border-gray-100">
              <Link
                href="/youtube-video-summarizer"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                YouTube Summarizer
              </Link>
              <Link
                href="/youtube-transcript-generator"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                YouTube Transcript Generator
              </Link>
              <Link
                href="/thank-you-note-after-interview-generator"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                Thank You Note after Interview Generator
              </Link>
              <Link
                href="/thank-you-note-to-teacher-generator"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                Thank You Note to Teacher Generator
              </Link>
              <Link
                href="/ai-flashcard-maker"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                AI Flashcard Maker
              </Link>
              <Link
                href="/cornell-notes-generator"
                className="block px-4 py-2 text-[14px] text-gray-700 hover:bg-gray-100"
                onClick={() => setIsToolsOpen(false)}
              >
                Cornell Notes Generator
              </Link>
              {/* More tools can be added here */}
            </div>
          )}
        </div>
        
        <Link
          href="https://blog.ainee.com/"
          target="_blank"
          className={cn(
            "flex items-center font-medium text-muted-foreground",
            "transition-colors hover:text-foreground text-[14px] cursor-pointer"
          )}
        >
          Blog
        </Link>
      </div>

      {/* Desktop Download and Login Buttons */}
      <div className="hidden md:flex items-center space-x-4 ml-auto">
        <a
          href="https://apps.apple.com/us/app/ainee/id6738338767?pt=ainee_com&ct=202411&mt=website"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#69DA00] px-6 text-sm font-medium text-white transition-colors hover:bg-[#5BC500] focus:outline-none focus:ring-2 focus:ring-[#69DA00] focus:ring-offset-2"
        >
          Download Ainee
        </a>
        {userInfo ? (
          <Link href="/dashboard" target="_blank">
            <Image
              src={userAvatar}
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Login
          </Link>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center ml-auto space-x-4">
        {userInfo ? (
          <Link href="/dashboard" target="_blank">
            <Image
              src={userAvatar}
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Login
          </Link>
        )}
        <button 
          className="p-2"
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M4 6H20M4 12H20M4 18H20" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Menu Fullscreen Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 min-h-screen">
          {/* Solid background to ensure no bleed-through */}
          <div className="absolute inset-0 bg-white"></div>
          
          {/* Background with styling */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D4D]/5 via-[#4D4DFF]/5 to-[#50E3C2]/5 backdrop-blur-sm overflow-hidden">
            {/* Enhanced grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Animated gradient orbs */}
            <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none"></div>
            <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.06),transparent)] pointer-events-none"></div>
            
            {/* Central glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl opacity-10 aspect-square h-96 rounded-full bg-gradient-to-br from-[#4D4DFF] via-[#69DA00] to-[#50E3C2]"></div>
          </div>

          {/* Menu Container */}
          <div className="relative h-full flex flex-col md:hidden">
            {/* Top section with logo and close button - exactly match layout.tsx header */}
            <header className="z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container max-w-7xl mx-auto">
                <div className="flex h-16 items-center justify-between px-6 md:px-8 lg:px-12">
                  <Link href="/" className="flex items-center space-x-2">
                    <Image src="/logo-web.svg" alt="Ainee Logo" width={120} height={32} />
                  </Link>
                  <button 
                    onClick={toggleMenu}
                    className="p-2"
                    aria-label="Close menu"
                  >
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M18 6L6 18M6 6L18 18" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </header>

            {/* Menu Items - more menu-like appearance */}
            <div className="flex-1 flex flex-col pt-16 px-6 md:px-8 lg:px-12">
              <div>
                <Link
                  href="/"
                  className="block text-2xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-3"
                  onClick={toggleMenu}
                >
                  Home
                </Link>
                <div className="h-px bg-gray-100"></div>
                
                {/* Tools dropdown section for mobile */}
                <div>
                  <button
                    onClick={() => setIsToolsOpen(!isToolsOpen)}
                    className="flex items-center justify-between w-full text-2xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-3"
                  >
                    Tools
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      className={`transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M6 9l6 6 6-6" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                { (
                    <div className={`pl-4 mb-2`}>
                      <Link
                        href="/youtube-video-summarizer"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        YouTube Summarizer
                      </Link>
                      <Link
                        href="/youtube-transcript-generator"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        YouTube Transcript Generator
                      </Link>
                      <Link
                        href="/thank-you-note-after-interview-generator"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        Thank You Note after Interview Generator
                      </Link>
                      <Link
                        href="/thank-you-note-to-teacher-generator"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        Thank You Note to Teacher Generator
                      </Link>
                      <Link
                        href="/ai-flashcard-maker"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        AI Flashcard Maker
                      </Link>
                      <Link
                        href="/cornell-notes-generator"
                        className="block text-xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-2"
                        onClick={toggleMenu}
                      >
                        Cornell Notes Generator
                      </Link>
                      {/* More tools can be added here */}
                    </div>
                  )}
                <div className="h-px bg-gray-100"></div>
                
                <Link
                  href="https://blog.ainee.com/"
                  target="_blank"
                  className="block text-2xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-3"
                  onClick={toggleMenu}
                >
                  Blog
                </Link>
                <div className="h-px bg-gray-100"></div>
                <a
                  href="https://apps.apple.com/us/app/ainee/id6738338767?pt=ainee_com&ct=202411&mt=website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-2xl font-medium tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] hover:opacity-80 transition-opacity py-3"
                  onClick={toggleMenu}
                >
                  Download Ainee
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}