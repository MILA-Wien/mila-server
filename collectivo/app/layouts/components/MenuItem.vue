<script setup lang="ts">
const { t } = useI18n();

const props = defineProps({
  item: {
    type: Object as PropType<NavigationMenuItem>,
    required: true,
  },
});

const visible = ref(false);
filterItem(props.item);

async function filterItem(item: NavigationMenuItem) {
  if (item.filter) {
    visible.value = await item.filter(item);
    return;
  }

  visible.value = true;
}
</script>

<template>
  <div v-if="visible">
    <div v-if="item.click">
      <a class="item" @click="item.click()">
        <slot name="icon">
          <UIcon v-if="item.icon" :name="item.icon" class="item__icon" />
        </slot>
        <span class="item__title">{{ t(item.label) }}</span>
      </a>
    </div>
    <div v-else-if="item.external">
      <a :href="item.to" :target="item.target ?? '_blank'" class="item">
        <UIcon v-if="item.icon" :name="item.icon" class="item__icon" />

        <span class="item__title">{{ t(item.label) }}</span>
      </a>
    </div>
    <div v-else>
      <NuxtLink :to="item.to" class="item">
        <UIcon v-if="item.icon" :name="item.icon" class="item__icon" />

        <span class="item__title">{{ t(item.label) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "Home": "Startseite"
  "Shifts": "Schichten"
  "Help": "Hilfe"
</i18n>

<style lang="scss">
.item {
  @apply text-white flex flex-col gap-1 items-center px-3 py-4 mb-2 transition-all cursor-pointer;
  &__icon {
    @apply h-5 w-5 mb-0;
  }

  &__title {
    @apply font-semibold;
  }

  &:hover,
  &.router-link-exact-active {
    @apply bg-milaGreenHover;
  }
}

.mobile-menu-item {
  @apply p-0 mb-0;

  .item {
    @apply py-2 px-2.5 mb-0 mx-0 min-w-16;

    &__title {
      @apply text-xs;
    }
  }
}
</style>
