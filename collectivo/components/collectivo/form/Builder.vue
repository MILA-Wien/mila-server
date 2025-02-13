<script setup lang="ts">
import {
  object,
  string,
  number,
  array,
  boolean,
  type InferType,
  type Schema as YupSchema,
  date,
} from "yup";
import type { FormErrorEvent, FormSubmitEvent } from "#ui/types";
import { parse } from "marked";
import { electronicFormatIBAN, isValidIBAN } from "ibantools";

const europeanIBAN = [
  "AD",
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GI",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MC",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
];

const user = useCurrentUser();
const toast = useToast();
const { t } = useI18n();
const debug = useRuntimeConfig().public.debug;
const state: { [key: string]: any } = reactive({});
let schema = object();

function prepareHTML(html: string) {
  return (parse(t(html)) as string).replace(/<a /g, "<a target='_blank' ");
}

const props = defineProps({
  fields: Object as PropType<CollectivoFormField[]>,
  data: Object as PropType<Record<string, any>>,
  submit: Function as PropType<(data: any) => Promise<void>>,
  submitLabel: String,
});

const form = { fields: props.fields ?? [] };
const loading = ref(false);

form.fields.sort((a, b) => a.order - b.order);

function checkConditions(conditions: FormCondition[] | undefined) {
  if (!conditions) {
    return true;
  }

  for (const condition of conditions) {
    if (condition.type == "authenticated") {
      return user.value.isAuthenticated;
    } else if (condition.type == "notAuthenticated") {
      return !user.value.isAuthenticated;
    } else if (state[condition.key] !== condition.value) {
      return false;
    }
  }

  return true;
}

// Compute visibility of fields
for (const field of form.fields) {
  if (field.conditions) {
    field._visible = computed(() => {
      return checkConditions(field.conditions);
    });
  }
}

function addInputToSchema(
  key: string,
  input: CollectivoFormInput,
  schema_field: YupSchema,
) {
  if (input.required) {
    if (input.type === "checkbox") {
      schema_field = schema_field.test(
        "checkbox",
        "This field is required",
        (value) => {
          return value === true;
        },
      );
    } else {
      schema_field = schema_field.required("This field is required");
    }
  }

  // Create a conditional schema field
  // If the condition is met, use the original schema field
  // If the condition is not met, use a hidden schema field
  if (input.conditions && input.conditions.length > 0) {
    const schema_field_with_conditions = object().when(
      input.conditions.map((c) => c.key ?? c.type),

      (_, schema_field_hidden) => {
        if (checkConditions(input.conditions)) {
          return schema_field;
        } else {
          return schema_field_hidden.strip();
        }
      },
    );

    schema = schema.shape({ [key]: schema_field_with_conditions });
  } else {
    schema = schema.shape({ [key]: schema_field });
  }
}

function valIban(value: string, context: any, state: { [key: string]: any }) {
  const iban = electronicFormatIBAN(value);
  state[context.path] = iban;

  if (iban && europeanIBAN.includes(iban.substring(0, 2))) {
    return isValidIBAN(iban || "");
  }

  return false;
}

function valString(validators: FormValidator[] | undefined) {
  let schema = string();

  for (const validator of validators ?? []) {
    if (validator.type === "min") {
      schema = schema.min(validator.value as number);
    } else if (validator.type === "max") {
      schema = schema.max(validator.value as number);
    } else if (validator.type === "email") {
      schema = schema.email("This email address is not valid");
    } else if (validator.type === "url") {
      schema = schema.url();
    } else if (validator.type === "regex") {
      schema = schema.matches(validator.value as RegExp);
    } else if (validator.type === "iban") {
      schema = schema.test(
        "iban",
        "IBAN not valid for SEPA",
        (value, context) => {
          return valIban(value, context, state);
        },
      );
    }
    // else if (validator.type === "transform") {
    //   const transformer = customValidators.transformers[validator.value];
    //   schema = schema.transform(transformer);
    // }
  }

  return schema;
}

function valNumber(validators: FormValidator[] | undefined) {
  let schema = number();

  for (const validator of validators ?? []) {
    if (validator.type === "min") {
      schema = schema.min(
        validator.value as number,
        (x) => t("Minimum value") + `: ${x.min}`,
      );
    } else if (validator.type === "max") {
      schema = schema.max(
        validator.value as number,
        (x) => t("Maximum value") + `: ${x.max}`,
      );
    }
  }

  return schema;
}

function valDate(validators: FormValidator[] | undefined) {
  let schema = date();

  for (const validator of validators ?? []) {
    if (validator.type === "min") {
      schema = schema.min(validator.value as number);
    } else if (validator.type === "max") {
      schema = schema.max(validator.value as number);
    }
  }

  return schema;
}

// Define state and schema from form object
for (const input of form.fields) {
  // Skip layout elements
  if (!("key" in input)) {
    continue;
  }

  if (
    input.type === "text" ||
    input.type === "textarea" ||
    input.type === "password"
  ) {
    addInputToSchema(input.key, input, valString(input.validators));
  } else if (input.type === "email") {
    input.validators = input.validators ?? [];
    input.validators.push({ type: "email" });
    addInputToSchema(input.key, input, valString(input.validators));
  } else if (input.type === "date") {
    addInputToSchema(input.key, input, valDate(input.validators));
  } else if (input.type === "number") {
    addInputToSchema(input.key, input, valNumber(input.validators));
  } else if (input.type === "select") {
    if (input.multiple) {
      addInputToSchema(input.key, input, array());
    } else {
      addInputToSchema(input.key, input, valString(input.validators));
    }
  } else if (input.type === "checkbox") {
    addInputToSchema(input.key, input, boolean());
  }

  // Add passed data or default value to field
  if (props.data?.[input.key]) {
    if (input.type === "date") {
      state[input.key] = new Date(props.data[input.key]);
    } else {
      state[input.key] = props.data[input.key];
    }
  } else if ("default" in input && input.default) {
    state[input.key] = input.default;
  }
}

type Schema = InferType<typeof schema>;

// Form handlers
async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;
  await props.submit!(event.data);
  loading.value = false;
}

async function onError(event: FormErrorEvent) {
  toast.add({
    title: t("Some fields are not filled in correctly"),
    icon: "i-heroicons-exclamation-triangle",
    color: "red",
    timeout: 0,
  });

  const element = document.getElementById(event.errors[0].id);
  element?.focus();
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Debug tools
async function fillOutAll() {
  for (const input of form.fields) {
    if (input.type === "select" && input.choices) {
      if (input.multiple) {
        state[input.key] = [input.choices[0].value];
      } else {
        state[input.key] = input.choices[0].value;
      }
    } else if (input.type === "email") {
      state[input.key] = "test@example.com";
    } else if (input.type === "checkbox") {
      state[input.key] = true;
    } else if (input.type === "date") {
      state[input.key] = new Date();
    } else if ("key" in input) {
      state[input.key] = "test";
    }
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="cv-form flex flex-wrap w-full"
    @submit="onSubmit"
    @error="onError"
  >
    <template v-for="(input, i) in form.fields" :key="i">
      <template v-if="input._visible ?? true">
        <div
          v-if="input.type === 'section'"
          class="form-field-lg mt-10 first:mt-0"
        >
          <h2 v-if="input.title">
            {{ t(input.title) }}
          </h2>
          <div
            v-if="input.description"
            class="leading-5 py-2 md-description"
            v-html="prepareHTML(input.description)"
          />
        </div>
        <div v-else-if="input.type === 'description'" class="form-field-lg">
          <UFormGroup :label="input.label ? t(input.label) : undefined">
            <div v-if="input.boxed" class="form-box text-sm">
              {{ t(input.description) }}
            </div>
            <div
              v-else
              class="md-description md-small"
              v-html="prepareHTML(input.description)"
            />
          </UFormGroup>
        </div>
        <component
          :is="input.component"
          v-else-if="input.type === 'custom-layout'"
          :class="input.width ? `form-field-${input.width}` : 'form-field-lg'"
          :input="input"
          :state="state"
        />
        <div v-else-if="input.type === 'clear'" class="basis-full" />
        <div
          v-else
          :class="input.width ? `form-field-${input.width}` : 'form-field-md'"
        >
          <UFormGroup
            :label="input.label ? t(input.label) : undefined"
            :required="input.required"
            :description="input.description ? t(input.description) : undefined"
            :name="input.key"
          >
            <template #description>
              <div
                v-if="input.description"
                class="md-description md-small"
                v-html="prepareHTML(input.description)"
              />
            </template>
            <template #error="{ error }">
              <div v-if="error && typeof error === 'string'">
                {{ t(error) }}
              </div>
            </template>
            <template v-if="input.type === 'text'">
              <UInput
                v-model="state[input.key]"
                :placeholder="input.placeholder"
                :disabled="input.disabled"
              >
                <template v-if="input.icon" #trailing>
                  <UIcon :name="input.icon" />
                </template>
              </UInput>
            </template>
            <template v-else-if="input.type === 'email'">
              <UInput
                v-model="state[input.key]"
                :placeholder="input.placeholder"
              >
                <template v-if="input.icon" #trailing>
                  <UIcon :name="input.icon" />
                </template>
              </UInput>
            </template>
            <template v-else-if="input.type === 'password'">
              <UInput
                v-model="state[input.key]"
                type="password"
                :placeholder="input.placeholder"
                :disabled="input.disabled"
              >
                <template v-if="input.icon" #trailing>
                  <UIcon :name="input.icon" />
                </template>
              </UInput>
            </template>
            <template v-else-if="input.type === 'number'">
              <UInput
                v-model="state[input.key]"
                type="number"
                :placeholder="input.placeholder"
                :disabled="input.disabled"
              />
            </template>
            <template v-if="input.type === 'textarea'">
              <UTextarea
                v-model="state[input.key]"
                resize
                :placeholder="input.placeholder"
                :disabled="input.disabled"
              />
            </template>
            <template v-else-if="input.type === 'select'">
              <!-- Single choice -->
              <template v-if="!input.multiple">
                <template v-if="!input.expand">
                  <USelectMenu
                    v-model="state[input.key]"
                    :options="input.choices"
                    :disabled="input.disabled"
                    value-attribute="value"
                  >
                    <template #label>{{
                      t(
                        input.choices?.find(
                          (choice) => choice.value === state[input.key],
                        )?.label ?? "",
                      )
                    }}</template>
                    <template #option="{ option }">{{
                      t(option.label)
                    }}</template>
                  </USelectMenu>
                </template>
                <!-- Expanded single choice (radio buttons) -->
                <template v-else>
                  <URadioGroup
                    v-model="state[input.key]"
                    :options="input.choices"
                    :disabled="input.disabled"
                  >
                    <template #label="{ option }">{{
                      t(option.label)
                    }}</template>
                  </URadioGroup>
                </template>
              </template>

              <!-- Multiple choice -->
              <template v-else>
                <CollectivoFormCheckboxGroup
                  v-model="state[input.key]"
                  :choices="input.choices"
                />
              </template>
            </template>
            <template v-else-if="input.type === 'date'">
              <CollectivoFormDatePicker
                v-if="input.useDatePicker"
                v-model="state[input.key]"
              />
              <CollectivoFormDate
                v-else
                v-model="state[input.key]"
                :max-years-future="input.maxYearsFuture"
                :max-years-past="input.maxYearsPast"
                :disabled="input.disabled"
              />
            </template>
            <template v-else-if="input.type === 'checkbox'">
              <div class="form-box flex flex-row">
                <UToggle
                  v-model="state[input.key]"
                  :disabled="input.disabled"
                  class="mt-0.5 mr-2"
                />
                <span
                  v-if="input.content"
                  class="md-description md-small"
                  v-html="prepareHTML(input.content)"
                />
              </div>
            </template>
            <template v-else-if="input.type === 'custom-input'">
              <component :is="input.component" v-model="state[input.key]" />
            </template>
          </UFormGroup>
        </div>
      </template>
    </template>
    <div class="basis-full" />
    <div class="form-field mt-2 w-full">
      <UButton
        v-if="props.submit"
        class="btn w-full"
        variant="solid"
        color="green"
        size="lg"
        icon="i-heroicons-check-16-solid"
        :loading="loading"
        type="submit"
      >
        {{ t(submitLabel ?? "Submit") }}
      </UButton>
    </div>
  </UForm>
  <div v-if="debug" class="mx-2 my-10 p-6 bg-slate-100 flex flex-col gap-2">
    <div>
      <h3>Debug Tools</h3>
      <p>You are seeing this because NUXT_PUBLIC_DEBUG=True</p>
    </div>
    <div>
      <UButton class="btn" @click="fillOutAll">
        {{ t("Fill out all") }}
      </UButton>
    </div>
    <h4>Form state</h4>
    <div class="text-sm">{{ state }}</div>
  </div>
</template>

<style lang="scss" scoped>
:deep(.md-small > p) {
  @apply text-sm;
}

:deep(.md-description > p > a) {
  @apply font-bold;
}
.form-box {
  @apply bg-blue-50 shadow-sm  px-4 py-3 flex flex-row gap-2;
}

.form-field {
  @apply py-2 pr-4;
}

.form-field-lg {
  @apply form-field basis-full;
}

.form-field-md {
  @apply form-field basis-full md:basis-1/2;
}

.form-field-sm {
  @apply form-field basis-1/2 md:basis-1/4;
}
</style>
