<script setup lang="ts">
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from "../../../shared/countries";

// Address inputs shared by the registration and profile forms. Writes into the
// parent's form state; validation rules are in app/composables/formValidation.ts.
const props = defineProps<{
  state: Record<string, any>;
  /** Prepended to the field names, e.g. "directus_users__" */
  prefix?: string;
}>();

const { t, locale } = useI18n();
const key = (name: string) => `${props.prefix ?? ""}${name}`;

// The ISO code is stored; the label is the country name in the UI language.
const countryOptions = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: "region" });
  const options = COUNTRY_CODES.map((code) => ({
    label: names.of(code) ?? code,
    value: code,
  }));
  const isDefault = (o: { value: string }) => o.value === DEFAULT_COUNTRY_CODE;
  return [
    ...options.filter(isDefault),
    ...options
      .filter((o) => !isDefault(o))
      .sort((a, b) => a.label.localeCompare(b.label, locale.value)),
  ];
});

const textFields = [
  { name: "memberships_street", label: "Street", required: true },
  { name: "memberships_streetnumber", label: "Number", required: true },
  { name: "memberships_stair", label: "Stair", required: false },
  { name: "memberships_door", label: "Door", required: false },
  { name: "memberships_postcode", label: "Postcode", required: true },
  { name: "memberships_city", label: "City", required: true },
];
</script>

<template>
  <div class="grid md:grid-cols-2 gap-4">
    <FormsFormGroup
      :label="t('Country')"
      :name="key('memberships_country')"
      required
    >
      <USelectMenu
        variant="outline"
        class="w-full"
        v-model="props.state[key('memberships_country')]"
        :items="countryOptions"
        value-key="value"
        :placeholder="t('Select country')"
      />
    </FormsFormGroup>
    <!-- Keeps the second column of the country row empty -->
    <div class="hidden md:block" />
    <FormsFormGroup
      v-for="field in textFields"
      :key="field.name"
      :label="t(field.label)"
      :name="key(field.name)"
      :required="field.required"
    >
      <UInput variant="outline" v-model="props.state[key(field.name)]" />
    </FormsFormGroup>
  </div>
</template>

<i18n lang="yaml">
de:
  "Country": "Land"
  "Select country": "Land auswählen"
  "Street": "Straße"
  "Number": "Hausnummer"
  "Stair": "Stiege"
  "Door": "Tür"
  "Postcode": "Postleitzahl"
  "City": "Stadt"
</i18n>
