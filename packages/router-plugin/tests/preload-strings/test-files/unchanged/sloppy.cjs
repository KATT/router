// Sloppy mode, which a module can't be: left for the bundler
const { createRouter } = require('@tanstack/react-router')

with (Math) {
  module.exports = createRouter({ defaultPreload: 'intent', delay: 010 })
}
