/**
 * Institutional email validation
 *
 * Rules:
 *  - Personal email providers (Gmail, Yahoo, etc.) are ALWAYS blocked for all roles.
 *  - .ac.uk domains are always approved (covers UK universities automatically).
 *  - Domains in the universityDomains map are always approved.
 *  - Industry professionals may use any non-personal company domain.
 *  - All other domains are "unknown" — registration is allowed but the account
 *    is flagged for admin review.
 */

import { universityDomains } from "./universities";

// ── Personal email provider blocklist ────────────────────────────────────────
// Common public / consumer email providers that must never be used.
export const BLOCKED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.es",
  "hotmail.it",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "aol.co.uk",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "zoho.com",
  "zohomail.com",
  "mail.com",
  "email.com",
  "fastmail.com",
  "fastmail.fm",
  "tutanota.com",
  "tutamail.com",
  "tuta.io",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "web.de",
  "rocketmail.com",
  "yandex.com",
  "yandex.ru",
  "inbox.com",
  "hushmail.com",
  "lycos.com",
  "rediffmail.com",
  "163.com",
  "126.com",
  "qq.com",
  "sina.com",
  "yeah.net",
  "temp-mail.org",
  "guerrillamail.com",
  "mailinator.com",
  "throwam.com",
  "sharklasers.com",
  "dispostable.com",
  "trashmail.com",
  "tempmail.com",
  "10minutemail.com",
  "maildrop.cc",
]);

export type ValidationStatus = "blocked" | "approved" | "unknown";

export interface EmailValidationResult {
  status: ValidationStatus;
  message: string;
  detectedUniversity?: string;
}

/**
 * Extracts the domain from an email address.
 */
export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

/**
 * Returns true if the domain is a UK academic domain (.ac.uk).
 */
export function isAcUkDomain(domain: string): boolean {
  return domain.endsWith(".ac.uk");
}

/**
 * Returns true if the domain is in the personal provider blocklist.
 */
export function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.has(domain.toLowerCase());
}

/**
 * Returns true if the domain belongs to a known university/institution.
 */
export function isKnownInstitutionalDomain(domain: string): boolean {
  return domain in universityDomains || isAcUkDomain(domain);
}

/**
 * Core validation function — role-aware.
 *
 * @param email  The full email address entered by the user.
 * @param role   The role the user is registering as.
 */
export function validateInstitutionalEmail(
  email: string,
  role: string
): EmailValidationResult {
  if (!email || !email.includes("@")) {
    return {
      status: "unknown",
      message: "Please enter a valid email address.",
    };
  }

  const domain = extractDomain(email);

  if (!domain) {
    return {
      status: "unknown",
      message: "Please enter a valid email address.",
    };
  }

  // ── Step 1: Blocklist check (applies to ALL roles) ───────────────────────
  if (isBlockedDomain(domain)) {
    return {
      status: "blocked",
      message:
        "Personal email addresses are not allowed. Please use your institutional email (e.g. a university or organisation email).",
    };
  }

  // ── Step 2: Industry professionals — company domains are fine ────────────
  if (role === "industry_professional" || role === "industry") {
    // Any non-personal domain is acceptable for industry users
    return {
      status: "approved",
      message: "Company email domain accepted.",
    };
  }

  // ── Step 3: .ac.uk auto-approval (UK universities) ───────────────────────
  if (isAcUkDomain(domain)) {
    // Try to get a friendly name from the known map; fall back to a generic message
    const universityName = universityDomains[domain];
    return {
      status: "approved",
      message: universityName
        ? `Recognised UK academic domain — ${universityName}.`
        : "Recognised UK academic domain (.ac.uk).",
      detectedUniversity: universityName,
    };
  }

  // ── Step 4: Known institutional domain ───────────────────────────────────
  const universityName = universityDomains[domain];
  if (universityName) {
    return {
      status: "approved",
      message: `Recognised institutional domain — ${universityName}.`,
      detectedUniversity: universityName,
    };
  }

  // ── Step 5: Unknown domain — allow with warning ───────────────────────────
  // Registrations proceed but the account may be flagged for admin review.
  return {
    status: "unknown",
    message:
      "We couldn't recognise this institution. You can continue, but your account may require additional verification.",
  };
}
