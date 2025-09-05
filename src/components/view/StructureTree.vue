<template>
    <div class="structure-container" id="structureTree"></div>
</template>
<script setup lang="ts">
import * as VTable from '@visactor/vtable'
import { watch, ref, reactive, computed } from 'vue'
import { useModelStore } from '../../store';
import { onMounted } from 'vue';
import { SearchComponent } from '@visactor/vtable-search';
const emit = defineEmits(['table-cell-click', 'table-checkbox-click']);
const rootStyles = getComputedStyle(document.documentElement);
const themeColor = ref(rootStyles.getPropertyValue('--theme-color'));
const props = defineProps<{
    style?: Record<string, string>
}>()

const theme = computed(() => {
    return VTable.themes.DEFAULT.extends({
        bodyStyle: {
            bgColor: "#fdfdfd",
            borderLineWidth: 0.5,
            fontSize: 11.5,
            padding: 10
        },
        headerStyle: {
            fontSize: 12,
            borderLineWidth: 0.5,
            fontWeight: 300,
            padding: 10
        },
        selectionStyle: {
            cellBorderLineWidth: 0
        },
        checkboxStyle: {
            checkedFill: themeColor.value,
            checkedStroke: themeColor.value,
        },
        scrollStyle: {
            visible: 'always',
        }
    });
});

let treeInstance: VTable.ListTable | null = null;
let treeData = ref([])
let search: any;
let options = reactive({
    records: treeData,
    columns: [
        {
            headerType: 'checkbox' as const, //指定表头单元格显示为复选框
            cellType: 'checkbox' as const,
            field: 'check',
            width: "11%" as const,
            style: {
                checkedFill: themeColor.value,
                checkedStroke: themeColor.value,
                defaultFill: 'transparent',
                defaultStroke: '#d0d0d0',
            } as any
        },
        {
            field: 'typeShow',
            title: '类型',
            width: '50%' as const,
            tree: true
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
    theme: theme.value,
    emptyTip: {
        text: '暂无数据',
        textStyle: {
            fontSize: 12,
            color: '#999'
        },
        icon: {
            width: 0,
            height: 0,
            image: ''
        },
        displayMode: 'basedOnContainer' as const
    }
})

const { CLICK_CELL } = VTable.ListTable.EVENT_TYPE;
let ClickId = 0
let MouseId = 0

const handleClick = () => {
    if (!treeInstance) return;
    ClickId = treeInstance.on(CLICK_CELL, (...args) => {
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
}

const handleMouse = () => {
    if (!treeInstance) return;
    MouseId = treeInstance.on('mouseenter_cell', args => {
        console.log('mouseenter_cell', args);
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
}

onMounted(() => {
    watch(
        () => props.style,
        (newStyle) => {
            if (newStyle && newStyle['--theme-color']) {
                themeColor.value = newStyle['--theme-color'];

                if (treeInstance) {
                    // 更新整个配置对象
                    const newOptions = {
                        ...options,
                        theme: theme.value,
                        columns: [
                            {
                                headerType: 'checkbox' as const,
                                cellType: 'checkbox' as const,
                                field: 'check',
                                width: "11%" as const,
                                style: {
                                    checkedFill: themeColor.value,
                                    checkedStroke: themeColor.value,
                                    defaultFill: 'transparent',
                                    defaultStroke: '#d0d0d0'
                                } as any
                            },
                            ...options.columns.slice(1) // 保持其他列
                        ]
                    };
                    treeInstance.updateOption(newOptions);
                    treeInstance.setCellCheckboxState(0, 0, true);
                }
            }
        },
        { deep: true }
    );

    watch(() => treeData.value, (newValue) => {
        if (treeInstance) {
            treeInstance.off(ClickId)
            treeInstance.off(MouseId)
            treeInstance = new VTable.ListTable(document.getElementById('structureTree') as HTMLElement, options)
            handleClick();
            handleMouse();
        }
        if (newValue.length > 0 && treeInstance) {
            treeInstance.setRecords(treeData.value)
            treeInstance.setCellCheckboxState(0, 0, true);
            search = new SearchComponent({
                table: treeInstance as any,
                autoJump: true,
                highlightCellStyle: {
                    bgColor: 'rgba(231, 229, 251, 0.0)'
                },
                focuseHighlightCellStyle: {
                    bgColor: 'rgba(231, 229, 251, 0.0)'
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
    treeInstance = new VTable.ListTable(document.getElementById('structureTree') as HTMLElement, options)
    handleClick();
    handleMouse();
})

const scrollToRow = (node: any) => {
    if (!treeInstance) return;
    if (!search) return;
    if (typeof node === 'object') {
        let result = search.search(node.expressId).results;
        treeInstance.updateTheme(theme.value);
        let row = result[0].range.start.row;
        let col = 0;
        treeInstance.scrollToCell({ row, col });
        treeInstance.selectCell(col, row);
        return;
    } else if (typeof node === 'number') {
        treeInstance.scrollToCell({ row: node, col: 1 });
        treeInstance.selectCell(1, node);
        treeInstance.updateTheme(theme.value);
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