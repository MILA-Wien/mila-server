/*
 * Mail sent when a time-limited exemption ends (#237).
 *
 * Automation key `shifts_exemption_ended` in `mila_automations`. Subject and body live in
 * `messages_templates` and are edited in Directus; the template receives `exempt_until`
 * (the last exempt day, formatted as `31.12.2026`).
 */

import { dbGetExemptionEndedRecipients } from "./dbShifts";
import { resolveAutomation, sendCampaigns } from "./activationMails";
import { formatExemptUntil } from "../../shared/shiftsExemption";

export const EXEMPTION_ENDED_AUTOMATION_KEY = "shifts_exemption_ended";

export interface EndedExemption {
  membershipId: number;
  /** The "Befreit bis" date the exemption ran until, `YYYY-MM-DD`. */
  exemptUntil: string;
}

/**
 * One mail per exemption the cronjob actually ended. Driven by those transitions rather
 * than a query: ending the exemption clears the date, so nothing is left to re-match and
 * each member is mailed exactly once, on the morning of their first day back.
 */
export async function sendExemptionEndedMails(ended: EndedExemption[]) {
  if (!ended.length) return;
  const templateId = await resolveAutomation(EXEMPTION_ENDED_AUTOMATION_KEY);
  if (templateId === null) return;

  const untilById = new Map(ended.map((e) => [e.membershipId, e.exemptUntil]));
  const memberships = await dbGetExemptionEndedRecipients([
    ...untilById.keys(),
  ]);

  const recipients = memberships
    .filter((m) => m.memberships_user?.id)
    .map((m) => ({ userId: m.memberships_user!.id, member: m }));

  await sendCampaigns(
    recipients,
    templateId,
    (member) => ({
      exempt_until: formatExemptUntil(untilById.get(member.id)!),
    }),
    "exemption ended mails",
  );
}
