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
    propertyData: any[]
}
const props = withDefaults(defineProps<Props>(), {
    propertyData: () => []
})
let treeData = ref<any[]>([])
let treeInstance: VTable.ListTable | null = null;
const { CLICK_CELL } = VTable.ListTable.EVENT_TYPE;
let ClickId = 0
let MouseId = 0
const handleClick = () => {
    if (!treeInstance) return;
    ClickId = treeInstance.on(CLICK_CELL, (...args) => {
        if (treeInstance) {
            const cellValue = treeInstance.getCellValue(args[0].col, args[0].row);
            console.log('click_cell', args[0], cellValue);
            const targetIcon = args[0].targetIcon;
            if (targetIcon?.name === 'order') {
                debouncedCopyToClipboard(cellValue);
            }
        }
    });
}
const handleMouse = () => {
    if (!treeInstance) return;
    MouseId = treeInstance.on('mousemove_cell', args => {
        const { col, row, targetIcon } = args;
        console.log('mousemove_cell', col, row);
        console.log(treeInstance?.getCellStyle(col, row))
        if (treeInstance) {
            const rect = treeInstance.getVisibleCellRangeRelativeRect({ col, row });
            if (treeInstance.getCellValue(col, row) && row !== 0) {
                let content = '';
                let referencePosition: any = {};
                let style = {}
                if (targetIcon?.name === 'order') {
                    content = '点击复制';
                    referencePosition = { rect, placement: VTable.TYPES.Placement.right };
                    style = {
                        bgColor: 'black',
                        color: 'white',
                        arrowMark: false
                    }
                } else {
                    content = treeInstance.getCellValue(col, row);
                    referencePosition = { rect, placement: VTable.TYPES.Placement.top };
                    style = {
                        bgColor: 'black',
                        color: 'white',
                        arrowMark: true
                    }
                }
                treeInstance.showTooltip(col, row, {
                    content,
                    referencePosition,
                    className: 'defineTooltip',
                    disappearDelay: 100,
                    style
                });
            }
        }
    });
}
VTable.register.icon('order', {
    type: 'svg',
    svg: '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M624.5 786.3c92.9 0 168.2-75.3 168.2-168.2V309c0-92.4-75.3-168.2-168.2-168.2H303.6c-92.4 0-168.2 75.3-168.2 168.2v309.1c0 92.4 75.3 168.2 168.2 168.2h320.9zM178.2 618.1V309c0-69.4 56.1-125.5 125.5-125.5h320.9c69.4 0 125.5 56.1 125.5 125.5v309.1c0 69.4-56.1 125.5-125.5 125.5h-321c-69.4 0-125.4-56.1-125.4-125.5z" p-id="5167" fill="#2c2c2c"></path><path d="M849.8 295.1v361.5c0 102.7-83.6 186.3-186.3 186.3H279.1v42.7h384.4c126.3 0 229.1-102.8 229.1-229.1V295.1h-42.8zM307.9 361.8h312.3c11.8 0 21.4-9.6 21.4-21.4 0-11.8-9.6-21.4-21.4-21.4H307.9c-11.8 0-21.4 9.6-21.4 21.4 0 11.9 9.6 21.4 21.4 21.4zM307.9 484.6h312.3c11.8 0 21.4-9.6 21.4-21.4 0-11.8-9.6-21.4-21.4-21.4H307.9c-11.8 0-21.4 9.6-21.4 21.4 0 11.9 9.6 21.4 21.4 21.4z" p-id="5168" fill="#2c2c2c"></path><path d="M620.2 607.4c11.8 0 21.4-9.6 21.4-21.4 0-11.8-9.6-21.4-21.4-21.4H307.9c-11.8 0-21.4 9.6-21.4 21.4 0 11.8 9.6 21.4 21.4 21.4h312.3z" p-id="5169" fill="#2c2c2c"></path></svg>',
    width: 20,
    height: 20,
    name: 'order',
    positionType: VTable.TYPES.IconPosition.absoluteRight,
    marginLeft: 0,
    hover: {
        width: 20,
        height: 20,
        bgColor: 'rgba(101, 117, 168, 0.0)'
    },
    cursor: 'pointer',
    visibleTime: 'click_cell'
});
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
        treeData.value = newValue
        if (treeInstance) {
            treeInstance.off(MouseId);
            treeInstance.off(ClickId);
            treeInstance = new VTable.ListTable(document.getElementById('PropertyTable') as HTMLElement, options)
            handleMouse()
            handleClick()
            treeInstance.setRecords(treeData.value)
        }
    }, { deep: true, immediate: true });

    let options = reactive({
        records: treeData,
        columns: [
            { field: 'name', title: '名称', width: '40%', icon: 'order' },
            { field: 'value', title: '值', width: '60%', icon: 'order' },
        ],
        widthMode: "adaptive" as const,
        autoFillWidth: true,
        hierarchyExpandLevel: 5,
        hierarchyIndent: 2,
        hierarchyTextStartAlignment: true,
        groupConfig: {
            groupBy: 'group'
        },
        select: {
            highlightMode: 'row' as const,
        },
        hover: {
            highlightMode: 'row'
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
        }
    })
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