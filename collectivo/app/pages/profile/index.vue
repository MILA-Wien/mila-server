<script setup lang="ts">
import type { InferType } from "yup";
import type { FormSubmitEvent, FormErrorEvent } from "#ui/types";
import { TEXT_MAX_LENGTH } from "../../../shared/addressSchema";

definePageMeta({
  middleware: ["auth"],
});
const { t, locale } = useI18n();
setPageTitle(t("Profile"));

const toast = useToast();
const userData = useCurrentUser();
const user = userData.value.user!;
const membership = userData.value.membership;
const runtimeConfig = useRuntimeConfig();
const useKeycloak = runtimeConfig.public.useKeycloak;
const keycloakUpdatePasswordUrl = (() => {
  const params = new URLSearchParams({
    client_id: runtimeConfig.public.keycloakClient,
    redirect_uri: `${runtimeConfig.public.collectivoUrl}/profile`,
    response_type: "code",
    scope: "openid",
    kc_action: "UPDATE_PASSWORD",
  });
  return `${runtimeConfig.public.keycloakUrl}/realms/${runtimeConfig.public.keycloakRealm}/protocol/openid-connect/auth?${params.toString()}`;
})();

// See app/composables/formValidation.ts.
const {
  profile: schema,
  address: addressSchema,
  phone: phoneSchema,
  email: emailSchema,
} = profileFormSchemas(t);

type Schema = InferType<typeof schema>;

const state = reactive({
  username: user.username,
  username_last: user.username_last,
  pronouns: user.pronouns,
  hide_name: user.hide_name,
});

// ── Address (belongs to the membership) ───────────────────────────────────────
const addressState = reactive({
  memberships_country: user.memberships_country,
  memberships_street: user.memberships_street,
  memberships_streetnumber: user.memberships_streetnumber,
  memberships_stair: user.memberships_stair,
  memberships_door: user.memberships_door,
  memberships_postcode: user.memberships_postcode,
  memberships_city: user.memberships_city,
});

// ── Phone number (belongs to the membership) ──────────────────────────────────
type PhoneSchema = InferType<typeof phoneSchema>;
const phoneState = reactive({ memberships_phone: user.memberships_phone });

// Directus can return null values
// But zod and yup want undefined
for (const s of [state, addressState, phoneState] as Record<string, any>[]) {
  for (const key of Object.keys(s)) {
    if (s[key] === null) {
      s[key] = undefined;
    }
  }
}

// $fetch, not useFetch: useFetch caches by key, so a repeated save could be skipped
// while still reporting success (see app/composables/user.ts).
async function saveProfile(data: Record<string, unknown>) {
  try {
    await $fetch("/api/profile", { method: "PUT", body: data });
  } catch {
    showSaveError();
    return;
  }
  await userData.value.reload();
  toast.add({
    title: t("Dein Profil wurde erfolgreich aktualisiert."),
    color: "success",
  });
}

function showSaveError() {
  toast.add({
    title: t("Es ist ein Fehler aufgetreten."),
    icon: "i-heroicons-exclamation-triangle",
    color: "error",
  });
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  await saveProfile(event.data);
}

async function onAddressSubmit(event: FormSubmitEvent<Record<string, unknown>>) {
  await saveProfile(event.data);
}

async function onPhoneSubmit(event: FormSubmitEvent<PhoneSchema>) {
  await saveProfile(event.data);
}

async function onError(event: FormErrorEvent) {
  toast.add({
    title: t("Some fields are not filled in correctly"),
    icon: "i-heroicons-exclamation-circle",
    color: "error",
  });
  if (event?.errors?.[0]?.id) {
    const element = document.getElementById(event.errors[0].id);
    element?.focus();
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ── Email change ──────────────────────────────────────────────────────────────
type EmailSchema = InferType<typeof emailSchema>;
const emailState = reactive({ email: user.email });
async function onEmailSubmit(event: FormSubmitEvent<EmailSchema>) {
  try {
    await $fetch("/api/profile/email", {
      method: "PUT",
      body: { email: event.data.email },
    });
  } catch {
    showSaveError();
    return;
  }
  await userData.value.reload();
  toast.add({ title: t("E-Mail erfolgreich geändert."), color: "success" });
}

// ── Email notifications (saved immediately when toggled) ───────────────────────
const sendNotifications = ref(user.send_notifications ?? false);
const savingNotifications = ref(false);

async function saveNotifications(value: boolean | "indeterminate") {
  const previous = sendNotifications.value;
  sendNotifications.value = value === true;
  savingNotifications.value = true;
  try {
    await $fetch("/api/profile", {
      method: "PUT",
      body: { send_notifications: sendNotifications.value },
    });
    user.send_notifications = sendNotifications.value;
    toast.add({ title: t("Einstellung gespeichert."), color: "success" });
  } catch {
    sendNotifications.value = previous;
    showSaveError();
  } finally {
    savingNotifications.value = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function personTypeLabel(val: string | null | undefined) {
  if (val === "natural") return t("Natürliche Person");
  if (val === "legal") return t("Juristische Person");
  return val ?? "";
}
</script>

<template>
  <div id="mila-profile" class="flex flex-col gap-8">
    <!-- ── Einstellungen ─────────────────────────────────────────────────── -->
    <div>
      <h2>{{ t("Einstellungen") }}</h2>
      <div class="flex flex-col gap-4">
        <!-- Name und Pronomen -->
        <CollapsibleSection :title="t('Name und Pronomen')">
          <UForm
            :schema="schema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
            @error="onError"
          >
            <FormsFormGroup
              :label="t('Sichtbarer Vorname')"
              :infotext="t('i_visible_name')"
              name="username"
              required
            >
              <template #description> </template>
              <UInput v-model="state.username" :maxlength="TEXT_MAX_LENGTH" />
            </FormsFormGroup>

            <FormsFormGroup
              :label="t('Sichtbarer Nachname')"
              :infotext="t('i_visible_name')"
              name="username_last"
              required
            >
              <template #description> </template>
              <UInput
                v-model="state.username_last"
                :maxlength="TEXT_MAX_LENGTH"
              />
            </FormsFormGroup>

            <FormsFormGroup
              :label="t('Pronomen')"
              :infotext="t('i_pronouns')"
              name="pronouns"
            >
              <UInput
                variant="outline"
                v-model="state.pronouns"
                :maxlength="TEXT_MAX_LENGTH"
              />
            </FormsFormGroup>

            <FormsFormGroup
              name="hide_name"
              :label="t('Sichtbarkeit des Namens im Schichtplan')"
            >
              <UCheckbox variant="card" v-model="state.hide_name">
                <template #label>
                  {{
                    t(
                      "Meinen Namen anderen Mitgliedern im Schichtplan nicht anzeigen.",
                    )
                  }}</template
                >
              </UCheckbox>
            </FormsFormGroup>

            <div class="pt-2">
              <UButton type="submit" icon="i-heroicons-check">
                {{ t("Speichern") }}
              </UButton>
            </div>
          </UForm>
        </CollapsibleSection>

        <!-- Adresse (belongs to the membership) -->
        <CollapsibleSection v-if="membership" :title="t('Adresse')">
          <UForm
            :schema="addressSchema"
            :state="addressState"
            class="space-y-4"
            @submit="onAddressSubmit"
            @error="onError"
          >
            <FormsAddressFields :state="addressState" />
            <div class="pt-2">
              <UButton type="submit" icon="i-heroicons-check">
                {{ t("Speichern") }}
              </UButton>
            </div>
          </UForm>
        </CollapsibleSection>

        <!-- E-Mail -->
        <CollapsibleSection :title="t('E-Mail')">
          <p class="mb-4">{{ t("t_email_is_username") }}</p>
          <UForm
            :schema="emailSchema"
            :state="emailState"
            class="space-y-4"
            @submit="onEmailSubmit"
            @error="onError"
          >
            <FormsFormGroup name="email" :label="t('E-Mail-Adresse')" required>
              <UInput
                v-model="emailState.email"
                :maxlength="TEXT_MAX_LENGTH"
                type="email"
              />
            </FormsFormGroup>
            <div class="pt-2">
              <UButton type="submit" icon="i-heroicons-check">
                {{ t("Speichern") }}
              </UButton>
            </div>
          </UForm>

          <!-- Saved immediately when toggled; only members can change it -->
          <FormsFormGroup
            v-if="membership"
            class="mt-6"
            :label="t('E-Mail-Benachrichtigungen')"
          >
            <UCheckbox
              variant="card"
              :model-value="sendNotifications"
              :disabled="savingNotifications"
              @update:model-value="saveNotifications"
            >
              <template #label>
                {{ t("Bevorstehende Schichten") }}
              </template>
            </UCheckbox>
          </FormsFormGroup>
        </CollapsibleSection>

        <!-- Passwort (changed on the Keycloak page) -->
        <CollapsibleSection v-if="useKeycloak" :title="t('Passwort')">
          <div class="space-y-4">
            <p>{{ t("Passwort_redirect_explanation") }}</p>
            <UButton
              :href="keycloakUpdatePasswordUrl"
              icon="i-heroicons-arrow-right"
            >
              {{ t("Passwort ändern") }}
            </UButton>
          </div>
        </CollapsibleSection>

        <!-- Telefonnummer (belongs to the membership) -->
        <CollapsibleSection v-if="membership" :title="t('Telefonnummer')">
          <UForm
            :schema="phoneSchema"
            :state="phoneState"
            class="space-y-4"
            @submit="onPhoneSubmit"
            @error="onError"
          >
            <FormsFormGroup name="memberships_phone" :label="t('Telefonnummer')">
              <UInput
                v-model="phoneState.memberships_phone"
                :maxlength="TEXT_MAX_LENGTH"
                type="tel"
              />
            </FormsFormGroup>
            <div class="pt-2">
              <UButton type="submit" icon="i-heroicons-check">
                {{ t("Speichern") }}
              </UButton>
            </div>
          </UForm>
        </CollapsibleSection>
      </div>
    </div>

    <!-- ── Mitgliedsdaten (read-only) ────────────────────────────────────── -->
    <div>
      <h2>{{ t("Mitgliedsdaten") }}</h2>

      <div v-if="membership?.memberships_date_ended" class="mb-4">
        <p class="text-sm text-red-600">
          {{ t("Deine Mitgliedschaft wurde beendet.") }}
        </p>
      </div>
      <div
        v-else-if="membership?.memberships_status === 'applied'"
        class="mb-4"
      >
        <p class="text-sm">
          {{ t("Dein Beitrittsantrag wird gerade bearbeitet.") }}
        </p>
      </div>
      <div v-else-if="!membership" class="mb-4">
        <p class="text-sm">{{ t("Du bist noch kein Mitglied.") }}</p>
        <UButton to="/register" class="mt-2">
          {{ t("Jetzt Mitglied werden") }}
        </UButton>
      </div>

      <dl class="space-y-1">
        <!-- Membership data -->
        <template v-if="userData.isMember && membership">
          <div v-if="membership.memberships_date_approved" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Beitrittsdatum") }}</dt>
            <dd class="text-sm font-medium">
              {{ membership.memberships_date_approved }}
            </dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Mitgliedsnummer") }}</dt>
            <dd class="text-sm font-medium">{{ membership.id }}</dd>
          </div>
          <div v-if="membership.memberships_type" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Mitgliedsart") }}</dt>
            <dd class="text-sm font-medium">
              {{ membership.memberships_type }}
            </dd>
          </div>
          <div v-if="membership.memberships_shares" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">
              {{ t("Genossenschafts-Anteile") }}
            </dt>
            <dd class="text-sm font-medium">
              {{ membership.memberships_shares }}
            </dd>
          </div>
        </template>

        <div v-if="user.memberships_person_type" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("Personenart") }}</dt>
          <dd class="text-sm font-medium">
            {{ personTypeLabel(user.memberships_person_type) }}
          </dd>
        </div>
        <div v-if="user.memberships_gender" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("Geschlecht") }}</dt>
          <dd class="text-sm font-medium">{{ user.memberships_gender }}</dd>
        </div>
        <div v-if="user.memberships_birthday" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("Geburtsdatum") }}</dt>
          <dd class="text-sm font-medium">{{ user.memberships_birthday }}</dd>
        </div>
        <div v-if="user.memberships_occupation" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("Beruf") }}</dt>
          <dd class="text-sm font-medium">{{ user.memberships_occupation }}</dd>
        </div>

        <!-- Organization (only for legal entities) -->
        <template v-if="user.memberships_person_type === 'legal'">
          <div v-if="user.memberships_organization_name" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Organisationsname") }}</dt>
            <dd class="text-sm font-medium">
              {{ user.memberships_organization_name }}
            </dd>
          </div>
          <div v-if="user.memberships_organization_type" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Organisationsart") }}</dt>
            <dd class="text-sm font-medium">
              {{ user.memberships_organization_type }}
            </dd>
          </div>
          <div v-if="user.memberships_organization_id" class="flex gap-2">
            <dt class="text-sm w-48 shrink-0">{{ t("Organisations-ID") }}</dt>
            <dd class="text-sm font-medium">
              {{ user.memberships_organization_id }}
            </dd>
          </div>
        </template>

        <!-- Payment -->
        <div v-if="user.payments_type" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">
            {{ t("Zahlungsart") }}
          </dt>
          <dd class="text-sm font-medium">{{ t(user.payments_type) }}</dd>
        </div>
        <div v-if="user.payments_account_iban" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("IBAN") }}</dt>
          <dd class="text-sm font-medium font-mono">
            {{ user.payments_account_iban }}
          </dd>
        </div>
        <div v-if="user.payments_account_owner" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">
            {{ t("Kontoinhaber:in") }}
          </dt>
          <dd class="text-sm font-medium">{{ user.payments_account_owner }}</dd>
        </div>

        <!-- Coshoppers -->
        <div
          v-if="membership?.coshoppers && membership.coshoppers.length > 0"
          class="flex gap-2"
        >
          <dt class="text-sm w-48 shrink-0">{{ t("Miteinkäufer*in") }}</dt>
          <dd class="text-sm font-medium">
            <div
              v-for="entry in membership.coshoppers"
              :key="entry.memberships_coshoppers_id.id"
            >
              {{ entry.memberships_coshoppers_id.first_name }}
              {{ entry.memberships_coshoppers_id.last_name }}
            </div>
          </dd>
        </div>
      </dl>

      <!-- Skills -->
      <div
        v-if="membership?.shifts_skills && membership.shifts_skills.length > 0"
        class="mt-4"
      >
        <h3 class="text-base mb-2">{{ t("Skills") }}</h3>
        <ul class="space-y-1">
          <li
            v-for="entry in membership.shifts_skills"
            :key="entry.shifts_skills_id?.id"
            class="text-sm"
          >
            {{ entry.shifts_skills_id?.icon }}
            {{
              locale.startsWith("de")
                ? entry.shifts_skills_id?.name_de
                : entry.shifts_skills_id?.name_en
            }}
          </li>
        </ul>
        <p class="mt-2">
          {{ t("skills_managed_by_office") }}
          <NuxtLink to="/help" class="underline">{{
            t("members_office")
          }}</NuxtLink>{{ t("skills_managed_suffix") }}
        </p>
      </div>
    </div>

    <!-- ── Umfrage Aktivierung zu Mitmach-Schichten ──────────────────────────────────────── -->
    <div>
      <h2>{{ t("Umfrage Aktivität") }}</h2>
      <p>{{ t("t_activation_survey_intro") }}</p>
      <UButton
        to="/profile/activation-survey"
        class="mt-4"
        icon="i-heroicons-chat-bubble-left-right"
      >
        {{ t("Zu deiner Mitmach-Umfrage") }}
      </UButton>
    </div>

    <!-- ── Direktkredite ─────────────────────────────────────────────────── -->
    <div>
      <h2>{{ t("Direktkredite") }}</h2>
      <p>Hier kannst du deinen Direktkredit aufrufen.</p>
      <UButton
        href="https://direktkredite.mila.wien/login-oidc"
        target="_blank"
        class="mt-4"
        color="green"
        icon="i-heroicons-arrow-top-right-on-square"
      >
        {{ t("Direktkreditplattform") }}
      </UButton>
    </div>
    <div>
      <h2>{{ t("Weitere Genossenschaftsanteile zeichnen") }}</h2>
      <p>
        Deinen finanziellen Möglichkeiten gemäß kannst du auch mehr als 9
        Genossenschaftsanteile zeichnen. Wenn du Anteile nachzeichnen möchtest
        oder Fragen dazu hast, schreibe uns gerne!
      </p>
      <UButton
        href="mailto:mitglied@mila.wien"
        class="mt-4"
        color="green"
        icon="i-heroicons-envelope"
      >
        {{ t("Email: mitglied@mila.wien") }}
      </UButton>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "t_activation_survey_intro": "Wenn du schon längere Zeit nicht mehr bei MILA mitgemacht hast, erzähl uns kurz, wie es dir geht - das hilft uns, dich besser zu unterstützen."
  "Profile": "Profil"
  "Some fields are not filled in correctly": "Einige Felder sind nicht korrekt ausgefüllt."
  "i_pronouns": "Die Angabe der Pronomen ist freiwillig. Sie soll uns helfen bei Mila einen respektvollen Umgang miteinander zu pflegen, indem wir so mit- und übereinander sprechen, wie die angesprochenen Personen es wünschen."
  "i_visible_name": "Dieser Name kann sich von deinem amtlichen Namen unterscheiden. Er wird z.B. in E-Mails, auf deiner Mitgliedskarte, im Schichtplan, beim Check-in im Laden und in deinem Wolke-Profil verwendet."
  "E-Mail & Passwort": "E-Mail & Passwort"
  "Aktuelle E-Mail": "Aktuelle E-Mail"
  "E-Mail-Adresse": "E-Mail-Adresse"
  "Name und Pronomen": "Name und Pronomen"
  "Einstellung gespeichert.": "Einstellung gespeichert."
  "t_email_is_username": "Deine E-Mail-Adresse wird als Nutzer*Innen-Name auf der Anmeldeseite übernommen."
  "E-Mail erfolgreich geändert.": "E-Mail erfolgreich geändert."
  "Passwort ändern": "Passwort ändern"
  "Passwort": "Passwort"
  "Passwort_redirect_explanation": "Du wirst zur Änderung deines Passworts auf unsere Anmeldeseite weitergeleitet, wo du dein aktuelles und das neue Passwort eingeben musst. Anschließend kehrst du automatisch hierher zurück."
  "Mitgliedsdaten": "Mitgliedsdaten"
  "Personenart": "Personenart"
  "Natürliche Person": "Natürliche Person"
  "Juristische Person": "Juristische Person"
  "Geschlecht": "Geschlecht"
  "Telefonnummer": "Telefonnummer"
  "Geburtsdatum": "Geburtsdatum"
  "Beruf": "Beruf"
  "Organisationsname": "Organisationsname"
  "Organisationsart": "Organisationsart"
  "Organisations-ID": "Organisations-ID"
  "Adresse": "Adresse"
  "Zahlungsart": "Zahlungsart"
  "transfer": "Überweisung"
  "sepa": "SEPA-Einzug"
  "IBAN": "IBAN"
  "Kontoinhaber:in": "Kontoinhaber:in"
  "Miteinkäufer*in": "Miteinkäufer*in"
  "Skills": "Fähigkeiten"
  "skills_managed_by_office": "Deine Fähigkeiten werden vom"
  "members_office": "Mitgliederbüro"
  "skills_managed_suffix": " verwaltet."
  "Karte": "Karte"
  "Deine Mitgliedschaft wurde beendet.": "Deine Mitgliedschaft wurde beendet."
  "Dein Beitrittsantrag wird gerade bearbeitet.": "Dein Beitrittsantrag wird gerade bearbeitet."
  "Du bist noch kein Mitglied.": "Du bist noch kein Mitglied."
  "Jetzt Mitglied werden": "Jetzt Mitglied werden"
  "Beitrittsdatum": "Beitrittsdatum"
  "Mitgliedsnummer": "Mitgliedsnummer"
  "Mitgliedsart": "Mitgliedsart"
  "Genossenschafts-Anteile": "Genossenschafts-Anteile"
en:
  "Umfrage Aktivität": "Participation survey"
  "t_activation_survey_intro": "If you haven't participated in MILA for a while, please tell us briefly how you are doing - it helps us support you better."
  "Zu deiner Mitmach-Umfrage": "Fill in your survey"
  "Einstellungen": "Settings"
  "Es ist ein Fehler aufgetreten.": "An error occurred."
  "Dein Profil wurde erfolgreich aktualisiert.": "Your profile has been updated successfully."
  "Sichtbarer Vorname": "Visible first name"
  "Sichtbarer Nachname": "Visible last name"
  "Wie sollen wir dich ansprechen?": "How should we address you?"
  "Pronomen": "Pronouns"
  "Sichtbarkeit des Namens im Schichtplan": "Name visibility in shift calendar"
  "Meinen Namen anderen Mitgliedern im Schichtplan nicht anzeigen.": "Do not show my name to other members in the shift calendar."
  "E-Mail-Benachrichtigungen": "Email notifications"
  "Bevorstehende Schichten": "Upcoming shifts"
  "i_pronouns": "A declaration of pronouns is optional. They help us at MILA in creating an inclusive environment, by speaking to and about each other in a way, that respects everyones wishes."
  "i_visible_name": "This name can differ from your legal name. It is used e.g. in emails, on your membership card, in the shift plan, at check-in in the shop and in your Wolke profile."
  "E-Mail & Passwort": "Email & Password"
  "Aktuelle E-Mail": "Current email"
  "E-Mail-Adresse": "Email address"
  "Name und Pronomen": "Name and pronouns"
  "E-Mail": "Email"
  "Einstellung gespeichert.": "Setting saved."
  "t_email_is_username": "Your email address is used as your username on the login page."
  "E-Mail erfolgreich geändert.": "Email updated successfully."
  "Passwort ändern": "Change password"
  "Passwort": "Password"
  "Passwort_redirect_explanation": "To change your password, you will be redirected to our login page, where you need to enter your current and your new password. Afterwards you will automatically return here."
  "Mitgliedsdaten": "Membership data"
  "Personenart": "Person type"
  "Natürliche Person": "Natural person"
  "Juristische Person": "Legal entity"
  "Geschlecht": "Gender"
  "Telefonnummer": "Phone number"
  "Geburtsdatum": "Date of birth"
  "Beruf": "Occupation"
  "Organisationsname": "Organization name"
  "Organisationsart": "Organization type"
  "Organisations-ID": "Organization ID"
  "Adresse": "Address"
  "Zahlungsart": "Payment type"
  "transfer": "Bank transfer"
  "sepa": "SEPA direct debit"
  "IBAN": "IBAN"
  "Kontoinhaber:in": "Account holder"
  "Miteinkäufer*in": "Coshopper"
  "Skills": "Skills"
  "skills_managed_by_office": "Your skills are managed by the"
  "members_office": "members' office"
  "skills_managed_suffix": "."
  "Karte": "Card"
  "Speichern": "Save"
  "Deine Mitgliedschaft wurde beendet.": "Your membership has ended."
  "Dein Beitrittsantrag wird gerade bearbeitet.": "Your membership application is being processed."
  "Du bist noch kein Mitglied.": "You are not yet a member."
  "Jetzt Mitglied werden": "Become a member now"
  "Beitrittsdatum": "Approval date"
  "Mitgliedsnummer": "Member ID"
  "Mitgliedsart": "Membership type"
  "Genossenschafts-Anteile": "Cooperative shares"
</i18n>
