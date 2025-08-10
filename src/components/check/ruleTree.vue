<script lang="ts" setup>
import { Tree as TTree, Icon as TIcon } from 'tdesign-vue-next'
import { reactive, ref, watch } from 'vue'

/**
 * 规则条目
 */
interface DateItem {
  name: string
  rules: {
    description: string
    status: 0 | 1
    passed: string[]
    failed: string[]
  }[]
}

interface TopTreeNode {
  label: string
  value: string
  status: 0 | 1,
  children: true,
}
interface TreeNode {
  label: string
  value: string
  status: 0 | 1
  failed: string[]
  passed: string[]
  children?: TreeNode
}
interface Props {
  data: DateItem[]
  loading?: boolean
}
const props = defineProps<Props>()
const emits = defineEmits<{
  (e: 'activeChanged', value: any): void
}>()

const state = reactive<{
  data: TopTreeNode[],
  nodeMap: Map<string, Array<TreeNode>>
}>({
  nodeMap: new Map(),
  data: []
})
// 树高亮节点值集合
const actived = ref<string[]>([])
// 树节点点击
const treeNodeClick = (node: { value: string, data: TreeNode | TopTreeNode }) => {
  if (!node.data.children) {
    actived.value = [node.value]
    emits('activeChanged', node)
  } else {
    actived.value = []
  }
}
// 节点点击加载
const treeLoad = (node: { level: number, value: string }) => {
  return new Promise((resolve) => {
    if (node.level == 0) {
      resolve(state.nodeMap.get(node.value))
    }
  })
}
// 监听传入的数据 ，生成节点映射表
watch(() => props.data, () => {
  if (props.data) {
    state.nodeMap.clear()
    state.data = props.data.map((item, index) => {
      let status = 1
      const value = String(index + 1)
      const children = item.rules?.map((rule, index1) => {
        if (rule.status === 0) {
          status = 0
        }
        return {
          label: rule.description,
          value: `${index + 1}-${index1 + 1}`,
          status: rule.status,
          failed: rule.failed,
          passed: rule.passed,
        }
      }) || []
      state.nodeMap.set(value, children)
      return {
        label: item.name,
        value: value,
        status,
        children: true,
      }
    })
  }
}, { immediate: true })
</script>
<template>

  <div class="w-full h-full" style="border:1px solid var(--td-component-border)">
    <div class="header">
      <div class="row">
        <div class="row-name">规则条目</div>
        <div class="row-status"></div>
      </div>
    </div>
    <div class="body">
      <t-tree :data="state.data" :loading="props.loading" :actived="actived" @click="treeNodeClick" :load="treeLoad" :scroll="{ type: 'virtual' }">
        <template #label="{ node }">
          <div class="row">
            <div class="row-icon">
              <t-icon v-if="node.data.children" name="template" />
              <t-icon v-else name="article" />
            </div>
            <div class="row-name truncate"> {{ node.data.label }}</div>
            <div class="row-status">
              <t-icon :name="node.data.status === 0 ? 'close' : 'check'" :style="{ color: `var(${node.data.status === 0 ? '--my-failure-color' : '--my-success-color'})` }"></t-icon>
            </div>
          </div>
        </template>
        <template #icon="{ node }">
          <t-icon v-if="!node.expanded && node.getChildren()" name="chevron-right" size="var(--my-text-large)" />
          <t-icon v-else name="chevron-down" size="var(--my-text-large)" />

        </template>
      </t-tree>
    </div>
  </div>
</template>


<style scoped>
.header {
  width: 100%;
  height: 34px;
  padding: 0px 15px;
  background-color: var(--my-gray-50);
  border-bottom: 1px solid var(--td-component-border);
}

.header > .row {
  height: 33px;
}

.header > .row > .row-name {
  font-size: var(--my-text-medium);
  font-weight: bold;
}

.body {
  height: calc(100% - 34px);
}

.body:deep(.t-tree__item) {
  margin: 0px;
}

.row {
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
}

.row-icon {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  margin-right: 5px;
}

.row-name {
  width: calc(100% - 12px - 5px - 20px);
  padding-right: 5px;
}

.row-status {
  width: 20px;
}
</style>