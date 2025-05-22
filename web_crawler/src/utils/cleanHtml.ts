// import hljs from "highlight.js";

import Prism from "prismjs";
import loadLanguages from "prismjs/components/index";

// 预加载常用语言
loadLanguages([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "csharp",
  "go",
  "rust",
  "php",
  "ruby",
  "markdown",
  "bash",
  "shell", // shell 是 bash 的别名，但有些地方可能会用到
]);

/**
 * 清理和优化 HTML 内容
 * @param document 需要清理的 Document 对象
 */
export function cleanHtml(document: Document) {
  // 清理a标签
  document.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || !/^https?:\/\//i.test(href)) {
      // 创建span来包裹内容
      const span = document.createElement("span");
      span.innerHTML = a.innerHTML;
      a.replaceWith(span);
    }
  });

  // 12. 处理懒加载图片
  document.querySelectorAll("img").forEach((img) => {
    // 常见的懒加载属性
    const lazyAttributes = [
      "data-src",
      "data-lazy",
      "data-original",
      "data-srcset",
    ];
    let foundLazySrc = false;

    // 检查并处理常见的懒加载属性
    for (const attr of lazyAttributes) {
      if (img.hasAttribute(attr)) {
        img.src = img.getAttribute(attr) ?? "";
        foundLazySrc = true;
        break;
      }
    }

    // 如果图片没有 src 或 src 不是 http 开头，移除
    if (!img.src || !img.src.startsWith("http")) {
      img.remove();
    }
  });

  document.querySelectorAll("pre code").forEach((codeBlock) => {
    const code = codeBlock.textContent || "";

    // 尝试检测代码语言
    let detectedLanguage = "";
    try {
      // 遍历所有已加载的语言进行测试
      const languages = Object.keys(Prism.languages).filter(
        (lang) => lang !== "extend" && lang !== "insertBefore" && lang !== "DFS"
      );

      for (const lang of languages) {
        const grammar = Prism.languages[lang];
        if (typeof grammar === "object") {
          const tokens = Prism.tokenize(code, grammar);
          // 如果能够正确分词，且分词结果不是单个token，认为是匹配的语言
          if (tokens.length > 1) {
            detectedLanguage = lang;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Language detection failed:", e);
    }

    if (detectedLanguage) {
      codeBlock.setAttribute("language", detectedLanguage);
    }
  });

  // 移除所有元素的属性（除了特定属性外）
  document.querySelectorAll("*").forEach((element) => {
    const attributes = element.attributes;
    const attributesToKeep = ["src", "href"]; // 保留这些必要的属性

    for (let i = attributes.length - 1; i >= 0; i--) {
      const attrName = attributes[i].name;
      if (!attributesToKeep.includes(attrName)) {
        element.removeAttribute(attrName);
      }
    }
  });

  return document;
}
