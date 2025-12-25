describe("Admin Login and Dashboard", () => {
  beforeEach(() => {
    // Ensure clean state before each test
    cy.logout();
  });

  it("should login as admin and verify tiles load", () => {
    // Use custom login command
    cy.login("admin@example.com", "admin");

    // Verify tiles container loads
    cy.get(".gap-5").should("exist");

    // Verify at least one tile is present (tiles have left border styling)
    cy.get('[class*="border-l-"]').should("have.length.at.least", 1);

    // Verify tile has title
    cy.get("h3.font-Avory").should("exist");
  });

