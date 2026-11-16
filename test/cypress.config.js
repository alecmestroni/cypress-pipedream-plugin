const { defineConfig } = require("cypress")

// The `expose` configuration only exists from Cypress 15.10.0
const [major, minor] = require("cypress/package.json").version.split(".").map(Number)
const supportsExpose = major > 15 || (major === 15 && minor >= 10)

module.exports = defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
    screenshotOnRunFailure: false,
  },
  env: {
    pipedreamBearer: "Bearer test-token",
    pipedreamSourceID: "dc_test",
    // 0.05 minutes = 3 seconds: keeps the "no message received" test short
    pipedreamMaxRetries: 0.05,
    pipedreamFolderPath: "cypress/fixtures/sms_response",
  },
  // Non-sensitive values can also come from `expose` (Cypress >= 15.10.0)
  ...(supportsExpose ? { expose: { pipedreamFileName: "exposed.json" } } : {}),
})
