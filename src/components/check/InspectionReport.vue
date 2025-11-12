<template>
    <div class="check-root" v-show="props.visible">
        <t-loading :text="loadingText" class="loading-container" :loading="loading" />
        <!-- 顶部栏 -->
        <div class="header-bar">
            <span class="header-title">{{ props.inspectType }}检查结果</span>
            <span class="header-close" @click="handleClose">
                <img src="/icons/close.svg" />
            </span>
        </div>
        <!-- 搜索区域 -->
        <div id="search-container">
            <t-input v-model="searchText" placeholder="搜索Guid或Tag" @enter="handleSearch"
                style="width: 35%;margin-left: 15px;">
                <template #suffix>
                    <t-button @click="handleSearch" class="search-btn" size="small" theme="default"
                        style="background: transparent; border: none; box-shadow: none; margin-right: -5px; padding: 0 4px;">
                        <img src="/icons/search.svg" />
                    </t-button>
                </template>
            </t-input>
        </div>
        <!-- 内容区域 -->
        <div class="content-area">
            <div class="list-area">
                <t-list :split="true" header="IFC实体" size="small">
                    <t-list-item v-for="(desc, idx) in descriptions" :key="idx"
                        :class="{ 'selected-item': selectedKey === desc }" @click="handleListClick(desc)"
                        style="cursor:pointer;">
                        <t-list-item-meta :description="desc" />
                    </t-list-item>
                </t-list>
            </div>
            <div class="table-area">
                <t-table :data="tableData" :columns="tableColumns" size="small" style="height: 100%;"
                    :scroll="{ type: 'virtual', rowHeight: 48, bufferSize: 10 }" @row-click="handleRowClick"
                    :max-height="'100%'" :row-class-name="getRowClassName" rowKey="guid" />
            </div>
        </div>
        <!-- 弹框 -->
        <InspectionDialog :dialogVisible="dialogVisible" :dialog-table-data="dialogTableData" />
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useModelStore, useSelectedStore } from '../../store';
import { SceneManager } from '../../services/scene-manager';
import { IfcPropertyUtils, convertToTreeData } from '../../services/model-property.ts';
import { eventManager } from '../../services/scene-event.ts';
import { IfcCategoryMap } from '../../utils/ifc/ifcCategoryMap.ts'
import InspectionDialog from './InspectionDialog.vue';

const props = defineProps<{ visible: boolean; inspectType: string }>();

const emit = defineEmits(['update:visible']);

let loading = ref(false);
const loadingText = computed(() => `正在进行${props.inspectType}检查，请稍候...`);
const searchText = ref('');
const modelStore = useModelStore();
const selectedStore = useSelectedStore();
const sceneManager = SceneManager.getInstance();
const ifcPropertyUtils = IfcPropertyUtils.getInstance();

const descriptions = ref<string[]>([]);
const selectedKey = ref<string | null>(null);
const tableData = ref<any[]>([]);
const currentDataObj = ref<any>(null);
// 弹框控制和数据
const dialogVisible = ref(false);
const dialogTableData = ref<any[]>([]);

const categoryMapDict = Object.fromEntries(
    Object.entries(IfcCategoryMap).map(([_, value]) => [value.en, value.cn])
);

const tableColumns = [
    { colKey: 'guid', title: 'GUID', width: 250, ellipsis: true },
    { colKey: 'name', title: 'Name', width: 170, ellipsis: true },
    { colKey: 'tag', title: 'Tag', width: 80, ellipsis: true },
    {
        colKey: 'op',
        title: '',
        width: 50,
        cell: (h: any, { row }: { row: any }) =>
            h('div', {
                style: 'display: flex; align-items: center; justify-content: center; gap: 8px;'
            }, [
                // 第一个图标 - 查看
                h('a', {
                    style: 'cursor: pointer; display: flex; align-items: center; justify-content: center;',
                    onClick: (event: Event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        handleView(row);
                    }
                }, [
                    h('img', {
                        src: '/icons/view.svg',
                        width: '16',
                        height: '16'
                    })
                ]),
                // 第二个图标 - 焦点图标
                h('a', {
                    style: 'cursor: pointer; display: flex; align-items: center; justify-content: center;',
                    onClick: (event: Event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        handleFocus(row);
                    }
                }, [
                    h('img', {
                        src: '/icons/focus.svg',
                        width: '16',
                        height: '16'
                    })
                ])
            ])
    }
];

watch(
    () => modelStore.modelInspectData,
    (val) => {
        if (val) {
            const data = modelStore.modelInspectData?.data;
            console.log("模型检查数据为", data);
            if (data && typeof data === 'object') {
                // 将英文键替换为中文
                const translatedData: { [key: string]: any } = {};
                for (const [key, value] of Object.entries(data)) {
                    translatedData[categoryMapDict[key] || key] = value;
                }
                // 更新 descriptions
                descriptions.value = Object.keys(translatedData);
                if (descriptions.value.length > 0) {
                    loading.value = false;
                    handleListClick(descriptions.value[0]);
                }
            } else {
                descriptions.value = [];
                tableData.value = [];
                selectedKey.value = null;
            }
            searchText.value = '';
            console.log("数据已更新");
        }
    },
    { immediate: true, deep: true }
);

watch(() => props.inspectType, (val) => {
    console.log("检查规则已加载", val);
    searchText.value = '';
    descriptions.value = [];
    tableData.value = [];
    selectedKey.value = null;
    loading.value = true;
}, { immediate: true });

const handleSearch = () => {
    if (!searchText.value) return;
    const keyword = searchText.value.trim().toLowerCase();
    const dataObj = modelStore.modelInspectData?.data;
    if (!dataObj || typeof dataObj !== 'object') {
        console.log("handleSearch", "dataObj is not an object");
        return;
    }
    let foundKey: string | null = null;
    let event = { row: { guid: '' } }; // 模拟一个行对象

    for (const [key, value] of Object.entries(dataObj)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (
                    (item.Guid && String(item.Guid).toLowerCase().includes(keyword)) ||
                    (item.Tag && String(item.Tag).toLowerCase().includes(keyword))
                ) {
                    foundKey = key;
                    selectedStore.updateSelectedRowKey(item.Guid);
                    event.row = { guid: item.Guid };
                    handleRowClick(event);
                    break;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            const item = value as { Guid?: string; Tag?: string };
            if (
                (item.Guid && String(item.Guid).toLowerCase().includes(keyword)) ||
                (item.Tag && String(item.Tag).toLowerCase().includes(keyword))
            ) {
                foundKey = key;
                selectedStore.updateSelectedRowKey(item.Guid ?? null);
                event.row = { guid: item.Guid ?? '' };
                handleRowClick(event);
                break;
            }
        }
        if (foundKey) break;
    }

    if (foundKey) {
        selectedKey.value = categoryMapDict[foundKey];
        handleListClick(foundKey);
    } else {
        selectedKey.value = null;
        tableData.value = [];
    }
}
const handleListClick = (key: string) => {
    const englishKey = Object.entries(IfcCategoryMap).find(
        ([_, value]) => value.cn === key
    )?.[1]?.en || key;
    selectedKey.value = categoryMapDict[englishKey];
    const dataObj = modelStore.modelInspectData?.data?.[englishKey];
    currentDataObj.value = dataObj; // 保存当前dataObj

    if (Array.isArray(dataObj)) {
        tableData.value = dataObj.map(item => ({
            guid: item.Guid || '',
            name: item.Name || '',
            tag: item.Tag || '',
            allGreen: isAllGreen(item)
        }));
    } else if (dataObj && typeof dataObj === 'object') {
        tableData.value = [{
            guid: dataObj.Guid || '',
            name: dataObj.Name || '',
            tag: dataObj.Tag || '',
            allGreen: isAllGreen(dataObj)
        }];
    } else {
        tableData.value = [];
    }
}
const handleRowClick = async (event: any) => {
    selectedStore.updateSelectedRowKey(event.row.guid);
    const modelData = modelStore.modelData
    console.log("modelData", modelData);
    let expressID = ifcPropertyUtils.findExpressIdByGuid(modelData.tree, event.row.guid);
    console.log("对应的expressID", expressID);
    if (sceneManager.scene) {
        ifcPropertyUtils.clearAllHighlights(sceneManager.scene);
        if (expressID) {
            let data = modelData.tree;
            const meshConfig = {
                scene: sceneManager.scene,
                isFocus: false
            };
            // 调用统一的处理方法
            await ifcPropertyUtils.handleComponentClick(expressID, meshConfig, data);
            let node = ifcPropertyUtils.findNodeByExpressId(modelData.tree, expressID);
            eventManager.emit('scroll-to-node', node);
            console.log("点击高亮了构件", event.row.guid);
        } else {
            console.log("未找到对应构件");
            return;
        }
    }
}
const handleGlobalClick = (event: any) => {
    console.log("全局点击", event, props.visible, event.srcElement.tagName);
    if (!event.target) return;
    if (!event._vts && event.srcElement.tagName !== 'CANVAS' && props.visible) {
        selectedStore.updateSelectedRowKey(null);
        if (sceneManager.scene) {
            ifcPropertyUtils.clearAllHighlights(sceneManager.scene);
        }
    }
    dialogVisible.value = false;
};

// 查看操作
const handleView = (row: any) => {
    // 假设 row 是你要展示的对象，将其属性转为 [{key, value}] 数组
    // 通过 guid 查找完整数据
    let detail = null;
    if (Array.isArray(currentDataObj.value)) {
        detail = currentDataObj.value.find((item: any) => item.Guid === row.guid);
        console.log("detail", detail);
    } else if (currentDataObj.value && typeof currentDataObj.value === 'object') {
        // 只有一个对象时直接用
        detail = currentDataObj.value;
    }
    if (detail) {
        dialogTableData.value = convertToTreeData(detail);
        // 判断所有属性集子项的 state 是否全为 0
        let allGreen = true;
        for (const group of dialogTableData.value) {
            if (group.children && group.children.length > 0) {
                // 只判断属性集（_parentName !== 'Element Specific'）
                if (group.name !== 'Element Specific') {
                    for (const child of group.children) {
                        if (child.state !== 0) {
                            allGreen = false;
                            break;
                        }
                    }
                }
            }
            if (!allGreen) break;
        }
        dialogVisible.value = true;
    }
}
const handleFocus = async (event: any) => {
    console.log('焦点图标点击', event);
    selectedStore.updateSelectedRowKey(event.guid);
    const modelData = modelStore.modelData
    let expressID = ifcPropertyUtils.findExpressIdByGuid(modelData.tree, event.guid);
    if (sceneManager.scene) {
        ifcPropertyUtils.clearAllHighlights(sceneManager.scene);
        if (expressID) {
            let data = modelData.tree;
            const meshConfig = {
                scene: sceneManager.scene,
                isFocus: true
            };
            // 调用统一的处理方法
            await ifcPropertyUtils.handleComponentClick(expressID, meshConfig, data);
        } else {
            console.log("未找到对应构件");
            return;
        }
    }

}

function handleClose() {
    emit('update:visible', false); // 通知父组件隐藏Inspect
}

function getRowClassName({ row }: { row: { allGreen: boolean, guid: string } }) {
    if (!row) return '';
    if (!tableData.value || tableData.value.length === 0) return '';
    let baseClass = '';
    if (row && tableData.value && tableData.value.length > 0) {
        baseClass = row.allGreen === true ? 'green-border' : 'red-border';
    }
    if (selectedStore.selectedRowKey && row && row.guid === selectedStore.selectedRowKey) {
        baseClass = baseClass + ' selected-item';
    }
    return baseClass;
}
// 判断属性集所有子项的第一个元素是否全为0
function isAllGreen(obj: any) {
    // 找出所有属性集（key以Pset_开头且为对象）
    const psets = Object.entries(obj)
        .filter(([k, v]) => k.startsWith('Pset_') && typeof v === 'object' && v !== null);
    for (const [__, psetObj] of psets) {

        const psetObjTyped = psetObj as Record<string, unknown>;
        for (const val of Object.values(psetObjTyped)) {
            if (!Array.isArray(val) || val[0] !== 0) {
                return false;
            }

        }
    }
    return true;
}
// 组件挂载时添加全局点击监听
onMounted(() => {
    eventManager.add('click', handleGlobalClick);

});

// 组件卸载时移除监听器
onUnmounted(() => {
    eventManager.remove('click');
});


</script>



<style>
.check-root {
    width: 100%;
    min-width: 800px;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #f0f0f0;
    box-sizing: border-box;
    position: relative;
}

.loading-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.7);
    z-index: 999;
}

/* 顶部栏 */
.header-bar {
    width: 100%;
    height: 44px;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    box-sizing: border-box;
}

.header-title {
    font-size: 16px;
    font-weight: 400;
}

.header-close {
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: color 0.2s;
}

.header-close:hover svg {
    fill: #0052d9;
}

/* 搜索区域 */
#search-container {
    width: calc(100% - 30px);
    background-color: #fff;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    margin: 0 15px;
    height: 50px;
}

#search-container .t-input {
    width: 100%;
    margin-left: 0;
}



/* 内容区域 */
.content-area {
    flex: 1;
    display: flex;
    width: calc(100% - 30px);
    min-height: 0;
    background-color: rgb(255, 255, 255);
    border-top: 1px solid #eee;
    box-sizing: border-box;
    margin: 0 15px;
}

.list-area {
    width: 20%;
    height: calc(100% - 15px);
    overflow: hidden;
    border-right: 1px solid #eee;
    box-sizing: border-box;
    text-overflow: ellipsis;
}

.list-area .t-list-item__meta-description {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.table-area {
    width: 80%;
    height: calc(100% - 30px);
    overflow: auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    margin: 10px;
}

.selected-item {
    background-color: #e6f7ff !important;
}

.t-list {
    overflow: hidden;
}

.t-list.t-size-s .t-list-item {
    padding: var(--td-comp-paddingTB-m) var(--td-comp-paddingLR-l)
}

.t-list__inner {
    border-top: 1px solid #eee;
}

.t-list-item {
    min-height: 25px !important;
    padding-top: 4px !important;
    padding-bottom: 4px !important;
}

.t-list-item__meta {
    min-height: 24px !important;
    width: 100%;
}

.t-list-item__meta-content {
    width: 100%;
}

.t-table__content {
    border: 1px solid #eee;
}

.t-table__tree-col--inline {
    display: flex !important;
    flex-direction: row-reverse !important;
    justify-content: flex-end !important;
    font-size: 11.5px !important;
}

.t-table thead th {
    font-weight: 500 !important;
}

.t-table.t-table__row--active-single tbody>tr.t-table__row--active,
.t-table.t-table__row--active-multiple tbody>tr.t-table__row--active {
    background-color: #e6f7ff;
}

.check-root :deep(.t-table td) {
    color: #00000080 !important;
}

.t-table-tr--level-0 {
    background-color: #f0f0f0 !important;
}

.t-table__header--fixed:not(.t-table__header--multiple)>tr>th {
    background-color: white !important;
}

.t-table__body tr,
.t-table__body td {
    height: 28px !important;
    /* 或更小，比如24px */
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    white-space: nowrap !important;
    cursor: pointer;
}

/* 在第一个单元格上添加边框 */
.check-root .table-area .t-table__body tr.red-border td:first-child {
    border-left: 2px solid #ff0000 !important;
}

.check-root .table-area .t-table__body tr.green-border td:first-child {
    border-left: 2px solid #52c41a !important;
}


.check-root .table-area .t-table__body tr.green-border {
    border-left: 2px solid #52c41a !important;
}
</style>