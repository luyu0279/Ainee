"use client";

import { useState, useEffect } from "react";
import "./timeline.css";
import { AineeWebService } from "@/apis/services/AineeWebService";
import { ThankYouNoteRequest } from "@/apis/models/ThankYouNoteRequest";
import { CustomOpenApi } from "@/apis/CustomOpenApi";
import { Metadata } from "next";
import ApiLibs from "@/lib/ApiLibs";

export default function ThankYouNoteGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("in-person");
  const [formData, setFormData] = useState({
    interviewerName: "",
    companyName: "",
    position: "",
    interviewType: "in-person",
    tone: "semi-formal",
    specificPoints: "",
    yourName: ""
  });
  const [generatedNote, setGeneratedNote] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const request: ThankYouNoteRequest = {
        interviewer_name: formData.interviewerName,
        company_name: formData.companyName,
        position_applied_for: formData.position,
        interview_type: formData.interviewType,
        tone: formData.tone,
        specific_points_to_mention: formData.specificPoints,
        your_name: formData.yourName
      };

      const response = await ApiLibs.aineeWeb.generateThankYouNoteApiAineeWebThankYouNotePost(request);
      if (response.data) {
        setGeneratedNote(response.data.thank_you_note);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error generating thank you note:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setFormData({
      interviewerName: "",
      companyName: "",
      position: "",
      interviewType: "in-person",
      tone: "semi-formal",
      specificPoints: "",
      yourName: ""
    });
    setGeneratedNote("");
    setShowResults(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNote);
    // 可以添加一个复制成功的提示
    alert("Thank you note copied to clipboard!");
  };

  // 模拟生成感谢信的函数
  const generateThankYouNote = (data: typeof formData) => {
    const { interviewerName, companyName, position, interviewType, tone, specificPoints, yourName } = data;

    let greeting = "Dear";
    if (interviewerName) {
      greeting += ` ${interviewerName}`;
    } else {
      greeting += " Hiring Manager";
    }

    const intro = `Thank you for taking the time to interview me for the ${position} position at ${companyName}.`;

    let body = "I enjoyed our conversation and I am excited about the opportunity to contribute to your team.";

    if (specificPoints) {
      body += ` ${specificPoints}`;
    }

    const closing = "I look forward to the possibility of working together.";

    let signature = "Best regards,";
    if (yourName) {
      signature += `\n${yourName}`;
    }

    return `${greeting},\n\n${intro}\n\n${body}\n\n${closing}\n\n${signature}`;
  };

  // Tab switching functionality
  useEffect(() => {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-target");
        setActiveTab(target || "in-person");

        // Update active state
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Show/hide content
        tabContents.forEach((content) => {
          if (content.id === target) {
            content.classList.remove("hidden");
          } else {
            content.classList.add("hidden");
          }
        });
      });
    });

    return () => {
      tabButtons.forEach((button) => {
        button.removeEventListener("click", () => {});
      });
    };
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF4D4D]/5 via-[#4D4DFF]/5 to-[#50E3C2]/5">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
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

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Left column - Text content */}
            <div className="md:w-1/2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
                Thank You Note After Interview Generator
              </h1>
              <h2 className="text-xl md:text-2xl mb-6 font-light text-gray-700">
                Create the perfect post-interview thank you note in seconds
              </h2>
              <p className="text-lg mb-8 text-gray-600">
                Stand out from other candidates with a professional, personalized thank you note after your job interview.
              </p>
              <a
                href="#generator"
                className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Create Your Note Now
              </a>
            </div>

            {/* Right column - Stats card */}
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg w-full max-w-md border border-white/20">
                <div className="text-gray-800 mb-4">
                  <div className="flex mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="font-medium">Increases your chances of getting hired</div>
                  </div>
                  <div className="flex mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="font-medium">Shows professionalism and courtesy</div>
                  </div>
                  <div className="flex mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="font-medium">Reminds hiring managers of your qualifications</div>
                  </div>
                  <div className="flex">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="font-medium">Helps you stand out from other candidates</div>
                  </div>
                </div>
                <div className="text-center text-gray-500 text-sm">
                  <span className="font-bold text-gray-700">87%</span> of hiring managers say thank you notes influence their decisions
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Generator section */}
      <section id="generator" className="py-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center ">Thank You Note After Interview Generator</h2>
            <p className="text-[#737373] mt-3 text-lg italic text-center mb-8">Fill in the details below to create a professional, personalized thank you note that will help you stand out after your interview.</p>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Generator Form */}
                <div className="md:w-1/2 p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Enter Your Information</h3>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="interviewerName">Interviewer's Name</label>
                      <input className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="interviewerName" type="text" placeholder="e.g., John Smith" name="interviewerName" value={formData.interviewerName} onChange={handleInputChange} />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="companyName">Company Name</label>
                      <input className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="companyName" type="text" placeholder="e.g., Acme Corporation" name="companyName" value={formData.companyName} onChange={handleInputChange} />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="position">Position Applied For</label>
                      <input className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="position" type="text" placeholder="e.g., Marketing Manager" name="position" value={formData.position} onChange={handleInputChange} />
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="interviewType">Interview Type</label>
                      <select className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="interviewType" name="interviewType" value={formData.interviewType} onChange={handleInputChange}>
                        <option value="in-person">In-person Interview</option>
                        <option value="phone">Phone Interview</option>
                        <option value="video">Video Interview</option>
                        <option value="panel">Panel Interview</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="tone">Tone</label>
                      <select className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="tone" name="tone" value={formData.tone} onChange={handleInputChange}>
                        <option value="formal">Formal</option>
                        <option value="semi-formal">Semi-formal</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="specificPoints">Specific Points to Mention (Optional)</label>
                      <textarea className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="specificPoints" name="specificPoints" rows={2} placeholder="e.g., The team culture you mentioned, the project we discussed, something you forgot to mention" value={formData.specificPoints} onChange={handleInputChange}></textarea>
                    </div>
                    <div className="mb-3">
                      <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="yourName">Your Name</label>
                      <input className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4D4DFF] focus:border-transparent" id="yourName" type="text" placeholder="e.g., Jane Doe" name="yourName" value={formData.yourName} onChange={handleInputChange} />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <button type="button" className="text-gray-600 hover:text-gray-800 flex items-center" onClick={handleReset}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Reset
                      </button>
                      <button type="submit" className="px-4 py-1.5 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap relative overflow-hidden" disabled={isGenerating}>
                        {isGenerating ? (
                          <span className="flex items-center justify-center">
                            <span className="mr-2 relative">
                              <span className="absolute top-0 left-0 right-0 bottom-0 animate-ping rounded-full bg-white/30"></span>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </span>
                            <span className="relative animate-pulse">Generating<span className="animate-pulse-dots">...</span></span>
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer"></span>
                          </span>
                        ) : "Generate Note"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Generated Output */}
                <div className="md:w-1/2 p-6 md:p-8 bg-gray-50">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Your Thank You Note</h3>
                    {showResults && (
                      <button
                        onClick={handleCopy}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy
                      </button>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[400px]">
                    {!showResults ? (
                      <div className="text-center text-gray-500 h-full flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p>Fill in the form and click "Generate Note" to create your personalized thank you email.</p>
                      </div>
                    ) : (
                      <div className="text-gray-700 whitespace-pre-line">{generatedNote}</div>
                    )}
                  </div>
                  <div className="mt-6 text-center text-sm text-gray-500">
                    <p>After generating, review and personalize your note before sending it.</p>
                    <p className="mt-2 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Tip: Send your thank you note within 24 hours of your interview.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Send a Thank You Note section */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Why You Should Send a Thank You Note</h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              A simple thank you note can significantly impact your job application process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Shows Professionalism</h3>
              <p className="text-[#737373] text-sm leading-relaxed">
                A thank you note demonstrates your professionalism and attention to detail, traits employers value in candidates.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Keeps You Top of Mind</h3>
              <p className="text-[#737373] text-sm leading-relaxed">
                Sending a note after your interview helps the hiring manager remember you when making their final decision.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Adds Value</h3>
              <p className="text-[#737373] text-sm leading-relaxed">
                It gives you an opportunity to address any concerns, elaborate on answers, or add information you forgot to mention.
              </p>
            </div>
          </div>

          <div className="mt-12 bg-indigo-50/80 backdrop-blur-sm p-6 rounded-xl border border-indigo-100/30">
            <div className="flex flex-col md:flex-row items-start">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-4 flex-shrink-0 mb-4 md:mb-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-[#213756]">Did You Know?</h3>
                <p className="text-[#737373] text-sm leading-relaxed">
                  <a
                    href="https://www.cnbc.com/2019/04/30/do-i-have-to-send-a-thank-you-note-after-a-job-interview.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4D4DFF] hover:text-[#69DA00] underline transition-colors"
                  >
                    According to surveys
                  </a>, only 20-25% of candidates send thank you notes after interviews, yet nearly 80% of hiring managers say they influence their decision-making process. This simple step can significantly differentiate you from other candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 bg-gray-50/50 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">When & How to Send Your Thank You Note</h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              Follow these guidelines to create an effective thank you note
            </p>
          </div>

          <div className="relative max-w-3xl mx-auto timeline-container">
            {/* Timeline item 1 */}
            <div className="timeline-item">
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Within 24 Hours</h3>
              <p className="text-[#737373] text-sm leading-relaxed mb-4">
                Send your thank you note within 24 hours of your interview while you're still fresh in the interviewer's mind.
              </p>
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-white/30">
                <p className="text-[#737373] text-sm italic">
                  "I always look for thank you notes within a day of the interview. It shows me the candidate is serious and eager about the position."
                </p>
                <p className="text-[#213756] font-medium mt-2 text-sm">
                  - HR Director, Fortune 500 Company
                </p>
              </div>
            </div>

            {/* Timeline item 2 */}
            <div className="timeline-item">
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Email vs. Handwritten</h3>
              <p className="text-[#737373] text-sm leading-relaxed mb-4">
                Email is the most common and efficient method. Handwritten notes can add a personal touch but take longer to arrive.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-white/30">
                  <h4 className="font-medium mb-2 text-[#4D4DFF]">Email</h4>
                  <ul className="text-sm text-[#737373] space-y-1">
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Immediate delivery
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Professional format
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Easy to read and respond to
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Industry standard
                    </li>
                  </ul>
                </div>
                <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-white/30">
                  <h4 className="font-medium mb-2 text-[#4D4DFF]">Handwritten</h4>
                  <ul className="text-sm text-[#737373] space-y-1">
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      More personal touch
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Stands out as unique
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Takes days to arrive
                    </li>
                    <li className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      May arrive too late
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Timeline item 3 */}
            <div className="timeline-item">
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Keep It Concise</h3>
              <p className="text-[#737373] text-sm leading-relaxed mb-4">
                Your thank you note should be brief but impactful. Aim for 3-4 short paragraphs maximum.
              </p>
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-white/30">
                <div className="flex space-x-3">
                  <div className="text-[#4D4DFF]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <p className="text-[#737373] text-sm">
                    The perfect thank you email should take no more than 2 minutes to read. Busy hiring managers appreciate candidates who can communicate clearly and efficiently.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline item 4 */}
            <div className="timeline-item">
              <h3 className="text-xl font-semibold mb-3 text-[#213756]">Follow Up if Needed</h3>
              <p className="text-[#737373] text-sm leading-relaxed mb-4">
                If you don't hear back within the timeframe mentioned during your interview, it's appropriate to send a polite follow-up.
              </p>
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-sm border border-white/30">
                <h4 className="font-medium mb-2 text-[#4D4DFF]">Sample Follow-up:</h4>
                <p className="text-sm text-[#737373] italic">
                  "I hope this email finds you well. I'm following up on my interview for the [Position] from [Interview Date]. I'm still very interested in the role and wondering if you have an update on the hiring process. I appreciate your time and consideration."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Templates Section */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Sample Thank You Notes After Interview</h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              Browse our collection of effective thank you note templates for different interview scenarios
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className="tab-button active px-5 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-l-lg focus:outline-none hover:bg-gray-50"
                data-target="in-person"
              >
                In-person
              </button>
              <button
                type="button"
                className="tab-button px-5 py-2.5 text-sm font-medium bg-white border-t border-b border-gray-200 focus:outline-none hover:bg-gray-50"
                data-target="phone"
              >
                Phone
              </button>
              <button
                type="button"
                className="tab-button px-5 py-2.5 text-sm font-medium bg-white border-t border-b border-gray-200 focus:outline-none hover:bg-gray-50"
                data-target="video"
              >
                Video
              </button>
              <button
                type="button"
                className="tab-button px-5 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-r-lg focus:outline-none hover:bg-gray-50"
                data-target="panel"
              >
                Panel
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content" id="in-person">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Formal In-person Template */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Formal In-person</h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">Formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You - [Position] Interview</p>
                  <p className="mt-4">Dear Mr./Ms. [Last Name],</p>
                  <p className="mt-4">Thank you for taking the time to meet with me yesterday to discuss the [Position] role at [Company]. I appreciated the opportunity to learn more about the position and the company's goals for the coming year.</p>
                  <p className="mt-4">Our conversation about [specific topic discussed] was particularly insightful, and I'm excited about the possibility of contributing to [specific project or team goal]. My background in [relevant skill/experience] aligns well with what you're looking for, and I'm confident I could make valuable contributions to your team.</p>
                  <p className="mt-4">Thank you again for considering my application. I look forward to hearing from you about the next steps in the process. Please don't hesitate to contact me if you need any additional information.</p>
                  <p className="mt-4">Sincerely,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>

              {/* Casual In-person Template */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Casual In-person</h3>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Casual</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thanks for the great conversation today!</p>
                  <p className="mt-4">Hi [First Name],</p>
                  <p className="mt-4">Thanks so much for taking the time to meet with me today! I really enjoyed our conversation about the [Position] role and learning more about the amazing culture at [Company].</p>
                  <p className="mt-4">I was particularly excited about [something specific you discussed], and I can definitely see myself thriving in that environment. The work your team is doing with [specific project] sounds fascinating, and my experience with [relevant skill/experience] could be a great fit for what you're looking for.</p>
                  <p className="mt-4">Thanks again for the opportunity to interview. I'm very interested in joining the team and would love to continue the conversation. Feel free to reach out if you need anything else from me!</p>
                  <p className="mt-4">Best,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>
            </div>
          </div>

          {/* Phone Interview Templates */}
          <div className="tab-content hidden" id="phone">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Phone Interview - Formal */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Phone Interview - Formal</h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">Formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You for the Phone Interview - [Position]</p>
                  <p className="mt-4">Dear Mr./Ms. [Last Name],</p>
                  <p className="mt-4">Thank you for taking the time to speak with me over the phone today regarding the [Position] position at [Company]. I appreciate the opportunity to learn more about the role and how my skills could contribute to your team.</p>
                  <p className="mt-4">Our discussion about [specific topic] was particularly informative, and I'm enthusiastic about the possibility of bringing my experience in [relevant skill/experience] to support the team's objectives.</p>
                  <p className="mt-4">Thank you again for considering my application. I look forward to potentially continuing our conversation in person and learning more about the opportunity. Please don't hesitate to contact me if you need any additional information.</p>
                  <p className="mt-4">Sincerely,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>

              {/* Phone Interview - Brief */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Phone Interview - Brief</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Semi-formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank you for our conversation</p>
                  <p className="mt-4">Hello [First Name],</p>
                  <p className="mt-4">Thank you for taking the time to speak with me today about the [Position] role at [Company]. I enjoyed learning more about the position and the team's current priorities.</p>
                  <p className="mt-4">After our conversation, I'm even more excited about the opportunity to join your team. My background in [relevant skill/experience] aligns well with what you described, and I'm confident I could make valuable contributions quickly.</p>
                  <p className="mt-4">I look forward to the possibility of meeting in person to discuss the role further. Please let me know if you need any additional information from me.</p>
                  <p className="mt-4">Thank you again for your consideration.</p>
                  <p className="mt-4">Best regards,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>
            </div>
          </div>

          {/* Video Interview Templates */}
          <div className="tab-content hidden" id="video">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Video Interview - Standard */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Video Interview - Standard</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Semi-formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You - [Position] Video Interview</p>
                  <p className="mt-4">Hello [First Name],</p>
                  <p className="mt-4">Thank you for meeting with me via video conference today to discuss the [Position] role at [Company]. I appreciate your time and the insights you shared about the position and the team.</p>
                  <p className="mt-4">I was particularly interested in learning about [specific project or aspect of the role discussed]. My experience with [relevant skill/experience] would allow me to contribute effectively to these initiatives from day one.</p>
                  <p className="mt-4">Thank you again for considering my application. I'm very excited about the possibility of joining [Company] and would welcome the opportunity to continue our conversation. Please don't hesitate to reach out if you need any additional information.</p>
                  <p className="mt-4">Best regards,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>

              {/* Video Interview - Technical Role */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Video Interview - Technical Role</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Semi-formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You for the Technical Interview</p>
                  <p className="mt-4">Hello [First Name],</p>
                  <p className="mt-4">Thank you for taking the time to meet with me virtually today for the [Position] role. I appreciated the opportunity to discuss my technical background and how it aligns with the needs of your team.</p>
                  <p className="mt-4">The technical challenges you described regarding [specific technical challenge] are exactly the kind of problems I enjoy solving. My experience with [relevant technologies/skills] has prepared me well for addressing these types of issues, and I'm excited about the possibility of contributing to your team's success.</p>
                  <p className="mt-4">After our conversation, I did some additional research on [topic discussed] and thought you might find this [article/resource] interesting: [link or brief description].</p>
                  <p className="mt-4">Thank you again for your consideration. I'm very interested in the position and look forward to hearing about the next steps.</p>
                  <p className="mt-4">Best regards,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Interview Templates */}
          <div className="tab-content hidden" id="panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Panel Interview - Group Email */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Panel Interview - Group Email</h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">Formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You - [Position] Panel Interview</p>
                  <p className="mt-4">Dear [Primary Interviewer's Name] and Team,</p>
                  <p className="mt-4">Thank you for taking the time to meet with me today for the panel interview for the [Position] role. I appreciate the opportunity to speak with each of you and learn more about your team and the position.</p>
                  <p className="mt-4">The discussion about [specific topic] was particularly insightful, and I enjoyed hearing about the different perspectives and priorities across the team. My experience with [relevant skill/experience] has prepared me well for the challenges you described, and I'm excited about the possibility of contributing to your projects.</p>
                  <p className="mt-4">Thank you again for your time and consideration. I'm very interested in joining [Company] and look forward to hearing about the next steps in the process. Please don't hesitate to reach out if you need any additional information.</p>
                  <p className="mt-4">Sincerely,</p>
                  <p className="mt-2">[Your Name]</p>
                </div>
              </div>

              {/* Panel Interview - Individual Emails */}
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/30 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <div className="flex justify-between mb-4">
                  <h3 className="font-semibold text-lg text-[#213756]">Panel Interview - Individual Emails</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Semi-formal</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed">
                  <p>Subject: Thank You for the [Position] Interview</p>
                  <p className="mt-4">Hello [Individual Interviewer's Name],</p>
                  <p className="mt-4">Thank you for including me in today's panel interview for the [Position] role at [Company]. I appreciated your questions about [specific topic they asked about] and enjoyed our discussion.</p>
                  <p className="mt-4">Your insights on [something specific they mentioned] were particularly valuable, and they've given me an even better understanding of the role and its challenges. My experience with [relevant skill/experience that connects to their area] would allow me to contribute effectively to your team's goals.</p>
                  <p className="mt-4">Thank you again for your time and consideration. I'm very excited about the possibility of joining [Company] and working with you and the team. I look forward to potentially continuing our conversation.</p>
                  <p className="mt-4">Best regards,</p>
                  <p className="mt-2">[Your Name]</p>
                  <p className="mt-4 text-sm italic">Note: Customize each email to reference specific topics discussed with each interviewer. Send individual emails to each panel member when possible.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Do's and Don'ts Section */}
      <section className="py-16 bg-gray-50/50 backdrop-blur-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Do's and Don'ts</h2>
            <p className="text-[#737373] mt-3 text-lg italic">
              Follow these guidelines to create effective thank you notes that make a positive impression
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Do's */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border-l-4 border-green-500 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-4 text-green-600">Do's</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Send promptly</strong> - Within 24 hours of your interview</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Personalize</strong> - Reference specific topics from your conversation</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Proofread</strong> - Check for spelling, grammar, and name spelling errors</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Reaffirm interest</strong> - Express your continued enthusiasm for the role</span>
                </li>
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border-l-4 border-red-500 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <h3 className="text-xl font-semibold mb-4 text-red-600">Don'ts</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Wait too long</strong> - Delaying can make you seem uninterested</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Use generic templates</strong> - Avoid copy-pasting without customization</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Include salary</strong> - Save compensation discussions for later stages</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-1 mr-2">
                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><strong>Be too casual</strong> - Maintain professional tone even if the interview was relaxed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm mt-20 rounded-2xl">
        <div className="flex flex-col justify-center items-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Frequently asked questions</h2>
          <p className="text-[#737373] mt-3 text-lg italic text-center">
            Ainee Thank You Note after interview Generator FAQ
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
                <span className="text-[#3E1953] font-semibold">What is the Ainee thank you note for interview generator?</span>
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
                  <p>
                    It's a free online tool that uses AI to help users to quickly generate Thank you note after interview.
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
                <span className="text-[#3E1953] font-semibold">Is a thank you note really necessary after every interview?</span>
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
                    Yes, sending a thank you note is considered a professional courtesy and is expected by many hiring managers. According to surveys, 80% of hiring managers say thank you notes impact their decision-making process, yet only about 25% of candidates send them. Taking this simple step can help you stand out from other candidates.
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
                <span className="text-[#3E1953] font-semibold">How soon should I send a thank you note after an interview?</span>
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
                    You should send your thank you note within 24 hours of your interview. This ensures your conversation is still fresh in the interviewer's mind, and it demonstrates your promptness and continued interest in the position.
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
                <span className="text-[#3E1953] font-semibold">Should I send an email or a handwritten note?</span>
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
                    Email is the preferred method for most professional settings as it delivers your message immediately. However, you can stand out by sending both: an immediate email followed by a handwritten note. If you choose only one, email is generally safer, especially if a hiring decision will be made quickly.
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
                <span className="text-[#3E1953] font-semibold">What should I include in my thank you note?</span>
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
                    Your thank you note should include: a genuine expression of gratitude for the interviewer's time, reference to specific topics discussed during the interview, a brief reiteration of your interest and qualifications, and your contact information. Keep it concise, professional, and error-free.
                  </p>
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
                <span className="text-[#3E1953] font-semibold">What should I title my thank you email after an interview?</span>
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
                  <p>
                    Use a clear, professional subject line such as "Thank You - [Position] Interview" or "Thank You for the Opportunity" or "Following Up: [Position] Interview." Avoid vague subjects like "Hi" or "Following up" that might get lost in a busy inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* Question 7 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button
                onClick={() => toggleFaq(6)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left"
                aria-expanded={openFaq === 6}
              >
                <span className="text-[#3E1953] font-semibold">How do I send thank you notes after a panel interview?</span>
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
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 6 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div
                style={{
                  maxHeight: openFaq === 6 ? '1000px' : '0',
                  opacity: openFaq === 6 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>
                    Ideally, send personalized thank you notes to each person who interviewed you, referencing specific topics you discussed with them. If you don't have everyone's email, it's acceptable to send one note to your primary contact and ask them to extend your thanks to the rest of the panel.
                  </p>
                </div>
              </div>
            </div>

            {/* Question 8 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button
                onClick={() => toggleFaq(7)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left"
                aria-expanded={openFaq === 7}
              >
                <span className="text-[#3E1953] font-semibold">What if I interviewed with multiple people?</span>
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
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 7 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div
                style={{
                  maxHeight: openFaq === 7 ? '1000px' : '0',
                  opacity: openFaq === 7 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>
                    Send individual, personalized thank you notes to each person who interviewed you. Make sure to customize each note with specific references to your conversation with that person. This demonstrates your attention to detail and genuine interest in the role.
                  </p>
                </div>
              </div>
            </div>

            {/* Question 9 */}
            <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
              <button
                onClick={() => toggleFaq(8)}
                className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left"
                aria-expanded={openFaq === 8}
              >
                <span className="text-[#3E1953] font-semibold">Is it appropriate to follow up again if I don't hear back?</span>
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
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 8 ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div
                style={{
                  maxHeight: openFaq === 8 ? '1000px' : '0',
                  opacity: openFaq === 8 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'max-height 0.5s ease-in-out, opacity 0.3s ease-in-out',
                }}
              >
                <div className="px-6 py-4 bg-white/60 text-[#3E1953D6]/85">
                  <p>
                    Yes, it's appropriate to send one polite follow-up email if you haven't heard back by the timeframe they mentioned during your interview. Wait at least a week after your thank you note before sending a follow-up inquiry about the status of your application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative w-full py-10 md:py-12 overflow-hidden">
        {/* Background with animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4D4DFF]/5 via-[#69DA00]/5 to-[#4D4DFF]/5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none animate-pulse"></div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Boost Your Hiring Chances!</h2>
            <p className="text-lg md:text-xl text-gray-600 mb-6 max-w-2xl">
              Create a professional thank you note after interview in seconds with Ainee's Generator
            </p>

            <div className="flex items-center justify-center gap-4 mb-6 text-sm text-gray-500">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Professional
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Memorable
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Impactful
              </div>
            </div>

            <a
              href="#generator"
              className="group relative inline-flex items-center justify-center px-6 py-3 font-medium tracking-wide text-white bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-lg overflow-hidden transition-all duration-300 hover:opacity-90"
            >
              <span className="absolute w-0 h-0 transition-all duration-300 ease-out bg-white rounded-full group-hover:w-32 group-hover:h-32 opacity-10"></span>
              <span className="relative flex items-center">
                <span className="mr-2">Create Now</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
