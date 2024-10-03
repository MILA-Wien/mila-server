export default defineNuxtPlugin(() => {
  const menu = useCollectivoMenus();
  const user = useCollectivoUser().value;

  const items: CollectivoMenuItem[] = [
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
  ];

  menu.value.main.push(...items);
});
