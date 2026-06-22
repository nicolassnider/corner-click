import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CornerClickDB extends DBSchema {
  transactions: {
    key: string;
    value: {
      id: string;
      endpoint: string;
      method: string;
      body: any;
      timestamp: number;
      retryCount: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<CornerClickDB>> | null = null;

export function initDB() {
  if (typeof window === 'undefined') return null; // Avoid running in SSR/Node
  
  if (!dbPromise) {
    dbPromise = openDB<CornerClickDB>('corner-click-offline-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('transactions', {
          keyPath: 'id',
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function enqueueTransaction(endpoint: string, method: string, body: any) {
  const db = await initDB();
  if (!db) return;

  const id = crypto.randomUUID();
  await db.put('transactions', {
    id,
    endpoint,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0,
  });
  console.log(`[Offline Sync] Transaction ${id} queued for ${endpoint}`);
}

export async function getPendingTransactions() {
  const db = await initDB();
  if (!db) return [];
  return await db.getAllFromIndex('transactions', 'by-timestamp');
}

export async function removeTransaction(id: string) {
  const db = await initDB();
  if (!db) return;
  await db.delete('transactions', id);
}

export async function incrementRetry(id: string, currentRetries: number) {
  const db = await initDB();
  if (!db) return;
  const tx = await db.get('transactions', id);
  if (tx) {
    tx.retryCount = currentRetries + 1;
    await db.put('transactions', tx);
  }
}

export async function syncOfflineQueue(authFetch: (url: string, options?: RequestInit) => Promise<Response>) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return; // Still offline

  const pending = await getPendingTransactions();
  if (pending.length === 0) return;

  console.log(`[Offline Sync] Attempting to sync ${pending.length} transactions`);

  for (const tx of pending) {
    try {
      const res = await authFetch(tx.endpoint, {
        method: tx.method,
        body: typeof tx.body === 'string' ? tx.body : JSON.stringify(tx.body),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        console.log(`[Offline Sync] Successfully synced tx ${tx.id}`);
        await removeTransaction(tx.id);
      } else {
        console.warn(`[Offline Sync] Failed to sync tx ${tx.id} - HTTP ${res.status}`);
        await incrementRetry(tx.id, tx.retryCount);
      }
    } catch (err) {
      console.error(`[Offline Sync] Error syncing tx ${tx.id}:`, err);
      await incrementRetry(tx.id, tx.retryCount);
    }
  }
}
