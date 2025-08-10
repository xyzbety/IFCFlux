<script lang="ts" setup>
import { ref } from 'vue';
import Info from './info.vue';
import RuleDetail from './ruleDetail.vue';
import RuleTree from './ruleTree.vue';
import { Card as TCard } from 'tdesign-vue-next'
// 检查信息
const infoData = {
  model: {
    name: '汉芯公馆3号楼'
  },
  rule: {
    name: '湖北省建筑信息模型施工图审查交付标准',
    id: '-'
  },
  metrics: {
    rule_total: 391,
    rule_passed: 350,
    rule_failed: 41
  },
  created_at: '2025-04-28 11:11:02'
}
const ruleTreeData = [
  {
    name: '项目',
    rules: [
      {
        description: '项目 编号属性，值类型应为文本，属性值必填',
        status: 0,
        passed: ['guid'],
        failed: []
      },
      {
        description: '项目 建筑物编码属性，值类型应为文本，属性值必填',
        status: 0,
        passed: ['guid'],
        failed: []
      }
    ]
  },
  {
    name: '住宅',
    rules: [
      {
        description: '住宅 建筑类别属性，值类型应为文本，属性值必填',
        status: 0,
        passed: ['guid'],
        failed: []
      },
      {
        description: '住宅 地下建筑高度属性，值类型应为浮点数，值单位应为m，属性值必填',
        status: 0,
        passed: ['guid'],
        failed: []
      }
    ]
  }
]
const ruleDetailData: any = ref(null)
const activeChangedHandle = (node: any) => {
  const items: any = []
  node.data.passed?.forEach((guid: string) => {
    items.push({
      name: '',
      category: '',
      guid: guid,
      status: 1
    })
  })
  node.data.failed?.forEach((guid: string) => {
    items.push({
      name: '',
      category: '',
      guid: guid,
      status: 0
    })
  })
  ruleDetailData.value = {
    description: node.data.label,
    items,
  }
}
const ruleItemsrowClick = () => {

}

</script>
<template>
  <div style="width: 700px; height: 700px;">
    <t-card>
      <div class="h-full w-full">
        <div class="w-full" style="height:240px;padding: 20px;">
          <Info :data="infoData">
          </Info>
        </div>
        <div class="w-full flex gap-5" style="height:calc(100% - 240px);padding: 0px 20px 20px 20px;">
          <div class="h-full column ">
            <RuleTree :data="ruleTreeData" @activeChanged="activeChangedHandle"></RuleTree>
          </div>
          <div class="h-full column ">
            <RuleDetail :data="ruleDetailData" @rowClick="ruleItemsrowClick"></RuleDetail>
          </div>
        </div>
      </div>

    </t-card>
  </div>
</template>


<style scoped>
.column {
  flex: 0 1 calc(50% - 10px);
  overflow: hidden;
}

.gap-5 {
  gap: 1.25rem
}
</style>