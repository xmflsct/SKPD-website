import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart } from '@fortawesome/free-regular-svg-icons'

const Footer = () => {
  return (
    <footer className='text-center text-sm text-primary text-opacity-60 my-6'>
      SKPD © 1995-2020 | Made with{' '}
      <FontAwesomeIcon
        className='inline-block align-baseline h-3'
        icon={faHeart}
      />{' '}
      by{' '}
      <a href='https://xmflsct.com' target='_blank' rel="noreferrer">
        xmflsct
      </a>
    </footer>
  )
}

export default Footer
