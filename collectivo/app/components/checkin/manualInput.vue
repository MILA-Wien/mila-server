<script setup lang="ts">
const mshipId = ref<number | undefined>();
const mship = ref<any>();
const open = ref(false);

async function getMembership() {
  const { data } = await useFetch(`api/checkin/membership/${mshipId.value}`);
  mship.value = data.value;
}

async function checkinMember() {
  await useFetch(`api/checkin/membership/${mshipId.value}`, {
    method: "POST",
  });
  open.value = false;
  mshipId.value = undefined;
  mship.value = undefined;
}
</script>

<template>
  <UModal v-model:open="open">
    <UButton variant="outline" class="border-2"
      >Neues Mitglied manuell einchecken</UButton
    >

    <template #content>
      <div class="w-128 p-4">
        <FormsFormGroup label="Mitgliedsnummer" name="mshipId" class="w-full">
          <div class="flex flex-row gap-4">
            <UInput v-model="mshipId" />
            <UButton @click="getMembership">Suchen</UButton>
          </div>
        </FormsFormGroup>

        <div v-if="mship" class="mt-4">
          <FormsFormGroup label="Mitglied">
            <div class="p-3 border-1 border-black">
              {{ mship.username }}
              <span v-if="mship.pronouns"> ({{ mship.pronouns }}) </span>
            </div>
          </FormsFormGroup>
          <UButton @click="checkinMember" class="w-full mt-4"
            >Mitglied einchecken</UButton
          >
        </div>
      </div>
    </template>
  </UModal>
</template>
