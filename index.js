const HEADERS = {
    "Authorization": Cypress.env('pipedreamBearer'),
}

const dir = Cypress.env('pipedreamFolderPath') ? Cypress.env('pipedreamFolderPath') : 'cypress/fixtures/sms_response'

const maxRetries = Cypress.env('pipedreamMaxRetries') ? Cypress.env('pipedreamMaxRetries') : 10

const fileName = Cypress.env('pipedreamFileName') ? Cypress.env('pipedreamFileName') : 'message.json'

const baseUrl = "https://api.pipedream.com/v1/sources/" + Cypress.env('pipedreamSourceID')

const writeSMS = function (body) {
    cy.writeFile(dir + fileName, JSON.stringify(body))
}

if (Cypress.env('pipedreamBearer') && Cypress.env('pipedreamSourceID')) {
    Cypress.Commands.add('getFirstMessage', (count = 0) => {
        const options = {
            url: baseUrl + "/event_summaries",
            headers: HEADERS,
        }
        // Loop checking every 1000ms for a max of pipedreamMaxRetries times/seconds
        if (count === maxRetries) {
            throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | No message received in ${Cypress.env('pipedreamMaxRetries')}seconds, please check ${Cypress.env('pipedreamSourceID')}`)
        }

        cy.request(options)
            .then((res) => {
                let newMessageAvailable = false
                if (res.body.data.length !== 0) {
                    newMessageAvailable = true
                    expect(res.status).to.be.eq(200)
                    expect(res.statusText).to.be.eq("OK")
                    expect(res.body.data).to.not.be.empty
                    const body = res.body.data[res.body.data.length - 1].event.Body
                    cy.log('📧 ' + body)
                    writeSMS(body)
                }
                if (newMessageAvailable === false) {
                    cy.wait(1000)
                    cy.getLastMessage(++count)
                }
            });
    })

    Cypress.Commands.add('getLastMessage', (count = 0) => {
        const options = {
            url: baseUrl + "/event_summaries",
            headers: HEADERS,
        }
        // Loop checking every 1000ms for a max of pipedreamMaxRetries times/seconds
        if (count === maxRetries) {
            throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | No message received in ${Cypress.env('pipedreamMaxRetries')}seconds, please check ${Cypress.env('pipedreamSourceID')}`)
        }

        cy.request(options)
            .then((res) => {
                let newMessageAvailable = false
                if (res.body.data.length !== 0) {
                    newMessageAvailable = true
                    expect(res.status).to.be.eq(200)
                    expect(res.statusText).to.be.eq("OK")
                    expect(res.body.data).to.not.be.empty
                    const body = res.body.data[0].event.Body
                    cy.log('📧 ' + body)
                    writeSMS(body)
                }
                if (newMessageAvailable === false) {
                    cy.wait(1000)
                    cy.getLastMessage(++count)
                }
            });
    })

    Cypress.Commands.add('clearMessagesHistory', () => {
        const options = {
            method: "DELETE",
            url: baseUrl + "/events",
            headers: HEADERS,
        }
        cy.request(options).then(res => {
            expect(res.body).to.be.eq(" ")
            expect(res.status).to.be.eq(202)
        })
    })

    Cypress.Commands.add('clearHistorySendSmsAndGetSMS', () => {
        cy.clearMessagesHistory()
        cy.get('[data-cy="send-sms"]', { timeout: 120000 }).click() // Command to send the SMS from the frontend
        cy.getLastMessage()
    })
} else {
    throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | Missing environment variables: env('pipedreamBearer') & env('pipedreamSourceID') needed`)

}