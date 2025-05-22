import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-8 pb-2">
      <div className="container max-w-7xl mx-auto flex flex-col gap-4 items-center">
        {/* 主footer内容 */}
        <div className="w-full flex flex-col md:flex-row md:justify-between items-center gap-2 px-4 pb-2 border-b border-gray-100">
          <div className="flex flex-col md:flex-row items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Ainee.com</span>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <span className="text-sm text-muted-foreground">Copyright © 2025</span>
          </div>
          <nav className="flex flex-wrap items-center gap-4 mt-2 md:mt-0">
            <a
              href="https://blog.ainee.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </a>
            <Link
              href="https://blog.ainee.com/index.php/2025/03/28/terms-and-conditions/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="https://blog.ainee.com/index.php/2025/03/28/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
          </nav>
        </div>

        {/* 合作伙伴部分，最底部 */}
        <div className="w-full flex justify-center mt-2">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 py-2">
            <a 
              href="https://ainavhub.com/" 
              title="AI NavHub Tools Directory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              AI NavHub Tools Directory
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://magicbox.tools/" 
              title="MagicBox.Tools - AI Tools Directory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              MagicBox.Tools - AI Tools Directory
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://sprunkid.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sprunkid
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://aistage.net" 
              title="AIStage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              AIStage <span className="ml-1 text-[10px] text-gray-400">(Free site submission)</span>
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://similarlabs.com/?ref=embed" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              style={{ maxHeight: 32 }}
            >
              <Image 
                src="https://similarlabs.com/similarlabs-embed-badge-light.svg" 
                alt="SimilarLabs Embed Badge"
                width={0}
                height={32} 
                style={{ height: 32, width: 'auto', maxHeight: 32 }}
                className="inline-block align-middle"
              />
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://topfreeaitools.com/ai/ainee---ai-notetaking-and-learning-companion" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              style={{ maxHeight: 32 }}
            >
              <Image 
                src="https://ff65dcf08ebd5eb1c022b44dd88016ac.cdn.bubble.io/f1724746116087x632750678197528400/badge%20white.png?_gl=1*1wvcbnr*_gcl_au*MTg3MzI0ODMyLjE3MjE2MjAzNjA.*_ga*NTIyODE4MzEyLjE3MDU5OTg0MTc.*_ga_BFPVR2DEE2*MTcyNDc0NTM2OS4yMjkuMS4xNzI0NzQ2MjY2LjYwLjAuMA.." 
                alt="topfreeaitools" 
                width={0}
                height={32}
                style={{ height: 32, width: 'auto', maxHeight: 32 }}
                className="inline-block align-middle"
              />
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://www.toolpilot.ai/" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              style={{ maxHeight: 32 }}
            >
              <Image 
                src="https://www.toolpilot.ai/cdn/shop/files/tp-b-h_bec97d1a-5538-498b-8a26-77de74f90ed5_1692x468_crop_center.svg?v=1695882612" 
                alt="ToolPilot"
                width={0}
                height={32}
                style={{ height: 32, width: 'auto', maxHeight: 32 }}
                className="inline-block align-middle"
              />
            </a>
            <span className="hidden md:inline-block text-gray-300">|</span>
            <a 
              href="https://dang.ai/" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              style={{ maxHeight: 32 }}
            >
              <Image 
                src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png" 
                alt="Dang.ai" 
                width={0}
                height={32}
                style={{ height: 32, width: 'auto', maxHeight: 32 }}
                className="inline-block align-middle"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}