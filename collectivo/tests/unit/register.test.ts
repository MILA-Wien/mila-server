import { describe, it, expect, vi } from "vitest";

// Stub Nitro auto-imports before module evaluation
const _hoisted = vi.hoisted(() => {
  (globalThis as any).defineEventHandler = (handler: any) => handler;
  (globalThis as any).readValidatedBody = () => {};
  (globalThis as any).useDirectusAdmin = () => {};
  (globalThis as any).getUserOrUndefined = () => {};
  (globalThis as any).createError = (opts: any) => new Error(opts.statusMessage);
});

import {
  registerSchema,
  getSharesCount,
  extractUserData,
  extractMembershipData,
} from "~/server/api/register.post";

// Minimal valid registration body
function validBody(overrides: Record<string, any> = {}) {
  return {
    directus_users__email: "test@example.com",
    directus_users__password: "secret123",
    directus_users__first_name: "Max",
    directus_users__last_name: "Muster",
    directus_users__memberships_person_type: "natural" as const,
    directus_users__memberships_gender: "male",
    directus_users__memberships_street: "Hauptstr.",
    directus_users__memberships_streetnumber: "1",
    directus_users__memberships_postcode: "1010",
    directus_users__memberships_city: "Wien",
    directus_users__memberships_country: "AT",
    memberships__memberships_type: "active",
    shares_options: "normal" as const,
    directus_users__payments_type: "sepa",
    ...overrides,
  };
}

// =========================================================================
// Schema validation
// =========================================================================

describe("registerSchema", () => {
  it("accepts a valid minimal body", () => {
    const result = registerSchema.safeParse(validBody());
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = registerSchema.safeParse(validBody({ directus_users__email: undefined }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse(validBody({ directus_users__email: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = registerSchema.safeParse(validBody({ directus_users__password: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid person type", () => {
    const result = registerSchema.safeParse(validBody({ directus_users__memberships_person_type: "robot" }));
    expect(result.success).toBe(false);
  });

  it("rejects invalid shares_options", () => {
    const result = registerSchema.safeParse(validBody({ shares_options: "invalid" }));
    expect(result.success).toBe(false);
  });

  it("accepts all valid shares_options", () => {
    for (const opt of ["social", "normal", "more"]) {
      const body = validBody({
        shares_options: opt,
        ...(opt === "more" ? { memberships__memberships_shares: 10 } : {}),
      });
      const result = registerSchema.safeParse(body);
      expect(result.success).toBe(true);
    }
  });

  // Conditional: shares_options === "more"
  it("rejects shares_options=more without custom count", () => {
    const result = registerSchema.safeParse(validBody({ shares_options: "more" }));
    expect(result.success).toBe(false);
  });

  it("rejects shares_options=more with count < 10", () => {
    const result = registerSchema.safeParse(
      validBody({ shares_options: "more", memberships__memberships_shares: 5 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts shares_options=more with count >= 10", () => {
    const result = registerSchema.safeParse(
      validBody({ shares_options: "more", memberships__memberships_shares: 10 }),
    );
    expect(result.success).toBe(true);
  });

  // Conditional: coshopper
  it("rejects add_coshopper=true without coshopper details", () => {
    const result = registerSchema.safeParse(validBody({ add_coshopper: true }));
    expect(result.success).toBe(false);
  });

  it("accepts add_coshopper=true with full coshopper details", () => {
    const result = registerSchema.safeParse(
      validBody({
        add_coshopper: true,
        coshopper_firstname: "Co",
        coshopper_lastname: "Shopper",
        coshopper_email: "co@shop.com",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts empty coshopper_email when add_coshopper=false", () => {
    const result = registerSchema.safeParse(
      validBody({ coshopper_email: "" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects missing required address fields", () => {
    for (const field of [
      "directus_users__memberships_street",
      "directus_users__memberships_streetnumber",
      "directus_users__memberships_postcode",
      "directus_users__memberships_city",
      "directus_users__memberships_country",
    ]) {
      const result = registerSchema.safeParse(validBody({ [field]: undefined }));
      expect(result.success).toBe(false);
    }
  });

  it("accepts optional survey fields", () => {
    const result = registerSchema.safeParse(
      validBody({
        directus_users__mila_groups_interested_2: ["group1", "group2"],
        directus_users__mila_skills_2: ["skill1"],
        directus_users__survey_languages: ["de", "en"],
      }),
    );
    expect(result.success).toBe(true);
  });
});

// =========================================================================
// getSharesCount
// =========================================================================

describe("getSharesCount", () => {
  it("returns 1 for social", () => {
    expect(getSharesCount("social")).toBe(1);
  });

  it("returns 9 for normal", () => {
    expect(getSharesCount("normal")).toBe(9);
  });

  it("returns custom count for more", () => {
    expect(getSharesCount("more", 15)).toBe(15);
  });

  it("throws for more with no custom count", () => {
    expect(() => getSharesCount("more")).toThrow();
  });

  it("throws for more with count <= 0", () => {
    expect(() => getSharesCount("more", 0)).toThrow();
  });
});

// =========================================================================
// extractUserData
// =========================================================================

describe("extractUserData", () => {
  it("strips directus_users__ prefix from keys", () => {
    const body = registerSchema.parse(validBody());
    const data = extractUserData(body, false);
    expect(data).toHaveProperty("email", "test@example.com");
    expect(data).toHaveProperty("first_name", "Max");
    expect(data).not.toHaveProperty("directus_users__email");
  });

  it("removes password and email when authenticated", () => {
    const body = registerSchema.parse(validBody());
    const data = extractUserData(body, true);
    expect(data).not.toHaveProperty("password");
    expect(data).not.toHaveProperty("email");
  });

  it("keeps password and email when not authenticated", () => {
    const body = registerSchema.parse(validBody());
    const data = extractUserData(body, false);
    expect(data).toHaveProperty("password");
    expect(data).toHaveProperty("email");
  });

  it("sets username from name fields when use_custom_username is false", () => {
    const body = registerSchema.parse(validBody());
    const data = extractUserData(body, false);
    expect(data.username).toBe("Max");
    expect(data.username_last).toBe("Muster");
  });

  it("keeps custom username when use_custom_username is true", () => {
    const body = registerSchema.parse(
      validBody({
        use_custom_username: true,
        directus_users__username: "CustomName",
        directus_users__username_last: "CustomLast",
      }),
    );
    const data = extractUserData(body, false);
    expect(data.username).toBe("CustomName");
    expect(data.username_last).toBe("CustomLast");
  });

  it("serializes array fields to JSON strings", () => {
    const body = registerSchema.parse(
      validBody({
        directus_users__mila_groups_interested_2: ["a", "b"],
        directus_users__mila_skills_2: ["c"],
        directus_users__survey_languages: ["de"],
      }),
    );
    const data = extractUserData(body, false);
    expect(data.mila_groups_interested_2).toBe(JSON.stringify(["a", "b"]));
    expect(data.mila_skills_2).toBe(JSON.stringify(["c"]));
    expect(data.survey_languages).toBe(JSON.stringify(["de"]));
  });

  it("does not include non-user-prefixed fields", () => {
    const body = registerSchema.parse(validBody());
    const data = extractUserData(body, false);
    expect(data).not.toHaveProperty("memberships__memberships_type");
    expect(data).not.toHaveProperty("shares_options");
    expect(data).not.toHaveProperty("add_coshopper");
  });
});

// =========================================================================
// extractMembershipData
// =========================================================================

describe("extractMembershipData", () => {
  it("strips memberships__ prefix from keys", () => {
    const body = registerSchema.parse(validBody());
    const data = extractMembershipData(body, 9);
    expect(data).toHaveProperty("memberships_type", "active");
    expect(data).not.toHaveProperty("memberships__memberships_type");
  });

  it("sets memberships_shares from computed shares count", () => {
    const body = registerSchema.parse(validBody());
    const data = extractMembershipData(body, 9);
    expect(data.memberships_shares).toBe(9);
  });

  it("excludes memberships__memberships_shares raw field", () => {
    const body = registerSchema.parse(
      validBody({ shares_options: "more", memberships__memberships_shares: 15 }),
    );
    const data = extractMembershipData(body, 15);
    // Should use the computed shares count, not have the raw field
    expect(data.memberships_shares).toBe(15);
  });

  it("does not include user-prefixed fields", () => {
    const body = registerSchema.parse(validBody());
    const data = extractMembershipData(body, 9);
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("first_name");
  });
});
