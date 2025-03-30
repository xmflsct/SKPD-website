import type { EntryFieldTypes } from "contentful";
import * as contentful from "contentful";
import slugify from "slugify";

export const contentfulClient = contentful.createClient({
  space: import.meta.env.CONTENTFUL_SPACE_ID,
  accessToken: import.meta.env.CONTENTFUL_TOKEN
});

interface ContentfulEvent {
  contentTypeId: 'event'
  fields: {
    name: EntryFieldTypes.Text
    dateStart: EntryFieldTypes.Date
    dateEnd: EntryFieldTypes.Date
    type: EntryFieldTypes.EntryLink<ContentfulEventType>
    featuredImage: EntryFieldTypes.AssetLink
    description: EntryFieldTypes.RichText
  }
}

interface ContentfulEventType {
  contentTypeId: 'eventType'
  fields: {
    name: EntryFieldTypes.Text
    slug: EntryFieldTypes.Text
  }
}

interface ContentfulPage {
  contentTypeId: 'page'
  fields: {
    title: EntryFieldTypes.Text
    content: EntryFieldTypes.RichText
  }
}

export const contentfulSlug = (name: string): string => {
  return slugify(name, { lower: true, locale: 'nl', remove: /[*+~.()'"!:@]/g })
}

export type { ContentfulEvent, ContentfulEventType, ContentfulPage };
