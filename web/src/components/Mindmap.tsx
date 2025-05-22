'use client';

import React, { useEffect, useRef, useState } from "react";
import { Tree, TreeProps, Button, Tooltip } from "antd";
import { DownOutlined, ZoomInOutlined, ZoomOutOutlined, DownloadOutlined, ReloadOutlined, FullscreenOutlined } from "@ant-design/icons";
import { Transformer } from "markmap-lib/no-plugins";
import { Markmap } from "markmap-view";
import { pluginFrontmatter } from "markmap-lib/plugins";

// 自定义Tree组件样式
const treeStyles = {
  width: '100%',
  padding: '8px',
  backgroundColor: 'white',
  borderRadius: '4px'
};

// 辅助函数：提取文本内容，移除HTML标签
function extractText(node: any): any {
  if (typeof node.content === 'string' && node.content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(node.content, 'text/html');
    if (doc.body.textContent) {
      node.content = doc.body.textContent;
      node.key = Math.random().toString(36).substring(7);
    } else {
      delete node.content;
    }
  }
  if (node.children && node.children.length) {
    // node.children = node.children.map(extractText); // 递归处理子节点
    node.children = node.children
      .map(extractText).filter((child: any) => Object.keys(child).length > 0);
  } else {
    delete node.children;
  }
  return node;
}

// 将markdown节点转换为树形结构
function transformToTreeData(root: any): any[] {
  if (!root) return [];

  // 递归函数处理节点
  function processNode(node: any, key = '0'): any {
    if (!node) return null;

    const children = node.children || [];
    const nodeData = {
      key,
      title: node.content || extractText(node).content,
      children: children.map((child: any, index: number) => 
        processNode(child, `${key}-${index}`))
        .filter(Boolean)
    };

    return nodeData;
  }

  return [processNode(root)].filter(Boolean);
}

function Mindmap({chart}:{chart: string}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [typeValue, setTypeValue] = React.useState('html');
    const [treeData, setTreeData] = useState<any[]>([]);
    const [markmapInstance, setMarkmapInstance] = useState<any>(null);
    const [scale, setScale] = useState(1);
    const transformer = new Transformer([pluginFrontmatter]);

    const { root, features } = transformer.transform(chart);

    useEffect(() => {
        const cleanRoot = extractText(root);
        if (root.children) {
            setTreeData(cleanRoot.children);
        }
    }, [chart]);

    useEffect(() => {
        // 添加水印到SVG
        const addWatermark = () => {
            if (svgRef.current && typeValue === 'svg') {
                const svg = svgRef.current;
                
                try {
                    // 检查是否已存在水印，避免重复添加
                    const existingWatermark = svg.querySelector('.ainee-watermark-pattern');
                    if (existingWatermark) return;
                    
                    // 创建水印图案定义
                    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                    pattern.setAttribute("id", "watermarkPattern");
                    pattern.setAttribute("patternUnits", "userSpaceOnUse");
                    pattern.setAttribute("width", "200");
                    pattern.setAttribute("height", "200");
                    pattern.setAttribute("patternTransform", "rotate(45)");
                    pattern.setAttribute("class", "ainee-watermark-pattern");
                    
                    // 创建单个水印文本元素
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", "0");
                    text.setAttribute("y", "50");
                    text.setAttribute("font-family", "Arial, sans-serif");
                    text.setAttribute("font-size", "20");  // 移除px单位
                    text.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                    text.textContent = "ainee.com";
                    
                    // 添加文本到图案中
                    pattern.appendChild(text);
                    
                    // 创建第二个水印文本，错开排列
                    const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text2.setAttribute("x", "100");
                    text2.setAttribute("y", "150");
                    text2.setAttribute("font-family", "Arial, sans-serif");
                    text2.setAttribute("font-size", "20");  // 移除px单位
                    text2.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                    text2.textContent = "ainee.com";
                    
                    pattern.appendChild(text2);
                    defs.appendChild(pattern);
                    
                    // 将定义添加到SVG
                    svg.appendChild(defs);
                    
                    // 添加覆盖整个SVG的矩形，使用水印图案填充
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("width", "100%");
                    rect.setAttribute("height", "100%");
                    rect.setAttribute("fill", "url(#watermarkPattern)");
                    rect.setAttribute("class", "ainee-watermark-overlay");
                    rect.setAttribute("pointer-events", "none"); // 确保水印不会阻止与底层SVG的交互
                    
                    // 将水印矩形插入到SVG的第一个元素之前，确保它位于内容下方
                    const firstChild = svg.firstChild;
                    if (firstChild) {
                        svg.insertBefore(rect, firstChild);
                    } else {
                        svg.appendChild(rect);
                    }
                } catch (error) {
                    console.warn('添加水印时出错:', error);
                }
            }
        };
        
        // 当类型切换到SVG时，等待SVG渲染完成再添加水印
        if (typeValue === 'svg') {
            const timer = setTimeout(addWatermark, 500);
            return () => clearTimeout(timer);
        }
    }, [typeValue, markmapInstance]);

    const onValueChange = (val: React.SetStateAction<string>) => {
        setTypeValue(val);
        if (!root.children) return;
        setTimeout(() => {
            if (val === 'svg' && svgRef.current) {
                const mm = Markmap.create(svgRef.current, {
                    autoFit: true,
                    initialExpandLevel: 3,
                }, root);
                setMarkmapInstance(mm);
                setScale(1); // Reset scale when switching to mindmap view
            }
        })
    }

    const onSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
        console.log('selected', selectedKeys, info);
    };

    const getExpandedKeys = () => {
        const keys: any[] = [];

        const traverse = (nodes: any, level:number) => {
            if (!nodes || !nodes.length) return;

            for (const node of nodes) {
                if (level < 1) {
                    keys.push(node.key);
                }
                if (node.children) {
                    traverse(node.children, level + 1);
                }
            }
        };

        traverse(treeData, 0);
        return keys;
    }

    // 放大
    const handleZoomIn = () => {
        if (markmapInstance && scale < 2) {
            try {
                const newScale = scale + 0.1;
                // markmap-view库不支持直接设置zoom属性，使用正确的缩放方法
                const { svg } = markmapInstance;
                if (!svg) return;
                
                const g = svg.select('g');
                if (!g || !g.attr) return;
                
                const transform = g.attr('transform') || '';
                const match = /scale\(([\d.]+)\)/.exec(transform) || [];
                const currentScale = parseFloat(match[1] || '1');
                const newTransform = transform.replace(
                    /scale\([\d.]+\)/, 
                    `scale(${currentScale * 1.1})`
                );
                g.attr('transform', newTransform);
                setScale(newScale);
            } catch (error) {
                console.warn('缩放操作出错:', error);
            }
        }
    };

    // 缩小
    const handleZoomOut = () => {
        if (markmapInstance && scale > 0.5) {
            try {
                const newScale = scale - 0.1;
                // 使用正确的缩放方法
                const { svg } = markmapInstance;
                if (!svg) return;
                
                const g = svg.select('g');
                if (!g || !g.attr) return;
                
                const transform = g.attr('transform') || '';
                const match = /scale\(([\d.]+)\)/.exec(transform) || [];
                const currentScale = parseFloat(match[1] || '1');
                const newTransform = transform.replace(
                    /scale\([\d.]+\)/, 
                    `scale(${currentScale * 0.9})`
                );
                g.attr('transform', newTransform);
                setScale(newScale);
            } catch (error) {
                console.warn('缩放操作出错:', error);
            }
        }
    };

    // 重置视图
    const handleReset = () => {
        if (markmapInstance) {
            try {
                // 调用markmap的fit方法重置视图
                markmapInstance.fit();
                setScale(1);
                
                // 重置后重新添加水印，确保水印位置正确
                setTimeout(() => {
                    if (svgRef.current) {
                        try {
                            // 移除现有水印元素
                            const existingOverlay = svgRef.current.querySelector('.ainee-watermark-overlay');
                            const existingPattern = svgRef.current.querySelector('.ainee-watermark-pattern');
                            
                            if (existingOverlay) {
                                existingOverlay.remove();
                            }
                            
                            if (existingPattern && existingPattern.parentNode) {
                                // 修复ParentNode的remove方法问题
                                const parent = existingPattern.parentNode;
                                if (parent instanceof Element) {
                                    parent.remove();
                                } else if (parent && 'removeChild' in parent) {
                                    parent.removeChild(existingPattern);
                                }
                            }
                            
                            // 创建水印图案定义
                            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                            const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                            pattern.setAttribute("id", "watermarkPattern");
                            pattern.setAttribute("patternUnits", "userSpaceOnUse");
                            pattern.setAttribute("width", "200");
                            pattern.setAttribute("height", "200");
                            pattern.setAttribute("patternTransform", "rotate(45)");
                            pattern.setAttribute("class", "ainee-watermark-pattern");
                            
                            // 创建单个水印文本元素
                            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            text.setAttribute("x", "0");
                            text.setAttribute("y", "50");
                            text.setAttribute("font-family", "Arial, sans-serif");
                            text.setAttribute("font-size", "20");  // 移除px单位
                            text.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                            text.textContent = "ainee.com";
                            
                            // 添加文本到图案中
                            pattern.appendChild(text);
                            
                            // 创建第二个水印文本，错开排列
                            const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
                            text2.setAttribute("x", "100");
                            text2.setAttribute("y", "150");
                            text2.setAttribute("font-family", "Arial, sans-serif");
                            text2.setAttribute("font-size", "20");  // 移除px单位
                            text2.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                            text2.textContent = "ainee.com";
                            
                            pattern.appendChild(text2);
                            defs.appendChild(pattern);
                            
                            // 将定义添加到SVG
                            svgRef.current.appendChild(defs);
                            
                            // 添加覆盖整个SVG的矩形，使用水印图案填充
                            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                            rect.setAttribute("width", "100%");
                            rect.setAttribute("height", "100%");
                            rect.setAttribute("fill", "url(#watermarkPattern)");
                            rect.setAttribute("class", "ainee-watermark-overlay");
                            rect.setAttribute("pointer-events", "none"); // 确保水印不会阻止与底层SVG的交互
                            
                            // 将水印矩形插入到SVG的第一个元素之前，确保它位于内容下方
                            const firstChild = svgRef.current.firstChild;
                            if (firstChild) {
                                svgRef.current.insertBefore(rect, firstChild);
                            } else {
                                svgRef.current.appendChild(rect);
                            }
                        } catch (error) {
                            console.warn('重置水印时出错:', error);
                        }
                    }
                }, 300);
            } catch (error) {
                console.warn('重置视图出错:', error);
            }
        }
    };

    // 下载SVG
    const handleDownload = () => {
        if (svgRef.current) {
            try {
                // 确保在下载前水印存在
                const existingPattern = svgRef.current.querySelector('.ainee-watermark-pattern');
                if (!existingPattern) {
                    // 如果没有水印，添加水印
                    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
                    const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                    pattern.setAttribute("id", "watermarkPattern");
                    pattern.setAttribute("patternUnits", "userSpaceOnUse");
                    pattern.setAttribute("width", "200");
                    pattern.setAttribute("height", "200");
                    pattern.setAttribute("patternTransform", "rotate(45)");
                    pattern.setAttribute("class", "ainee-watermark-pattern");
                    
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", "0");
                    text.setAttribute("y", "50");
                    text.setAttribute("font-family", "Arial, sans-serif");
                    text.setAttribute("font-size", "20");  // 移除px单位
                    text.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                    text.textContent = "ainee.com";
                    pattern.appendChild(text);
                    
                    const text2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text2.setAttribute("x", "100");
                    text2.setAttribute("y", "150");
                    text2.setAttribute("font-family", "Arial, sans-serif");
                    text2.setAttribute("font-size", "20");  // 移除px单位
                    text2.setAttribute("fill", "rgba(125, 125, 125, 0.15)");
                    text2.textContent = "ainee.com";
                    pattern.appendChild(text2);
                    
                    defs.appendChild(pattern);
                    svgRef.current.appendChild(defs);
                    
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    rect.setAttribute("width", "100%");
                    rect.setAttribute("height", "100%");
                    rect.setAttribute("fill", "url(#watermarkPattern)");
                    rect.setAttribute("class", "ainee-watermark-overlay");
                    rect.setAttribute("pointer-events", "none");
                    
                    const firstChild = svgRef.current.firstChild;
                    if (firstChild) {
                        svgRef.current.insertBefore(rect, firstChild);
                    } else {
                        svgRef.current.appendChild(rect);
                    }
                }
                
                const svgData = new XMLSerializer().serializeToString(svgRef.current);
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                const svgUrl = URL.createObjectURL(svgBlob);
                
                const downloadLink = document.createElement('a');
                downloadLink.href = svgUrl;
                downloadLink.download = 'ainee-mindmap.svg';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(svgUrl);
            } catch (error) {
                console.warn('下载SVG时出错:', error);
            }
        }
    };

    // 全屏显示
    const handleFullscreen = () => {
        if (svgRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                svgRef.current.parentElement?.requestFullscreen().then(() => {
                    // 进入全屏后延迟调用重置视图，以确保DOM已更新
                    setTimeout(() => {
                        if (markmapInstance) {
                            markmapInstance.fit();
                        }
                    }, 300);
                }).catch(err => {
                    console.error("全屏显示错误:", err);
                });
            }
        }
    };

    // 监听全屏状态变化
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (document.fullscreenElement && markmapInstance) {
                // 全屏状态下自动重置视图
                setTimeout(() => {
                    markmapInstance.fit();
                }, 300);
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [markmapInstance]);

    if (!chart) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p>No mind map data available. Please generate a summary first.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* 固定在顶部的选项卡 */}
            <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10 py-1">
                <button
                    className={`py-2 px-4 text-sm font-medium ${
                        typeValue === "html"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => onValueChange("html")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         className="inline-block w-4 h-4 mr-1">
                        <path d="M21 12h-8"></path>
                        <path d="M21 6H8"></path>
                        <path d="M21 18h-8"></path>
                        <path d="M3 6v4c0 1.1.9 2 2 2h3"></path>
                        <path d="M3 10v6c0 1.1.9 2 2 2h3"></path>
                    </svg>
                    Tree View
                </button>
                <button
                    className={`py-2 px-4 text-sm font-medium ${
                        typeValue === "svg"
                            ? "border-b-2 border-blue-500 text-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => onValueChange("svg")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                         className="inline-block w-4 h-4 mr-1">
                        <rect width="8" height="8" x="3" y="3" rx="2"></rect>
                        <path d="M7 11v4a2 2 0 0 0 2 2h4"></path>
                        <rect width="8" height="8" x="13" y="13" rx="2"></rect>
                    </svg>
                    Mind Map
                </button>
            </div>

            {/* 内容区域，可以滚动 */}
            <div className="flex-1 overflow-auto mt-2">
                {typeValue === "html" ? (
                    <div className="h-full bg-gray-50 p-4 rounded">
                        {treeData.length > 0 && (
                            <Tree
                                className="w-full"
                                fieldNames={{ title: 'content' }}
                                showLine
                                defaultExpandedKeys={getExpandedKeys()}
                                switcherIcon={<DownOutlined />}
                                onSelect={onSelect}
                                treeData={treeData}
                            />
                        )}
                    </div>
                ) : (
                    <div className="relative h-[400px] bg-gray-50 rounded">
                        {/* 工具栏 */}
                        <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm rounded-md shadow-sm p-1 flex gap-1">
                            <Tooltip title="Zoom In">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<ZoomInOutlined />} 
                                    onClick={handleZoomIn}
                                />
                            </Tooltip>
                            <Tooltip title="Zoom Out">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<ZoomOutOutlined />} 
                                    onClick={handleZoomOut}
                                />
                            </Tooltip>
                            <Tooltip title="Reset View">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<ReloadOutlined />} 
                                    onClick={handleReset}
                                />
                            </Tooltip>
                            <Tooltip title="Download SVG">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<DownloadOutlined />} 
                                    onClick={handleDownload}
                                />
                            </Tooltip>
                            <Tooltip title="Fullscreen">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<FullscreenOutlined />} 
                                    onClick={handleFullscreen}
                                />
                            </Tooltip>
                        </div>
                        <svg ref={svgRef} style={{width: "100%", height: '100%'}}></svg>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Mindmap; 