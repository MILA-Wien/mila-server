<script setup lang="ts">
import MenuItem from "./MenuItem.vue";

const menus = useNavigationMenus();
const user = useCurrentUser();
const { t, setLocale } = useI18n();
const runtimeConfig = useRuntimeConfig();

const isOpen = defineModel<boolean>({ default: false });

const mainMenuItems = Object.values(menus.value.main);
const publicMenuItems = Object.values(menus.value.main_public);

// Profile menu items
const profileMenuItems = ref<any[]>([
  {
    label: "Profile",
    icon: "i-heroicons-user-circle",
    to: "/profile/",
  },
]);

if (user.value.isStudioAdmin) {
  profileMenuItems.value.push({
    label: "Datenstudio",
    icon: "i-heroicons-chart-bar-square",
    to: runtimeConfig.public.directusUrl,
    target: "_blank",
    external: true,
  });
}
if (user.value.isShiftAdmin) {
  profileMenuItems.value.push({
    label: "Schichtverwaltung",
    icon: "i-heroicons-calendar-days-solid",
    to: "/shifts/admin",
  });
}

profileMenuItems.value.push({
  label: "Logout",
  icon: "i-heroicons-arrow-left-on-rectangle-solid",
  to: "/logout",
});

// Language switcher
const switchLanguage = (lang: string) => {
  setLocale(lang);
  isOpen.value = false;
};
</script>

<template>
  <!-- Backdrop overlay -->
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isOpen = false"
    ></div>
  </Transition>

  <!-- Drawer -->
  <Transition
    enter-active-class="transition-transform duration-300"
    leave-active-class="transition-transform duration-300"
    enter-from-class="translate-x-full"
    leave-to-class="translate-x-full"
  >
    <div
      v-if="isOpen"
      class="fixed right-0 top-0 h-full w-full bg-milaGreen text-white z-50 md:hidden flex flex-col shadow-xl"
      @click.stop
    >
      <!-- Header with close button -->
      <div
        class="flex justify-between items-center p-6 border-b border-white/20"
      >
        <div class="text-xl font-Avory">{{ t("Menu") }}</div>
        <button
          @click="isOpen = false"
          class="p-2 hover:bg-milaGreenHover rounded"
        >
          <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
        </button>
      </div>

      <!-- Menu content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Main navigation items -->
        <div class="py-2">
          <div class="px-3 mb-1 text-xs font-semibold opacity-70">
            {{ t("Navigation") }}
          </div>
          <div
            v-for="(item, i) in user.isAuthenticated
              ? mainMenuItems
              : publicMenuItems"
            :key="i"
            @click="isOpen = false"
          >
            <MenuItem v-if="!item.hideOnMobile" :item="item" drawer />
          </div>
        </div>

        <!-- Profile menu items (only for authenticated users) -->
        <div v-if="user.isAuthenticated" class="py-2 border-t border-white/20">
          <div class="px-3 mb-1 text-xs font-semibold opacity-70">
            {{ t("Account") }}
          </div>
          <div
            v-for="(item, i) in profileMenuItems"
            :key="i"
            @click="isOpen = false"
          >
            <MenuItem :item="item" drawer />
          </div>
        </div>

        <!-- Login link for non-authenticated users -->
        <div v-else class="py-2 border-t border-white/20">
          <NuxtLink
            to="/login"
            class="text-white flex flex-row gap-3 items-center px-3 py-3 mb-0 transition-all cursor-pointer hover:bg-milaGreenHover"
            @click="isOpen = false"
          >
            <UIcon name="i-heroicons-user-circle" class="h-5 w-5" />
            <span class="font-semibold">{{ t("Login") }}</span>
          </NuxtLink>
        </div>

        <!-- Language switcher -->
        <div class="py-2 border-t border-white/20">
          <div class="px-3 mb-1 text-xs font-semibold opacity-70">
            {{ t("Language") }}
          </div>
          <button
            @click="switchLanguage('de')"
            class="w-full text-left px-3 py-3 hover:bg-milaGreenHover transition-all flex items-center gap-3"
          >
            <UIcon name="i-heroicons-language-20-solid" class="h-5 w-5" />
            <span class="font-semibold">Deutsch</span>
          </button>
          <button
            @click="switchLanguage('en')"
            class="w-full text-left px-3 py-3 hover:bg-milaGreenHover transition-all flex items-center gap-3"
          >
            <UIcon name="i-heroicons-language-20-solid" class="h-5 w-5" />
            <span class="font-semibold">English</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<i18n lang="yaml">
de:
  "Menu": "Menü"
  "Navigation": "Navigation"
  "Account": "Konto"
  "Language": "Sprache"
  "Profile": "Profil"
  "Logout": "Abmelden"
  "Login": "Anmelden"
</i18n>
