<script setup lang="ts">
import Sidebar from "./components/Sidebar.vue";
import MobileHeader from "./components/MobileHeader.vue";
import MobileMenu from "./components/MobileMenu.vue";
import ProfileMenu2 from "./components/ProfileMenu2.vue";
import Header from "./components/Header.vue";
const { locale } = useI18n();
const localeKey = ref(0);
watch(locale, () => {
  localeKey.value++;
});
</script>

<template>
  <div class="layout">
    <Sidebar />
    <MobileHeader />
    <div class="md:pl-44 lg:pl-52 pb-10">
      <div class="hidden md:flex w-full justify-end px-8 pt-8 pb-4 right-0">
        <ProfileMenu2 />
      </div>
      <div class="flex flex-row justify-center">
        <div class="px-6 py-3 md:px-12 md:pb-20 lg:px-20 w-full max-w-7xl">
          <Header />

          <!-- Main content, reload upon locale change -->
          <slot :key="localeKey" />
        </div>
      </div>
    </div>
    <MobileMenu />
  </div>
</template>

<style lang="scss" scoped>
.bottom-right {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 800px;
  height: 800px;
}

.layout {
  @apply h-full;
  overflow-x: auto; /* or overflow-x: hidden; */
  max-width: 100%; /* Ensure it doesn't expand beyond the viewport */
}
</style>
