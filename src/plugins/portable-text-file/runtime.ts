import { definePlugin } from 'emdash'

export function createPlugin() {
  return definePlugin({
    id: 'skpd-portable-text-file',
    version: '1.0.0',
    admin: {
      portableTextBlocks: [
        {
          type: 'file',
          label: 'Bestand',
          icon: 'paperclip',
          description: 'Voeg een downloadbaar bestand uit de mediabibliotheek toe.',
          category: 'Media',
          fields: [
            {
              type: 'media_picker',
              action_id: 'url',
              label: 'Bestand',
              mime_type_filter: 'application/',
              placeholder: 'Kies een bestand uit de mediabibliotheek',
            },
            {
              type: 'text_input',
              action_id: 'label',
              label: 'Linktekst',
              placeholder: 'Bijvoorbeeld: Download het reglement',
            },
          ],
        },
      ],
    },
  })
}
