'use client';

import { ChatMessage } from '@/types/chatTypes';

const DB_NAME = 'ainee_chat_db';
const STORE_NAME = 'chat_history';

interface ChatStore {
  contentId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export class ChatHistoryService {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event);
        reject(new Error('Could not open chat history database'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'contentId' });
        }
      };
    });
  }

  public async getChatHistory(contentId: string): Promise<ChatMessage[]> {
    await this.ensureDBInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(contentId);

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as ChatStore;
        if (result) {
          resolve(result.messages);
        } else {
          resolve([]);
        }
      };

      request.onerror = (event) => {
        console.error('Error getting chat history:', event);
        reject(new Error('Could not retrieve chat history'));
      };
    });
  }

  public async saveChatHistory(contentId: string, messages: ChatMessage[]): Promise<void> {
    await this.ensureDBInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const chatStore: ChatStore = {
        contentId,
        messages,
        lastUpdated: Date.now()
      };
      
      const request = store.put(chatStore);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error saving chat history:', event);
        reject(new Error('Could not save chat history'));
      };
    });
  }

  public async addMessage(contentId: string, message: ChatMessage): Promise<ChatMessage[]> {
    const messages = await this.getChatHistory(contentId);
    const newMessages = [...messages, message];
    await this.saveChatHistory(contentId, newMessages);
    return newMessages;
  }

  public async updateMessage(contentId: string, messageId: string, updates: Partial<ChatMessage>): Promise<ChatMessage[]> {
    const messages = await this.getChatHistory(contentId);
    
    const newMessages = messages.map(message => 
      message.id === messageId ? { ...message, ...updates } : message
    );
    
    await this.saveChatHistory(contentId, newMessages);
    return newMessages;
  }

  public async clearHistory(contentId: string): Promise<void> {
    await this.ensureDBInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(contentId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        console.error('Error clearing chat history:', event);
        reject(new Error('Could not clear chat history'));
      };
    });
  }

  private async ensureDBInitialized(): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }
  }
} 