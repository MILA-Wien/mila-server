<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const config = useRuntimeConfig();
const { t } = useI18n();
setPageTitle(t("Product requests"));

interface ResponseData {
  data: {
    id: number;
    date_created: string;
    name: string;
    wunsch: string;
    antwort: string;
    status: string;
  }[];
  meta: {
    totalCount: number;
    page: number;
    perPage: number;
  };
}

const filterSearch = ref("");
const filterFromSelf = ref(false);
const filterHasAnswer = ref(false);
const page = ref(1);
const data = ref<ResponseData | null>(null);

watch(page, () => {
  fetchData();
});

async function fetchData() {
  const { data: response } = await useFetch<ResponseData>(
    "/api/product-requests",
    {
      query: {
        search: filterSearch.value,
        from_self: filterFromSelf.value,
        has_answer: filterHasAnswer.value,
        page: page.value,
      },
    },
  );
  data.value = response.value;
}

fetchData();
</script>

<template>
  <div class="flex flex-row justify-between gap-5 pb-8">
    <div class="flex flex-row pb-4 gap-3 flex-1">
      <UInput
        v-model="filterSearch"
        :placeholder="t('Search product requests')"
        class="flex-1"
        icon="i-heroicons-magnifying-glass"
      />
      <UFormGroup :label="t('Only my requests')">
        <UToggle v-model="filterFromSelf" class="ml-4"
      /></UFormGroup>
      <UFormGroup :label="t('Only answered requests')">
        <UToggle v-model="filterHasAnswer" class="ml-4" />
      </UFormGroup>
      <UButton color="green" @click="fetchData">
        {{ t("Apply filter") }}
      </UButton>
    </div>
    <div class="flex flex-wrap gap-4">
      <UButton
        color="green"
        to="/participate/product-requests/new"
        icon="i-heroicons-plus"
      >
        {{ t("Submit request") }}
      </UButton>
    </div>
  </div>

  <div v-if="data" class="flex flex-col gap-4">
    <div v-for="item in data.data" :key="item.id">
      <CollectivoCard>
        <div class="flex items-center justify-between">
          <div>
            <h3>{{ item.name }}</h3>
            <p class="text-sm text-gray-500">
              {{ t("Submitted on") }}:
              {{ new Date(item.date_created).toLocaleDateString() }}
            </p>
          </div>
          <div>
            <span
              v-if="item.status === 'inarbeit'"
              class="bg-orange-500 text-white px-2 py-1 rounded"
            >
              {{ t("In progress") }}
            </span>
            <span v-else class="bg-green-500 text-white px-2 py-1 rounded">
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
      :total="data.meta.totalCount"
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
  "No requests found": "Keine Wünsche gefunden"
  "Here you can submit requests for products that you would like to see in our store.": "Hier kannst du Wünsche für Produkte einreichen, die du gerne in unserem Supermarkt sehen würdest."
</i18n>
