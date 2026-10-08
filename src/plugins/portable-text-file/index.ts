import type { PluginDescriptor } from 'emdash'
import { fileURLToPath } from 'node:url'

/**
 * Adds a URL-backed file piece to every Portable Text editor.
 *
 * EmDash 1.2 restricts Block Kit's Media Library picker to images. The local
 * @emdash-cms/blocks patch widens that validation to application/* so this
 * piece can select PDFs and other documents. Remove the patch when upstream
 * accepts non-image MIME filters.
 */
export default function portableTextFile(): PluginDescriptor {
  return {
    id: 'skpd-portable-text-file',
    version: '1.0.0',
    entrypoint: fileURLToPath(new URL('./runtime.ts', import.meta.url)),
    componentsEntry: fileURLToPath(new URL('./components.ts', import.meta.url)),
  }
}
