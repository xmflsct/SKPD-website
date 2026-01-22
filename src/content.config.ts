import { defineCollection } from 'astro:content';
import { contentfulClient, type ContentfulEventType, type ContentfulEvent } from './lib/contentful';
import { fetchAllEntries } from './lib/contentful-loader';

const events = defineCollection<ContentfulEvent>({
  loader: async () => {
    const items = await fetchAllEntries<ContentfulEvent>(contentfulClient, {
      content_type: 'event',
      order: '-fields.dateEnd' as any
    })

    return items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})
const eventTypes = defineCollection<ContentfulEventType>({
  loader: async () => {
    const items = await fetchAllEntries<ContentfulEventType>(contentfulClient, {
      content_type: 'eventType',
      order: '-sys.updatedAt' as any
    })

    return items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})

export const collections = { events, eventTypes };
