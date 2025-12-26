<template>
  <div 
    class="drag-bar" 
    :class="[
      `drag-bar-${side}`,
      { 'drag-bar-dragging': isDragging }
    ]"
    @mousedown="handleMouseDown"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="drag-bar-handle" v-if="showHandle">
      <div class="drag-bar-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  side: 'left' | 'right' | 'inspect';
  currentWidth: number;
  visible?: boolean;
  showHandle?: boolean;
}

interface Emits {
  (e: 'dragStart', side: string, event: MouseEvent, currentWidth: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  showHandle: false
});

const emit = defineEmits<Emits>();

const isHovered = ref(false);
const isDragging = ref(false);

const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true;
  emit('dragStart', props.side, event, props.currentWidth);
};

const handleMouseEnter = () => {
  isHovered.value = true;
};

const handleMouseLeave = () => {
  isHovered.value = false;
};

// 暴露方法给父组件
defineExpose({
  setDragging: (dragging: boolean) => {
    isDragging.value = dragging;
  }
});
</script>

<style scoped>
.drag-bar {
  width: 2px;
  cursor: ew-resize;
  background: #e0e0e0;
  z-index: 10;
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drag-bar:hover,
.drag-bar-dragging {
  background: #b0b0b0;
  width: 5px;
}

.drag-bar-left {
  margin-right: -2px;
}

.drag-bar-right {
  margin-left: -2px;
}

.drag-bar-inspect {
  height: 100%;
  flex: none;
}

.drag-bar-handle {
  opacity: 0;
  transition: opacity 0.2s ease;
  padding: 4px 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.drag-bar:hover .drag-bar-handle,
.drag-bar-dragging .drag-bar-handle {
  opacity: 1;
}

.drag-bar-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.drag-bar-dots span {
  width: 2px;
  height: 2px;
  background: #666;
  border-radius: 50%;
}


/* 响应式设计 */
@media (max-width: 768px) {
  .drag-bar {
    width: 6px;
  }
  
  .drag-bar:hover,
  .drag-bar-dragging {
    width: 8px;
  }
}
</style>