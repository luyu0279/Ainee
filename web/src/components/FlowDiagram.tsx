"use client";

import React, { useEffect, useRef } from 'react';

export function FlowDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Add animation effects when component mounts
  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      // Animate paths
      const paths = svg.querySelectorAll('path');
      paths.forEach((path, index) => {
        // Adding a staggered animation to each path
        path.style.opacity = '0';
        path.style.transition = `opacity 0.6s ease-in-out ${index * 0.06}s`;
        setTimeout(() => {
          path.style.opacity = '1';
        }, 100);
      });

      // Animate text elements
      const texts = svg.querySelectorAll('text');
      texts.forEach((text, index) => {
        text.style.opacity = '0';
        text.style.transition = `opacity 0.6s ease-in-out ${index * 0.06 + 0.6}s`;
        setTimeout(() => {
          text.style.opacity = '1';
        }, 700);
      });

      // Add animated dash effects to connection lines after initial fade-in
      setTimeout(() => {
        // Create animation styles for dasharray paths
        const animationStyles = document.createElement('style');
        animationStyles.innerHTML = `
          @keyframes flowToAinee {
            0% { stroke-dashoffset: -24; }
            100% { stroke-dashoffset: 0; }
          }
          
          @keyframes flowFromAinee {
            0% { stroke-dashoffset: 24; }
            100% { stroke-dashoffset: 0; }
          }
          
          @keyframes flowCenter {
            0% { stroke-dashoffset: 12; }
            100% { stroke-dashoffset: -12; }
          }
          
          .flow-to-ainee {
            stroke-dasharray: 5, 7;
            animation: flowToAinee 2s linear infinite;
          }
          
          .flow-from-ainee {
            stroke-dasharray: 5, 7;
            animation: flowFromAinee 2s linear infinite;
          }
          
          .flow-center {
            stroke-dasharray: 5, 7;
            animation: flowCenter 3s linear infinite;
          }
        `;
        svg.appendChild(animationStyles);
        
        // Apply classes to the paths based on their IDs
        // Capture Knowledge paths (flowing towards Ainee)
        const captureKnowledgePaths = [
          svg.querySelector('#g-root-cu_dg3l5ibfq39o-stroke path'),
          svg.querySelector('#g-root-cu_1uqk3pybfq29z-stroke path'),
          svg.querySelector('#g-root-cu_1hfq2fqbfq0p5-stroke path'),
          svg.querySelector('#g-root-cu_1449k2ebfq2a3-stroke path'),
          svg.querySelector('#g-root-cu_142e4t2bfq39f-stroke path')
        ];
        
        captureKnowledgePaths.forEach(path => {
          if (path) path.classList.add('flow-to-ainee');
        });
        
        // Build Understanding paths (flowing towards Ainee)
        const buildUnderstandingPath = svg.querySelector('#g-root-cu_qrk3iubfq1om-stroke path');
        if (buildUnderstandingPath) buildUnderstandingPath.classList.add('flow-to-ainee');
        
        // Share Insights paths (flowing away from Ainee)
        const shareInsightsPaths = [
          svg.querySelector('#g-root-cu_vahz2ubfq2v5-stroke path'),
          svg.querySelector('#g-root-cu_1464zbqbfq1am-stroke path'),
          svg.querySelector('#g-root-cu_hznxsmbfq1ab-stroke path'),
          svg.querySelector('#g-root-cu_qtfis6bfq0p9-stroke path'),
          svg.querySelector('#g-root-cu_925iaebfq32g-stroke path'),
          svg.querySelector('#g-root-cu_1usfizabfq1ai-stroke path'),
          svg.querySelector('#g-root-cu_1qcm0uubfq22s-stroke path')
        ];
        
        shareInsightsPaths.forEach(path => {
          if (path) path.classList.add('flow-from-ainee');
        });
        
        // Special animation for node connecting to the center
        const centerConnectionPath = svg.querySelector('#g-root-cu_mbqleebfq2gx-stroke path');
        if (centerConnectionPath) centerConnectionPath.classList.add('flow-center');
        
      }, 1200);
    }
  }, []);

  return (
    <svg 
      ref={svgRef}
      width="1000" 
      height="700" 
      viewBox="0 0 836 590" 
      style={{
        fill: "none", 
        stroke: "none", 
        fillRule: "evenodd", 
        clipRule: "evenodd", 
        strokeLinecap: "round", 
        strokeLinejoin: "round", 
        strokeMiterlimit: 1.5,
        maxWidth: "100%",
        height: "auto",
        display: "block",
        filter: "drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.05))",
        transform: "scale(1)",
        transformOrigin: "center center"
      }} 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-full h-auto animate-fade-in"
    >
      <style className="text-font-style fontImports" data-font-family="Roboto">
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=block');
      </style>

      <g id="items" style={{ isolation: "isolate" }}>
    <g id="blend" style={{ mixBlendMode: "normal" }}>
      <g id="g-root-ro_13z9rdibfeuir-fill" data-item-order="1999984880" transform="translate(333, 174)"/>
      <g id="g-root-ro_1uuxfbqbfj0nd-fill" data-item-order="1999986392" transform="translate(555, 102)"/>
      <g id="g-root-ro_1lto5aubfq0wa-fill" data-item-order="1999987040" transform="translate(0, 96)"/>
      <g id="g-root-ro_dilhhybflu6c-fill" data-item-order="1999989632" transform="translate(297, 365)"/>
      <g id="g-root-tx_knowledg_1q6d9zqbfn8xx-fill" data-item-order="2000000000" transform="translate(345, 431)">
        <g id="tx_knowledg_1q6d9zqbfn8xx-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="14.48" y="33.5" dominantBaseline="ideographic">Knowledge base Sharing</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_qrk3iubfq1om-fill" data-item-order="2000000000" transform="translate(453, 129)"/>
      <g id="g-root-tx_publicai_13zw8gmbfn85q-fill" data-item-order="2000000000" transform="translate(345, 457)">
        <g id="tx_publicai_13zw8gmbfn85q-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="15.3" y="45.5" dominantBaseline="ideographic">Public AI-Powered Knowledge base</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_dg3l5ibfq39o-fill" data-item-order="2000000000" transform="translate(198, 144)"/>
      <g id="g-root-cu_1uqk3pybfq29z-fill" data-item-order="2000000000" transform="translate(198, 144)"/>
      <g id="g-root-cu_1hfq2fqbfq0p5-fill" data-item-order="2000000000" transform="translate(198, 144)"/>
      <g id="g-root-cu_1449k2ebfq2a3-fill" data-item-order="2000000000" transform="translate(198, 144)"/>
      <g id="g-root-tx_recordin_74z4mbflvr9-fill" data-item-order="2000000000" transform="translate(84, 162)">
        <g id="tx_recordin_74z4mbflvr9-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="13.93" y="33.5" dominantBaseline="ideographic">Recordings</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_qtfis6bfq0p9-fill" data-item-order="2000000000" transform="translate(582, 150)"/>
      <g id="g-root-cu_925iaebfq32g-fill" data-item-order="2000000000" transform="translate(582, 150)"/>
      <g id="g-root-cu_1usfizabfq1ai-fill" data-item-order="2000000000" transform="translate(582, 150)"/>
      <g id="g-root-cu_1qcm0uubfq22s-fill" data-item-order="2000000000" transform="translate(582, 150)"/>
      <g id="g-root-cu_142e4t2bfq39f-fill" data-item-order="2000000000" transform="translate(240, 123)"/>
      <g id="g-root-tx_automati_90edybflurl-fill" data-item-order="2000000000" transform="translate(603, 168)">
        <g id="tx_automati_90edybflurl-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12" y="33.5" dominantBaseline="ideographic">Automatic Note Taking</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_videos_1d1rzkmbflury-fill" data-item-order="2000000000" transform="translate(120, 198)">
        <g id="tx_videos_1d1rzkmbflury-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="15.39" y="33.5" dominantBaseline="ideographic">Videos</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_speechtr_1d3netybfltsa-fill" data-item-order="2000000000" transform="translate(603, 204)">
        <g id="tx_speechtr_1d3netybfltsa-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12.3" y="33.5" dominantBaseline="ideographic">Speech Transcription</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_youtubel_vb4g5ybfltzb-fill" data-item-order="2000000000" transform="translate(48, 234)">
        <g id="tx_youtubel_vb4g5ybfltzb-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="17.11" y="33.5" dominantBaseline="ideographic">YouTube Links</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_aipowere_v30a1ibfn7k3-fill" data-item-order="2000000000" transform="translate(603, 240)">
        <g id="tx_aipowere_v30a1ibfn7k3-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12" y="33.5" dominantBaseline="ideographic">AI-Powered Apps</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_document_dkgwrabflt6o-fill" data-item-order="2000000000" transform="translate(84, 270)">
        <g id="tx_document_dkgwrabflt6o-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12.96" y="33.5" dominantBaseline="ideographic">Documents</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_mbqleebfq2gx-fill" data-item-order="2000000000" transform="translate(393, 300)"/>
      <g id="g-root-tx_realtime_8vwrfabfn9xo-fill" data-item-order="2000000000" transform="translate(603, 276)">
        <g id="tx_realtime_8vwrfabfn9xo-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12" y="33.5" dominantBaseline="ideographic">Real-Time AI Chat</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_vahz2ubfq2v5-fill" data-item-order="2000000000" transform="translate(324, 413)"/>
      <g id="g-root-cu_1464zbqbfq1am-fill" data-item-order="2000000000" transform="translate(324, 413)"/>
      <g id="g-root-tx_earnfrom_m98p1ybfn7d3-fill" data-item-order="2000000000" transform="translate(345, 505)">
        <g id="tx_earnfrom_m98p1ybfn7d3-fill" stroke="none" fill="#484848">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12.95" y="33.5" dominantBaseline="ideographic">Earn from Your Contributions</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-cu_hznxsmbfq1ab-fill" data-item-order="2000000000" transform="translate(324, 413)"/>
      <g id="g-root-code_94nemubfj2fc-fill" data-item-order="3000000000" transform="translate(567, 114)"/>
      <g id="g-root-tx_buildund_qvxf4mbfj027-fill" data-item-order="3000000000" transform="translate(603, 117)">
        <g id="tx_buildund_qvxf4mbfj027-fill" stroke="none" fill="#ba5de5">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="16.33" y="33.5" dominantBaseline="ideographic">Build Understanding</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-1_1haq9qubfesxu-fill" data-item-order="3000000000" transform="translate(369, 198)"/>
      <g id="g-root-tx_knowledg_dbq9jqbfescp-fill" data-item-order="3000000000" transform="translate(363, 252)">
        <g id="tx_knowledg_dbq9jqbfescp-fill" stroke="none" fill="#969696">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="14.91" y="33.5" dominantBaseline="ideographic">Ainee</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-down_3e4lybfq2o9-fill" data-item-order="3000000000" transform="translate(198, 108)"/>
      <g id="g-root-shar_qtfis6bflvr7-fill" data-item-order="3000000000" transform="translate(309, 377)"/>
      <g id="g-root-tx_shareins_18kpj9ybflte2-fill" data-item-order="3000000000" transform="translate(345, 380)">
        <g id="tx_shareins_18kpj9ybflte2-fill" stroke="none" fill="#e0cb15">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="12.64" y="33.5" dominantBaseline="ideographic">Share Insights</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-tx_capturek_qpoo9ibfq2o8-fill" data-item-order="3000000000" transform="translate(12, 111)">
        <g id="tx_capturek_qpoo9ibfq2o8-fill" stroke="none" fill="#4e88e7">
          <g>
            <text style={{ font: "20px Roboto, sans-serif", whiteSpace: "pre" }} fontSize="20px" fontFamily="Roboto, sans-serif"><tspan x="13.38" y="33.5" dominantBaseline="ideographic">Capture Knowledge</tspan></text>
          </g>
        </g>
      </g>
      <g id="g-root-ro_13z9rdibfeuir-stroke" data-item-order="1999984880" transform="translate(333, 174)">
        <g id="ro_13z9rdibfeuir-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#808080" strokeWidth="2">
          <g>
            <path d="M 34 10L 106 10C 106 10 130 10 130 34L 130 112C 130 112 130 136 106 136L 34 136C 34 136 10 136 10 112L 10 34C 10 34 10 10 34 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-ro_1uuxfbqbfj0nd-stroke" data-item-order="1999986392" transform="translate(555, 102)">
        <g id="ro_1uuxfbqbfj0nd-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#ba5de5" strokeWidth="2">
          <g>
            <path d="M 22 10L 250 10C 250 10 262 10 262 22L 262 52C 262 52 262 64 250 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-ro_1lto5aubfq0wa-stroke" data-item-order="1999987040" transform="translate(0, 96)">
        <g id="ro_1lto5aubfq0wa-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#4e88e7" strokeWidth="2">
          <g>
            <path d="M 22 10L 238 10C 238 10 250 10 250 22L 250 52C 250 52 250 64 238 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-ro_dilhhybflu6c-stroke" data-item-order="1999989632" transform="translate(297, 365)">
        <g id="ro_dilhhybflu6c-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#e0cb15" strokeWidth="2">
          <g>
            <path d="M 22 10L 190 10C 190 10 202 10 202 22L 202 52C 202 52 202 64 190 64L 22 64C 22 64 10 64 10 52L 10 22C 10 22 10 10 22 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_knowledg_1q6d9zqbfn8xx-stroke" data-item-order="2000000000" transform="translate(345, 431)"/>
      <g id="g-root-cu_qrk3iubfq1om-stroke" data-item-order="2000000000" transform="translate(453, 129)">
        <g id="cu_qrk3iubfq1om-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 10 97L 16.4 97L 37 97C 50.254839 97.000008 61.000006 86.25484 61.000005 73.000005L 61 72.9L 61 34C 60.999999 20.745165 71.745164 9.999998 84.999998 9.999999L 85.1 10L 112 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_publicai_13zw8gmbfn85q-stroke" data-item-order="2000000000" transform="translate(345, 457)"/>
      <g id="g-root-cu_dg3l5ibfq39o-stroke" data-item-order="2000000000" transform="translate(198, 144)">
        <g id="cu_dg3l5ibfq39o-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 25 10L 25 25L 25 40L 17.5 40L 10 40"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1uqk3pybfq29z-stroke" data-item-order="2000000000" transform="translate(198, 144)">
        <g id="cu_1uqk3pybfq29z-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 25 10L 25 43L 25 76L 17.5 76L 10 76"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1hfq2fqbfq0p5-stroke" data-item-order="2000000000" transform="translate(198, 144)">
        <g id="cu_1hfq2fqbfq0p5-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 25 10L 25 61L 25 112L 17.5 112L 10 112"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1449k2ebfq2a3-stroke" data-item-order="2000000000" transform="translate(198, 144)">
        <g id="cu_1449k2ebfq2a3-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 25 10L 25 27.3L 25 136C 25.000003 142.627414 19.62742 147.999997 13.000003 147.999997L 12.9 148L 10 148"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_recordin_74z4mbflvr9-stroke" data-item-order="2000000000" transform="translate(84, 162)"/>
      <g id="g-root-cu_qtfis6bfq0p9-stroke" data-item-order="2000000000" transform="translate(582, 150)">
        <g id="cu_qtfis6bfq0p9-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 25L 10 40L 17.5 40L 25 40"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_925iaebfq32g-stroke" data-item-order="2000000000" transform="translate(582, 150)">
        <g id="cu_925iaebfq32g-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 43L 10 76L 17.5 76L 25 76"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1usfizabfq1ai-stroke" data-item-order="2000000000" transform="translate(582, 150)">
        <g id="cu_1usfizabfq1ai-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 61L 10 112L 17.5 112L 25 112"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1qcm0uubfq22s-stroke" data-item-order="2000000000" transform="translate(582, 150)">
        <g id="cu_1qcm0uubfq22s-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 27.3L 10 136C 10.000002 142.627414 15.372585 147.999997 22.000002 147.999997L 22.1 148L 25 148"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_142e4t2bfq39f-stroke" data-item-order="2000000000" transform="translate(240, 123)">
        <g id="cu_142e4t2bfq39f-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="4" stroke="#484848" strokeWidth="2" strokeDasharray="5.0, 7.0">
          <g>
            <path d="M 103 103L 97.2 103L 80.5 103C 67.245164 102.999996 56.499998 92.254831 56.499998 78.999997L 56.5 78.9L 56.5 34C 56.500001 20.745167 45.754835 10 32.5 10L 32.4 10L 10 10"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_automati_90edybflurl-stroke" data-item-order="2000000000" transform="translate(603, 168)"/>
      <g id="g-root-tx_videos_1d1rzkmbflury-stroke" data-item-order="2000000000" transform="translate(120, 198)"/>
      <g id="g-root-tx_speechtr_1d3netybfltsa-stroke" data-item-order="2000000000" transform="translate(603, 204)"/>
      <g id="g-root-tx_youtubel_vb4g5ybfltzb-stroke" data-item-order="2000000000" transform="translate(48, 234)"/>
      <g id="g-root-tx_aipowere_v30a1ibfn7k3-stroke" data-item-order="2000000000" transform="translate(603, 240)"/>
      <g id="g-root-tx_document_dkgwrabflt6o-stroke" data-item-order="2000000000" transform="translate(84, 270)"/>
      <g id="g-root-cu_mbqleebfq2gx-stroke" data-item-order="2000000000" transform="translate(393, 300)">
        <g id="cu_mbqleebfq2gx-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 42.5L 10 75"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_realtime_8vwrfabfn9xo-stroke" data-item-order="2000000000" transform="translate(603, 276)"/>
      <g id="g-root-cu_vahz2ubfq2v5-stroke" data-item-order="2000000000" transform="translate(324, 413)">
        <g id="cu_vahz2ubfq2v5-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 44L 10 78L 17.5 78L 25 78"/>
          </g>
        </g>
      </g>
      <g id="g-root-cu_1464zbqbfq1am-stroke" data-item-order="2000000000" transform="translate(324, 413)">
        <g id="cu_1464zbqbfq1am-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 25L 10 40L 17.5 40L 25 40"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_earnfrom_m98p1ybfn7d3-stroke" data-item-order="2000000000" transform="translate(345, 505)"/>
      <g id="g-root-cu_hznxsmbfq1ab-stroke" data-item-order="2000000000" transform="translate(324, 413)">
        <g id="cu_hznxsmbfq1ab-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#484848" stroke-width="2" stroke-dasharray="5.0, 7.0">
          <g>
            <path d="M 10 10L 10 23L 10 102C 10.000002 108.627415 15.372585 113.999998 22.000002 113.999997L 22.1 114L 25 114"/>
          </g>
        </g>
      </g>
      <g id="g-root-code_94nemubfj2fc-stroke" data-item-order="3000000000" transform="translate(567, 114)">
        <g id="code_94nemubfj2fc-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#ba5de5" stroke-width="2">
          <g>
            <path d="M 23.5625 26.14175C 27.1875 27.01675 29.8125 30.26675 29.8125 34.01675L 29.8125 35.26675M 19.812475 35.266624L 19.812475 25.266624C 19.812475 24.516624 20.312475 24.016624 21.062475 24.016624L 22.312475 24.016624C 23.0625 24.016624 23.5625 24.516624 23.5625 25.266624L 23.5625 35.266624M 19.812475 26.14175C 16.187475 27.01675 13.562475 30.26675 13.562475 34.01675L 13.562475 35.26675M 32.3125 37.766624C 32.3125 38.516624 31.8125 39.016624 31.0625 39.016624L 12.312475 39.016624C 11.562475 39.016624 11.06247 38.516624 11.06247 37.766624L 11.06247 36.516624C 11.06247 35.766624 11.562475 35.266624 12.312475 35.266624L 31.0625 35.266624C 31.8125 35.266624 32.3125 35.766624 32.3125 36.516624L 32.3125 37.766624ZM 21.437525 20.245926L 21.437525 12.233313C 21.437525 11.483313 21.937525 10.983315 22.6875 10.983315L 34.6875 10.983315C 34.9375 10.983315 35.3125 11.108314 35.4375 11.233314L 38.4375 13.733313C 38.6875 13.983313 38.9375 14.358313 38.9375 14.733313L 38.9375 30.358374C 38.9375 31.108376 38.4375 31.608374 37.6875 31.608374L 34.6875 31.608374M 10 10M 26.4375 16.233288L 24.5625 18.108288L 26.4375 19.983288M 10 10M 33.9375 16.233288L 35.8125 18.108288L 33.9375 19.983288M 10 10M 28.9375 20.608326L 31.4375 14.983325"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_buildund_qvxf4mbfj027-stroke" data-item-order="3000000000" transform="translate(603, 117)"/>
      <g id="g-root-1_1haq9qubfesxu-stroke" data-item-order="3000000000" transform="translate(369, 198)">
        <g id="1_1haq9qubfesxu-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#969696" stroke-width="2">
          <g>
            <path d="M 50.507999 37L 56 37C 56.552284 37 57 36.552284 57 36L 57 32C 57 31.447716 56.552284 31 56 31L 50.506001 31C 50.098236 28.972794 49.425812 27.007969 48.506001 25.156L 52.389999 21.271999C 52.78038 20.8815 52.78038 20.248501 52.389999 19.858L 48.139999 15.616C 47.7495 15.225618 47.116501 15.225618 46.726002 15.616L 42.84 19.5C 40.989571 18.579855 39.026024 17.907406 37 17.5L 37 12C 37 11.447716 36.552284 11 36 11L 32 11C 31.447716 11 31 11.447716 31 12L 31 17.496C 28.973339 17.903418 27.009132 18.575863 25.158001 19.496L 21.271999 15.614C 20.8815 15.223618 20.248501 15.223618 19.858 15.614L 15.614 19.858C 15.223618 20.248501 15.223618 20.8815 15.614 21.271999L 19.5 25.158001C 18.673981 26.767546 18.061478 28.47798 17.677999 30.246C 17.565563 30.689018 17.167063 30.99942 16.709999 31L 12 31C 11.447716 31 11 31.447716 11 32L 11 36C 11 36.552284 11.447716 37 12 37L 17.492001 37C 17.900402 39.026394 18.572803 40.990475 19.492001 42.841999L 15.614 46.728001C 15.223618 47.1185 15.223618 47.751499 15.614 48.141998L 20.563999 53.091999L 25.164 48.492001C 27.012653 49.416676 28.974775 50.094475 31 50.508003L 31 56C 31 56.552284 31.447716 57 32 57L 36 57C 36.552284 57 37 56.552284 37 56L 37 50.507999C 39.025837 50.099899 40.989296 49.427483 42.84 48.508003L 46.728001 52.394001C 47.1185 52.784382 47.751499 52.784382 48.141998 52.394001L 52.383999 48.150002C 52.774384 47.759499 52.774384 47.126499 52.383999 46.736L 48.5 42.841999C 49.421959 40.990868 50.097054 39.026772 50.507999 37ZM 35 43L 26 43C 25.447716 43 25 42.552284 25 42L 25 25.618C 25.000011 25.271271 25.17963 24.949295 25.474657 24.767143C 25.769684 24.584991 26.138014 24.568665 26.448 24.723999L 35 29ZM 35 31L 44 31C 44.552284 31 45 31.447716 45 32L 45 42C 45 42.552284 44.552284 43 44 43L 35 43M 25 31L 30 31M 25 35L 30 35M 35 29L 35 24M 43 31L 43 26M 35 35L 40 35M 35 39L 40 39"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_knowledg_dbq9jqbfescp-stroke" data-item-order="3000000000" transform="translate(363, 252)"/>
      <g id="g-root-down_3e4lybfq2o9-stroke" data-item-order="3000000000" transform="translate(198, 108)">
        <g id="down_3e4lybfq2o9-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#4e88e7" stroke-width="2">
          <g>
            <path d="M 24.15625 25.01125C 24.15556 25.946194 23.397444 26.703751 22.4625 26.703751L 12.3075 26.703751C 11.372758 26.703751 10.615 25.945992 10.615 25.01125L 10.615 12.3175C 10.615 11.382758 11.372758 10.625 12.3075 10.625L 18.94125 10.625C 19.390589 10.626136 19.821005 10.806038 20.137501 11.125L 23.66 14.64625C 23.979151 14.96313 24.159058 15.394006 24.16 15.84375ZM 22.1775 35.081249L 16.5525 35.081249C 15.862144 35.081249 15.3025 34.521606 15.3025 33.831249L 15.3025 30.543749M 24.15625 22.4725L 21.04875 18.922501C 20.836216 18.677683 20.528399 18.536455 20.204201 18.535017C 19.880003 18.533581 19.570946 18.672075 19.356251 18.915001L 15.6925 23.040001L 13.66125 21.415001C 13.213445 21.055731 12.566954 21.091288 12.16125 21.497499L 10.615 23.036249M 14.83375 15C 15.524106 15 16.08375 15.559644 16.08375 16.25C 16.08375 16.940355 15.524106 17.5 14.83375 17.5C 14.143394 17.5 13.58375 16.940355 13.58375 16.25C 13.58375 15.559644 14.143394 15 14.83375 15M 19.6775 37.581249L 22.1775 35.081249L 19.6775 32.581249M 33.759998 28.574999C 36.866249 28.574999 39.384998 27.768749 39.384998 26.775C 39.384998 25.78125 36.866249 24.974998 33.759998 24.974998C 30.653751 24.974998 28.135 25.78125 28.135 26.775C 28.135 27.768749 30.6525 28.574999 33.759998 28.574999ZM 28.135 32.174999L 28.135 26.775M 39.384998 26.775L 39.384998 32.174999M 39.384998 32.174999L 39.384998 37.575001C 39.384998 38.575001 36.866249 39.375 33.759998 39.375C 30.653751 39.375 28.135 38.568748 28.135 37.575001L 28.135 32.174999M 39.384998 30.299999C 39.384998 31.300001 36.866249 32.099998 33.759998 32.099998C 30.653751 32.099998 28.135 31.293751 28.135 30.299999M 39.384998 34.049999C 39.384998 35.050003 36.866249 35.849998 33.759998 35.849998C 30.653751 35.849998 28.135 35.043751 28.135 34.049999"/>
          </g>
        </g>
      </g>
      <g id="g-root-shar_qtfis6bflvr7-stroke" data-item-order="3000000000" transform="translate(309, 377)">
        <g id="shar_qtfis6bflvr7-stroke" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="4" stroke="#e0cb15" stroke-width="2">
          <g>
            <path d="M 24.375 32.8125C 24.375 34.365803 25.634199 35.625 27.1875 35.625C 28.740801 35.625 30 34.365803 30 32.8125C 30 31.259197 28.740801 30 27.1875 30C 25.634199 30 24.375 31.259197 24.375 32.8125ZM 33.75 36.5625C 33.75 38.115803 35.009197 39.375 36.5625 39.375C 38.115803 39.375 39.375 38.115803 39.375 36.5625C 39.375 35.009197 38.115803 33.75 36.5625 33.75C 35.009197 33.75 33.75 35.009197 33.75 36.5625ZM 33.75 27.1875C 33.75 28.740801 35.009197 30 36.5625 30C 38.115803 30 39.375 28.740801 39.375 27.1875C 39.375 25.634199 38.115803 24.375 36.5625 24.375C 35.009197 24.375 33.75 25.634199 33.75 27.1875ZM 29.59375 31.36875L 34.15625 28.63125M 29.797501 33.857502L 33.952499 35.518753M 36.848751 21.875C 36.866249 21.668751 36.875 21.460001 36.875 21.25C 36.875 15.38375 31 10.625 23.75 10.625C 16.5 10.625 10.625 15.38375 10.625 21.25C 10.691606 24.175938 12.078425 26.914656 14.3975 28.699999L 11.875 34.375L 18.921249 31.125C 19.885628 31.427635 20.876846 31.636929 21.88125 31.75"/>
          </g>
        </g>
      </g>
      <g id="g-root-tx_shareins_18kpj9ybflte2-stroke" data-item-order="3000000000" transform="translate(345, 380)"/>
      <g id="g-root-tx_capturek_qpoo9ibfq2o8-stroke" data-item-order="3000000000" transform="translate(12, 111)"/>
    </g>
  </g>
    </svg>
  );
} 