/// <reference types="cypress" />

/**
 * Custom Cypress commands for Collectivo testing
 */

/**
 * Login command - Logs in a user with email and password
 * @param email - User email address
 * @param password - User password
 * @example cy.login('admin@example.com', 'admin')
 */
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("http://localhost:3000/login");
  cy.get("#email").clear().type(email);
  cy.get("#password").clear().type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should("eq", "http://localhost:3000/");
});

/**
 * Logout command - Logs out the current user and clears session data
 * @example cy.logout()
 */
Cypress.Commands.add("logout", () => {
  cy.visit("http://localhost:3000/logout");
  cy.clearAllCookies();
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
});

/**
 * Reset database command - Calls the create_example_data endpoint to reset the database
 * This endpoint creates example users, memberships, tiles, shifts, etc.
 * Note: This operation takes several seconds to complete
 * @example cy.resetDatabase()
 */
Cypress.Commands.add("resetDatabase", () => {
  cy.request({
    method: "POST",
    url: "http://localhost:3000/api/create_example_data",
    timeout: 30000, // 30 seconds timeout for database reset
  }).then((response) => {
    expect(response.status).to.eq(200);
  });
});

/**
 * Select from USelectMenu component - Clicks the dropdown and selects an option
 * @param fieldName - The name attribute of the form field
 * @param value - The value to select (can be partial text match)
 * @example cy.selectFromMenu('directus_users__memberships_gender', 'male')
 */
Cypress.Commands.add("selectFromMenu", (fieldName: string, value: string) => {
  // Find the form group with the name attribute and click the USelectMenu trigger
  cy.get(`[name="${fieldName}"]`).click();
  // Click the option containing the value text
  cy.contains('[role="option"]', value).click();
});

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       * @param email - User email address
       * @param password - User password
       * @example cy.login('admin@example.com', 'admin')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Logout the current user and clear session data
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Reset the database with example data
       * Creates example users, memberships, tiles, shifts, etc.
       * @example cy.resetDatabase()
       */
      resetDatabase(): Chainable<void>;

      /**
       * Select from USelectMenu component
       * @param fieldName - The name attribute of the form field
       * @param value - The value to select
       * @example cy.selectFromMenu('directus_users__memberships_gender', 'male')
       */
      selectFromMenu(fieldName: string, value: string): Chainable<void>;
    }
  }
}
