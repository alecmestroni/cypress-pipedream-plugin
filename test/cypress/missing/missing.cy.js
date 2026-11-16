// Runs with cypress.missing.config.js, where pipedreamBearer and pipedreamSourceID are not set
describe("cypress-pipedream-plugin without configuration", () => {
  it("can be imported without the environment variables", () => {
    expect(Cypress.Commands).to.exist
  })

  it("fails with a clear error when a command is used", (done) => {
    cy.on("fail", (err) => {
      expect(err.message).to.include(
        "CYPRESS-PIPEDREAM-PLUGIN | Missing environment variables: env('pipedreamBearer') & env('pipedreamSourceID') needed"
      )
      expect(Cypress.fakePipedream.requests).to.have.length(0)
      done()
    })
    cy.getNewestMessage()
  })
})
