<script setup lang="ts">
const pageTitle = useCollectivoTitle();
const appConfig = useAppConfig();
const { setLocale, t, locale } = useI18n();
const user = useCollectivoUser();
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
  <div class="h-screen max-w-full overflow-x-auto bg-[#f2fbf9] p-6 md:p-12">
    <!-- TOP RIGHT USER MENU -->
    <div class="flex justify-end">
      <div v-if="user.isAuthenticated">
        <UDropdown :items="userMenu" :popper="{ placement: 'bottom' }">
          <div class="flex flex-row items-center">
            <UIcon name="i-heroicons-user-circle" class="h-7 w-7 mr-2" />
            <h4>{{ user.user?.first_name }} {{ user.user?.last_name }}</h4>
          </div>

          <template #item="{ item }">
            <UIcon v-if="item.icon" class="h-5 w-5" :name="item.icon" />
            <span>{{ t(item.label) }}</span>
          </template>
        </UDropdown>
      </div>
      <div v-else>
        <NuxtLink to="/login">
          <div class="flex flex-row items-center">
            <UIcon name="i-heroicons-user-circle" class="h-7 w-7 mr-2" />
            <h4>{{ t("Login") }}</h4>
          </div>
        </NuxtLink>
      </div>
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
