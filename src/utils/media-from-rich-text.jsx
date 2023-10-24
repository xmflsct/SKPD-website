import React from 'react'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileAlt } from '@fortawesome/free-regular-svg-icons'
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'

export const mediaFromRichText = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: node => {
      if (node.data.target.fields?.file['nl-NL'].contentType.includes('image')) {
        return (
          <p>
            <img
              src={node.data.target.fields.file['nl-NL'].url}
              alt={node.data.target.fields.title['nl-NL']}
            />
          </p>
        )
      } else {
        return (
          <p>
            <a
              href={`https:${node.data.target.fields?.file['nl-NL'].url}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              {node.data.target.fields.title['nl-NL']}{' '}
              <FontAwesomeIcon
                className='inline-block align-baseline h-3'
                icon={faFileAlt}
              />
            </a>
          </p>
        )
      }
    },
    [INLINES.HYPERLINK]: node => (
      <a href={node.data.uri} target='_blank' rel='noopener noreferrer'>
        {node.content[0].value}{' '}
        <FontAwesomeIcon
          className='inline-block align-baseline h-3'
          icon={faExternalLinkAlt}
        />
      </a>
    ),
    [INLINES.ASSET_HYPERLINK]: node => (
      <a
        href={node.data.target.fields.file['nl-NL'].url}
        target='_blank'
        rel='noopener noreferrer'
      >
        {node.content[0].value}{' '}
        <FontAwesomeIcon
          className='inline-block align-baseline h-3'
          icon={faFileAlt}
        />
      </a>
    )
  }
}
