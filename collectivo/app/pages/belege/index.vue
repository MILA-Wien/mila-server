<script setup lang="ts">
import { ref, computed, watchEffect } from "vue";

definePageMeta({
  middleware: ["auth"],
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

// initialer Fetch (kein watch in useFetch, wir steuern selbst)
const {
  data: belege,
  pending,
  error,
  refresh,
} = await useFetch("/api/lotzapp/bills", {
  query: monthRange,
  watch: false,
});

// neu laden, wenn sich from/to ändern
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
  <div class="space-y-4">
    <div class="flex items-center gap-3 border-2 w-96 px-4 justify-between">
      <UButton
        icon="i-heroicons-chevron-left"
        variant="ghost"
        @click="prevMonth"
      />
      <h2 class="pt-3">{{ monthLabel }}</h2>
      <UButton
        icon="i-heroicons-chevron-right"
        variant="ghost"
        @click="nextMonth"
      />
    </div>

    <div v-if="pending" class="text-gray-500">Lade Belege…</div>
    <div v-else-if="error" class="text-red-600">
      Fehler beim Laden der Belege
    </div>

    <CollectivoCardNew v-for="(beleg, ind) in belege" :key="ind" class="p-3">
      <BelegeBelegZettel :beleg="beleg" />
    </CollectivoCardNew>

    <div
      v-if="!pending && (!belege || belege.length === 0)"
      class="text-gray-400 text-center"
    >
      Keine Belege für diesen Monat
    </div>
  </div>
</template>

<i18n lang="yaml">
en:
  "Sortiment": "Product range"
  "Sortiment mitbestimmen": "Product range participation"
</i18n>
