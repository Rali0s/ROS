import {
  chatWithOllama,
  checkOllamaStatus,
  createOllamaModel,
  pullOllamaModel,
} from './ollamaClient';
import {
  MODEL_STATUS,
  getModelById,
  resolveRuntimeModelName,
} from './modelCatalog';

const serializeRawStatus = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value || '');
  }
};

const getFriendlyError = (error) => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'Local model service is unavailable.';
  }

  return message || 'Local model is unavailable.';
};

const resolveRuntimeModel = (modelId, settings = {}, fallbackModel = '') => {
  const selectedModel = getModelById(modelId);
  return {
    selectedModel,
    runtimeModel: resolveRuntimeModelName({
      settingsModel: settings.model,
      selectedModel,
      fallbackModel,
    }),
  };
};

export const checkModelStatus = async (modelId, settings = {}) => {
  const { selectedModel, runtimeModel } = resolveRuntimeModel(modelId, settings);

  try {
    const status = await checkOllamaStatus({
      baseUrl: settings.ollamaBaseUrl,
      model: runtimeModel,
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
        available,
        models: status.models.map((model) => model.name),
      }),
      runtimeStatus: status,
    };
  } catch (error) {
    return {
      status: MODEL_STATUS.UNAVAILABLE,
      installedVersion: '',
      lastCheckedAt: new Date().toISOString(),
      lastPreparedAt: settings.modelStatuses?.[modelId]?.lastPreparedAt || '',
      lastError: getFriendlyError(error),
      rawStatus: serializeRawStatus({
        runtime: selectedModel.runtime,
        runtimeModel,
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

export const installModel = async (modelId, settings = {}) => {
  const { selectedModel, runtimeModel } = resolveRuntimeModel(modelId, settings);

  try {
    const prepareResult = selectedModel.modelfile
      ? await createOllamaModel({
          baseUrl: settings.ollamaBaseUrl,
          model: runtimeModel,
          modelfile: selectedModel.modelfile,
        })
      : await pullOllamaModel({
          baseUrl: settings.ollamaBaseUrl,
          model: runtimeModel,
        });
    const checked = await checkModelStatus(modelId, settings);

    return {
      ...checked,
      status: checked.status === MODEL_STATUS.READY ? MODEL_STATUS.READY : MODEL_STATUS.NOT_INSTALLED,
      installedVersion: checked.status === MODEL_STATUS.READY ? selectedModel.version : '',
      lastPreparedAt: new Date().toISOString(),
      rawStatus: serializeRawStatus({
        prepareMode: selectedModel.modelfile ? 'create' : 'pull',
        prepare: prepareResult,
        check: checked.rawStatus,
      }),
    };
  } catch (error) {
    return {
      status: MODEL_STATUS.UNAVAILABLE,
      installedVersion: '',
      lastCheckedAt: new Date().toISOString(),
      lastPreparedAt: new Date().toISOString(),
      lastError: getFriendlyError(error),
      rawStatus: serializeRawStatus({
        runtime: selectedModel.runtime,
        runtimeModel,
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
  const { selectedModel, runtimeModel } = resolveRuntimeModel(modelId, settings);

  return chatWithOllama({
    baseUrl: settings.ollamaBaseUrl,
    model: runtimeModel,
    messages,
    contextItems: context?.items || [],
    contextBlock: context?.promptBlock || '',
    systemPrompt: selectedModel.systemPrompt,
  });
};
