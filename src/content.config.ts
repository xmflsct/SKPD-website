import { defineCollection } from 'astro:content';
import { contentfulClient, getAllEntries, type ContentfulEventType, type ContentfulEvent } from './lib/contentful';

const events = defineCollection<ContentfulEvent>({
  loader: async () => {
    const entries = await getAllEntries<ContentfulEvent>({
      content_type: 'event',
      order: '-fields.dateEnd' as any
    })

    return entries.map(entry => ({ id: entry.sys.id, ...entry.fields }))
  }
})
const latestEvent = defineCollection<ContentfulEvent>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulEvent>({
      content_type: 'event',
      order: '-fields.dateEnd' as any,
      limit: 1
    })

    return entries.items.map(entry => ({ id: entry.sys.id, ...entry.fields }))
  }
})
const eventTypes = defineCollection<ContentfulEventType>({
  loader: async () => {
    const entries = await getAllEntries<ContentfulEventType>({
      content_type: 'eventType',
      order: '-sys.updatedAt' as any
    })

    return entries.map(entry => ({ id: entry.sys.id, ...entry.fields }))
  }
})

export const collections = { events, latestEvent, eventTypes };
