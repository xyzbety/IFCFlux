<template>
  <div class="property-table">
    <t-enhanced-table 
      v-if="showTable"
      :key="JSON.stringify(propertyData)" 
      ref="propertyTableRef" 
      class="property-table-inner"
      style="height: 100%" 
      :columns="columns" 
      :data="propertyData" 
      bordered 
      :tree="{ indent: 10, childrenKey: 'children' }"
      rowKey="id" 
      height="100%" 
      empty="无属性" 
      :rowspanAndColspan="propertyRowSpan" 
      resizable
      :expandedTreeNodes="expandedIds"
      @expanded-tree-nodes-change="handleExpandedChange" 
      :tree-expand-and-fold-icon="treeExpandIcon" 
      :expandall="true">
    </t-enhanced-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, h, markRaw } from 'vue'
import { ifcPropertyColumns } from '../utils/config'

// Props
interface Props {
  propertyData: any[]
  expandedIds: any[]
  activeTab: string
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  propertyData: () => [],
  expandedIds: () => [],
  activeTab: 'property',
  visible: false
})

// Emits
const emit = defineEmits<{
  expandedChange: [expandedIds: any[]]
}>()

// Refs
const propertyTableRef = ref()
const showTable = ref(true)

// 根据 activeTab 计算列配置
const columns = ref(markRaw(ifcPropertyColumns[0]))

// 展开图标
const treeExpandIcon = ({ type, row }) => {
  return h('span', {
    style: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      lineHeight: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      fontSize: '12px',
      color: '#666',
      marginRight: '4px',
      userSelect: 'none'
    }
  }, type === 'expand' ? '▶' : '▼');
};

// 属性表面板列合并
const propertyRowSpan = ({ row, col, rowIndex, colIndex }: any) => {
  if (row.children) {
    // 第一列合并三列（名称、值、单位）
    if (colIndex === 0) {
      return {
        colspan: 3,
        rowspan: 1
      };
    }
    // 第二列和第三列被合并，不显示
    if (colIndex === 1 || colIndex === 2) {
      return {
        colspan: 0,
        rowspan: 0
      };
    }
  }
  return {};
}

// 事件处理
const handleExpandedChange = (value: any) => {
  console.log('propertyExpandedChange', value);
  emit('expandedChange', value)
}

// 监听 activeTab 变化更新列配置
watch(() => props.activeTab, (newTab) => {
  const newValue =
    newTab === 'location' ? ifcPropertyColumns[1] :
    newTab === 'catalog' ? ifcPropertyColumns[2] :
    newTab === 'relation' ? ifcPropertyColumns[3] :
    ifcPropertyColumns[0]

  columns.value = markRaw(newValue)
})

// 监听可见性变化，重新渲染表格
watch(() => props.visible, (newVal) => {
  if (newVal) {
    showTable.value = false
    nextTick(() => {
      showTable.value = true
    })
  }
})
</script>

<style scoped>
.property-table {
  height: 100%;
}

.property-table-inner {
  height: 100%;
  font-size: 12px;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
}

.property-table :deep(.t-table__body),
.property-table :deep(.t-table__header) {
  font-size: 12px !important;
}

.property-table :deep(.t-table__body td),
.property-table :deep(.t-table__header th) {
  font-size: 12px !important;
}

/* 属性分组行的灰色背景样式 */
.property-table :deep(.t-table__body td[colspan="3"]) {
  background-color: #f5f5f5 !important;
}
</style>
