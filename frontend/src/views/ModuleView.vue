<template>
  <section class="module-view card-panel">
    <p class="eyebrow">{{ metaTitle }}</p>
    <h1>{{ metaTitle }}</h1>
    <p class="module-view__description">{{ metaDescription }}</p>
    <div class="module-view__placeholder">
      <span>Coming Next</span>
      <strong>当前阶段先完成前端骨架，业务页面将在后续阶段逐步接入。</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const metaTitle = computed(() => String(route.meta.title || '模块页面'))
const metaDescription = computed(() => String(route.meta.description || '页面功能说明待补充。'))
</script>
