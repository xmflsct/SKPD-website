import React from 'react'
import { graphql, useStaticQuery, Link } from 'gatsby'

import slugify from 'slugify'

const Header = () => {
  const data = useStaticQuery(graphql`
    {
      allContentfulEventType {
        nodes {
          contentful_id
          name
        }
      }
    }
  `)
  return (
    <header className='flex flex-col md:flex-row md:justify-around sticky top-0 z-50 bg-white py-4 text-sm'>
      <Link to='/'>home</Link>
      {data.allContentfulEventType.nodes.map(node => (
        <Link
          to={`/${slugify(node.name, { lower: true })}`}
          key={node.contentful_id}
        >
          {node.name}
        </Link>
      ))}
      <Link to='/archief'>archief</Link>
      <Link to='/over-skpd'>over SKPD</Link>
    </header>
  )
}

export default Header
