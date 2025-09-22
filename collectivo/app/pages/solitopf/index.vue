<script setup lang="ts">
definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Solidaritäts-Topf"), {
  backLinkLabel: t("Zurück zur Startseite"),
  backLink: "/",
});

const { data: meldungen } = await useFetch("/api/solitopf/bedarf");

const isWaiting = computed(
  () =>
    meldungen.value &&
    meldungen.value.some((meldung) => meldung.status === "warteliste"),
);
</script>

<template>
  <BetaMessage />
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <h2>Wie funktioniert der Soli-Topf?</h2>
      <h5>
        Der Solidaritäts-Topf hilft Mitgliedern mit wenig Geld, trotzdem bei
        MILA einkaufen zu können.
      </h5>
      <p>
        Wenn du Unterstützung brauchst, kannst du sie einfach und vertraulich
        beantragen. Das hilft auch unserer Genossenschaft und unseren
        Produzent*innen. Das Ziel: Allen Mitgliedern soll der Zugang zu gutem,
        gesundem Essen ermöglicht werden – unabhängig vom Einkommen.
      </p>
      <h5>Warum braucht es den Soli-Topf?</h5>
      <p>
        Trotz günstigeren Preisen bei MILA bleiben Lebensmittel für einige
        Mitglieder zu teuer. Nicht alle können genug verdienen, um ihren Einkauf
        ohne Sorge zu finanzieren. Der Soli-Topf ist ein solidarischer Ausgleich
        innerhalb der Genossenschaft – finanziert durch freiwillige Spenden
        anderer Mitglieder und verwaltet vom MILA-Verein. Die Spenden sind
        derzeit nicht steuerlich absetzbar.
      </p>
      <h5>Was passiert, wenn nicht genug im Topf ist?</h5>
      <p>
        Dann gibt es eine Warteliste. Unterstützung wird nur vergeben, wenn
        genügend Geld im Topf ist.
      </p>
    </div>

    <div class="flex flex-col gap-3" v-if="meldungen && meldungen.length > 0">
      <h2>Meine Soli-Topf Anträge</h2>
      <div class="flex flex-col gap-2">
        <div
          v-for="meldung in meldungen"
          :key="meldung.id"
          class="border-black border-2 p-3"
        >
          <p>
            <strong>Datum der Meldung:</strong>
            {{ new Date(meldung.date_created).toLocaleDateString("de-AT") }}
          </p>
          <p>
            <strong>Gewünschte Auszahlung:</strong>
            {{
              meldung.auszahlung === "v300a1"
                ? "300 € einmalig"
                : "50 € monatlich für 6 Monate"
            }}
          </p>
          <p v-if="meldung.weitere_unterstuetzung">
            <strong>Weitere Unterstützung gewünscht:</strong> Ja
          </p>
          <p v-else><strong>Weitere Unterstützung gewünscht:</strong> Nein</p>
          <p v-if="meldung.status">
            <strong>Status:</strong> {{ meldung.status }}
          </p>
          <p v-if="meldung.anmerkung">
            <strong>Anmerkung:</strong> {{ meldung.anmerkung }}
          </p>
        </div>
      </div>
    </div>

    <CollectivoCard
      class="flex flex-col gap-3"
      title="Kann ich Geld aus dem Soli-Topf bekommen?"
      color="green"
    >
      <p>
        Mit diesen Fragen kannst du überlegen, ob der Soli-Topf etwas für dich
        ist. Niemand sieht deine Antworten – sie helfen nur dir zur
        Orientierung.
      </p>
      <UButton
        to="https://mila.wien/solitopf"
        color="green"
        icon="i-heroicons-arrow-right"
        disabled
      >
        Zum Test (demnächst)
      </UButton>
    </CollectivoCard>

    <CollectivoCard
      class="flex flex-col gap-3"
      title="Ich brauche Geld aus dem Soli-Topf"
      color="purple"
    >
      <p>
        Du hast den Test gemacht – oder weißt einfach: Ich brauche gerade
        Unterstützung? Dann kannst du hier Geld aus dem Soli-Topf beantragen.
      </p>
      <UButton
        v-if="isWaiting"
        icon="i-heroicons-check"
        disabled
        color="purple"
      >
        Du bist bereits auf der Warteliste
      </UButton>
      <UButton
        v-else
        to="/solitopf/form"
        icon="i-heroicons-arrow-right"
        color="purple"
      >
        Unterstützung beantragen
      </UButton>
    </CollectivoCard>

    <CollectivoCard
      class="flex flex-col gap-3"
      title="Für den Soli-Topf spenden"
      color="orange"
    >
      <p>
        Ob du deinen Lottogewinn oder 5 € im Monat mit uns teilen willst – jeder
        Beitrag zählt. Der Soli-Topf lebt davon, dass viele etwas geben.
      </p>
      <UButton
        to="https://mila.wien/solitopf"
        icon="i-heroicons-arrow-right"
        color="orange"
        disabled
      >
        Zu den Spendeinfos (demnächst)
      </UButton>
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
  Guides and information: Anleitungen und Informationen
  You have questions?: Du hast Fragen?
</i18n>
