<script setup lang="ts">
import { object, string, ref, number, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";
const { t } = useI18n();

setPageTitle(t("Membership Application"));

definePageMeta({
  layout: "forms",
});

const schema = object({
  directus_users__memberships_person_type: string().required(),
  directus_users__email: string().email().required(),
  directus_users__password: string().required(),
  _pw_confirm: string()
    .required()
    .oneOf([ref("directus_users__password")], "Passwords must match"),
  directus_users__memberships_organization_name: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__memberships_organization_type: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__memberships_organization_id: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__first_name: string().required(),
  directus_users__last_name: string().required(),
  directus_users__memberships_gender: string().required(),
  directus_users__memberships_phone: string().required(),
  directus_users__memberships_birthday: string().when(
    "directus_users__memberships_person_type",
    {
      is: "natural",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__memberships_occupation: string().when(
    "directus_users__memberships_person_type",
    {
      is: "natural",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__memberships_street: string().required(),
  directus_users__memberships_streetnumber: string().required(),
  directus_users__memberships_stair: string(),
  directus_users__memberships_door: string(),
  directus_users__memberships_postcode: string().required(),
  directus_users__memberships_city: string().required(),
  directus_users__memberships_country: string().required(),
  memberships__memberships_type: string(),
  shares_options: string(),
  memberships__memberships_shares: number()
    .integer()
    .when("shares_options", {
      is: "more",
      then: (schema) => schema.required().min(10, "Must be at least 10"),
    }),
  directus_users__payments_type: string(),
  directus_users__payments_account_iban: string().when(
    "directus_users__payments_type",
    {
      is: "sepa",
      then: (schema) =>
        schema
          .required()
          .test("iban", "IBAN nicht gültig", (value, context) => {
            return validateIban(value, context, state);
          }),
    },
  ),
  directus_users__payments_account_owner: string().when(
    "directus_users__payments_type",
    {
      is: "sepa",
      then: (schema) => schema.required(),
    },
  ),
  directus_users__mila_survey_contact: string(),
  directus_users__mila_survey_motivation: string(),
  directus_users__mila_groups_interested_2: string(),
  directus_users__mila_skills_2: string(),
  directus_users__survey_languages: string(),
  directus_users__survey_languages_additional: string(),
  _statutes_approval: string(),
  _data_approval: string(),
  directus_users__mila_pr_approved: string(),
});

type Schema = InferType<typeof schema>;

const state = reactive({
  directus_users__memberships_person_type: "natural",
  directus_users__email: undefined,
  directus_users__password: undefined,
  _pw_confirm: undefined,
  directus_users__memberships_organization_name: undefined,
  directus_users__memberships_organization_type: undefined,
  directus_users__memberships_organization_id: undefined,
  directus_users__first_name: undefined,
  directus_users__last_name: undefined,
  directus_users__memberships_gender: undefined,
  directus_users__memberships_phone: undefined,
  directus_users__memberships_birthday: undefined,
  directus_users__memberships_occupation: undefined,
  directus_users__memberships_street: undefined,
  directus_users__memberships_streetnumber: undefined,
  directus_users__memberships_stair: undefined,
  directus_users__memberships_door: undefined,
  directus_users__memberships_postcode: undefined,
  directus_users__memberships_city: undefined,
  directus_users__memberships_country: undefined,
  memberships__memberships_type: undefined,
  shares_options: undefined,
  memberships__memberships_shares: undefined,
  directus_users__payments_type: undefined,
  directus_users__payments_account_iban: undefined,
  directus_users__payments_account_owner: undefined,
  directus_users__mila_survey_contact: undefined,
  directus_users__mila_survey_motivation: undefined,
  directus_users__mila_groups_interested_2: undefined,
  directus_users__mila_skills_2: undefined,
  directus_users__survey_languages: undefined,
  directus_users__survey_languages_additional: undefined,
  _statutes_approval: undefined,
  _data_approval: undefined,
  directus_users__mila_pr_approved: undefined,
});

const isNatural = computed(
  () => state.directus_users__memberships_person_type === "natural",
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Do something with event.data
  console.log(event.data);
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <div class="">
      <h2>{{ t("Welcome to MILA!") }}</h2>

      <p>
        {{ t("t:mila_form_intro") }}
        <a class="font-bold" href="mailto:mitglied@mila.wien"
          >mitglied@mila.wien</a
        >.
      </p>
    </div>

    <UFormGroup
      :label="t('t:memberships_form_ptype')"
      name="directus_users__memberships_person_type"
      required
    >
      <URadioGroup
        v-model="state.directus_users__memberships_person_type"
        :options="['natural', 'legal']"
      >
        <template #label="{ option }">{{ t("l:" + option.label) }}</template>
      </URadioGroup>
    </UFormGroup>

    <div class="pt-6">
      <h2>{{ t("Create MILA user account") }}</h2>
      <p>
        {{ t("t:mila_form_account") }}
      </p>
    </div>

    <UFormGroup label="E-Mail" name="directus_users__email" required>
      <UInput v-model="state.directus_users__email" />
    </UFormGroup>

    <div class="grid md:grid-cols-2 gap-4">
      <UFormGroup
        :label="t('Password')"
        name="directus_users__password"
        required
      >
        <UInput v-model="state.directus_users__password" type="password" />
      </UFormGroup>

      <UFormGroup :label="t('Repeat password')" name="_pw_confirm" required>
        <UInput v-model="state._pw_confirm" type="password" />
      </UFormGroup>
    </div>

    <template v-if="!isNatural">
      <div class="pt-6">
        <h2>{{ t("Organization") }}</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <UFormGroup
          :label="t('Organization name')"
          name="directus_users__memberships_organization_name"
          required
        >
          <UInput
            v-model="state.directus_users__memberships_organization_name"
          />
        </UFormGroup>

        <UFormGroup
          :label="t('Organization type')"
          name="directus_users__memberships_organization_type"
          required
        >
          <UInput
            v-model="state.directus_users__memberships_organization_type"
          />
        </UFormGroup>

        <UFormGroup
          :label="t('Organization ID')"
          name="directus_users__memberships_organization_id"
          required
        >
          <UInput v-model="state.directus_users__memberships_organization_id" />
        </UFormGroup>
      </div>
    </template>

    <div class="pt-6">
      <h2 v-if="isNatural">
        {{ t("Personal data") }}
      </h2>
      <h2 v-else>
        {{ t("Organization contact person") }}
      </h2>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <UFormGroup
        :label="t('First name')"
        name="directus_users__first_name"
        required
      >
        <UInput v-model="state.directus_users__first_name" />
      </UFormGroup>

      <UFormGroup
        :label="t('Last name')"
        name="directus_users__last_name"
        required
      >
        <UInput v-model="state.directus_users__last_name" />
      </UFormGroup>

      <UFormGroup
        :label="t('Gender')"
        name="directus_users__memberships_gender"
        required
      >
        TODO SELECT
        <UInput v-model="state.directus_users__memberships_gender" />
      </UFormGroup>

      <UFormGroup :label="t('Phone')" name="directus_users__memberships_phone">
        <UInput v-model="state.directus_users__memberships_phone" />
      </UFormGroup>
    </div>

    <template v-if="isNatural">
      <UFormGroup
        :label="t('Birthday')"
        name="directus_users__memberships_birthday"
        required
      >
        TODO DATEPICKER
        <UInput v-model="state.directus_users__memberships_birthday" />

        <!-- <CollectivoFormDatePicker
                v-if="input.useDatePicker"
                v-model="state[input.key]"
              />
              <CollectivoFormDate
                v-else
                v-model="state[input.key]"
                :max-years-future="input.maxYearsFuture"
                :max-years-past="input.maxYearsPast"
                :disabled="input.disabled"
              /> -->
      </UFormGroup>

      <UFormGroup
        :label="t('Occupation')"
        name="directus_users__memberships_occupation"
        required
      >
        <UInput v-model="state.directus_users__memberships_occupation" />
      </UFormGroup>
    </template>

    <div class="pt-6">
      <h2>{{ t("Address") }}</h2>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <UFormGroup
        :label="t('Street')"
        name="directus_users__memberships_street"
        required
      >
        <UInput v-model="state.directus_users__memberships_street" />
      </UFormGroup>
      <UFormGroup
        :label="t('Number')"
        name="directus_users__memberships_streetnumber"
        required
      >
        <UInput v-model="state.directus_users__memberships_streetnumber" />
      </UFormGroup>
      <UFormGroup :label="t('Stair')" name="directus_users__memberships_stair">
        <UInput v-model="state.directus_users__memberships_stair" />
      </UFormGroup>
      <UFormGroup :label="t('Door')" name="directus_users__memberships_door">
        <UInput v-model="state.directus_users__memberships_door" />
      </UFormGroup>
      <UFormGroup
        :label="t('Postcode')"
        name="directus_users__memberships_postcode"
        required
      >
        <UInput v-model="state.directus_users__memberships_postcode" />
      </UFormGroup>
      <UFormGroup
        :label="t('City')"
        name="directus_users__memberships_city"
        required
      >
        <UInput v-model="state.directus_users__memberships_city" />
      </UFormGroup>
      <UFormGroup
        :label="t('Country')"
        name="directus_users__memberships_country"
        required
      >
        <UInput v-model="state.directus_users__memberships_country" />
      </UFormGroup>
    </div>

    <div class="pt-6">
      <h2>{{ t("Type of membership") }}</h2>
      <p v-if="isNatural">
        {{ t("t:mila_form_mtype_natural") }}
      </p>
      <p v-else>
        {{ t("t:mila_form_mtype_orga") }}
      </p>
    </div>

    <UFormGroup
      :label="t('t:memberships_form_mtype')"
      name="memberships__memberships_type"
      required
    >
      <URadioGroup
        v-model="state.memberships__memberships_type"
        :options="isNatural ? ['active', 'investing'] : ['investing']"
      >
        <template #label="{ option }">{{ t("l:" + option.label) }}</template>
      </URadioGroup>
    </UFormGroup>

    <div class="pt-6">
      <h2>{{ t("Cooperative shares") }}</h2>
      <p>
        {{
          isNatural
            ? t("t:mila_form_cshares_natural")
            : t("t:mila_form_cshares_orga")
        }}<a
          class="font-bold"
          href="https://www.mila.wien/uber-uns/haeufige-fragen/"
          >{{ t("Frequently Asked Questions") }}</a
        >.
      </p>
    </div>

    <UFormGroup
      :label="t('How many shares do you want?')"
      name="shares_options"
      required
    >
      <URadioGroup
        v-model="state.shares_options"
        :options="isNatural ? ['social', 'normal', 'more'] : ['normal', 'more']"
      >
        <template #label="{ option }">{{ t("l:" + option.label) }}</template>
      </URadioGroup>
    </UFormGroup>

    <UFormGroup
      v-if="state.shares_options === 'more'"
      :label="t('Number of shares (10 or more, 20€ per share)')"
      name="memberships__memberships_shares"
      required
    >
      <UInput v-model="state.memberships__memberships_shares" type="number" />
    </UFormGroup>

    <div v-if="state.shares_options">
      <p class="text-sm font-semibold pb-1">{{ t("Chosen shares") }}</p>
      <div class="bg-blue-50 rounded-sm p-4 text-sm">
        {{
          state.shares_options === "social"
            ? t("t:mila_form_shares_social")
            : state.shares_options === "normal"
              ? t("t:mila_form_shares_normal")
              : t("t:mila_form_shares_more")
        }}
      </div>
    </div>

    <div class="pt-6">
      <h2>{{ t("Payment details") }}</h2>
      <p>
        {{ t("t:mila_form_payment") }}
      </p>
    </div>

    <UFormGroup
      :label="t('Payment type')"
      name="directus_users__payments_type"
      required
    >
      <USelectMenu
        v-model="state.directus_users__payments_type"
        :options="['sepa', 'transfer']"
      >
        <template #label>{{
          t("l:" + (state.directus_users__payments_type ?? "choose"))
        }}</template>
        <template #option="{ option }">{{ t("l:" + option) }}</template>
      </USelectMenu>
    </UFormGroup>

    <template v-if="state.directus_users__payments_type === 'sepa'">
      <UFormGroup
        :label="t('Bank account IBAN')"
        name="directus_users__payments_account_iban"
        required
      >
        <UInput v-model="state.directus_users__payments_account_iban" />
      </UFormGroup>

      <UFormGroup
        :label="t('Bank account owner')"
        name="directus_users__payments_account_owner"
        required
      >
        <UInput v-model="state.directus_users__payments_account_owner" />
      </UFormGroup>
    </template>

    <div class="pt-6">
      <h2>{{ t("Survey") }}</h2>
      <p>
        {{ t("t:mila_form_survey") }}
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <UFormGroup
        :label="t('How did you hear about us?')"
        name="directus_users__mila_survey_contact"
        required
      >
        <UTextarea v-model="state.directus_users__mila_survey_contact" />
      </UFormGroup>

      <UFormGroup
        :label="t('What convinced you to join MILA?')"
        name="directus_users__mila_survey_motivation"
        required
      >
        <UTextarea v-model="state.directus_users__mila_survey_motivation" />
      </UFormGroup>

      TODO SURVEY

      <!-- <CollectivoFormCheckboxGroup
                  v-model="state[input.key]"
                  :choices="input.choices"
                /> -->
    </div>

    <div class="pt-6">
      <h2>{{ t("Conditions") }}</h2>
    </div>

    TODO Conditions

    <!-- <div class="form-box flex flex-row">
                <UToggle
                  v-model="state[input.key]"
                  :disabled="input.disabled"
                  class="mt-0.5 mr-2"
                />
                <span
                  v-if="input.content"
                  class="md-description md-small"
                  v-html="prepareHTML(input.content)"
                />
              </div> -->

    <UButton type="submit" color="green" size="lg" block>
      {{ t("Submit application") }}
    </UButton>
  </UForm>
</template>

<i18n lang="yaml">
de:
  "Membership Application": "Beitrittserklärung"
  "Welcome to MILA!": "Willkommen bei MILA!"
  "Type of membership": "Art der Mitgliedschaft"
  "How many shares do you want?": "Wieviele Anteile möchtest du zeichnen?"
  "Standard (9 shares) 180€": "Regeltarif (9 Anteile) 180€"
  "Social (1 share) 20€": "Sozialtarif (1 Anteil) 20€"
  "More (10 or more)": "Mehr (10 oder mehr)"
  "Number of shares (10 or more, 20€ per share)": "Anzahl der Anteile (10 oder mehr, 20€ pro Anteil)"
  "Chosen shares": "Ausgewählte Anteile"
  "How did you hear about us?": "Woher kennst du MILA?"
  "What convinced you to join MILA?": "Was hat dich von MILA überzeugt?"
  "Do you want to participate in a working group?": "Möchtest du  in einer Arbeitsgruppe (AG) mitmachen?"
  "You can find more information about the working groups here: https://www.mila.wien/mitmachen/arbeitsgruppen/": "Mehr informationen über die Arbeitsgruppen findest du unter https://www.mila.wien/mitmachen/arbeitsgruppen/"
  "What are your skills?": "Welche Fähigkeiten bringst du mit?"
  "PR Work": "Öffentlichkeitsarbeit"
  "Statutes": "Satzung"
  "Data use": "Datenverarbeitung"
  "Liability": "Haftung"
  "What languages do you speak?": "Welche Sprachen sprichst du?"
  "German": "Deutsch"
  "English": "Englisch"
  "Turkish": "Türkisch"
  "French": "Französisch"
  "BKS": "BKS"
  "Ukrainian": "Ukrainisch"
  "Russian": "Russisch"
  "Password": "Passwort"
  "Repeat password": "Passwort wiederholen"
  "Additional languages": "Weitere Sprachen"
  "Payout upon termination": "Auszahlung bei Kündigung"
  "Revocation": "Widerruf"
  "Create MILA user account": "MILA Account erstellen"
  "I approve SEPA direct debit": "Ich erlaube SEPA Bankeinzug"
  "I transfer the amount myself": "Ich überweise den Betrag selbst"
  "Submit application": "Beitrittserklärung einreichen"
  "Cooperative shares": "Genossenschaftsanteile"
  "First name": "Vorname"
  "Last name": "Nachname"
  "Phone": "Telefon"
  "Gender": "Geschlecht"
  "Birthday": "Geburtsdatum"
  "Occupation": "Beruf"
  "Address": "Adresse"
  "Street": "Straße"
  "Number": "Hausnummer"
  "Stair": "Stiege"
  "Door": "Tür"
  "Postcode": "Postleitzahl"
  "City": "Stadt"
  "Country": "Land"
  "Frequently Asked Questions": "Häufige Fragen"
  "Survey": "Umfrage"
  "Conditions": "Bedingungen"
  "Payment type": "Zahlungsart"
  "Payment details": "Zahlungsdetails"

  "Organization": "Organisation"
  "Organization name": "Name der Organisation"
  "Organization type": "Art der Organisation"
  "Organization ID": "Firmenbuchnummer / Vereinsregisternummer"
  "Organization contact person": "Ansprechpartner:in der Organisation"
  "Personal data": "Persönliche Daten"

  "l:natural": "Einzelperson"
  "l:legal": "Organisation"
  "l:active": "Aktives Mitglied"
  "l:investing": "Investierendes Mitglied"
  "l:social": "Sozialtarif (1 Anteil) 20€"
  "l:normal": "Regeltarif (9 Anteile) 180€"
  "l:more": "Mehr (10 oder mehr, 20€ pro Anteil)"
  "l:sepa": "SEPA Bankeinzug"
  "l:transfer": "Überweisung"
  "l:choose": "Bitte auswählen"

  "t:memberships_form_ptype": "Ich stelle diesen Antrag als:"
  "t:memberships_form_mtype": "Welche Art der Mitgliedschaft wählst du?"
  "t:memberships_form_intro": "Bitte fülle das Formular aus, um Mitglied zu werden."
  "t:memberships_form_success": "Bitte melde dich an, um deine E-Mail Adresse zu bestätigen."
  "t:memberships_form_already_member": "Deine Beitrittserklärung wurde erfolgreich abgesendet. Vielen Dank für deine Anmeldung!"

  "t:mila_form_intro": "Um unserer Genossenschaft beitreten zu können, brauchen wir noch einige Informationen von dir. Bitte fülle die folgenden Fragen aus. Wenn etwas unklar ist, wende dich bitte an"
  "t:mila_form_account": "Bitte lege hier eine E-Mail Adresse und Passwort für deinen MILA Account fest."
  "t:mila_form_mtype_orga": "Als Organisation bist du automatisch ein investierendes Mitglied. Als investierendes Mitglied unterstützt du uns finanziell, kannst jedoch nicht einkaufen."
  "t:mila_form_cshares_orga": "Deinen Genossenschaftsanteil zahlst du einmalig (nicht jährlich). Der Regeltarif sind € 180 (das sind 9 Anteile). Mehr als 9 kannst du frei wählen. Mehr dazu findest du unter"
  "t:mila_form_mtype_natural": "Als aktives Mitglied arbeitest du im Supermarkt mit und kannst einkaufen. Als investierendes Mitglied unterstützt du uns finanziell, kannst jedoch nicht einkaufen. Du kannst auch später noch zwischen aktiv und investierend wechseln."
  "t:mila_form_cshares_natural": "Deinen Genossenschaftsanteil zahlst du einmal im Leben (nicht jährlich). Der Regeltarif sind € 180 (das sind 9 Anteile), der Sozialtarif ist € 20 (das ist 1 Anteil). 2-8 Anteile können nicht gewählt werden, mehr als 9 kannst du frei wählen). Mehr dazu findest du unter "
  "t:mila_form_mtype_orga2": "Als Organisation bist du automatisch ein investierendes Mitglied. Als investierendes Mitglied unterstützt du uns finanziell, kannst jedoch nicht einkaufen. Weitere Informationen findest du in der ."
  "t:mila_form_mtype_natural2": "Nur als aktives Mitglied hast du nach der Eröffnung des Supermarkts die Möglichkeit einzukaufen. Als investierendes Mitglied unterstützt du uns finanziell, kannst jedoch nicht einkaufen. Weitere Informationen findest du in der ."
  "t:mila_form_shares_normal": "Ich beantrage hiermit die Aufnahme in die MILA Mitmach-Supermarkt Genossenschaft. Ich verpflichte mich einmalig den Regelanteil mit € 180 zu zahlen (dieser setzt sich zusammen aus 9 Genossenschaftsanteilen von je € 20)."
  "t:mila_form_shares_social": "Ich beantrage hiermit die Aufnahme in die MILA Mitmach-Supermarkt Genossenschaft. Ich wähle den Sozialanteil in der Höhe von € 20 aus. Ich erkläre mit dieser Selbsteinschätzung, dass ich den Sozialanteil brauche, um mir eine Genossenschaftsmitgliedschaft bei MILA leisten zu können (z.B: bei einem geringen Einkommen). Die Gründe und Definition von „geringem Einkommen„ oder „einkommensschwach“ können unterschiedlich sein, zur generellen Orientierung kann die Armutsgefährdungsschwelle (60% des Median-Einkommens) in Österreich herangezogen werden."
  "t:mila_form_shares_more": "Ich beantrage hiermit die Aufnahme in die MILA Mitmach-Supermarkt Genossenschaft. Ich möchte mich mit der oben ausgewählten Anzahl an Anteilen an der MILA Mitmach-Supermarkt G. beteiligen. Ich verpflichte mich einmalig zu Zahlungen in Höhe von € 20 je Genossenschaftsanteil."
  "t:mila_form_payment": "Du kannst entweder durch SEPA-Bankeinzug oder durch Direktüberweisung deine Anteile bezahlen."
  "t:mila_form_survey": "Juhu! Fast fertig! Möchtest du noch weitere Informationen mit uns teilen?"
  "t:mila_form_check1": "Ich unterstütze die Öffentlichkeitsarbeit und erlaube MILA, Bildmaterial, auf dem ich zu sehen bin, zu verwenden. Nähere Informationen zur Datenverarbeitung des Bildmaterials in der"
  "t:mila_form_check2": "Ich kann die Satzung unter folgendem Link einsehen und ich erkenne die Bestimmungen und Beschlüsse der Generalversammlung in vollem Umfang an."
  "t:mila_form_check3": "Ich erkläre mich ausdrücklich einverstanden, dass meine personenbezogenen Daten für Zwecke der Mitgliedschaft gem. GenG verarbeitet werden. Weitere Infos in der"
  "t:mila_form_final1": "Im Fall der Insolvenz und/oder Auflösung der Genossenschaft haften die Mitglieder der Genossenschaft deren Gläubigern mit ihren Geschäftsanteilen und zusätzlich mit einem Betrag in der Höhe ihrer Geschäftsanteile (Nachschusspflicht in der einfachen Höhe der Geschäftsanteile)."
  "t:mila_form_final2": "Bei Kündigung wird dein eingezahlter Betrag am Ende des folgenden Geschäftsjahres zurückgezahlt, sofern es die wirtschaftliche Lage von MILA es zulässt. Mehr Infos in der"
  "t:mila_form_final3": "Du hast das Recht binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beträgt 14 Tage ab der Zustellung der Annahme der Zeichnung durch den Vorstand der Genossenschaft"

en:
  "l:natural": "Individual"
  "l:legal": "Organisation"
  "l:active": "Active member"
  "l:investing": "Investing member"
  "l:social": "Social rate (1 share) 20€"
  "l:normal": "Standard rate (9 shares) 180€"
  "l:more": "More (10 or more, 20€ per share)"
  "l:sepa": "SEPA direct debit"
  "l:transfer": "Bank transfer"
  "l:choose": "Please choose"

  "t:memberships_form_ptype": "I am applying for a membership as:"
  "t:memberships_form_mtype": "Which type of membership do you choose?"
  "t:memberships_form_intro": "Please fill out this form to apply for a membership."
  "t:memberships_form_success": "Please log in in order to verify your E-Mail address."
  "t:memberships_form_already_member": "Your membership application has been submitted. Thank you for your application!"

  "t:mila_form_intro": "In order to join our cooperative, we need some information from you. Please complete the following questions. If something is unclear, please contact mitglied[at]mila.wien."
  "t:mila_form_account": "Please enter an E-Mail address and password for your MILA user account here. (If you already have an account, click on 'Login' in the top right corner.)"
  "t:mila_form_mtype_orga": "As an organization, you are automatically an investing member. As an investing member, you support us financially, but you cannot buy anything."
  "t:mila_form_cshares_orga": "You pay your cooperative share only once (not annually). The standard rate is € 180 (that's 9 shares). You can choose more than 9. You can find out more under"
  "t:mila_form_mtype_natural": "As an active member, you work in the supermarket and can shop. As an investing member, you support us financially, but cannot shop. You can also switch between active and investing later."
  "t:mila_form_cshares_natural": "You pay your cooperative share once in your life (not annually). The standard rate is €180 (that's 9 shares), the social rate is €20 (that's 1 share). 2-8 shares cannot be chosen, you can choose more than 9 freely). You can find out more about this under [Frequently Asked Questions](https://www.mila.wien/uber-uns/haeufige-fragen/)."
  "t:mila_form_mtype_orga2": "As an organization, you are automatically an investing member. As an investing member, you support us financially, but you cannot make purchases. Further information can be found in the "
  "t:mila_form_mtype_natural2": "Only as an active member will you have the opportunity to shop after the supermarket opens. As an investing member, you support us financially, but you cannot make purchases. Further information can be found in the "

  "t:mila_form_shares_normal": "I hereby apply for membership in the cooperative MILA Mitmach-Supermarkt. I undertake to pay the standard rate of €180 once (this is made up of 9 shares of €20 each)."
  "t:mila_form_shares_social": "I hereby apply for membership in the cooperative MILA Mitmach-Supermarkt. I choose the social rate of €20. With this self-assessment, I declare that I need the social share in order to be able to afford cooperative membership in MILA (e.g. if I have a low income). The reasons and definition of “low income” or “low income” can be different; the at-risk-of-poverty threshold (60% of median income) in Austria can be used for general guidance."
  "t:mila_form_shares_more": "I hereby apply for membership in the cooperative MILA Mitmach-Supermarkt. I would like to invest in MILA Mitmach-Supermarkt G. with the number of shares selected above. I agree to make a one-off payment of €20 per share."
  "t:mila_form_payment": "You can pay for your shares either by SEPA direct debit or by direct bank transfer."
  "t:mila_form_survey": "Nearly done! Do you want to provide some aditional information?"
  "t:mila_form_check1": "I allow MILA to use images in which I can be seen. Further information on the data processing of the image material can be found at:"
  "t:mila_form_check2": "The statutes are available to me at and I fully accept the decisions of the general assembly."
  "t:mila_form_check3": "I agree that my personal data will be processed for membership purposes in accordance with GenG. Further information at:"
  "t:mila_form_final1": "In the event of insolvency and/or dissolution of the cooperative, the members of the cooperative are liable to their creditors with their shares and additionally with an amount equal to the amount of their shares (obligation to make additional contributions in the simple amount of the shares)."
  "t:mila_form_final2": "If you cancel your membership, your deposit will be refunded at the end of the following financial year, provided that MILA's financial situation allows it. More information in the [statutes](https://wolke.mila.wien/s/BRKPrbzjssqkzbz)"
  "t:mila_form_final3": "You have the right to cancel this contract within 14 days without giving reasons. The deadline is 14 days from the delivery of the acceptance of the membership by the board of the cooperative."
</i18n>
