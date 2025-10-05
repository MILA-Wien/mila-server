<script lang="ts" setup>
const props = defineProps<{
  mship: any;
  settingsState: any;
  holidaysCurrent: any;
}>();

const { t } = useI18n();

const statusColor = ref<string>("green");
const canShop = ref(false);

function setColor() {
  if (!props.settingsState.shift_point_system) {
    statusColor.value = "green";
    canShop.value = true;
    return;
  }

  if (props.mship.shifts_user_type == "exempt") {
    statusColor.value = "pink";
    canShop.value = true;
    return;
  }

  if (props.mship.shifts_user_type == "inactive") {
    statusColor.value = "red";
    canShop.value = false;
    return;
  }

  const isOnHoliday = props.holidaysCurrent.length > 0;
  if (isOnHoliday) {
    statusColor.value = "blue";
    canShop.value = false;
  }

  if (props.mship.shifts_counter < 0) {
    statusColor.value = "orange";
  }

  if (props.mship.shifts_counter <= -28) {
    statusColor.value = "red";
    canShop.value = false;
  }
}

setColor();
</script>

<template>
  <CollectivoCardNew :color="statusColor">
    <div>
      <template v-if="!settingsState.shift_point_system">
        {{ t("Shopping is allowed") }}
      </template>

      <template v-else>
        <p v-if="mship.shifts_user_type == 'inactive'">
          {{ t("Your membership is currently inactive.") }}<br />
          {{
            t(
              "Please contact the membership office if you want to change your status.",
            )
          }}
        </p>

        <p v-else-if="mship.shifts_user_type == 'exempt'">
          {{ t("You are exempt from shift work.") }}<br />
          {{ t("You can nonetheless sign up for shifts if you want.") }}
        </p>

        <span v-else-if="holidaysCurrent.length > 0">
          {{ t("You have a holiday registered at the moment.") }}<br />
          {{ t("You cannot go shopping during this time.") }}
        </span>

        <p v-else-if="mship.shifts_counter >= 0">
          {{ t("Your membership is active. Thank you for your contribution!") }}
          <br />
          {{ t("Please do your next shift latest in") }}:
          <span v-if="mship.shifts_counter >= 1">
            {{ mship.shifts_counter }} {{ t("days") }}
          </span>
          <span v-else-if="mship.shifts_counter == 1"> 1 {{ t("day") }} </span>
        </p>

        <p v-else-if="mship.shifts_counter > -28">
          {{ t("You are") }}
          {{ -mship.shifts_counter }}
          {{ t("days late to do your next shift.") }}
          <br />
          {{ t("Your membership will be frozen in") }}:
          {{ 28 + mship.shifts_counter }} {{ t("days") }}.
        </p>

        <p v-else-if="mship.shifts_counter <= -28">
          {{ t("You are more than 4 weeks late to do your next shift.") }}
          <br />
          {{
            t("Please sign up for a shift or contact the membership office.")
          }}
        </p>
      </template>
    </div>
  </CollectivoCardNew>
</template>

<i18n lang="yaml">
de:
  "Shift": "Schicht"
  "Shift calendar": "Schichtkalender"
  "My status": "Mein Status"
  "You can go shopping": "Du kannst einkaufen gehen"
  "My shifts": "Meine Schichten"
  "My holidays": "Meine Urlaube"
  "My recent activities": "Meine letzten Aktivitäten"
  "Logbook": "Logbuch"
  "My assignments": "Meine Anmeldungen"
  "My signouts": "Meine Abmeldungen"
  "Next shift required in": "Nächste Schicht erforderlich in"
  "Your membership will be frozen in": "Deine Mitgliedschaft wird eingefroren in"
  "You are": "Du bist"
  "days late to do your next shift.": "Tage zu spät, um deine nächste Schicht zu machen."
  "You are more than 4 weeks late to do your next shift.": "Du bist mehr als 4 Wochen zu spät, um deine nächste Schicht zu machen."
  "Please sign up for a shift or contact the membership office.": "Bitte melde dich für eine Schicht an oder kontaktiere das Mitgliederbüro."
  "You have a holiday registered at the moment.": "Du hast aktuell einen Urlaub eingetragen."
  "You cannot go shopping during this time.": "Du kannst in dieser Zeit nicht einkaufen gehen."
  "You are exempt from shift work.": "Du bist von der Schichtarbeit befreit."
  "Please do your next shift latest in": "Bitte mache deine nächste Schicht spätestens in"
  "Your membership is active. Thank you for your contribution!": "Deine Mitgliedschaft ist aktiv. Danke für deinen Beitrag!"
  "You can nonetheless sign up for shifts if you want.": "Du kannst dich trotzdem für Schichten anmelden, wenn du möchtest."
  "Your membership is currently inactive.": "Deine Mitgliedschaft ist derzeit inaktiv."
  "Please contact the membership office if you want to change your status.": "Bitte kontaktiere das Mitgliederbüro, wenn du deinen Status ändern möchtest."
  "days": "Tagen"
  "Timespan": "Zeitraum"
  "to": "bis"
  "Shifts Overview": "Schichten Übersicht"
  "Register shift": "Schicht anmelden"
  "Submit holiday": "Urlaub eintragen"
</i18n>
