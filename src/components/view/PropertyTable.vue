<template>
    <div class="property-container" id="PropertyTable"></div>
</template>
<script setup lang="ts">
import * as VTable from '@visactor/vtable'
import { watch, ref, reactive } from 'vue'
import { onMounted } from 'vue';
interface Props {
    propertyData: any[]
}
const props = withDefaults(defineProps<Props>(), {
    propertyData: () => []
})
let treeData = ref<any[]>([])
let treeInstance: VTable.ListTable | null = null;
let MouseId = 0
const handleMouse = () => {
    if (!treeInstance) return;
    MouseId = treeInstance.on('mouseenter_cell', args => {
        const { col, row } = args;
        console.log('mouseenter_cell', col, row);
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

    watch(() => props.propertyData, (newValue) => {
        treeData.value = newValue
        if (treeInstance) {
            treeInstance.off(MouseId);
            treeInstance = new VTable.ListTable(document.getElementById('PropertyTable') as HTMLElement, options)
            handleMouse()
            treeInstance.setRecords(treeData.value)
        }
    }, { deep: true, immediate: true });

    let options = reactive({
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
            groupBy: 'group'
        },
        select: {
            highlightMode: 'row' as const,
        },
        defaultRowHeight: 30,
        theme: VTable.themes.DEFAULT.extends({
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
})

</script>
<style lang="less" scoped>
.property-container {
    width: 100%;
    height: 100%;
}
</style>