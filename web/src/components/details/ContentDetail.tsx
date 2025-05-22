"use client";

import dynamic from "next/dynamic";
import React from "react";
import { ContentResponse } from "@/types/contentTypes";

// Placeholder for RecogitoWrapper
const RecogitoWrapper = dynamic(() => import("@/components/RecogitoWrapper"), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin h-6 w-6 border-2 border-gray-500 rounded-full border-t-transparent"></div>
      </div>
    </div>
  ),
});

export default function ContentDetail({ 
  content, 
  annotations = [] 
}: { 
  content: ContentResponse,
  annotations?: Record<string, any>[]
}) {
  return (
    <>
      {/* Article header */}
      <div className="mt-2 px-[20px] space-y-4">
        <div>
          {/* <h1 className="text-2xl font-bold mb-4">{content.title}</h1> */}
          <div className="text-[#BABABA] mb-4 text-[14px]">
            {content.author && <p>By {content.author ?? "unknown"}</p>}
            <p>
              {content.published_time && (
                <span>
                  Published on{" "}
                  {new Date(content.published_time ?? "").toLocaleDateString()},
                </span>
              )}

              {content.source && (
                <span className="ml-2">
                  Source:{" "}
                  <a
                    href={content.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {content.source && new URL(content.source).hostname}
                  </a>
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div id="content_wrapper" className="pb-[60px]">
        {content.content ? (
          <RecogitoWrapper
            content={content.content}
            url={content.source || ""}
            contentUid={content.uid || ""}
            initialAnnotations={annotations}
          />
        ) : (
          <div className="px-[20px] py-4">
            <p className="text-gray-500">No content available for this article.</p>
          </div>
        )}
      </div>
    </>
  );
} 