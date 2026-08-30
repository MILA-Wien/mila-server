import { z } from "zod";
import {
  ACTIVATION_SURVEY_MAX_TEXT_LENGTH,
  choiceRequiresText,
  isActivationSurveyChoice,
  type ActivationSurveyChoice,
} from "../../../shared/activationSurvey";

const schema = z.object({
  choice: z
    .string()
    .refine((v): v is ActivationSurveyChoice => isActivationSurveyChoice(v), {
      message: "Unknown survey choice",
    }),
  text: z
    .string()
    .trim()
    .max(ACTIVATION_SURVEY_MAX_TEXT_LENGTH)
    .optional()
    .default(""),
});

export default defineEventHandler(async (event) => {
  // Membership comes from the session, never from the request body.
  const user = getMemberOrThrowError(event);
  const data = await readValidatedBody(event, schema.parse);

  // Free text is required by the form, not by the API: clicking a link in the survey email
  // saves the chosen category straight away, before the member has typed anything. A bare
  // category is a legitimate partial answer, so it is accepted here and the page is what
  // insists on text before enabling Speichern.
  const needsText = choiceRequiresText(data.choice);

  // The two link-out choices carry no text; don't keep a stale one from a previous answer.
  await dbSaveActivationSurvey(
    user.mship,
    data.choice,
    needsText ? data.text : null,
  );
});
