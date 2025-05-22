'use client';

import ApiLibs from '@/lib/ApiLibs';
import { v4 as uuidv4 } from 'uuid';
import { ChatStartType, ChatAvailableStatusResponse, RagChatRequest, MessageResponse } from '@/types/chatTypes';

export class ChatService {
  /**
   * 检查聊天是否可用
   * @param contentId 内容ID
   * @param chatStartType 聊天类型
   * @returns 聊天状态响应
   */
  public static async checkChatAvailability(
    contentId: string,
    chatStartType: ChatStartType
  ): Promise<ChatAvailableStatusResponse> {
    try {
      // 拼接查询参数到URL
      const url = `/api/chat/chat_available_status?chat_start_type=${encodeURIComponent(chatStartType)}&uid=${encodeURIComponent(contentId)}`;
      // 用ApiLibs的httpRequest.request方法发GET请求
      const response = await ApiLibs.chat.httpRequest.request({
        method: 'GET',
        url,
        headers: {
          'Accept': 'application/json'
        }
      });
      const res: any = response;
      if (res.data) {
        return {
          status: res.data.status || 'unavailable',
          message: res.data.message
        };
      }
      return { status: 'unavailable' };
    } catch (error) {
      console.error('Error checking chat availability:', error);
      return { status: 'unavailable', message: 'Failed to check chat availability' };
    }
  }

  /**
   * 发送聊天消息并获取流式响应
   * @param contentId 内容ID
   * @param question 用户问题
   * @param chatStartType 聊天类型
   * @param quoteText 引用文本（可选）
   * @returns 流式响应解析器
   */
  public static async sendMessage(
    contentId: string,
    question: string,
    chatStartType: ChatStartType,
    quoteText?: string
  ): Promise<{
    msgId: string;
    stream: ReadableStream<Uint8Array> | null;
  }> {
    const msgId = uuidv4();
    
    const requestBody = {
      question,
      msg_id: msgId,
      chat_start_type: chatStartType,
      uid: contentId,
      quote_text: quoteText
    };
    
    try {
      console.log('Sending message with request body:', JSON.stringify(requestBody, null, 2));
      
      // 使用环境变量获取API基础URL，或使用默认值
      const IS_DEV_ENV = process.env.NODE_ENV !== 'production';
      const DEV_BASE_URL = 'http://10.255.10.182:8000';
      const PRO_BASE_URL = 'https://api.ainee.com';
      const BASE_URL = IS_DEV_ENV ? DEV_BASE_URL : PRO_BASE_URL;
      
      // 构建完整的API URL
      const apiUrl = `${BASE_URL}/api/chat/stream_agent_chat`;
      console.log('Using API URL:', apiUrl);
      
      // 从localStorage获取认证令牌 - 修正为正确的token键名
      const token = localStorage.getItem('ainee_token') || '';
      
      // 发送POST请求获取流式响应
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'A-Platform': 'ainee_web',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}, ${response.statusText}`);
      }
      
      // 确保响应是流
      if (!response.body) {
        throw new Error('Response does not contain a body stream');
      }
      
      console.log('Successfully got stream response from fetch');
      
      return {
        msgId,
        stream: response.body
      };
    } catch (error) {
      console.error('Error details in sendMessage:', error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to send message: ${error.message}`);
      } else {
        throw new Error('Failed to send message: Unknown error');
      }
    }
  }
  
  /**
   * 解析流式响应
   * @param stream 流式响应
   * @param onMessage 消息回调
   */
  public static async parseStreamResponse(
    stream: ReadableStream<Uint8Array>,
    onMessage: (message: MessageResponse) => void
  ): Promise<void> {
    try {
      console.log('Starting to parse stream response');
      const reader = stream.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('Stream reading complete');
            // 处理缓冲区中可能剩余的数据
            if (buffer.trim()) {
              try {
                console.log('Processing final buffer:', buffer.trim());
                const decodedLine = this.decodeUnicode(buffer.trim());
                const msg = JSON.parse(decodedLine);
                console.log('Final message parsed:', msg);
                const normalizedMsg = this.normalizeMessage(msg);
                onMessage(normalizedMsg);
              } catch (err) {
                console.error('Error parsing final buffer:', err);
              }
            }
            break;
          }
          
          // 解码收到的数据块
          const chunk = decoder.decode(value, { stream: true });
          console.log('Raw chunk received:', chunk);
          buffer += chunk;
          
          // 按行处理数据
          const lines = buffer.split('\n');
          // 保留最后一个可能不完整的行
          buffer = lines.pop() || '';
          
          // 处理每一行（完整的JSON）
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              console.log('Processing line:', line.trim());
              // 解析 Unicode 转义序列
              const decodedLine = this.decodeUnicode(line.trim());
              const msg = JSON.parse(decodedLine);
              console.log('Message parsed:', msg);
              
              // 检查消息状态
              if (msg.status === 'error') {
                console.error('Error status in message:', msg.error_message || 'Unknown error');
              }
              
              // 标准化消息并回调
              const normalizedMsg = this.normalizeMessage(msg);
              onMessage(normalizedMsg);
            } catch (err) {
              console.error('Error parsing JSON line:', err);
              // 不会中断处理，继续处理后续数据
            }
          }
        }
      } catch (streamError) {
        console.error('Error reading from stream:', streamError);
        throw streamError;
      } finally {
        // 确保释放读取器
        try {
          reader.releaseLock();
          console.log('Stream reader released');
        } catch (e) {
          console.warn('Error releasing reader lock:', e);
        }
      }
    } catch (error) {
      console.error('Fatal stream parsing error:', error);
      throw new Error('Failed to parse stream response: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * 标准化消息格式
   * @param message 原始消息
   * @returns 标准化后的消息
   */
  private static normalizeMessage(message: any): MessageResponse {
    return {
      msg_id: message.msg_id || '',
      content: message.content || '',
      reference: Array.isArray(message.reference) ? message.reference : 
                 (message.reference === null ? [] : [message.reference]),
      status: message.status || 'processing',
      error_message: message.error_message,
      followup_question: Array.isArray(message.followup_question) ? message.followup_question : 
                         (message.followup_question === null ? [] : [message.followup_question])
    };
  }

  /**
   * 解码 Unicode 转义序列
   * 参考 Flutter 实现，将 \uXXXX 形式的转义序列转换为实际字符
   */
  private static decodeUnicode(unicodeString: string): string {
    return unicodeString.replace(/\\u([0-9a-fA-F]{4})/g, (match, hexCode) => {
      const codePoint = parseInt(hexCode, 16);
      return String.fromCharCode(codePoint);
    });
  }

  /**
   * 测试API服务器连接
   * @returns 服务器是否可用
   */
  public static async testApiConnection(): Promise<boolean> {
    try {
      console.log('Testing API connection via ApiLibs...');
      
      // 使用简单的API请求测试连接
      const response = await ApiLibs.content.getUserContentsApiContentUserContentsGet();
      
      console.log('API connection test result:', response);
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
} 