export const usePageTitle = () => useState<string>("pageTitle", () => "");

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
          label: "Participate",
          icon: "i-heroicons-hand-raised",
          to: "/participate",
          filter: async () => {
            return Boolean(user.membership);
          },
        },
        {
          label: "Membership",
          icon: "i-heroicons-user-circle",
          to: "/profile",
          hideOnMobile: true,
          filter: async () => {
            return Boolean(user.membership);
          },
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
