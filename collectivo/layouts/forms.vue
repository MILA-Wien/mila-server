<script setup lang="ts">
import ProfileMenu2 from "./components/ProfileMenu2.vue";

const pageTitle = useCollectivoTitle();
const appConfig = useAppConfig();
const { setLocale, t, locale } = useI18n();
const user = useCurrentUser();
const userMenu = [
  [
    {
      label: "Logout",
      icon: "i-heroicons-arrow-left-on-rectangle-solid",
      click: user.value.logout,
    },
  ],
];
</script>

<template>
  <div class="h-screen max-w-full overflow-x-auto p-6 md:p-12">
    <!-- TOP RIGHT USER MENU -->
    <div class="flex justify-end">
      <ProfileMenu2 />
    </div>

    <!-- PAGE CONTENT -->
    <div class="flex justify-center">
      <div class="w-full max-w-3xl">
        <div
          class="flex flex-wrap gap-4 md:gap-12 justify-start items-start my-6 md:my-12"
        >
          <img
            src="/img/mila_logo_subline.png"
            alt="Logo"
            class="h-28 md:h-44"
          />
          <div>
            <h1 class="text-4xl md:text-5xl mb-3 md:mb-6">
              {{ t(pageTitle) }}
            </h1>
            <div class="flex flex-wrap gap-2 mb-4">
              <UButton
                v-for="(value, key) in appConfig.localesDict"
                :key="key"
                :disabled="locale === key"
                @click="setLocale(key)"
              >
                {{ value }}
              </UButton>
            </div>
          </div>
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  "Logout": "Abmelden"
  "Login": "Anmelden"
</i18n>
