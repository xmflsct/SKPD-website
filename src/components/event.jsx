import PropTypes from 'prop-types'
import React from 'react'
import Img from 'gatsby-image'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarAlt } from '@fortawesome/free-regular-svg-icons'
import moment from 'moment'
import 'moment/locale/nl'

import { mediaFromRichText } from '../utils/media-from-rich-text'

const Event = ({ data }) => {
  console.log(data.dateStart)
  return (
    <div className='border-b mb-6'>
      {data.featuredImage && <Img fluid={data.featuredImage.fluid} />}
      <h2>{data.name}</h2>
      <p className=''>
        <FontAwesomeIcon
          className='inline-block align-baseline h-3'
          icon={faCalendarAlt}
        />{' '}
        {moment(data.dateStart).format('LL')} -{' '}
        {moment(data.dateEnd).format('LL')}
      </p>
      {data.description &&
        documentToReactComponents(data.description.json, mediaFromRichText)}
    </div>
  )
}

Event.propTypes = {
  data: PropTypes.object.isRequired
}

export const query = graphql`
  fragment EventDefault on ContentfulEvent {
    name
    dateStart
    dateEnd
    terraInChina
    featuredImage {
      fluid(maxWidth: 620, quality: 100) {
        ...GatsbyContentfulFluid
      }
    }
    description {
      json
    }
  }
`

export default Event