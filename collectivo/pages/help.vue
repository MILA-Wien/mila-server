<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});

const appConfig = useAppConfig();
const config = useRuntimeConfig();

const { t } = useI18n();
setPageTitle(t("You have questions?"));
</script>

<template>
  <div class="flex flex-col gap-5">
    <CollectivoCard>
      <h2>{{ t("Handbook") }}</h2>
      <p class="mb-3">
        {{
          t("Here you can find guides and information about our cooperative.")
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <a
          href="https://handbuch.mila.wien/books/mitglieder-handbuch"
          target="_blank"
        >
          <UButton>{{ t("Open handbook") }}</UButton>
        </a>
        <!-- <a href="https://handbuch.mila.wien/books/it-handbuch" target="_blank">
        <UButton>{{ t("IT Handbook") }}</UButton>
      </a> -->
      </div>
    </CollectivoCard>
    <CollectivoCard>
      <h2>{{ t("Membership office") }}</h2>
      <p class="mb-3">
        {{ t("You can reach us via email under") }}
        <a :href="`mailto:${config.public.contactEmail}`">
          <span class="font-bold">
            {{ config.public.contactEmail }}
          </span>
        </a>
        {{ t("or via phone under") }}
        <a :href="appConfig.mila.supportNumberLink" class="font-bold">
          {{ appConfig.mila.supportNumber }} </a
        >.
        {{
          t(
            "Otherwise you can also come talk to us in Person every Tuesday from 16:00 - 19:00 at the MILA Minimarkt (Krichbaumgasse 25, Innenhof, 1120 Wien).",
          )
        }}
      </p>
      <div class="flex flex-wrap gap-4">
        <a :href="`mailto:${config.public.contactEmail}`">
          <UButton>{{ t("Write an email") }}</UButton>
        </a>
        <a :href="appConfig.mila.supportNumberLink">
          <UButton>{{ t("Call us") }}</UButton>
        </a>
      </div>
    </CollectivoCard>
  </div>
</template>

<i18n lang="yaml">
de:
  Here you can find guides and information about our cooperative.: Hier findest du Anleitungen und Informationen über unsere Genossenschaft.
  Otherwise you can also come talk to us in Person every Tuesday from 16:00 - 19:00 at the MILA Minimarkt (Krichbaumgasse 25, Innenhof, 1120 Wien).: Ansonsten kannst du uns auch jeden Dienstag von 16:00 - 19:00 im MILA Minimarkt (Krichbaumgasse 25, Innenhof, 1120 Wien) persönlich erreichen.
  Open handbook: Handbuch öffnen
  Membership office: Mitgliederbüro
  You can reach us via email under: Du erreichst uns per E-Mail unter
  or via phone under: oder telefonisch unter
  Write an email: E-Mail schreiben
  Call us: Anrufen
  Members Handbook: Mitgliederhandbuch
  IT Handbook: IT-Handbuch
  Guides and information: Anleitungen und Informationen
</i18n>
