const DB_NAME = "screenshot-shelf-images";
const STORE_NAME = "images";
const DB_VERSION = 1;

export async function storeImage(key: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(dataUrl, key));
  db.close();
}

export async function getStoredImage(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  const db = await openDb();
  const result = await requestToPromise<string | undefined>(
    db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
  );
  db.close();
  return result;
}

export async function deleteStoredImage(key?: string): Promise<void> {
  if (!key) return;
  const db = await openDb();
  await requestToPromise(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key));
  db.close();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
