const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : DEFAULT_OLLAMA_BASE_URL;
};

const readErrorResponse = async (response) => {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return '';
  }
};

export const normalizeOllamaBaseUrl = normalizeBaseUrl;

export const checkOllamaStatus = async ({ baseUrl, model, signal } = {}) => {
  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/tags`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorResponse(response);
    throw new Error(`Local model service responded with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  const payload = await response.json();
  const models = Array.isArray(payload.models) ? payload.models : [];
  const selectedModel = model || models[0]?.name || '';

  return {
    status: 'online',
    models,
    model: selectedModel,
  };
};

export const chatWithOllama = async ({
  baseUrl,
  model,
  messages,
  contextItems = [],
  contextBlock: providedContextBlock = '',
  systemPrompt = '',
  signal,
}) => {
  const selectedModel = String(model || '').trim();

  if (!selectedModel) {
    throw new Error('Select a local model before asking.');
  }

  const contextBlock = providedContextBlock || (contextItems.length
    ? [
        'Use the following project memory as grounded context.',
        'Cite relevant memory using [title | id] in the answer.',
        '',
        ...contextItems.map((item, index) =>
          [
            `Memory ${index + 1}: ${item.title} | ${item.id}`,
            `Kind: ${item.kind}`,
            item.sourcePath ? `Source: ${item.sourcePath}` : '',
            item.tags?.length ? `Tags: ${item.tags.join(', ')}` : '',
            `Excerpt: ${item.excerpt}`,
          ]
            .filter(Boolean)
            .join('\n'),
        ),
      ].join('\n\n')
    : 'No matching project memory was found. Say that clearly if the answer needs stored context.');

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            systemPrompt ||
            'You are the local ROS Model Workspace. Answer concisely from provided project memory. Do not invent citations.',
        },
        {
          role: 'system',
          content: contextBlock,
        },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorResponse(response);
    throw new Error(`Local model request failed with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  const payload = await response.json();
  const content = payload.message?.content || payload.response || '';

  return {
    content,
    model: selectedModel,
    contextItems,
  };
};

export const pullOllamaModel = async ({ baseUrl, model, signal }) => {
  const selectedModel = String(model || '').trim();

  if (!selectedModel) {
    throw new Error('Select a local model before preparing it.');
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorResponse(response);
    throw new Error(`Local model prepare failed with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return response.json();
};

export const createOllamaModel = async ({
  baseUrl,
  model,
  fromModel,
  system,
  parameters,
  modelfile,
  signal,
}) => {
  const selectedModel = String(model || '').trim();
  const modelDefinition = String(modelfile || '').trim();
  const baseModel = String(fromModel || '').trim();

  if (!selectedModel) {
    throw new Error('Select a local model before preparing it.');
  }

  if (!baseModel && !modelDefinition) {
    throw new Error('This local model is missing a model definition.');
  }

  const body = baseModel
    ? {
        model: selectedModel,
        from: baseModel,
        ...(system ? { system } : {}),
        ...(parameters && Object.keys(parameters).length ? { parameters } : {}),
        stream: false,
      }
    : {
        model: selectedModel,
        modelfile: modelDefinition,
        stream: false,
      };

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorResponse(response);
    throw new Error(`Local model prepare failed with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return response.json();
};

export const startOllamaModel = async ({ baseUrl, model, keepAlive = '10m', signal }) => {
  const selectedModel = String(model || '').trim();

  if (!selectedModel) {
    throw new Error('Select a local model before starting it.');
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      prompt: '',
      stream: false,
      keep_alive: keepAlive,
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await readErrorResponse(response);
    throw new Error(`Local model start failed with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return response.json();
};

export { DEFAULT_OLLAMA_BASE_URL };
