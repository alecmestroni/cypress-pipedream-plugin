const DIR = "cypress/fixtures/sms_response"
// On Cypress >= 15.10.0 the file name comes from the `expose` configuration, otherwise the default is used
const FILE = DIR + "/" + (typeof Cypress.expose === "function" ? "exposed.json" : "message.json")
const BASE_URL = "https://api.pipedream.com/v1/sources/dc_test"

const fake = Cypress.fakePipedream

describe("cypress-pipedream-plugin", () => {
  beforeEach(() => {
    // Newest message first, like the Pipedream API
    fake.setInbox([
      { id: "3-0", body: "newest message" },
      { id: "2-0", body: "middle message" },
      { id: "1-0", body: "oldest message" },
    ])
  })

  it("reads the bearer and the source ID from the Cypress environment", () => {
    cy.getNewestMessage().then(() => {
      expect(fake.requests[0].url).to.equal(BASE_URL + "/event_summaries")
      expect(fake.requests[0].headers).to.deep.equal({ Authorization: "Bearer test-token" })
    })
  })

  it("getNewestMessage saves the newest message", () => {
    cy.getNewestMessage()
    cy.readFile(FILE).should("equal", "newest message")
    cy.then(() => expect(fake.inbox).to.have.length(3))
  })

  it("getNewestMessage(true) deletes the message after reading it", () => {
    cy.getNewestMessage(true)
    cy.readFile(FILE).should("equal", "newest message")
    cy.then(() => {
      expect(fake.inbox.map((item) => item.id)).to.deep.equal(["2-0", "1-0"])
      expect(fake.requests[1].url).to.equal(BASE_URL + "/events?start_id=3-0&end_id=3-0")
    })
  })

  it("getOldestMessage saves the oldest message", () => {
    cy.getOldestMessage()
    cy.readFile(FILE).should("equal", "oldest message")
  })

  it("getOldestMessage(true) deletes the message after reading it", () => {
    cy.getOldestMessage(true)
    cy.then(() => expect(fake.inbox.map((item) => item.id)).to.deep.equal(["3-0", "2-0"]))
  })

  it("getArrayMessage saves every message with its ID", () => {
    cy.getArrayMessage()
    cy.readFile(FILE).should("deep.equal", [
      { id: "3-0", message: "newest message" },
      { id: "2-0", message: "middle message" },
      { id: "1-0", message: "oldest message" },
    ])
  })

  it("deleteSpecificMessage deletes one message", () => {
    cy.deleteSpecificMessage("2-0")
    cy.then(() => expect(fake.inbox.map((item) => item.id)).to.deep.equal(["3-0", "1-0"]))
  })

  it("deleteSpecificMessage requires a message ID", (done) => {
    cy.on("fail", (err) => {
      expect(err.message).to.include("messageId is required")
      done()
    })
    cy.deleteSpecificMessage()
  })

  it("clearMessagesHistory deletes the whole history", () => {
    cy.clearMessagesHistory()
    cy.then(() => {
      expect(fake.inbox).to.have.length(0)
      expect(fake.requests[0]).to.deep.include({ method: "DELETE", url: BASE_URL + "/events" })
    })
  })

  it("fails when no message is received within pipedreamMaxRetries", (done) => {
    fake.setInbox([])
    cy.on("fail", (err) => {
      expect(err.message).to.include("No message received in 0.05 minutes")
      expect(err.message).to.include("https://pipedream.com/sources/dc_test")
      done()
    })
    cy.getNewestMessage()
  })
})
