// TODO Work in progress

describe("Registration Form", () => {
  beforeEach(() => {
    // Ensure clean state before each test
    cy.logout();
  });

  it("should complete registration for natural person and verify data", () => {
    // Visit registration page
    cy.visit("http://localhost:3000/register");
    cy.wait(5000); // Give the page time to load

    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    // Fill Account Information
    cy.get('[name="directus_users__email"]').type(testEmail);
    cy.get('[name="directus_users__password"]').type("testPassword123");
    cy.get('[name="_pw_confirm"]').type("testPassword123");

    // Person Type - Natural (default, so no need to change)
    // cy.get('[name="directus_users__memberships_person_type"][value="natural"]').check();

    // Fill Personal Data
    cy.get('[name="directus_users__first_name"]').type("Max");
    cy.get('[name="directus_users__last_name"]').type("Mustermann");

    // TODO Filled until here
    cy.get("#directus_users__memberships_gender")
      .click()
      .then(() => {
        cy.get(".u-select-menu__item").contains("male").click();
      });

    // Fill Natural Person Specific Fields
    cy.get('[name="directus_users__memberships_birthday"]').type("1990-01-15");
    cy.get('[name="directus_users__memberships_occupation"]').type(
      "Software Engineer",
    );

    // Fill Address
    cy.get('[name="directus_users__memberships_street"]').type("Musterstraße");
    cy.get('[name="directus_users__memberships_streetnumber"]').type("42");
    cy.get('[name="directus_users__memberships_postcode"]').type("1010");
    cy.get('[name="directus_users__memberships_city"]').type("Wien");
    cy.get('[name="directus_users__memberships_country"]').type("Österreich");

    // Membership Type - Aktiv (default)
    // cy.get('[name="memberships__memberships_type"][value="Aktiv"]').check();

    // Cooperative Shares - Normal (9 shares, 180€)
    cy.get('[name="shares_options"][value="normal"]').check();

    // Payment - Transfer
    cy.selectFromMenu("directus_users__payments_type", "transfer");

    // Accept Required Conditions
    cy.get('[name="_statutes_approval"]').check();
    cy.get('[name="_data_approval"]').check();

    // Intercept the registration API call to verify the data
    cy.intercept("POST", "/api/register").as("registerRequest");

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for the API call and verify the response
    cy.wait("@registerRequest").then((interception) => {
      // Verify successful registration
      expect(interception.response?.statusCode).to.equal(201);
      expect(interception.response?.body).to.have.property("user");
      expect(interception.response?.body).to.have.property("membership");

      // Verify the data sent in the request
      const requestBody = interception.request.body;

      // Verify account information
      expect(requestBody.directus_users__email).to.equal(testEmail);
      expect(requestBody.directus_users__password).to.exist;

      // Verify personal data
      expect(requestBody.directus_users__first_name).to.equal("Max");
      expect(requestBody.directus_users__last_name).to.equal("Mustermann");
      expect(requestBody.directus_users__memberships_gender).to.equal("male");

      // Verify natural person fields
      expect(requestBody.directus_users__memberships_birthday).to.equal(
        "1990-01-15",
      );
      expect(requestBody.directus_users__memberships_occupation).to.equal(
        "Software Engineer",
      );

      // Verify address
      expect(requestBody.directus_users__memberships_street).to.equal(
        "Musterstraße",
      );
      expect(requestBody.directus_users__memberships_streetnumber).to.equal(
        "42",
      );
      expect(requestBody.directus_users__memberships_postcode).to.equal("1010");
      expect(requestBody.directus_users__memberships_city).to.equal("Wien");
      expect(requestBody.directus_users__memberships_country).to.equal(
        "Österreich",
      );

      // Verify membership type
      expect(requestBody.memberships__memberships_type).to.equal("Aktiv");

      // Verify shares (should be converted to 9 for "normal")
      expect(requestBody.shares_options).to.equal("normal");

      // Verify payment type
      expect(requestBody.directus_users__payments_type).to.equal("transfer");

      // Verify conditions accepted
      expect(requestBody._statutes_approval).to.be.true;
      expect(requestBody._data_approval).to.be.true;
    });

    // Verify redirect to success page
    cy.url().should("include", "/register/success");

    // Verify success message
    cy.contains("Application submitted!").should("be.visible");
  });

  it("should show error for duplicate email", () => {
    cy.visit("http://localhost:3000/register");

    // Try to register with existing admin email
    cy.get('[name="directus_users__email"]').type("admin@example.com");
    cy.get('[name="directus_users__password"]').type("testPassword123");
    cy.get('[name="_pw_confirm"]').type("testPassword123");

    // Fill minimal required fields
    cy.get('[name="directus_users__first_name"]').type("Test");
    cy.get('[name="directus_users__last_name"]').type("User");
    cy.get("#directus_users__memberships_gender").select("male");
    cy.get('[name="directus_users__memberships_birthday"]').type("1990-01-15");
    cy.get('[name="directus_users__memberships_occupation"]').type("Tester");
    cy.get('[name="directus_users__memberships_street"]').type("Test St");
    cy.get('[name="directus_users__memberships_streetnumber"]').type("1");
    cy.get('[name="directus_users__memberships_postcode"]').type("1010");
    cy.get('[name="directus_users__memberships_city"]').type("Wien");
    cy.get('[name="directus_users__memberships_country"]').type("Österreich");
    cy.get('[name="shares_options"][value="normal"]').check();
    cy.selectFromMenu("directus_users__payments_type", "transfer");
    cy.get('[name="_statutes_approval"]').check();
    cy.get('[name="_data_approval"]').check();

    // Intercept the API call
    cy.intercept("POST", "/api/register").as("registerRequest");

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for the API call
    cy.wait("@registerRequest");

    // Should stay on registration page (not redirect to success)
    cy.url().should("include", "/register");
    cy.url().should("not.include", "/success");

    // Error toast should appear (checking for the text content)
    // Note: The actual toast implementation might vary, adjust selector as needed
    cy.contains("already registered", { matchCase: false }).should(
      "be.visible",
    );
  });

  it("should validate password confirmation match", () => {
    cy.visit("http://localhost:3000/register");

    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    // Fill passwords that don't match
    cy.get('[name="directus_users__email"]').type(testEmail);
    cy.get('[name="directus_users__password"]').type("password123");
    cy.get('[name="_pw_confirm"]').type("differentPassword456");

    // Fill other required fields
    cy.get('[name="directus_users__first_name"]').type("Test");
    cy.get('[name="directus_users__last_name"]').type("User");
    cy.selectFromMenu("directus_users__memberships_gender", "female");
    cy.get('[name="directus_users__memberships_birthday"]').type("1995-05-20");
    cy.get('[name="directus_users__memberships_occupation"]').type("Designer");
    cy.get('[name="directus_users__memberships_street"]').type("Test Street");
    cy.get('[name="directus_users__memberships_streetnumber"]').type("10");
    cy.get('[name="directus_users__memberships_postcode"]').type("1020");
    cy.get('[name="directus_users__memberships_city"]').type("Wien");
    cy.get('[name="directus_users__memberships_country"]').type("Österreich");
    cy.get('[name="shares_options"][value="social"]').check();
    cy.selectFromMenu("directus_users__payments_type", "transfer");
    cy.get('[name="_statutes_approval"]').check();
    cy.get('[name="_data_approval"]').check();

    // Submit form
    cy.get('button[type="submit"]').click();

    // Should show validation error and stay on registration page
    cy.url().should("include", "/register");
    cy.url().should("not.include", "/success");

    // Validation error message should appear
    cy.contains("not filled in correctly", { matchCase: false }).should(
      "be.visible",
    );
  });

  it("should register with SEPA payment and validate IBAN", () => {
    cy.visit("http://localhost:3000/register");

    const timestamp = Date.now();
    const testEmail = `sepa${timestamp}@example.com`;

    // Fill basic registration data
    cy.get('[name="directus_users__email"]').type(testEmail);
    cy.get('[name="directus_users__password"]').type("testPassword123");
    cy.get('[name="_pw_confirm"]').type("testPassword123");
    cy.get('[name="directus_users__first_name"]').type("Anna");
    cy.get('[name="directus_users__last_name"]').type("Müller");
    cy.selectFromMenu("directus_users__memberships_gender", "female");
    cy.get('[name="directus_users__memberships_birthday"]').type("1988-08-08");
    cy.get('[name="directus_users__memberships_occupation"]').type("Teacher");
    cy.get('[name="directus_users__memberships_street"]').type("Hauptstraße");
    cy.get('[name="directus_users__memberships_streetnumber"]').type("5");
    cy.get('[name="directus_users__memberships_postcode"]').type("1030");
    cy.get('[name="directus_users__memberships_city"]').type("Wien");
    cy.get('[name="directus_users__memberships_country"]').type("Österreich");
    cy.get(
      '[name="memberships__memberships_type"][value="Investierend"]',
    ).check();
    cy.get('[name="shares_options"][value="normal"]').check();

    // Select SEPA payment
    cy.selectFromMenu("directus_users__payments_type", "sepa");

    // Fill SEPA fields with valid Austrian IBAN
    cy.get('[name="directus_users__payments_account_iban"]').type(
      "AT611904300234573201",
    );
    cy.get('[name="directus_users__payments_account_owner"]').type(
      "Anna Müller",
    );

    // Accept conditions
    cy.get('[name="_statutes_approval"]').check();
    cy.get('[name="_data_approval"]').check();

    // Intercept registration API
    cy.intercept("POST", "/api/register").as("registerRequest");

    // Submit form
    cy.get('button[type="submit"]').click();

    // Wait for successful registration
    cy.wait("@registerRequest").then((interception) => {
      expect(interception.response?.statusCode).to.equal(201);

      // Verify SEPA data was sent
      const requestBody = interception.request.body;
      expect(requestBody.directus_users__payments_type).to.equal("sepa");
      expect(requestBody.directus_users__payments_account_iban).to.exist;
      expect(requestBody.directus_users__payments_account_owner).to.equal(
        "Anna Müller",
      );
    });

    // Verify success
    cy.url().should("include", "/register/success");
    cy.contains("Application submitted!").should("be.visible");
  });
});
