<script setup lang="ts">
import MenuItem from "./MenuItem.vue";

const menus = useNavigationMenus();
const user = useCurrentUser();

const mainMenuItems = Object.values(menus.value.main);

const publicMenuItems = Object.values(menus.value.main_public);
</script>

<template>
  <div>
    <div class="h-12"></div>
    <div
      class="bg-green-500 px-3 fixed bottom-0 w-screen z-10 md:hidden border-t border-gray-200 mobile-menu"
    >
      <div class="flex items-center justify-center space-x-2">
        <div
          v-for="(item, i) in user.isAuthenticated
            ? mainMenuItems
            : publicMenuItems"
          :key="i"
        >
          <MenuItem v-if="!item.hideOnMobile == true" :item="item" mobile />
        </div>
      </div>
    </div>
  </div>
</template>
