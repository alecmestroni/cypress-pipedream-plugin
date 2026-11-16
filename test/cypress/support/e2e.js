import "cypress-pipedream-plugin"

// In-memory fake of the Pipedream API: `cy.request` is overwritten so that the tests
// run offline, without a Pipedream account.
const fake = {
  inbox: [],
  requests: [],
  setInbox(messages) {
    fake.inbox = messages.map((message) => ({ id: message.id, event: { Body: message.body } }))
    fake.requests = []
  },
}
Cypress.fakePipedream = fake

Cypress.Commands.overwrite("request", (originalFn, options) => {
  fake.requests.push(options)
  const method = options.method ?? "GET"
  const url = new URL(options.url)

  if (method === "GET" && url.pathname.endsWith("/event_summaries")) {
    return { status: 200, statusText: "OK", body: { data: fake.inbox } }
  }
  if (method === "DELETE" && url.pathname.endsWith("/events")) {
    const startId = url.searchParams.get("start_id")
    if (startId) {
      fake.inbox = fake.inbox.filter((item) => item.id !== startId)
      return { status: 204, statusText: "No Content", body: "" }
    }
    fake.inbox = []
    return { status: 202, statusText: "Accepted", body: " " }
  }
  throw new Error("Unexpected request in the fake Pipedream API: " + method + " " + options.url)
})
