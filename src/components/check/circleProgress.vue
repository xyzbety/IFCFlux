<script setup lang="ts">
import { computed } from 'vue'

// Props definition
const props = defineProps({
  percentage: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: '通过率'
  }
})

const size = 170
const strokeWidth = 15
const center = size / 2
const radius = center - strokeWidth
const circumference = 2 * Math.PI * radius

// Computed style for progress circle
const progressStyle = computed(() => {
  let strokeDashoffset
  if (typeof props.percentage == 'number') {
    strokeDashoffset = circumference - (props.percentage / 100) * circumference
  } else {
    strokeDashoffset = circumference
  }

  return {
    strokeDasharray: `${circumference} ${circumference}`,
    strokeDashoffset: strokeDashoffset
  }
})
</script>
<template>
  <div class="circle-progress">
    <svg class="progress-ring" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
      <!-- Background circle -->
      <circle class="progress-ring__circle progress-ring__circle--bg" :cx="center" :cy="center" :r="radius" :stroke-width="strokeWidth" />

      <!-- Progress circle -->
      <circle class="progress-ring__circle progress-ring__circle--progress" :cx="center" :cy="center" :r="radius" :stroke-width="strokeWidth" :style="progressStyle" />
    </svg>

    <!-- Text content -->
    <div class="progress-content">
      <span class="progress-title">{{ title }}</span>
      <span class="progress-percentage">{{ typeof percentage == 'number' ? `${percentage.toFixed(2)}%` : percentage }}</span>
    </div>
  </div>
</template>
<style scoped>
.circle-progress {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring__circle {
  fill: none;
  /* stroke-linecap: round; */
  transition: stroke-dashoffset 0.5s ease-in-out;
}

.progress-ring__circle--bg {
  stroke: var(--my-gray-75);
}

.progress-ring__circle--progress {
  stroke: var(--my-success-color);
}

.progress-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.progress-percentage {
  font-size: var(--my-text-large);
  font-weight: bold;
  margin-top: 5px;
}

.progress-title {
  font-size: var(--my-text-medium);
  color: var(--my-gray-400);
}
</style>
