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
    directus_users__memberships_country: "Österreich",
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

  it("rejects prohibited characters in first/last name used as visible name", () => {
    for (const field of ["directus_users__first_name", "directus_users__last_name"]) {
      const result = registerSchema.safeParse(validBody({ [field]: "Max (Moritz)" }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.path).toEqual([field]);
      }
    }
  });

  it("rejects visible names longer than 255 characters", () => {
    const result = registerSchema.safeParse(
      validBody({ directus_users__first_name: "a".repeat(256) }),
    );
    expect(result.success).toBe(false);
  });

  it("only accepts countries from the dropdown list", () => {
    for (const country of ["Deutschland", "Vereinigte Staaten"]) {
      expect(
        registerSchema.safeParse(validBody({ directus_users__memberships_country: country }))
          .success,
      ).toBe(true);
    }
    for (const country of ["AT", "Austria", "Oesterreich", ""]) {
      expect(
        registerSchema.safeParse(validBody({ directus_users__memberships_country: country }))
          .success,
      ).toBe(false);
    }
  });

  it("requires 4-digit postcodes for Austria only", () => {
    const parse = (postcode: string, country: string) =>
      registerSchema.safeParse(
        validBody({
          directus_users__memberships_postcode: postcode,
          directus_users__memberships_country: country,
        }),
      ).success;
    expect(parse("1010", "Österreich")).toBe(true);
    expect(parse("101", "Österreich")).toBe(false);
    expect(parse("10100", "Österreich")).toBe(false);
    expect(parse("A-1010", "Österreich")).toBe(false);
    expect(parse("10115", "Deutschland")).toBe(true);
  });

  it("rejects spaces-only input in text fields", () => {
    for (const field of [
      "directus_users__first_name",
      "directus_users__last_name",
      "directus_users__memberships_phone",
      "directus_users__memberships_occupation",
      "directus_users__pronouns",
      "directus_users__memberships_street",
      "directus_users__memberships_streetnumber",
      "directus_users__memberships_stair",
      "directus_users__memberships_door",
      "directus_users__memberships_postcode",
      "directus_users__memberships_city",
    ]) {
      const result = registerSchema.safeParse(validBody({ [field]: "   " }));
      expect(result.success, field).toBe(false);
    }
  });

  it("requires Wien as city for Austrian postcodes starting with 1", () => {
    const parse = (city: string, postcode: string) =>
      registerSchema.safeParse(
        validBody({
          directus_users__memberships_city: city,
          directus_users__memberships_postcode: postcode,
          directus_users__memberships_country: "Österreich",
        }),
      ).success;
    expect(parse("Wien", "1010")).toBe(true);
    expect(parse("Vienna", "1010")).toBe(false);
    expect(parse("Graz", "8020")).toBe(true);
  });

  it("rejects digits in the city", () => {
    expect(
      registerSchema.safeParse(validBody({ directus_users__memberships_city: "1010 Wien" }))
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse(
        validBody({
          directus_users__memberships_city: "St. Pölten",
          directus_users__memberships_postcode: "3100",
        }),
      ).success,
    ).toBe(true);
  });

  it("rejects a house number in the street field", () => {
    for (const street of ["Hauptstr. 1", "Hauptstr. 5a"]) {
      const result = registerSchema.safeParse(
        validBody({ directus_users__memberships_street: street }),
      );
      expect(result.success).toBe(false);
    }
  });

  it("rejects \"/\" and \"top\" in house number, stair and door", () => {
    for (const field of [
      "directus_users__memberships_streetnumber",
      "directus_users__memberships_stair",
      "directus_users__memberships_door",
    ]) {
      for (const value of ["1/2", "Top 3"]) {
        const result = registerSchema.safeParse(validBody({ [field]: value }));
        expect(result.success).toBe(false);
      }
    }
  });

  it("requires the house number to start with a digit, but not stair or door", () => {
    expect(
      registerSchema.safeParse(validBody({ directus_users__memberships_streetnumber: "A" }))
        .success,
    ).toBe(false);
    expect(
      registerSchema.safeParse(
        validBody({
          directus_users__memberships_streetnumber: "1a",
          directus_users__memberships_stair: "A",
          directus_users__memberships_door: "EG",
        }),
      ).success,
    ).toBe(true);
  });

  it("checks the custom visible name instead of first/last name", () => {
    const custom = {
      use_custom_username: true,
      directus_users__first_name: "Max (Moritz)",
      directus_users__username: "Maxi",
      directus_users__username_last: "M.",
    };
    expect(registerSchema.safeParse(validBody(custom)).success).toBe(true);
    expect(
      registerSchema.safeParse(
        validBody({ ...custom, directus_users__username_last: "M!" }),
      ).success,
    ).toBe(false);
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
