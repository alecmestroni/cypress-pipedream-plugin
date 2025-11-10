const writeSMS = function (body) {
  const fileName = Cypress.env("pipedreamFileName") ?? "message.json"
  const dir = Cypress.env("pipedreamFolderPath") ?? "cypress/fixtures/sms_response"
  cy.writeFile(dir + "/" + fileName, JSON.stringify(body))
}

const HEADERS = {
  Authorization: Cypress.env("pipedreamBearer"),
}
const baseUrl = "https://api.pipedream.com/v1/sources/" + Cypress.env("pipedreamSourceID")
const options = {
  url: baseUrl + "/event_summaries",
  headers: HEADERS,
}

const deleteMessage = (messageId) => {
  const deleteOptions = {
    method: "DELETE",
    url: baseUrl + "/events?start_id=" + messageId + "&end_id=" + messageId,
    headers: HEADERS,
  }
  cy.request(deleteOptions).then((res) => {
    cy.log(`Message ${messageId} deleted`)
    expect(res.status).to.be.oneOf([200, 202, 204])
  })
}

const getMessage = (type, count = 0, deleteAfter = false) => {
  const dir = Cypress.env("pipedreamFolderPath") ?? "cypress/fixtures/sms_response"

  const maxRetries = Cypress.env("pipedreamMaxRetries") ?? 1
  const waitTime = 5

  // Loop checking every waitTime seconds for a max of pipedreamMaxRetries times/seconds
  if (count * waitTime >= maxRetries * 60) {
    throw new Error(
      `CYPRESS-PIPEDREAM-PLUGIN | No message received in ${maxRetries} minutes, please check https://pipedream.com/sources/${Cypress.env(
        "pipedreamSourceID"
      )}`
    )
  }
  cy.log(dir)
  cy.request(options).then((res) => {
    let newMessageAvailable = false
    let SMSBody
    let messageId
    if (res.body.data.length !== 0) {
      newMessageAvailable = true
      expect(res.status).to.be.eq(200)
      expect(res.statusText).to.be.eq("OK")
      expect(res.body.data).to.not.be.empty

      switch (type) {
        case "newest":
          SMSBody = res.body.data[0].event.Body
          messageId = res.body.data[0].id
          cy.log("Message: " + SMSBody)
          cy.log("ID: " + messageId)
          writeSMS(SMSBody)
          if (deleteAfter) {
            deleteMessage(messageId)
          }
          break

        case "oldest":
          SMSBody = res.body.data[res.body.data.length - 1].event.Body
          messageId = res.body.data[res.body.data.length - 1].id
          cy.log("Message: " + SMSBody)
          cy.log("ID: " + messageId)
          writeSMS(SMSBody)
          if (deleteAfter) {
            deleteMessage(messageId)
          }
          break

        case "array":
          const messagesArray = []
          res.body.data.forEach((item) => {
            if (item.event && item.event.Body) {
              messagesArray.push({
                id: item.id,
                message: item.event.Body,
              })
            }
          })
          cy.log(`Found ${messagesArray.length} messages`)
          cy.log("Messages: " + JSON.stringify(messagesArray))
          writeSMS(messagesArray)
          break

        default:
          throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | Invalid type: ${type}. Use 'newest', 'oldest', or 'array'`)
      }
    }
    if (newMessageAvailable === false) {
      cy.wait(waitTime * 1000)
      getMessage(type, ++count, deleteAfter)
    }
  })
}

if (Cypress.env("pipedreamBearer") && Cypress.env("pipedreamSourceID")) {
  Cypress.Commands.add("getOldestMessage", (deleteAfter = false) => {
    getMessage("oldest", 0, deleteAfter)
  })

  Cypress.Commands.add("getNewestMessage", (deleteAfter = false) => {
    getMessage("newest", 0, deleteAfter)
  })

  Cypress.Commands.add("getArrayMessage", (deleteAfter = false) => {
    getMessage("array", 0, deleteAfter)
  })

  Cypress.Commands.add("deleteSpecificMessage", (messageId) => {
    if (!messageId) {
      throw new Error("CYPRESS-PIPEDREAM-PLUGIN | messageId is required")
    }
    deleteMessage(messageId)
  })

  Cypress.Commands.add("clearMessagesHistory", () => {
    const options = {
      method: "DELETE",
      url: baseUrl + "/events",
      headers: HEADERS,
    }
    cy.request(options).then((res) => {
      expect(res.body).to.be.eq(" ")
      expect(res.status).to.be.eq(202)
    })
  })

  Cypress.Commands.add("clearHistorySendSmsAndGetSMS", () => {
    cy.clearMessagesHistory()
    cy.get('[data-cy="send-sms"]', { timeout: 120000 }).click() // Command to send the SMS from the frontend
    cy.getNewestMessage()
  })
} else {
  throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | Missing environment variables: env('pipedreamBearer') & env('pipedreamSourceID') needed`)
}
