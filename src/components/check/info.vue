<script setup lang="ts">
import { Card as TCard, Link as TLink, Icon as TIcon } from 'tdesign-vue-next'
import CheckCircleProgress from './circleProgress.vue'
import { computed } from 'vue'
interface Props {
  data: {
    created_at: string
    rule: {
      id: string
      name: string
    }
    metrics: {
      rule_total: number
      rule_passed: number
      rule_failed: number
    },
    model: {
      name: string
    }
  }
}
const props = defineProps<Props>()
const info = computed(() => {
  const data = props.data || {
    model: {
      name: '-'
    },
    rule: {
      name: '-',
      id: '-'
    },
    metrics: {
      rule_total: '-',
      rule_passed: '-',
      rule_failed: '-'
    },
    created_at: '-'
  }
  return [
    { label: '检查模型', value: data.model.name || '-' },
    { label: '检查规则', value: data.rule.name || '-', id: data.rule.id },
    { label: '创建时间', value: data.created_at || '-' },
    { label: '检查详情', value: data.metrics ? `规则总计${data.metrics?.rule_total}条，通过${data.metrics?.rule_passed}条，未通过${data.metrics?.rule_failed}条` : '-' },
  ]
})

const percentage = computed(() => {
  if (props.data?.metrics && props.data.metrics.rule_total !== 0) {
    return props.data?.metrics ? (props.data.metrics.rule_passed / props.data.metrics.rule_total) * 100 : 0
  } else {
    return -1
  }

})
</script>
<template>
  <t-card :bordered="false" style="padding: 0px">
    <template #header>
      <div class="title">
        <t-icon name="system-application" />
        <span class="pl-1">检查结果</span>
      </div>
    </template>
    <div class="w-full h-full flex pt-2">
      <div class="w-2/3 h-full">
        <template v-for="item in info" :key="item.label">
          <div class="flex items-center w-full" style="height: 40px;">
            <div class="label">{{ item.label }}</div>
            <div v-if="item.label !== '检查规则'" class="value truncate">{{ item.value }}</div>
            <div v-else class="value truncate">
              <MyLink size="small" @click="() => {

              }">{{ item.value }}</MyLink>
            </div>
          </div>
        </template>
      </div>
      <div class="w-1/3 h-full">
        <CheckCircleProgress :percentage="percentage" title="通过率"></CheckCircleProgress>
      </div>
    </div>
  </t-card>
</template>

<style scoped>
.title {
  width: 100%;
  display: flex;
  align-items: center;
  font-size: var(--my-text-large);
  font-weight: bold;
}

.label {
  width: 100px;
  color: var(--my-gray-400);
}

.value {
  width: calc(100% - 100px);
}

.label,
.value {
  padding-left: 8px;
  height: 30px;
  line-height: 30px;
  font-size: var(--my-text-medium);
}

.rule {
  color: var(--my-gray-500);
}
</style>