const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : DEFAULT_OLLAMA_BASE_URL;
};

export const normalizeOllamaBaseUrl = normalizeBaseUrl;

export const checkOllamaStatus = async ({ baseUrl, model } = {}) => {
  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/tags`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Local model service responded with ${response.status}`);
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
  });

  if (!response.ok) {
    throw new Error(`Local model request failed with ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.message?.content || payload.response || '';

  return {
    content,
    model: selectedModel,
    contextItems,
  };
};

export const pullOllamaModel = async ({ baseUrl, model }) => {
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
  });

  if (!response.ok) {
    throw new Error(`Local model prepare failed with ${response.status}`);
  }

  return response.json();
};

export const createOllamaModel = async ({ baseUrl, model, modelfile }) => {
  const selectedModel = String(model || '').trim();
  const modelDefinition = String(modelfile || '').trim();

  if (!selectedModel) {
    throw new Error('Select a local model before preparing it.');
  }

  if (!modelDefinition) {
    throw new Error('This local model is missing a model definition.');
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      modelfile: modelDefinition,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local model prepare failed with ${response.status}`);
  }

  return response.json();
};

export { DEFAULT_OLLAMA_BASE_URL };
