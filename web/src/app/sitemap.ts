import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ainee.com';

  // 定义所有静态路由
  const routes = [
    '',
    '/youtube-video-summarizer',
    '/youtube-transcript-generator',
    '/thank-you-note-after-interview-generator',
    '/thank-you-note-to-teacher-generator',
    '/ai-flashcard-maker',
    '/cornell-notes-generator',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [
    ...routes,
    {
      url: "https://blog.ainee.com",
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ];
} 