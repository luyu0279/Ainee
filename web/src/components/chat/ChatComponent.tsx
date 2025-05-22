'use client';

import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatStartType, ChatComponentProps, ChatMessage, MessageResponse } from '@/types/chatTypes';
import { ChatService } from '@/services/chatService';
import { ChatHistoryService } from '@/services/chatHistoryService';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';

const ChatComponent: React.FC<ChatComponentProps> = ({
  contentId,
  contentTitle,
  chatStartType
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatAvailable, setIsChatAvailable] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatHistoryService = useRef(new ChatHistoryService()).current;
  // 添加一个标识，用于记录是否已经检查过聊天可用性
  const hasCheckedAvailability = useRef<boolean>(false);

  // 添加欢迎消息
  const addWelcomeMessage = () => {
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      type: 'bot',
      content: "Hey! I'm Ainee, your friendly AI assistant. What do you need help with?",
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
    return welcomeMessage;
  };

  // 检查聊天是否可用
  const checkChatAvailability = async () => {
    // 如果已经检查过，直接返回当前状态
    if (hasCheckedAvailability.current) {
      return isChatAvailable;
    }

    try {
      const result = await ChatService.checkChatAvailability(contentId, chatStartType);
      const isAvailable = result.status === 'available';
      setIsChatAvailable(isAvailable);
      hasCheckedAvailability.current = true;
      return isAvailable;
    } catch (error) {
      console.error('Error checking chat availability:', error);
      setIsChatAvailable(false);
      hasCheckedAvailability.current = true;
      return false;
    }
  };

  // 在组件加载时加载聊天历史
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        
        // 首先测试API连接
        const isApiAvailable = await ChatService.testApiConnection();
        if (!isApiAvailable) {
          console.error('API server is unreachable');
          setMessages([{
            id: uuidv4(),
            type: 'bot',
            content: 'Cannot connect to chat service. Please try again later.',
            timestamp: Date.now(),
            status: 'error',
            error_message: 'API server is unreachable'
          }]);
          setHasError(true);
          setIsLoadingHistory(false);
          return;
        }
        
        // 检查聊天是否可用
        const isAvailable = await checkChatAvailability();
        
        if (!isAvailable) {
          setIsChatAvailable(false);
          setIsLoadingHistory(false);
          return;
        }
        
        // 加载聊天历史
        const chatHistory = await chatHistoryService.getChatHistory(contentId);
        
        if (chatHistory.length > 0) {
          setMessages(chatHistory);
        } else {
          // 添加欢迎消息
          const welcomeMessage = addWelcomeMessage();
          setMessages([welcomeMessage]);
          await chatHistoryService.saveChatHistory(contentId, [welcomeMessage]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setHasError(true);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [contentId, chatStartType]);

  // 滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 处理发送消息
  const handleSendMessage = async (content: string) => {
    if (isProcessing) return;
    
    setHasError(false);
    setIsProcessing(true);
    
    // 创建用户消息
    const userMessage: ChatMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: Date.now()
    };
    
    // 创建AI响应的占位符
    const botMessageId = uuidv4();
    const botMessage: ChatMessage = {
      id: botMessageId,
      type: 'bot',
      content: '',
      timestamp: Date.now(),
      status: 'processing'
    };
    
    // 更新UI和消息历史
    const updatedMessages = [...messages, userMessage, botMessage];
    setMessages(updatedMessages);
    await chatHistoryService.saveChatHistory(contentId, updatedMessages);
    
    try {
      // 在用户发送消息时检查聊天可用性
      const isAvailable = await checkChatAvailability();
      
      if (!isAvailable) {
        // 聊天不可用
        const errorMessage: ChatMessage = {
          ...botMessage,
          status: 'error',
          error_message: 'Content is not ready for chat',
          content: 'Content is not ready for chat'
        };
        
        // 更新错误消息
        const messagesWithError = [...messages, userMessage, errorMessage];
        setMessages(messagesWithError);
        await chatHistoryService.saveChatHistory(contentId, messagesWithError);
        setHasError(true);
        return;
      }
      
      // 使用修改后的sendMessage方法发送消息
      console.log('Sending message to API:', content);
      const { msgId, stream } = await ChatService.sendMessage(
        contentId,
        content,
        chatStartType
      );
      
      if (!stream) {
        throw new Error('Failed to get stream response');
      }
      
      // 实时更新AI回复
      let responseContent = '';
      let latestMessage: MessageResponse | null = null;
      
      console.log('Starting to parse stream response');
      
      // 解析流式响应，每次收到新消息都会更新UI
      await ChatService.parseStreamResponse(stream, (message: MessageResponse) => {
        console.log('Received message update:', message);
        
        // 更新最新的消息内容
        responseContent = message.content || responseContent;
        latestMessage = message;
        
        // 创建更新后的bot消息
        const updatedBotMessage: ChatMessage = {
          ...botMessage,
          content: responseContent,
          status: message.status || 'processing',
          references: message.reference || [],
          followup_questions: message.followup_question || []
        };
        
        // 更新消息列表
        setMessages(currentMessages => {
          // 查找并替换现有的bot消息
          return currentMessages.map(msg => 
            msg.id === botMessageId ? updatedBotMessage : msg
          );
        });
      });
      
      // 完成后，确保我们有最终消息
      if (latestMessage) {
        console.log('Processing final message:', latestMessage);
        
        // 创建最终的bot消息
        const finalBotMessage: ChatMessage = {
          ...botMessage,
          content: responseContent,
          status: 'completed',
          references: latestMessage ? ((latestMessage as any).reference || []) : [],
          followup_questions: latestMessage ? ((latestMessage as any).followup_question || []) : []
        };
        
        // 更新消息列表
        setMessages(currentMessages => {
          return currentMessages.map(msg => 
            msg.id === botMessageId ? finalBotMessage : msg
          );
        });
        
        // 保存最终聊天历史
        const finalMessages = await chatHistoryService.getChatHistory(contentId);
        const updatedFinalMessages = finalMessages.map(msg => 
          msg.id === botMessageId ? finalBotMessage : msg
        );
        await chatHistoryService.saveChatHistory(contentId, updatedFinalMessages);
        
        console.log('Chat history saved with final message');
      } else {
        console.error('No final message received from stream');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // 更新为错误状态
      const errorMessage: ChatMessage = {
        ...botMessage,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Failed to get response',
        content: 'Something went wrong. Please try again later.'
      };
      
      // 更新消息列表
      setMessages(currentMessages => {
        return currentMessages.map(msg => 
          msg.id === botMessageId ? errorMessage : msg
        );
      });
      
      // 保存带错误的消息历史
      const messagesWithError = await chatHistoryService.getChatHistory(contentId);
      const updatedErrorMessages = messagesWithError.map(msg => 
        msg.id === botMessageId ? errorMessage : msg
      );
      await chatHistoryService.saveChatHistory(contentId, updatedErrorMessages);
      
      setHasError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理建议问题点击
  const handleQuestionClick = (question: string) => {
    console.log('Question clicked:', question);
    handleSendMessage(question);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      {/* <div className="text-center py-3 border-b bg-white">
        <h2 className="text-sm font-medium">
          AI chat with "{contentTitle && contentTitle.length > 30 
            ? `${contentTitle.substring(0, 30)}...` 
            : contentTitle}"
        </h2>
      </div> */}
      
      {/* 消息列表 */}
      <div className="flex-1 overflow-auto p-3 bg-gray-50">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                isLatest={index === messages.length - 1 && message.type === 'bot'}
                onQuestionClick={handleQuestionClick}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* 输入区域 */}
      <div className="p-3 bg-white">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isProcessing}
          disabled={isLoadingHistory}
        />
      </div>
    </div>
  );
};

export default ChatComponent; 