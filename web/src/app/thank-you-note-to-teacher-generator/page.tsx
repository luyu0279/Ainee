"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import ApiLibs from "@/lib/ApiLibs";

type TabType = "parents" | "students" | "short" | "daycare";
type TemplateType = {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
} | null;

export default function ThankYouNoteToTeacherPage() {
  const [activeTab, setActiveTab] = useState<TabType>("parents");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(null);
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // 状态变量存储表单数据和结果
  const [formData, setFormData] = useState({
    fromType: "Parent",
    teacherName: "",
    fromName: "",
    teacherType: "Elementary School Teacher",
    qualities: {
      patience: false,
      creativity: false,
      dedication: false,
      kindness: false,
      inspiration: false,
      support: false
    },
    memory: "",
    tone: "Heartfelt",
    length: "Medium (paragraph)"
  });
  
  const [generatedNote, setGeneratedNote] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  
  // 创建独立的 refs 用于每个标签页
  const parentsSliderRef = useRef<HTMLDivElement>(null);
  const studentsSliderRef = useRef<HTMLDivElement>(null);
  const shortSliderRef = useRef<HTMLDivElement>(null);
  const daycareSliderRef = useRef<HTMLDivElement>(null);

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
  };

  const handleTemplateClick = (template: TemplateType) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
  };

  const handleCopyTemplate = () => {
    if (selectedTemplate) {
      navigator.clipboard.writeText(selectedTemplate.content);
      // You can add a toast notification here
    }
  };

  const handleSaveAsPDF = async () => {
    try {
      // 获取内容
      const element = document.querySelector('.bg-indigo-50 p') as HTMLElement;
      if (!element) {
        alert('No content to save as PDF');
        return;
      }
      const textContent = element.textContent || '';

      // 动态导入 jsPDF
      const { jsPDF } = await import('jspdf');

      // 创建 PDF
      const doc = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      // 设置字体
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(14);

      // 自动换行
      const pageWidth = doc.internal.pageSize.getWidth() - 20; // 10mm margin each side
      const lines = doc.splitTextToSize(textContent, pageWidth);

      doc.text(lines, 10, 20);

      doc.save('thank-you-note.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // 处理表单字段变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理复选框变化
  const handleCheckboxChange = (quality: string) => {
    setFormData((prev) => ({
      ...prev,
      qualities: {
        ...prev.qualities,
        [quality]: !prev.qualities[quality as keyof typeof prev.qualities],
      },
    }));
  };

  // 生成感谢信
  const generateThankYouNote = async () => {
    if (!formData.teacherName.trim()) {
      setError("Please enter teacher's name");
      return;
    }

    try {
      setIsGenerating(true);
      setError("");

      // 获取选中的品质
      const selectedQualities = Object.entries(formData.qualities)
        .filter(([_, isSelected]) => isSelected)
        .map(([quality]) => quality);

      // 使用API预期的属性名称
      const request = {
        from_whom: formData.fromType,
        teacher_name: formData.teacherName,
        your_name: formData.fromName,
        teacher_type: formData.teacherType,
        qualities: selectedQualities.join(", "), // 将数组转换为逗号分隔的字符串
        memory: formData.memory,
        tone: formData.tone,
        length: formData.length
      };

      console.log("API Request:", request); // 添加日志查看请求数据

      // 调用API生成感谢信
      const response = await ApiLibs.aineeWeb.generateTeacherThankYouNoteApiAineeWebThankYouNoteToTeacherPost(request);

      console.log("API Response:", response); // 添加日志查看响应数据

      if (response && response.data && response.data.thank_you_note) {
        setGeneratedNote(response.data.thank_you_note); // 只保存thank_you_note字段
        setShowResult(true);
      } else {
        setError("Failed to generate thank you note. Please try again.");
      }
    } catch (error) {
      console.error("Error generating thank you note:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 重新生成感谢信
  const handleRegenerate = () => {
    generateThankYouNote();
  };

  // Template data
  const templates = {
    parents: [
      {
        id: "parent1",
        title: "End of Year Gratitude",
        description: "Thank you for your dedication throughout this school year. Your impact on my child's education has been remarkable...",
        content: `Dear [Teacher's Name],

As this school year comes to a close, I wanted to express my heartfelt gratitude for everything you've done for [Child's Name]. Your dedication, patience, and genuine care have made a tremendous impact on [his/her] growth, both academically and personally.

I've watched [Child's Name] develop a newfound love for learning, particularly in [subject/area], and I know this is largely due to your engaging teaching style and personal encouragement. The way you [specific example of something positive the teacher did] truly made a difference.

Teachers like you who go above and beyond are rare, and we feel incredibly fortunate that [Child's Name] had the opportunity to be in your class this year.

Thank you for being not just an excellent educator, but a positive role model who [Child's Name] looks up to.

With deepest appreciation,
[Your Name]`,
        tags: ["Elementary", "Heartfelt"]
      },
      {
        id: "parent2",
        title: "Special Support Thanks",
        description: "Your exceptional support during a challenging time made all the difference. Thank you for going above and beyond...",
        content: `Dear [Teacher's Name],

I wanted to express my sincere gratitude for the exceptional support you've provided to [Child's Name] during this challenging time. Your understanding, flexibility, and willingness to go above and beyond have made an immeasurable difference in [his/her] educational experience.

When [mention specific challenge - e.g., "we were dealing with our family move" or "after [Child's Name]'s extended illness"], your thoughtful accommodations and extra time spent helping [him/her] catch up demonstrated a level of dedication that truly sets you apart as an educator.

The way you [specific action - e.g., "created personalized assignments" or "scheduled those additional help sessions"] showed not only your commitment to [Child's Name]'s academic success but also your concern for [his/her] overall wellbeing.

Teachers who provide this level of individualized support make a lasting impact that extends far beyond the classroom. [Child's Name] has not only maintained [his/her] academic progress but has also learned valuable lessons about perseverance, flexibility, and the importance of a supportive community.

With deepest appreciation,
[Your Name]`,
        tags: ["Middle School", "Emotional"]
      },
      {
        id: "parent3",
        title: "Academic Progress Appreciation",
        description: "Thank you for helping my child make tremendous academic progress this year. Your teaching methods have been incredibly effective...",
        content: `Dear [Teacher's Name],

I'm writing to express my profound appreciation for the remarkable academic progress [Child's Name] has made under your guidance this year. Your innovative teaching methods and individualized approach have been incredibly effective in helping [him/her] overcome previous challenges and develop genuine confidence in [his/her] abilities.

At the beginning of the year, we were concerned about [Child's Name]'s struggles with [specific subject or skill]. The transformation we've witnessed over these past months has been nothing short of extraordinary. [His/Her] [test scores/project work/participation] in [subject] has improved significantly, but even more importantly, [he/she] now approaches this subject with enthusiasm rather than dread.

I particularly appreciate your [specific teaching approach - e.g., "hands-on learning activities" or "way of breaking down complex concepts"]. This approach has clearly resonated with [Child's Name]'s learning style and has made the material both accessible and engaging.

Beyond the academic growth, we've noticed [Child's Name] developing greater independence in [his/her] study habits and a newfound willingness to tackle challenging material. These skills will serve [him/her] well throughout [his/her] educational journey.

Thank you for your expertise, dedication, and the positive learning environment you've created.

Gratefully,
[Your Name]`,
        tags: ["Any Grade", "Professional"]
      },
      {
        id: "parent4",
        title: "Teacher Appreciation Week",
        description: "During this Teacher Appreciation Week, we want to express our deepest gratitude for all that you do...",
        content: `Dear [Teacher's Name],

During this Teacher Appreciation Week, we want to express our deepest gratitude for all that you do for [Child's Name] and all your students. Your dedication to education and the well-being of your students deserves to be celebrated not just this week, but every day.

We've noticed how [Child's Name] has flourished under your guidance this year. Your ability to [specific teaching quality or approach] has made such a positive impact on [his/her] attitude toward learning and academic progress.

Teachers like you truly make a difference in the lives of your students and, by extension, in the future of our community. Your patience, creativity, and commitment do not go unnoticed.

Please know that your hard work and care are deeply appreciated by our entire family. We consider ourselves fortunate that [Child's Name] has had the opportunity to learn from such an exceptional educator.

With sincere appreciation,
[Your Name]`,
        tags: ["Any Grade", "Formal"]
      },
      {
        id: "parent5",
        title: "Behavioral Improvement Thanks",
        description: "Thank you for your patience and strategies that have helped improve my child's behavior in class...",
        content: `Dear [Teacher's Name],

I wanted to extend my heartfelt thanks for your patience and effective strategies that have helped improve [Child's Name]'s behavior in class this year. The transformation we've witnessed is truly remarkable, and we know it wouldn't have been possible without your consistent support and guidance.

When the school year began, we were concerned about [specific behavioral challenge]. Your approach of [specific strategy or technique the teacher used] has made such a difference in helping [Child's Name] develop better self-regulation skills and classroom habits.

I especially appreciate how you've maintained open communication with us throughout this process, keeping us informed about both challenges and progress. Your collaborative approach has allowed us to reinforce the same expectations at home, creating consistency that has been key to [Child's Name]'s improvement.

Most importantly, I'm grateful that you saw beyond the behavior to recognize [Child's Name]'s strengths and potential. Your belief in [him/her] has helped rebuild [his/her] confidence and enjoyment of school.

Thank you for your dedication to helping every student succeed, even when that requires extra effort and creativity.

With gratitude,
[Your Name]`,
        tags: ["Elementary", "Grateful"]
      },
      {
        id: "parent6",
        title: "Holiday Season Gratitude",
        description: "As we enter the holiday season, we wanted to take a moment to thank you for your wonderful influence...",
        content: `Dear [Teacher's Name],

As we enter the holiday season, we wanted to take a moment to thank you for your wonderful influence on [Child's Name]'s life. Your dedication and care have made school a place of joy and discovery for [him/her] this year.

The enthusiasm [Child's Name] shows when talking about your class and the projects you've been working on is a testament to your ability to make learning engaging and meaningful. Just yesterday, [he/she] was excitedly telling us about [specific project or lesson], and we could see how much [he/she] has learned under your guidance.

Teachers like you who bring warmth, passion, and excellence to the classroom truly embody the spirit of the season. Your gift of education and encouragement will continue to benefit [Child's Name] long after this school year ends.

We hope you enjoy a well-deserved break during the holidays and have time to relax and recharge with your loved ones.

With warm wishes and sincere appreciation,
[Your Name]`,
        tags: ["Any Grade", "Warm"]
      }
    ],
    students: [
      {
        id: "student1",
        title: "Graduation Thank You",
        description: "As I graduate, I want to thank you for being an incredible teacher who inspired me to pursue my dreams...",
        content: `Dear [Teacher's Name],

As I prepare to graduate, I've been reflecting on the teachers who have made the most significant impact on my educational journey, and you immediately came to mind.

Your [subject] class during my [freshman/sophomore/junior/senior] year was pivotal in developing my critical thinking and passion for learning. The way you [specific teaching approach] opened my eyes to new perspectives and possibilities.

I still remember [specific lesson or moment] and how it changed my understanding of [concept/topic]. That moment of clarity has stayed with me and influenced my decision to pursue [future plans].

Thank you for being more than just a teacher—for being a mentor who saw potential in me and encouraged me to reach for it. The confidence and skills I gained in your class have prepared me for the next chapter in ways that extend far beyond academics.

As I move forward, I'll carry the lessons you taught me, both about [subject] and about myself.

With heartfelt gratitude,
[Student's Name]`,
        tags: ["High School", "Emotional"]
      },
      {
        id: "student2",
        title: "Subject Passion Thanks",
        description: "Thank you for making science so interesting and fun. You've sparked a passion I never knew I had...",
        content: `Dear [Teacher's Name],

I wanted to thank you for making [subject] so interesting and fun this year. Before taking your class, I never realized how fascinating this subject could be, but you've sparked a passion I never knew I had.

The way you [describe teaching method - e.g., "connect abstract concepts to real-world examples" or "design creative projects"] makes the material come alive in a way that no textbook ever could. I especially enjoyed [specific activity or lesson], which helped me understand [concept] in a completely new way.

I used to think of [subject] as just another class I had to get through, but now I find myself [reading articles/watching videos/discussing topics] related to [subject] outside of class. I'm even considering [studying this subject further/joining related club/exploring careers] because of the interest you've inspired.

Thank you for your enthusiasm, creativity, and obvious love for what you teach. It truly makes a difference when a teacher is as passionate about their subject as you are.

Appreciatively,
[Student's Name]`,
        tags: ["Middle School", "Enthusiastic"]
      },
      {
        id: "student3",
        title: "Personal Growth Appreciation",
        description: "Thank you for helping me believe in myself. Your encouragement has helped me grow not just as a student...",
        content: `Dear [Teacher's Name],

As this school year comes to a close, I wanted to thank you for helping me believe in myself. Your encouragement and support have helped me grow not just as a student, but as a person.

When I first entered your class, I was [describe initial state - e.g., "shy about participating" or "doubtful of my abilities"]. Your consistent encouragement and the way you [specific supportive action - e.g., "always acknowledged my contributions" or "provided constructive feedback"] gradually helped me develop the confidence to [new ability or behavior].

I'll never forget when you [specific meaningful interaction or moment]. That moment changed something for me and showed me that I was capable of more than I thought.

Beyond the subject matter, you've taught me valuable lessons about [perseverance/critical thinking/self-advocacy/etc.] that I know will be important throughout my life. I now approach challenges with a different mindset, and I have you to thank for that shift.

I'm grateful to have had you as a teacher this year, and I'll carry your lessons with me long after I leave your classroom.

With sincere thanks,
[Student's Name]`,
        tags: ["Any Grade", "Reflective"]
      },
      {
        id: "student4",
        title: "Elementary Student Thanks",
        description: "Thank you for being the best teacher ever! I love coming to school because you make learning fun...",
        content: `Dear [Teacher's Name],

Thank you for being the best teacher ever! I love coming to school because you make learning fun.

I really like how you [specific thing the teacher does that the student enjoys, e.g., "read stories with funny voices" or "let us do science experiments"]. It makes me excited to learn new things every day.

My favorite part of this year was when we [specific memorable activity or event]. I learned so much and had fun too!

You are always nice and help me when I don't understand something. You never make me feel bad when I make mistakes, and you always say good job when I try hard.

I'm going to miss being in your class next year, but I will come back to say hi!

Thank you for being an awesome teacher.

From,
[Student's Name]`,
        tags: ["Elementary", "Simple"]
      },
      {
        id: "student5",
        title: "College Recommendation Thanks",
        description: "Thank you for writing my college recommendation letter. Your support of my academic journey means so much...",
        content: `Dear [Teacher's Name],

I wanted to express my sincere gratitude for writing my college recommendation letter. Your support of my academic journey means so much to me, and I deeply appreciate the time and effort you invested in helping me pursue my educational goals.

I've always valued your insights and feedback in [subject] class, and having your endorsement as I apply to colleges is truly meaningful. Your belief in my abilities has been a constant source of encouragement throughout high school.

I'm pleased to share that I've been accepted to [college name(s) if applicable], and I know that your thoughtful recommendation played an important role in this achievement. The skills and knowledge I gained in your class have prepared me well for the next stage of my education, and I'm excited to build on the foundation you helped establish.

Thank you again for being such an influential part of my high school experience and for supporting my future aspirations.

With gratitude,
[Student's Name]`,
        tags: ["High School", "Formal"]
      },
      {
        id: "student6",
        title: "Extra Help Appreciation",
        description: "Thank you for staying after school to help me understand math. Your extra time made a huge difference...",
        content: `Dear [Teacher's Name],

I wanted to thank you for staying after school to help me understand [specific subject/topic]. Your extra time and patience made a huge difference in my understanding and confidence.

When I was struggling with [specific concept], the additional explanations and practice problems you provided helped everything finally click for me. The way you [specific teaching approach - e.g., "broke down the process into smaller steps" or "related the concepts to real-world examples"] made the material much clearer than it had been before.

I appreciate that you never made me feel embarrassed about needing extra help. Instead, you encouraged my questions and celebrated my progress, no matter how small. This positive approach helped me develop a growth mindset rather than feeling defeated by challenges.

Thanks to your support, I not only understand the material better, but I've also learned effective study strategies that I can apply to other subjects. My recent [test/quiz/assignment] score of [specific result if applicable] reflects how much I've improved with your guidance.

Thank you for being the kind of teacher who goes above and beyond to ensure that every student succeeds.

Sincerely,
[Student's Name]`,
        tags: ["Any Grade", "Grateful"]
      }
    ],
    short: [
      {
        id: "short1",
        title: "Quick Gratitude Note",
        description: "Thank you for being an amazing teacher. Your passion for teaching inspires us every day!",
        content: `Dear [Teacher's Name],

Thank you for being an amazing teacher. Your passion for teaching inspires us every day!

Gratefully,
[Your Name]`,
        tags: ["Any Grade", "Brief"]
      },
      {
        id: "short2",
        title: "Gift Tag Message",
        description: "Your dedication makes all the difference. Thank you for being such an exceptional teacher!",
        content: `Your dedication makes all the difference. Thank you for being such an exceptional teacher!

With appreciation,
[Your Name]`,
        tags: ["Gift Tag", "Concise"]
      },
      {
        id: "short3",
        title: "Quick Parent Thanks",
        description: "Thank you for your patience and guidance. You're making a wonderful difference in my child's life.",
        content: `Dear [Teacher's Name],

Thank you for your patience and guidance this year. You're making a wonderful difference in [Child's Name]'s life, and we are truly grateful.

Sincerely,
[Your Name]`,
        tags: ["From Parent", "Short"]
      },
      {
        id: "short4",
        title: "Student Quick Thanks",
        description: "You made learning fun! Thank you for being the best teacher ever and helping me love school.",
        content: `Dear [Teacher's Name],

You made learning fun! Thank you for being the best teacher ever and helping me love school.

From,
[Student's Name]`,
        tags: ["From Student", "Sweet"]
      },
      {
        id: "short5",
        title: "Special Occasion Quick Note",
        description: "Happy Teacher Appreciation Week! Thank you for all you do – you're truly appreciated!",
        content: `Dear [Teacher's Name],

Happy Teacher Appreciation Week! Thank you for all you do – you're truly appreciated!

Sincerely,
[Your Name]`,
        tags: ["Special Day", "Brief"]
      },
      {
        id: "short6",
        title: "End of Year Brief Note",
        description: "As the school year ends, thank you for making it a great one. Your impact will last a lifetime!",
        content: `Dear [Teacher's Name],

As the school year ends, thank you for making it a great one. Your impact will last a lifetime!

With gratitude,
[Your Name]`,
        tags: ["Year End", "Concise"]
      }
    ],
    daycare: [
      {
        id: "daycare1",
        title: "Daycare Transition Thanks",
        description: "Thank you for making my child's transition to daycare so smooth. Your gentle approach has made all the difference...",
        content: `Dear [Teacher's Name],

Thank you for making my child's transition to daycare so smooth. Your gentle approach has made all the difference. When we first enrolled [Child's Name] in daycare [timeframe] ago, we were filled with anxiety about the transition. Today, we're writing to thank you for making what seemed like a daunting change into a positive experience for our entire family.

Your patience during those first tearful drop-offs and your reassuring updates throughout the day were exactly what we needed. The gradual introduction process you recommended helped ease [Child's Name] into the new routine with minimal stress.

We've been amazed at how quickly [Child's Name] bonded with you and how eagerly [he/she] now heads into the classroom each morning. The way [he/she] lights up when talking about "[Teacher's Name]" and the activities you do together speaks volumes about the connection you've established.

Thank you for understanding that this transition was as much about supporting the parents as it was about caring for [Child's Name]. Your expertise and compassion have made all the difference as we navigated this important milestone.

Gratefully,
[Your Names]`,
        tags: ["New Student", "Grateful"]
      },
      {
        id: "daycare2",
        title: "Child Development Appreciation",
        description: "Thank you for fostering my child's development. The skills they're learning with you are amazing to witness...",
        content: `Dear [Teacher's Name],

I wanted to express my heartfelt thanks for fostering [Child's Name]'s development at daycare. The skills [he/she] is learning with you are amazing to witness, and we're constantly surprised by the new abilities [he/she] demonstrates at home.

When [Child's Name] first started at your daycare, [he/she] [mention previous developmental stage]. Now, just [timeframe] later, [he/she] [mention new skills or abilities]. We know this progress is directly connected to the thoughtful activities and consistent encouragement you provide each day.

We particularly appreciate your focus on [specific developmental area - e.g., "language development" or "social skills"]. The way you [specific teaching approach] has clearly resonated with [Child's Name], and we've noticed significant growth in this area.

The daily updates and photos you share give us a wonderful window into [Child's Name]'s day and help us feel connected to [his/her] experiences. We often use these updates as conversation starters to help [Child's Name] share more about [his/her] day with us.

Thank you for creating such a nurturing, stimulating environment where [Child's Name] can thrive. Your expertise and genuine care make all the difference.

With appreciation,
[Your Names]`,
        tags: ["Toddler", "Developmental"]
      },
      {
        id: "daycare3",
        title: "Special Care Thanks",
        description: "Thank you for the special attention you give to my child's unique needs. Your understanding approach means so much...",
        content: `Dear [Teacher's Name],

I want to express my profound gratitude for the special attention you give to [Child's Name]'s unique needs at daycare. Your understanding approach means so much to our family and has made an incredible difference in [his/her] development and comfort.

When we first discussed [Child's Name]'s [specific need or challenge], you listened without judgment and immediately began thinking of ways to accommodate and support [him/her]. Your willingness to [specific accommodation or support measure] and to collaborate with us on effective strategies has been invaluable.

We've noticed significant progress in [area of improvement] since [Child's Name] has been in your care. Moments like [specific positive incident or milestone] would not have been possible without your patience, expertise, and genuine concern for [his/her] wellbeing.

It gives us such peace of mind knowing that [Child's Name] is with someone who truly sees and appreciates [him/her] for who [he/she] is, and who understands that every child develops in their own unique way and time.

Thank you for being an advocate and a source of support not just for [Child's Name], but for our entire family.

With deepest appreciation,
[Your Names]`,
        tags: ["Special Needs", "Heartfelt"]
      },
      {
        id: "daycare4",
        title: "Daily Updates Appreciation",
        description: "Thank you for keeping me updated on my child's day. Your detailed communications help me feel connected...",
        content: `Dear [Teacher's Name],

I wanted to take a moment to thank you for keeping me updated on [Child's Name]'s day at daycare. Your detailed communications and thoughtful observations help me feel connected to [his/her] experiences even when I can't be there.

The daily reports, photos, and anecdotes you share provide such valuable insights into [Child's Name]'s development and activities. I especially appreciate how you note the small but significant moments—like [specific example of a moment the teacher shared]—that I would otherwise miss during our time apart.

These updates do more than just inform me about [Child's Name]'s day; they give me conversation starters to engage with [him/her] about [his/her] experiences and help me reinforce at home what [he/she] is learning at daycare. This continuity between our care settings has been beneficial for [his/her] development.

As a parent who [specific situation - e.g., "works full-time" or "juggles multiple responsibilities"], your communication style provides reassurance and helps ease any separation anxiety. Knowing that you're not only taking good care of [Child's Name] but also keeping me in the loop makes a tremendous difference.

Thank you for going above and beyond with your communications. Your dedication to creating a partnership with parents is truly appreciated.

Sincerely,
[Your Name]`,
        tags: ["Communication", "Appreciative"]
      },
      {
        id: "daycare5",
        title: "Preschool Graduation Thanks",
        description: "As my child graduates from preschool, thank you for preparing them so well for kindergarten...",
        content: `Dear [Teacher's Name],

As [Child's Name] prepares to graduate from preschool, I wanted to express my heartfelt thanks for preparing [him/her] so well for kindergarten. The foundation you've helped build—both academically and socially—will serve [him/her] well as [he/she] takes this exciting next step.

When [Child's Name] started in your class [timeframe] ago, [he/she] [describe starting point - e.g., "was hesitant to try new activities" or "struggled with letter recognition"]. Now, thanks to your skillful guidance and nurturing approach, [he/she] [describe progress - e.g., "confidently engages with peers" or "can write [his/her] name and recognize most letters"].

I've been particularly impressed by your focus on [specific aspect of preschool program - e.g., "developing independence" or "fostering curiosity"]. These skills are just as important as academic readiness, and I appreciate your holistic approach to early education.

The preschool years are such a formative time, and we feel fortunate that [Child's Name] got to experience them under your care. The enthusiasm [he/she] has for learning and the confidence [he/she] has developed will be [his/her] greatest assets as [he/she] moves forward.

Thank you for making [Child's Name]'s first formal educational experience so positive and for creating such wonderful memories that our family will cherish.

With gratitude as we celebrate this milestone,
[Your Name]`,
        tags: ["Graduation", "Milestone"]
      },
      {
        id: "daycare6",
        title: "Working Parent Gratitude",
        description: "As a working parent, I'm so grateful for the exceptional care you provide. You make it possible for me to work with peace of mind...",
        content: `Dear [Teacher's Name],

As a working parent, I'm incredibly grateful for the exceptional care you provide to [Child's Name]. You make it possible for me to focus on my professional responsibilities with complete peace of mind, knowing that my child is in capable, loving hands.

The guilt that often comes with leaving one's child in someone else's care is significantly eased by your obvious dedication and the genuine affection you show [Child's Name]. The way [he/she] lights up when we arrive at daycare and talks about you at home is testament to the wonderful relationship you've built.

I particularly appreciate how you [specific aspect of their care - e.g., "always take time to greet us personally each morning" or "share detailed updates about meaningful moments in [Child's Name]'s day"]. These thoughtful touches make a world of difference in our experience.

Your daycare provides more than just supervision—it offers a stimulating, nurturing environment where [Child's Name] is actively learning and developing each day. The skills and values you're instilling, from [example of specific skill] to [example of value], complement what we teach at home and contribute significantly to [his/her] growth.

Thank you for being our partner in raising [Child's Name] and for providing care that goes above and beyond the expected. Your work makes a profound difference in our family's life.

With deepest appreciation,
[Your Name]`,
        tags: ["Working Parent", "Grateful"]
      }
    ]
  };

  return (
    <>
    
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
                Craft the Perfect <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Thank You Note</span> for Your Amazing Teacher
              </h1>
              <p className="mt-2 text-lg text-gray-600 mb-8">
                Our AI thank you note to teacher generator helps parents and students create heartfelt, personalized thank you messages for teachers. Express your gratitude in just minutes.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-10">
                <Link href="#generator" className="px-8 py-3 rounded-full text-white font-medium bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] shadow-md hover:from-[#69DA00] hover:to-[#4D4DFF] transition-colors">
                  Create Your Note Now
                </Link>
                <Link href="#templates" className="px-8 py-3 rounded-full font-medium border border-[#4D4DFF] text-[#4D4DFF] bg-white hover:bg-[#F3F7FF] transition-colors">
                  Browse Templates
                </Link>
              </div>
            </div>
            {/* Right column - Features card */}
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-lg w-full max-w-md border border-white/20">
                <div className="text-gray-800 mb-4">
                  {[
                    { label: "Parents to Teachers" },
                    { label: "Students to Teachers" },
                    { label: "Quick & Easy Notes" },
                    { label: "Daycare Teachers" },
                  ].map((item) => (
                    <div className="flex mb-3 items-center" key={item.label}>
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="font-medium">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-center text-gray-500 text-sm">
                  <span className="font-bold text-gray-700">94%</span> of teachers appreciate receiving personalized thank you notes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Generator Section */}
      <section id="generator" className="py-12 bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#213756] text-center mb-2">AI Thank You Note to teacher Generator</h2>
          <p className="text-[#737373] mt-2 text-lg italic text-center mb-8">Our advanced AI will help you craft a personalized, heartfelt message based on your relationship and specific details.</p>
          <div className="flex flex-col md:flex-row items-start gap-8">

            {/* Left column - Form */}
            <div className="w-full md:w-1/2 flex justify-center md:justify-end">
              <div className="bg-white p-5 rounded-lg shadow-md max-w-lg w-full mx-auto md:mx-0">
                <h3 className="text-xl font-semibold mb-0">Tell Us About Your Teacher</h3>
                <form className="space-y-4 mt-6">
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Who is this from?</label>
                    <select 
                      name="fromType"
                      value={formData.fromType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Parent</option>
                      <option>Student</option>
                      <option>Class Group</option>
                      <option>School Administration</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Teacher's Name</label>
                    <input 
                      type="text"
                      name="teacherName"
                      value={formData.teacherName}
                      onChange={handleInputChange}
                      placeholder="e.g., Mrs. Johnson"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Your Name</label>
                    <input 
                      type="text"
                      name="fromName"
                      value={formData.fromName}
                      onChange={handleInputChange}
                      placeholder="e.g., Sarah Williams"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Type of Teacher</label>
                    <select 
                      name="teacherType"
                      value={formData.teacherType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Elementary School Teacher</option>
                      <option>Middle School Teacher</option>
                      <option>High School Teacher</option>
                      <option>Daycare Teacher</option>
                      <option>Special Education Teacher</option>
                      <option>Music/Art Teacher</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">What qualities do you appreciate most?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.patience}
                          onChange={() => handleCheckboxChange('patience')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Patience</span>
                      </label>
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.creativity}
                          onChange={() => handleCheckboxChange('creativity')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Creativity</span>
                      </label>
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.dedication}
                          onChange={() => handleCheckboxChange('dedication')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Dedication</span>
                      </label>
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.kindness}
                          onChange={() => handleCheckboxChange('kindness')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Kindness</span>
                      </label>
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.inspiration}
                          onChange={() => handleCheckboxChange('inspiration')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Inspiration</span>
                      </label>
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={formData.qualities.support}
                          onChange={() => handleCheckboxChange('support')}
                          className="mr-2 text-indigo-600" 
                        />
                        <span>Support</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Specific memory or achievement? (Optional)</label>
                    <textarea 
                      name="memory"
                      value={formData.memory}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      rows={3} 
                      placeholder="Share a special moment or achievement that stands out..."
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Tone</label>
                    <select 
                      name="tone"
                      value={formData.tone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Heartfelt</option>
                      <option>Formal</option>
                      <option>Casual</option>
                      <option>Humorous</option>
                      <option>Inspirational</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-gray-700 mb-1 text-sm font-medium">Length</label>
                    <select 
                      name="length"
                      value={formData.length}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Short (1-2 sentences)</option>
                      <option>Medium (paragraph)</option>
                      <option>Detailed (multiple paragraphs)</option>
                    </select>
                  </div>
                  
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  
                  <button 
                    type="button" 
                    onClick={generateThankYouNote}
                    disabled={isGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? "Generating..." : "Generate Thank You Note"}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Right column - Result */}
            <div className="w-full md:w-1/2 flex justify-center md:justify-start">
              <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 max-w-lg w-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold mb-0">Your Generated Note</h3>
                </div>
                
                <div className="bg-indigo-50 p-6 rounded-lg mb-6 italic">
                  {showResult && generatedNote ? (
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {generatedNote}
                    </p>
                  ) : (
                    <p className="text-gray-400 text-center italic">
                      Your generated thank you note will appear here.
                    </p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 justify-center">
                  {showResult && generatedNote ? (
                    <>
                      <button 
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isGenerating ? "Regenerating..." : "Regenerate"}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedNote).then(() => {
                            alert('Text copied to clipboard!');
                          }).catch(err => {
                            console.error('Failed to copy text: ', err);
                          });
                        }}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center text-sm transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy
                      </button>
                      
                      <button 
                        onClick={handleSaveAsPDF}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center text-sm transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        PDF
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const subject = encodeURIComponent('Thank You Note for Teacher');
                          const body = encodeURIComponent(generatedNote);
                          window.location.href = `mailto:?subject=${subject}&body=${body}`;
                        }}
                        className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md flex items-center text-sm transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm text-center">
                      Fill out the form and click "Generate" to create your personalized thank you note.
                    </p>
                  )}
                </div>
              </div>
            </div>  
          </div>
        </div>
      </section>

      {/* Creative Ideas Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#213756] text-center mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Creative Ways</span> to Show Your Appreciation
            </h2>
            <p className="text-[#737373] mt-3 text-lg italic text-center mb-8">
              Beyond thank you notes, explore these thoughtful ideas to express your gratitude to teachers who make a difference.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* More Ideas Collection */}
            <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-4">More Creative Thank You Ideas</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Class Contribution:</span> Donate a book, educational material, or classroom supply in the teacher's name.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Handmade Gifts:</span> Create personalized artwork, crafts, or DIY items that reflect the teacher's interests.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Digital Slideshow:</span> Compile photos and quotes in a digital presentation that celebrates the school year.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Gift Basket:</span> Assemble a themed collection of small items based on the teacher's preferences.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Classroom Decoration:</span> Create a banner, poster, or bulletin board display expressing collective gratitude.</span>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700"><span className="font-medium">Social Media Recognition:</span> Share your appreciation publicly by highlighting your teacher's impact.</span>
                </li>
              </ul>
            </div>
            
            {/* Testimonial */}
            <div className="relative overflow-hidden rounded-lg shadow-md bg-gradient-to-br from-[#4D4DFF] to-[#69DA00]">
              <div className="absolute opacity-10 top-5 left-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35.208-.086.39-.16.539-.222.302-.125.474-.197.474-.197L9.758 4.03c0 0-.218.052-.597.144C8.97 4.222 8.737 4.278 8.472 4.345c-.271.05-.56.187-.882.312C7.272 4.799 6.904 4.895 6.562 5.123c-.344.218-.741.4-1.091.692C5.132 6.116 4.723 6.377 4.421 6.76c-.33.358-.656.734-.909 1.162C3.219 8.33 3.02 8.778 2.81 9.221c-.19.443-.343.896-.468 1.336-.237.882-.343 1.72-.384 2.437-.034.718-.014 1.315.028 1.747.015.204.043.402.063.539.017.109.025.168.025.168l.026-.006C2.535 17.474 4.338 19 6.5 19c2.485 0 4.5-2.015 4.5-4.5S8.985 10 6.5 10zM17.5 10c-.223 0-.437.034-.65.065.069-.232.14-.468.254-.68.114-.308.292-.575.469-.844.148-.291.409-.488.601-.737.201-.242.475-.403.692-.604.213-.21.492-.315.714-.463.232-.133.434-.28.65-.35.208-.086.39-.16.539-.222.302-.125.474-.197.474-.197L20.758 4.03c0 0-.218.052-.597.144-.191.048-.424.104-.689.171-.271.05-.56.187-.882.312-.317.143-.686.238-1.028.467-.344.218-.741.4-1.091.692-.339.301-.748.562-1.05.944-.33.358-.656.734-.909 1.162C14.219 8.33 14.02 8.778 13.81 9.221c-.19.443-.343.896-.468 1.336-.237.882-.343 1.72-.384 2.437-.034.718-.014 1.315.028 1.747.015.204.043.402.063.539.017.109.025.168.025.168l.026-.006C13.535 17.474 15.338 19 17.5 19c2.485 0 4.5-2.015 4.5-4.5S19.985 10 17.5 10z" />
                </svg>
              </div>
              
              <div className="relative p-8 text-white">
                <p className="italic text-lg font-light mb-8 leading-relaxed">
                  "I coordinated with other parents to create a surprise 'Appreciation Week' for my daughter's teacher. Each day, we delivered something small: Monday was a handwritten note, Tuesday was her favorite coffee, and so on. By Friday, when we presented the class memory book, she was moved to tears. It was such a meaningful way to show our collective gratitude for her dedication."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 text-[#4D4DFF]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Sarah Thompson</p>
                    <p className="text-indigo-100">Parent of a 3rd grader</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
 
        </div>
      </section>
      
      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="w-full flex flex-col items-center justify-center py-20 md:py-24 bg-white/30 backdrop-blur-sm rounded-2xl">
            <div className="flex flex-col justify-center items-center gap-3">
              <h2 className="text-3xl md:text-4xl font-bold text-[#213756] text-center mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-[#737373] mt-3 text-lg italic text-center">
                Thank You Note to Teacher Generator FAQ
              </p>
            </div>
            
            <div className="mt-10 md:mt-12 max-w-sm md:max-w-3xl w-full px-4 md:px-0">
              <div className="w-full space-y-5">
                {/* Question 1 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 0 ? null : 0);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 0}
                  >
                    <span className="text-[#3E1953] font-semibold">What is the AI Thank You Note to Teacher Generator?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 0 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        Our AI Thank You Note to Teacher Generator is an advanced tool that helps parents and students create heartfelt, personalized thank you messages for teachers. It uses artificial intelligence to craft meaningful notes based on your input about the teacher, their impact, and your specific appreciation points. The tool saves you time while ensuring your gratitude is expressed eloquently and sincerely.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 2 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 1 ? null : 1);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 1}
                  >
                    <span className="text-[#3E1953] font-semibold">Is the Thank You Note Generator free to use?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 1 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        Yes, our Thank You Note to Teacher Generator is completely free to use. There are no hidden costs, subscription fees, or limitations. We believe in making it easy for everyone to express their gratitude to teachers who make such a significant impact on our lives and our children's development.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 3 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 2 ? null : 2);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 2}
                  >
                    <span className="text-[#3E1953] font-semibold">When is the best time to give a thank you note to a teacher?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 2 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        While the end of the school year is a traditional time for thank you notes, expressions of gratitude are welcome anytime. Consider Teacher Appreciation Week (early May), holidays, after a special project or event, or simply when you notice something particularly impressive about the teacher's work. Unexpected thank you notes during the middle of the year can be especially meaningful as they recognize ongoing efforts.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 4 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 3 ? null : 3);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 3}
                  >
                    <span className="text-[#3E1953] font-semibold">Should I include a gift with my thank you note?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 3 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        A heartfelt note is meaningful on its own, but a small gift can be a nice addition if you wish. Consider the teacher's preferences and school policies. Often, the most appreciated gifts are personalized, practical items, gift cards, or classroom supplies. Remember that the sincere message is the most valuable part. Many teachers report that thoughtful notes are kept and treasured for years, long after consumable gifts are gone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 5 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 4 ? null : 4);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 4}
                  >
                    <span className="text-[#3E1953] font-semibold">How can I make my thank you note stand out?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 4 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        The most memorable thank you notes include specific examples of the teacher's impact. Instead of general statements like "You're a great teacher," mention particular lessons, moments, or qualities that made a difference. Including your child's perspective or a handwritten element also adds a personal touch that teachers treasure. Consider creative presentation like a special card, decorated paper, or even a digital format with photos if appropriate.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 6 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 5 ? null : 5);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 5}
                  >
                    <span className="text-[#3E1953] font-semibold">Is it appropriate for my child to write their own thank you note?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 5 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        Absolutely! Teachers cherish notes written by their students, regardless of age. Younger children can draw pictures or dictate their thoughts for you to write down. Older students should be encouraged to write their own notes. Parents can also include a separate note of their own appreciation alongside their child's message. Having both perspectives provides teachers with a more complete picture of their impact.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 7 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 6 ? null : 6);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 6}
                  >
                    <span className="text-[#3E1953] font-semibold">Can I customize the thank you notes generated by the AI?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 6 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        Yes, all notes generated by our AI tool are fully customizable. After generating your thank you note, you can edit any part of it to add personal touches, specific memories, or adjust the tone and style. We encourage customization to ensure the note truly reflects your unique appreciation and relationship with the teacher. You can also regenerate the note as many times as needed until you're completely satisfied with the result.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question 8 */}
                <div className="border-b shadow-md dark:shadow-none rounded-2xl overflow-hidden bg-white/60 hover:shadow-lg transition-shadow duration-300">
                  <button 
                    onClick={() => {
                      setOpenFaq(openFaq === 7 ? null : 7);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 h-14 focus:outline-none text-left" 
                    aria-expanded={openFaq === 7}
                  >
                    <span className="text-[#3E1953] font-semibold">How do I deliver my thank you note to the teacher?</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${openFaq === 7 ? "rotate-180" : ""}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                        Thank you notes can be delivered in several ways. For a personal touch, hand-deliver the note to the teacher or place it on their desk. You can also send it via email if you prefer a digital option, especially for distance learning situations. Some parents include thank you notes with their children's homework or in communication folders. For special occasions, you might consider mailing the note to the school. Our generator allows you to save your note as a PDF for printing or email it directly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-white to-indigo-50 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
          <div className="absolute -left-1/4 -top-1/4 w-1/2 h-1/2 bg-[radial-gradient(circle_400px_at_center,rgba(77,77,255,0.08),transparent)] rounded-full"></div>
          <div className="absolute -right-1/4 -bottom-1/4 w-1/2 h-1/2 bg-[radial-gradient(circle_400px_at_center,rgba(105,218,0,0.08),transparent)] rounded-full"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_14px]"></div>
        </div>

        <div className="container mx-auto text-center relative z-10 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#213756] text-center mb-4">
            Ready to Create Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4D4DFF] to-[#69DA00]">Heartfelt Thank You</span>?
          </h2>
          <p className="text-[#737373] mx-auto mb-8 text-lg">
            Express your appreciation with a personalized message that will make a lasting impression on a teacher who's made a difference.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="#generator" className="px-8 py-3 rounded-full text-white font-medium bg-gradient-to-r from-[#4D4DFF] to-[#69DA00] shadow-md hover:from-[#69DA00] hover:to-[#4D4DFF] transition-colors">
              Use AI Generator
            </Link>
            <Link href="#templates" className="px-8 py-3 rounded-full font-medium border border-[#4D4DFF] text-[#4D4DFF] bg-white hover:bg-[#F3F7FF] transition-colors shadow-sm">
              Browse Templates
            </Link>
          </div>

        </div>
      </section>
    </>
  );
}


