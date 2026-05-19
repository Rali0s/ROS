import assert from 'node:assert/strict';
import {
  createDemoFalconFindings,
  createInMemoryFalconStore,
  deriveCisaScore,
  ingestFalconFindings,
  sortFalconFindings,
} from '../src/utils/blackFalcon.js';

const demoCards = await createDemoFalconFindings(15);
assert.equal(demoCards.length, 15, 'demo mode should create 15 cards');
assert.ok(demoCards.every((card) => card.hexId?.startsWith('0x')), 'each demo card should have a HEX ID');
assert.ok(demoCards.every((card) => /^[a-f0-9]{64}$/i.test(card.hash)), 'each demo card should have a SHA-256 hash');
assert.ok(demoCards.some((card) => card.cisaRanked), 'demo set should include ranked CISA records');
assert.ok(demoCards.some((card) => !card.cisaRanked), 'demo set should include non-ranked CISA records');

const sorted = sortFalconFindings([
  { id: 'low', cisaRanked: true, cisaScore: 41, dueDate: '2026-06-01', updatedAt: '2026-01-01' },
  { id: 'nr', cisaRanked: false, cisaScore: null, dueDate: '', updatedAt: '2026-01-01' },
  { id: 'high', cisaRanked: true, cisaScore: 92, dueDate: '2026-06-01', updatedAt: '2026-01-01' },
]);
assert.deepEqual(sorted.map((item) => item.id), ['high', 'low', 'nr'], 'ranked score sort should lead');

const nonRanked = deriveCisaScore({ forceNonRanked: true });
assert.equal(nonRanked.cisaRanked, false, 'forced non-ranked items should not receive a score');
assert.equal(nonRanked.cisaScore, null, 'forced non-ranked score should be null');

const store = createInMemoryFalconStore();
const total = 100000;
const result = await ingestFalconFindings({
  total,
  batchSize: 5000,
  store,
  fetchBatch: async ({ offset, limit }) => ({
    resources: Array.from({ length: limit }, (_, index) => {
      const id = offset + index;
      return {
        id: `mock-${id}`,
        hash: `hash-${id}`,
        cisaRanked: true,
        cisaScore: 100 - (id % 100),
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
    }),
    meta: {
      after: offset + limit < total ? String(offset + limit) : '',
    },
  }),
});
assert.equal(result.pulled, total, 'mock ingestion should pull 100k records');
assert.equal(await store.count(), total, 'in-memory store should retain 100k unique records');

const dedupe = await store.putBatch([
  {
    id: 'duplicate-id',
    hash: 'hash-42',
    cisaRanked: true,
    cisaScore: 88,
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]);
assert.equal(dedupe.updated, 1, 'duplicate hashes should update existing records');
assert.equal(await store.count(), total, 'duplicate update should not increase total count');

const cancelStore = createInMemoryFalconStore();
const controller = new AbortController();
let canceled = false;
try {
  await ingestFalconFindings({
    total: 10000,
    batchSize: 1000,
    signal: controller.signal,
    store: cancelStore,
    fetchBatch: async ({ offset, limit }) => ({
      resources: Array.from({ length: limit }, (_, index) => {
        const id = offset + index;
        return {
          id: `cancel-${id}`,
          hash: `cancel-hash-${id}`,
          cisaRanked: true,
          cisaScore: 70,
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      }),
      meta: {
        after: String(offset + limit),
      },
    }),
    onProgress: (progress) => {
      if (progress.pulled >= 2000) {
        controller.abort();
      }
    },
  });
} catch (error) {
  canceled = error?.name === 'AbortError';
}

assert.equal(canceled, true, 'ingestion should honor cancellation');
assert.ok((await cancelStore.count()) < 10000, 'canceled ingestion should stop before total');

console.log('Black Falcon helper tests passed.');
