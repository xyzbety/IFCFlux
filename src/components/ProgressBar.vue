<template>
  <div class="loader-container" v-if="loading">
    <span class="label">
      {{ progress.text }}
      <span v-if="progress.current > 0">({{ progress.current }}/{{ progress.total }})</span>
    </span>
    <smart-progress-bar :value="progress.percent" show-progress-value></smart-progress-bar>
  </div>
</template>

<script lang="ts" setup>
import { watch} from "vue";
import "smart-webcomponents/source/modules/smart.progressbar.js";

// 定义props
const props = defineProps({
  loading: {
    type: Boolean,
    required: true
  },
  progress: {
    type: Object,
    required: true,
    default: () => ({
      percent: 0,
      current: 0,
      total: 100,
      text: "处理中"
    })
  }
});

// 定义emits
const emit = defineEmits(['progress-update']);

// 监听progress变化
watch(
  () => props.progress,
  (newVal) => {
    emit('progress-update', newVal);
  },
  { deep: true }
);
</script>

<style scoped>


.label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  color: #333;
}
</style>