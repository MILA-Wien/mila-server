<script setup lang="ts">
import Sidebar from "./components/Sidebar.vue";
import MobileHeader from "./components/MobileHeader.vue";
import MobileMenu from "./components/MobileMenu.vue";
import ProfileMenu2 from "./components/ProfileMenu2.vue";

const { t } = useI18n();

const pageTitle = useCollectivoTitle();
const backLink = useCollectivoBackLink();
</script>

<template>
  <div class="layout">
    <Sidebar />
    <MobileHeader />
    <div class="md:pl-44 lg:pl-52 pb-10">
      <div class="hidden md:flex w-full justify-end px-8 pt-8 pb-4 right-0">
        <ProfileMenu2 />
      </div>
      <div class="px-6 py-3 md:px-12 md:pb-20 lg:px-20">
        <div class="hidden md:flex justify-between items-start mb-7 lg:mb-11">
          <div class="">
            <h1
              class="flex flex-wrap text-4xl lg:text-5xl align-middle items-center gap-3 mt-0"
            >
              <NuxtLink
                v-if="backLink"
                :to="backLink"
                class="flex items-center"
              >
                <UIcon name="i-heroicons-arrow-left-circle-16-solid" />
              </NuxtLink>

              {{ t(pageTitle) }}
            </h1>
          </div>
        </div>

        <!-- Main content -->
        <slot />
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
