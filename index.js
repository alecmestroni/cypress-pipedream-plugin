const PREFIX = "CYPRESS-PIPEDREAM-PLUGIN | "

const KEYS = ["pipedreamBearer", "pipedreamSourceID", "pipedreamMaxRetries", "pipedreamFolderPath", "pipedreamFileName"]
// The bearer is a secret and is only read from `env`.
// The other values are not sensitive: they can also be provided through the `expose` configuration.
const EXPOSABLE_KEYS = KEYS.filter((key) => key !== "pipedreamBearer")

const readExposed = (key) => (typeof Cypress.expose === "function" ? Cypress.expose(key) : undefined)

// `Cypress.env()` is deprecated since Cypress 15.10.0 and removed in Cypress 16:
// use the async `cy.env()` command when available, fall back to `Cypress.env()` on older versions.
const readEnv = () => {
  if (typeof cy.env === "function") {
    return cy.env(KEYS, { log: false })
  }
  const env = {}
  KEYS.forEach((key) => {
    env[key] = Cypress.env(key)
  })
  return cy.wrap(env, { log: false })
}

const getConfig = () =>
  readEnv().then((env) => {
    const value = (key) => env[key] ?? (EXPOSABLE_KEYS.includes(key) ? readExposed(key) : undefined)

    const bearer = value("pipedreamBearer")
    const sourceID = value("pipedreamSourceID")
    if (!bearer || !sourceID) {
      throw new Error(PREFIX + "Missing environment variables: env('pipedreamBearer') & env('pipedreamSourceID') needed")
    }

    return {
      sourceID,
      baseUrl: "https://api.pipedream.com/v1/sources/" + sourceID,
      headers: { Authorization: bearer },
      maxRetries: value("pipedreamMaxRetries") ?? 1,
      dir: value("pipedreamFolderPath") ?? "cypress/fixtures/sms_response",
      fileName: value("pipedreamFileName") ?? "message.json",
    }
  })

const writeSMS = (config, body) => {
  cy.writeFile(config.dir + "/" + config.fileName, JSON.stringify(body))
}

const deleteMessage = (config, messageId) => {
  const deleteOptions = {
    method: "DELETE",
    url: config.baseUrl + "/events?start_id=" + messageId + "&end_id=" + messageId,
    headers: config.headers,
  }
  cy.request(deleteOptions).then((res) => {
    cy.log(`Message ${messageId} deleted`)
    expect(res.status).to.be.oneOf([200, 202, 204])
  })
}

const getMessage = (config, type, count = 0, deleteAfter = false) => {
  const waitTime = 5

  // Loop checking every waitTime seconds for a max of pipedreamMaxRetries times/seconds
  if (count * waitTime >= config.maxRetries * 60) {
    throw new Error(
      PREFIX + `No message received in ${config.maxRetries} minutes, please check https://pipedream.com/sources/${config.sourceID}`
    )
  }
  cy.log(config.dir)
  const options = {
    url: config.baseUrl + "/event_summaries",
    headers: config.headers,
  }
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
          writeSMS(config, SMSBody)
          if (deleteAfter) {
            deleteMessage(config, messageId)
          }
          break

        case "oldest":
          SMSBody = res.body.data[res.body.data.length - 1].event.Body
          messageId = res.body.data[res.body.data.length - 1].id
          cy.log("Message: " + SMSBody)
          cy.log("ID: " + messageId)
          writeSMS(config, SMSBody)
          if (deleteAfter) {
            deleteMessage(config, messageId)
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
          writeSMS(config, messagesArray)
          break

        default:
          throw new Error(PREFIX + `Invalid type: ${type}. Use 'newest', 'oldest', or 'array'`)
      }
    }
    if (newMessageAvailable === false) {
      cy.wait(waitTime * 1000)
      getMessage(config, type, ++count, deleteAfter)
    }
  })
}

Cypress.Commands.add("getOldestMessage", (deleteAfter = false) => {
  getConfig().then((config) => {
    getMessage(config, "oldest", 0, deleteAfter)
  })
})

Cypress.Commands.add("getNewestMessage", (deleteAfter = false) => {
  getConfig().then((config) => {
    getMessage(config, "newest", 0, deleteAfter)
  })
})

Cypress.Commands.add("getArrayMessage", (deleteAfter = false) => {
  getConfig().then((config) => {
    getMessage(config, "array", 0, deleteAfter)
  })
})

Cypress.Commands.add("deleteSpecificMessage", (messageId) => {
  if (!messageId) {
    throw new Error(PREFIX + "messageId is required")
  }
  getConfig().then((config) => {
    deleteMessage(config, messageId)
  })
})

Cypress.Commands.add("clearMessagesHistory", () => {
  getConfig().then((config) => {
    const options = {
      method: "DELETE",
      url: config.baseUrl + "/events",
      headers: config.headers,
    }
    cy.request(options).then((res) => {
      expect(res.body).to.be.eq(" ")
      expect(res.status).to.be.eq(202)
    })
  })
})

Cypress.Commands.add("clearHistorySendSmsAndGetSMS", () => {
  cy.clearMessagesHistory()
  cy.get('[data-cy="send-sms"]', { timeout: 120000 }).click() // Command to send the SMS from the frontend
  cy.getNewestMessage()
})
