import type { BanimoraProjectFileV2 } from '../types/publishing';

export const BANIMORA_DB_NAME = 'banimora-local-db';
export const BANIMORA_DB_VERSION = 1;

export const PROJECTS_STORE = 'projects';
export const ASSETS_STORE = 'assets';
export const META_STORE = 'meta';

export type IndexedDbStorageErrorCode =
  | 'INDEXEDDB_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'TRANSACTION_FAILED'
  | 'CORRUPTED_RECORD'
  | 'REVISION_CONFLICT'
  | 'ASSET_CONFLICT'
  | 'NOT_FOUND';

export class IndexedDbStorageError extends Error {
  readonly code: IndexedDbStorageErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: IndexedDbStorageErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IndexedDbStorageError';
    this.code = code;
    this.details = details;
  }
}

export interface StoredProjectRecord {
  projectId: string;
  revision: number;
  updatedAt: string;
  project: BanimoraProjectFileV2;
}

export interface StoredAssetRecord {
  blobKey: string;
  contentFingerprint: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMetaRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}

export interface IndexedDbClientOptions {
  dbName?: string;
  dbVersion?: number;
  idbFactory?: IDBFactory | null;
}

function isQuotaExceededDomError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; code?: number; message?: string };
  if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return true;
  }
  if (err.code === 22 || err.code === 1014) return true;
  return typeof err.message === 'string' && /quota/i.test(err.message);
}

export function normalizeIndexedDbError(
  error: unknown,
  fallbackMessage: string
): IndexedDbStorageError {
  if (error instanceof IndexedDbStorageError) {
    return error;
  }
  if (isQuotaExceededDomError(error)) {
    return new IndexedDbStorageError(
      'QUOTA_EXCEEDED',
      'Tarayıcı yerel depolama kotası doldu. Projeyi JSON olarak dışa aktarın veya kullanılmayan medyaları temizleyin.',
      { cause: error instanceof Error ? error.message : String(error) }
    );
  }
  const message =
    error instanceof Error && error.message ? `${fallbackMessage}: ${error.message}` : fallbackMessage;
  return new IndexedDbStorageError('TRANSACTION_FAILED', message);
}

export function idbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(normalizeIndexedDbError(request.error, 'IndexedDB isteği başarısız oldu'));
  });
}

function ensureSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
    const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'projectId' });
    projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
  }
  if (!db.objectStoreNames.contains(ASSETS_STORE)) {
    const assetStore = db.createObjectStore(ASSETS_STORE, { keyPath: 'blobKey' });
    assetStore.createIndex('contentFingerprint', 'contentFingerprint', { unique: false });
  }
  if (!db.objectStoreNames.contains(META_STORE)) {
    db.createObjectStore(META_STORE, { keyPath: 'key' });
  }
}

export class IndexedDbClient {
  readonly dbName: string;
  readonly dbVersion: number;
  private readonly idbFactory: IDBFactory | null;
  private openPromise: Promise<IDBDatabase> | null = null;
  private dbInstance: IDBDatabase | null = null;

  constructor(options: IndexedDbClientOptions = {}) {
    this.dbName = options.dbName ?? BANIMORA_DB_NAME;
    this.dbVersion = options.dbVersion ?? BANIMORA_DB_VERSION;
    if (options.idbFactory !== undefined) {
      this.idbFactory = options.idbFactory;
    } else {
      this.idbFactory =
        typeof globalThis !== 'undefined' && 'indexedDB' in globalThis && globalThis.indexedDB
          ? globalThis.indexedDB
          : null;
    }
  }

  isAvailable(): boolean {
    return this.idbFactory !== null;
  }

  async open(): Promise<IDBDatabase> {
    if (!this.idbFactory) {
      throw new IndexedDbStorageError(
        'INDEXEDDB_UNAVAILABLE',
        'Tarayıcıda IndexedDB kullanılamıyor.'
      );
    }
    if (this.dbInstance) {
      return this.dbInstance;
    }
    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = this.idbFactory!.open(this.dbName, this.dbVersion);
      } catch (err) {
        this.openPromise = null;
        reject(normalizeIndexedDbError(err, 'IndexedDB açılamadı'));
        return;
      }

      request.onupgradeneeded = () => {
        ensureSchema(request.result);
      };

      request.onsuccess = () => {
        const db = request.result;
        this.dbInstance = db;
        db.onversionchange = () => {
          db.close();
          if (this.dbInstance === db) {
            this.dbInstance = null;
            this.openPromise = null;
          }
        };
        resolve(db);
      };

      request.onerror = () => {
        this.openPromise = null;
        reject(normalizeIndexedDbError(request.error, 'IndexedDB bağlantısı başarısız oldu'));
      };

      request.onblocked = () => {
        // Other open tabs may hold an older connection; wait for onsuccess/onerror.
      };
    });

    return this.openPromise;
  }

  close(): void {
    if (this.dbInstance) {
      this.dbInstance.close();
      this.dbInstance = null;
    }
    this.openPromise = null;
  }

  async runTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    executor: (tx: IDBTransaction) => Promise<T>
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(storeNames, mode);
      } catch (err) {
        reject(normalizeIndexedDbError(err, 'IndexedDB transaction başlatılamadı'));
        return;
      }

      let settled = false;
      let resultReady = false;
      let resultValue: T;

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(normalizeIndexedDbError(error, 'IndexedDB transaction başarısız oldu'));
      };

      tx.oncomplete = () => {
        if (settled) return;
        if (resultReady) {
          settled = true;
          resolve(resultValue);
        } else {
          settled = true;
          resolve(undefined as T);
        }
      };

      tx.onerror = () => {
        fail(tx.error);
      };

      tx.onabort = () => {
        fail(tx.error ?? new Error('Transaction iptal edildi.'));
      };

      Promise.resolve()
        .then(() => executor(tx))
        .then((value) => {
          resultValue = value;
          resultReady = true;
        })
        .catch((err) => {
          fail(err);
          try {
            tx.abort();
          } catch {
            // Ignore abort errors if transaction already finished.
          }
        });
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return this.runTransaction(storeName, 'readonly', async (tx) => {
      const store = tx.objectStore(storeName);
      return idbRequestToPromise(store.get(key) as IDBRequest<T | undefined>);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.runTransaction(storeName, 'readonly', async (tx) => {
      const store = tx.objectStore(storeName);
      return idbRequestToPromise(store.getAll() as IDBRequest<T[]>);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    await this.runTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      await idbRequestToPromise(store.put(value));
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.runTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      await idbRequestToPromise(store.delete(key));
    });
  }
}
