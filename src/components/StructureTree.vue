<template>
  <div class="structure-tree">
    <t-enhanced-table v-if="showTable" ref="treeTableRef" resizable actived :columns="columns" :data="treeData"
      :key="JSON.stringify(treeData)" row-key="expressId" :active-row-type="'single'" :expandedTreeNodes="expandedIds"
      :activeRowKeys="props.activeRowKey"
      :tree="{ indent: 4, childrenKey: 'children', checkStrictly: false, treeNodeColumnIndex: 0 }"
      @row-click="handleRowClick" @expanded-tree-nodes-change="handleExpandedChange" @active-change="handleActiveChange"
      :tree-expand-and-fold-icon="treeExpandIcon" height="100%" style="height: 100%;" bordered :hover="true"
      :selectedRowKeys="selectedRowKeys" @select-change="handleSelectChange">
    </t-enhanced-table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { ifcStructureColumns } from '../utils/config'
import { formatIfcType } from '../utils/ifcMap'
import { ChevronRightIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
// Props
interface Props {
  treeData: any[]
  expandedIds: string[]
  selectedRowKeys: string[]
  visible: boolean,
  activeRowKey?: string[] // 新增
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  expandedIds: () => [],
  selectedRowKeys: () => [],
  visible: false,
  activeRowKey: () => [] // 改为空数组
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
const treeExpandIcon = (h: any, { type }) => {
  return type === 'expand'
    ? h(ChevronRightIcon)
    : h(ChevronDownIcon);
};

const handleActiveChange = (activeRowKey: string) => {
  console.log('高亮行改变', activeRowKey);
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
watch(() => props.activeRowKey, (val) => {
  console.log('StructureTree.vue 接收到 activeRowKey:', val);
});

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
    const table = treeTableRef.value;
    if (table && typeof table.scrollToElement === 'function') {
      table.scrollToElement({ key: expressID, behavior: 'smooth', top: 50 });
    }
    console.log('开始滚动:', expressID);
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
  font-size: 11.5px;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
}

.t-table__header {
  background-color: white !important;
}

.t-table__header tr {

  height: 22px !important;

}

.structure-tree :deep(.t-table__body),
.structure-tree :deep(.t-table__header) {
  font-size: 11.5px !important;
}

.structure-tree :deep(.t-table__body td),
.structure-tree :deep(.t-table__header th) {
  font-size: 11.5px !important;
}

/* 表格行选中样式 - 蓝底白字 */
/* .structure-tree :deep(.t-table__row--selected),
.structure-tree :deep(.t-table__row.t-is-selected) {
  background-color: #1890ff !important;
  color: white !important;
}

.structure-tree :deep(.t-table__row--selected td),
.structure-tree :deep(.t-table__row.t-is-selected td) {
  background-color: #1890ff !important;
  color: white !important;
} */

/* 表格行悬停样式 - 灰底 */
/* .structure-tree :deep(.t-table__row:hover) {
  background-color: #f5f5f5 !important;
} */

.structure-tree :deep(.t-table__row:hover td) {
  background-color: #f5f5f5 !important;
}

/* 确保选中状态优先级高于悬停状态 */
/* .structure-tree :deep(.t-table__row--selected:hover),
.structure-tree :deep(.t-table__row.t-is-selected:hover) {
  background-color: #1890ff !important;
  color: white !important;
} */

/* .structure-tree :deep(.t-table__row--selected:hover td),
.structure-tree :deep(.t-table__row.t-is-selected:hover td) {
  background-color: #1890ff !important;
  color: white !important;
} */

.highlighted-row {
  background-color: #e6f7ff !important;
  transition: background-color 0.3s ease;
}

.structure-tree :deep(.t-table__header--fixed:not(.t-table__header--multiple) > tr > th) {
  background-color: white !important;
}
</style>