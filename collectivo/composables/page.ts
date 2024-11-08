export const useCollectivoTitle = () =>
  useState<string>("collectivoTitle", () => "");

export const useCollectivoBackLink = () =>
  useState<string | undefined>("collectivoBackLink", () => "");

interface CollectivoTitleOptions {
  backLink?: string;
}

export const setCollectivoTitle = (
  title: string,
  options?: CollectivoTitleOptions,
) => {
  useCollectivoTitle().value = title;
  useCollectivoBackLink().value = options?.backLink;
  useHead({
    title: title + " - MILA",
  });
};

export const useCollectivoMenus = () =>
  useState<CollectivoMenus>("collectivoMenus", () => {
    const user = useCollectivoUser().value;
    return {
      main: [
        {
          label: "Home",
          icon: "i-heroicons-home",
          to: "/",
        },
        {
          label: "Handbook",
          icon: "i-heroicons-book-open",
          to: "https://handbuch.mila.wien/books/mitglieder-handbuch",
          external: true,
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
      ],
      main_public: [],
      profile: [],
      profile_public: [],
    };
  });

interface CollectivoValidator {
  message: string;
  test:
    | ((value: any, context: any, state: { [key: string]: any }) => boolean)
    | ((
        value: any,
        context: any,
        state: { [key: string]: any },
      ) => Promise<boolean>);
}

interface CollectivoValidators {
  tests: { [index: string]: CollectivoValidator };
  transformers: { [index: string]: (value: any, originalValue: any) => any };
}

export const useCollectivoValidators = () =>
  useState<CollectivoValidators>("collectivoValidators", () => {
    return {
      tests: {},
      transformers: {},
    };
  });
