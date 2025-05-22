"use client";

import React, {useEffect, useRef, useState} from 'react';
import type {ContentResponse} from "@/apis";
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import AineeBridge from "@/lib/AineeBridge";

const options =  {
    cMapUrl : `https://unpkg.com/pdfjs-dist@4.8.69/cmaps/` ,
} ;

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
}

function PdfDetail({ 
  content,
  annotations = [] 
}: { 
  content: ContentResponse,
  annotations?: Record<string, any>[]
}) {
    const [numPages, setNumPages] = useState<number>();
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(800); // 默认宽度
    const [pagesToRender, setPagesToRender] = useState(0); // 初始加载 0 页

    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.body.scrollHeight - 50) {
                loadMorePages();
            }
        };

        // const container = containerRef.current;
        if (typeof window !== 'undefined') {
            window.addEventListener("scroll", handleScroll);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener("scroll", handleScroll);
            }
        };
    }, [numPages, pagesToRender]);

    useEffect(() => {
        function updateWidth() {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        }
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const loadMorePages = () => {
        setPagesToRender((prev) => (numPages ? Math.min(prev + 5, numPages) : prev));
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
        setPagesToRender(Math.min(5, numPages));
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
    }

    const handleZoomIn = () => {
        setScale(prevScale => Math.min(prevScale + 0.2, 3));
    };

    const handleZoomOut = () => {
        setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
    };

    if (!content.file_url) {
        return (
          <div className="flex justify-center items-center h-64 text-gray-500">
            No PDF URL provided.
          </div>
        );
    }

    return (
        <div className='w-full bg-white' ref={containerRef}>
            <div className={`sticky left-1 w-fit py-1 z-10 bg-[#F6F5FA] rounded ${AineeBridge.isInAineeApp() ? 'top-[4px]' : 'top-[60px]'}`}>
                <button onClick={handleZoomOut} className='w-8 h-6 border-r-[1px] border-gray-400'>-</button>
                <button onClick={handleZoomIn} className='w-8 h-6'>+</button>
                {/*<div>{pagesToRender} / {numPages!}</div>*/}
            </div>
            {
               typeof window !== 'undefined' && <Document options={options} 
                // file="http://10.255.10.182:8000/static/aaaa.pdf" // 临时测试用 - 稍后注释掉
                file={content.file_url}
                onLoadSuccess={onDocumentLoadSuccess}>
                {Array.from({length: pagesToRender}, (el, index) => (
                    <Page width={containerWidth} className='w-full max-w-4xl' key={`page_${index}`} pageNumber={index + 1} scale={scale} />
                ))}
            </Document>
            }
        </div>
    );
}

export default PdfDetail; 