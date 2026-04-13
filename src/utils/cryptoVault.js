const PRODUCT_NAME = 'OSA-Midnight Oil';
const SNAPSHOT_KIND = 'osa-midnight-oil.encrypted-snapshot';
const WORKSPACE_KIND = 'osa-midnight-oil.encrypted-workspace';
const ENCRYPTION_VERSION = 1;
const WORKSPACE_VERSION = 3;
const PBKDF2_ITERATIONS = 310000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const ensureWebCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable in this environment.');
  }
};

const bytesToBase64 = (bytes) => {
  let binary = '';

  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return globalThis.btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const deriveKey = async (passphrase, salt, purpose, usages) => {
  ensureWebCrypto();

  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(`${passphrase}::${purpose}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    usages,
  );
};

const encryptString = async (plaintext, passphrase, purpose) => {
  if (!passphrase.trim()) {
    throw new Error('A passphrase is required.');
  }

  ensureWebCrypto();

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, purpose, ['encrypt']);
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    textEncoder.encode(plaintext),
  );

  return {
    version: ENCRYPTION_VERSION,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
  };
};

const decryptString = async (payload, passphrase, purpose) => {
  if (!payload?.salt || !payload?.iv || !payload?.ciphertext) {
    throw new Error('Encrypted payload is incomplete.');
  }

  ensureWebCrypto();

  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const key = await deriveKey(passphrase, salt, purpose, ['decrypt']);

  try {
    const plaintextBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext,
    );

    return textDecoder.decode(plaintextBuffer);
  } catch (error) {
    throw new Error('Unable to decrypt with this passphrase.');
  }
};

const normalizeBootMetadata = (boot) => ({
  codename: boot?.codename || PRODUCT_NAME,
  operator: boot?.operator || 'Guest Operator',
  wallpaper: boot?.wallpaper || 'violet-surge',
});

export const encryptJson = async (payload, passphrase, purpose) =>
  encryptString(JSON.stringify(payload), passphrase, purpose);

export const decryptJson = async (payload, passphrase, purpose) =>
  JSON.parse(await decryptString(payload, passphrase, purpose));

export const encryptWalletSecret = async (secretMaterial, passphrase) =>
  encryptString(secretMaterial, passphrase, 'wallet-vault');

export const decryptWalletSecret = async (payload, passphrase) =>
  decryptString(payload, passphrase, 'wallet-vault');

export const createEncryptedWorkspaceContainer = async (workspace, passphrase, boot) => ({
  kind: WORKSPACE_KIND,
  version: WORKSPACE_VERSION,
  product: PRODUCT_NAME,
  sealedAt: new Date().toISOString(),
  boot: normalizeBootMetadata(boot),
  payload: await encryptJson(
    {
      workspace,
    },
    passphrase,
    'workspace-container',
  ),
});

export const isEncryptedWorkspaceContainer = (payload) => payload?.kind === WORKSPACE_KIND;

export const decryptWorkspaceContainer = async (payload, passphrase) => {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;

  if (!isEncryptedWorkspaceContainer(parsed)) {
    throw new Error('Workspace container is not encrypted.');
  }

  return decryptJson(parsed.payload, passphrase, 'workspace-container');
};

export const createEncryptedSnapshot = async (workspace, passphrase) => ({
  kind: SNAPSHOT_KIND,
  version: ENCRYPTION_VERSION,
  product: PRODUCT_NAME,
  exportedAt: new Date().toISOString(),
  payload: await encryptJson(
    {
      workspace,
    },
    passphrase,
    'snapshot-export',
  ),
});

export const isEncryptedSnapshot = (payload) => payload?.kind === SNAPSHOT_KIND;

export const decryptSnapshotPayload = async (payload, passphrase) => {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;

  if (!isEncryptedSnapshot(parsed)) {
    return parsed;
  }

  return decryptJson(parsed.payload, passphrase, 'snapshot-export');
};

export {
  PRODUCT_NAME,
  SNAPSHOT_KIND,
  WORKSPACE_KIND,
  WORKSPACE_VERSION,
  PBKDF2_ITERATIONS,
};
