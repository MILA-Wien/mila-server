<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Dashboard"));

const tiles = useDashboardTiles();

tiles.value.load();

// TODO: More general solution
const user = useCurrentUser();
if (user.value?.user.email === "checkin@mila.wien") {
  navigateTo("/checkin");
}
</script>

<template>
  <div v-if="tiles.data" class="gap-5 columns-1 md:columns-2 xl:columns-3">
    <CollectivoCard
      v-for="tile in tiles.data"
      :key="tile.id"
      class="mb-5"
      :title="tile.tiles_name"
      :color="tile.tiles_color"
    >
      <div
        v-if="tile.tiles_content"
        v-html="markdownToHtml(tile.tiles_content)"
      />
      <div v-if="tile.tiles_buttons" class="flex flex-wrap gap-2 pt-3">
        <template v-for="button in tile.tiles_buttons" :key="button.id">
          <a
            v-if="button.tiles_is_external"
            :href="button.tiles_path"
            target="_blank"
          >
            <UButton
              :label="button.tiles_label"
              :color="tile.tiles_color"
              size="sm"
              icon="i-heroicons-arrow-top-right-on-square-16-solid"
              trailing
            />
          </a>
          <NuxtLink v-else :to="button.tiles_path">
            <UButton
              :label="button.tiles_label"
              :color="tile.tiles_color"
              size="sm"
            />
          </NuxtLink>
        </template>
      </div>
      <div v-if="tile.tiles_component">
        <component :is="tile.tiles_component" />
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
de:
  "Dashboard": "Startseite"
</i18n>
