import PropTypes from 'prop-types'
import React from 'react'
import { graphql } from 'gatsby'

import Layout from '../layouts/layout'
import Event from '../components/event'

const EventType = ({ data }) => {
  return (
    <Layout
      SEOtitle='Terra in China'
      SEOkeywords={['Terra', 'China', 'Terra in China']}
      SEOdescription='Terra in China'
    >
      {data.allContentfulEvent.nodes.map(node => (
        <div key={node.name}>
          <Event data={node} />
        </div>
      ))}
    </Layout>
  )
}

EventType.propTypes = {
  data: PropTypes.object.isRequired
}

export const query = graphql`
  query eventType($contentful_id: String) {
    allContentfulEvent(
      filter: { type: { contentful_id: { eq: $contentful_id } } }
      sort: { fields: dateEnd, order: DESC }
    ) {
      nodes {
        ...EventDefault
      }
    }
  }
`

export default EventType
