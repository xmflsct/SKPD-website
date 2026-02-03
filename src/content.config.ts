import { defineCollection } from 'astro:content';
import { contentfulClient, type ContentfulEventType, type ContentfulEvent, type ContentfulPage } from './lib/contentful';

const events = defineCollection<ContentfulEvent['fields']>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulEvent>({
      content_type: 'event',
      order: '-fields.dateEnd' as any,
      limit: 1000
    })

    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})
const eventTypes = defineCollection<ContentfulEventType['fields']>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulEventType>({
      content_type: 'eventType',
      order: '-sys.updatedAt' as any,
      limit: 1000
    })

    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})

const pages = defineCollection<ContentfulPage['fields']>({
  loader: async () => {
    const entries = await contentfulClient.getEntries<ContentfulPage>({
      content_type: 'page',
      limit: 1000
    })

    console.log(`Loaded ${entries.items.length} pages`);
    return entries.items.map(entry => ({ id: entry.sys.id, data: entry.fields }))
  }
})

export const collections = { events, eventTypes, pages };
