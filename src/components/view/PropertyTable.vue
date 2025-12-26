<template>
    <div class="property-container" id="PropertyTable"></div>
</template>
<script setup lang="ts">
import * as VTable from '@visactor/vtable'
import { watch, ref, reactive } from 'vue'
import { onMounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { debounce } from '../../utils/index';

interface Props {
    propertyData: any[],
    groupMap: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
    propertyData: () => [],
    groupMap: () => ({}),
})

let treeData = ref<any[]>([])
let groupMapData = ref<Record<string, any>>({})
let treeInstance: VTable.ListTable | null = null;
// 统一管理事件ID
let eventIds = {
    click: 0,
    mouseMove: 0,
    mouseLeave: 0
}
const options = reactive({
    records: treeData,
    columns: [
        { field: 'name', title: '名称', width: '40%' },
        { field: 'value', title: '值', width: '60%' },
    ],
    widthMode: "adaptive" as const,
    autoFillWidth: true,
    hierarchyExpandLevel: 5,
    hierarchyIndent: 2,
    hierarchyTextStartAlignment: true,
    groupConfig: {
        groupBy: 'group' as const,
    },
    select: {
        highlightMode: 'row' as const,
    },
    hover: {
        highlightMode: 'row' as const
    },
    keyboardOptions: {
        copySelected: true
    },
    defaultRowHeight: 30,
    theme: VTable.themes.DEFAULT.extends({
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
            padding: 10
        },
        selectionStyle: {
            cellBorderLineWidth: 0
        },
        scrollStyle: {
            visible: 'always'
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
            height: 0,
            image: ''
        },
        displayMode: 'basedOnContainer' as const
    },
    customCellStyle: [
        {
            id: 'text_style',
            style: {
                color: "#185abd",
                underline: true,
                underlineDash: [2],
                underlineOffset: 2
            }
        }
    ]
})
const handleClick = () => {
    if (!treeInstance) return;
    eventIds.click = treeInstance.on('click_cell', (...args) => {
        if (treeInstance) {
            const cellValue = treeInstance.getCellValue(args[0].col, args[0].row);
            const group = groupMapData.value.get(args[0].row);
            const copyValue = cellValue ? cellValue : group;
            debouncedCopyToClipboard(copyValue);
        }
    });
}
const handleMouse = () => {
    if (!treeInstance) return;

    // 鼠标移入事件
    eventIds.mouseMove = treeInstance.on('mouseenter_cell', (args: any) => {
        const { col, row } = args;
        if (row === 0) return;
        if (treeInstance) {
            const rowCount = treeInstance.rowCount;
            const colCount = treeInstance.colCount;
            for (let row = 0; row < rowCount; row++) {
                for (let col = 0; col < colCount; col++) {
                    const cellPosition = { col, row };
                    treeInstance.arrangeCustomCellStyle(cellPosition, '');
                }
            }
            const rect = treeInstance.getVisibleCellRangeRelativeRect({ col, row });
            const group = groupMapData.value.get(row);
            const cellPositionSingle = { col, row }
            const cellPositionRange = { range: { start: { row, col: 0 }, end: { row, col: 1 } } }
            const cellPosition = group ? cellPositionRange : cellPositionSingle;
            treeInstance?.arrangeCustomCellStyle(cellPosition, 'text_style')
            const cellValue = treeInstance.getCellValue(col, row);
            const copyValue = cellValue ? cellValue : group;
            if (copyValue) {
                treeInstance.showTooltip(col, row, {
                    content: copyValue,
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

    // 鼠标移出事件
    eventIds.mouseLeave = treeInstance.on('mouseleave_cell', args => {
        const { col, row } = args;
        const group = groupMapData.value.get(row);
        const cellPositionSingle = { col, row }
        const cellPositionRange = { range: { start: { row, col: 0 }, end: { row, col: 1 } } }
        const cellPosition = group ? cellPositionRange : cellPositionSingle;
        treeInstance?.arrangeCustomCellStyle(cellPosition, '')
    });
}

// 清理所有事件监听器
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
        mouseMove: 0,
        mouseLeave: 0
    }
}

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        MessagePlugin.success({ content: '复制成功', duration: 500 });
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        MessagePlugin.error({ content: '复制失败', duration: 500 });
    }
};

const debouncedCopyToClipboard = debounce(copyToClipboard, 500);

onMounted(() => {

    watch(() => props.propertyData, (newValue) => {
        // console.log('propertyData', newValue);
        treeData.value = newValue
        if (treeInstance) {
            // 清理旧的事件监听器
            clearAllEvents();
            // 重新创建实例
            treeInstance = new VTable.ListTable(document.getElementById('PropertyTable') as HTMLElement, options)
            // 重新绑定事件
            handleMouse()
            handleClick()

            // 设置新数据
            treeInstance.setRecords(treeData.value)
        }
    }, { deep: true, immediate: true });

    watch(() => props.groupMap, (newValue) => {
        groupMapData.value = newValue
    }, { deep: true, immediate: true });

    // 初始化表格
    treeInstance = new VTable.ListTable(document.getElementById('PropertyTable') as HTMLElement, options)
    handleMouse()
    handleClick()
})
</script>

<style lang="less" scoped>
.property-container {
    width: 100%;
    height: 100%;
}
</style>