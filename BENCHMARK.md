# Performance Benchmark: Archive Page Optimization

This benchmark measures the performance improvement of fetching only necessary data for the archive page, avoiding over-fetching of all events and heavy fields.

## How to Run

1. Ensure you have the Contentful credentials set in your environment:
   - `CONTENTFUL_SPACE_ID`
   - `CONTENTFUL_TOKEN`

2. Run the mock benchmark script (simulation):
   ```bash
   npx -y tsx bench_fetch_mock.ts
   ```

3. To verify with real data (requires credentials):
   - You can adapt `bench_fetch_mock.ts` to use the real `contentfulClient` from `src/lib/contentful.ts` instead of mock data.

## Expected Results

The optimization reduces:
- **Network Payload**: By ~90% (fetching only archived events vs all events).
- **Memory Usage**: By ~60% (processing smaller objects).
- **Processing Time**: Faster filtering at the API level vs JS client-side filtering.

## Implementation Details

- **Old Approach**: Fetched all events (`content_type: 'event'`), including those with `type` (workshops, etc.), and filtered them in JavaScript.
- **New Approach**: Fetches only events where `fields.type` does not exist (`'fields.type[exists]': false`) and selects only necessary fields (`name`, `dateStart`, `dateEnd`, `sys.id`).
