<script lang="ts" setup>
import { reactive, toRefs, watch, ref } from 'vue';

interface Props {
  visible: boolean
  title: string
  style?: any
  dragDirection?: string
}

const props = withDefaults(defineProps<Props>(), {
  dragDirection: 'left'
})

const emit = defineEmits<{
  (e: 'update:visible', value: any): void
  (e: 'close', value: any): void
}>()

const dialog = ref()

const pageState = reactive({
  visible: props.visible || false,
  drag: false,
})

watch(() => props.visible, () => {
  pageState.visible = props.visible
})

const dialogClose = () => {
  pageState.visible = false
  emit('update:visible', false)
  emit('close', false)
}

const mousedown = (event) => {
  if (pageState.drag)
    dialog.value.style.width = `${(props.dragDirection === 'left' ? (document.body.clientWidth - event.x) : event.x) + 5}px`
}
const mousemove = (event) => {
  if (pageState.drag) {
    dialog.value.style.width = `${(props.dragDirection === 'left' ? (document.body.clientWidth - event.x) : event.x) + 5}px`
  }
}
const mouseup = (event) => {
  pageState.drag = false
}


</script>

<template>
  <div class="dialog" v-if="pageState.visible" :style="style" ref="dialog">
    <div class="dialog-drag" @mousedown="mousedown" @mousemove="mousemove" @mouseup="mouseup" @mouseout="mouseup"
      :style="`${props.dragDirection}:0px`"></div>
    <div class="dialog-header">
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-actions">
        <!-- <t-icon class="dialog-action" name="caret-down-small" size="16px"></t-icon> -->
        <slot name="actions"></slot>
        <t-icon class="dialog-action" name="close" size="16px" @click="dialogClose"></t-icon>
      </div>
    </div>
    <div class="dialog-body">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.dialog {
  position: absolute;
  z-index: 99;
  top: 0px;
  right: 0px;
  width: 100%;
  height: 100%;
  background-color: white;
}

.dialog-header {
  background: rgb(240, 240, 240);
  height: 30px;
  width: 100%;
  position: relative;
}

.dialog-body {
  width: 100%;
  height: calc(100% - 30px);
  position: relative;
}

.dialog-title {
  height: 30px;
  width: 100%;
  text-align: left;
  font-size: 15px;
  line-height: 10px;
}

.dialog-actions {
  padding-right: 10px;
  height: 100%;
  position: absolute;
  right: -20px;
  top: -10px;
  cursor: pointer;
}

.dialog-action+.dialog-action {
  margin-left: 5px;
}

.dialog-action:hover {
  background: var(--actived-color);
}

.dialog-drag {
  width: 8px;
  height: 100%;
  position: absolute;
  /* left: 0px; */
  top: 0px;
  /* cursor: col-resize; */
  z-index: 100;
}

.dialog-drag:hover {
  width: 8px;
}
</style>