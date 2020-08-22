import PropTypes from 'prop-types'
import React from 'react'
import { graphql } from 'gatsby'

import Layout from '../layouts/layout'
import Event from '../components/event'

const Index = ({ data }) => {
  return (
    <Layout
      SEOtitle='Home'
      SEOkeywords={['Terra', 'Delft', 'Terra Delft']}
      SEOdescription='SKPD Website'
    >
      <Event data={data.allContentfulEvent.nodes[0]} />
    </Layout>
  )
}

Index.propTypes = {
  data: PropTypes.object.isRequired
}

export const query = graphql`
  query index {
    allContentfulEvent(limit: 1, sort: { fields: dateEnd, order: DESC }) {
      nodes {
        ...EventDefault
      }
    }
  }
`

export default Index
