<template>
    <div class="structure-container" id="structureTree" v-if="showTable"></div>
</template>
<script setup lang="ts">
import * as VTable from '@visactor/vtable'
import { watch, ref, reactive, nextTick, } from 'vue'
import { useModelStore } from '../store';
import { onMounted } from 'vue';
import { SearchComponent } from '@visactor/vtable-search';

interface Props {
    visible: boolean
}
const props = withDefaults(defineProps<Props>(), {
    visible: false
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
const showTable = ref(true)
const emit = defineEmits(['table-cell-click', 'table-checkbox-click']);

let treeInstance: VTable.ListTable | null = null;
let search: any;
onMounted(() => {

    let treeData = ref([])
    watch(() => treeData.value, (newValue) => {
        if (newValue.length > 0 && treeInstance) {
            treeInstance.setRecords(treeData.value)
            treeInstance.setCellCheckboxState(0, 0, true);
            search = new SearchComponent({
                table: treeInstance,
                autoJump: true,
                highlightCellStyle: {
                    bgColor: 'rgba(231, 229, 251, 0)'
                },
                focuseHighlightCellStyle: {
                    bgColor: 'rgba(231, 229, 251, 0)'
                }
            });
            search.clear()
        }
    }, { deep: true, immediate: true });

    const modelStore = useModelStore()
    watch(() => modelStore.modelData, (newValue) => {
        if (!newValue) return;
        treeData.value = newValue.tree
    }, { deep: true, immediate: true });

    let options = reactive({
        records: treeData,
        columns: [
            {
                headerType: 'checkbox' as const, //指定表头单元格显示为复选框
                cellType: 'checkbox' as const,
                field: 'check',
                width: "11%" as const,
            },
            {
                field: 'typeShow',
                title: '类型',
                width: '50%' as const,
                tree: true,

            },
            { field: 'name', title: '名称', width: '39%' as const },
        ],
        widthMode: 'adaptive' as const,
        autoFillWidth: true,
        hierarchyExpandLevel: 6,
        hierarchyIndent: 2,
        hierarchyTextStartAlignment: true,
        defaultRowHeight: 30,
        select: {
            highlightMode: 'row' as const,
        },
        theme: VTable.themes.DEFAULT.extends({
            bodyStyle: {
                fontSize: 11.5,
                padding: 10
            },
            headerStyle: {
                fontSize: 12,
                fontWeight: 300,
                padding: 10
            },
            selectionStyle: {
                cellBorderLineWidth: 0
            }
        }),
        emptyTip: {
            text: '暂无数据',
            textStyle: {
                fontSize: 12,
                color: '#999'
            },
            icon: {
                width: 0,
                height: 0
            },
            displayMode:'basedOnContainer'
        }
    })
    const { CLICK_CELL, } = VTable.ListTable.EVENT_TYPE;
    treeInstance = new VTable.ListTable(document.getElementById('structureTree') as HTMLElement, options)
    treeInstance.on(CLICK_CELL, (...args) => {
        if (treeInstance) {
            if (args[0].cellType === 'checkbox' && args[0].cellLocation === 'columnHeader') {
                let headerSelectState = treeInstance.getCheckboxState('check')[0];
                emit('table-checkbox-click', { args, selectState: headerSelectState })
                return;
            } else if (args[0].cellType === 'checkbox' && args[0].cellLocation === 'body') {
                const selectState = treeInstance.getCellCheckboxState(args[0].col, args[0].row);
                emit('table-checkbox-click', { args, selectState })
                return;
            }
        }
        emit('table-cell-click', args)
    });
    treeInstance.on('mouseenter_cell', args => {
        const { col, row } = args;
        if (treeInstance) {
            const rect = treeInstance.getVisibleCellRangeRelativeRect({ col, row });
            if (treeInstance.getCellValue(col, row) && row !== 0) {
                treeInstance.showTooltip(col, row, {
                    content: treeInstance.getCellValue(col, row),
                    referencePosition: { rect, placement: VTable.TYPES.Placement.top },
                    className: 'defineTooltip',
                    disappearDelay: 100,
                    style: {
                        bgColor: 'black',
                        color: 'white',
                        arrowMark: true
                    }
                });
            }
        }
    });
})

const scrollToRow = (node) => {
    if (!treeInstance) return;
    if (!search) return;
    if (typeof node === 'object') {
        let result = search.search(node.expressId).results;
        let row = result[0].range.start.row;
        let col = 1;
        treeInstance.scrollToCell({ row, col });
        treeInstance.selectCell(col, row);
        return;
    } else if (typeof node === 'number') {
        treeInstance.scrollToCell({ row: node, col: 1 });
        treeInstance.selectCell(1, node);
        return;
    }
}
const clearSelected = () => {
    if (!treeInstance) return;
    treeInstance.clearSelected()
}

// 使用 defineExpose 暴露方法给父组件
defineExpose({
    scrollToRow,
    clearSelected
})
</script>
<style lang="less" scoped>
.structure-container {
    width: 100%;
    height: 100%;
}
</style>