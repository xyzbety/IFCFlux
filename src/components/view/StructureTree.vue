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
            padding: 10,
            hover: {
                cellBgColor: '#ecf1f5',
                inlineRowBgColor: '#ecf1f5',
            },
            cursor: 'pointer'
        },
        headerStyle: {
            fontSize: 12,
            borderLineWidth: 0.5,
            fontWeight: 300,
            padding: 10,
            bgColor: "#ecf1f5",
        },
        selectionStyle: {
            cellBorderLineWidth: 0,
        },
        checkboxStyle: {
            checkedFill: themeColor.value,
            checkedStroke: themeColor.value,
        },
        scrollStyle: {
            visible: 'always'
        }
    });
});

let treeInstance: VTable.ListTable | null = null;
let treeData = ref([])
let search: any;
let eventIds = {
    click: 0,
    mouseMove: 0
}
const options = reactive({
    records: treeData,
    columns: [
        {
            headerType: 'checkbox' as const, //指定表头单元格显示为复选框
            cellType: 'checkbox' as const,
            checked: true,
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
    hover: {
        highlightMode: 'row' as const
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
    },
    virtualization: {
        vertical: true, // 启用垂直虚拟滚动
        horizontal: false, // 根据需要决定是否启用水平虚拟滚动
        overscroll: true, // 允许超滚动
    },
})

const handleClick = () => {
    if (!treeInstance) return;
    eventIds.click = treeInstance.on('click_cell', (...args) => {
        if (treeInstance) {
            const cellValue = treeInstance.getCellValue(args[0].col, args[0].row);
            console.log('click_cell', args, cellValue);
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
    eventIds.mouseMove = treeInstance.on('mouseenter_cell', args => {
        const { col, row } = args;
        if (row === 0) return;
        if (treeInstance) {
            const rect = treeInstance.getVisibleCellRangeRelativeRect({ col, row });
            if (treeInstance.getCellValue(col, row)) {
                treeInstance.showTooltip(col, row, {
                    content: treeInstance.getCellValue(col, row),
                    referencePosition: { rect, placement: VTable.TYPES.Placement.bottom },
                    className: 'defineTooltip',
                    disappearDelay: 100,
                    style: {
                        bgColor: 'black',
                        color: 'white',
                        arrowMark: false
                    }
                });
            }
        }
    });
}
const clearAllEvents = () => {
    try {
        Object.values(eventIds).forEach(id => {
            if (!treeInstance) return;
            if (id && typeof treeInstance.off === 'function') {
                treeInstance.off(id);
            }
        });
    } catch (error) {
        console.error('Error clearing events:', error);
    }

    // 重置事件ID
    eventIds = {
        click: 0,
        mouseMove: 0
    }
}

const scrollToRow = (node: any) => {
    if (!treeInstance) return;
    if (!search) return;
    if (typeof node === 'object') {
        let result = search.search(node.expressId).results;
        treeInstance.updateTheme(theme.value);
        let row = result[0].range.start.row;
        treeInstance.scrollToRow(row)
        treeInstance.selectCells([{ start: { col: 0, row }, end: { col: 2, row } }]);
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
onMounted(() => {
    watch(
        () => props.style,
        (newStyle) => {
            if (newStyle && newStyle['--theme-color']) {
                themeColor.value = newStyle['--theme-color'];
                if (treeInstance) {
                    treeInstance.updateTheme(theme.value);
                    treeInstance.updateColumns([
                        {
                            headerType: 'checkbox',
                            cellType: 'checkbox',
                            field: 'check',
                            width: '11%',
                            style: {
                                checkedFill: themeColor.value,
                                checkedStroke: themeColor.value,
                                defaultFill: 'transparent',
                                defaultStroke: '#d0d0d0',
                            },
                        },
                        ...options.columns.slice(1),
                    ]);
                    // treeInstance.setCellCheckboxState(0, 0, true);
                }
            }
        },
        { deep: true }
    );

    watch(() => treeData.value, (newValue) => {
        if (treeInstance) {
            clearAllEvents();
            if (newValue.length > 0) {
                options.hierarchyExpandLevel = 6
                const treeLength = newValue[0].treeLength
                if (treeLength > 5000) {
                    options.hierarchyExpandLevel = 5
                }
                if (treeLength > 20000) {
                    options.hierarchyExpandLevel = 4
                }
                if (treeLength > 80000) {
                    options.hierarchyExpandLevel = 3
                }
            }
            treeInstance = new VTable.ListTable(document.getElementById('structureTree') as HTMLElement, options)
            handleClick();
            handleMouse();
        }
        if (newValue.length > 0 && treeInstance) {
            treeInstance.setRecords(treeData.value)
            // treeInstance.setCellCheckboxState(0, 0, true);
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
    }, { immediate: true });

    const modelStore = useModelStore()
    watch(() => modelStore.modelData, (newValue) => {
        if (!newValue) return;
        treeData.value = newValue.tree
    }, { immediate: true });
    treeInstance = new VTable.ListTable(document.getElementById('structureTree') as HTMLElement, options)
    handleClick();
    handleMouse();
})

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