<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <UApp>
    <RouterView v-if="route.meta.public || route.meta.print" />
    <AppLayout v-else>
      <RouterView />
    </AppLayout>
  </UApp>
</template>
