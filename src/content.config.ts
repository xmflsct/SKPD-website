import { defineCollection } from 'astro:content';
import { contentfulClient, type ContentfulEventType, type ContentfulEvent } from './lib/contentful';

const events = defineCollection<ContentfulEvent>({
  loader: async () => {
    const items = []
    let skip = 0
    while (true) {
      const entries = await contentfulClient.getEntries<ContentfulEvent>({
        content_type: 'event',
        order: '-fields.dateEnd' as any,
        skip,
        limit: 100
      })

      items.push(...entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields })))

      skip += entries.items.length
      if (skip >= entries.total) break
    }
    return items
  }
})
const eventTypes = defineCollection<ContentfulEventType>({
  loader: async () => {
    const items = []
    let skip = 0
    while (true) {
      const entries = await contentfulClient.getEntries<ContentfulEventType>({
        content_type: 'eventType',
        order: '-sys.updatedAt' as any,
        skip,
        limit: 100
      })

      items.push(...entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields })))

      skip += entries.items.length
      if (skip >= entries.total) break
    }
    return items
  }
})

export const collections = { events, eventTypes };
