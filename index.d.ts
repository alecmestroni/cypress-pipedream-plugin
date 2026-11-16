/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Retrieves the newest SMS of the Pipedream source and saves its body in the configured file.
     * @param deleteAfter Deletes the message from Pipedream after reading it (default: false).
     */
    getNewestMessage(deleteAfter?: boolean): Chainable<void>

    /**
     * Retrieves the oldest SMS of the Pipedream source and saves its body in the configured file.
     * @param deleteAfter Deletes the message from Pipedream after reading it (default: false).
     */
    getOldestMessage(deleteAfter?: boolean): Chainable<void>

    /**
     * Retrieves every SMS of the Pipedream source and saves them in the configured file
     * as an array of `{ id, message }` objects.
     */
    getArrayMessage(): Chainable<void>

    /**
     * Deletes a specific message of the Pipedream source.
     * @param messageId The ID of the message, as saved by `getArrayMessage()`.
     */
    deleteSpecificMessage(messageId: string): Chainable<void>

    /** Clears the entire SMS history of the Pipedream source. */
    clearMessagesHistory(): Chainable<void>

    /**
     * Clears the history, clicks the `[data-cy="send-sms"]` element and retrieves the newest SMS.
     */
    clearHistorySendSmsAndGetSMS(): Chainable<void>
  }
}
