"use client";

import Image from "next/image";
import React, { useEffect, useState, useCallback, useRef } from "react";
import ApiLibs from "@/lib/ApiLibs";
import { Body_generate_flashcards_api_ainee_web_flashcards_generate_post } from "@/apis/models/Body_generate_flashcards_api_ainee_web_flashcards_generate_post";

// 添加CSS样式用于动画效果
const styles = {
  perspective: {
    perspective: "1000px",
  },
  transformStyle3d: {
    transformStyle: "preserve-3d",
  },
  backfaceHidden: {
    backfaceVisibility: "hidden",
  },
  rotateY180: {
    transform: "rotateY(180deg)",
  },
};

// 添加关键帧动画
const keyframes = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.shimmer {
  animation: shimmer 2s infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.perspective {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.transition-transform {
  transition-property: transform;
}

.duration-700 {
  transition-duration: 700ms;
}

.hover\\:rotate-y-180:hover {
  transform: rotateY(180deg);
}

.flashcard-demo {
  perspective: 1000px;
}

.flashcard-inner-demo {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flashcard-demo:hover .flashcard-inner-demo {
  transform: rotateY(180deg);
}

.flashcard-front-demo, .flashcard-back-demo {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}

.flashcard-back-demo {
  transform: rotateY(180deg);
}
`;

const languages = [
  "አማርኛ", "العربية", "Azərbaycan", "বাংলা", "Български", "Čeština", "Dansk", "Deutsch", "Eesti", "English", "Español", "فارسی", "Suomi", "Français", "ગુજરાતી", "עברית", "हिन्दी", "Hrvatski", "Magyar", "Bahasa Indonesia", "Italiano", "日本語", "Қазақ", "ភាសាខ្មែរ", "ಕನ್ನಡ", "한국어", "Кыргызча", "Lietuvių", "Latviešu", "Bahasa Melayu", "မြန်မာ", "नेपाली", "Nederlands", "Norsk", "ਪੰਜਾਬੀ", "Polski", "Português", "Română", "Русский", "සිංහල", "Slovenčina", "Slovenščina", "Српски", "Svenska", "Kiswahili", "தமிழ்", "ไทย", "Filipino", "Türkçe", "Українська", "اردو", "Oʻzbek", "Tiếng Việt", "简体中文", "繁體中文"
];

const sampleCases = [
  { title: "Biology", desc: "Cell structure & function", bg: "bg-gray-100 border-gray-200", text: "text-gray-700" },
  { title: "History", desc: "World War II timeline", bg: "bg-gray-100 border-gray-200", text: "text-gray-700" },
  { title: "Physics", desc: "Laws of thermodynamics", bg: "bg-gray-100 border-gray-200", text: "text-gray-700" },
  { title: "Languages", desc: "Spanish vocabulary", bg: "bg-gray-100 border-gray-200", text: "text-gray-700" },
];

// 添加模拟闪卡数据
const sampleFlashcards = {
  Biology: [
    { front: "What is the primary function of mitochondria?", back: "Mitochondria are the powerhouse of the cell, responsible for generating ATP through cellular respiration, providing energy for cellular processes." },
    { front: "What are the three main stages of cellular respiration?", back: "The three main stages are glycolysis, the Krebs cycle (citric acid cycle), and the electron transport chain." },
    { front: "What is the difference between active and passive transport?", back: "Active transport requires energy (ATP) to move molecules against their concentration gradient, while passive transport doesn't require energy as molecules move from high to low concentration." },
    { front: "Define homeostasis and explain its importance.", back: "Homeostasis is the maintenance of a stable internal environment despite changes in external conditions. It's crucial for proper cell function and organism survival." },
    { front: "What is the structure and function of the cell membrane?", back: "The cell membrane is a phospholipid bilayer with embedded proteins that regulates what enters and exits the cell, maintains cell integrity, and facilitates communication with other cells." }
  ],
  History: [
    { front: "When did World War II begin and end?", back: "World War II began on September 1, 1939, when Germany invaded Poland, and ended on September 2, 1945, when Japan formally surrendered." },
    { front: "Who were the main Axis Powers in World War II?", back: "The main Axis Powers were Germany, Italy, and Japan." },
    { front: "Who were the main Allied Powers in World War II?", back: "The main Allied Powers were Great Britain, France, the United States, the Soviet Union, and China." },
    { front: "What was the Holocaust?", back: "The Holocaust was the systematic, state-sponsored persecution and murder of six million Jews and millions of others by the Nazi regime and its allies during World War II." },
    { front: "What was D-Day?", back: "D-Day (June 6, 1944) was the Allied invasion of Normandy, France, which marked the beginning of the liberation of Western Europe from Nazi control." }
  ],
  Physics: [
    { front: "What is the First Law of Thermodynamics?", back: "The First Law of Thermodynamics states that energy cannot be created or destroyed in an isolated system; it can only be transformed from one form to another. Also known as the Law of Energy Conservation." },
    { front: "What is the Second Law of Thermodynamics?", back: "The Second Law of Thermodynamics states that the entropy of an isolated system always increases over time. Heat flows spontaneously from hot to cold objects, and not vice versa." },
    { front: "What is the Third Law of Thermodynamics?", back: "The Third Law of Thermodynamics states that as the temperature approaches absolute zero, the entropy of a system approaches a constant minimum value." },
    { front: "What is entropy?", back: "Entropy is a measure of the disorder or randomness in a system. Higher entropy means greater disorder or more randomness." },
    { front: "What is the Zeroth Law of Thermodynamics?", back: "The Zeroth Law states that if two systems are each in thermal equilibrium with a third system, they are also in thermal equilibrium with each other." }
  ],
  Languages: [
    { front: "¿Cómo te llamas? (What's this phrase mean?)", back: "What is your name?" },
    { front: "How do you say \"hello\" in Spanish?", back: "Hola" },
    { front: "How do you say \"thank you\" in Spanish?", back: "Gracias" },
    { front: "How do you say \"goodbye\" in Spanish?", back: "Adiós" },
    { front: "How do you count from 1 to 5 in Spanish?", back: "Uno, dos, tres, cuatro, cinco" }
  ]
};

// Type definitions
interface Flashcard {
  front: string;
  back: string;
  lastResult?: 'again' | 'hard' | 'good' | 'easy';
}

interface StudyMode {
  isActive: boolean;
  currentCardIndex: number;
  isShowingAnswer: boolean;
  easyCards: number[];
  mediumCards: number[];
  hardCards: number[];
}

export default function AiFlashcardMakerPage() {
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState<string>("English");
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'study' | 'export'>('edit');
  const [studyMode, setStudyMode] = useState<StudyMode>({
    isActive: false,
    currentCardIndex: 0,
    isShowingAnswer: false,
    easyCards: [],
    mediumCards: [],
    hardCards: []
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Animation states for progress bar and cards
  const [showCard1, setShowCard1] = useState(false);
  const [showCard2, setShowCard2] = useState(false);
  const [showCard3, setShowCard3] = useState(false);

  // Generation section state
  const [inputTab, setInputTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [inputText, setInputText] = useState("");
  const [textError, setTextError] = useState("");
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [otherRequirements, setOtherRequirements] = useState("");
  const [validationError, setValidationError] = useState("");

  // Output section state
  const [activeSection, setActiveSection] = useState<'input' | 'processing' | 'editing'>('input');
  const [processingStage, setProcessingStage] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  
  // Study mode state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState(0);
  const [studyProgress, setStudyProgress] = useState(0);

  // 在 state 区域添加：
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  // 1. 添加用于flip的状态和样式
  const [autoFlip, setAutoFlip] = useState(false);
  const [autoFlipTime, setAutoFlipTime] = useState(10); // Default to 10 seconds
  const [autoFlipMenuOpen, setAutoFlipMenuOpen] = useState(false);
  const [spacedRepetition, setSpacedRepetition] = useState(true);
  const [hideMasteredCards, setHideMasteredCards] = useState(false);
  const [cardStatus, setCardStatus] = useState<('new'|'again'|'hard'|'good'|'easy')[]>([]); // 用于标记每张卡片的状态

  // 在组件顶部state区后添加：
  const autoFlipTimer = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimer = useRef<NodeJS.Timeout | null>(null);

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setFileError("File size exceeds 50MB limit.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileError("");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setFileError("File size exceeds 50MB limit.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Text input handler
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    if (value.length > 10000) {
      setTextError("Text exceeds 10,000 character limit.");
    } else {
      setTextError("");
    }
  };

  // Sample click handler
  const handleSampleClick = (sample: { title: string; desc: string }) => {
    setInputTab('text');
    setInputText(`${sample.title}: ${sample.desc}\n\nThis is a sample input for ${sample.title}.`);
    setTextError("");
    setSourceFileName(`${sample.title} Notes.${sample.title === 'Biology' ? 'pdf' : sample.title === 'History' ? 'docx' : sample.title === 'Physics' ? 'pptx' : 'txt'}`);
    setValidationError("");
    setIsGenerating(true);
    setShowProcessingModal(true);
    setProgress(0);
    setProcessingStage("Creating high-quality flashcards from your material...");
    const stages = [
      "Analyzing content structure...",
      "Identifying key concepts...",
      "Generating question-answer pairs...",
      "Optimizing for learning efficiency...",
      "Finalizing flashcards..."
    ];
    let currentStage = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (1 + Math.random() * 2);
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setShowProcessingModal(false);
            setActiveSection('editing');
            setActiveTab('edit');
            setIsGenerating(false);
            setTimeout(() => {
              document.getElementById('editing-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          }, 500);
          return 100;
        }
        if (newProgress > (currentStage + 1) * 20 && currentStage < stages.length - 1) {
          currentStage++;
          setProcessingStage(stages[currentStage]);
        }
        return newProgress;
      });
    }, 100);
    setTimeout(() => {
      setCards(sampleFlashcards[sample.title as keyof typeof sampleFlashcards]);
    }, 2000);
  };

  // Generate flashcards handler
  const handleGenerateFlashcards = async () => {
    setValidationError("");
    if (inputTab === 'upload' && !selectedFile) {
      setValidationError("Please upload a file before generating flashcards.");
      return;
    }
    if (inputTab === 'text' && (!inputText || inputText.trim().length < 10)) {
      setValidationError("Please enter at least 10 characters of text before generating flashcards.");
      return;
    }
    
    setIsGenerating(true);
    if (inputTab === 'upload' && selectedFile) {
      setSourceFileName(selectedFile.name);
    } else {
      setSourceFileName("Text Input");
    }
    
    setShowProcessingModal(true);
    setProgress(0);
    setProcessingStage("Creating flashcards from your material...");
    
    // 设置处理阶段和进度模拟
    const stages = [
      "Analyzing content structure...",
      "Identifying key concepts...",
      "Generating question-answer pairs...",
      "Optimizing for learning efficiency...",
      "Finalizing flashcards..."
    ];
    
    let currentStage = 0;
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (1 + Math.random() * 2);
        // 进度最多到99%，直到API响应
        if (newProgress >= 99) {
          clearInterval(progressInterval);
          setProgress(99);
          setProcessingStage("Almost there, finalizing your flashcards...");
          return 99;
        }
        
        if (newProgress > (currentStage + 1) * 20 && currentStage < stages.length - 1) {
          currentStage++;
          setProcessingStage(stages[currentStage]);
        }
        return newProgress;
      });
    }, 100);
    
    try {
      // 设置来源类型
      const sourceType = inputTab === 'upload' ? 'file' : 'text';
      
      // 准备API请求参数
      const requestData: Body_generate_flashcards_api_ainee_web_flashcards_generate_post = {
        flashcard_count: flashcardCount,
        language: language,
        source_type: sourceType,
        source_name: sourceType === 'file' ? (selectedFile?.name || 'File Upload') : 'Text Input',
        other_requirements: otherRequirements || '',
        input_content: sourceType === 'text' ? inputText : '',
        // @ts-expect-error, as we are not using file in the request
        file: sourceType === 'file' ? selectedFile : undefined
      };
      
      console.log("API Request parameters:", {
        ...requestData,
        file: selectedFile ? "File attached" : "No file",
      });
      
      // 调用API生成闪卡
      const response = await ApiLibs.aineeWeb.generateFlashcardsApiAineeWebFlashcardsGeneratePost(requestData);
      
      console.log("API Response:", response);
      
      // 如果API调用成功并返回了闪卡数据
      if (response && response.data && response.data.success && response.data.flashcards) {
        // 设置返回的闪卡数据
        setCards(response.data.flashcards);
        
        // 完成进度条并跳转到编辑区域
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setShowProcessingModal(false);
          setActiveSection('editing');
          setActiveTab('edit');
          setIsGenerating(false);
          setTimeout(() => {
            document.getElementById('editing-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
        }, 500);
      } else {
        // 如果没有返回闪卡数据，显示错误信息
        const errorMessage = response?.data?.error || 'Failed to generate flashcards. Please try again.';
        setValidationError(errorMessage);
        clearInterval(progressInterval);
        setShowProcessingModal(false);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      setValidationError("An error occurred while generating flashcards. Please try again.");
      clearInterval(progressInterval);
      setShowProcessingModal(false);
      setIsGenerating(false);
    }
  };

  // Handle tab switching in editing section
  const handleTabSwitch = (tab: 'edit' | 'study' | 'export') => {
    setActiveTab(tab);
    
    // Reset study mode when switching to study tab
    if (tab === 'study') {
      resetStudyMode();
    }
  };

  // Add a new flashcard
  const handleAddCard = () => {
    const newCard = {
      front: "New Question",
      back: "New Answer"
    };
    
    const updatedFlashcards = [...cards, newCard];
    setCards(updatedFlashcards);
  };
  
  // Shuffle flashcards
  const handleShuffleCards = () => {
    const shuffled = [...cards];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
  };
  
  // Study mode functions
  const resetStudyMode = () => {
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setStudiedCards(0);
    updateStudyProgress(0);
  };
  
  const handleFlipCard = useCallback(() => {
    setIsCardFlipped(!isCardFlipped);
  }, [isCardFlipped]);
  
  const handlePrevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsCardFlipped(false);
    }
  }, [currentCardIndex]);
  
  const updateStudyProgress = useCallback((studied: number) => {
    const progress = cards.length > 0 ? (studied / cards.length) * 100 : 0;
    setStudyProgress(progress);
  }, [cards.length]);
  
  const handleNextCard = useCallback(() => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsCardFlipped(false);
      
      // Update studied cards if this is a new card
      if (currentCardIndex + 1 >= studiedCards) {
        const newStudiedCount = currentCardIndex + 2; // +2 because we're moving to the next card (0-indexed to 1-indexed)
        setStudiedCards(newStudiedCount);
        updateStudyProgress(newStudiedCount);
      }
    }
  }, [currentCardIndex, cards.length, studiedCards, updateStudyProgress]);
  
  const handleCardDifficulty = (difficulty: 'again'|'hard'|'good'|'easy') => {
    // 更新卡片标记
    const updatedCards = [...cards];
    updatedCards[currentCardIndex].lastResult = difficulty;
    setCards(updatedCards);

    // 更新cardStatus状态
    const updatedStatus = [...cardStatus];
    updatedStatus[currentCardIndex] = difficulty;
    setCardStatus(updatedStatus);
    
    setIsCardFlipped(false);
    // 统计已复习卡片数
    const reviewed = updatedStatus.filter(s => s !== 'new').length;
    setStudiedCards(reviewed);
    // 跳到下一个未被hide的卡片
    let nextIndex = currentCardIndex + 1;
    while (nextIndex < cards.length && (hideMasteredCards && updatedStatus[nextIndex] === 'easy')) {
      nextIndex++;
    }
    if (nextIndex >= cards.length) {
      // 如果到头，回到第一个未被hide的卡片
      nextIndex = 0;
      while (nextIndex < cards.length && (hideMasteredCards && updatedStatus[nextIndex] === 'easy')) {
        nextIndex++;
      }
      if (nextIndex >= cards.length) {
        // 全部卡片都被hide
        setCurrentCardIndex(0);
        return;
      }
    }
    setCurrentCardIndex(nextIndex);
  };
  
  // Keyboard event handler for study mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSection === 'editing' && activeTab === 'study') {
        if (e.code === 'Space') {
          e.preventDefault();
          handleFlipCard();
        } else if (e.code === 'ArrowLeft') {
          handlePrevCard();
        } else if (e.code === 'ArrowRight') {
          handleNextCard();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSection, activeTab, currentCardIndex, isCardFlipped, studiedCards, handleFlipCard, handleNextCard, handlePrevCard]);

  // Return to input section
  const handleStartOver = () => {
    setActiveSection('input');
    setSelectedFile(null);
    setInputText("");
    setCards([]);
    setProgress(0);
  };

  useEffect(() => {
    // Progress bar animation
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);
    // Card fade-in animation
    setShowCard1(false);
    setShowCard2(false);
    setShowCard3(false);
    const t1 = setTimeout(() => setShowCard1(true), 500);
    const t2 = setTimeout(() => setShowCard2(true), 1000);
    const t3 = setTimeout(() => setShowCard3(true), 1500);
    return () => {
      clearInterval(progressInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Toggle FAQ accordion
  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Start auto-flip timer when needed
  useEffect(() => {
    // 仅在Study Mode激活且autoFlip为true时生效
    if (activeTab === 'study' && autoFlip && cards.length > 0) {
      // 只在正面时启动定时器
      if (!isCardFlipped) {
        if (autoFlipTimer.current) clearTimeout(autoFlipTimer.current);
        if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
        
        // Set new timeout based on autoFlipTime
        autoFlipTimer.current = setTimeout(() => {
          setIsCardFlipped(true); // 翻到背面
          // 翻到背面后2秒自动到下一张
          autoNextTimer.current = setTimeout(() => {
            if (currentCardIndex < cards.length - 1) {
              setCurrentCardIndex(idx => idx + 1);
              setIsCardFlipped(false);
            }
          }, 2000);
        }, autoFlipTime * 1000);
      } else {
        // 如果已经是背面，2秒后自动到下一张
        if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
        autoNextTimer.current = setTimeout(() => {
          if (currentCardIndex < cards.length - 1) {
            setCurrentCardIndex(idx => idx + 1);
            setIsCardFlipped(false);
          }
        }, 2000);
      }
    } else {
      // 取消勾选或切换tab时清除定时器
      if (autoFlipTimer.current) clearTimeout(autoFlipTimer.current);
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    }
    
    // 清理函数
    return () => {
      if (autoFlipTimer.current) clearTimeout(autoFlipTimer.current);
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    };
  }, [activeTab, autoFlip, isCardFlipped, currentCardIndex, cards.length, autoFlipTime]);

  useEffect(() => {
    if (activeTab === 'study' && cards.length > 0 && cardStatus.length !== cards.length) {
      setCardStatus(Array(cards.length).fill('new'));
    }
  }, [activeTab, cards.length]);

  // 统计进度
  const masteredCount = cardStatus.filter(s => s === 'easy').length;
  const learningCount = cardStatus.filter(s => s === 'again' || s === 'hard' || s === 'good').length;
  const notSeenCount = cardStatus.filter(s => s === 'new').length;
  const studiedCount = masteredCount + learningCount;

  // PDF导出处理函数
  const handleExportPDF = async () => {
    try {
      // 动态导入jsPDF和中文字体支持
      const { jsPDF } = await import('jspdf');
      // Import NotoSansSC font for Chinese support
      const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      // 添加中文字体支持
      doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
      doc.setFont('NotoSansSC');
      doc.setLanguage('zh-CN');
      
      // 添加标题
      doc.setFontSize(18);
      doc.text('Flashcards', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      
      let yPos = 30;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      
      // 遍历所有卡片
      cards.forEach((card, index) => {
        // 如果当前位置接近页底，添加新页
        if (yPos > 250) {
          doc.addPage();
          yPos = 30;
        }
        
        // 卡片编号
        doc.setFontSize(14);
        doc.text(`Card ${index + 1}`, margin, yPos);
        yPos += 10;
        
        // 问题（front）
        doc.setFontSize(12);
        doc.text('Question:', margin, yPos);
        yPos += 7;
        
        // 处理问题文本自动换行
        const frontLines = doc.splitTextToSize(card.front, contentWidth);
        doc.text(frontLines, margin, yPos);
        yPos += frontLines.length * 7;
        
        // 答案（back）
        doc.text('Answer:', margin, yPos);
        yPos += 7;
        
        // 处理答案文本自动换行
        const backLines = doc.splitTextToSize(card.back, contentWidth);
        doc.text(backLines, margin, yPos);
        yPos += backLines.length * 7 + 10;
        
        // 添加分隔线
        if (index < cards.length - 1) {
          doc.setDrawColor(200, 200, 200);
          doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
          yPos += 10;
        }
      });
      
      // 保存PDF，使用UTF-8编码
      doc.save('flashcards.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // CSV导出处理函数
  const handleExportCSV = () => {
    try {
      // 创建CSV内容
      let csvContent = "Question,Answer\n"; // CSV表头
      
      // 添加每张卡片的内容
      cards.forEach(card => {
        // 处理CSV中的特殊字符，将双引号替换为两个双引号，并用双引号包围内容
        const front = `"${card.front.replace(/"/g, '""')}"`;
        const back = `"${card.back.replace(/"/g, '""')}"`;
        csvContent += `${front},${back}\n`;
      });
      
      // 创建Blob对象并下载
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'flashcards.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV. Please try again.');
    }
  };

  // Anki导出处理函数
  const handleExportAnki = () => {
    try {
      // 创建Anki格式内容（与CSV类似，但使用制表符分隔）
      let ankiContent = "";
      
      // 添加每张卡片的内容，使用制表符分隔问题和答案
      cards.forEach(card => {
        ankiContent += `${card.front}\t${card.back}\n`;
      });
      
      // 创建Blob对象并下载
      const blob = new Blob([ankiContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'flashcards_anki.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 显示Anki导入提示
      alert('For Anki import: Download the file, then in Anki select File > Import > and select this file. Make sure to select "Fields separated by: Tab" in the import dialog.');
    } catch (error) {
      console.error('Error generating Anki file:', error);
      alert('Failed to generate Anki file. Please try again.');
    }
  };

  // Markdown导出处理函数
  const handleExportMarkdown = () => {
    try {
      // 创建Markdown内容
      let mdContent = "# Flashcards\n\n";
      
      // 添加每张卡片的内容
      cards.forEach((card, index) => {
        mdContent += `## Card ${index + 1}\n\n`;
        mdContent += `### Question\n\n${card.front}\n\n`;
        mdContent += `### Answer\n\n${card.back}\n\n`;
        mdContent += "---\n\n";
      });
      
      // 创建Blob对象并下载
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'flashcards.md');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating Markdown:', error);
      alert('Failed to generate Markdown. Please try again.');
    }
  };

  // TXT导出处理函数
  const handleExportTXT = () => {
    try {
      // 创建TXT内容
      let txtContent = "FLASHCARDS\n\n";
      
      // 添加每张卡片的内容
      cards.forEach((card, index) => {
        txtContent += `CARD ${index + 1}\n`;
        txtContent += `Question: ${card.front}\n`;
        txtContent += `Answer: ${card.back}\n`;
        txtContent += "------------------------------\n\n";
      });
      
      // 创建Blob对象并下载
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'flashcards.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating TXT:', error);
      alert('Failed to generate TXT. Please try again.');
    }
  };

  // Add an effect to handle clicks outside the dropdown
  useEffect(() => {
    if (autoFlipMenuOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setAutoFlipMenuOpen(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [autoFlipMenuOpen]);

  // Create a ref for the dropdown menu
  const dropdownRef = useRef<HTMLDivElement>(null);

  return (
    <>
    <style jsx global>{`
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .shimmer {
        animation: shimmer 2s infinite;
      }

      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      .perspective {
        perspective: 1000px;
      }

      .transform-style-3d {
        transform-style: preserve-3d;
      }

      .backface-hidden {
        backface-visibility: hidden;
      }

      .rotate-y-180 {
        transform: rotateY(180deg);
      }

      .transition-transform {
        transition-property: transform;
      }

      .duration-700 {
        transition-duration: 700ms;
      }

      .hover\\:rotate-y-180:hover {
        transform: rotateY(180deg);
      }

      .flashcard-demo {
        perspective: 1000px;
      }

      .flashcard-inner-demo {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s;
        transform-style: preserve-3d;
      }

      .flashcard-demo:hover .flashcard-inner-demo {
        transform: rotateY(180deg);
      }

      .flashcard-front-demo, .flashcard-back-demo {
        position: absolute;
        width: 100%;
        height: 100%;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
      }

      .flashcard-back-demo {
        transform: rotateY(180deg);
      }
    `}</style>
    <section className="pt-16 pb-16 px-4 sm:px-6 lg:px-8 gradient-bg relative overflow-hidden">
      {/* Background with styling */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4D4DFF]/5 via-[#69DA00]/5 to-[#50E3C2]/5 backdrop-blur-sm overflow-hidden">
        {/* Enhanced grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        {/* Animated gradient orbs */}
        <div className="absolute -left-1/2 top-0 w-[200%] h-[200%] bg-[radial-gradient(circle_800px_at_100%_200px,rgba(77,77,255,0.08),transparent)] pointer-events-none"></div>
        <div className="absolute right-0 top-1/4 w-[50%] h-[50%] bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.06),transparent)] pointer-events-none"></div>
        {/* Central glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl opacity-10 aspect-square h-96 rounded-full bg-gradient-to-br from-[#4D4DFF] via-[#69DA00] to-[#50E3C2]"></div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center">
          {/* Left: Text Content */}
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-gray-900">
              Create Better Flashcards in Seconds with AI
            </h1>
            <p className="text-xl mb-8 text-gray-700">
              Transform any study material into effective flashcards instantly. Upload PDFs, words, notes, powerpoints, or text and let our advanced AI do the work.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <a href="#generate-flashcards" className="bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white px-6 py-3 rounded-lg font-semibold text-center hover:opacity-90 transition">
                Create Free Flashcards
              </a>
              <a href="#features" className="bg-white border-2 border-[#4D4DFF] text-[#4D4DFF] px-6 py-3 rounded-lg font-semibold text-center hover:bg-gray-50 transition">
               Learn More
              </a>
            </div>
          </div>
          {/* Right: Animated Card Demo */}
          <div className="md:w-1/2">
            <div className="relative bg-white p-6 rounded-xl shadow-2xl animate-float">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-lg">
                    <span className="text-indigo-600 text-xl">📄</span>
                  </div>
                  <div className="flex-1">
                    <span className="animate-typing text-sm text-gray-700 block max-w-[180px]">Cell_Biology_Chapter5.pdf</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="border-t border-b border-gray-200 py-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-gray-700">Processing content...</span>
                    <span className="text-xs text-indigo-600 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
                {/* Flashcards Demo */}
                <div className="grid grid-cols-1 gap-4">
                  <div className={`bg-gray-100 p-4 rounded-lg transition-opacity duration-700 ${showCard1 ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-700">What is the primary function of mitochondria?</div>
                      <div className="text-xs text-indigo-600 font-medium">Card 1/28</div>
                    </div>
                  </div>
                  <div className={`bg-gray-100 p-4 rounded-lg transition-opacity duration-700 ${showCard2 ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-700">Explain the process of cellular respiration</div>
                      <div className="text-xs text-indigo-600 font-medium">Card 2/28</div>
                    </div>
                  </div>
                  <div className={`bg-indigo-100 p-4 rounded-lg border-2 border-indigo-300 transition-opacity duration-700 ${showCard3 ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-indigo-800">List the 3 phases of the cell cycle</div>
                      <div className="text-xs text-indigo-600 font-medium">Card 3/28</div>
                    </div>
                  </div>
                </div>
                <div className={`flex justify-between items-center animate-fade-in-up`} style={{ animationDelay: '2s', animationFillMode: 'forwards' }}>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    {/* Generation Section - Input Part */}
    <section id="generate-flashcards" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2 text-gray-900">AI Flashcard Maker</h2>
          <p className="text-lg text-gray-600">Upload your study material or paste text to generate flashcards</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Upload / Text Tabs */}
          <div className="bg-gray-50 p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Upload Files or Paste Text</h3>
            <div className="flex mb-4">
              <button
                className={`px-4 py-2 border rounded-tl-lg rounded-bl-lg text-sm font-medium focus:outline-none ${inputTab === 'upload' ? 'bg-white border-gray-300 border-b-0' : 'bg-gray-100 border-gray-200'}`}
                onClick={() => setInputTab('upload')}
                type="button"
              >
                Upload
              </button>
              <button
                className={`px-4 py-2 border rounded-tr-lg rounded-br-lg text-sm font-medium focus:outline-none -ml-px ${inputTab === 'text' ? 'bg-white border-gray-300 border-b-0' : 'bg-gray-100 border-gray-200'}`}
                onClick={() => setInputTab('text')}
                type="button"
              >
                Text
              </button>
            </div>
            {/* Upload Tab */}
            {inputTab === 'upload' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4 relative" style={{ minHeight: 220 }}>
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  multiple={false}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  onChange={handleFileChange}
                />
                <div
                  className="flex flex-col items-center justify-center h-full cursor-pointer"
                  onClick={() => document.getElementById('fileInput')?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  style={{ minHeight: 120 }}
                >
                  <div className="mb-2">
                    <svg className="mx-auto" width="40" height="40" fill="none" viewBox="0 0 24 24"><path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="#A0AEC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="5" rx="2" fill="#F7FAFC" stroke="#A0AEC0" strokeWidth="2"/></svg>
                  </div>
                  <p className="mb-2 text-gray-700">Drag & drop files here</p>
                  <p className="text-gray-500 text-sm mb-2">or</p>
                  <span className="inline-block mt-1 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm border border-indigo-100">Browse files</span>
                  <p className="text-xs text-gray-400 mt-3">Supported:PDF,Word,PowerPoint,Excel,Markdown,Text,HTML.<br/>Max 50MB.</p>
                </div>
                {fileError && <div className="text-red-500 text-xs mt-2">{fileError}</div>}
                {selectedFile && (
                  <div className="mt-4 text-left">
                    <div className="font-medium text-gray-800">Selected File:</div>
                    <div className="text-sm text-gray-600">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</div>
                  </div>
                )}
              </div>
            )}
            {/* Text Tab */}
            {inputTab === 'text' && (
              <div className="mb-4">
                <textarea
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                  style={{ minHeight: '220px' }}
                  maxLength={10000}
                  placeholder="Paste or type up to 10,000 characters of text here."
                  value={inputText}
                  onChange={handleTextChange}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{inputText.length}/10000</span>
                  {textError && <span className="text-red-500">{textError}</span>}
                </div>
              </div>
            )}
          </div>
          {/* Customize Flashcards */}
          <div className="bg-gray-50 p-6 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Customize Flashcards</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Flashcards</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={flashcardCount}
                onChange={e => setFlashcardCount(Number(e.target.value))}
              >
                {[5,10,15,20,25,30,35,40,45,50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Other requirements <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                style={{ minHeight: '120px' }}
                maxLength={500}
                placeholder="E.g. Focus on key concepts, use simple language, generate Q&A pairs only, etc. (max 500 characters)"
                value={otherRequirements}
                onChange={e => setOtherRequirements(e.target.value)}
              />
              <div className="flex justify-end text-xs text-gray-500 mt-1">{otherRequirements.length}/500</div>
            </div>
          </div>
        </div>
        {/* Quick Sample Cases */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="flex items-center flex-wrap">
            <span className="text-gray-500 text-sm mr-3 mb-2">Quick Examples:</span>
            {sampleCases.map((sample, idx) => (
              <button
                key={sample.title}
                className="mr-4 mb-2 text-gray-500 text-sm hover:text-gray-700 transition-colors focus:outline-none group"
                onClick={() => handleSampleClick(sample)}
                type="button"
              >
                <span className="border-b border-gray-300 group-hover:border-gray-500 pb-0.5">
                  {sample.title}: {sample.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Validation Error Message */}
        {validationError && (
          <div className="text-center mb-4">
            <p className="text-red-500 text-sm">{validationError}</p>
          </div>
        )}
        
        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            className="px-8 py-3 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white rounded-lg font-semibold text-center hover:opacity-90 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGenerateFlashcards}
            disabled={isGenerating}
            type="button"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              'Generate Flashcards'
            )}
          </button>
        </div>
      </div>
    </section>
    
    {/* Processing Modal 全局弹层 */}
    {showProcessingModal && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full mb-4">
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M20 12a8 8 0 1 0-8 8"></path>
                <path d="M15.43 15.43a4 4 0 1 0-5.657-5.657"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">AI is analyzing your content</h2>
            <p className="text-gray-600">{processingStage}</p>
          </div>
          <div className="mb-8">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">{Math.round(progress)}%</div>
          </div>
          <div className="text-gray-600 italic text-sm">
            This usually takes 10-30 seconds depending on content length
          </div>
        </div>
      </div>
    )}
    
    {/* Generation Section - Output Part: Editing */}
    {activeSection === 'editing' && (
      <section id="editing-section" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Flashcards <span className="text-gray-500">({cards.length})</span></h2>
              <div className="text-gray-600">{sourceFileName}</div>
            </div>

            <div className="flex border-b border-gray-200 mb-6">
              <button 
                className={`mr-8 text-lg font-medium pb-2 ${activeTab === 'edit' ? 'text-[#4D4DFF] border-b-2 border-[#4D4DFF]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => handleTabSwitch('edit')}
              >
                Edit Flashcards
              </button>
              <button 
                className={`mr-8 text-lg font-medium pb-2 ${activeTab === 'study' ? 'text-[#4D4DFF] border-b-2 border-[#4D4DFF]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => handleTabSwitch('study')}
              >
                Study Mode
              </button>
              <button 
                className={`text-lg font-medium pb-2 ${activeTab === 'export' ? 'text-[#4D4DFF] border-b-2 border-[#4D4DFF]' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => handleTabSwitch('export')}
              >
                Export
              </button>
            </div>
          </div>

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <button 
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition mr-3"
                    onClick={handleAddCard}
                  >
                    <svg className="w-4 h-4 inline mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Card
                  </button>
                  <button 
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                    onClick={handleShuffleCards}
                  >
                    <svg className="w-4 h-4 inline mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8"></polyline>
                      <line x1="4" y1="20" x2="21" y2="3"></line>
                      <polyline points="21 16 21 21 16 21"></polyline>
                      <line x1="15" y1="15" x2="21" y2="21"></line>
                      <line x1="4" y1="4" x2="9" y2="9"></line>
                    </svg>
                    Shuffle
                  </button>
                </div>
                <div className="text-gray-600 text-sm">
                  <span>Click on any text to edit</span>
                </div>
              </div>

              <div className="space-y-6">
                {cards.map((card, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-gray-500">Card {index + 1}</div>
                      <div className="flex space-x-2">
                        <button className="text-gray-400 hover:text-gray-600" onClick={() => {
                          const newCard = { front: "New Question", back: "New Answer" };
                          const updatedFlashcards = [...cards];
                          updatedFlashcards.splice(index + 1, 0, newCard);
                          setCards(updatedFlashcards);
                          setTimeout(() => {
                            const cardElements = document.querySelectorAll('.bg-white.p-6.rounded-xl.shadow-sm.border');
                            if (cardElements[index + 1]) {
                              cardElements[index + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                              // 自动聚焦到新卡片的front内容区
                              const editable = cardElements[index + 1].querySelector('[contenteditable]');
                              if (editable) {
                                (editable as HTMLElement).focus();
                                // 选中全部内容
                                const range = document.createRange();
                                range.selectNodeContents(editable);
                                const sel = window.getSelection();
                                if (sel) {
                                  sel.removeAllRanges();
                                  sel.addRange(range);
                                }
                              }
                            }
                          }, 100);
                        }}>
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"></path>
                          </svg>
                        </button>
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            const updatedFlashcards = [...cards];
                            updatedFlashcards.splice(index, 1);
                            setCards(updatedFlashcards);
                          }}
                        >
                          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <div 
                        className="text-lg font-medium text-gray-900 focus:outline-none" 
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          const updatedFlashcards = [...cards];
                          updatedFlashcards[index].front = e.currentTarget.textContent || "";
                          setCards(updatedFlashcards);
                        }}
                      >
                        {card.front}
                      </div>
                    </div>
                    <div>
                      <div 
                        className="text-gray-700 focus:outline-none" 
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          const updatedFlashcards = [...cards];
                          updatedFlashcards[index].back = e.currentTarget.textContent || "";
                          setCards(updatedFlashcards);
                        }}
                      >
                        {card.back}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Tab */}
          {activeTab === 'study' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div className="md:col-span-3">
                  {/* Flip Card with animation */}
                  <div 
                    className={`relative bg-white p-0 rounded-xl shadow-lg border border-gray-100 aspect-video flex items-center justify-center cursor-pointer hover:shadow-xl transition perspective`}
                    style={{ perspective: '1000px' }}
                    onClick={() => setIsCardFlipped(f => !f)}
                  >
                    <div
                      className={`w-full h-full transition-transform duration-700 transform-style-3d ${isCardFlipped ? 'rotate-y-180' : ''}`}
                      style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.7s' }}
                    >
                      {/* Front */}
                      <div
                        className="absolute inset-0 flex items-center justify-center backface-hidden bg-white rounded-xl shadow-lg p-6"
                        style={{ backfaceVisibility: 'hidden', zIndex: 2 }}
                      >
                        <div className="w-full text-center">
                          {cards.length > 0 ? (
                            <div className="text-2xl font-medium mb-2">{cards[currentCardIndex].front}</div>
                          ) : (
                            <>
                              <div className="text-2xl font-medium mb-2">Click to start studying</div>
                              <div className="text-gray-500">Card front will appear here</div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Back */}
                      <div
                        className="absolute inset-0 flex items-center justify-center backface-hidden bg-indigo-50 rounded-xl shadow-lg p-6 rotate-y-180"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', zIndex: 1 }}
                      >
                        {/* 右上角显示上次标记结果 */}
                        {cards.length > 0 && cards[currentCardIndex].lastResult && (
                          <div className="absolute top-2 right-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${
                              cards[currentCardIndex].lastResult === 'again' ? 'bg-gray-200 text-gray-700' :
                              cards[currentCardIndex].lastResult === 'hard' ? 'bg-red-100 text-red-700' :
                              cards[currentCardIndex].lastResult === 'good' ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {cards[currentCardIndex].lastResult.charAt(0).toUpperCase() + cards[currentCardIndex].lastResult.slice(1)}
                            </span>
                          </div>
                        )}
                        <div className="w-full text-center overflow-y-auto" style={{ maxHeight: '60vh' }}>
                          {cards.length > 0 ? (
                            <div className="text-xl text-gray-700 whitespace-pre-line">{cards[currentCardIndex].back}</div>
                          ) : (
                            <>
                              <div className="text-2xl font-medium mb-2">Answer will appear here</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 控制区：Previous最左，Next最右，中间根据卡片面显示不同内容 */}
                  <div className="flex items-center justify-between mt-6 w-full">
                    <button 
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={handlePrevCard}
                      disabled={currentCardIndex === 0 || cards.length === 0}
                    >
                      <svg className="w-4 h-4 inline mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"></path>
                      </svg>
                      Previous
                    </button>
                    
                    {/* 根据卡片面显示不同内容 */}
                    {isCardFlipped ? (
                      // 在答案面显示操作按钮
                      <div className="flex justify-center gap-3">
                        <button className="bg-gray-200 text-gray-700 py-1 px-3 rounded text-sm font-medium" onClick={() => handleCardDifficulty('again')}>Again</button>
                        <button className="bg-red-100 text-red-700 py-1 px-3 rounded text-sm font-medium" onClick={() => handleCardDifficulty('hard')}>Hard</button>
                        <button className="bg-yellow-100 text-yellow-700 py-1 px-3 rounded text-sm font-medium" onClick={() => handleCardDifficulty('good')}>Good</button>
                        <button className="bg-green-100 text-green-700 py-1 px-3 rounded text-sm font-medium" onClick={() => handleCardDifficulty('easy')}>Easy</button>
                      </div>
                    ) : (
                      // 在问题面显示计数器
                      <div className="text-center">
                        <span className="font-semibold">{cards.length > 0 ? currentCardIndex + 1 : 0}</span>
                        <span className="mx-1">/</span>
                        <span>{cards.length}</span>
                      </div>
                    )}
                    
                    <button 
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      onClick={handleNextCard}
                      disabled={currentCardIndex === cards.length - 1 || cards.length === 0}
                    >
                      Next
                      <svg className="w-4 h-4 inline ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Progress</h3>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-500 text-sm">Cards studied</span>
                      <span className="text-black font-semibold text-sm">{studiedCount} / {cards.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-4">
                      <div className="bg-[#2563eb] h-2 rounded-full transition-all duration-300" style={{ width: `${cards.length ? (studiedCount / cards.length) * 100 : 0}%` }}></div>
                    </div>
                    <div className="grid grid-cols-3 text-center mt-4">
                      <div>
                        <div className="text-lg font-bold">{masteredCount}</div>
                        <div className="text-gray-500 text-xs mt-1">Mastered</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{learningCount}</div>
                        <div className="text-gray-500 text-xs mt-1">Learning</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{notSeenCount}</div>
                        <div className="text-gray-500 text-xs mt-1">Not Seen</div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mt-6 mb-4">Study Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center relative">
                        <div 
                          className={`w-5 h-5 border border-gray-300 rounded flex items-center justify-center cursor-pointer ${autoFlip ? 'bg-[#4D4DFF]' : 'bg-white'}`}
                          onClick={() => setAutoFlip(v => !v)}
                        >
                          {autoFlip && (
                            <svg className="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span className="ml-2 text-sm">Auto-flip after</span>
                        <div className="relative ml-1" ref={dropdownRef}>
                          <button 
                            className={`text-sm px-2 rounded flex items-center ${autoFlip ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-700'}`}
                            onClick={() => setAutoFlipMenuOpen(!autoFlipMenuOpen)}
                          >
                            {autoFlipTime}s
                            <svg className="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                          
                          {autoFlipMenuOpen && (
                            <div className="absolute top-full left-0 bg-white shadow-md rounded-md z-50 w-16">
                              {[5, 10, 15, 20, 25, 30].map(time => (
                                <div 
                                  key={time}
                                  className={`py-1 px-2 hover:bg-gray-100 cursor-pointer ${autoFlipTime === time ? 'bg-blue-400 text-white' : ''}`}
                                  onClick={() => {
                                    setAutoFlipTime(time);
                                    setAutoFlipMenuOpen(false);
                                    // Enable auto-flip when selecting a time
                                    if (!autoFlip) {
                                      setAutoFlip(true);
                                    }
                                  }}
                                >
                                  {time}s
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center cursor-pointer" onClick={() => setHideMasteredCards(v => !v)}>
                        <div className={`w-5 h-5 border border-gray-300 rounded flex items-center justify-center ${hideMasteredCards ? 'bg-[#4D4DFF]' : 'bg-white'}`}>
                          {hideMasteredCards && (
                            <svg className="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span className="ml-2 text-sm">Hide mastered cards</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-gray-600 text-sm">
                <span className="mr-2">⌨️</span>Keyboard shortcuts: Press <kbd className="px-2 py-1 bg-white rounded border text-xs">Space</kbd> to flip card, <kbd className="px-2 py-1 bg-white rounded border text-xs">←</kbd> previous, <kbd className="px-2 py-1 bg-white rounded border text-xs">→</kbd> next
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-xl font-semibold mb-4">Export Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div 
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4D4DFF] transition cursor-pointer"
                    onClick={handleExportPDF}
                  >
                    <div className="flex items-center mb-3">
                      <svg className="w-8 h-8 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3v4a1 1 0 001 1h4"></path>
                        <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"></path>
                        <path d="M9 12h6"></path>
                        <path d="M9 16h6"></path>
                      </svg>
                      <h4 className="font-medium">PDF</h4>
                    </div>
                    <p className="text-sm text-gray-600">Export as PDF document for printing or offline viewing</p>
                  </div>
                  <div 
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4D4DFF] transition cursor-pointer"
                    onClick={handleExportCSV}
                  >
                    <div className="flex items-center mb-3">
                      <svg className="w-8 h-8 text-green-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3v4a1 1 0 001 1h4"></path>
                        <path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"></path>
                        <line x1="7" y1="12" x2="17" y2="12"></line>
                        <line x1="7" y1="16" x2="17" y2="16"></line>
                      </svg>
                      <h4 className="font-medium">CSV</h4>
                    </div>
                    <p className="text-sm text-gray-600">Export as CSV for importing into spreadsheets</p>
                  </div>
                  <div 
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4D4DFF] transition cursor-pointer"
                    onClick={handleExportAnki}
                  >
                    <div className="flex items-center mb-3">
                      <svg className="w-8 h-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                      <h4 className="font-medium">Anki</h4>
                    </div>
                    <p className="text-sm text-gray-600">Export for Anki app with all formatting preserved</p>
                  </div>
                  <div 
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4D4DFF] transition cursor-pointer"
                    onClick={handleExportMarkdown}
                  >
                    <div className="flex items-center mb-3">
                      <svg className="w-8 h-8 text-purple-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
                        <path d="M18 6L9 18 2 12"></path>
                      </svg>
                      <h4 className="font-medium">Markdown</h4>
                    </div>
                    <p className="text-sm text-gray-600">Export as Markdown format for easy reading on GitHub and documentation</p>
                  </div>
                  <div 
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#4D4DFF] transition cursor-pointer"
                    onClick={handleExportTXT}
                  >
                    <div className="flex items-center mb-3">
                      <svg className="w-8 h-8 text-gray-500 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <h4 className="font-medium">Text</h4>
                    </div>
                    <p className="text-sm text-gray-600">Export as plain text file compatible with any text editor</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    )}

    {/* Features Section */}
    <section id="features" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Powerful AI Flashcard Features</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Our AI-powered flashcard maker transforms how you create, organize, and study with flashcards.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.842 19.917a6.002 6.002 0 0 1-8.128-8.128M12 12l4.596 4.596a6 6 0 1 0 0-8.485L12 12zm0 0L7.404 7.404a6 6 0 1 1 0 8.485L12 12zm0 0l4.596-4.596a6 6 0 1 0-8.485 0L12 12z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered Generation</h3>
            <p className="text-gray-600">Upload any PDF, image, video, or text and our AI automatically creates optimized flashcards in seconds, saving you hours of manual work.</p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart Learning Algorithm</h3>
            <p className="text-gray-600">Our adaptive spaced repetition system customizes review schedules based on your performance, helping you remember more in less time.</p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4"></path>
                <path d="M5 18h1.5a1.5 1.5 0 1 0 0-3H5v6"></path>
                <path d="M9 18h1.5a1.5 1.5 0 1 0 0-3H9v6"></path>
                <path d="M14 18a2 2 0 0 1 2 2v-4a2 2 0 1 0-4 0v4a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Multiple File Formats</h3>
            <p className="text-gray-600">Support for PDFs, PowerPoint, Word docs, images, videos, handwritten notes, and more. Perfect for any learning material you already have.</p>
          </div>
          
          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Easy Customization</h3>
            <p className="text-gray-600">Edit, refine, and personalize AI-generated flashcards to match your learning style and preferences with our intuitive editor.</p>
          </div>
          
          {/* Feature 5 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M1 8h22M8.5 15a3.5 3.5 0 0 1-7 0V8h7v7zM15.5 15a3.5 3.5 0 0 1-7 0V8h7v7zM22.5 15a3.5 3.5 0 0 1-7 0V8h7v7z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Study Anywhere</h3>
            <p className="text-gray-600">Access your flashcards on any device with our responsive web app and mobile versions. Perfect for studying on the go.</p>
          </div>
          
          {/* Feature 6 */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition duration-300 transform hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-5">
              <svg className="w-6 h-6 text-[#4D4DFF]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"></path>
                <path d="M18.4 9a9 9 0 0 0-5.5-5.5 9 9 0 0 0-11 11A9 9 0 0 0 15 20.5"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
            <p className="text-gray-600">Track your learning progress with detailed analytics and insights to optimize your study habits and improve retention.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Benefits Section */}
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Ainee vs. Traditional Flashcards</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">See how our AI flashcard maker revolutionizes studying compared to traditional methods and other platforms like Quizlet.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8"></path>
                  <rect x="2" y="2" width="20" height="8" rx="2"></rect>
                  <path d="M2 12h20"></path>
                  <path d="M2 18h20"></path>
                  <path d="M2 22h20"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">AI Flashcard Maker</h3>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Save hours of time</strong> - Generate complete flashcard sets in seconds instead of hours of manual creation</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Superior AI accuracy</strong> - More accurate and comprehensive cards than Quizlet, requiring fewer edits</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Personalized learning</strong> - Adaptive system focuses on your weak areas to maximize study efficiency</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Multi-format support</strong> - Create flashcards from virtually any study material format including videos</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Easy sharing and collaboration</strong> - Share decks with classmates and study together</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span><strong className="text-gray-800">Data-driven insights</strong> - Track study patterns and optimize your learning strategy</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-200">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-600">Traditional & Quizlet Flashcards</h3>
            </div>
            
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">Time-consuming creation</strong> - Hours spent manually writing cards and organizing content</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">Inconsistent AI quality</strong> - Many users find Quizlet's AI cards require significant editing</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">Static learning approach</strong> - Same review pattern regardless of your mastery level</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">Limited format options</strong> - Difficult to incorporate digital materials or create from PDFs</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">Sharing difficulties</strong> - Physical cards are hard to share, digital cards often lack good collaboration</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-1 mr-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span><strong className="text-gray-800">No performance tracking</strong> - Limited ability to analyze progress and identify weak areas</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-gray-700 font-medium mb-6">Still using Quizlet or other platforms? Try a better way to create and study flashcards.</p>
          <a href="#generate-flashcards" className="bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white px-6 py-3 rounded-lg font-semibold inline-block hover:opacity-90 transition shadow-md">
            Try AI Flashcard Maker Free
          </a>
        </div>
      </div>
    </section>

    {/* How It Works Section */}
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">Create and study with AI-powered flashcards in just a few simple steps.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 relative hover:shadow-lg transition duration-300">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">1</div>
            <h3 className="text-xl font-semibold mb-4 mt-2">Upload Your Material</h3>
            <p className="text-gray-600 mb-6">Simply upload your study material - PDF, image, notes, video, presentation, or even paste text directly.</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg py-8 px-4">
                <div className="text-center">
                  <svg className="mx-auto w-12 h-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p className="text-sm text-gray-500 mt-2">Drag & drop files here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, PPT, JPG, PNG, MP4 and more</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 relative hover:shadow-lg transition duration-300">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">2</div>
            <h3 className="text-xl font-semibold mb-4 mt-2">AI Creates Flashcards</h3>
            <p className="text-gray-600 mb-6">Our advanced AI analyzes your content and automatically generates high-quality question and answer pairs.</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col space-y-4 relative overflow-hidden">
                <div className="bg-white p-3 rounded shadow-sm animate-pulse">
                  <div className="h-2 bg-indigo-200 rounded-full w-3/4 mb-2"></div>
                  <div className="h-2 bg-indigo-100 rounded-full w-1/2"></div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm animate-pulse" style={{ animationDelay: "0.2s" }}>
                  <div className="h-2 bg-indigo-200 rounded-full w-2/3 mb-2"></div>
                  <div className="h-2 bg-indigo-100 rounded-full w-3/5"></div>
                </div>
                <div className="bg-white p-3 rounded shadow-sm animate-pulse" style={{ animationDelay: "0.4s" }}>
                  <div className="h-2 bg-indigo-200 rounded-full w-4/5 mb-2"></div>
                  <div className="h-2 bg-indigo-100 rounded-full w-2/5"></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4D4DFF]/10 to-transparent shimmer"></div>
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 relative hover:shadow-lg transition duration-300">
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">3</div>
            <h3 className="text-xl font-semibold mb-4 mt-2">Study & Master Content</h3>
            <p className="text-gray-600 mb-6">Review your flashcards with our spaced repetition system that adapts to your learning progress.</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flashcard-demo h-32 perspective">
                <div className="flashcard-inner-demo h-full w-full relative transform-style-3d transition-transform duration-700 hover:rotate-y-180">
                  <div className="flashcard-front-demo absolute inset-0 bg-white rounded-lg shadow-sm p-4 flex items-center justify-center backface-hidden">
                    <p className="text-center text-gray-800 font-medium">What is the primary benefit of AI flashcards?</p>
                  </div>
                  <div className="flashcard-back-demo absolute inset-0 bg-indigo-50 rounded-lg shadow-sm p-4 flex items-center justify-center backface-hidden rotate-y-180">
                    <p className="text-center text-indigo-800">Time-saving automation that creates high-quality content while adapting to your learning pace.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button className="text-xs bg-gray-200 px-3 py-1 rounded text-gray-700 hover:bg-gray-300 transition">Again</button>
                <button className="text-xs bg-yellow-100 px-3 py-1 rounded text-yellow-700 hover:bg-yellow-200 transition">Hard</button>
                <button className="text-xs bg-blue-100 px-3 py-1 rounded text-blue-700 hover:bg-blue-200 transition">Good</button>
                <button className="text-xs bg-green-100 px-3 py-1 rounded text-green-700 hover:bg-green-200 transition">Easy</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Testimonials Section */}
    <div className="w-full flex flex-col items-center justify-center py-20 bg-white/30 backdrop-blur-sm rounded-2xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center items-center gap-3 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">What Students Are Saying</h2>
          <p className="text-[#737373] mt-3 text-lg text-center max-w-xl">
            Join thousands of students who have transformed their study habits with AI-powered flashcards
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="text-yellow-400 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-gray-700 mb-4 italic">"I was struggling to keep up with my anatomy class until I found Ainee AI Flashcard Maker. It saved me hours of time by automatically generating cards from my lecture slides."</p>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex items-center justify-center text-white font-bold">JD</div>
              <div className="ml-3">
                <h4 className="font-semibold">Jessica D.</h4>
                <p className="text-sm text-gray-500">Medical Student</p>
              </div>
            </div>
          </div>
          
          {/* Testimonial 2 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="text-yellow-400 flex">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-gray-700 mb-4 italic">"The spaced repetition system helped me learn Spanish vocabulary three times faster than my old method. I love how it adapts to what I'm finding difficult."</p>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex items-center justify-center text-white font-bold">ML</div>
              <div className="ml-3">
                <h4 className="font-semibold">Michael L.</h4>
                <p className="text-sm text-gray-500">College Student</p>
              </div>
            </div>
          </div>
          
          {/* Testimonial 3 */}
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center mb-4">
              <div className="text-yellow-400 flex">
                {[...Array(4)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-700 mb-4 italic">"As a teacher, I've recommended Ainee to all my AP Biology students. It's simplified my workload by automatically generating high-quality study materials from our textbooks."</p>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] flex items-center justify-center text-white font-bold">ET</div>
              <div className="ml-3">
                <h4 className="font-semibold">Elizabeth T.</h4>
                <p className="text-sm text-gray-500">High School Teacher</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* FAQ Section */}
    <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm mt-20 rounded-2xl">
      <div className="flex flex-col justify-center items-center gap-3">
        <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-center">Frequently asked questions</h2>
        <p className="text-[#737373] mt-3 text-lg italic text-center">
          AI Flashcard Maker FAQ
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
              <span className="text-[#3E1953] font-semibold">Is Ainee AI Flashcard Maker really free to use?</span>
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
                <p>Yes, Ainee AI Flashcard Maker a free learning tool that makes creating flashcards easy. ✅100% Free ✅No Login ✅AI-Powered</p>
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
              <span className="text-[#3E1953] font-semibold">How accurate are the AI-generated flashcards?</span>
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
                <p>Our AI has been trained on millions of high-quality learning materials to ensure accuracy. In most cases, the flashcards are 90-95% accurate right out of the box. You can always review and edit any cards before studying. Our technology continually improves as more users create flashcards.</p>
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
              <span className="text-[#3E1953] font-semibold">How is Ainee AI Flashcard Maker different from Quizlet's AI flashcards?</span>
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
                <p>Many users find our AI technology produces more accurate and comprehensive flashcards than Quizlet. We specialize exclusively in flashcard generation with more advanced AI models trained specifically for educational content. Additionally, our spaced repetition system is designed to optimize learning rather than just testing recognition.</p>
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
              <span className="text-[#3E1953] font-semibold">What file types can I upload to create flashcards?</span>
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
                <p>Ainee AI Flashcard Maker supports a wide range of file formats including PDFs, Microsoft Word documents (.docx), PowerPoint presentations (.pptx), images (.jpg, .png), videos (.mp4), and plain text. You can also paste text directly or take photos of handwritten notes using our mobile app.</p>
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
              <span className="text-[#3E1953] font-semibold">Can I export my flashcards to other platforms or print them?</span>
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
                <p>Yes, Ainee AI Flashcard Maker allows you to export your flashcards in various formats including PDF, CSV, and Anki-compatible files. This makes it easy to print physical cards or use them with other study platforms. You can also share your decks directly with others through our sharing feature.</p>
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
              <span className="text-[#3E1953] font-semibold">Is there a limit to how many flashcards I can create?</span>
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
                <p>With our free plan, you can create up to 200 AI-generated flashcards per month. Our premium plans offer unlimited flashcard creation to support more intensive study needs. There's no limit to how many cards you can create manually in any plan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* CTA Section */}
    <section className="py-16 mt-10 rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#4D4DFF]/5 to-[#69DA00]/5"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#4D4DFF]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-[#69DA00]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1.5s" }}></div>
      </div>
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">
          Create Flashcards in 30 Seconds
        </h2>
        <p className="text-xl text-gray-700 mb-8">
          No Sign-up • 100% Free • AI-Powered
        </p>
        
        <a 
          href="#generate-flashcards" 
          className="bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] text-white px-10 py-4 rounded-xl font-bold text-xl inline-block hover:opacity-90 transition shadow-lg transform hover:-translate-y-1 hover:scale-105 duration-300"
        >
          Get Started
        </a>
      </div>
    </section>
    </>
  );
}
