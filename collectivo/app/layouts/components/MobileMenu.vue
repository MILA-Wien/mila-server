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
    <div class="mobile-menu">
      <div class="mobile-menu__inner space-x-2">
        <div
          v-for="(item, i) in user.isAuthenticated
            ? mainMenuItems
            : publicMenuItems"
          :key="i"
        >
          <MenuItem
            v-if="!item.hideOnMobile == true"
            :item="item"
            class="mobile-menu-item"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mobile-menu {
  @apply bg-green-500 px-3 fixed bottom-0 w-screen z-10 md:hidden border-t border-gray-200;
  box-shadow: 4px 0px 48px 0px rgba(220, 226, 239, 0.5);

  &__inner {
    @apply flex items-center justify-center;
  }
}
</style>
