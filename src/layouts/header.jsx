import React from 'react'
import { graphql, useStaticQuery, Link } from 'gatsby'

import slugify from 'slugify'

const Header = () => {
  const data = useStaticQuery(graphql`
    {
      allContentfulMenu {
        nodes {
          contentful_id
          name
        }
      }
    }
  `)
  return (
    <header className='flex flex-col md:flex-row md:justify-around md:sticky md:top-0 md:z-50 md:bg-white py-4 text-sm'>
      <Link to='/'>home</Link>
      {data.allContentfulMenu.nodes.map(node => (
        <Link to={`/${slugify(node.name, { lower: true })}`} key={node.contentful_id}>
          {node.name}
        </Link>
      ))}
      <Link to='/archief'>archief</Link>
      <Link to='/over-skpd'>over SKPD</Link>
    </header>
  )
}

export default Header
