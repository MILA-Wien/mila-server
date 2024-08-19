<script setup lang="ts">
const form = useMembershipsRegistrationForm();
const { t } = useI18n();
const user = useCollectivoUser();
setCollectivoTitle(form.value.title);
const showForm = ref(false);
const alreadyMemberError = ref(false);
const data: any = ref({});

async function prepare() {
  if (user.value.user) {
    data.value["directus_users__first_name"] = user.value.user!["first_name"];
    data.value["directus_users__last_name"] = user.value.user!["last_name"];

    data.value["directus_users__memberships_person_type"] =
      user.value.user!["memberships_person_type"];
  }
  if (user.value.membership) {
    alreadyMemberError.value = true;
  } else {
    showForm.value = true;
  }
}

prepare();
</script>

<template>
  <div>
    <div v-if="alreadyMemberError">
      {{ t("t:memberships_form_already_member") }}
    </div>
    <CollectivoFormPage v-if="showForm" :form="form" :data="data">
      <template #success>
        <div class="flex flex-col items-center justify-center space-y-4">
          <UIcon
            name="i-heroicons-check-16-solid"
            class="w-[64px] h-[64px] text-primary"
          />
          <h1 class="text-2xl font-bold text-center">
            {{ t(form.successTitle ?? "Application submitted!") }}
          </h1>
          <div
            v-if="user.isAuthenticated"
            class="flex flex-col items-center justify-center space-y-4"
          >
            <NuxtLink to="/">
              <UButton size="md">{{ t("Home") }}</UButton>
            </NuxtLink>
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center space-y-4"
          >
            <p class="text-center">
              {{ t(form.successText ?? "t:memberships_form_success") }}
            </p>
            <UButton
              icon="i-heroicons-arrow-right-end-on-rectangle-16-solid"
              size="md"
              @click="user.login()"
              >{{ t("Login") }}</UButton
            >
          </div>
        </div>
      </template>
    </CollectivoFormPage>
  </div>
</template>
