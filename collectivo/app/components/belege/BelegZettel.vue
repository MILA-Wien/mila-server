<script setup lang="ts">
interface Position {
  id: string;
  product_id: string;
  product_name: string;
  net: number;
  gross: number;
  vat: number;
}

interface Beleg {
  timestamp: string;
  id: string;
  customer_id: string;
  name: string;
  vat: number;
  total: number;
  positions: Position[];
}

const props = defineProps<{
  beleg: Beleg;
}>();

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    amount,
  );

const formatDate = (timestamp: string) =>
  new Date(timestamp).toLocaleString("de-DE", {
    dateStyle: "short",
  });

const subtotal = computed(() =>
  props.beleg.positions.reduce((sum, p) => sum + p.net, 0),
);

const vatAmount = computed(() => props.beleg.total - subtotal.value);
</script>

<template>
  {{ beleg }}
  <div
    class="font-mono text-sm bg-white text-gray-900 border border-gray-300 rounded-lg p-4 w-80 mx-auto shadow"
  >
    <!-- Header -->
    <div class="text-center border-b border-gray-400 pb-2 mb-2">
      <p class="font-bold">MILA Beleg</p>
      <p class="text-xs">Datum: {{ formatDate(beleg.timestamp) }}</p>
      <p class="text-xs text-gray-500">Beleg-Nr: {{ beleg.id }}</p>
    </div>

    <!-- Positions -->
    <div class="mb-2">
      <div
        v-for="pos in beleg.positions"
        :key="pos.id"
        class="flex justify-between border-b border-dotted border-gray-300 py-1"
      >
        <div class="flex-1">
          <p>{{ pos.product_name }}</p>
        </div>
        <div class="text-right w-20">
          <p>{{ formatCurrency(pos.gross) }}</p>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div class="border-t border-gray-400 pt-2 mt-2">
      <div class="flex justify-between">
        <span>Zwischensumme:</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div class="flex justify-between text-gray-600 text-xs">
        <span>inkl. MwSt </span>
        <!-- ({{ beleg.vat }}%) -->
        <span>{{ formatCurrency(vatAmount) }}</span>
      </div>
      <div class="flex justify-between font-bold mt-2">
        <span>Gesamt:</span>
        <span>{{ formatCurrency(beleg.total) }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-xs mt-4 text-gray-500">
      <p>Kunde: {{ beleg.customer_id }}</p>
      <p>Vielen Dank für Ihren Einkauf!</p>
    </div>
  </div>
</template>

<style scoped>
/* Optional: make it look like printed receipt */
.font-mono {
  font-family: "Courier New", Courier, monospace;
}
</style>
