<script setup lang="ts">
const { t } = useI18n();
const user = useCurrentUser();
setPageTitle("Membership Application");
const showForm = ref(false);
const alreadyMemberError = ref(false);
const data: any = ref({});

definePageMeta({
  layout: "forms",
});

async function prepare() {
  if (user.value.user) {
    data.value["directus_users__first_name"] = user.value.user!["first_name"];
    data.value["directus_users__last_name"] = user.value.user!["last_name"];

    data.value["directus_users__memberships_person_type"] =
      user.value.user!["memberships_person_type"];
  }
  if (user.value.membership) {
    alreadyMemberError.value = true;
  } else {
    showForm.value = true;
  }
}

prepare();

const is_legal = [
  {
    key: "directus_users__memberships_person_type",
    value: "legal",
  },
];

const is_natural = [
  {
    key: "directus_users__memberships_person_type",
    value: "natural",
  },
];

const is_sepa = [
  {
    key: "directus_users__payments_type",
    value: "sepa",
  },
];

const shares_normal = [
  {
    key: "shares_options",
    value: "normal",
  },
];

const shares_social = [
  {
    key: "shares_options",
    value: "social",
  },
];

const shares_more = [
  {
    key: "shares_options",
    value: "more",
  },
];

const is_investing = [
  {
    key: "memberships__memberships_type",
    value: "Investierend",
  },
];

const is_active = [
  {
    key: "memberships__memberships_type",
    value: "Aktiv",
  },
];

const is_not_authenticated = [
  {
    type: "notAuthenticated",
  },
];

const form: Ref<CollectivoForm> = ref({
  title: "MILA Membership Application",
  public: true,
  submitMode: "postNuxt",
  submitPath: "/api/membership_application",
  submitLabel: "Submit application",
  beforeSubmit: async (data: any) => {
    if (data.shares_options === "normal") {
      data.memberships__memberships_shares = 9;
    } else if (data.shares_options === "social") {
      data.memberships__memberships_shares = 1;
    }

    if (
      !data.memberships__memberships_shares ||
      data.memberships__memberships_shares <= 0
    ) {
      throw new Error("Incorrect number of shares.");
    }

    return data;
  },
  fields: [
    {
      type: "section",
      order: 10,
      title: "Welcome to MILA!",
      description: "t:mila_form_intro",
    },
    {
      type: "select",
      key: "directus_users__memberships_person_type",
      expand: true,
      label: "t:memberships_form_ptype",
      default: "natural",
      order: 110,
      required: true,
      choices: [
        {
          value: "natural",
          label: "an individual",
        },
        {
          value: "legal",
          label: "an organization",
        },
      ],
    },
    {
      type: "section",
      order: 200,
      title: "Create MILA user account",
      description: "t:mila_form_account",
      conditions: is_not_authenticated,
    },
    {
      key: "directus_users__email",
      label: "E-Mail",
      type: "email",
      order: 210,
      required: true,
      icon: "i-mi-mail",
      conditions: is_not_authenticated,
    },
    {
      label: "Password",
      key: "directus_users__password",
      type: "password",
      order: 220,
      required: true,
      icon: "i-mi-lock",
      conditions: is_not_authenticated,
    },
    {
      type: "section",
      title: "Organization",
      order: 300,
      conditions: is_legal,
    },
    {
      label: "Organization name",
      key: "directus_users__memberships_organization_name",
      type: "text",
      order: 310,
      required: true,
      conditions: is_legal,
    },
    {
      label: "Organization type",
      key: "directus_users__memberships_organization_type",
      type: "text",
      order: 320,
      required: true,
      conditions: is_legal,
    },
    {
      type: "clear",
      order: 325,
    },
    {
      label: "Organization ID",
      key: "directus_users__memberships_organization_id",
      description: "Firmenbuchnummer / Vereinsregisternummer",
      type: "text",
      order: 330,
      required: true,
      conditions: is_legal,
    },
    {
      type: "section",
      order: 400,
      title: "Personal data",
      conditions: is_natural,
    },
    {
      type: "section",
      order: 401,
      title: "Organization contact person",
      conditions: is_legal,
    },
    {
      type: "text",
      key: "directus_users__first_name",
      order: 410,
      required: true,
      label: "First name",
    },
    {
      type: "text",
      key: "directus_users__last_name",
      order: 420,
      required: true,
      label: "Last name",
    },
    {
      type: "select",
      order: 430,
      key: "directus_users__memberships_gender",
      label: "Gender",
      required: true,
      choices: [
        {
          value: "female",
          label: "Female",
        },
        {
          value: "male",
          label: "Male",
        },
        {
          value: "diverse",
          label: "Diverse",
        },
        {
          value: "inter",
          label: "Inter",
        },
        {
          value: "open",
          label: "Offen",
        },
        {
          value: "no-answer",
          label: "No answer",
        },
      ],
    },
    {
      type: "text",
      key: "directus_users__memberships_phone",
      order: 440,
      label: "Phone",
      icon: "i-mi-call",
    },
    {
      label: "Birthday",
      key: "directus_users__memberships_birthday",
      type: "date",
      width: "lg",
      order: 450,
      required: true,
      conditions: is_natural,
    },
    {
      label: "Occupation",
      key: "directus_users__memberships_occupation",
      type: "text",
      order: 460,
      required: true,
      conditions: is_natural,
      icon: "i-system-uicons-briefcase",
    },
    {
      type: "section",
      order: 500,
      title: "Address",
      conditions: is_natural,
    },
    {
      type: "section",
      order: 501,
      title: "Organization address",
      conditions: is_legal,
    },
    {
      label: "Street",
      key: "directus_users__memberships_street",
      type: "text",
      order: 510,
      required: true,
    },
    {
      label: "Number",
      type: "text",
      key: "directus_users__memberships_streetnumber",
      order: 511,
      width: "sm",
      required: true,
    },
    {
      label: "Stair",
      key: "directus_users__memberships_stair",
      type: "text",
      order: 512,
      width: "sm",
    },
    {
      label: "Door",
      key: "directus_users__memberships_door",
      type: "text",
      order: 513,
      width: "sm",
    },
    {
      label: "Postcode",
      key: "directus_users__memberships_postcode",
      type: "text",
      order: 514,
      width: "sm",
      required: true,
    },
    {
      label: "City",
      key: "directus_users__memberships_city",
      type: "text",
      order: 515,
      required: true,
    },
    {
      label: "Country",
      key: "directus_users__memberships_country",
      type: "text",
      order: 516,
      required: true,
    },
    {
      type: "section",
      order: 600,
      title: "Type of membership",
      description: "t:mila_form_mtype_orga",
      conditions: is_legal,
    },
    {
      type: "section",
      order: 600,
      title: "Type of membership",

      description: "t:mila_form_mtype_natural",
      conditions: is_natural,
    },
    {
      type: "select",
      key: "memberships__memberships_type",
      expand: true,
      label: "t:memberships_form_mtype",
      required: true,
      order: 610,
      conditions: is_natural,
      choices: [
        {
          value: "Aktiv",
          label: "Active",
        },
        {
          value: "Investierend",
          label: "Investing",
        },
      ],
    },
    {
      type: "select",
      key: "memberships__memberships_type",
      expand: true,
      label: "t:memberships_form_mtype",
      required: true,
      order: 610,
      conditions: is_legal,
      choices: [
        {
          value: "Investierend",
          label: "Investing",
        },
      ],
    },
    {
      type: "section",
      order: 619,
      title: "Cooperative shares",
      description: "t:mila_form_cshares_orga",
      conditions: is_legal,
    },
    {
      type: "section",
      order: 619,
      title: "Cooperative shares",

      description: "t:mila_form_cshares_natural",
      conditions: is_natural,
    },
    {
      type: "select",
      key: "shares_options",
      expand: true,
      label: "How many shares do you want?",
      required: true,
      order: 620,
      conditions: is_active,
      choices: [
        { label: "Standard (9 shares) 180€", value: "normal" },
        { label: "Social (1 share) 20 €", value: "social" },
        { label: "More (10 or more)", value: "more" },
      ],
    },
    {
      type: "select",
      key: "shares_options",
      expand: true,
      label: "How many shares do you want?",
      required: true,
      order: 620,
      conditions: is_investing,
      choices: [
        { label: "Standard (9 shares) 180€", value: "normal" },
        { label: "More (10 or more)", value: "more" },
      ],
    },
    {
      type: "number",
      key: "memberships__memberships_shares",
      label: "Number of shares (10 or more, 20€ per share)",
      required: true,
      order: 620,
      conditions: [
        {
          key: "shares_options",
          value: "more",
        },
      ],
      validators: [
        {
          type: "min",
          value: 10,
        },
      ],
    },
    {
      type: "description",
      order: 630,
      label: "Chosen shares",
      boxed: true,
      description: "t:mila_form_shares_normal",
      conditions: shares_normal,
    },
    {
      type: "description",
      order: 630,
      label: "Chosen shares",
      boxed: true,
      description: "t:mila_form_shares_social",
      conditions: shares_social,
    },
    {
      type: "description",
      order: 630,
      label: "Chosen shares",
      boxed: true,
      description: "t:mila_form_shares_more",
      conditions: shares_more,
    },
    {
      type: "section",
      order: 700,
      title: "Payment details",
      description: "t:mila_form_payment",
    },
    {
      label: "Payment type",
      key: "directus_users__payments_type",
      type: "select",
      order: 710,
      // width: "lg",
      required: true,
      choices: [
        {
          value: "sepa",
          label: "I approve SEPA direct debit",
        },
        {
          value: "transfer",
          label: "I transfer the amount myself",
        },
      ],
    },
    {
      label: "Bank account IBAN",
      key: "directus_users__payments_account_iban",
      type: "text",
      order: 720,
      conditions: is_sepa,
      validators: [{ type: "iban" }],
      required: true,
    },
    {
      label: "Bank account owner",
      key: "directus_users__payments_account_owner",
      type: "text",
      order: 730,
      conditions: is_sepa,
      required: true,
    },
    {
      type: "section",
      order: 800,
      title: "Survey",
      description: "t:mila_form_survey",
    },
    {
      label: "How did you hear about us?",
      key: "directus_users__mila_survey_contact",
      width: "md",
      type: "textarea",
      order: 810,
    },
    {
      label: "What convinced you to join MILA?",
      key: "directus_users__mila_survey_motivation",
      width: "md",
      type: "textarea",
      order: 820,
    },
    {
      type: "clear",
      order: 825,
    },
    {
      label: "Do you want to participate in a working group?",
      key: "directus_users__mila_groups_interested_2",
      width: "md",
      description:
        "You can find more information about the working groups here: https://www.mila.wien/mitmachen/arbeitsgruppen/",
      type: "select",
      multiple: true,
      order: 830,
      choices: [
        { label: "Sortiment", value: "Sortiment" },
        { label: "Öffentlichkeitsarbeit", value: "Öffentlichkeitsarbeit" },
        { label: "Minimarkt", value: "Minimarkt" },
        { label: "Finanzen", value: "Finanzen" },
        { label: "Genossenschaft", value: "Genossenschaft" },
        { label: "Standort", value: "Standort" },
        { label: "IT und Digitales", value: "ITundDigitales" },
        { label: "Diversität", value: "Diversität" },
        { label: "Events/Infogespräche", value: "EventsInfogespräche" },
        { label: "Mitgliedergewinnung", value: "Mitgliedergewinnung" },
        { label: "Mitgliederbüro", value: "Mitgliederbüro" },
      ],
    },
    {
      label: "What are your skills?",
      key: "directus_users__mila_skills_2",
      width: "md",
      type: "select",
      multiple: true,
      order: 840,
      choices: [
        { label: "Handwerk (Elektrik, Tischlerei, …)", value: "handwerk" },
        { label: "Einzelhandel", value: "handel" },
        {
          label: "Organisationsentwicklung",
          value: "geno",
        },
        { label: "Finanzen (BWL, Buchhaltung,…)", value: "finanzen" },
        { label: "Immobilien/Architektur/Planung/Bau", value: "immo" },
        {
          label: "Personalmanagement",
          value: "personal",
        },
      ],
    },
    {
      label: "What languages do you speak?",
      key: "directus_users__survey_languages",
      width: "md",
      type: "select",
      multiple: true,
      order: 840,
      choices: [
        { label: "German", value: "Deutsch" },
        { label: "English", value: "Englisch" },
        { label: "French", value: "Französisch" },
        { label: "Turkish", value: "Türkisch" },
        { label: "BKMS", value: "BKMS" },
        { label: "Ukrainian", value: "Ukrainisch" },
        { label: "Russian", value: "Russisch" },
        { label: "Arabic", value: "Arabisch" },
      ],
    },
    {
      label: "Additional languages",
      key: "directus_users__survey_languages_additional",
      width: "md",
      type: "text",
      order: 850,
    },
    {
      type: "section",
      title: "Conditions",
      order: 900,
    },
    {
      type: "checkbox",
      key: "_statutes_approval",
      label: "Statutes",
      content: "t:mila_form_check2",
      order: 920,
      width: "lg",
      required: true,
    },
    {
      type: "checkbox",
      key: "_data_approval",
      label: "Data use",
      content: "t:mila_form_check3",
      order: 930,
      width: "lg",
      required: true,
    },
    {
      type: "checkbox",
      key: "directus_users__mila_pr_approved",
      label: "PR Work",
      content: "t:mila_form_check1",
      order: 931,
      width: "lg",
    },
    {
      type: "description",
      order: 940,
      label: "Liability",
      description: "t:mila_form_final1",
    },
    {
      type: "description",
      order: 950,
      label: "Payout upon termination",
      description: "t:mila_form_final2",
    },
    {
      type: "description",
      order: 960,
      label: "Revocation",
      description: "t:mila_form_final3",
    },
  ],
});
</script>

<template>
  <div>
    <div v-if="alreadyMemberError">
      {{ t("t:memberships_form_already_member") }}
    </div>
    <CollectivoFormPage v-if="showForm" :form="form" :data="data">
      <template #success>
        <div class="flex flex-col items-center justify-center space-y-4">
          <UIcon
            name="i-heroicons-check-16-solid"
            class="w-[64px] h-[64px] text-primary"
          />
          <h1 class="text-2xl font-bold text-center">
            {{ t(form.successTitle ?? "Application submitted!") }}
          </h1>
          <div
            v-if="user.isAuthenticated"
            class="flex flex-col items-center justify-center space-y-4"
          >
            <NuxtLink to="/">
              <UButton size="md">{{ t("Home") }}</UButton>
            </NuxtLink>
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center space-y-4"
          >
            <p class="text-center">
              {{ t(form.successText ?? "t:memberships_form_success") }}
            </p>
            <UButton
              icon="i-heroicons-arrow-right-end-on-rectangle-16-solid"
              size="md"
              @click="user.login()"
              >{{ t("Login") }}</UButton
            >
          </div>
        </div>
      </template>
    </CollectivoFormPage>
  </div>
</template>
