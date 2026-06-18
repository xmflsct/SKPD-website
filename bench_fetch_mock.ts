// bench_fetch_mock.ts

interface MockEntry {
  sys: { id: string };
  fields: {
    name: string;
    dateStart: string;
    dateEnd: string;
    type?: { sys: { id: string } };
    featuredImage?: { sys: { id: string }, fields: { file: { url: string } } };
    description?: { content: any[] };
  };
}

// Generate mock data
const TOTAL_ITEMS = 10000;
const ARCHIVED_ITEMS = 1000;

console.log(`Generating ${TOTAL_ITEMS} mock events...`);

const mockData: MockEntry[] = [];
for (let i = 0; i < TOTAL_ITEMS; i++) {
  const isArchived = i < ARCHIVED_ITEMS;
  const entry: MockEntry = {
    sys: { id: `event-${i}` },
    fields: {
      name: `Event ${i}`,
      dateStart: new Date().toISOString(),
      dateEnd: new Date().toISOString(),
      // Heavy fields
      featuredImage: { sys: { id: 'img' }, fields: { file: { url: 'https://example.com/image.jpg' } } },
      description: { content: new Array(100).fill({ nodeType: 'paragraph', content: [] }) }
    }
  };

  if (!isArchived) {
    entry.fields.type = { sys: { id: 'eventType-1' } };
  }

  mockData.push(entry);
}

console.log('Mock data generated.');

// Baseline: Fetch all, filter in JS
console.log('\n--- Baseline: Fetch All + Filter in JS ---');
const startBaseline = process.hrtime();
// Force GC if possible or just snapshot
if (global.gc) { global.gc(); }
const baselineMemoryStart = process.memoryUsage().heapUsed;

// Simulate fetch all
const allEvents = mockData.map(e => ({ ...e })); // Simulate network cloning/deserialization
// Simulate filter
const filteredBaseline = allEvents.filter(event => !event.fields.type);

const baselineMemoryEnd = process.memoryUsage().heapUsed;
const endBaseline = process.hrtime(startBaseline);
const baselineTime = endBaseline[0] * 1000 + endBaseline[1] / 1e6;

console.log(`Time: ${baselineTime.toFixed(2)} ms`);
console.log(`Items: ${filteredBaseline.length}`);
console.log(`Memory Delta: ${((baselineMemoryEnd - baselineMemoryStart) / 1024 / 1024).toFixed(2)} MB`);


// Optimized: Fetch filtered, select fields
console.log('\n--- Optimized: API Filter + Select Fields ---');
const startOptimized = process.hrtime();
if (global.gc) { global.gc(); }
const optimizedMemoryStart = process.memoryUsage().heapUsed;

// Simulate fetch filtered (only archived items)
// In reality, this happens on the server, so we only receive the filtered list over the wire.
// We also simulate selecting only specific fields (deserialization of smaller payload)
const archivedOnly = mockData
  .filter(e => !e.fields.type) // Database filter simulation
  .map(e => ({ // Select fields simulation
    sys: { id: e.sys.id },
    fields: {
      name: e.fields.name,
      dateStart: e.fields.dateStart,
      dateEnd: e.fields.dateEnd
    }
  }));

const optimizedMemoryEnd = process.memoryUsage().heapUsed;
const endOptimized = process.hrtime(startOptimized);
const optimizedTime = endOptimized[0] * 1000 + endOptimized[1] / 1e6;

console.log(`Time: ${optimizedTime.toFixed(2)} ms`);
console.log(`Items: ${archivedOnly.length}`);
console.log(`Memory Delta: ${((optimizedMemoryEnd - optimizedMemoryStart) / 1024 / 1024).toFixed(2)} MB`);

console.log(`\nImprovement: ${(baselineTime / optimizedTime).toFixed(2)}x faster (simulation)`);
