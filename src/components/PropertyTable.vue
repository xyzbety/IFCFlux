<template>
    <div class="property-container" id="PropertyTable" v-if="showTable"></div>
</template>
<script setup lang="ts">
import * as VTable from '@visactor/vtable'
import { watch, ref, reactive, nextTick } from 'vue'
import { onMounted } from 'vue';
interface Props {
    propertyData: any[],
    visible: boolean
}
const props = withDefaults(defineProps<Props>(), {
    propertyData: () => [],
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
onMounted(() => {
    let treeData = ref<any[]>([])
    let treeInstance: VTable.ListTable | null = null;
    watch(() => props.propertyData, (newValue) => {
        treeData.value = newValue
        if (treeInstance) {
            treeInstance.setRecords(treeData.value)
        }
    }, { deep: true, immediate: true });

    let options = reactive({
        records: treeData,
        columns: [
            { field: 'name', title: '名称', width: 'auto' },
            { field: 'value', title: '值', width: 'auto' },
        ],
        widthMode: "adaptive" as const,
        autoFillWidth: true,
        hierarchyExpandLevel: 5,
        groupConfig: {
            groupBy: 'group'
        },
        defaultRowHeight: 30,
        theme: VTable.themes.DEFAULT.extends({
            bodyStyle: {
                fontSize: 11.5
            },
            headerStyle: {
                fontSize: 12,
                fontWeight: 300
            }
        }),
        tooltip: {
            isShowOverflowTextTooltip: true
        }
    })
    treeInstance = new VTable.ListTable(document.getElementById('PropertyTable') as HTMLElement, options)
    treeInstance.on('mouseenter_cell', args => {
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
})

</script>
<style lang="less" scoped>
.property-container {
    width: 100%;
    height: 100%;
}
</style>