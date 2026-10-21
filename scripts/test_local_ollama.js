#!/usr/bin/env node
'use strict';

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';
const REQUEST_TIMEOUT_MS = Number(process.env.OLLAMA_TEST_TIMEOUT_MS || 20000);
const MODEL_PREFERENCE_ORDER = [
  'r-specialist:latest',
  'deepcoder:1.5b',
  'qwen2.5-coder:1.5b',
  'qwen2.5-coder:0.5b'
];

const normalizeBaseUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_OLLAMA_BASE;
  const normalized = raw.replace(/\/+$/, '');
  return normalized.replace(/\/api(?:\/(generate|chat|tags))?$/i, '') || DEFAULT_OLLAMA_BASE;
};

const timeoutFetch = async (input, init = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const getHeaders = ({ includeJson = false } = {}) => {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  const apiKey = String(process.env.OLLAMA_API_KEY || '').trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
};

const pickModel = (models) => {
  const available = Array.isArray(models) ? models : [];
  const envModel = String(process.env.OLLAMA_MODEL || '').trim();
  if (envModel && available.includes(envModel)) return envModel;

  for (const preferredModel of MODEL_PREFERENCE_ORDER) {
    if (available.includes(preferredModel)) return preferredModel;
  }

  const localFirst = available.find((name) => !/:cloud$/i.test(name));
  return localFirst || available[0] || '';
};

const assertOkResponse = async (response, label) => {
  if (response.ok) return;
  const detail = await response.text().catch(() => '');
  throw new Error(`${label} failed: ${response.status} ${response.statusText}${detail ? ` - ${detail.slice(0, 220)}` : ''}`);
};

const main = async () => {
  const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_API);
  const tagsUrl = `${baseUrl}/api/tags`;
  const generateUrl = `${baseUrl}/api/generate`;

  console.log(`[Ollama Test] Base URL: ${baseUrl}`);
  console.log('[Ollama Test] Checking /api/tags...');
  const tagsResponse = await timeoutFetch(tagsUrl, { method: 'GET', headers: getHeaders() });
  await assertOkResponse(tagsResponse, '/api/tags');

  const tagsJson = await tagsResponse.json();
  const models = (Array.isArray(tagsJson.models) ? tagsJson.models : [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean);

  if (models.length === 0) {
    throw new Error('No Ollama models were returned by /api/tags.');
  }

  const selectedModel = pickModel(models);
  if (!selectedModel) {
    throw new Error('No model could be selected for the generation test.');
  }

  console.log(`[Ollama Test] Selected model: ${selectedModel}`);
  console.log('[Ollama Test] Running /api/generate smoke request...');
  const generateResponse = await timeoutFetch(generateUrl, {
    method: 'POST',
    headers: getHeaders({ includeJson: true }),
    body: JSON.stringify({
      model: selectedModel,
      stream: false,
      prompt: 'Return exactly one executable R line that assigns x <- 42. No markdown.',
      options: {
        temperature: 0,
        num_predict: 48
      }
    })
  });
  await assertOkResponse(generateResponse, '/api/generate');

  const generateJson = await generateResponse.json();
  const output = String(generateJson.response || '').trim();
  if (!output) {
    throw new Error('Ollama returned an empty response for /api/generate.');
  }
  if (!/\bx\s*<-\s*42\b/.test(output) && !/<-/.test(output)) {
    throw new Error(`Unexpected generation output: ${output.slice(0, 140)}`);
  }

  console.log('[Ollama Test] PASS');
  console.log(`[Ollama Test] Output: ${output.split('\n')[0]}`);
};

main().catch((error) => {
  console.error(`[Ollama Test] FAIL: ${error?.message || error}`);
  process.exitCode = 1;
});
