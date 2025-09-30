<script setup lang="ts">
import { bool, object, string, type InferType } from "yup";
import type { FormSubmitEvent } from "#ui/types";
import { marked } from "marked";

definePageMeta({
  middleware: ["auth"],
});

const { t } = useI18n();
setPageTitle(t("Soli-Topf Test"), {
  backLink: "/solitopf",
  backLinkLabel: t("Zurück zu den Soli-Topf Infos"),
});
</script>

<template>
  <BetaMessage />
  <div class="flex flex-col gap-3" v-html="marked(t('t_test'))"></div>
  <UButton class="mt-4" to="/solitopf" color="purple">
    {{ t("Zurück zu den Soli-Topf Infos") }}
  </UButton>
</template>

<i18n lang="yaml">
de:
  t_test: |
    Mit diesen Fragen kannst du überlegen, ob der Soli-Topf etwas für dich ist. 
    Niemand sieht deine Antworten – sie helfen nur dir zur Orientierung. 

    **Hast du genug Geld, um bei MILA regelmäßig gut einzukaufen?**

    **→ Weiß nicht?**
    Dann frag dich:

    **Hast du im Monat weniger als 1.661  € zum Leben (für Miete, Essen, Freizeit …)?**  
    *(Je nach Haushaltsgröße erhöht sich die Grenze:  
     + 50 % für jede weitere Person ab 14 Jahren → ~ + 830 €  
     + 30 % für jedes Kind unter 14 Jahren → ~ + 498 € pro Kind unter 14 Jahren)*

    **→ Nein?**  
    Dann brauchst du wahrscheinlich keine Unterstützung 
    – aber wenn sich etwas ändert, kannst du dich jederzeit melden.

    **→ Ja?**  
    Dann frag dich weiter:

    **Kannst du dir ohne große finanzielle Sorgen das ganze Monat gutes und gesundes Essen leisten?**

    **→ Ja?**   
    Dann brauchst du vielleicht momentan keine Unterstützung 
    – melde dich bei Bedarf.

    **→ Nein?**  
    Dann weiter:

    **Kannst du dir ohne große finanzielle Sorgen einem\*r Freund\*in Geld borgen?**

    **→ Ja?**   
    Auch das ist ein gutes Zeichen 
    – aber wenn sich etwas verschlechtert, ist der Soli-Topf für dich da.

    **→ Nein?**  
    Dann weiter:

    **Könntest du dir ohne große finanzielle Sorgen eine neue Waschmaschine kaufen oder die Reparatur bezahlen, wenn deine heute kaputt geht?**

    **→ Nein?**  
    Dann kannst du Geld aus dem Soli-Topf bekommen!
en:
  t_test: |
    These questions can help you decide whether the Solidarity Fund is right for you. 
    No one will see your answers – they are only for your own guidance. 

    **Do you have enough money to shop for good quality food regularly at MILA?**

    **→ Not sure?**  
    Then ask yourself:

    **Do you have less than €1,661 per month to cover your living expenses (rent, food, leisure activities, etc.)?**
    *(Depending on household size, the limit increases:
    + 50% for each additional person aged 14 or older → approx. + €830
    + 30% for each child under 14 → approx. + €498 per child under 14)*

    **→ No?**  
    Then you probably don't need any support
    – but if your situation changes, you can contact us at any time. 

    **→ Yes?**  
    Then ask yourself again:

    **Can you afford good, healthy food every day of the month without worrying about finances?**

    **→ Yes?**  
    Then you might not need support at the moment
    – contact us if your situation changes. 

    **→ No?**  
    Then continue:

    **Can you lend money to a friend without worrying about your finances?**

    **→ Yes?**  
    That's a good sign as well
    – but if your situation worsens, the Solidarity Fund is there for you. 

    **→ No?**  
    Then continue:

    **Could you afford to buy a new washing machine or pay for repairs if yours broke down?**

    **→ No?**  
    Then you can receive financial support from the Solidarity Fund!
</i18n>
