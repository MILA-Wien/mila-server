<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";

const checkinState = useCheckinState();

let checkinStream: EventSource | null = null;

onMounted(() => {
  checkinStream = new EventSource("/api/checkin/stream");
  checkinStream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      checkinState.value = data;
    } catch (err) {
      console.error("Failed to read card id:", err);
    }
  };
  checkinStream.onerror = (err) => {
    console.warn("Lost SSE connectionsssdasdsasd, retrying soon...", err);
  };
});

onBeforeUnmount(() => {
  checkinStream?.close();
});

function getColor() {
  if (!checkinState.value.cardId) return "gray";
  if (checkinState.value.error) return "red";
  if (checkinState.value.shiftsType === "exempt") return "green";
  if (checkinState.value.shiftsType === "inactive") return "red";
  if (checkinState.value.canShop) {
    if (checkinState.value.shiftScore! <= 0) return "orange";
    return "green";
  }
  return "red";
}
</script>

<template>
  <CollectivoCardNew :color="getColor()" class="text-xl leading-8">
    <div v-if="checkinState.cardId">
      Kartennummer: {{ checkinState.cardId }}
    </div>
    <div v-else>Warte auf Kartenscan...</div>
    <div v-if="checkinState.error" class="text-red-600 font-bold">
      {{ checkinState.error }}
    </div>
    <div v-if="checkinState.membership" class="mb-2">
      Mitgliedsnummer: {{ checkinState.membership }}
    </div>
    <div v-if="checkinState.coshopper">
      Name: {{ checkinState.coshopper }} (Miteinkäufer*in von
      {{ checkinState.username }})
    </div>
    <div v-else-if="checkinState.username">
      Name: {{ checkinState.username }}
      <span v-if="checkinState.pronouns">({{ checkinState.pronouns }})</span>
    </div>
    <div v-if="checkinState.membership">
      <div>
        Status:
        <span v-if="checkinState.shiftsType === 'exempt'"
          >Von Schichten befreit</span
        >
        <span v-else-if="checkinState.shiftsType === 'inactive'">Inaktiv</span>
        <span v-else-if="checkinState.isOnHoliday">Auf Urlaub</span>
        <span v-else>{{ checkinState.shiftScore }} Schichtpunkte</span>
      </div>
      <div class="mt-2 font-bold">
        Darf einkaufen:
        <span v-if="checkinState.canShop"
          >Ja<span v-if="checkinState.shiftScore! < 0"
            >, aber wird bald gesperrt</span
          >
        </span>
        <span v-else> Nein </span>
      </div>
    </div>
  </CollectivoCardNew>
</template>
