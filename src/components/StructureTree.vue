<template>
  <div class="structure-tree">
    <t-enhanced-table 
      v-if="showTable" 
      :key="`tree-${Date.now()}`" 
      ref="treeTableRef"
      resizable 
      :columns="columns" 
      selectAll 
      actived 
      :data="treeData" 
      rowKey="expressId"
      :expandedRowKeys="expandedIds" 
      :tree="{ indent: 4, childrenKey: 'children', checkStrictly: true, treeNodeColumnIndex: 0, expandTreeNodeOnClick: true }"
      :treeTableNodeColumnIndex="0" 
      @row-click="handleRowClick"
      @expanded-row-keys-change="handleExpandedChange" 
      :tree-expand-and-fold-icon="treeExpandIcon"
      height="100%" 
      style="height: 100%;" 
      :defaultExpandAll="true" 
      :expandOnRowClick="true" 
      bordered
      :selectedRowKeys="selectedRowKeys" 
      @select-change="handleSelectChange">
    </t-enhanced-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, h, computed } from 'vue'
import { ifcStructureColumns } from '../utils/config'
import { formatIfcType } from '../utils/ifcMap'

// Props
interface Props {
  treeData: any[]
  expandedIds: string[]
  selectedRowKeys: string[]
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  expandedIds: () => [],
  selectedRowKeys: () => [],
  visible: false
})

// Emits
const emit = defineEmits<{
  rowClick: [event: any]
  expandedChange: [expandedRowKeys: string[]]
  selectChange: [selectedRowKeys: string[], data: any]
}>()

// Refs
const treeTableRef = ref()
const showTable = ref(true)

// 过滤掉描述列的构件树列配置，并为类型列添加格式化处理
const columns = computed(() => {
  return ifcStructureColumns
    .filter(col => col.colKey !== 'description')
    .map(col => {
      if (col.colKey === 'row-select') {
        return {
          ...col,
          width: '36px'
        }
      }
      if (col.colKey === 'typeShow') {
        return {
          ...col,
          cell: (h, { row }) => {
            return formatIfcType(row.typeShow || row.type || '')
          }
        }
      }
      return col
    })
})

// 展开图标
const treeExpandIcon = ({ type, row }) => {
  console.log('treeExpandIcon called with type:', type, 'row:', row);
  
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

// 为表格添加 gotoRow 方法
const addGotoRowMethod = () => {
  if (treeTableRef.value) {
    treeTableRef.value.gotoRow = (expressID: string) => {
      // 滚动到指定行并高亮
      const tableElement = treeTableRef.value.$el
      if (tableElement) {
        const targetRow = tableElement.querySelector(`[data-row-key="${expressID}"]`)
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 高亮行
          targetRow.classList.add('highlighted-row')
          setTimeout(() => {
            targetRow.classList.remove('highlighted-row')
          }, 2000)
        }
      }
    }
  }
}

// 事件处理
const handleRowClick = (event: any) => {
  emit('rowClick', event)
}

const handleExpandedChange = (expandedRowKeys: string[]) => {
  emit('expandedChange', expandedRowKeys)
}

const handleSelectChange = (selectedRowKeys: string[], data: any) => {
  emit('selectChange', selectedRowKeys, data)
}

// 监听表格引用变化
watch(treeTableRef, (newVal) => {
  if (newVal) {
    addGotoRowMethod()
  }
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

// 暴露方法给父组件
defineExpose({
  gotoRow: (expressID: string) => {
    if (treeTableRef.value?.gotoRow) {
      treeTableRef.value.gotoRow(expressID)
    }
  },
  setActive: (expressID: string) => {
    if (treeTableRef.value) {
      treeTableRef.value.active = expressID
    }
  }
})
</script>

<style scoped>
.structure-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.structure-tree .t-enhanced-table {
  flex: 1;
  height: 100%;
  font-size: 12px;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
}

.structure-tree :deep(.t-table__body),
.structure-tree :deep(.t-table__header) {
  font-size: 12px !important;
}

.structure-tree :deep(.t-table__body td),
.structure-tree :deep(.t-table__header th) {
  font-size: 12px !important;
}

/* 表格行选中样式 - 蓝底白字 */
.structure-tree :deep(.t-table__row--selected),
.structure-tree :deep(.t-table__row.t-is-selected) {
  background-color: #1890ff !important;
  color: white !important;
}

.structure-tree :deep(.t-table__row--selected td),
.structure-tree :deep(.t-table__row.t-is-selected td) {
  background-color: #1890ff !important;
  color: white !important;
}

/* 表格行悬停样式 - 灰底 */
.structure-tree :deep(.t-table__row:hover) {
  background-color: #f5f5f5 !important;
}

.structure-tree :deep(.t-table__row:hover td) {
  background-color: #f5f5f5 !important;
}

/* 确保选中状态优先级高于悬停状态 */
.structure-tree :deep(.t-table__row--selected:hover),
.structure-tree :deep(.t-table__row.t-is-selected:hover) {
  background-color: #1890ff !important;
  color: white !important;
}

.structure-tree :deep(.t-table__row--selected:hover td),
.structure-tree :deep(.t-table__row.t-is-selected:hover td) {
  background-color: #1890ff !important;
  color: white !important;
}

.highlighted-row {
  background-color: #e6f7ff !important;
  transition: background-color 0.3s ease;
}
</style>