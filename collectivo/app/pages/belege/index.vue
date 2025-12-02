<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";


definePageMeta({
  middleware: ["auth"],
});

// Temporarily disable the page
throw createError({
  statusCode: 404,
  message: "Page not found",
  fatal: true,
});

interface Beleg {
  timestamp: string;
  id: string;
  customer_id: string;
  name: string;
  vat: number;
  total: number;
  positions: Position[];
}

interface Position {
  id: string;
  product_id: string;
  product_name: string;
  net: number;
  gross: number;
  vat: number;
}

const config = useRuntimeConfig();
const { t } = useI18n();
setPageTitle(t("Meine Belege"));

// Helper: YYYY-MM-DD ohne UTC-Konvertierung
function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Immer auf den 1. setzen, um Carryover-Probleme zu vermeiden
function firstOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const currentMonth = ref(firstOfMonth());

function getMonthRange(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0); // letzter Tag des Monats
  return { from: formatYMD(from), to: formatYMD(to) };
}

const monthRange = computed(() => getMonthRange(currentMonth.value));

// initialer Fetch
const {
  data: belege,
  pending,
  error,
  refresh,
} = await useFetch("/api/lotzapp/bills", {
  query: monthRange,
  watch: false,
});

watch(
  monthRange,
  () => {
    refresh();
  },
  { immediate: true },
);

function prevMonth() {
  const d = currentMonth.value;
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function nextMonth() {
  const d = currentMonth.value;
  currentMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

const monthLabel = computed(() =>
  currentMonth.value.toLocaleDateString("de-AT", {
    month: "long",
    year: "numeric",
  }),
);
</script>

<template>
  <BetaMessage />
  <div class="space-y-4">
    <div class="border-2 w-full p-3">{{ t("intro_belege") }}</div>
    <div class="flex items-center gap-3 border-2 w-full p-3 justify-between">
      <UButton
        icon="i-heroicons-chevron-left"
        variant="ghost"
        color="gray"
        style="background-color: transparent !important"
        @click="prevMonth"
      />
      <div class="text-lg font-bold">{{ monthLabel }}</div>
      <UButton
        icon="i-heroicons-chevron-right"
        variant="ghost"
        color="gray"
        style="background-color: transparent !important"
        @click="nextMonth"
      />
    </div>

    <div v-if="pending" class="text-gray-500">
      <USkeleton class="w-full mb-4 h-28" />
    </div>
    <div
      v-else-if="error"
      class="text-red-600 border-2 border-red-600 p-6 text-center font-bold"
    >
      Fehler beim Laden der Belege
    </div>

    <div class="columns-1 xl:columns-2 gap-6 w-full max-w-6xl mx-auto">
      <template v-for="(beleg, index) in belege" :key="index" class="p-3">
        <BelegeBelegZettel :beleg="beleg" />
      </template>
    </div>

    <div
      v-if="!pending && (!belege || belege.length === 0)"
      class="text-gray-400 text-center border-2 border-gray-300 p-6 font-bold"
    >
      Keine Belege für diesen Monat
    </div>
  </div>
</template>

<i18n lang="yaml">
de:
  "intro_belege": "Hier findest du eine Übersicht deiner Einkäufe. Bitte beachte: Nur Einkäufe, bei denen du deine Mitgliedskarte an der Kassa scannst, werden deiner Mitgliedschaft zugeordnet."
en:
  "intro_belege": "Here you will find an overview of your purchases. Please note: Only purchases where you scan your membership card at the checkout will be assigned to your membership."
</i18n>
