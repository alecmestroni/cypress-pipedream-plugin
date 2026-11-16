const { defineConfig } = require("cypress")

// Same project without the mandatory pipedreamBearer / pipedreamSourceID variables
module.exports = defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/missing/**/*.cy.js",
    video: false,
    screenshotOnRunFailure: false,
  },
})
