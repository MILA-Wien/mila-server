<script setup lang="ts">
const user = useCurrentUser();
const { setLocale, t } = useI18n();

interface MenuItem {
  label: string;
  icon?: string;
  click?: () => void;
}

const locales = {
  de: "Deutsch",
  en: "English",
};

const languageMenu: Ref<MenuItem[][]> = ref([[]]);
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
  <div class="p-8 flex justify-center">
    <div v-if="user.isAuthenticated">
      <UDropdown :items="languageMenu" :popper="{ placement: 'top' }">
        <div class="flex flex-row items-center">
          <div
            class="font-bold flex flex-row items-center gap-2 justify-center"
          >
            <UIcon name="i-heroicons-language-16-solid" class="text-2xl" />
            Language
          </div>
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
</template>

<style lang="scss" scoped></style>

<i18n lang="yaml">
de:
  "Logout": "Abmelden"
  "Login": "Anmelden"
</i18n>
