import PropTypes from 'prop-types'
import React from 'react'
import { Helmet } from 'react-helmet'
import { useStaticQuery, graphql } from 'gatsby'

function Seo ({ title, keywords, description }) {
  const { site } = useStaticQuery(
    graphql`
      query {
        site {
          siteMetadata {
            title
          }
        }
      }
    `
  )

  return (
    <Helmet title={title} titleTemplate={`%s | ${site.siteMetadata.title}`}>
      <html lang='nl-NL' />
      <meta name='description' content={description} />
      {keywords && <meta name='keywords' content={keywords.join(', ')} />}
      <meta name='og:title' content={title} />
      <meta name='og:description' content={description} />
      <meta name='og:type' content='website' />
    </Helmet>
  )
}

Seo.propTypes = {
  title: PropTypes.string.isRequired,
  keywords: PropTypes.arrayOf(PropTypes.string),
  description: PropTypes.string.isRequired
}

export default Seo
