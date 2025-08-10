<script lang="ts" setup>
import { Table as TTable, Icon as TIcon } from 'tdesign-vue-next'
interface Item {
  name: string
  catalog: string
  status: 1 | 0
}
interface Props {
  data: {
    description: string
    items: Item[]
  },
  loading?: boolean
}
const props = defineProps<Props>()
const emits = defineEmits<{
  (e: 'rowClick', value: Item): void
}>()

const columns = [
  {
    title: '对象名称',
    colKey: 'name',
    width: 'calc(70% - 60px)',
  },
  {
    title: '类型',
    colKey: 'category',
    width: '30%',
    ellipsis: true
  },
  {
    title: '状态',
    colKey: 'status',
    width: '60px'
  }
]
// 行点击
const tableRowClick = (row: Item) => {
  emits('rowClick', row)
}
</script>
<template>
  <div class="w-full h-full" style="border:1px solid var(--td-component-border)">
    <div class="header">
      <div class="header-title">规则描述</div>
      <div class="header-description">
        {{ props.data?.description }}
      </div>
    </div>
    <div class="body">
      <t-table :data="props.data?.items" :columns="columns" :loading="loading" row-key="guid" size="small" @row-click="tableRowClick" :scroll="{ type: 'virtual' }">
        <template #name="{ row }">
          <div class="w-full flex items-center">
            <t-icon name="control-platform" style="color: var(--my-gray-500)"></t-icon>
            <div class="truncate" style="width: calc(100% - 16px);padding-left: 4px;" :title="row.name">{{ row.name }}</div>
          </div>
        </template>
        <template #status="{ row }">
          <span :style="{ color: `var(${row.status === 0 ? '--td-error-color' : '--td-success-color'})` }">
            {{ row.status === 0 ? '未通过' : '通过' }}
          </span>
        </template>
      </t-table>
    </div>
  </div>
</template>


<style scoped>
.header {
  background-color: var(--my-gray-50);
}

.header-title {
  font-size: var(--my-text-medium);
  font-weight: bold;
  height: 34px;
  line-height: 34px;
  padding: 0px 15px;
}

.header-title,
.header-description {
  border-bottom: 1px solid var(--td-component-border);
}

.header-description {
  font-size: var(--my-text-medium);
  height: 120px;
  padding: 2px 10px;
}

.body {
  height: calc(100% - 34px - 1px - 120px);
}

.body:deep(.t-table__header--fixed:not(.t-table__header--multiple) > tr > th) {
  font-weight: bold;
  background-color: var(--my-gray-50) !important;
  font-weight: bold;
  color: black;
}

.body:deep(td) {
  border: none;
}

.body:deep(td),
.body:deep(th) {
  line-height: 0px;
  height: 34px;
  padding-top: 0px;
  padding-bottom: 0px;
}
</style>