"use client";

import { useState } from "react";

export default function Home() {
  const [openFaq, setOpenFaq] = useState(-1);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF4D4D]/10 via-[#4D4DFF]/10 to-[#50E3C2]/10 overflow-hidden relative">
      {/* Enhanced grid background with subtle animation */}
      <div className="absolute z-[-1] inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] animate-[pulse_15s_ease-in-out_infinite]"></div>
      
      {/* Animated gradient orbs */}
      <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none animate-[rotate_240s_linear_infinite]"></div>
      <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.06),transparent)] pointer-events-none animate-[float_15s_ease-in-out_infinite]"></div>
      
      <section className="container relative px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto">
        {/* Central glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl opacity-10 aspect-square h-96 rounded-full bg-gradient-to-br from-[#4D4DFF] via-[#69DA00] to-[#50E3C2] animate-[pulse_10s_ease-in-out_infinite]"></div>
        
        <div className="flex flex-col items-center justify-center gap-4 lg:gap-6 relative z-10">
          {/* Decorative elements */}
          <div className="absolute -top-16 left-1/4 w-24 h-24 rounded-full bg-[#69DA00]/5 blur-xl animate-float animate-delay-100"></div>
          <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-[#4D4DFF]/5 blur-xl animate-float animate-delay-200"></div>
          
          {/* Heading - First row */}
          <div className="text-center w-full max-w-4xl">
            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] pb-1">
                  Your AI Notetaking and Learning Companion
                </h1>
            <div className="mx-auto mt-0.5 w-32 h-1 bg-gradient-to-r from-[#69DA00] to-transparent rounded-full animate-[pulse_3s_ease-in-out_infinite]"></div>
              </div>
              
          {/* Taglines - Second row */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-4 w-full animate-fade-in-up animate-delay-100 -mt-1">
            <div className="flex items-center gap-1 backdrop-blur-sm py-0.5 md:py-1.5 px-4 rounded-full bg-white/5 border border-white/10 hover:border-[#69DA00]/20 transition-all duration-300 group">
              <span className="text-base md:text-xl group-hover:scale-110 transition-transform duration-300">🌍</span> 
              <span className="text-[#231815]/80 text-[13px] md:text-base">Capture Knowledge Far and Wide</span>
            </div>

            <div className="flex items-center gap-1 backdrop-blur-sm py-0.5 md:py-1.5 px-4 rounded-full bg-white/5 border border-white/10 hover:border-[#69DA00]/20 transition-all duration-300 group">
              <span className="text-base md:text-xl group-hover:scale-110 transition-transform duration-300">🤝</span> 
              <span className="text-[#231815]/80 text-[13px] md:text-base">Build Understanding Side by Side</span>
          </div>

            <div className="flex items-center gap-1 backdrop-blur-sm py-0.5 md:py-1.5 px-4 rounded-full bg-white/5 border border-white/10 hover:border-[#69DA00]/20 transition-all duration-300 group">
              <span className="text-base md:text-xl group-hover:scale-110 transition-transform duration-300">💡</span> 
              <span className="text-[#231815]/80 text-[13px] md:text-base">Generate Insights Smarter and Glide</span>
            </div>
          </div>
          
          {/* Hero image - Third row */}
          <div className="w-full mt-8 md:mt-10 flex justify-center animate-fade-in-up animate-delay-200">
            <img 
              src="/hero.svg" 
              alt="Ainee AI Platform"
              className="w-full md:w-[95%] max-w-6xl object-contain animate-float transform-gpu transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      {/* Trusted by section */}
      <section className="container relative px-6 md:px-8 lg:px-12 py-8 mb-8 max-w-7xl mx-auto bg-white/40 backdrop-blur-sm rounded-3xl border border-white/10">
        <div className="text-center space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-1.5 justify-center text-base md:text-lg text-[#231815]/80">
            <span>Trusted by over 500k+ high achievers</span>
            <div className="flex -space-x-2 my-1 md:my-0 md:mx-2">
              <img src="/avatars/avatar1.png" alt="Student" className="w-8 h-8 rounded-full border-2 border-white" />
              <img src="/avatars/avatar2.png" alt="Student" className="w-8 h-8 rounded-full border-2 border-white" />
              <img src="/avatars/avatar3.png" alt="Student" className="w-8 h-8 rounded-full border-2 border-white" />
              <img src="/avatars/avatar4.png" alt="Student" className="w-8 h-8 rounded-full border-2 border-white" />
            </div>
            <span>from top institutions across the globe</span>
          </div>
          
          <div className="w-full overflow-hidden">
            <div className="flex items-center gap-12 py-4 animate-scroll-slow whitespace-nowrap">
              {/* 第一组Logo */}
              <div className="flex items-center gap-12 shrink-0">
                <img src="/logos/mit.svg" alt="MIT" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/oxford.svg" alt="Oxford University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/yale.svg" alt="Yale University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/berkeley.svg" alt="UC Berkeley" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/ucla.svg" alt="UCLA" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/duke.svg" alt="Duke University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/utaustin.svg" alt="UT Austin" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
              </div>
              
              {/* 重复一组以实现无限滚动效果 */}
              <div className="flex items-center gap-12 shrink-0">
                <img src="/logos/mit.svg" alt="MIT" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/oxford.svg" alt="Oxford University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/yale.svg" alt="Yale University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/berkeley.svg" alt="UC Berkeley" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/ucla.svg" alt="UCLA" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/duke.svg" alt="Duke University" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
                <img src="/logos/utaustin.svg" alt="UT Austin" className="h-10 w-auto grayscale hover:grayscale-0 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto py-20 px-6 md:px-8 lg:px-12 bg-gradient-to-br from-white to-white/95 rounded-t-3xl">
        {/* Button styled "How it works" header */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full border border-gray-300 text-gray-400 text-sm">
            <img src="/how_it_works.svg" alt="" className="w-4 h-4" />
            HOW IT WORKS
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <h3 className="text-[#213756] dark:text-white font-faro-lucky font-bold text-2xl leading-[34px] text-balance text-center md:text-4xl md:leading-[53px] px-15 md:px-0 mb-6">Capture Knowledge Anywhere, In Any Format</h3>
          <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 max-w-3xl mx-auto mb-12 md:mb-16">
            With Ainee, you can import various types of study materials effortlessly.
            Whether it's real-time audio recordings, text, videos, YouTube lectures,
            classroom recordings, teacher handouts, post-class quizzes, or even website
            content, Ainee's AI seamlessly recognizes and processes all these formats.
          </p>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/capture1.svg" 
                  alt="Import options illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300" 
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Extensive Import Options</h4>
              <p className="text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Ainee supports importing content from sources such as YouTube URLs, real-time 
                audio recordings, PDFs, Excel sheets, Word documents, Markdown files, and other URLs. 
                Convert <strong>pdf to ai</strong> effortlessly with Ainee.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/capture2.svg" 
                  alt="Content conversion illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300"
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Automatic Conversion of Multimodal Content</h4>
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Ainee's AI converts diverse content types—including audio, video, and 
                images—into text, making it easier for you to study and reference. Use Ainee 
                as your <strong>ai voice recorder</strong> and <strong>ai notes</strong> generator to enhance your 
                learning efficiency by providing clear, searchable text.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Part 2 */}
      <section className="container mx-auto py-20 px-6 md:px-8 lg:px-12 bg-gradient-to-br from-white to-white/95">
        <div className="max-w-6xl mx-auto">
        <h3 className="text-[#213756] dark:text-white font-faro-lucky font-bold text-2xl leading-[34px] text-balance text-center md:text-4xl md:leading-[53px] px-15 md:px-0 mb-6">Build Understanding with AI</h3>
        <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 max-w-3xl mx-auto mb-12 md:mb-16">
        Ainee acts as your AI-powered learning companion, making it easier to digest and understand 
            the information you import. The AI automatically generates notes, summaries, and mind maps, 
            allowing you to interact with the content and the AI to maximize your comprehension tenfold.
          </p>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/build1.svg" 
                  alt="Automated note-taking illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300" 
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Focus on Learning, Not Note-taking</h4>
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Ainee automates the note-taking process by understanding and structuring your imported 
                content into detailed notes, complete with structures, formulas, and examples. Use Ainee 
                as your <strong>ai notetaker</strong> and <strong>ai note taking app</strong>, letting you concentrate solely on the learning 
                material itself.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/build2.svg" 
                  alt="AI learning tools illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300"
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">A Wealth of AI-Powered Learning Tools</h4>
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Beyond transcription, Ainee can transform your study materials into various effective 
                learning formats such as mind maps, flashcards, podcasts, quizzes, and more. Ainee is 
                your <strong>ai quiz generator</strong> and <strong>ai flashcard maker</strong>, making study sessions more interactive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Part 3 */}
      <section className="container mx-auto py-20 px-6 md:px-8 lg:px-12 bg-gradient-to-br from-white to-white/95">
        <div className="max-w-6xl mx-auto">
        <h3 className="text-[#213756] dark:text-white font-faro-lucky font-bold text-2xl leading-[34px] text-balance text-center md:text-4xl md:leading-[53px] px-15 md:px-0 mb-6">Generate Insights Through Your Knowledge Base</h3>
        <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 max-w-3xl mx-auto mb-12 md:mb-16">
        Ainee enables you to share your comprehensive knowledge and insights, not just bits and pieces.
          </p>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/share1.svg" 
                  alt="Knowledge sharing illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300" 
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Share Your Knowledge System, Not Just Fragments</h4>
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Share your entire knowledge base with others, who can then benefit from AI-enhanced 
                learning methods, including AI dialogues and interactive formats within the shared 
                knowledge base.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="bg-gradient-to-br from-white/60 to-white/40 backdrop-blur-sm w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden border border-white/20 flex items-center justify-center">
                <img 
                  src="/share2.svg" 
                  alt="Knowledge subscription illustration" 
                  className="w-[90%] h-[90%] object-contain animate-float transition-all duration-300"
                />
              </div>
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Subscribe to Shared Knowledge, Promoting Knowledge Flow</h4>
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Explore a growing library of quizzes, summaries, and podcasts created by other users. 
                Discover nearly endless quizzes on various subjects to reinforce your knowledge and 
                explore new areas of interest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart Section */}
      <section className="container mx-auto py-20 px-6 md:px-8 lg:px-12 bg-gradient-to-br from-[#F9F9FF] to-[#F5F7FF] relative overflow-hidden">
        {/* Button styled "Differentiation" header */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full border border-gray-300 text-gray-400 text-sm">
            <img src="/differentiation.svg" alt="" className="w-4 h-4" />
            DIFFERENTIATION
          </div>
        </div>

        {/* Subtle background patterns */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(circle_400px_at_70%_20%,rgba(77,77,255,0.03),transparent)] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(circle_400px_at_30%_80%,rgba(105,218,0,0.03),transparent)] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <h3 className="text-[#213756] dark:text-white font-faro-lucky font-bold text-2xl leading-[34px] text-balance text-center md:text-4xl md:leading-[53px] px-15 md:px-0 mb-6">What Sets Us Apart</h3>
          <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 text-balance px-6 xs:px-0 mb-12 md:mb-16">
            Our unique approach to AI-powered learning makes Ainee stand out from the competition
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {/* Feature 1 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/40 group hover:border-[#4D4DFF]/20">
              <div className="flex justify-center mb-5">
                <img src="/diff1.svg" alt="Seamless AI Interaction" className="h-10 w-10 group-hover:scale-105 transition-transform duration-300" />
              </div>
              
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Seamless AI Interaction</h4>
              
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Study more efficiently with AI-generated answers that include references to original content. Ainee serves as your <strong>ai teacher</strong> that can intelligently process and explain complex materials.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/40 group hover:border-[#FF4D4D]/20">
              <div className="flex justify-center mb-5">
                <img src="/diff2.svg" alt="Shared Knowledge Base" className="h-10 w-10 group-hover:scale-105 transition-transform duration-300" />
              </div>
              
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Shared Knowledge Base</h4>
              
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Share entire knowledge bases with others, complete with AI-enhanced learning tools, making the learning process more structured and effective for everyone.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-white/40 group hover:border-[#50E3C2]/20">
              <div className="flex justify-center mb-5">
                <img src="/diff3.svg" alt="Unlimited AI Conversations" className="h-10 w-10 group-hover:scale-105 transition-transform duration-300" />
              </div>
              
              <h4 className="text-lg font-bold font-faro-lucky text-[#121212] dark:text-white text-center mb-3">Unlimited AI Conversations</h4>
              
              <p className="text-balance text-[#737373] dark:text-white/40 font-light text-sm leading-[22px] text-center">
                Enjoy unrestricted AI dialogues within your knowledge base, facilitating more systematic and comprehensive learning with direct AI assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Our Users Are Saying Section */}
      <section className="py-16 md:py-24 bg-[#0E0E16] text-white overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full border border-gray-300 text-gray-400 text-sm">
              <img src="/get_ready.svg" alt="" className="w-4 h-4" />
              GET STARTED NOW
            </div>
          </div>
          
          <h3 className="text-white dark:text-white font-faro-lucky font-bold text-2xl leading-[34px] text-balance text-center md:text-4xl md:leading-[53px] px-15 md:px-0 mb-6">
            What Our Users Are Saying
          </h3>
          <p className="text-white text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 text-balance px-6 xs:px-0 mb-12 md:mb-16">
            Hear from our community of users and how Ainee has changed their learning experience
          </p>

          {/* First row of scrolling testimonials */}
          <div className="mb-4 relative">
            <div className="flex w-full space-x-2 pb-4 scrollbar-hide animate-scroll-slow" style={{paddingRight: '100px'}}>
              {/* Testimonial 1 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Priya</h4>
                    <p className="text-gray-400 text-xs">@MIT</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">I can finally focus entirely on the lecture—no more worrying about taking notes! Ainee's real-time note-taking is a game-changer.</p>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Lisa</h4>
                    <p className="text-gray-400 text-xs">@Harvard</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">I love the structured notes Ainee generates! They help me memorize things 10x faster.</p>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Danny</h4>
                    <p className="text-gray-400 text-xs">@NYU</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The AI quizzes in Ainee are a total lifesaver for exam prep. Can't function without them.</p>
              </div>

              {/* Testimonial 4 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#50E3C2] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Eric</h4>
                    <p className="text-gray-400 text-xs">@UC_Berkeley</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Reading tons of materials has never been so delightful! Thanks, Ainee!</p>
              </div>

              {/* Testimonial 5 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Emily</h4>
                    <p className="text-gray-400 text-xs">@Stanford</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The <strong>ai voice recorder</strong> and <strong>article summarizer ai</strong> are super helpful. My grades have improved!</p>
              </div>

              {/* New Testimonial 1 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Jessica</h4>
                    <p className="text-gray-400 text-xs">@Acme Corp</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee has transformed my document review process. The automatic summaries save me hours every week!</p>
              </div>

              {/* New Testimonial 2 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#50E3C2] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Michael</h4>
                    <p className="text-gray-400 text-xs">@BrightTech</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The AI flashcards and quizzes make learning new regulations a breeze. Ainee is a game-changer!</p>
              </div>

              {/* New Testimonial 3 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Sophia</h4>
                    <p className="text-gray-400 text-xs">@Greenfield</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">With Ainee, I can convert meeting recordings into text instantly. It's like having a personal assistant!</p>
              </div>

              {/* New Testimonial 4 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">James</h4>
                    <p className="text-gray-400 text-xs">@Innovatech</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee's mind maps help me visualize complex projects. It's an invaluable tool for team collaboration.</p>
              </div>

              {/* New Testimonial 5 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Emma</h4>
                    <p className="text-gray-400 text-xs">@NexGen</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The structured notes from Ainee have significantly improved my client presentation prep. Highly recommend!</p>
              </div>

              {/* Duplicate first testimonial for infinite loop feeling */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Priya</h4>
                    <p className="text-gray-400 text-xs">@MIT</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">I can finally focus entirely on the lecture—no more! Ainee's real-time note-taking is a game-changer.</p>
              </div>
            </div>
            {/* Gradient fade effect on edges */}
            {/* <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0E0E16] to-transparent z-10"></div> */}
            {/* <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0E0E16] to-transparent z-10"></div> */}
          </div>

          {/* Second row of scrolling testimonials (reversed direction) */}
          <div className="relative">
            <div className="flex w-full space-x-2 pb-4 scrollbar-hide animate-scroll-slow-reverse" style={{paddingRight: '100px'}}>
              {/* Testimonial 6 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#50E3C2] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Alex</h4>
                    <p className="text-gray-400 text-xs">@Princeton</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee makes note-taking so easy. Flashcards and quizzes are perfect for quick reviews.</p>
              </div>

              {/* Testimonial 7 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Rachel</h4>
                    <p className="text-gray-400 text-xs">@Yale</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee has turned my study routine into something productive and structured. Love it!</p>
              </div>

              {/* Testimonial 8 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">John</h4>
                    <p className="text-gray-400 text-xs">@UCLA</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The AI mindmap creator and podcast feature are brilliant.</p>
              </div>

              {/* Testimonial 9 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Ming</h4>
                    <p className="text-gray-400 text-xs">@Cornell</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">The ai meeting note taker is perfect for my group projects.</p>
              </div>
              
              {/* Testimonial 10 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Rachel T.</h4>
                    <p className="text-gray-400 text-xs">@MIT</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee is a must-have for you. The ai flashcard maker and article summarizer ai are fantastic. </p>
              </div>
              
              {/* Testimonial 11 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#50E3C2] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Mark H</h4>
                    <p className="text-gray-400 text-xs">@Duke</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee's ability to share knowledge bases is brilliant.</p>
              </div>

              {/* New Testimonial 6 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Daniel</h4>
                    <p className="text-gray-400 text-xs">@Cityline</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Turning video content into searchable text with Ainee is incredibly efficient. My productivity has skyrocketed.</p>
              </div>

              {/* New Testimonial 7 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Olivia</h4>
                    <p className="text-gray-400 text-xs">@BlueWave</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee's AI-generated summaries for lengthy reports are spot-on. It helps me focus on what truly matters.</p>
              </div>

              {/* New Testimonial 8 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#50E3C2] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Ethan</h4>
                    <p className="text-gray-400 text-xs">@Precision</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee makes it easy to capture and share knowledge across our teams. The learning tools are top-notch!</p>
              </div>

              {/* New Testimonial 9 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#69DA00] to-[#4D4DFF] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Ava</h4>
                    <p className="text-gray-400 text-xs">@Skyline</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Automated note-taking with Ainee has streamlined my research process. The flashcards are perfect for quick reviews.</p>
              </div>

              {/* New Testimonial 10 */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#50E3C2] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">William</h4>
                    <p className="text-gray-400 text-xs">@Quantum</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">Ainee's ability to handle multiple content formats seamlessly is impressive. It's a must-have for any professional.</p>
              </div>

              {/* Duplicate first testimonial for infinite loop feeling */}
              <div className="bg-[#1A1A24] rounded-xl p-3 flex-shrink-0 w-48 md:w-56">
                <div className="flex items-center mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex-shrink-0"></div>
                  <div className="ml-2">
                    <h4 className="font-bold text-sm">Priya</h4>
                    <p className="text-gray-400 text-xs">@MIT</p>
                  </div>
                </div>
                <p className="text-sm line-clamp-3">I can finally focus entirely on the lecture—no more! Ainee's real-time note-taking is a game-changer.</p>
              </div>
            </div>
            {/* Gradient fade effect on edges */}
            {/* <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0E0E16] to-transparent z-10"></div> */}
            {/* <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0E0E16] to-transparent z-10"></div> */}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section */}
      <section className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white">
        <div className="flex flex-col justify-center items-center gap-3">
          <h2 className="text-[#213756] font-bold text-2xl md:text-4xl text-center">
            Popular Questions
          </h2>
          <p className="text-[#737373] text-sm md:text-base text-center max-w-xl">
            See what are other users are thinking before committing
          </p>
        </div>
        
        <div className="mt-10 md:mt-12 max-w-sm md:max-w-2xl w-full px-4 md:px-0">
          <div className="w-full space-y-5">
            {/* Question 1 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button 
                onClick={() => toggleFaq(0)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                aria-expanded={openFaq === 0}
              >
                <span className="text-[#3E1953] font-semibold">How much does Ainee cost?</span>
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
                  transition: 'max-height 0.5s ease-in-out, opacity 0.1s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>
                    Currently <span className="font-bold text-[#69DA00]">free</span> during the testing phase for all services.
                  </p>
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
                <span className="text-[#3E1953] font-semibold">What real-life problems can Ainee solve?</span>
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
                  <p>
                    Ainee addresses several key challenges faced by students and professionals alike. It simplifies the process of capturing and organizing complex information from lectures, meetings, and various study materials. By automating the transcription and summarization of audio, video, and text content, Ainee ensures that users can focus on understanding and learning rather than note-taking. It also enhances retention and comprehension through AI-generated mind maps, flashcards, quizzes, and podcasts, making study sessions more effective and engaging.
                  </p>
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
                <span className="text-[#3E1953] font-semibold">How does Ainee work?</span>
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
                  <p>
                    Ainee is designed to seamlessly integrate into your learning routine. Users can import study materials in various formats, including real-time audio, text, videos, YouTube lectures, PDFs, and more. Ainee's AI automatically converts these materials into text and organizes them into structured notes, summaries, and mind maps. Additionally, users can interact with the AI to generate quizzes, flashcards, and podcasts, making the learning process interactive and comprehensive. The AI also facilitates knowledge sharing by allowing users to share their entire knowledge bases with others.
                  </p>
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
                <span className="text-[#3E1953] font-semibold">Is my uploaded data secure? Will it be used for training models?</span>
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
                  <p>
                    Your data security is a top priority for us. All uploaded data is securely stored and protected. Ainee ensures that your personal and study materials are used solely for your intended purposes and are not used to train external models. The platform is designed to prioritize user privacy and data integrity, ensuring a safe and secure learning environment.
                  </p>
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
                <span className="text-[#3E1953] font-semibold">Can I use Ainee on my phone?</span>
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
                  <p>
                    Yes, Ainee is fully responsive and works on mobile devices. You can access all features through our mobile-optimized web application, allowing you to capture, organize, and learn from your notes anywhere, anytime. Whether you're in a lecture, meeting, or studying on the go, Ainee provides a seamless experience across all your devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try Ainee Now Section */}
      <section className="w-full py-16 md:py-20 bg-gradient-to-br from-[#4D4DFF]/5 via-transparent to-[#69DA00]/5">
        <div className="container mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] pb-2">
              Be part of the future of Ainee AI
            </h2>
            
            <p className="text-[#737373] text-[13px] leading-[21px] text-center md:text-base md:leading-[31px] dark:text-white/40 text-balance px-2 md:px-0">
              Join our beta testing and get early access to the best ai note taker
            </p>

            <div className="pt-2">
              <a
                href="#"
                className="inline-flex h-12 md:h-14 items-center justify-center rounded-xl bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] px-8 md:px-10 text-lg font-medium text-white shadow-lg shadow-[#4D4DFF]/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#4D4DFF]/30 focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:ring-offset-2"
              >
                Get Started Free
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
