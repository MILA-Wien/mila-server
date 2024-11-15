<script setup lang="ts">
import LanguageMenu from "./LanguageMenu.vue";
import MenuItem from "./MenuItem.vue";

const menus = useCollectivoMenus();
const user = useCollectivoUser();
const { t } = useI18n();
const mainMenuItems = menus.value.main;

const publicMenuItems = menus.value.main_public;
</script>

<template>
  <div
    class="hidden md:flex w-44 lg:w-52 flex-col text-white fixed h-screen bg-milaGreen"
  >
    <div
      class="flex justify-center items-center p-1 mt-8 lg:mt-10 mx-7 lg:mx-8"
    >
      <router-link to="/" class="logo__image">
        <img
          src="/img/mila_logo_white.png"
          alt="MILA Logo"
          class="object-cover"
        />
      </router-link>
    </div>
    <div class="flex font-Avory text-lg justify-center items-center mb-6 p-2">
      {{ t("Mitgliederbereich") }}
    </div>
    <div class="flex-1">
      <div
        v-for="(item, i) in user.isAuthenticated
          ? mainMenuItems
          : publicMenuItems"
        :key="i"
      >
        <MenuItem
          v-if="user.isAuthenticated || !user.isAuthenticated"
          :item="item"
        />
      </div>
    </div>
    <LanguageMenu />
  </div>
</template>

<i18n lang="yaml">
de:
  "Members Area": "Mitgliederbereich"
</i18n>
