<script setup lang="ts">
import {
  object,
  string,
  ref,
  number,
  type InferType,
  array,
  boolean,
  date,
} from "yup";
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";
const { t } = useI18n();

setPageTitle(t("Membership Application"));

definePageMeta({
  layout: "forms",
});

const linkStatutes = "https://wolke.mila.wien/s/BRKPrbzjssqkzbz";
const devMode = import.meta.dev;
const user = useCurrentUser();
const schema = object({
  directus_users__memberships_person_type: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__email: string()
    .email()
    .required("Dieses Feld ist erforderlich"),
  directus_users__password: string().required("Dieses Feld ist erforderlich"),
  _pw_confirm: string()
    .required("Dieses Feld ist erforderlich")
    .oneOf([ref("directus_users__password")], "Passwords must match"),
  directus_users__memberships_organization_name: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__memberships_organization_type: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__memberships_organization_id: string().when(
    "directus_users__memberships_person_type",
    {
      is: "legal",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__username: string().required("Dieses Feld ist erforderlich"),
  directus_users__pronouns: string(),
  directus_users__use_pronouns_on_card: boolean(),
  directus_users__hide_name: boolean(),
  directus_users__first_name: string().required("Dieses Feld ist erforderlich"),
  directus_users__last_name: string().required("Dieses Feld ist erforderlich"),
  directus_users__memberships_gender: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__memberships_phone: string(),
  directus_users__memberships_birthday: date().when(
    "directus_users__memberships_person_type",
    {
      is: "natural",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__memberships_occupation: string().when(
    "directus_users__memberships_person_type",
    {
      is: "natural",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__memberships_street: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__memberships_streetnumber: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__memberships_stair: string(),
  directus_users__memberships_door: string(),
  directus_users__memberships_postcode: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__memberships_city: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__memberships_country: string().required(
    "Dieses Feld ist erforderlich",
  ),
  memberships__memberships_type: string().required(
    "Dieses Feld ist erforderlich",
  ),
  shares_options: string().required("Dieses Feld ist erforderlich"),
  memberships__memberships_shares: number()
    .integer()
    .when("shares_options", {
      is: "more",
      then: (schema) =>
        schema
          .required("Dieses Feld ist erforderlich")
          .min(10, "Must be at least 10"),
    }),
  directus_users__payments_type: string().required(
    "Dieses Feld ist erforderlich",
  ),
  directus_users__payments_account_iban: string().when(
    "directus_users__payments_type",
    {
      is: "sepa",
      then: (schema) =>
        schema
          .required("Dieses Feld ist erforderlich")
          .test("iban", "IBAN nicht gültig", (value, context) => {
            return validateIban(value, context, state);
          }),
    },
  ),
  directus_users__payments_account_owner: string().when(
    "directus_users__payments_type",
    {
      is: "sepa",
      then: (schema) => schema.required("Dieses Feld ist erforderlich"),
    },
  ),
  directus_users__mila_survey_contact: string(),
  directus_users__mila_survey_motivation: string(),
  directus_users__mila_groups_interested_2: array(string()),
  directus_users__mila_skills_2: array(string()),
  directus_users__survey_languages: array(string()),
  directus_users__survey_languages_additional: string(),
  _statutes_approval: boolean()
    .required("Dieses Feld muss akzeptiert werden")
    .oneOf([true], "Dieses Feld muss akzeptiert werden"),
  _data_approval: boolean()
    .required("Dieses Feld muss akzeptiert werden")
    .oneOf([true], "Dieses Feld muss akzeptiert werden"),
  directus_users__mila_pr_approved: boolean(),
});

type Schema = InferType<typeof schema>;

const state: any = reactive({
  directus_users__memberships_person_type: "natural",
  directus_users__email: undefined,
  directus_users__password: undefined,
  _pw_confirm: undefined,
  directus_users__memberships_organization_name: undefined,
  directus_users__memberships_organization_type: undefined,
  directus_users__memberships_organization_id: undefined,
  directus_users__username: undefined,
  directus_users__pronouns: undefined,
  directus_users__use_pronouns_on_card: false,
  directus_users__hide_name: false,
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
  memberships__memberships_type: "Aktiv",
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

watch(
  () => state.memberships__memberships_type,
  () => {
    state.shares_options = undefined;
    state.memberships__memberships_shares = undefined;
  },
);

function fillTestData() {
  state.directus_users__memberships_person_type = "natural";
  state.directus_users__username = "Max Mustermann";
  state.directus_users__email =
    new Date().toISOString().replace(/[-:.]/g, "_") + "@example.com";
  state.directus_users__password = "test";
  state._pw_confirm = "test";
  state.directus_users__first_name = "Max";
  state.directus_users__last_name = "Mustermann";
  state.directus_users__memberships_gender = "male";
  state.directus_users__memberships_birthday = new Date();
  state.directus_users__memberships_occupation = "Software Engineer";
  state.directus_users__memberships_street = "Musterstraße";
  state.directus_users__memberships_streetnumber = "1";
  state.directus_users__memberships_postcode = "1010";
  state.directus_users__memberships_city = "Wien";
  state.directus_users__memberships_country = "Österreich";
  state.memberships__memberships_type = "Aktiv";
  state.shares_options = "normal";
  state.directus_users__payments_type = "transfer";
  state._statutes_approval = true;
  state._data_approval = true;
}

const isNatural = computed(
  () => state.directus_users__memberships_person_type === "natural",
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const res = await useFetch("/api/register", {
    method: "POST",
    body: JSON.stringify(event.data),
  });

  if (res.status.value === "error") {
    if (
      res.error.value?.message &&
      res.error.value?.message.includes("EMAIL_ALREADY_EXISTS")
    ) {
      toast.add({
        title: t("This email address is already registered"),
        description: event.data.directus_users__email,
        icon: "i-heroicons-exclamation-circle",
        color: "error",
      });
      return;
    }
    toast.add({
      title: t("There was an error"),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    });
  } else {
    navigateTo("/register/success");
  }
}

const toast = useToast();

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
</script>

<template>
  <div
    v-if="user.user && user.isAuthenticated"
    class="space-y-2 p-6 border-2 rounded-sm shadow-sm"
  >
    <p>{{ t("You are currently logged in as") }} {{ user.user?.username }}.</p>
    <p>
      {{
        t(
          "Log out to fill out a new membership application for a different person.",
        )
      }}
    </p>
    <UButton href="/logout">{{ t("Log out") }}</UButton>
  </div>
  <UForm
    v-else
    :schema="schema"
    :state="state"
    class="space-y-6"
    @submit="onSubmit"
    @error="onError"
  >
    <div class="">
      <h2>{{ t("Welcome to MILA!") }}</h2>

      <p>
        {{ t("t:mila_form_intro") }}
        <a class="font-bold" href="mailto:mitglied@mila.wien"
          >mitglied@mila.wien</a
        >.
      </p>
    </div>

    <FormsFormGroup
      :label="t('t:memberships_form_ptype')"
      name="directus_users__memberships_person_type"
      required
    >
      <URadioGroup
        variant="card"
        v-model="state.directus_users__memberships_person_type"
        :items="[
          { label: 'natural', value: 'natural' },
          { label: 'legal', value: 'legal' },
        ]"
      >
        <template #label="{ item }">
          {{ t("l:" + item.label) }}
        </template>
      </URadioGroup>
    </FormsFormGroup>

    <div class="pt-6">
      <h2>{{ t("User Account") }}</h2>
      <p>
        {{ t("t:mila_form_account") }}
      </p>
    </div>

    <div class="grid gap-4">
      <FormsFormGroup
        :label="t('E-Mail Address')"
        name="directus_users__email"
        required
      >
        <UInput variant="outline" v-model="state.directus_users__email" />
      </FormsFormGroup>

      <div class="grid md:grid-cols-2 gap-4">
        <FormsFormGroup
          :label="t('Password')"
          name="directus_users__password"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__password"
            type="password"
          />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Repeat password')"
          name="_pw_confirm"
          required
        >
          <UInput
            variant="outline"
            v-model="state._pw_confirm"
            type="password"
          />
        </FormsFormGroup>
      </div>
    </div>

    <template v-if="!isNatural">
      <div class="pt-6">
        <h2>{{ t("Organization") }}</h2>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <FormsFormGroup
          :label="t('Organization name')"
          name="directus_users__memberships_organization_name"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__memberships_organization_name"
          />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Organization type')"
          name="directus_users__memberships_organization_type"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__memberships_organization_type"
          />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Organization ID')"
          name="directus_users__memberships_organization_id"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__memberships_organization_id"
          />
        </FormsFormGroup>
      </div>
    </template>

    <div class="pt-6" v-if="isNatural">
      <h2>
        {{ t("Sichtbarer Name") }}
      </h2>

      <div>
        {{
          t(
            "Dieser Name wird im Schichtplan und auf deiner Mitgliederkarte angezeigt. Er kann sich von deinem rechtlichen Namen unterscheiden.",
          )
        }}
      </div>
    </div>

    <div class="grid gap-4" v-if="isNatural">
      <FormsFormGroup
        :label="t('Wie sollen wir dich ansprechen?')"
        name="directus_users__username"
        required
      >
        <template #description> </template>
        <UInput variant="outline" v-model="state.directus_users__username" />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('Mit welchen Pronomen möchtest du angesprochen werden?')"
        :infotext="t('i_pronouns')"
        name="directus_users__pronouns"
      >
        <UInput variant="outline" v-model="state.directus_users__pronouns" />
      </FormsFormGroup>

      <FormsFormGroup
        name="directus_users__use_pronouns_on_card"
        :label="t('Pronomen auf Mitgliederkarte')"
        v-if="state.directus_users__pronouns"
      >
        <UCheckbox
          variant="card"
          v-model="state.directus_users__use_pronouns_on_card"
        >
          <template #label>
            {{
              t(
                "Ich möchte, dass meine Pronomen auf meine Mitgliederkarte gedruckt werden.",
              )
            }}
          </template>
        </UCheckbox>
      </FormsFormGroup>

      <FormsFormGroup
        name="directus_users__hide_name"
        :label="t('Anonym bleiben')"
      >
        <UCheckbox variant="card" v-model="state.directus_users__hide_name">
          <template #label>
            {{
              t(
                "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.",
              )
            }}
          </template>
        </UCheckbox>
      </FormsFormGroup>
    </div>

    <div class="pt-6">
      <h2 v-if="isNatural" class="mb-0 pb-0">
        {{ t("Personal data") }}
      </h2>
      <h2 v-else class="mb-0">
        {{ t("Organization contact person") }}
      </h2>

      <div v-if="isNatural" class="mb-4">
        {{
          t(
            "Diese Daten brauchen wir rechtlich für das Mitgliederregister der Genossenschaft. Bitte gib hier deinen amtlichen Namen an. Diese Daten sind nur für das Mitgliederbüro einsehbar.",
          )
        }}
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <FormsFormGroup
          :label="t('First name')"
          name="directus_users__first_name"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__first_name"
          />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Last name')"
          name="directus_users__last_name"
          required
        >
          <UInput variant="outline" v-model="state.directus_users__last_name" />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Gender')"
          name="directus_users__memberships_gender"
          required
        >
          <USelectMenu
            v-model="state.directus_users__memberships_gender"
            :search-input="false"
            :items="['female', 'male', 'diverse', 'inter', 'open', 'no-answer']"
          >
            <template #default>{{
              t("l:" + (state.directus_users__memberships_gender ?? "choose"))
            }}</template>
            <template #item-label="{ item }">{{ t("l:" + item) }}</template>
          </USelectMenu>
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Phone')"
          name="directus_users__memberships_phone"
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__memberships_phone"
          />
        </FormsFormGroup>
      </div>

      <div v-if="isNatural" class="mt-4 grid gap-4">
        <FormsFormGroup
          :label="t('Birthday')"
          name="directus_users__memberships_birthday"
          required
        >
          <FormsDate v-model="state.directus_users__memberships_birthday" />
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('Occupation')"
          name="directus_users__memberships_occupation"
          required
        >
          <UInput
            variant="outline"
            v-model="state.directus_users__memberships_occupation"
          />
        </FormsFormGroup>
      </div>
    </div>
    <div class="pt-6">
      <h2>{{ t("Address") }}</h2>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <FormsFormGroup
        :label="t('Street')"
        name="directus_users__memberships_street"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_street"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('Number')"
        name="directus_users__memberships_streetnumber"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_streetnumber"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('Stair')"
        name="directus_users__memberships_stair"
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_stair"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('Door')"
        name="directus_users__memberships_door"
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_door"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('Postcode')"
        name="directus_users__memberships_postcode"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_postcode"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('City')"
        name="directus_users__memberships_city"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_city"
        />
      </FormsFormGroup>
      <FormsFormGroup
        :label="t('Country')"
        name="directus_users__memberships_country"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__memberships_country"
        />
      </FormsFormGroup>
    </div>

    <div class="pt-6">
      <h2>{{ t("Type of membership") }}</h2>
      <p v-if="isNatural">
        {{ t("t:mila_form_mtype_natural") }}
        <br /><br />
        Mehr Informationen zu den Mitmachschichten findest du
        <a
          class="font-bold"
          href="https://www.mila.wien/mitmachen/mitmach-schicht/"
          >hier</a
        >. Eine Befreiungen von Mitmach-Schichten sind unter bestimmten
        Voraussetzungen (über 70 Jahre, Krankheit, Behinderung, Mutterschutz
        etc.) möglich. Bitte nach erfolgtem Beitritt bei mitglied@mila.wien
        melden.
      </p>
      <p v-else>
        {{ t("t:mila_form_mtype_orga") }}
      </p>
    </div>

    <FormsFormGroup
      :label="t('t:memberships_form_mtype')"
      name="memberships__memberships_type"
      required
    >
      <URadioGroup
        v-model="state.memberships__memberships_type"
        variant="card"
        :items="
          isNatural
            ? [
                { label: 'Aktiv', value: 'Aktiv' },
                { label: 'Investierend', value: 'Investierend' },
              ]
            : [{ label: 'Investierend', value: 'Investierend' }]
        "
      >
        <template #label="{ item }">{{ t("l:" + item.label) }}</template>
      </URadioGroup>
    </FormsFormGroup>

    <div class="pt-6">
      <h2>{{ t("Cooperative shares") }}</h2>
      <p>
        {{
          isNatural
            ? t("t:mila_form_cshares_natural")
            : t("t:mila_form_cshares_orga")
        }}
        <a
          class="font-bold"
          target="_blank"
          href="https://www.mila.wien/uber-uns/haeufige-fragen/"
          >{{ t("Frequently Asked Questions") }}</a
        >.
      </p>
    </div>

    <FormsFormGroup
      :label="t('How many shares do you want?')"
      name="shares_options"
      required
    >
      <URadioGroup
        v-model="state.shares_options"
        variant="card"
        :items="
          isNatural && state.memberships__memberships_type === 'Aktiv'
            ? [
                { label: 'social', value: 'social' },
                { label: 'normal', value: 'normal' },
                { label: 'more', value: 'more' },
              ]
            : [
                { label: 'normal', value: 'normal' },
                { label: 'more', value: 'more' },
              ]
        "
      >
        <template #label="{ item }">{{ t("l:" + item.label) }}</template>
      </URadioGroup>
    </FormsFormGroup>

    <FormsFormGroup
      v-if="state.shares_options === 'more'"
      :label="t('Number of shares (10 or more, 20€ per share)')"
      name="memberships__memberships_shares"
      required
    >
      <UInput
        variant="outline"
        v-model="state.memberships__memberships_shares"
        type="number"
      />
    </FormsFormGroup>

    <div v-if="state.shares_options">
      <div class="pb-1 font-bold">{{ t("Chosen shares") }}</div>
      <div class="border border-black p-4">
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

    <FormsFormGroup
      :label="t('Payment type')"
      name="directus_users__payments_type"
      required
    >
      <USelectMenu
        v-model="state.directus_users__payments_type"
        :items="['sepa', 'transfer']"
        :search-input="false"
      >
        <template #default>{{
          t("l:" + (state.directus_users__payments_type ?? "choose"))
        }}</template>
        <template #item="{ item }">{{ t("l:" + item) }}</template>
      </USelectMenu>
    </FormsFormGroup>

    <div
      v-if="state.directus_users__payments_type === 'sepa'"
      class="grid md:grid-cols-2 gap-4"
    >
      <FormsFormGroup
        :label="t('Bank account IBAN')"
        name="directus_users__payments_account_iban"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__payments_account_iban"
        />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('Bank account owner')"
        name="directus_users__payments_account_owner"
        required
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__payments_account_owner"
        />
      </FormsFormGroup>
    </div>

    <div class="pt-6">
      <h2>{{ t("Survey") }}</h2>
      <p>
        {{ t("t:mila_form_survey") }}
      </p>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <FormsFormGroup
        :label="t('How did you hear about us?')"
        name="directus_users__mila_survey_contact"
      >
        <UTextarea v-model="state.directus_users__mila_survey_contact" />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('What convinced you to join MILA?')"
        name="directus_users__mila_survey_motivation"
      >
        <UTextarea v-model="state.directus_users__mila_survey_motivation" />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('Do you want to participate in a working group?')"
        name="directus_users__mila_groups_interested_2"
      >
        <!-- <div class="text-sm mb-2">
          {{ t("You can find more information about the working groups") }}
          <a
            href="https://handbuch.mila.wien/books/mitglieder-handbuch/page/arbeitsgruppen"
            target="_blank"
            class="font-bold"
            >{{ t("here") }}</a
          >.
        </div> -->
        <FormsCheckboxGroup
          v-model="state.directus_users__mila_groups_interested_2"
          :choices="[
            { label: 'Sortiment', value: 'Sortiment' },
            { label: 'Öffentlichkeitsarbeit', value: 'Öffentlichkeitsarbeit' },
            { label: 'Finanzen', value: 'Finanzen' },
            { label: 'Genossenschaft', value: 'Genossenschaft' },
            { label: 'Standort', value: 'Standort' },
            { label: 'IT und Digitales', value: 'ITundDigitales' },
            { label: 'Diversität', value: 'Diversität' },
            { label: 'Events/Infogespräche', value: 'EventsInfogespräche' },
            { label: 'Mitgliederbüro', value: 'Mitgliederbüro' },
          ]"
        />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('What are your skills?')"
        name="directus_users__mila_skills_2"
      >
        <FormsCheckboxGroup
          v-model="state.directus_users__mila_skills_2"
          :choices="[
            { label: 'Handwerk (Elektrik, Tischlerei, …)', value: 'handwerk' },
            { label: 'Einzelhandel', value: 'handel' },
            {
              label: 'Organisationsentwicklung',
              value: 'geno',
            },
            { label: 'Finanzen (BWL, Buchhaltung,…)', value: 'finanzen' },
            { label: 'Immobilien/Architektur/Planung/Bau', value: 'immo' },
            {
              label: 'Personalmanagement',
              value: 'personal',
            },
          ]"
        />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('What languages do you speak?')"
        name="directus_users__survey_languages"
      >
        <FormsCheckboxGroup
          v-model="state.directus_users__survey_languages"
          :choices="[
            { label: 'German', value: 'Deutsch' },
            { label: 'English', value: 'Englisch' },
            { label: 'French', value: 'Französisch' },
            { label: 'Turkish', value: 'Türkisch' },
            { label: 'BKMS', value: 'BKMS' },
            { label: 'Ukrainian', value: 'Ukrainisch' },
            { label: 'Russian', value: 'Russisch' },
            { label: 'Arabic', value: 'Arabisch' },
          ]"
        />
      </FormsFormGroup>

      <FormsFormGroup
        :label="t('Additional languages')"
        name="directus_users__survey_languages_additional"
      >
        <UInput
          variant="outline"
          v-model="state.directus_users__survey_languages_additional"
        />
      </FormsFormGroup>
    </div>

    <div>
      <div class="pt-6">
        <h2>{{ t("Conditions") }}</h2>
      </div>

      <div class="grid gap-4">
        <FormsFormGroup
          :label="t('Statutes')"
          name="_statutes_approval"
          required
        >
          <UCheckbox
            v-model="state._statutes_approval"
            class="mt-0.5 mr-2"
            variant="card"
          >
            <template #label>
              <span class="">
                {{ t("t:mila_form_check2") }}
                <a :href="linkStatutes" class="font-bold" target="_blank">{{
                  t("Statutes")
                }}</a></span
              ></template
            ></UCheckbox
          >
        </FormsFormGroup>

        <FormsFormGroup :label="t('Data use')" name="_data_approval" required>
          <UCheckbox
            variant="card"
            v-model="state._data_approval"
            class="mt-0.5 mr-2"
          >
            <template #label>
              <span class="">
                {{ t("t:mila_form_check3") }}
                <a
                  href="https://www.mila.wien/datenschutz/"
                  target="_blank"
                  class="font-bold"
                  >{{ t("Privacy Policy") }}</a
                >.
              </span>
            </template>
          </UCheckbox>
        </FormsFormGroup>

        <FormsFormGroup
          :label="t('PR Work')"
          name="directus_users__mila_pr_approved"
        >
          <UCheckbox
            v-model="state.directus_users__mila_pr_approved"
            class="mt-0.5 mr-2"
            variant="card"
          >
            <template #label>
              <span class="">
                {{ t("t:mila_form_check1") }}
                <a
                  href="https://www.mila.wien/datenschutz/"
                  target="_blank"
                  class="font-bold"
                  >{{ t("Privacy Policy") }}</a
                >.
              </span>
            </template>
          </UCheckbox>
        </FormsFormGroup>

        <div>
          <div class="font-bold mb-1">{{ t("Liability") }}</div>
          <p class="">{{ t("t:mila_form_final1") }}</p>
        </div>

        <div>
          <div class="font-bold mb-1">
            {{ t("Payout upon termination") }}
          </div>
          <p class="">
            {{ t("t:mila_form_final2") }}
            <a :href="linkStatutes" target="_blank" class="font-bold">{{
              t("Rules of Procedure")
            }}</a
            >.
          </p>
        </div>

        <div>
          <div class="font-bold mb-1">{{ t("Revocation") }}</div>
          <p class="">{{ t("t:mila_form_final3") }}</p>
        </div>
      </div>
    </div>
    <div class="py-6">
      <UButton type="submit" color="green" size="lg" block>
        {{ t("Submit application") }}
      </UButton>
    </div>
    <div v-if="devMode" class="text-gray-500">
      <UButton @click="fillTestData">{{ t("Fill test data") }}</UButton>
      <pre>{{ JSON.stringify(state, null, 2) }}</pre>
    </div>
  </UForm>
</template>

<i18n lang="yaml">
de:
  "User Account": "Zugangsdaten"
  "E-Mail Address": "E-Mail Adresse"
  "Some fields are not filled in correctly": "Einige Felder sind nicht korrekt ausgefüllt"
  "You are currently logged in as": "Du bist aktuell angemeldet als"
  "Log out to fill out a new membership application for a different person.": "Melde dich ab, um eine neue Beitrittserklärung für eine andere Person auszufüllen."
  "Log out": "Abmelden"
  "This email address is already registered": "Diese E-Mail Adresse ist bereits registriert"

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
  "You can find more information about the working groups": "Mehr informationen über die Arbeitsgruppen findest du"
  "here": "hier"
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
  "Rules of Procedure": "Geschäftsordnung"
  "Privacy Policy": "Datenschutzerklärung"
  "Bank account IBAN": "IBAN des Bankkontos"
  "Bank account owner": "Kontoinhaber:in"

  "Organization": "Organisation"
  "Organization name": "Name der Organisation"
  "Organization type": "Art der Organisation"
  "Organization ID": "Firmenbuchnummer / Vereinsregisternummer"
  "Organization contact person": "Ansprechpartner:in der Organisation"
  "Personal data": "Persönliche Daten"

  "l:natural": "Einzelperson"
  "l:legal": "Organisation"
  "l:Aktiv": "Aktives Mitglied"
  "l:Investierend": "Investierendes Mitglied"
  "l:social": "Sozialtarif (1 Anteil) 20€"
  "l:normal": "Regeltarif (9 Anteile) 180€"
  "l:more": "Mehr (10 oder mehr, 20€ pro Anteil)"
  "l:sepa": "Ich erlaube SEPA Bankeinzug"
  "l:transfer": "Ich überweise den Betrag selbst"
  "l:choose": "Bitte auswählen"
  "l:female": "Weiblich"
  "l:male": "Männlich"
  "l:diverse": "Divers"
  "l:inter": "Inter"
  "l:open": "Offen"
  "l:no-answer": "Keine Angabe"

  "t:memberships_form_ptype": "Ich stelle diesen Antrag als:"
  "t:memberships_form_mtype": "Welche Art der Mitgliedschaft wählst du?"
  "t:memberships_form_intro": "Bitte fülle das Formular aus, um Mitglied zu werden."

  "t:mila_form_intro": "Um unserer Genossenschaft beitreten zu können, brauchen wir noch einige Informationen von dir. Bitte fülle die folgenden Fragen aus. Wenn etwas unklar ist, wende dich bitte an"
  "t:mila_form_account": "Bitte lege hier eine E-Mail Adresse und Passwort für deinen MILA Zugang fest."
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
  "t:mila_form_check2": "Ich kann die Satzung unter folgendem Link einsehen und ich erkenne die Bestimmungen und Beschlüsse der Generalversammlung in vollem Umfang an:"
  "t:mila_form_check3": "Ich erkläre mich ausdrücklich einverstanden, dass meine personenbezogenen Daten für Zwecke der Mitgliedschaft gem. GenG verarbeitet werden. Weitere Infos in der"
  "t:mila_form_final1": "Im Fall der Insolvenz und/oder Auflösung der Genossenschaft haften die Mitglieder der Genossenschaft deren Gläubigern mit ihren Geschäftsanteilen und zusätzlich mit einem Betrag in der Höhe ihrer Geschäftsanteile (Nachschusspflicht in der einfachen Höhe der Geschäftsanteile)."
  "t:mila_form_final2": "Bei Kündigung wird dein eingezahlter Betrag am Ende des folgenden Geschäftsjahres zurückgezahlt, sofern es die wirtschaftliche Lage von MILA es zulässt. Mehr Infos in der"
  "t:mila_form_final3": "Du hast das Recht binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Frist beträgt 14 Tage ab der Zustellung der Annahme der Zeichnung durch den Vorstand der Genossenschaft."

  "i_pronouns": "Die Angabe der Pronomen ist freiwillig. Sie soll uns helfen bei Mila einen respektvollen Umgang miteinander zu pflegen, indem wir so mit- und übereinander sprechen, wie die angesprochenen Personen es wünschen."

en:
  "Wie sollen wir dich ansprechen?": "How should we address you?"
  "Dieser Name kann sich von deinem amtlichen Namen unterscheiden.": "This name can differ from your legal name."
  "Mit welchen Pronomen möchtest du angesprochen werden?": "Which pronouns would you like to be addressed with?"
  "Ich möchte, dass meine Pronomen auf meine Mitgliederkarte gedruckt werden.": "I would like my pronouns to be printed on my membership card."
  "Anonym bleiben": "Stay anonymous"
  "Verberge meinen Namen vor anderen Mitgliedern auf der Plattform.": "Do not show my name to other members on the platform."
  "E-Mail-Benachrichtigungen": "Email notifications"
  "Erhalte E-Mail-Benachrichtigungen über bevorstehende Schichten.": "Receive email notifications about upcoming shifts."
  "Sichtbarer Name": "Visible name"
  "Dieser Name wird im Schichtplan und auf deiner Mitgliederkarte angezeigt. Er kann sich von deinem rechtlichen Namen unterscheiden.": "This name will be displayed in the shift schedule and on your membership card. It can differ from your legal name."
  "Diese Daten brauchen wir rechtlich für das Mitgliederregister der Genossenschaft. Bitte gib hier deinen amtlichen Namen an. Diese Daten sind nur für das Mitgliederbüro einsehbar.": "We need this data legally for the cooperative's membership register. Please provide your legal name here. This data can only be viewed by the membership office."
  "i_pronouns": "A declaration of pronouns is optional. They help us at MILA in creating an inclusive environment, by speaking to and about each other in a way, that respects everyones wishes."

  "l:natural": "Individual"
  "l:legal": "Organisation"
  "l:Aktiv": "Active member"
  "l:Investierend": "Investing member"
  "l:social": "Social rate (1 share) 20€"
  "l:normal": "Standard rate (9 shares) 180€"
  "l:more": "More (10 or more, 20€ per share)"
  "l:sepa": "I approve SEPA direct debit"
  "l:transfer": "I transfer the amount myself"
  "l:choose": "Please choose"
  "l:male": "Male"
  "l:female": "Female"
  "l:diverse": "Diverse"
  "l:inter": "Inter"
  "l:open": "Open"
  "l:no-answer": "No answer"

  "t:memberships_form_ptype": "I am applying for a membership as:"
  "t:memberships_form_mtype": "Which type of membership do you choose?"
  "t:memberships_form_intro": "Please fill out this form to apply for a membership."
  "t:memberships_form_success": "Please log in in order to verify your E-Mail address."
  "t:memberships_form_already_member": "Your membership application has been submitted. Thank you for your application!"

  "t:mila_form_intro": "In order to join our cooperative, we need some information from you. Please complete the following questions. If something is unclear, please contact "
  "t:mila_form_account": "Please enter an E-Mail address and password for your MILA user account here."
  "t:mila_form_mtype_orga": "As an organization, you are automatically an investing member. As an investing member, you support us financially, but you cannot buy anything."
  "t:mila_form_cshares_orga": "You pay your cooperative share only once (not annually). The standard rate is € 180 (that's 9 shares). You can choose more than 9. You can find out more under"
  "t:mila_form_mtype_natural": "As an active member, you work in the supermarket and can shop. As an investing member, you support us financially, but cannot shop. You can also switch between active and investing later."
  "t:mila_form_cshares_natural": "You pay your cooperative share once in your life (not annually). The standard rate is €180 (that's 9 shares), the social rate is €20 (that's 1 share). 2-8 shares cannot be chosen, you can choose more than 9 freely). You can find out more about this under "
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
  "t:mila_form_final2": "If you cancel your membership, your deposit will be refunded at the end of the following financial year, provided that MILA's financial situation allows it. More information in the "
  "t:mila_form_final3": "You have the right to cancel this contract within 14 days without giving reasons. The deadline is 14 days from the delivery of the acceptance of the membership by the board of the cooperative."
</i18n>
