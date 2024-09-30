<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

setCollectivoTitle("Profile");
const toast = useToast();
const { t } = useI18n();
const user = useCollectivoUser();

const is_legal_profile = [
  {
    key: "memberships_person_type",
    value: "legal",
  },
];

const is_natural_profile = [
  {
    key: "memberships_person_type",
    value: "natural",
  },
];

const profileInputs: Ref<CollectivoFormField[]> = ref([
  {
    type: "section",
    order: 100,
    title: "User account",
  },
  {
    label: "First name",
    key: "first_name",
    type: "text",
    order: 101,
    disabled: true,
  },
  {
    label: "Last name",
    key: "last_name",
    type: "text",
    order: 102,
    disabled: true,
  },
  {
    label: "Email",
    key: "email",
    type: "text",
    order: 103,
  },
  {
    label: "Password",
    key: "password",
    type: "password",
    order: 104,
  },
  {
    type: "section",
    order: 700,
    title: "Payment details",
  },
  {
    label: "Payment type",
    key: "payments_type",
    type: "select",
    required: true,
    order: 710,
    choices: [
      {
        value: "sepa",
        label: "SEPA Direct Debit",
      },
      {
        value: "transfer",
        label: "Transfer",
      },
    ],
  },
  {
    label: "Bank account IBAN",
    key: "payments_account_iban",
    type: "text",
    required: true,
    conditions: [
      {
        key: "payments_type",
        value: "sepa",
      },
    ],
    validators: [{ type: "iban" }],
    order: 720,
  },
  {
    label: "Bank account owner",
    key: "payments_account_owner",
    required: true,
    conditions: [
      {
        key: "payments_type",
        value: "sepa",
      },
    ],
    type: "text",
    order: 730,
  },
  {
    type: "section",
    order: 400,
    title: "Personal data",
    conditions: is_natural_profile,
  },
  {
    type: "select",
    key: "memberships_person_type",
    label: "Type of person",
    default: "natural",
    order: 420,
    disabled: true,
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
    type: "select",
    order: 430,
    key: "memberships_gender",
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
        label: "Open",
      },
      {
        value: "no-answer",
        label: "No answer",
      },
    ],
  },
  {
    type: "text",
    key: "memberships_phone",
    order: 440,
    label: "Phone",
    icon: "i-mi-call",
  },
  {
    label: "Occupation",
    key: "memberships_occupation",
    type: "text",
    order: 450,
    required: true,
    conditions: is_natural_profile,
    icon: "i-heroicons-briefcase",
  },
  {
    label: "Birthday",
    key: "memberships_birthday",
    type: "date",
    order: 460,
    width: "lg",
    required: true,
    conditions: is_natural_profile,
  },
  {
    type: "section",
    order: 500,
    title: "Address",
    conditions: is_natural_profile,
  },
  {
    type: "section",
    order: 501,
    title: "Organization address",
    conditions: is_legal_profile,
  },
  {
    label: "Street",
    key: "memberships_street",
    type: "text",
    order: 510,
    required: true,
  },
  {
    label: "Number",
    type: "text",
    key: "memberships_streetnumber",
    order: 511,
    width: "sm",
    required: true,
  },
  {
    label: "Stair",
    key: "memberships_stair",
    type: "text",
    order: 512,
    width: "sm",
  },
  {
    label: "Door",
    key: "memberships_door",
    type: "text",
    order: 513,
    width: "sm",
  },
  {
    label: "Postcode",
    key: "memberships_postcode",
    type: "text",
    order: 514,
    width: "sm",
    required: true,
  },
  {
    label: "City",
    key: "memberships_city",
    type: "text",
    order: 515,
    required: true,
  },
  {
    label: "Country",
    key: "memberships_country",
    type: "text",
    order: 516,
    required: true,
  },
]);

// Submit form data
async function saveProfile(data: CollectivoUser) {
  try {
    await user.value.save(data);

    toast.add({
      title: t("Profile updated"),
      icon: "i-heroicons-check-circle",
      timeout: 10000,
    });
  } catch (e) {
    console.error(e);

    toast.add({
      title: t("There was an error"),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 0,
    });
  }
}
</script>

<template>
  <div id="mila-profile">
    <CollectivoContainer color="blue">
      <div class="flex flex-col gap-2">
        <h2>Mitgliedschaft</h2>
        <div v-if="user.isMember && user.membership">
          <p>
            Du bist Mitglied
            <span v-if="user.membership.memberships_date_approved"
              >seit dem {{ user.membership.memberships_date_approved }}</span
            >
          </p>
          <p>
            Deine Mitgliedsnummer ist
            {{ user.membership.id }}
          </p>
          <p>
            Dein Mitgliedsart ist
            {{ user.membership.memberships_type }}
          </p>
        </div>
        <div v-else-if="user.membership?.memberships_status === 'applied'">
          <p>Dein Beitrittsantrag wird gerade bearbeitet.</p>
        </div>
        <div v-else>
          <p>Du bist noch kein Mitglied.</p>
          <UButton to="/mitglied-werden">Jetzt Mitglied werden</UButton>
        </div>
      </div>
    </CollectivoContainer>
    <CollectivoContainer>
      <CollectivoFormBuilder
        v-if="user.user"
        :data="user.user"
        :fields="profileInputs"
        :submit="saveProfile"
        submit-label="Save"
      />
    </CollectivoContainer>
  </div>
</template>
