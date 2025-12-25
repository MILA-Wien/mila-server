<script setup lang="ts">
const { t } = useI18n();

const props = defineProps({
  item: {
    type: Object as PropType<CollectivoMenuItem>,
    required: true,
  },
  mobile: {
    type: Boolean,
    default: false,
  },
  drawer: {
    type: Boolean,
    default: false,
  },
});

const visible = ref(false);
filterItem(props.item);

async function filterItem(item: CollectivoMenuItem) {
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
      <a
        class="text-white flex transition-all cursor-pointer hover:bg-milaGreenHover [&.router-link-exact-active]:bg-milaGreenHover"
        :class="drawer ? 'flex-row gap-3 items-center px-3 py-3 mb-0' : mobile ? 'flex-col gap-1 items-center py-2 px-2.5 mb-0 mx-0 min-w-16' : 'flex-col gap-1 items-center px-3 py-4 mb-2'"
        @click="item.click()"
      >
        <slot name="icon">
          <UIcon v-if="item.icon" :name="item.icon" class="h-5 w-5 mb-0" />
        </slot>
        <span class="font-semibold" :class="mobile ? 'text-sm' : ''">{{
          t(item.label)
        }}</span>
      </a>
    </div>
    <div v-else-if="item.external">
      <a
        :href="item.to"
        :target="item.target ?? '_blank'"
        class="text-white flex transition-all cursor-pointer hover:bg-milaGreenHover"
        :class="drawer ? 'flex-row gap-3 items-center px-3 py-3 mb-0' : 'flex-col gap-1 items-center px-3 py-4 mb-2'"
      >
        <UIcon v-if="item.icon" :name="item.icon" class="h-5 w-5 mb-0" />

        <span class="font-semibold">{{ t(item.label) }}</span>
      </a>
    </div>
    <div v-else>
      <NuxtLink
        :to="item.to"
        class="text-white flex transition-all cursor-pointer hover:bg-milaGreenHover [&.router-link-exact-active]:bg-milaGreenHover"
        :class="drawer ? 'flex-row gap-3 items-center px-3 py-3 mb-0' : mobile ? 'flex-col gap-1 items-center py-2 px-2.5 mb-0 mx-0 min-w-16' : 'flex-col gap-1 items-center px-3 py-4 mb-2'"
      >
        <UIcon v-if="item.icon" :name="item.icon" class="h-5 w-5 mb-0" />

        <span class="font-semibold" :class="mobile ? 'text-sm' : ''">{{
          t(item.label)
        }}</span>
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
