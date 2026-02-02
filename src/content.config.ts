import { defineCollection } from 'astro:content';
import { contentfulClient, type ContentfulEventType, type ContentfulEvent, type ContentfulPage } from './lib/contentful';

const events = defineCollection<ContentfulEvent>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulEvent>({
      content_type: 'event',
      order: '-fields.dateEnd' as any
    })

    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})
const eventTypes = defineCollection<ContentfulEventType>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulEventType>({
      content_type: 'eventType',
      order: '-sys.updatedAt' as any
    })

    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})

const pages = defineCollection<ContentfulPage>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulPage>({
      content_type: 'page',
    })

    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})

export const collections = { events, eventTypes, pages };
