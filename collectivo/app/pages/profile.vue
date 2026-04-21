<script setup lang="ts">
import { object, string, bool, type InferType } from "yup";
import type { FormSubmitEvent, FormErrorEvent } from "#ui/types";

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
const keycloakAccountUrl = `${runtimeConfig.public.keycloakUrl}/realms/${runtimeConfig.public.keycloakRealm}/account`;

const mv = "Dieses Feld ist erforderlich";
const schema = object({
  username: string().min(1, t(mv)).required(t(mv)),
  username_last: string().min(1, t(mv)).required(t(mv)),
  pronouns: string().optional(),
  hide_name: bool().optional(),
  send_notifications: bool().optional(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  username: user.username,
  username_last: user.username_last,
  pronouns: user.pronouns,
  hide_name: user.hide_name,
  send_notifications: user.send_notifications,
});

// Directus can return null values
// But zod and yup want undefined
Object.keys(state).forEach((key) => {
  const s = state as Record<string, any>;
  if (s[key] === null) {
    s[key] = undefined;
  }
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const res = await useFetch("/api/profile", {
    method: "PUT",
    body: event.data,
  });
  if (res.status.value === "success") {
    await userData.value.reload();
    toast.add({
      title: t("Dein Profil wurde erfolgreich aktualisiert."),
      color: "success",
    });
  } else {
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
  }
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
const emailSchema = object({
  email: string().email(),
});

type EmailSchema = InferType<typeof emailSchema>;
const emailState = reactive({ email: user.email });
async function onEmailSubmit(event: FormSubmitEvent<EmailSchema>) {
  const res = await useFetch("/api/profile/email", {
    method: "PUT",
    body: { email: emailState.email },
  });
  if (res.status.value === "success") {
    await userData.value.reload();
      toast.add({ title: t("E-Mail erfolgreich geändert."), color: "success" });
  } else {
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
  }
}

// ── Password change (directus syncs to keycloak) ──────────────────────────────────────────
const passwordState = reactive({ password: "", password_confirm: "" });
const passwordError = ref("");

async function onPasswordSubmit() {
  passwordError.value = "";
  if (passwordState.password !== passwordState.password_confirm) {
    passwordError.value = t("Die Passwörter stimmen nicht überein.");
    toast.add({
      title: t("Die Passwörter stimmen nicht überein."),
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
    return;
  }
  const res = await useFetch("/api/profile/password", {
    method: "PUT",
    body: { password: passwordState.password },
  });
  if (res.status.value === "success") {
    passwordState.password = "";
    passwordState.password_confirm = "";
    toast.add({ title: t("Passwort erfolgreich geändert."), color: "success" });
  } else {
    toast.add({
      title: t("Es ist ein Fehler aufgetreten."),
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
    });
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
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="onError"
      >
        <FormsFormGroup
          :label="t('Vorname')"
          :infotext="
            t('Dieser Name kann sich von deinem amtlichen Namen unterscheiden.')
          "
          name="username"
          required
        >
          <template #description> </template>
          <UInput v-model="state.username" />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Nachname')"
          :infotext="
            t('Dieser Name kann sich von deinem amtlichen Namen unterscheiden.')
          "
          name="username_last"
          required
        >
          <template #description> </template>
          <UInput v-model="state.username_last" />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Mit welchen Pronomen möchtest du angesprochen werden?')"
          :infotext="t('i_pronouns')"
          name="pronouns"
        >
          <UInput variant="outline" v-model="state.pronouns" />
        </FormsFormGroup>

        <FormsFormGroup name="hide_name" :label="t('Anonym bleiben')">
          <UCheckbox variant="card" v-model="state.hide_name">
            <template #label>
              {{
                t(
                  "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.",
                )
              }}</template
            >
          </UCheckbox>
        </FormsFormGroup>

        <FormsFormGroup
          name="send_notifications"
          :label="t('E-Mail-Benachrichtigungen')"
        >
          <UCheckbox variant="card" v-model="state.send_notifications">
            <template #label>
              {{
                t(
                  "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten.",
                )
              }}
            </template>
          </UCheckbox>
        </FormsFormGroup>

        <div class="pt-2">
          <UButton type="submit">
            {{ t("Änderungen speichern") }}
          </UButton>
        </div>
      </UForm>
    </div>

    <!-- ── Email Address ─────────────────────────────────────────────── -->
    <div>
      <h2>{{ t("E-Mail-Adresse ändern") }}</h2>
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
            type="email"
          />
        </FormsFormGroup>
        <div class="pt-2">
          <UButton type="submit">
            {{ t("E-Mail-Adresse ändern") }}
          </UButton>
        </div>
      </UForm>
    </div>

    <!-- ── Password ─────────────────────────────────────────────── -->
    <div>
      <h2>{{ t("Passwort ändern") }}</h2>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onPasswordSubmit"
        @error="onError"
      >
        <FormsFormGroup
          :label="t('Neues Passwort')"
          name="password"
          required
        >
          <UInput
            v-model="passwordState.password"
            type="password"
            autocomplete="new-password"
          />
        </FormsFormGroup>
        <FormsFormGroup
          :label="t('Passwort bestätigen')"
          name="password"
          required
        >
          <UInput
            v-model="passwordState.password_confirm"
            type="password"
            autocomplete="new-password"
          />
        </FormsFormGroup>
        <p v-if="passwordError" class="text-sm text-red-600">
          {{ passwordError }}
        </p>
        <div class="pt-2">
          <UButton type="submit">
            {{ t("Passwort ändern") }}
          </UButton>
        </div>
      </UForm>
    </div>

    <!-- ── Persönliche Daten (read-only) ─────────────────────────────────── -->
    <div>
      <h2>{{ t("Persönliche Daten") }}</h2>

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
        <div v-if="user.memberships_phone" class="flex gap-2">
          <dt class="text-sm w-48 shrink-0">{{ t("Telefon") }}</dt>
          <dd class="text-sm font-medium">{{ user.memberships_phone }}</dd>
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

        <!-- Address -->
        <div
          v-if="user.memberships_street || user.memberships_postcode"
          class="flex gap-2"
        >
          <dt class="text-sm w-48 shrink-0">{{ t("Adresse") }}</dt>
          <dd class="text-sm font-medium">
            <span v-if="user.memberships_street">
              {{ user.memberships_street }} {{ user.memberships_streetnumber }}
              <template v-if="user.memberships_stair">
                , {{ t("Stiege") }} {{ user.memberships_stair }}
              </template>
              <template v-if="user.memberships_door">
                / {{ t("Tür") }} {{ user.memberships_door }}
              </template>
            </span>
            <br v-if="user.memberships_street && user.memberships_postcode" />
            <span v-if="user.memberships_postcode">
              {{ user.memberships_postcode }} {{ user.memberships_city }}
            </span>
            <br v-if="user.memberships_country" />
            <span v-if="user.memberships_country">{{
              user.memberships_country
            }}</span>
          </dd>
        </div>

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
      </dl>

      <!-- Coshoppers -->
      <div
        v-if="membership?.coshoppers && membership.coshoppers.length > 0"
        class="mt-4"
      >
        <h3 class="text-base mb-2">{{ t("Miteinkäufer*in") }}</h3>
        <ul class="space-y-1">
          <li
            v-for="entry in membership.coshoppers"
            :key="entry.memberships_coshoppers_id.id"
            class="text-sm"
          >
            {{ entry.memberships_coshoppers_id.first_name }}
            {{ entry.memberships_coshoppers_id.last_name }}
          </li>
        </ul>
      </div>

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
  "Profile": "Profil"
  "Some fields are not filled in correctly": "Einige Felder sind nicht korrekt ausgefüllt."
  "i_pronouns": "Die Angabe der Pronomen ist freiwillig. Sie soll uns helfen bei Mila einen respektvollen Umgang miteinander zu pflegen, indem wir so mit- und übereinander sprechen, wie die angesprochenen Personen es wünschen."
  "E-Mail & Passwort": "E-Mail & Passwort"
  "Aktuelle E-Mail": "Aktuelle E-Mail"
  "E-Mail-Adresse": "E-Mail-Adresse"
  "E-Mail-Adresse ändern": "E-Mail-Adresse ändern"
  "E-Mail erfolgreich geändert.": "E-Mail erfolgreich geändert."
  "Passwort ändern": "Passwort ändern"
  "Passwort über Keycloak verwalten": "Dein Passwort wird über Keycloak verwaltet."
  "Konto verwalten": "Konto verwalten"
  "Neues Passwort": "Neues Passwort"
  "Passwort bestätigen": "Passwort bestätigen"
  "Das Passwort muss mindestens 8 Zeichen lang sein.": "Das Passwort muss mindestens 8 Zeichen lang sein."
  "Die Passwörter stimmen nicht überein.": "Die Passwörter stimmen nicht überein."
  "Passwort erfolgreich geändert.": "Passwort erfolgreich geändert."
  "Persönliche Daten": "Persönliche Daten"
  "Personenart": "Personenart"
  "Natürliche Person": "Natürliche Person"
  "Juristische Person": "Juristische Person"
  "Geschlecht": "Geschlecht"
  "Telefon": "Telefon"
  "Geburtsdatum": "Geburtsdatum"
  "Beruf": "Beruf"
  "Organisationsname": "Organisationsname"
  "Organisationsart": "Organisationsart"
  "Organisations-ID": "Organisations-ID"
  "Adresse": "Adresse"
  "Stiege": "Stiege"
  "Tür": "Tür"
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
  "Einstellungen": "Settings"
  "Änderungen speichern": "Save changes"
  "Es ist ein Fehler aufgetreten.": "An error occurred."
  "Dein Profil wurde erfolgreich aktualisiert.": "Your profile has been updated successfully."
  "Wie sollen wir dich ansprechen?": "How should we address you?"
  "Dieser Name kann sich von deinem amtlichen Namen unterscheiden.": "This name can differ from your legal name."
  "Mit welchen Pronomen möchtest du angesprochen werden?": "Which pronouns would you like to be addressed with?"
  "Anonym bleiben": "Stay anonymous"
  "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.": "Do not show my name to other members on the platform."
  "E-Mail-Benachrichtigungen": "Email notifications"
  "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten.": "Receive email notifications about upcoming shifts."
  "i_pronouns": "A declaration of pronouns is optional. They help us at MILA in creating an inclusive environment, by speaking to and about each other in a way, that respects everyones wishes."
  "E-Mail & Passwort": "Email & Password"
  "Aktuelle E-Mail": "Current email"
  "E-Mail-Adresse": "Email address"
  "E-Mail-Adresse ändern": "Change email address"
  "E-Mail erfolgreich geändert.": "Email updated successfully."
  "Passwort ändern": "Change password"
  "Passwort über Keycloak verwalten": "Your password is managed via Keycloak."
  "Konto verwalten": "Manage account"
  "Neues Passwort": "New password"
  "Passwort bestätigen": "Confirm password"
  "Das Passwort muss mindestens 8 Zeichen lang sein.": "Password must be at least 8 characters."
  "Die Passwörter stimmen nicht überein.": "Passwords do not match."
  "Passwort erfolgreich geändert.": "Password changed successfully."
  "Persönliche Daten": "Personal data"
  "Personenart": "Person type"
  "Natürliche Person": "Natural person"
  "Juristische Person": "Legal entity"
  "Geschlecht": "Gender"
  "Telefon": "Phone"
  "Geburtsdatum": "Date of birth"
  "Beruf": "Occupation"
  "Organisationsname": "Organization name"
  "Organisationsart": "Organization type"
  "Organisations-ID": "Organization ID"
  "Adresse": "Address"
  "Stiege": "Staircase"
  "Tür": "Door"
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
