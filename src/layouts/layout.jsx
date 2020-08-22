import PropTypes from 'prop-types'
import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import Img from 'gatsby-image'
import { config } from '@fortawesome/fontawesome-svg-core'

import Seo from './seo'
import Header from './header'
import Footer from './footer'
import anbiLogo from '../images/anbi-logo.svg'

const Layout = ({ children, SEOtitle, SEOkeywords, SEOdescription }) => {
  config.autoAddCss = false

  const data = useStaticQuery(graphql`
    {
      logo: file(relativePath: { eq: "logo.jpg" }) {
        childImageSharp {
          fluid(maxWidth: 147) {
            ...GatsbyImageSharpFluid_noBase64
          }
        }
      }
      metdank_1: file(relativePath: { eq: "metdank_1.png" }) {
        childImageSharp {
          fluid(maxWidth: 147) {
            ...GatsbyImageSharpFluid_noBase64
          }
        }
      }
      metdank_2: file(relativePath: { eq: "metdank_2.png" }) {
        childImageSharp {
          fluid(maxWidth: 147) {
            ...GatsbyImageSharpFluid_noBase64
          }
        }
      }
      metdank_3: file(relativePath: { eq: "metdank_3.jpg" }) {
        childImageSharp {
          fluid(maxWidth: 147) {
            ...GatsbyImageSharpFluid_noBase64
          }
        }
      }
    }
  `)

  return (
    <div className={'w-full max-w-screen-lg mx-auto px-6'}>
      <Seo
        title={SEOtitle}
        keywords={SEOkeywords}
        description={SEOdescription}
      />
      <Header />
      <div className='flex flex-row flex-wrap md:flex md:flex-row'>
        <main className={'w-full md:order-2 md:w-4/6 md:px-4'}>{children}</main>

        <div
          id='left-sidebar'
          className='w-1/2 pr-2 md:order-1 md:w-1/6 md:px-2'
        >
          <Img fluid={data.logo.childImageSharp.fluid} />
          <p className='text-xs italic pt-2 pb-4'>
            Stichting Keramiek Promotie Delft heeft ten doel het bevorderen van
            de belangstelling voor en de bekendheid met de nationale en
            internationale hedendaagse keramiek.
          </p>
          <img src={anbiLogo} alt='anbi logo' />
        </div>

        <div
          id='right-sidebar'
          className='w-1/2 pl-2 md:order-3 md:w-1/6 md:px-2'
        >
          <p className='text-xs italic pb-4'>
            Deze uitgave werd mede mogelijk gemaakt door: Gemeente Delft, P.M.
            de Klerk Keramiek Fonds, Stichting van Achterbergh - Domdof.
          </p>
          <Img fluid={data.metdank_1.childImageSharp.fluid} className='mb-5' />
          <Img fluid={data.metdank_2.childImageSharp.fluid} className='mb-5' />
          <Img fluid={data.metdank_3.childImageSharp.fluid} />
        </div>
      </div>
      <Footer />
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  SEOtitle: PropTypes.string.isRequired,
  SEOkeywords: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  SEOdescription: PropTypes.string.isRequired
}

export default Layout