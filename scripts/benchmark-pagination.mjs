
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TOTAL_ENTRIES = 1000;
const PAGE_SIZE = 100;
const LATENCY = 50;

// Mock Contentful Client
const contentfulClient = {
  getEntries: async (query = {}) => {
    await sleep(LATENCY);
    const limit = query.limit || 100;
    const skip = query.skip || 0;
    const total = TOTAL_ENTRIES;

    const count = Math.min(limit, Math.max(0, total - skip));
    const items = Array(count).fill(0).map((_, i) => ({
        sys: { id: `entry-${skip + i}` },
        fields: { title: `Entry ${skip + i}` }
    }));

    return {
      total,
      skip,
      limit,
      items
    };
  }
};

async function fetchSerial() {
  const start = performance.now();
  let items = [];
  let skip = 0;

  while (true) {
    const res = await contentfulClient.getEntries({ skip, limit: PAGE_SIZE });
    items.push(...res.items);
    if (items.length >= res.total) break;
    skip += PAGE_SIZE;
  }

  const end = performance.now();
  return { time: end - start, count: items.length };
}

async function fetchParallelBatched() {
  const start = performance.now();
  const PAGE_SIZE = 100;

  // 1. First fetch to get total
  const firstRes = await contentfulClient.getEntries({ limit: PAGE_SIZE, skip: 0 });
  const items = [...firstRes.items];
  const total = firstRes.total;

  // 2. Calculate remaining pages
  const remainingOffsets = [];
  for (let skip = PAGE_SIZE; skip < total; skip += PAGE_SIZE) {
    remainingOffsets.push(skip);
  }

  // 3. Fetch concurrently with batching (chunk size of 5)
  const CHUNK_SIZE = 5;
  for (let i = 0; i < remainingOffsets.length; i += CHUNK_SIZE) {
    const chunk = remainingOffsets.slice(i, i + CHUNK_SIZE);
    const chunkPromises = chunk.map(skip =>
      contentfulClient.getEntries({ limit: PAGE_SIZE, skip })
    );
    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(res => items.push(...res.items));
  }

  const end = performance.now();
  return { time: end - start, count: items.length };
}

async function run() {
  console.log(`Running Benchmark: ${TOTAL_ENTRIES} items, ${PAGE_SIZE} per page, ${LATENCY}ms latency\n`);

  const serial = await fetchSerial();
  console.log(`Serial Fetch:   ${serial.time.toFixed(2)}ms (Count: ${serial.count})`);

  const parallel = await fetchParallelBatched();
  console.log(`Parallel Fetch: ${parallel.time.toFixed(2)}ms (Count: ${parallel.count})`);

  const speedup = serial.time / parallel.time;
  console.log(`\nSpeedup: ${speedup.toFixed(2)}x`);
}

run();
