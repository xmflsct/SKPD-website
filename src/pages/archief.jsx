import PropTypes from 'prop-types'
import React from 'react'
import { graphql } from 'gatsby'

import Layout from '../layouts/layout'
import Event from '../components/event'

const Archief = ({ data }) => {
  return (
    <Layout SEOtitle='Archief' SEOkeywords={['SKPD', 'Archief']} SEOdescription='SKPD Archief'>
      {data.allContentfulMenu.nodes.map(node => (
        <div key={node.name}>
          <Event data={node} />
        </div>
      ))}
    </Layout>
  )
}

Archief.propTypes = {
  data: PropTypes.object.isRequired
}

export const query = graphql`
  query archief {
    allContentfulMenu(skip: 1, sort: { fields: dateEnd, order: DESC }) {
      nodes {
        ...EventDefault
      }
    }
  }
`

export default Archief
