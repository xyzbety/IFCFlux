<template>
  <t-dialog :visible="dialogVisible" header="属性赋值详情" width="400px" :footer="null" ref="dialogRef">
    <div class="dialog-content">
      <t-enhanced-table :data="dialogTableData" :columns="dialogTableColumns" rowKey="key" bordered size="small"
        :tree="{ childrenKey: 'children', indent: 0 }" :tree-expand-and-fold-icon="treeExpandAndFoldIcon"
        :showHeader="false" :expandedTreeNodes="expandedKeys" @expanded-tree-nodes-change="onExpandedTreeNodesChange" />
    </div>
  </t-dialog>
</template>


<script setup lang="ts">
import { ref, watch } from 'vue';
import { getAllExpandedKeys } from '../../services/model-property';
import { ChevronDownIcon, ChevronRightIcon } from 'tdesign-icons-vue-next';
import { Tooltip as TTooltip } from 'tdesign-vue-next';
import { examineResultConfig } from '../../utils/config';

const treeExpandAndFoldIcon = (h: any, { type }: { type: string }) => {
  return type === 'expand'
    ? h(ChevronRightIcon)
    : h(ChevronDownIcon);
};

const iconPathMap = {
  'array': '/icons/枚举.svg',
  'boolean': '/icons/布尔.svg',
  'float': '/icons/浮点数.svg',
  'int': '/icons/整数.svg',
  'string': '/icons/字符串.svg',
  'date': '/icons/日期.svg',
  'datetime': '/icons/时间.svg',
};

const props = defineProps<{
  dialogVisible: boolean;
  dialogTableData: any[];
}>();

const expandedKeys = ref<string[]>([]);
watch(() => props.dialogTableData,  (val) => {
  expandedKeys.value = getAllExpandedKeys(val);
}, { immediate: true });

const dialogTableColumns = [
  {
    colKey: 'name',
    title: '名称',
    ellipsis: true,
    cell: (h: any, params: any) => {
      const children = [];
      // 判断是否有图标
      const hasIcon = params.row._parentName && params.row._parentName !== 'Element Specific';

      if (hasIcon) {
        const iconPath = iconPathMap[params.row.dataType as keyof typeof iconPathMap] || '/icons/字符串.svg';

        children.push(
          h('span', {
            style: `
                    display: inline-flex;
                    align-items: center;
                    margin-right: 8px;
                    flex-shrink: 0;
                        `
          }, [
            h('img', {
              src: iconPath,
              alt: params.row.dataType,
              style: {
                width: '16px',
                height: '16px'
              }
            })
          ])
        );
      }

      // 根据是否有图标设置不同的最大宽度
      const maxWidth = hasIcon ? '110px' : '135px';

      // 用 TDesign 的 Tooltip 包裹文字
      children.push(
        h(TTooltip, { content: params.row.name, placement: 'top', overlayClassName: 'ellipsis-tooltip', showArrow: false }, {
          default: () => h('span', {
            style: `
                    display: inline-block;
                    max-width: ${maxWidth};
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    vertical-align: middle;
                    flex: 1;`
          }, params.row.name)
        })
      );

      // 状态方框（属性集子项才有）
      if (hasIcon) {
        const colorMap = {
          0: '#52c41a',    // 绿色
          1: '#d9001b',    // 深红色
          2: '#ff7875',    // 浅红色
          3: '#faad14',    // 深黄色
          4: '#ffe58f'     // 浅黄色
        };
        const color = colorMap[params.row.state as keyof typeof colorMap] || '#d9d9d9';
        const configItem = examineResultConfig[params.row.state as keyof typeof colorMap];

        children.push(
          h(TTooltip, {
            content: configItem ? configItem : '未知状态',
            placement: 'top',
            overlayClassName: 'state-tooltip',
            showArrow: false
          }, {
            default: () => h('span', {
              style: `
                      display: inline-block;
                      width: 10px;
                      height: 10px;
                      border-radius: 3px;
                      background: ${color};
                      position: absolute;
                      right: 10px;
                      flex-shrink: 0;
                      cursor: pointer;`
            })
          })
        );
      }
      // 展开/折叠图标（树节点才有）
      if (params.treeNodeCol && params.treeNodeRender) {
        children.push(
          h('span', { style: 'margin-left: 8px; flex-shrink: 0;' }, [params.treeNodeRender()])
        );
      }

      return h('div', {
        style: `
                display: flex; 
                align-items: center; 
                position: relative;
                width: 100%;
            `
      }, children);
    }
  },
  {
    colKey: 'value',
    title: '值',
    ellipsis: true,
  }
];
function onExpandedTreeNodesChange(keys: string[]) {
  expandedKeys.value = keys;
}
</script>

<style >
.t-dialog {
    border-radius: 0px !important;
    position: absolute !important;
    top: 270px !important;
    left: 350px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
}

.t-dialog__ctx .t-dialog__mask {
    background-color: rgba(0, 0, 0, 0.015) !important;
}

.t-dialog--default {
    padding: 15px !important;
}

.t-table--bordered .t-table__content {
    border-radius: 0px !important;
}

.t-dialog__header {
    font-weight: 400 !important;
    font-size: 15px !important;
}

.t-dialog__close {
    padding-right: 0px !important;
}

.t-table th,
.t-table td {
    font-size: 12px;
}

.dialog-content {
    max-height: 55vh;
    overflow: auto;
}

@media (min-height: 900px) {
    .dialog-content {
        max-height: 68vh;
        overflow: auto;
    }
}
</style>