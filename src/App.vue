<template>
  <Sidebar :visible="isSidebarVisible" @update:visible="isSidebarVisible = $event" @request-open-file="handleOpenFile"
    @file-uploaded="handleFileUploaded($event)" />
  <div class="container-title" data-tauri-drag-region :style="themeStyle">
    <TitleBar :is-maximized="isMaximized" @open-file="handleOpenFile" @replay="handleReplay" @redo="handleRedo" />
  </div>
  <div class="container-ribbon" :style="themeStyle" @click="handleRibbonInteraction">
    <ribbon @file-uploaded="handleFileUploaded($event)"></ribbon>
  </div>
  <div class="container-canvas">
    <div class="canvas-left" v-show="layoutState.showStructureTree" :style="{
      width: layoutState.structureTreeWidth + 'px',
      minWidth: layoutState.structureTreeWidth === 0 ? '0' : '300px',
      margin: layoutState.structureTreeWidth === 0 ? '0' : '15px'
    }">
      <Dialog :title="'构件树'" :visible="layoutState.showStructureTree" @close="toggleStructureTreeDialog">
        <StructureTree ref="structureTreeRef" :tree-data="pageState.treeData" @table-cell-click="tableRowClick"
          @table-checkbox-click="onTableSelectChange" :style="themeStyle" />
      </Dialog>
    </div>

    <DragBar ref="leftDragBarRef" v-show="layoutState.showStructureTree" side="left"
      :current-width="layoutState.structureTreeWidth" :show-handle="true" @drag-start="handleDragStart" />

    <div id="canvas-middle">
      <!-- 检查结果区域 -->
      <div class="inspect-wrapper" v-show="layoutState.showInspectResult" :style="{
        width: layoutState.inspectResultWidth + 'px',
        minWidth: layoutState.inspectResultWidth === 0 ? '0' : '800px',
        display: 'flex',
        height: '100%'
      }">
        <div id="codeInspect" style="flex: 1 1 0;">
          <Inspect :visible="layoutState.showInspectResult" :inspect-type="inspectType"
            @update:visible="onInspectVisibleChange" :style="themeStyle" />
        </div>
        <DragBar ref="inspectDragBarRef" v-show="layoutState.showInspectResult" side="inspect"
          :current-width="layoutState.inspectResultWidth" :show-handle="false" @drag-start="handleDragStart" />
      </div>

      <!-- 主画布区域 -->
      <div id="rightArea" :style="{ flex: '1 1 0' }">
        <div id="viewer" style="position: relative; width: 100%; height: 100%;">
          <BabylonViewer></BabylonViewer>
          <cubeView v-show="modelStore.modelData"></cubeView>
          <ProgressBar :loading="modelStore.loading || false"
            :progress="modelStore.progress || { percent: 0, current: 0, total: 100, text: '' }" />
        </div>
      </div>
    </div>

    <DragBar ref="rightDragBarRef" v-show="layoutState.showPropertyTable" side="right"
      :current-width="layoutState.propertyTableWidth" :show-handle="true" @drag-start="handleDragStart" />

    <!-- 属性表区域 -->
    <div class="canvas-right" v-show="layoutState.showPropertyTable" :style="{
      width: layoutState.propertyTableWidth + 'px',
      minWidth: layoutState.propertyTableWidth === 0 ? '0' : '300px',
      margin: layoutState.propertyTableWidth === 0 ? '0' : '15px'
    }">
      <Dialog :title="'属性表'" :visible="layoutState.showPropertyTable" @close="togglePropertyTableDialog"
        @tab-change="handleTabChange" :activeTab="activeTab">
        <PropertyTable :property-data="pageState.property" :group-map="pageState.groupMap">
        </PropertyTable>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Sidebar from './components/menu/Sidebar.vue';
import TitleBar from './components/menu/TitleBar.vue';
import DragBar from './components/DragBar.vue';
import Ribbon from "./components/menu/Ribbon.vue";
import Dialog from './components/Dialog.vue';
import Inspect from './components/check/InspectionReport.vue';
import StructureTree from './components/view/StructureTree.vue';
import PropertyTable from './components/view/PropertyTable.vue';
import ProgressBar from './components/ProgressBar.vue';
import BabylonViewer from './components/BabylonViewer.vue';
import cubeView from './components/view/cubeView.vue'
import { useAppCore } from './composables/useAppCore';
import { useModelStore } from './store';
import { eventManager } from './services/scene-event';

const {
  isMaximized, isSidebarVisible, layoutState, structureTreeRef, 
  leftDragBarRef, inspectDragBarRef, rightDragBarRef, pageState, activeTab,
  themeStyle, inspectType,
  handleOpenFile, handleReplay, handleRedo, handleFileUploaded, handleRibbonInteraction,
  toggleStructureTreeDialog, togglePropertyTableDialog, tableRowClick, onTableSelectChange,
  handleDragStart, onInspectVisibleChange, handleTabChange,
} = useAppCore();

const modelStore = useModelStore();

onMounted(() => {
  eventManager.on('file-loaded', () => {
    if (structureTreeRef.value) {
      structureTreeRef.value.scrollToRow(1);
      structureTreeRef.value.clearSelected();
    }
    const ribbon = document.querySelector('smart-ribbon') as any;
    if (ribbon) {
      ribbon.selectTab(0);
    }
  });
  eventManager.on('scroll-to-node', (node) => {
    if (structureTreeRef.value) {
      structureTreeRef.value.scrollToRow(node);
    }
  });
  eventManager.on('clear-selection', () => {
    if (structureTreeRef.value) {
      structureTreeRef.value.clearSelected();
    }
  });
});

</script>

<style>
.container-ribbon {
  height: 130px;
}

smart-ribbon:focus>div.smart-ribbon {
  outline: none !important;

}

.container-canvas {
  position: relative;
  height: calc(100vh - 170px);
  display: flex;
  background-color: rgb(240, 240, 240);
  border-top: 1px solid rgb(175, 176, 182);
}

.canvas-left,
.canvas-right {
  min-width: 350px;
  position: relative;
  background: #f8f8f8;
  transition: width 0.1s;
  z-index: 1;
  margin: 15px;
}


/* 确保画布区域正确伸缩 */
#rightArea {
  transition: flex 0.3s ease;
  width: 300px;
}

/* 更新中间容器的flex布局 */
#canvas-middle {
  flex: 1 1 0;
  min-width: 0;
  position: relative;
  background: white;
  display: flex;
  height: 100%;
  align-items: stretch;
  /* 确保子元素高度一致 */
}


.inspect-wrapper {
  display: flex;
  height: 100%;
}

#codeInspect {
  height: 100%;
  flex: 1 1 0;
}


#rightArea {
  flex: 1 1 0;
  height: 100%;
  box-sizing: border-box;
}


#viewer {
  width: 100%;
  height: 100%;
  background: rgb(236, 241, 245);
}

#viewer-canvas {
  outline: none;
}
</style>
