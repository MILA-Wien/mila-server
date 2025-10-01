<script setup lang="ts">
import { marked } from "marked";

definePageMeta({
  middleware: ["auth"],
});
const { t } = useI18n();
setPageTitle(t("Solidaritäts-Topf"), {
  backLinkLabel: t("Zurück zur Startseite"),
  backLink: "/",
});

const { data: meldungen } = await useFetch("/api/solitopf/bedarf");
</script>

<template>
  <BetaMessage />
  <h2>{{ t("Wie funktioniert der Soli-Topf?") }}</h2>
  <div class="flex flex-col gap-3" v-html="marked(t('t_soli_1'))"></div>
  <SectionDivider />
  <div class="flex flex-col gap-3" v-if="meldungen && meldungen.length > 0">
    <h2>{{ t("Meine Soli-Topf Anfragen") }}</h2>
    <div class="flex flex-col gap-2">
      <div
        v-for="meldung in meldungen"
        :key="meldung.id"
        class="border-black border-2 p-3"
      >
        <p>
          <strong>{{ t("Datum:") }}</strong>
          {{ new Date(meldung.date_created).toLocaleDateString("de-AT") }}
        </p>
        <p>
          <strong>{{ t("Anfrage:") }}</strong>
          {{
            meldung.auszahlung === "v300a1"
              ? t("Einmalig 300 €")
              : t("50 € pro Monat für 6 Monate")
          }}
        </p>
        <p v-if="meldung.weitere_unterstuetzung">
          <strong>{{ t("Weitere Unterstützung gewünscht:") }}</strong>
          {{ t("Ja") }}
        </p>
        <p v-else>
          <strong>{{ t("Weitere Unterstützung gewünscht:") }}</strong>
          {{ t("Nein") }}
        </p>
        <p v-if="meldung.status">
          <strong>{{ t("Status:") }}</strong> {{ t("s_" + meldung.status) }}
        </p>
        <p v-if="meldung.anmerkung">
          <strong>{{ t("Anmerkung:") }}</strong> {{ meldung.anmerkung }}
        </p>
      </div>
    </div>
  </div>

  <SectionDivider />

  <CollectivoCard color="green">
    <h3>
      {{ t("Kann ich Geld aus dem Soli-Topf bekommen?") }}
    </h3>
    <p class="pb-3">
      {{ t("t_soli_2") }}
    </p>
    <UButton to="/solitopf/test" color="green" icon="i-heroicons-arrow-right">
      {{ t("Zum Test") }}
    </UButton>
  </CollectivoCard>

  <CollectivoCard color="purple">
    <h3>
      {{ t("Ich brauche Geld aus dem Soli-Topf") }}
    </h3>
    <p class="pb-3">
      {{
        t(
          "Du hast den Test gemacht – oder weißt einfach: Ich brauche gerade Geld, um bei MILA einzukaufen? Dann kannst du das hier beantragen.",
        )
      }}
    </p>
    <SolitopfFormButton />
  </CollectivoCard>

  <CollectivoCard color="orange">
    <h3>
      {{ t("Für den Soli-Topf spenden") }}
    </h3>
    <div class="flex flex-col gap-3" v-html="marked(t('t_donate'))"></div>
  </CollectivoCard>
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
  "s_warteliste": "Warteliste"
  t_soli_1: |
    Mit dem Soli-Topf können auch Mitglieder mit wenig Geld bei MILA einkaufen. 
    Wenn dein Geld gerade nicht reicht, um bei MILA regelmäßig einzukaufen, kannst du das einfach und vertraulich melden.

    Du bekommst **50 € pro Monat für 6 Monate** oder **300 € einmalig**.
    Das Geld wird auf deine MILA-Mitgliedskarte geladen. Nach den 6 Monaten kannst du dich wieder melden.

    **Das Ziel:**  
    Alle Mitglieder sollen bei MILA gut und gesund einkaufen können – egal wie viel Geld sie haben.

    **Warum gibt es den Soli-Topf?**  
    Für einige Mitglieder sind die Lebensmittel bei MILA zu teuer. 
    Sie verdienen zu wenig und können nicht ohne Sorgen einkaufen. 
    Der Soli-Topf ist ein solidarischer Ausgleich innerhalb der Genossenschaft. 
    Andere Mitglieder und Unterstützer*innen mit mehr Geld spenden freiwillig für den Soli-Topf. 
    Der MILA-Verein verteilt das Geld aus dem Soli-Topf. 

    **Was passiert, wenn nicht genug im Topf ist?**  
    Dann gibt es eine Warteliste. Geld aus dem Soli-Topf wird nur vergeben, wenn genug vorhanden ist.
  t_soli_2: |
    Mit diesen Fragen kannst du überlegen, ob der Soli-Topf etwas für dich ist. 
    Niemand sieht deine Antworten – sie helfen nur dir zur Orientierung.
  t_donate: |
    Ob du deinen Lottogewinn, eine Erbschaft oder 5 € im Monat mit
    MILA-Mitgliedern teilen willst – jeder Beitrag zählt. 
    Der Soli-Topf lebt davon, dass viele etwas geben. 

    **So kannst du spenden:**  
    1: Spenden im Supermarkt: Bargeld oder Pfandbons am Empfang in den Soli-Topf   
    2: Direkte Überweisung als Einmalspende oder Dauerauftrag auf das Spendenkonto:

    **Konto:** MILA Soli-Topf  
    **IBAN:** AT25 2011 1843 5980 0801  
    **BIC:** GIBAATWWXXX  

    Du möchtest dich bei der Organisation des Soli-Topfs einbringen? Schreib uns
    an **solitopf{'@'}mila.wien**.
en:
  "Solidaritäts-Topf": "Solidarity Fund"
  "Zurück zur Startseite": "Back to homepage"
  "Wie funktioniert der Soli-Topf?": "How does the solidarity fund work?"
  "Meine Soli-Topf Anfragen": "My solidarity fund requests"
  "Datum": "Date"
  "Anfrage": "Request"
  "Einmalig 300 €": "One-time 300 €"
  "50 € pro Monat für 6 Monate": "50 € per month for 6 months"
  "Weitere Unterstützung gewünscht:": "Further support requested:"
  "Status:": "Status:"
  "Anmerkung:": "Note:"
  "s_warteliste": "Waiting list"
  "Ja": "Yes"
  "Nein": "No"
  "Kann ich Geld aus dem Soli-Topf bekommen?": "Can I get money from the solidarity fund?"
  "Zum Test": "To the test"
  "Ich brauche Geld aus dem Soli-Topf": "I need money from the solidarity fund"
  "Für den Soli-Topf spenden": "Donate to the solidarity fund"
  "Du hast den Test gemacht – oder weißt einfach: Ich brauche gerade Geld, um bei MILA einzukaufen? Dann kannst du das hier beantragen.": "You have taken the test – or simply know: I currently need money to shop at MILA? Then you can apply here."
  "Du bist bereits auf der Warteliste": "You are already on the waiting list"
  "Zum Formular": "To the form"
  t_soli_1: |
    The solidarity fund allows members with limited financial resources to shop at MILA. 
    If you are currently unable to afford regular shopping at MILA, you can easily and confidentially apply for assistance.

    You will receive either **€50 per month for 6 months** or **€300 as a one-time payment**.
    The money will be credited to your MILA membership card. After the 6 months, you can apply again.

    **Our goal:**  
    All members should be able to shop for good, healthy food at MILA – regardless of their income.

    **Why does the solidarity fund exist?**  
    For some members, the prices of groceries at MILA are too high. 
    They earn too little and cannot shop without worrying about their budget. 
    The solidarity fund is a way for the cooperative to support each other. 
    Other members and supporters with more resources voluntarily donate to the fund. 
    The MILA-Verein distributes the funds from the solidarity fund.

    **What happens if there isn't enough money in the fund?**  
    Then there will be a waiting list. Funds from the solidarity fund are only distributed when sufficient funds are available.
  t_soli_2: |
    Mit diesen Fragen kannst du überlegen, ob der Soli-Topf etwas für dich ist. 
    Niemand sieht deine Antworten – sie helfen nur dir zur Orientierung.
  t_donate: |
    Whether you want to share your lottery winnings, an inheritance, or just €5 a month with MILA members – every contribution counts. 
    The solidarity fund relies on many people giving something, no matter how small.

    **Here's how you can donate:**
    1: Donate at the supermarket: Leave cash or deposit vouchers at the reception desk for the solidarity fund.  
    2: Make a direct bank transfer as a one-time donation or set up a recurring payment to the donation account:

    **Account:** MILA Solidarity Fund
    **IBAN:** ​​AT25 2011 1843 5980 0801
    **BIC:** GIBAATWWXXX

    Interested in getting involved with organizing the solidarity fund? Email us at **solitopf{'@'}mila.wien**.
</i18n>
