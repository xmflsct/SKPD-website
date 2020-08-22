import React from 'react'
import { Link } from 'gatsby'

const Header = () => {
  return (
    <header className='flex justify-between md:justify-around sticky top-0 z-50 bg-white py-4 text-sm'>
      <Link to='/'>home</Link>
      <Link to='/terra-in-china'>Terra in China</Link>
      <Link to='/archief'>archief</Link>
      <Link to='/over-skpd'>over SKPD</Link>
    </header>
  )
}

export default Header
