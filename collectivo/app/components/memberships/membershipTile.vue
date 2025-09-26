<script setup lang="ts">
const user = useCurrentUser();
</script>

<template>
  <div>
    <h2>Mitgliedschaft</h2>

    <div v-if="user.membership?.memberships_date_ended">
      <p>Deine Mitgliedschaft wurde beendet.</p>
    </div>
    <div v-if="user.isMember && user.membership">
      <p v-if="user.membership.memberships_date_approved">
        Beitrittsdatum:
        <span class="font-bold">
          {{ user.membership.memberships_date_approved }}
        </span>
      </p>
      <p>
        Mitgliedsnummer:
        <span class="font-bold">{{ user.membership.id }}</span>
      </p>
      <p>
        Mitgliedsart:
        <span class="font-bold">{{ user.membership.memberships_type }}</span>
      </p>
      <p>
        Genossenschafts-Anteile:
        <span class="font-bold">{{ user.membership.memberships_shares }}</span>
      </p>
    </div>
    <div v-else-if="user.membership?.memberships_status === 'applied'">
      <p>Dein Beitrittsantrag wird gerade bearbeitet.</p>
    </div>
    <div v-else>
      <p>Du bist noch kein Mitglied.</p>
      <UButton to="/register">Jetzt Mitglied werden</UButton>
    </div>
  </div>
</template>
