const path = require(`path`)
const slugify = require(`slugify`)

exports.createPages = async ({ graphql, actions: { createPage } }) => {
  const templateEventType = path.resolve(`src/templates/event-type.jsx`)
  const eventTypes = await graphql(`
    {
      eventTypes: allContentfulMenu {
        nodes {
          contentful_id
          name
        }
      }
    }
  `)
  await Promise.all(
    eventTypes.data.eventTypes.nodes.map(async node => {
      createPage({
        path: `/${slugify(node.name, { lower: true })}`,
        component: templateEventType,
        context: {
          contentful_id: node.contentful_id
        }
      })
    })
  )
}
