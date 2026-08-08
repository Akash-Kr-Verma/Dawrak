// src/content/languagePacks.ts
//
// Every localizable value in the module content is a {{TOKEN}}. Base content is
// region-neutral; a language pack resolves the tokens.
//
// Rules that are pedagogy, not preference:
//   - Brands are FICTIONAL in the base pack. A module that ships a pixel-clone
//     of a real bank is a liability. Real names appear in reveal panels only.
//   - The rn→m homoglyph trick is Latin-script only. Arabic packs must use the
//     combosquat variant ({{BRAND}}-verify.com), which survives translation.
//   - No real law-enforcement agency name or emblem, in any pack (Module 08).

export type LanguagePackId = "base" | "ar" | "hi";

export type TokenMap = Record<string, string>;

/**
 * Tokens that depend on the signed-in learner rather than the locale.
 * Module 01 personalizes on purpose — that IS signal S5.
 */
export interface LearnerTokens {
  LEARNER_FIRST_NAME?: string;
  LEARNER_NAME?: string;
}

const currentYear = new Date().getFullYear();

export const BASE_PACK: TokenMap = {
  // --- Module 01 ---------------------------------------------------------
  WALLET_BRAND: "PayNoor",
  SHORT_LINK: "pn-vfy.co/x9k2",
  // Combosquat variant: transfers across scripts, unlike the homoglyph.
  LOOKALIKE_DOMAIN: "paynoor-verify.com",

  // --- Module 02 ---------------------------------------------------------
  BIKE_BRAND: "Ridgeline",
  CURRENCY: "$",
  PRICE: "85",
  CITY: "Riverton",
  NEIGHBOURHOOD: "Eastgate",
  SELLER_NAME: "M. Haddad",
  YEAR_MINUS_7: String(currentYear - 7),

  // --- Module 03 ---------------------------------------------------------
  VOIP_APP_NAME: "Vontel",
  CUSTOMS_AUTHORITY_NAME: "National Parcel Inspection Bureau",
  FOREIGN_COUNTRY_CODE: "213",
  NUMBER: "55 018 4429",
  OFFICER_NAME: "Rahim",
  CASE_NUMBER: "NPB-4471-C",
  // Amount tokens carry their own currency symbol: most of the copy uses them
  // inline in a sentence ("a clearance fee of {{AMOUNT}}") where there's no
  // separate {{CURRENCY}} to pair with. Only the bike listing splits the two.
  AMOUNT: "$180",

  // --- Module 04 ---------------------------------------------------------
  CHARITY_NAME: "HopeBridge",
  REGION: "the northern districts",
  DISASTER_TYPE: "flooding",
  LAST_YEAR: String(currentYear - 1),

  // --- Module 05 ---------------------------------------------------------
  PROGRAM_NAME: "Meridian Global Scholarship",
  PROGRAM: "meridian",
  YEAR: String(currentYear),
  FAKE_PORTAL_URL: "meridian-scholarships.org/results",
  SMALL_AMOUNT: "$45",
  PERSON_NAME: "A. Yusuf",
  BANK: "Central Commercial Bank",

  // --- Module 06 ---------------------------------------------------------
  FAMILY_GROUP_NAME: "Family ❤️",

  // --- Module 08 ---------------------------------------------------------
  AGENCY_NAME: "Metropolitan Cyber Cell",
  CHILD_NAME: "Omar",
  FOREIGN_CODE: "62",
  OFFICER_2_NAME: "Bakri",

  // --- Module 09 ---------------------------------------------------------
  PAY_APP: "Kwikpay",
  CUSTOMER_NAME: "Rajan S.",

  // --- Module 10 ---------------------------------------------------------
  ADMIN_NAME: "Mr. Devon",
  TEN_X_AMOUNT: "$450",
};

/**
 * Regional packs override only what changes. Anything absent falls through to
 * BASE_PACK, so a partial pack is a valid pack.
 */
export const PACK_OVERRIDES: Record<Exclude<LanguagePackId, "base">, TokenMap> = {
  ar: {
    WALLET_BRAND: "سويفت‑باي",
    // Arabic-script branding: combosquat, never a homoglyph.
    LOOKALIKE_DOMAIN: "swiftpay-verify.com",
    CITY: "الموصل",
    NEIGHBOURHOOD: "الزهور",
    CURRENCY: "IQD",
    PRICE: "110,000",
    FAMILY_GROUP_NAME: "العائلة ❤️",
    // Türkiye Bursları is the highest-relevance real program for MENA users,
    // but it appears in the reveal panel only — never as the impersonated
    // brand. This stays fictional.
    PROGRAM_NAME: "منحة ميريديان الدولية",
  },
  hi: {
    CITY: "Pune",
    NEIGHBOURHOOD: "Kothrud",
    CURRENCY: "₹",
    PRICE: "6,500",
    PAY_APP: "Kwikpay",
    AMOUNT: "₹14,500",
    SMALL_AMOUNT: "₹3,500",
    TEN_X_AMOUNT: "₹35,000",
    FOREIGN_CODE: "84",
  },
};

export function resolvePack(
  pack: LanguagePackId = "base",
  learner: LearnerTokens = {}
): TokenMap {
  return {
    ...BASE_PACK,
    ...(pack === "base" ? {} : PACK_OVERRIDES[pack]),
    // Falls back to a neutral second person rather than leaking "undefined"
    // into a scam message.
    LEARNER_FIRST_NAME: learner.LEARNER_FIRST_NAME || "there",
    LEARNER_NAME: learner.LEARNER_NAME || learner.LEARNER_FIRST_NAME || "there",
  };
}

const TOKEN_RE = /\{\{([A-Z0-9_]+)\}\}/g;

/** Replace {{TOKENS}} in a single string. Unknown tokens are left visible. */
export function fillTokens(input: string, tokens: TokenMap): string {
  return input.replace(TOKEN_RE, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : whole
  );
}

/** Recursively fill tokens through any JSON-ish content structure. */
export function fillTokensDeep<T>(value: T, tokens: TokenMap): T {
  if (typeof value === "string") {
    return fillTokens(value, tokens) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => fillTokensDeep(v, tokens)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = fillTokensDeep(v, tokens);
    }
    return out as unknown as T;
  }
  return value;
}

/** Every token referenced anywhere in a value. Used by the content tests. */
export function collectTokens(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    // exec loop rather than matchAll: the tsconfig targets es5 and matchAll
    // needs downlevelIteration.
    const re = new RegExp(TOKEN_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) !== null) found.add(m[1]);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectTokens(v, found));
  } else if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((v) =>
      collectTokens(v, found)
    );
  }
  return found;
}
