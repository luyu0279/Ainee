// Define the type for stored content item
export interface ContentItem {
  contentId: string;
  createdAt: number;
}

// Database constants
const DB_NAME = 'ainee_content_db';
const DB_VERSION = 1;
const STORE_NAME = 'content_ids';

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize the database when service is created
    this.initPromise = this.init();
  }

  // Initialize the database
  private async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.error("IndexedDB is not supported in this browser");
        reject("IndexedDB not supported");
        return;
      }

      // Open the database
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("Error opening IndexedDB", event);
        reject("Failed to open IndexedDB");
      };

      // Create object store on first initialization or version upgrade
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create content_ids store with contentId as key path
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'contentId' });
          
          // Create index for faster querying
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;
        resolve();
      };
    });
  }

  // Ensure database is initialized before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }
  }

  // Save a content ID to the database
  public async saveContentId(contentId: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const item: ContentItem = {
        contentId,
        createdAt: Date.now()
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error("Error saving content ID to IndexedDB", event);
        reject("Failed to save content ID");
      };
    });
  }

  // Get all content IDs
  public async getAllContentIds(): Promise<string[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items.map(item => item.contentId));
      };
      
      request.onerror = (event) => {
        console.error("Error getting content IDs from IndexedDB", event);
        reject("Failed to get content IDs");
      };
    });
  }

  // Delete a content ID from the database
  public async deleteContentId(contentId: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(contentId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error("Error deleting content ID from IndexedDB", event);
        reject("Failed to delete content ID");
      };
    });
  }
}

// Create and export a singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService; 