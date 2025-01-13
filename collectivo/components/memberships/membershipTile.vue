<script setup lang="ts">
const user = useCurrentUser();
</script>

<template>
  <div class="flex flex-col gap-2">
    <h2>Mitgliedschaft</h2>
    <div v-if="user.membership?.memberships_date_ended">
      <p>Deine Mitgliedschaft wurde beendet.</p>
    </div>
    <div v-if="user.isMember && user.membership">
      <p v-if="user.membership.memberships_date_approved">
        Du bist Mitglied seit:
        <span class="font-bold">
          {{ user.membership.memberships_date_approved }}
        </span>
      </p>
      <p>
        Deine Mitgliedsnummer ist:
        <span class="font-bold">{{ user.membership.id }}</span>
      </p>
      <p>
        Deine Mitgliedsart ist:
        <span class="font-bold">{{ user.membership.memberships_type }}</span>
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
