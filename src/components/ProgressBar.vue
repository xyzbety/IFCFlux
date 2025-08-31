<template>
  <div class="loader-container" v-if="loading">
    <span class="label">
      {{ progress.text }}
      <span v-if="progress.current > 0">({{ progress.current }}/{{ progress.total }})</span>
    </span>
    <t-progress theme="plump" :percentage="progress.percent" :color="progressColor" />
  </div>
</template>

<script lang="ts" setup>
import { watch, computed } from "vue";
import { useAppCore } from '../composables/useAppCore';

// 获取主题样式
const { themeStyle } = useAppCore();
const progressColor = computed(() => themeStyle.value['--td-brand-color']);

// 定义props
const props = defineProps({
  loading: {
    type: Boolean,
    required: true
  },
  progress: {
    type: Object,
    required: true
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
.loader-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 120px;
  padding: 15px;
  background-color: rgba(255, 255, 255, 0.85);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid #ececec;
}

.label {
  display: block;
  width: 100%;
  margin-bottom: 15px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
  text-align: left;
  word-wrap: break-word;
}

.t-progress {
  width: 100%;
}

:deep(.t-progress__bar) {
  border-radius: 0;
}

:deep(.t-progress__inner) {
  border-radius: 0;
  transition: none;
}

</style>