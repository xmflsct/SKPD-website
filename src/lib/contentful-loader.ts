import type { ContentfulClientApi, EntrySkeletonType, Entry } from "contentful";

/**
 * Fetches all entries from a Contentful collection, handling pagination automatically.
 * Uses a parallel fetching strategy for optimal performance, with concurrency control.
 */
export async function fetchAllEntries<T extends EntrySkeletonType>(
  client: ContentfulClientApi<undefined>,
  query: any
): Promise<Array<Entry<T, undefined, string>>> {
  const limit = query.limit || 100;

  // 1. Fetch first page to get the total count
  const firstPage = await client.getEntries<T>({
    ...query,
    limit,
    skip: 0
  });

  const total = firstPage.total;
  const items = [...firstPage.items];

  // If we have all items, return early
  if (items.length >= total) {
    return items;
  }

  // 2. Calculate remaining pages
  const remainingOffsets = [];
  for (let skip = limit; skip < total; skip += limit) {
    remainingOffsets.push(skip);
  }

  // 3. Fetch concurrently with batching (chunk size of 5)
  const CHUNK_SIZE = 5;
  for (let i = 0; i < remainingOffsets.length; i += CHUNK_SIZE) {
    const chunk = remainingOffsets.slice(i, i + CHUNK_SIZE);

    const chunkPromises = chunk.map(skip =>
      client.getEntries<T>({
        ...query,
        limit,
        skip
      })
    );

    const chunkResults = await Promise.all(chunkPromises);
    chunkResults.forEach(result => {
      items.push(...result.items);
    });
  }

  return items;
}
