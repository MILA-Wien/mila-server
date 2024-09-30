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
});
