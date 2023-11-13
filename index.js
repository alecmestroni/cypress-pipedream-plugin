if (Cypress.env('pipedreamBearer') && Cypress.env('pipedreamUrl')) {
    Cypress.Commands.add('getLastMessage', (count = 0) => {
        const dir = Cypress.env('pipedreamFolderPath') ? Cypress.env('pipedreamFolderPath') : 'cypress/fixtures/sms_response'

        const HEADERS = {
            "Authorization": Cypress.env('pipedreamBearer'),
        }

        const options = {
            url: Cypress.env('pipedreamUrl') + "/event_summaries",
            headers: HEADERS,
        }
        // Loop checking every 1000ms for a max of pipedreamMaxRetries times/seconds
        const maxRetries = Cypress.env('pipedreamMaxRetries') ? Cypress.env('pipedreamMaxRetries') : 10
        if (count === maxRetries) {
            throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | No message received in ${Cypress.env('pipedreamMaxRetries')}seconds, please check ${Cypress.env('pipedreamUrl')}`)
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
                    if (body.includes('https')) {
                        // Regex to find the link
                        const tempUrl = body.match(/(https:\/\/.*?) /)[1]
                        cy.log('〰️ ' + 'URL detected: "' + tempUrl + '"')
                        // Write file with the link
                        cy.writeFile(dir + '/URL.json', JSON.stringify(tempUrl))
                    } else {
                        // Regex to find the OTP
                        const otp = body.match(/\d+/g)[0]
                        cy.log('〰️ ' + 'OTP detected: "' + otp + '"')
                        // Write file with the OTP
                        cy.writeFile(dir + '/OTP.json', JSON.stringify(otp))
                    }
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
            url: Cypress.env('pipedreamUrl') + "/events",
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
    throw new Error(`CYPRESS-PIPEDREAM-PLUGIN | Missing environment variables: env('pipedreamBearer') & env('pipedreamUrl') needed`)

}