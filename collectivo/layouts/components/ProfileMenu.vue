<script setup lang="ts">
const { setLocale, t } = useI18n();
const user = useCollectivoUser();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();

const locales = {
  de: "Deutsch",
  en: "English",
};

interface MenuItem {
  label: string;
  icon?: string;
  click?: () => void;
}

const profileMenu: Ref<MenuItem[][]> = ref([[]]);
const languageMenu: Ref<MenuItem[][]> = ref([[]]);

const topRightMenus = ref([
  {
    label: "Language",
    icon: "i-heroicons-language",
    items: languageMenu,
  },
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    items: profileMenu,
  },
]);

const profileItems: CollectivoMenuItem[] = [
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    to: "/profile/",
  },
  {
    label: "Membership",
    to: "/memberships/membership",
    icon: "i-heroicons-identification",
  },
];

const profilePublicItems: CollectivoMenuItem[] = [
  {
    label: "Login",
    icon: "i-heroicons-arrow-right-on-rectangle-solid",
    click: user.value.login,
  },
];

if (user.value.isAdmin) {
  profileItems.push({
    label: "Datenstudio",
    icon: "i-heroicons-chart-bar-square",
    to: runtimeConfig.public.directusUrl,
    external: true,
  });
  profileItems.push({
    label: "Schichtverwaltung",
    icon: "i-heroicons-calendar-days-solid",
    to: "/shifts/admin",
  });
}

profileItems.push({
  label: "Logout",
  icon: "i-heroicons-arrow-left-on-rectangle-solid",
  click: user.value.logout,
});

const items = user.value.isAuthenticated ? profileItems : profilePublicItems;

for (const item of items) {
  profileMenu.value[0].push({
    label: item.label,
    icon: item.icon,
    click:
      item.click ||
      (() => {
        if (item.external) {
          window.open(item.to, "_blank");
          return;
        }

        router.push(item.to ?? "/");
      }),
  });
}

Object.entries(locales).forEach(([key, label]) => {
  languageMenu.value[0].push({
    label: label,
    click: () => {
      setLocale(key);
    },
  });
});
</script>

<template>
  <div class="flex flex-row gap-2">
    <div v-for="menu in topRightMenus" :key="menu.label">
      <UDropdown :items="menu.items" :popper="{ placement: 'bottom-start' }">
        <UIcon class="h-7 w-7" :name="menu.icon" />

        <template #item="{ item }">
          <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
          <span>{{ t(item.label) }}</span>
        </template>
      </UDropdown>
    </div>
  </div>
</template>
