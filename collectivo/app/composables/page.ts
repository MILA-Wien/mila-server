export const usePageTitle = () => useState<string>("pageTitle", () => "");

export interface NavigationMenus {
  main: CollectivoMenuItem[];
  main_public: CollectivoMenuItem[];
  profile: CollectivoMenuItem[];
  profile_public: CollectivoMenuItem[];
}

export interface CollectivoMenuItem {
  label: string;
  icon?: string;
  to?: string;
  click?: () => void;
  external?: boolean; // Defaults to false
  target?: string; // Default "_self"
  hideOnMobile?: boolean; // Default false
  filter?: (item: CollectivoMenuItem) => Promise<boolean> | boolean;
}

export const usePageBackLink = () =>
  useState<string | undefined>("pageBackLink", () => "");

export const usePageBackLinkLabel = () =>
  useState<string>("pageBackLinkLabel", () => "");

interface TitleOptions {
  backLink?: string;
  backLinkLabel?: string;
}

export const setPageTitle = (title: string, options?: TitleOptions) => {
  usePageTitle().value = title;
  usePageBackLink().value = options?.backLink;
  usePageBackLinkLabel().value = options?.backLinkLabel || "Back";
  useHead({
    title: title + " - MILA",
  });
};

export const useNavigationMenus = () =>
  useState<NavigationMenus>("navigationMenus", () => {
    const user = useCurrentUser().value;
    return {
      main: [
        {
          label: "Home",
          icon: "i-heroicons-home",
          to: "/",
        },
        {
          label: "Shifts",
          icon: "i-heroicons-calendar-days-solid",
          to: "/shifts/dashboard",
          filter: async () => {
            return Boolean(
              user.membership && user.membership.shifts_user_type != "inactive",
            );
          },
        },
        {
          label: "Receipts",
          icon: "i-heroicons-document-text",
          to: "/belege",
        },
        {
          label: "Assortment",
          icon: "i-heroicons-shopping-bag",
          to: "/sortiment",
        },

        {
          label: "Help",
          icon: "i-heroicons-question-mark-circle",
          to: "/help",
        },
      ],
      main_public: [],
      profile: [],
      profile_public: [],
    };
  });
