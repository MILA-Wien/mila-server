<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Ideenbuch"), {
  backLink: "/sortiment",
  backLinkLabel: t("Zurück zum Sortiment"),
});

const filterSearch = ref("");
const filterFromSelf = ref(false);
const filterHasAnswer = ref(false);
const page = ref(1);
const data = ref<Awaited<ReturnType<typeof fetchInner>> | null>(null);

watch(page, () => {
  fetchData();
});

async function fetchInner() {
  const { data } = await useFetch("/api/ideenbuch", {
    query: {
      search: filterSearch.value,
      from_self: filterFromSelf.value,
      has_answer: filterHasAnswer.value,
      page: page.value,
    },
  });
  return data.value;
}

async function fetchData() {
  data.value = await fetchInner();
}

async function applyFilter() {
  page.value = 1;
  await fetchData();
}

fetchData();
</script>

<template>
  <BetaMessage />
  <div class="w-full pb-10">
    <UButton
      color="green"
      class="w-full"
      size="xl"
      to="/sortiment/ideen/neu"
      icon="i-heroicons-plus"
    >
      {{ t("Neue Idee einreichen") }}
    </UButton>
  </div>

  <div class="flex flex-row justify-between gap-5 pb-8">
    <div class="flex flex-wrap pb-4 gap-3 flex-1">
      <UInput
        v-model="filterSearch"
        :placeholder="t('Ideen suchen')"
        class="flex-1 min-w-[200px]"
        icon="i-heroicons-magnifying-glass"
      />
      <div class="bg-blue-50 py-3 pr-3 flex flex-row items-center gap-3">
        <UToggle v-model="filterFromSelf" class="ml-4" />
        <span class="text-sm font-semibold">{{ t("Nur meine Ideen") }}</span>
      </div>
      <div class="bg-blue-50 py-3 pr-3 flex flex-row items-center gap-3">
        <UToggle v-model="filterHasAnswer" class="ml-4" />
        <span class="text-sm font-semibold">{{
          t("Nur beantwortete Ideen")
        }}</span>
      </div>
      <UButton @click="applyFilter">
        {{ t("Filter anwenden") }}
      </UButton>
    </div>
  </div>

  <div v-if="data" class="flex flex-col gap-4">
    <div v-for="item in data.data" :key="item.id">
      <CollectivoCard>
        <div class="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h3>{{ item.name }}</h3>
            <p class="text-sm text-gray-500">
              {{ t("Submitted on") }}:
              {{ new Date(item.date_created).toLocaleDateString() }}
            </p>
          </div>
          <div class="text-sm text-white font-semibold">
            <span
              v-if="item.status === 'inarbeit'"
              class="bg-orange-500 px-2 py-1 rounded"
            >
              {{ t("In progress") }}
            </span>
            <span v-else class="bg-green-500 px-2 py-1 rounded">
              {{ t("Answered") }}
            </span>
          </div>
        </div>

        <div class="mt-4">
          <p class="font-bold">{{ t("Request") }}:</p>
          <p>{{ item.wunsch }}</p>
        </div>

        <div v-if="item.antwort && item.antwort.length > 0" class="mt-4">
          <p class="font-bold">{{ t("Response") }}:</p>
          <p>{{ item.antwort }}</p>
        </div>
      </CollectivoCard>
    </div>
    <UPagination
      v-model="page"
      :page-count="10"
      :total="data.meta.totalCount as number"
    />
  </div>
  <div v-else>
    <p>{{ t("No requests found") }}</p>
  </div>
</template>

<i18n lang="yaml">
de:
  Participate: Mitwirken
  "Product requests": "Sortimentswünsche"
  "Open request list": "Wunschliste öffnen"
  "Submit request": "Wunsch einreichen"
  "My requests": "Meine Wünsche"
  "Submitted on": "Eingereicht am"
  "In progress": "In Bearbeitung"
  "Answered": "Beantwortet"
  "Response": "Antwort"
  "Request": "Wunsch"
  "Apply filter": "Filter anwenden"
  "Search product requests": "Sortimentswünsche suchen"
  "Only my requests": "Nur meine Wünsche"
  "Only answered requests": "Nur beantwortete Wünsche"
  "No requests found": "Keine Wünsche gefunden"
  "Submit new product request": "Neuen Sortimentswunsch einreichen"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
</i18n>
