let cachedInvoke = null;
let invokeLoadAttempted = false;
let cachedWindowModule = null;
let cachedWebviewModule = null;
let cachedDpiModule = null;
let cachedPathModule = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getGlobalTauriInvoke = () =>
  globalThis.__TAURI__?.core?.invoke ??
  globalThis.__TAURI__?.invoke ??
  globalThis.__TAURI_INTERNALS__?.invoke ??
  null;

const isLikelyTauriRuntime = () =>
  Boolean(
    globalThis.__TAURI__ ||
      globalThis.__TAURI_INTERNALS__ ||
      globalThis.navigator?.userAgent?.includes('Tauri'),
  );

const loadTauriInvoke = async () => {
  if (cachedInvoke) {
    return cachedInvoke;
  }

  const globalInvoke = getGlobalTauriInvoke();
  if (globalInvoke) {
    cachedInvoke = globalInvoke;
    return cachedInvoke;
  }

  if (invokeLoadAttempted || !isLikelyTauriRuntime()) {
    return null;
  }

  invokeLoadAttempted = true;

  try {
    const module = await import('@tauri-apps/api/core');
    cachedInvoke = module.invoke;
    return cachedInvoke;
  } catch (error) {
    return null;
  }
};

const invokeNative = async (command, payload = {}) => {
  const invoke = await loadTauriInvoke();

  if (!invoke) {
    return null;
  }

  return invoke(command, payload);
};

export const isNativeVaultRuntime = () => isLikelyTauriRuntime();

export const getNativeVaultState = async () => invokeNative('get_vault_state');

export const initializeNativeWorkspace = async ({ passphrase, operatorProfile, workspace }) =>
  invokeNative('initialize_workspace', {
    args: {
      passphrase,
      operatorProfile,
      workspace,
    },
  });

export const unlockNativeWorkspace = async ({ passphrase }) =>
  invokeNative('unlock_workspace', {
    args: {
      passphrase,
    },
  });

export const lockNativeWorkspace = async () => invokeNative('lock_workspace');

export const listNativeCompartments = async () => invokeNative('list_compartments');

export const unlockNativeCompartment = async ({ compartmentId, intent }) =>
  invokeNative('unlock_compartment', {
    args: {
      compartmentId,
      intent,
    },
  });

export const persistNativeWorkspace = async ({ workspace }) =>
  invokeNative('persist_workspace', {
    args: {
      workspace,
    },
  });

export const storeNativeRecord = async ({ compartmentId, record }) =>
  invokeNative('store_record', {
    args: {
      compartmentId,
      record,
    },
  });

export const deleteNativeRecord = async ({ compartmentId, recordId }) =>
  invokeNative('delete_record', {
    args: {
      compartmentId,
      recordId,
    },
  });

export const saveNativeNostrSecret = async ({ pubkey, secretHex }) =>
  invokeNative('save_nostr_secret', {
    args: {
      pubkey,
      secretHex,
    },
  });

export const loadNativeNostrSecret = async ({ pubkey }) =>
  invokeNative('load_nostr_secret', {
    args: {
      pubkey,
    },
  });

export const deleteNativeNostrSecret = async ({ pubkey }) =>
  invokeNative('delete_nostr_secret', {
    args: {
      pubkey,
    },
  });

export const searchNativeWorkspace = async ({ query, scope }) =>
  invokeNative('search_workspace', {
    args: {
      query,
      scope,
    },
  });

export const exportNativeSnapshot = async ({ targetPath, passphrase }) =>
  invokeNative('export_snapshot', {
    args: {
      targetPath,
      passphrase,
    },
  });

export const importNativeSnapshot = async ({ sourcePath, passphrase }) =>
  invokeNative('import_snapshot', {
    args: {
      sourcePath,
      passphrase,
    },
  });

export const migrateNativeBetaWorkspace = async ({ sourceKind, passphrase, legacyWorkspace }) =>
  invokeNative('migrate_beta_workspace', {
    args: {
      sourceKind,
      passphrase,
      legacyWorkspace,
    },
  });

export const createNativeCommsIdentity = async ({
  profileId,
  displayName,
  relayHints = [],
  directHints = [],
  networkPolicy = {},
  trustPolicy = {},
}) =>
  invokeNative('create_comms_identity', {
    args: {
      profileId,
      displayName,
      relayHints,
      directHints,
      networkPolicy,
      trustPolicy,
    },
  });

export const rotateNativeCommsIdentity = async ({ identityId }) =>
  invokeNative('rotate_comms_identity', {
    args: {
      identityId,
    },
  });

export const exportNativeIdentityCard = async ({ identityId, targetPath }) =>
  invokeNative('export_identity_card', {
    args: {
      identityId,
      targetPath,
    },
  });

export const importNativePeerCard = async ({ source, trustMode }) =>
  invokeNative('import_peer_card', {
    args: {
      source,
      trustMode,
    },
  });

export const verifyNativePeer = async ({ peerId, fingerprint, keyId }) =>
  invokeNative('verify_peer', {
    args: {
      peerId,
      fingerprint,
      keyId,
    },
  });

export const createNativeConversation = async ({
  localIdentityId,
  peerId,
  title,
  tags = [],
  requireVerifiedPeer = false,
}) =>
  invokeNative('create_conversation', {
    args: {
      localIdentityId,
      peerId,
      title,
      tags,
      requireVerifiedPeer,
    },
  });

export const listNativeConversations = async () => invokeNative('list_conversations');

export const getNativeConversationMessages = async ({ conversationId }) =>
  invokeNative('get_conversation_messages', {
    args: {
      conversationId,
    },
  });

export const saveNativeDraft = async ({ conversationId, draft }) =>
  invokeNative('save_draft', {
    args: {
      conversationId,
      draft,
    },
  });

export const sendNativeMessage = async ({ conversationId, draft, deliveryMode }) =>
  invokeNative('send_message', {
    args: {
      conversationId,
      draft,
      deliveryMode,
    },
  });

export const fetchNativeRelayMessages = async ({ routeScope }) =>
  invokeNative('fetch_relay_messages', {
    args: {
      routeScope,
    },
  });

export const attachNativeFileToConversation = async ({
  conversationId,
  fileBlobId,
  displayName,
  mediaType,
  byteLength,
  integrityHash,
}) =>
  invokeNative('attach_file_from_vault', {
    args: {
      conversationId,
      fileBlobId,
      displayName,
      mediaType,
      byteLength,
      integrityHash,
    },
  });

export const deleteNativeMessage = async ({ messageId, deleteMode }) =>
  invokeNative('delete_message', {
    args: {
      messageId,
      deleteMode,
    },
  });

export const deleteNativeAttachmentRef = async ({ attachmentId, deleteMode }) =>
  invokeNative('delete_attachment_ref', {
    args: {
      attachmentId,
      deleteMode,
    },
  });

export const nukeNativeWorkspace = async () => invokeNative('nuke_workspace');

export const storeNativeFileBlob = async ({ blobId, mimeType, payloadBase64 }) =>
  invokeNative('store_file_blob_command', {
    args: {
      blobId,
      mimeType,
      payloadBase64,
    },
  });

export const readNativeFileBlob = async ({ blobId }) =>
  invokeNative('read_file_blob_command', {
    args: {
      blobId,
    },
  });

export const deleteNativeFileBlob = async ({ blobId, mode = 'standard-delete' }) =>
  invokeNative('delete_file_blob_command', {
    args: {
      blobId,
      mode,
    },
  });

export const purgeNativeOrphanedFileBlobs = async ({ mode = 'secure-delete' } = {}) =>
  invokeNative('purge_orphaned_file_blobs_command', {
    args: {
      blobId: '',
      mode,
    },
  });

export const syncNativeLanState = async ({ codename, operator } = {}) =>
  invokeNative('get_lan_party_state', {
    args: {
      codename,
      operator,
    },
  });

export const setNativeLanEnabled = async ({
  enabled,
  codename,
  operator,
  defaultStatus = 'online',
} = {}) =>
  invokeNative('set_lan_party_enabled', {
    args: {
      enabled,
      codename,
      operator,
      defaultStatus,
    },
  });

export const scanNativeLanPeers = async ({ targetIp = '' } = {}) =>
  invokeNative('scan_lan_peers', {
    args: {
      targetIp,
    },
  });

export const setNativeLanPresence = async ({ status, role } = {}) =>
  invokeNative('set_lan_presence', {
    args: {
      status,
      role,
    },
  });

export const sendNativeLanChat = async ({ content } = {}) =>
  invokeNative('send_lan_chat', {
    args: {
      content,
    },
  });

export const shareNativeLanNote = async ({ noteId, title, excerpt } = {}) =>
  invokeNative('share_lan_note', {
    args: {
      noteId,
      title,
      excerpt,
    },
  });

export const upsertNativeLanQueueItem = async ({ item } = {}) =>
  invokeNative('upsert_lan_queue_item', {
    args: {
      item,
    },
  });

export const sendNativeLanFile = async ({ name, content } = {}) =>
  invokeNative('send_lan_file', {
    args: {
      name,
      content,
    },
  });

export const closeNativeApp = async () => {
  if (!isLikelyTauriRuntime()) {
    globalThis.close?.();
    return;
  }

  try {
    const exited = await invokeNative('exit_app');
    if (exited !== null) {
      return;
    }

    if (!cachedWindowModule) {
      cachedWindowModule = await import('@tauri-apps/api/window');
    }

    const currentWindow = cachedWindowModule.getCurrentWindow();
    await currentWindow.close();
  } catch (error) {
    globalThis.close?.();
  }
};

const toLogicalSize = (size, scaleFactor) => {
  if (!size) {
    return {
      width: globalThis.innerWidth ?? 1440,
      height: globalThis.innerHeight ?? 900,
    };
  }

  if (typeof size.toLogical === 'function') {
    return size.toLogical(scaleFactor);
  }

  if (!cachedDpiModule) {
    return {
      width: size.width ?? globalThis.innerWidth ?? 1440,
      height: size.height ?? globalThis.innerHeight ?? 900,
    };
  }

  return new cachedDpiModule.PhysicalSize(size).toLogical(scaleFactor);
};

const applyDesktopRenderProfile = ({
  logicalWidth,
  logicalHeight,
  scaleFactor,
  zoomFactor,
  maximized,
}) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const body = document.body;
  const compactDensity = logicalWidth < 1500 || logicalHeight < 940;
  const fontScale = clamp(
    1 + (scaleFactor >= 2 ? 0.01 : scaleFactor >= 1.5 ? 0.006 : 0) + (compactDensity ? 0.004 : 0),
    1,
    1.02,
  );

  root.dataset.desktopRuntime = 'tauri';
  root.dataset.desktopProfile = 'browser-match-brave';
  root.dataset.desktopScale = scaleFactor >= 2 ? 'retina' : scaleFactor >= 1.5 ? 'hidpi' : 'standard';
  root.dataset.desktopDensity = compactDensity ? 'compact' : 'comfortable';
  root.style.setProperty('--desktop-font-scale', fontScale.toFixed(3));
  root.style.setProperty('--desktop-zoom-factor', zoomFactor.toFixed(3));
  root.style.setProperty('--desktop-letter-spacing', compactDensity ? '-0.003em' : '0em');
  root.style.setProperty('--desktop-shell-width', `${logicalWidth}px`);
  root.style.setProperty('--desktop-shell-height', `${logicalHeight}px`);
  root.style.setProperty('--desktop-line-height', compactDensity ? '1.48' : '1.5');

  if (body) {
    body.dataset.nativeDesktop = 'true';
    body.dataset.desktopMaximized = maximized ? 'true' : 'false';
  }
};

export const syncNativeWindowPresentation = async ({ ensureWindowFit = false } = {}) => {
  if (!isLikelyTauriRuntime()) {
    return null;
  }

  try {
    if (!cachedWindowModule) {
      cachedWindowModule = await import('@tauri-apps/api/window');
    }

    if (!cachedWebviewModule) {
      cachedWebviewModule = await import('@tauri-apps/api/webview');
    }

    if (!cachedDpiModule) {
      cachedDpiModule = await import('@tauri-apps/api/dpi');
    }

    const currentWindow = cachedWindowModule.getCurrentWindow();
    const currentWebview = cachedWebviewModule.getCurrentWebview();

    const [scaleFactor, innerSize, currentMonitor, maximized] = await Promise.all([
      currentWindow.scaleFactor(),
      currentWindow.innerSize(),
      currentWindow.currentMonitor(),
      currentWindow.isMaximized(),
    ]);

    const logicalSize = toLogicalSize(innerSize, scaleFactor);
    const workArea = currentMonitor?.workArea?.size
      ? toLogicalSize(currentMonitor.workArea.size, currentMonitor.scaleFactor ?? scaleFactor)
      : null;

    if (ensureWindowFit && workArea && !maximized) {
      const shouldMaximize = workArea.width <= 1512 || workArea.height <= 982;

      if (shouldMaximize) {
        await currentWindow.maximize();
      } else {
        const targetWidth = clamp(Math.round(workArea.width * 0.9), 1480, 1728);
        const targetHeight = clamp(Math.round(workArea.height * 0.9), 920, 1117);

        await currentWindow.setSize(new cachedDpiModule.LogicalSize(targetWidth, targetHeight));
        await currentWindow.center();
      }
    }

    const effectiveWidth = globalThis.innerWidth ?? logicalSize.width;
    const effectiveHeight = globalThis.innerHeight ?? logicalSize.height;
    const zoomFactor = 0.72;

    await currentWebview.setZoom(zoomFactor);
    
    applyDesktopRenderProfile({
      logicalWidth: effectiveWidth,
      logicalHeight: effectiveHeight,
      scaleFactor,
      zoomFactor,
      maximized: ensureWindowFit ? workArea?.width <= 1512 || workArea?.height <= 982 : maximized,
    });

    return {
      logicalWidth: effectiveWidth,
      logicalHeight: effectiveHeight,
      scaleFactor,
      zoomFactor,
      maximized,
    };
  } catch (error) {
    return null;
  }
};

export const watchNativeWindowPresentation = async (handler) => {
  if (!isLikelyTauriRuntime()) {
    return () => {};
  }

  try {
    if (!cachedWindowModule) {
      cachedWindowModule = await import('@tauri-apps/api/window');
    }

    const currentWindow = cachedWindowModule.getCurrentWindow();
    const unlistenResized = await currentWindow.onResized(() => {
      handler();
    });
    const unlistenScaleChanged = await currentWindow.onScaleChanged(() => {
      handler();
    });

    return () => {
      unlistenResized?.();
      unlistenScaleChanged?.();
    };
  } catch (error) {
    return () => {};
  }
};

export const saveNativeTextFileDialog = async ({ suggestedName, content }) =>
  invokeNative('save_text_file_dialog', {
    args: {
      suggestedName,
      content,
    },
  });

export const openNativeTextFileDialog = async ({ allowExtensions = [] } = {}) =>
  invokeNative('open_text_file_dialog', {
    args: {
      allowExtensions,
    },
  });

export const resolveNativeAutoSnapshotPath = async ({ suggestedName }) => {
  if (!isLikelyTauriRuntime()) {
    return suggestedName;
  }

  try {
    if (!cachedPathModule) {
      cachedPathModule = await import('@tauri-apps/api/path');
    }

    const documentsDirectory = await cachedPathModule.documentDir();
    return await cachedPathModule.join(documentsDirectory, suggestedName);
  } catch (error) {
    return suggestedName;
  }
};

export const importNativeCalibreMetadataDb = async () =>
  invokeNative('import_calibre_metadata_db');

export const listNativeFileBlobs = async () =>
  invokeNative('list_file_blobs_command');
