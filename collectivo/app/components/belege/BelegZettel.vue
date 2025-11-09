<script setup lang="ts">
import { computed } from "vue";

interface Position {
  id: string;
  product_id: string;
  product_name: string;
  net: number;
  amount: number;
  gross: number;
  vat: number;
}

interface Beleg {
  timestamp: string;
  id: string;
  customer_id: string;
  external_number: string;
  name: string;
  vat: number;
  total: number;
  positions: Position[];
}

const props = defineProps<{ beleg: Beleg }>();
const { t } = useI18n();

const formatCurrency = (amount: number) => `${amount.toFixed(2)} EUR`;

const formatDate = (timestamp: string) =>
  new Date(timestamp).toLocaleString("de-DE", { dateStyle: "short" });

const vatCode = (vat: number) => {
  if (vat === 10) return "A";
  if (vat === 20) return "B";
  if (vat === 0) return "D";
  return "";
};

// --- VAT summary calculation ---
const vatSummary = computed(() => {
  const summary: Record<
    string,
    { rate: number; net: number; vat: number; gross: number }
  > = {};

  for (const pos of props.beleg.positions) {
    const key = String(pos.vat);
    if (!summary[key])
      summary[key] = { rate: pos.vat, net: 0, vat: 0, gross: 0 };

    const gross = round2(pos.gross * pos.amount);
    const net = round2(pos.net * pos.amount);
    const vat = round2(gross - net);

    summary[key].gross = round2(summary[key].gross + gross);
    summary[key].net = round2(summary[key].net + net);
    summary[key].vat = round2(summary[key].vat + vat);
  }

  // Sort in order
  const order = [10, 20, 13, 0];
  return Object.values(summary).sort(
    (a, b) => order.indexOf(a.rate) - order.indexOf(b.rate),
  );
});

// Round to 2 decimals, same way for negative values
function round2(value: number): number {
  const factor = 100;
  if (value >= 0) {
    return Math.round(value * factor) / factor;
  } else {
    return -Math.round(Math.abs(value) * factor) / factor;
  }
}

import html2pdf from "html2pdf.js";
const receiptRef = ref<HTMLElement>();

function downloadPDF() {
  if (!receiptRef.value) return;

  const element = receiptRef.value.cloneNode(true) as HTMLElement;

  // Optional: add a white background & extra padding for PDF rendering
  element.style.background = "white";
  element.style.padding = "16px";
  element.style.margin = "0 auto";
  element.style.width = "80mm"; // good width for receipts

  const options: any = {
    margin: [10, 10, 10, 10], // top, left, bottom, right (mm)
    filename: "Beleg.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      windowWidth: 800,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  html2pdf().set(options).from(element).save();
}
</script>

<template>
  <div
    class="mb-6 relative overflow-hidden inline-block text-sm bg-white text-gray-900 border border-gray-300 p-4 mx-auto shadow w-full"
  >
    <div ref="receiptRef" class="pb-2">
      <!-- Header -->
      <div class="text-center border-b border-gray-300 pb-2 mb-2">
        <p class="font-bold">MILA Mitmach-Supermarkt e.G.</p>
        <p class="">
          Vivenotgasse 29<br />
          1120 Wien<br />
          ATU79372607
        </p>
      </div>

      <!-- Positions -->
      <div class="mb-2">
        <div
          v-for="pos in beleg.positions"
          :key="pos.id"
          class="flex justify-between border-b border-dotted border-gray-300 py-1 last:border-b-0"
        >
          <div class="flex-1">
            <p>{{ pos.product_name }}</p>
            <p v-if="pos.amount < 0" class="text-xs text-gray-500">
              {{ t("Rückgabe") }} {{ -pos.amount }} ×
              {{ formatCurrency(pos.gross) }}
            </p>
            <p
              v-else-if="pos.amount !== 1 && pos.amount !== -1"
              class="text-xs text-gray-500"
            >
              {{ pos.amount }} × {{ formatCurrency(pos.gross) }}
            </p>
          </div>

          <div class="text-right w-28">
            <p>
              {{ formatCurrency(pos.gross * pos.amount) }}
              {{ vatCode(pos.vat) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="border-t border-gray-300 pt-2 mt-2">
        <div class="flex justify-between font-bold mt-2 text-lg">
          <span>GESAMT</span>
          <span>{{ formatCurrency(beleg.total) }}</span>
        </div>

        <div class="border-t border-gray-300 pt-2 mt-4"></div>

        <!-- VAT breakdown table -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left">
              <th class="font-normal">%</th>
              <th class="text-right font-normal">NETTO</th>
              <th class="text-right font-normal">MWST</th>
              <th class="text-right font-normal">BRUTTO</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vals in vatSummary" :key="vals.rate">
              <td>
                {{
                  vals.rate === 10
                    ? "A: 10%"
                    : vals.rate === 20
                      ? "B: 20%"
                      : vals.rate === 13
                        ? "C: 13%"
                        : "D: 0%"
                }}
              </td>
              <td class="text-right">{{ vals.net.toFixed(2) }}</td>
              <td class="text-right">{{ vals.vat.toFixed(2) }}</td>
              <td class="text-right">{{ vals.gross.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="pt-3 mt-2 border-t border-gray-300 flex flex-row justify-between"
      >
        <div>Datum: {{ formatDate(beleg.timestamp) }}</div>
        <div>BonNr: {{ beleg.external_number }}</div>
      </div>
    </div>
    <div class="flex-1"></div>
    <UButton
      class="mt-4 w-full"
      color="gray"
      icon="i-heroicons-arrow-down-tray"
      variant="outline"
      @click="downloadPDF"
      >{{ t("Download") }}</UButton
    >
  </div>
</template>

<i18n lang="yaml">
de:
  "Download": "Beleg herunterladen"
en:
  "Download": "Download receipt"
  "Rückgabe": "Return"
</i18n>
