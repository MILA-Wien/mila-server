import { electronicFormatIBAN, isValidIBAN } from "ibantools";
import { boolean } from "yup";

const europeanIBAN = [
  "AD",
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

export default defineNuxtPlugin(() => {
  const menu = useCollectivoMenus();
  const user = useCollectivoUser().value;
  const runtimeConfig = useRuntimeConfig();

  const items: CollectivoMenuItem[] = [
    {
      label: "Home",
      icon: "i-heroicons-home",
      to: "/",
      order: 0,
    },
    {
      label: "Handbook",
      icon: "i-heroicons-book-open",
      to: "https://handbuch.mila.wien/books/mitglieder-handbuch",
      external: true,
      order: 1,
    },
    {
      label: "Shifts",
      icon: "i-heroicons-calendar-days-solid",
      to: "/shifts/dashboard",
      order: 2,
      filter: async () => {
        return Boolean(
          user.membership && user.membership.shifts_user_type != "inactive",
        );
      },
    },
  ];

  const publicItems: CollectivoMenuItem[] = [
    {
      label: "Register",
      icon: "i-heroicons-document-text",
      to: "/memberships/register",
      order: 200,
      filter: (_item) => {
        return true;
      },
    },
  ];

  const profilePublicItems: CollectivoMenuItem[] = [
    {
      label: "Login",
      icon: "i-heroicons-arrow-right-on-rectangle-solid",
      click: user.login,
      order: 100,
      filter: (_item) => {
        return true;
      },
    },
  ];

  const profileItems: CollectivoMenuItem[] = [
    {
      label: "Profile",
      icon: "i-heroicons-user-circle",
      to: "/profile/",
      order: 1,
    },
    {
      label: "Membership",
      to: "/memberships/membership",
      icon: "i-heroicons-identification",
      order: 20,
    },
    {
      label: "Admin Bereich",
      icon: "i-heroicons-chart-bar-square",
      to: runtimeConfig.public.directusUrl,
      external: true,
      order: 99,
    },
    {
      label: "Logout",
      icon: "i-heroicons-arrow-left-on-rectangle-solid",
      click: user.logout,
      order: 1000,
    },
  ];

  menu.value.main.push(...items);
  menu.value.profile.push(...profileItems);
  menu.value.profile_public.push(...profilePublicItems);

  const validators = useCollectivoValidators();

  validators.value.tests.payments_iban_sepa = {
    message: "IBAN not valid for SEPA",
    test: (value: string, context: any, state: { [key: string]: any }) => {
      const iban = electronicFormatIBAN(value);
      state[context.path] = iban;

      if (iban && europeanIBAN.includes(iban.substring(0, 2))) {
        return isValidIBAN(iban || "");
      }

      return false;
    },
  };

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

  const profileInputs: CollectivoFormField[] = [
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
      validators: [{ type: "test", value: "payments_iban_sepa" }],
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
  ];

  user.fields.push(...profileInputs);
});
