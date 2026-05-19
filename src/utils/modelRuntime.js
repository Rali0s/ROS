import {
  chatWithOllama,
  checkOllamaStatus,
  createOllamaModel,
  pullOllamaModel,
  startOllamaModel,
} from './ollamaClient';
import {
  HUGGINGFACE_MODEL_ID,
  MODEL_STATUS,
  buildHuggingFaceModelfile,
  getModelById,
  getHuggingFaceModelConfig,
  getHuggingFaceSourceDetails,
  normalizeHuggingFaceSource,
  resolveRuntimeModelName,
} from './modelCatalog';
import { isNativeVaultRuntime, startNativeOllamaService } from './nativeVault';

const serializeRawStatus = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || '');
  }
};

const getFriendlyError = (error) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (error?.name === 'AbortError' || /abort|cancell?ed/i.test(message)) {
    return 'Model download canceled.';
  }

  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Local model service is unavailable.';
  }

  return message || 'Local model is unavailable.';
};

const isAbortError = (error, signal) => Boolean(
  signal?.aborted ||
    error?.name === 'AbortError' ||
    /abort|cancell?ed/i.test(error instanceof Error ? error.message : String(error || '')),
);

const parseModelfileParameters = (modelfile = '') => {
  const parameters = {};
  const lines = String(modelfile || '').split('\n');

  for (const line of lines) {
    const match = line.trim().match(/^PARAMETER\s+([a-z_]+)\s+(.+)$/i);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const numericValue = Number(rawValue);
    parameters[key] = Number.isFinite(numericValue) ? numericValue : rawValue.replace(/^"|"$/g, '');
  }

  return parameters;
};

const getCreatePayload = ({ selectedModel, huggingFaceConfig, huggingFaceSource }) => {
  if (selectedModel.id === HUGGINGFACE_MODEL_ID) {
    return {
      fromModel: huggingFaceSource,
      system: huggingFaceConfig.systemPrompt,
      parameters: {
        temperature: huggingFaceConfig.temperature,
        top_p: huggingFaceConfig.topP,
        repeat_penalty: huggingFaceConfig.repeatPenalty,
        num_ctx: huggingFaceConfig.numCtx,
        num_predict: huggingFaceConfig.numPredict,
      },
    };
  }

  if (selectedModel.baseModel) {
    return {
      fromModel: selectedModel.baseModel,
      system: selectedModel.systemPrompt,
      parameters: parseModelfileParameters(selectedModel.modelfile),
    };
  }

  return {
    modelfile: selectedModel.modelfile,
  };
};

const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const ensureLocalModelService = async ({ baseUrl, model, signal } = {}) => {
  try {
    return {
      started: false,
      status: await checkOllamaStatus({ baseUrl, model, signal }),
    };
  } catch (error) {
    if (isAbortError(error, signal) || !isNativeVaultRuntime()) {
      throw error;
    }
  }

  const startResult = await startNativeOllamaService();

  if (!startResult) {
    throw new Error('Local model service is unavailable.');
  }

  let lastError = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (signal?.aborted) {
      throw new DOMException('Model download canceled.', 'AbortError');
    }

    await wait(500);

    try {
      return {
        started: Boolean(startResult.started),
        serviceStart: startResult,
        status: await checkOllamaStatus({ baseUrl, model, signal }),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Local model service did not start.');
};

const formatModelBytes = (value) => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isGgufVariantFile = (fileName, variant) => {
  const cleanFileName = String(fileName || '');
  const cleanVariant = String(variant || '').trim();

  if (!cleanVariant) {
    return /\.gguf$/i.test(cleanFileName);
  }

  const variantPattern = new RegExp(
    `(^|[-_.])${escapeRegExp(cleanVariant)}(?:\\.gguf$|-\\d{5}-of-\\d{5}\\.gguf$)`,
    'i',
  );

  return variantPattern.test(cleanFileName);
};

export const inspectHuggingFaceModelSource = async (source = '', { signal } = {}) => {
  const details = getHuggingFaceSourceDetails(source);

  if (!details.repoId) {
    return {
      ...details,
      checked: false,
      hasGguf: false,
      hasSafetensors: false,
      fileCount: 0,
      totalSizeBytes: 0,
    };
  }

  const repoPath = details.repoId.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`https://huggingface.co/api/models/${repoPath}?blobs=true`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Hugging Face source check failed with ${response.status}`);
  }

  const payload = await response.json();
  const files = Array.isArray(payload.siblings)
    ? payload.siblings
        .map((file) => ({
          name: String(file.rfilename || ''),
          size: Number(file.lfs?.size || file.size || 0),
        }))
        .filter((file) => file.name)
    : [];
  const ggufFiles = files.filter((file) => /\.gguf$/i.test(file.name));
  const selectedGgufFiles = details.variant
    ? ggufFiles.filter((file) => isGgufVariantFile(file.name, details.variant))
    : ggufFiles;
  const downloadSizeBytes = selectedGgufFiles.reduce((total, file) => total + (Number.isFinite(file.size) ? file.size : 0), 0);

  return {
    ...details,
    checked: true,
    modelId: payload.id || details.repoId,
    license: payload.cardData?.license || '',
    pipelineTag: payload.pipeline_tag || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    hasGguf: ggufFiles.length > 0,
    hasSafetensors: files.some((file) => /\.safetensors$/i.test(file.name)),
    hasSelectedVariant: details.variant ? selectedGgufFiles.length > 0 : true,
    fileCount: files.length,
    downloadSizeBytes,
    downloadSizeLabel: downloadSizeBytes ? formatModelBytes(downloadSizeBytes) : '',
    selectedGgufFiles: selectedGgufFiles.map((file) => file.name).slice(0, 24),
    totalSizeBytes: Number(payload.safetensors?.total || 0),
    sampleFiles: files.map((file) => file.name).slice(0, 24),
  };
};

const getHuggingFaceConversionNotice = (profile) => {
  if (!profile?.checked) {
    return '';
  }

  if (profile.hasGguf && profile.variant && !profile.hasSelectedVariant) {
    return [
      `${profile.modelId || profile.repoId} has GGUF files, but the requested ${profile.variant} variant was not found.`,
      'Choose another quant from the curated GGUF preset list, or paste a source that matches an existing GGUF file.',
    ].join(' ');
  }

  if (profile.hasGguf || !profile.hasSafetensors) {
    return '';
  }

  const sizeLabel = formatModelBytes(profile.totalSizeBytes);
  return [
    `${profile.modelId || profile.repoId} is a Safetensors Transformers repo${sizeLabel ? ` (${sizeLabel})` : ''}, not a GGUF repo.`,
    'Ollama direct Hugging Face loading expects GGUF files, or a local Safetensors directory imported after conversion/prep.',
    'Use a GGUF quantized repo/file for direct local runtime loading, or download and convert/import this repo before preparing the ROS alias.',
  ].join(' ');
};

const resolveRuntimeModel = (modelId, settings = {}, fallbackModel = '') => {
  const selectedModel = getModelById(modelId);
  const huggingFaceConfig = getHuggingFaceModelConfig(settings);

  return {
    selectedModel,
    huggingFaceConfig,
    runtimeModel: resolveRuntimeModelName({
      settingsModel: settings.model,
      selectedModel,
      fallbackModel,
      huggingFaceConfig,
    }),
  };
};

export const checkModelStatus = async (modelId, settings = {}, { signal } = {}) => {
  const { selectedModel, runtimeModel, huggingFaceConfig } = resolveRuntimeModel(modelId, settings);

  try {
    const status = await checkOllamaStatus({
      baseUrl: settings.ollamaBaseUrl,
      model: runtimeModel,
      signal,
    });
    const available = status.models.some((model) => model.name === runtimeModel);

    return {
      status: available ? MODEL_STATUS.READY : MODEL_STATUS.NOT_INSTALLED,
      installedVersion: available ? selectedModel.version : '',
      lastCheckedAt: new Date().toISOString(),
      lastPreparedAt: settings.modelStatuses?.[modelId]?.lastPreparedAt || '',
      lastError: '',
      rawStatus: serializeRawStatus({
        runtime: selectedModel.runtime,
        runtimeModel,
        huggingFaceSource: selectedModel.id === HUGGINGFACE_MODEL_ID
          ? normalizeHuggingFaceSource(huggingFaceConfig.source) || 'not configured'
          : undefined,
        available,
        models: status.models.map((model) => model.name),
      }),
      runtimeStatus: status,
    };
  } catch (error) {
    if (isAbortError(error, signal)) {
      return {
        status: MODEL_STATUS.CANCELED,
        installedVersion: '',
        lastCheckedAt: new Date().toISOString(),
        lastPreparedAt: settings.modelStatuses?.[modelId]?.lastPreparedAt || '',
        lastError: 'Model download canceled.',
        rawStatus: serializeRawStatus({
          runtime: selectedModel.runtime,
          runtimeModel,
          canceled: true,
        }),
        runtimeStatus: {
          status: 'canceled',
          model: runtimeModel,
          models: [],
        },
      };
    }

    return {
      status: MODEL_STATUS.UNAVAILABLE,
      installedVersion: '',
      lastCheckedAt: new Date().toISOString(),
      lastPreparedAt: settings.modelStatuses?.[modelId]?.lastPreparedAt || '',
      lastError: getFriendlyError(error),
      rawStatus: serializeRawStatus({
        runtime: selectedModel.runtime,
        runtimeModel,
        huggingFaceSource: selectedModel.id === HUGGINGFACE_MODEL_ID
          ? normalizeHuggingFaceSource(huggingFaceConfig.source) || 'not configured'
          : undefined,
        error: error instanceof Error ? error.message : String(error || ''),
      }),
      runtimeStatus: {
        status: 'unavailable',
        model: runtimeModel,
        models: [],
      },
    };
  }
};

export const installModel = async (modelId, settings = {}, { signal } = {}) => {
  const { selectedModel, runtimeModel, huggingFaceConfig } = resolveRuntimeModel(modelId, settings);

  try {
    const huggingFaceSource = selectedModel.id === HUGGINGFACE_MODEL_ID
      ? normalizeHuggingFaceSource(huggingFaceConfig.source)
      : '';
    const createPayload = getCreatePayload({
      selectedModel,
      huggingFaceConfig,
      huggingFaceSource,
    });
    const modelfile = createPayload.modelfile || (
      selectedModel.id === HUGGINGFACE_MODEL_ID
        ? buildHuggingFaceModelfile(settings)
        : selectedModel.modelfile
    );

    if (selectedModel.id === HUGGINGFACE_MODEL_ID && !huggingFaceSource) {
      throw new Error('Add a Hugging Face model reference before preparing this adapter.');
    }

    let huggingFaceProfile = null;
    if (selectedModel.id === HUGGINGFACE_MODEL_ID) {
      try {
        huggingFaceProfile = await inspectHuggingFaceModelSource(huggingFaceConfig.source, { signal });
      } catch (error) {
        if (isAbortError(error, signal)) {
          throw error;
        }

        huggingFaceProfile = {
          ...getHuggingFaceSourceDetails(huggingFaceConfig.source),
          checked: false,
          error: error instanceof Error ? error.message : String(error || ''),
        };
      }
    }

    const conversionNotice = getHuggingFaceConversionNotice(huggingFaceProfile);
    if (conversionNotice) {
      return {
        status: MODEL_STATUS.NEEDS_CONVERSION,
        installedVersion: '',
        lastCheckedAt: new Date().toISOString(),
        lastPreparedAt: new Date().toISOString(),
        lastError: conversionNotice,
        rawStatus: serializeRawStatus({
          runtime: selectedModel.runtime,
          runtimeModel,
          huggingFaceSource,
          huggingFaceProfile,
          localDownload: huggingFaceProfile?.downloadSizeLabel
            ? `Ollama will download ${huggingFaceProfile.downloadSizeLabel} into the local runtime store.`
            : undefined,
        }),
        runtimeStatus: {
          status: 'needs-conversion',
          model: runtimeModel,
          models: [],
        },
      };
    }

    const service = await ensureLocalModelService({
      baseUrl: settings.ollamaBaseUrl,
      model: runtimeModel,
      signal,
    });
    const prepareResult = modelfile
      ? await createOllamaModel({
          baseUrl: settings.ollamaBaseUrl,
          model: runtimeModel,
          ...createPayload,
          modelfile,
          signal,
        })
      : await pullOllamaModel({
          baseUrl: settings.ollamaBaseUrl,
          model: runtimeModel,
          signal,
        });
    const startResult = await startOllamaModel({
      baseUrl: settings.ollamaBaseUrl,
      model: runtimeModel,
      keepAlive: settings.keepAlive || '10m',
      signal,
    });
    const checked = await checkModelStatus(modelId, settings, { signal });

    return {
      ...checked,
      status: checked.status === MODEL_STATUS.READY ? MODEL_STATUS.READY : MODEL_STATUS.NOT_INSTALLED,
      installedVersion: checked.status === MODEL_STATUS.READY ? selectedModel.version : '',
      lastPreparedAt: new Date().toISOString(),
      rawStatus: serializeRawStatus({
        prepareMode: modelfile ? 'create' : 'pull',
        huggingFaceSource: huggingFaceSource || undefined,
        huggingFaceProfile: huggingFaceProfile || undefined,
        localDownload: huggingFaceProfile?.downloadSizeLabel
          ? `Ollama downloaded ${huggingFaceProfile.downloadSizeLabel} into the local runtime store.`
          : undefined,
        service,
        prepare: prepareResult,
        start: startResult,
        check: checked.rawStatus,
      }),
    };
  } catch (error) {
    if (isAbortError(error, signal)) {
      return {
        status: MODEL_STATUS.CANCELED,
        installedVersion: '',
        lastCheckedAt: new Date().toISOString(),
        lastPreparedAt: new Date().toISOString(),
        lastError: 'Model download canceled.',
        rawStatus: serializeRawStatus({
          runtime: selectedModel.runtime,
          runtimeModel,
          huggingFaceSource: selectedModel.id === HUGGINGFACE_MODEL_ID
            ? normalizeHuggingFaceSource(huggingFaceConfig.source) || 'not configured'
            : undefined,
          canceled: true,
        }),
        runtimeStatus: {
          status: 'canceled',
          model: runtimeModel,
          models: [],
        },
      };
    }

    return {
      status: MODEL_STATUS.UNAVAILABLE,
      installedVersion: '',
      lastCheckedAt: new Date().toISOString(),
      lastPreparedAt: new Date().toISOString(),
      lastError: getFriendlyError(error),
      rawStatus: serializeRawStatus({
        runtime: selectedModel.runtime,
        runtimeModel,
        huggingFaceSource: selectedModel.id === HUGGINGFACE_MODEL_ID
          ? normalizeHuggingFaceSource(huggingFaceConfig.source) || 'not configured'
          : undefined,
        error: error instanceof Error ? error.message : String(error || ''),
      }),
      runtimeStatus: {
        status: 'unavailable',
        model: runtimeModel,
        models: [],
      },
    };
  }
};

export const runModel = async (modelId, messages, context, settings = {}) => {
  const { selectedModel, runtimeModel, huggingFaceConfig } = resolveRuntimeModel(modelId, settings);

  return chatWithOllama({
    baseUrl: settings.ollamaBaseUrl,
    model: runtimeModel,
    messages,
    contextItems: context?.items || [],
    contextBlock: context?.promptBlock || '',
    systemPrompt: selectedModel.id === HUGGINGFACE_MODEL_ID
      ? huggingFaceConfig.systemPrompt
      : selectedModel.systemPrompt,
  });
};
