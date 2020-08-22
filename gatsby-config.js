require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`
})

module.exports = {
  siteMetadata: {
    title: 'SKPD',
    siteUrl: 'https://skpd.nl'
  },
  plugins: [
    {
      resolve: `gatsby-plugin-sass`,
      options: {
        postCssPlugins: [
          require('tailwindcss'),
          require('./tailwind.config.js') // Optional: Load custom Tailwind CSS configuration
        ]
      }
    },
    `gatsby-plugin-sharp`,
    'gatsby-plugin-sitemap',
    {
      resolve: 'gatsby-source-contentful', // Space - Content
      options: {
        host: process.env.CONTENTFUL_HOST,
        accessToken: process.env.CONTENTFUL_KEY,
        spaceId: process.env.CONTENTFUL_SPACE,
        environment: process.env.CONTENTFUL_ENVIRONMENT
      }
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'images',
        path: `${__dirname}/src/images`
      }
    },
    `gatsby-transformer-sharp`
  ]
}
