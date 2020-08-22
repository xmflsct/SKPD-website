import PropTypes from 'prop-types'
import React from 'react'
import { graphql } from 'gatsby'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'

import Layout from '../layouts/layout'
import { mediaFromRichText } from '../utils/media-from-rich-text'

const OverSKPD = ({ data }) => {
  return (
    <Layout
      SEOtitle={data.contentfulPage.title}
      SEOkeywords={[data.contentfulPage.title]}
      SEOdescription={data.contentfulPage.title}
    >
      <h1>{data.contentfulPage.title}</h1>
      {documentToReactComponents(
        data.contentfulPage.content.json,
        mediaFromRichText
      )}
    </Layout>
  )
}

OverSKPD.propTypes = {
  data: PropTypes.object.isRequired
}

export const query = graphql`
  query overSKPD {
    contentfulPage(title: { eq: "Over SKPD" }) {
      title
      content {
        json
      }
    }
  }
`

export default OverSKPD
