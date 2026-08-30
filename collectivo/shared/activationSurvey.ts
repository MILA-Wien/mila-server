/**
 * Shared vocabulary for the member activation survey.
 *
 * These slugs are the single token used in three places at once — the `?choice=` query
 * parameter in the emailed links, the `activation_survey_choice` value stored on the
 * membership, and the radio value on the survey page — so there is no mapping layer to
 * get wrong.
 */

export const ACTIVATION_SURVEY_CHOICES = [
  "restart",
  "more-support",
  "different-form",
  "health",
  "other",
] as const;

export type ActivationSurveyChoice = (typeof ACTIVATION_SURVEY_CHOICES)[number];

/** Choices that open a free-text field; the other two link out instead. */
const FREE_TEXT_CHOICES: readonly ActivationSurveyChoice[] = [
  "more-support",
  "different-form",
  "other",
];

export const ACTIVATION_SURVEY_MAX_TEXT_LENGTH = 600;
export const ACTIVATION_SURVEY_PATH = "/profile/activation-survey";

export function isActivationSurveyChoice(
  value: unknown,
): value is ActivationSurveyChoice {
  return (
    typeof value === "string" &&
    (ACTIVATION_SURVEY_CHOICES as readonly string[]).includes(value)
  );
}

export function choiceRequiresText(choice: ActivationSurveyChoice): boolean {
  return FREE_TEXT_CHOICES.includes(choice);
}

/**
 * The five links the survey email offers, keyed as `survey_url_<choice>` so a template
 * author can drop `{{survey_url_health}}` straight onto a button.
 */
export function buildActivationSurveyUrls(
  baseUrl: string,
): Record<string, string> {
  const base = baseUrl.replace(/\/+$/, "");
  const urls: Record<string, string> = {};
  for (const choice of ACTIVATION_SURVEY_CHOICES) {
    const key = `survey_url_${choice.replace(/-/g, "_")}`;
    urls[key] = `${base}${ACTIVATION_SURVEY_PATH}?choice=${choice}`;
  }
  return urls;
}

interface SurveyCandidate {
  activation_frozen_since: string;
  memberships_user: { id: string } | null;
}

/**
 * Filters members due for the survey down to those not already sent it *during their
 * current freeze*.
 *
 * Scoping the comparison to `activation_frozen_since` rather than to an absolute date is
 * what makes the survey re-arm on a later re-freeze without needing a separate "already
 * sent" column: a new freeze rewrites the date past the old send, and the member becomes
 * eligible again.
 *
 * Both values are ISO-8601, so lexicographic comparison is chronological — a timestamp
 * sorts after the bare date it falls on, which is the behaviour we want.
 */
export function selectSurveyRecipients<T extends SurveyCandidate>(
  members: T[],
  lastSentAt: Map<string, string>,
): { userId: string; member: T }[] {
  const recipients: { userId: string; member: T }[] = [];
  for (const member of members) {
    const userId = member.memberships_user?.id;
    if (!userId) continue;
    const sentAt = lastSentAt.get(userId);
    if (sentAt && sentAt >= member.activation_frozen_since) continue;
    recipients.push({ userId, member });
  }
  return recipients;
}
