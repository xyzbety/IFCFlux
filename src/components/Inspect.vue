<template>
    <div class="check-root" v-show="props.visible">
        <!-- 顶部栏 -->
        <div class="header-bar">
            <span class="header-title">检查结果</span>
            <span class="header-close" @click="handleClose">
                <svg width="18" height="18" viewBox="0 0 1024 1024" fill="#888" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M512 460.8l256-256a36.57 36.57 0 1 1 51.73 51.73l-256 256 256 256a36.57 36.57 0 1 1-51.73 51.73l-256-256-256 256a36.57 36.57 0 1 1-51.73-51.73l256-256-256-256A36.57 36.57 0 1 1 256 204.8l256 256z" />
                </svg>
            </span>
        </div>
        <!-- 搜索区域 -->
        <div id="search-container">
            <t-input v-model="searchText" placeholder="搜索Guid或Tag" @enter="handleSearch"
                style="width: 35%;margin-left: 15px;">
                <template #suffix>
                    <t-button @click="handleSearch" class="search-btn" size="small" theme="default"
                        style="background: transparent; border: none; box-shadow: none; margin-right: -5px; padding: 0 4px;">
                        <svg width="16" height="16" viewBox="0 0 1024 1024" fill="#888"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M768 704l192 192-64 64-192-192v-32l-16-16A352 352 0 1 1 704 704l16 16h32zM448 736a288 288 0 1 0 0-576 288 288 0 0 0 0 576z" />
                        </svg>
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
                    :table-layout="'auto'" :row-class-name="getRowClassName" rowKey="guid" />
            </div>
        </div>
        <!-- 弹框 -->
        <t-dialog v-model:visible="dialogVisible" header="属性赋值详情" width="400px" :showOverlay="false" :footer="null">
            <div style="max-height:45vh; overflow: auto;">
                <div style="max-height: 45vh; overflow: auto;">
                    <t-enhanced-table :data="dialogTableData" :columns="dialogTableColumns" rowKey="key" bordered
                        size="small" :tree="{ childrenKey: 'children', indent: 0 }"
                        :tree-expand-and-fold-icon="treeExpandAndFoldIcon" :showHeader="false" @row-click="handleRowClick"
                        :expandedTreeNodes="expandedKeys" @expanded-tree-nodes-change="onExpandedTreeNodesChange" />
                </div>
            </div>
        </t-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useModelStore } from '../store';
import { ChevronRightIcon, ChevronDownIcon } from 'tdesign-icons-vue-next'
import { Tooltip as TTooltip } from 'tdesign-vue-next';

const props = defineProps<{ visible: boolean; shouldInit: boolean }>();

const emit = defineEmits(['update:visible']);
const treeExpandAndFoldIcon = (h: any, { type }) => {
    return type === 'expand'
        ? h(ChevronRightIcon)
        : h(ChevronDownIcon);
};

const searchText = ref('');
const modelStore = useModelStore();
const descriptions = ref<string[]>([]);
const selectedKey = ref<string | null>(null);
const tableData = ref<any[]>([]);
const currentDataObj = ref<any>(null);
const expandedKeys = ref<string[]>([]);
// 弹框控制和数据
const dialogVisible = ref(false);
const dialogTableData = ref<any[]>([]);
const tableColumns = [
    { colKey: 'guid', title: 'GUID', ellipsis: true },
    { colKey: 'name', title: 'Name', ellipsis: true },
    { colKey: 'tag', title: 'Tag', ellipsis: true },
    {
        colKey: 'op',
        title: '',
        cell: (h, { row }) =>
            h(
                'a',
                {
                    style: 'color: #0052d9; cursor: pointer; display: flex; align-items: center; justify-content: center;',
                    onClick: () => handleView(row)
                },
                [
                    h('svg', {
                        width: '16',
                        height: '16',
                        viewBox: '0 0 1024 1024',
                        xmlns: 'http://www.w3.org/2000/svg'
                    }, [
                        h('path', {
                            d: 'M160 25.6h704A102.4 102.4 0 0 1 966.4 128v768a102.4 102.4 0 0 1-102.4 102.4H160A102.4 102.4 0 0 1 57.6 896V128A102.4 102.4 0 0 1 160 25.6z m0 76.8a25.6 25.6 0 0 0-25.6 25.6v768c0 14.08 11.52 25.6 25.6 25.6h704a25.6 25.6 0 0 0 25.6-25.6V128a25.6 25.6 0 0 0-25.6-25.6H160z',
                            fill: '#8a8a8a'
                        }),
                        h('path', {
                            d: 'M608 800a160 160 0 1 0 0-320 160 160 0 0 0 0 320z m0-64a96 96 0 1 1 0-192 96 96 0 0 1 0 192z',
                            fill: '#8a8a8a'
                        }),
                        h('path', {
                            d: 'M681.344 758.656l64 64a32 32 0 0 0 45.312-45.312l-64-64a32 32 0 0 0-45.312 45.312zM256 287.488H608a32 32 0 1 0 0-64H256a32 32 0 0 0 0 64zM256 479.488h160.128a32 32 0 0 0 0-64H256a32 32 0 0 0 0 64zM256 671.488h80a32 32 0 1 0 0-64H256a32 32 0 1 0 0 64z',
                            fill: '#8a8a8a'
                        })
                    ])
                ]
            )
    }
];

const dialogTableColumns = [
    {
        colKey: 'name',
        title: '名称',
        ellipsis: true,
        cell: (h, params) => {
            const children = [];
            // 用 TDesign 的 Tooltip 包裹文字
            children.push(
                h(TTooltip, { content: params.row.name, placement: 'top', overlayClassName: 'ellipsis-tooltip' }, {
                    default: () => h('span', {
                        style: `
                            display: inline-block;
                            max-width: 140px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            vertical-align: middle;
                            flex: 1;`
                    }, params.row.name)
                })
            );
            // 状态方框（属性集子项才有）
            if (params.row._parentName && params.row._parentName !== 'Element Specific') {
                const colorMap = {
                    0: '#52c41a',    // 绿色
                    1: '#d9001b',    // 深红色
                    2: '#ff7875',    // 浅红色
                    3: '#faad14',    // 深黄色
                    4: '#ffe58f'     // 浅黄色
                };
                const color = colorMap[params.row.state] || '#d9d9d9';
                children.push(
                    h('span', {
                        style: `display:inline-block;width:10px;height:10px;border-radius:3px;background:${color};position:absolute;right:10px;`
                    })
                );
            }
            // 展开/折叠图标（树节点才有）
            if (params.treeNodeCol && params.treeNodeRender) {
                children.push(
                    h('span', { style: 'margin-left:8px;' }, [params.treeNodeRender()])
                );
            }
            return h('div', { style: 'display: flex; align-items: center;' }, children);
        }
    },
    {
        colKey: 'value',
        title: '值',
        ellipsis: true,
    }
];
watch(
    () => modelStore.modelInspectData,
    () => {
        descriptions.value = [];
        tableData.value = [];
        selectedKey.value = null;
        currentDataObj.value = null;
    },
    { immediate: true, deep: true }
);

watch(
    () => props.shouldInit,
    (val) => {
        if (val) {
            // 只有shouldInit为true时才初始化数据
            const data = modelStore.modelInspectData?.data;
            if (data && typeof data === 'object') {
                descriptions.value = Object.entries(data).map(([key]) => key);
                if (descriptions.value.length > 0) {
                    handleListClick(descriptions.value[0]);
                }
            } else {
                descriptions.value = [];
                tableData.value = [];
                selectedKey.value = null;
            }
            console.log("数据更新了");
        }
    },
    { immediate: true, deep: true }
);
watch(dialogTableData, (val) => {
    expandedKeys.value = getAllExpandedKeys(val);
}, { immediate: true });

function getAllExpandedKeys(data: any[], childrenKey = 'children') {
    const keys: string[] = [];
    function traverse(list: any[]) {
        list.forEach(item => {
            if (item[childrenKey] && item[childrenKey].length) {
                keys.push(item.key);
                traverse(item[childrenKey]);
            }
        });
    }
    traverse(data);
    return keys;
}

function handleListClick(key: string) {
    selectedKey.value = key;
    const dataObj = modelStore.modelInspectData?.data?.[key];
    console.log("handleListClick", key, dataObj);
    currentDataObj.value = dataObj; // 保存当前dataObj
    // 判断属性集所有子项的第一个元素是否全为0
    function isAllGreen(obj: any) {
        // 找出所有属性集（key以Pset_开头且为对象）
        const psets = Object.entries(obj)
            .filter(([k, v]) => k.startsWith('Pset_') && typeof v === 'object' && v !== null);
        for (const [psetName, psetObj] of psets) {

            for (const val of Object.values(psetObj)) {
                if (!Array.isArray(val) || val[0] !== 0) {
                    return false;
                }

            }
        }
        return true;
    }

    if (Array.isArray(dataObj)) {
        tableData.value = dataObj.map(item => ({
            guid: item.Guid || '',
            name: item.Name || item.Entity || '',
            tag: item.Tag || '',
            allGreen: isAllGreen(item)
        }));
    } else if (dataObj && typeof dataObj === 'object') {
        tableData.value = [{
            guid: dataObj.Guid || '',
            name: dataObj.Name || dataObj.Entity || '',
            tag: dataObj.Tag || '',
            allGreen: isAllGreen(dataObj)
        }];
    } else {
        tableData.value = [];
    }
    console.log("tableData", tableData.value);
}

// 查看操作
function handleView(row: any) {
    // 假设 row 是你要展示的对象，将其属性转为 [{key, value}] 数组
    console.log("handleView", row);
    // 通过 guid 查找完整数据
    let detail = null;
    if (Array.isArray(currentDataObj.value)) {
        console.log("currentDataObj is array", currentDataObj.value);
        detail = currentDataObj.value.find((item: any) => item.Guid === row.guid);
        console.log("detail found", detail);

    } else if (currentDataObj.value && typeof currentDataObj.value === 'object') {
        // 只有一个对象时直接用
        detail = currentDataObj.value;
    }
    if (detail) {
        dialogTableData.value = convertToTreeData(detail);
        console.log("dialogTableData", dialogTableData.value);
        // 判断所有属性集子项的 state 是否全为 0
        let allGreen = true;
        for (const group of dialogTableData.value) {
            if (group.children && group.children.length > 0) {
                // 只判断属性集（_parentName !== 'Element Specific'）
                if (group.name !== 'Element Specific') {
                    for (const child of group.children) {
                        console.log("child", child);
                        if (child.state !== 0) {
                            allGreen = false;
                            break;
                        }
                    }
                }
            }
            if (!allGreen) break;
        }
        console.log("allGreen", allGreen);
        dialogVisible.value = true;
    }
}
function convertToTreeData(obj) {
    let idCounter = 1;
    const result = [];

    // 基础属性
    const baseChildren = [];
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            baseChildren.push({
                id: idCounter++,
                key: `base-${idCounter}`,
                name: key === 'Entity' ? 'IfcEntity' : (key === 'Guid' ? 'GlobalId' : key),
                value: value,
                _parentName: 'Element Specific'
            });
        }
    }
    if (baseChildren.length) {
        result.push({
            id: idCounter++,
            key: `element-specific-${idCounter}`,
            name: 'Element Specific',
            value: '',
            children: baseChildren
        });
    }

    // 属性集
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const children = Object.entries(value).map(([subKey, subVal]) => ({
                id: idCounter++,
                key: `child-${idCounter}`,
                name: subKey,
                state: Array.isArray(subVal) ? subVal[0] : subVal,
                value: Array.isArray(subVal) ? subVal[1] : subVal,
                _parentName: key
            }));
            result.push({
                id: idCounter++,
                key: `parent-${idCounter}`,
                name: key,
                value: '',
                children
            });
        }
    }
    return result;
}
function handleSearch() {
    if (!searchText.value) return;
    const keyword = searchText.value.trim().toLowerCase();
    const dataObj = modelStore.modelInspectData?.data;
    if (!dataObj || typeof dataObj !== 'object') {
        // 
        console.log("handleSearch", "dataObj is not an object");
        return;
    }
    console.log("handleSearch", "dataObj", dataObj);
    console.log("handleSearch", "keyword", keyword);
    let foundKey: string | null = null;

    for (const [key, value] of Object.entries(dataObj)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (
                    (item.Guid && String(item.Guid).toLowerCase().includes(keyword)) ||
                    (item.Tag && String(item.Tag).toLowerCase().includes(keyword))
                ) {
                    foundKey = key;
                    break;
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            if (
                (value.Guid && String(value.Guid).toLowerCase().includes(keyword)) ||
                (value.Tag && String(value.Tag).toLowerCase().includes(keyword))
            ) {
                foundKey = key;
            }
        }
        if (foundKey) break;
    }

    if (foundKey) {
        selectedKey.value = foundKey;
        handleListClick(foundKey);
    } else {
        selectedKey.value = null;
        tableData.value = [];
    }
}
function handleClose() {
    console.log("handleClose");
    emit('update:visible', false); // 通知父组件隐藏Inspect
}
function onExpandedTreeNodesChange(keys: string[]) {
    expandedKeys.value = keys;
}
function getRowClassName({ row }) {
    if (!row) return '';
    if (!tableData.value || tableData.value.length === 0) return '';
    return row.allGreen === true ? 'green-border' : 'red-border';
}
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
    width: 25%;
    height: calc(100% - 15px);
    overflow: hidden;
    border-right: 1px solid #eee;
    box-sizing: border-box;
}

.table-area {
    width: 75%;
    height: calc(100% - 30px);
    overflow: visible;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    margin: 15px;
}

.selected-item {
    background: #e6f7ff;
}

.t-list {
    overflow: visible;
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

.t-table td {
    color: #00000080 !important;
}

.t-table-tr--level-0 {
    background-color: #f0f0f0 !important;
}

.t-table__body tr,
.t-table__body td {
    height: 28px !important;
    /* 或更小，比如24px */
    padding-top: 2px !important;
    padding-bottom: 2px !important;
    white-space: nowrap !important;
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

.t-dialog {
    border-radius: 0px !important;
    position: absolute !important;
    top: 270px !important;
    left: 350px !important;
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
</style>