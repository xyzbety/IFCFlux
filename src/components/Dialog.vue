<script lang="ts" setup>
import { reactive, toRefs, watch, ref } from 'vue';

interface Props {
  visible: boolean
  title?: string
  activeTab?: string // 新增：当前激活的选项卡
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'property' // 默认激活"结构"选项卡
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close', value: boolean): void
  (e: 'tab-change', value: string): void // 新增：选项卡切换事件
}>()

const dialog = ref()

const pageState = reactive({
  visible: props.visible || false,
  tabs: [
    { id: 'property', name: '属性' },
    { id: 'location', name: '地点' },

    { id: 'catalog', name: '分类' },
    { id: 'relation', name: '关系' }
  ]
})

watch(() => props.visible, () => {
  pageState.visible = props.visible
})

const dialogClose = () => {
  pageState.visible = false
  emit('update:visible', false)
  emit('close', false)
}

const handleTabClick = (tabId: string) => {
  emit('tab-change', tabId) // 触发选项卡切换事件
}
</script>

<template>
  <div class="dialog" ref="dialog">
    <div class="dialog-header">
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-actions">
        <!-- <t-icon class="dialog-action" name="caret-down-small" size="16px"></t-icon> -->
        <slot name="actions"></slot>
        <t-icon class="dialog-action" name="close" size="16px" @click="dialogClose"></t-icon>
      </div>
      <!-- <div class="dialog-tabs">
        <div v-for="tab in pageState.tabs" :key="tab.id" class="tab-item"
          :class="{ 'active': props.activeTab === tab.id }" @click="handleTabClick(tab.id)">
          {{ tab.name }}
        </div>
      </div> -->
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
  height: 30px;
  /* height: 50px; 显示tab时用这个 */
  width: 100%;
  position: relative;
  background-color: rgb(240, 240, 240);
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
  height: 30px;
  position: absolute;
  right: -15px;
  top: -10px;
  cursor: pointer;
}

.dialog-action+.dialog-action {
  margin-left: 5px;
}

.dialog-action:hover {
  background: var(--actived-color);
}

.dialog-tabs {
  display: flex;
  width: 70%;
  height: 20px;
  background-color: white;
}

.tab-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tab-item:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.tab-item.active {
  background-color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
}

.dialog-body {
  width: 100%;
  /* height: calc(100% - 50px); 显示tab时用这个 */
  height: calc(100% - 30px);
  position: relative;
  overflow: auto;
}

</style>