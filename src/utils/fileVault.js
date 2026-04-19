import { createWrappedBinaryPayload, decryptBinaryPayload, decryptWrappedBinaryPayload } from './cryptoVault';

const DB_NAME = 'osa-midnight-oil-file-vault';
const STORE_NAME = 'library-blobs';
const VAULT_PURPOSE = 'library-file-vault';

let openPromise = null;

const openDatabase = () => {
  if (openPromise) {
    return openPromise;
  }

  openPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open the file vault.'));
  });

  return openPromise;
};

const withStore = async (mode, callback) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = callback(store, resolve, reject);

    transaction.onabort = () => reject(transaction.error || new Error('File vault transaction failed.'));
    transaction.onerror = () => reject(transaction.error || new Error('File vault transaction failed.'));

    if (result !== undefined) {
      resolve(result);
    }
  });
};

export const storeBrowserVaultBlob = async ({ blobId, mimeType, bytes, passphrase }) => {
  const encrypted = await createWrappedBinaryPayload(bytes, passphrase, VAULT_PURPOSE);

  await withStore('readwrite', (store, resolve, reject) => {
    const request = store.put({
      id: blobId,
      mimeType,
      sizeBytes: bytes.length,
      encrypted,
      storageMode: 'wrapped-file-key',
      storedAt: new Date().toISOString(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to store the encrypted file blob.'));
  });

  return blobId;
};

export const readBrowserVaultBlob = async ({ blobId, passphrase }) =>
  withStore('readonly', (store, resolve, reject) => {
    const request = store.get(blobId);

    request.onsuccess = async () => {
      try {
        const record = request.result;

        if (!record) {
          resolve(null);
          return;
        }

        const bytes = record.encrypted?.wrappedKey
          ? await decryptWrappedBinaryPayload(record.encrypted, passphrase, VAULT_PURPOSE)
          : await decryptBinaryPayload(record.encrypted, passphrase, VAULT_PURPOSE);
        resolve({
          blobId,
          mimeType: record.mimeType || 'application/octet-stream',
          bytes,
        });
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error || new Error('Unable to read the encrypted file blob.'));
  });

export const deleteBrowserVaultBlob = async (blobId, mode = 'standard-delete') =>
  withStore('readwrite', (store, resolve, reject) => {
    const finalizeDelete = () => {
      const deleteRequest = store.delete(blobId);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error || new Error('Unable to delete the encrypted file blob.'));
    };

    if (mode === 'standard-delete') {
      finalizeDelete();
      return;
    }

    const overwriteRequest = store.put({
      id: blobId,
      mimeType: 'application/octet-stream',
      sizeBytes: 0,
      encrypted: {
        version: 1,
        tombstonedAt: new Date().toISOString(),
      },
      storageMode: mode === 'best-effort-overwrite' ? 'best-effort-browser-tombstone' : 'crypto-shred-tombstone',
      storedAt: new Date().toISOString(),
    });

    overwriteRequest.onsuccess = () => finalizeDelete();
    overwriteRequest.onerror = () =>
      reject(overwriteRequest.error || new Error('Unable to cryptographically shred the browser file blob.'));
  });

export const clearBrowserVault = async () =>
  withStore('readwrite', (store, resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Unable to clear the encrypted file vault.'));
  });

export const listBrowserVaultBlobs = async () =>
  withStore('readonly', (store, resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      const records = Array.isArray(request.result) ? request.result : [];
      resolve(
        records.map((record) => ({
          blobId: record.id,
          mimeType: record.mimeType || 'application/octet-stream',
          storedAt: record.storedAt || '',
          sizeBytes: Number.isFinite(record.sizeBytes) ? record.sizeBytes : 0,
          storageMode: typeof record.storageMode === 'string' ? record.storageMode : 'legacy-passphrase',
        })),
      );
    };

    request.onerror = () => reject(request.error || new Error('Unable to list encrypted file blobs.'));
  });
