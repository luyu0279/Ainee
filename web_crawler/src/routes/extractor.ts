import express, { Router, Request, Response, NextFunction } from "express";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import puppeteer, { Browser, Page } from "puppeteer";
import { cleanHtml } from "../utils/cleanHtml";
import { XMLParser } from 'fast-xml-parser';

const router: express.Router = express.Router();
interface ExtractionResult {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  cover?: string;
  textContent: string;
  statusCode: number;
}


// 最大并发数
const MAX_CONCURRENT = 10;
let currentConcurrent = 0;
const queue: (() => void)[] = [];


// 浏览器管理工具类
class BrowserManager {
  static async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    try {
      return await callback(page);
    } finally {
      await page.close();
      await browser.close();
    }
  }
}

const concurrencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 使用Promise构造器确保正确的resolve类型
  if (currentConcurrent >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      queue.push(resolve); // 存储resolve回调
    });
  }

  currentConcurrent++;
  try {
    await next();
  } finally {
    currentConcurrent--;
    // 使用队列的shift()保证先进先出
    const nextResolve = queue.shift();
    if (nextResolve) nextResolve();
  }
};

// 内容提取工具函数
const extractContent = (document: Document): ExtractionResult => {
  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) throw new Error("No readable content found");

  const imageDom = new JSDOM(article.content);
  const images = Array.from(imageDom.window.document.querySelectorAll("img"))
    .map((img) => img.src)
    .filter((src) => src.startsWith("http"));

  // 优先获取SEO封面图
  const seoCover = document
    .querySelector('meta[property="og:image"], meta[name="twitter:image"]')
    ?.getAttribute("content");
  const validSeoCover = seoCover?.startsWith("http") ? seoCover : null;
  return {
    url: document.URL,
    title: article.title,
    content: article.content,
    excerpt: article.excerpt,
    textContent: article.textContent?.replace(/\s+/g, " ").trim(),
    images,
    cover: validSeoCover || images[0], // 优先使用SEO图片
    statusCode: 200,
  };
};

// 重试逻辑装饰器
const withRetry =
  (fn: Function, maxRetries: number) =>
  async (...args: any[]) => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        if (i === maxRetries) throw error;
        console.warn(`Attempt ${i + 1} failed, retrying...`);
      }
    }
  };

// 在工具函数模块中添加（推荐单独建立 utils/userAgents.ts）
const generateRandomUA = (): string => {
  // 浏览器版本生成器
  const generateVersion = (major: number) => {
    const minor = Math.floor(Math.random() * 10);
    const patch = Math.floor(Math.random() * 100);
    return `${major}.0.${minor}.${patch}`;
  };

  // 操作系统池
  const osPool = [
    "(Windows NT 10.0; Win64; x64)", // Windows 10/11
    "(Windows NT 6.3; Win64; x64)", // Windows 8.1
    "(Macintosh; Intel Mac OS X 10_15_7)", // macOS Catalina
    "(Macintosh; Intel Mac OS X 13_5_1)", // macOS Ventura
    "(X11; Linux x86_64)", // Linux
    "(X11; Ubuntu; Linux x86_64)", // Ubuntu Linux
    "(iPhone; CPU iPhone OS 16_6 like Mac OS X)", // iOS 16
    "(iPad; CPU OS 16_6 like Mac OS X)", // iPadOS 16
    "(Android 13; Mobile)", // Android 13 Phone
    "(Android 13; Tablet)", // Android 13 Tablet
    "(X11; CrOS x86_64 15117.111.0)", // Chrome OS
  ];

  // 浏览器引擎版本
  const webkitVersion = Math.random() > 0.5 ? "537.36" : "605.1.15";

  const [os, chromeVersion] = [
    osPool[Math.floor(Math.random() * osPool.length)],
    generateVersion(90 + Math.floor(Math.random() * 10)), // Chrome 90-100
  ];

  return `Mozilla/5.0 ${os} AppleWebKit/${webkitVersion} (KHTML, like Gecko) Chrome/${chromeVersion} Safari/${webkitVersion}`;
};

// 主处理函数
const extractHandler = async (url: string): Promise<ExtractionResult> => {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid URL parameter");
  }

  return BrowserManager.withPage(async (page) => {
    try {
      await page.setUserAgent(generateRandomUA());

      // 启用请求拦截
      await page.setRequestInterception(true);

      // 生成唯一的计时器标签：随机数 + URL
      const timerLabel = `${Math.random().toString(36).slice(2, 8)} - ${url}`;
      console.time(timerLabel);

      // 拦截请求，只允许文档和脚本加载
      page.on("request", (request) => {
        const resourceType = request.resourceType();
        if (["document", "script"].includes(resourceType)) {
          request.continue(); // 继续请求
        } else {
          request.abort(); // 中止请求
        }
      });

      const response = await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 20 * 1000, // 20秒超时（单位：毫秒）
      });

      const content = await page.content();
      const dom = new JSDOM(content);
      const cleanedDom = cleanHtml(dom.window.document);

      // 结束计时器
      console.timeEnd(timerLabel);

      return {
        ...extractContent(cleanedDom),
        statusCode: response?.status() || 200,
      };
    } catch (error) {
      // 捕获所有错误并重新抛出
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Extraction failed: ${message}`);
    }
  });
};

// 路由配置
router.get(
  "/extract",
  concurrencyMiddleware,
  async (req: Request<{}, any, any, { url: string }>, res: Response) => {
    console.log("Extracting data from:", req.query.url);
    try {
      const handler = withRetry(extractHandler, 3);
      const result = await handler(req.query.url);
      console.log("Extraction success: ", req.query.url);
      res.json(result);
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({
        error: "Failed to extract data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
