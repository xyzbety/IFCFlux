<template>
  <FileMenuSidebar :visible="isFileMenuVisible" @update:visible="isFileMenuVisible = $event"
    @request-open-file="handleOpenFile" @file-uploaded="handleFileUploaded" />
  <div class="container-title" data-tauri-drag-region :style="themeStyle">
    <TitleBar :is-maximized="isMaximized" @open-file="handleOpenFile" @replay="handleReplay" @redo="handleRedo" />
  </div>
  <div class="container-ribbon" :style="themeStyle" @click="handleRibbonInteraction">
    <ribbon @navigate-event="handleNavigate" @change-view="handleView" @visible-control="handleVisibility"
      @measure-event="handleMeasure" @slice-event='handleSlice' @build-tree="handleBuildTree"
      @explosion-event="handleExplosion" @properties-table="handlePropertiesTable" @file-uploaded="handleFileUploaded"
      @space-generate="handleSpaceGenerate" @light-settings="handleLightSettings" @inspect-click="handleInspectClick"
      @light-settings-reset="handleLightSettingsReset" @scene-settings="handleChangeScene"
      @animation-event="handleAnimationEvent" @animation-click="handleAnimationClick"
      @ribbon-tab-change="handleRibbonTabChange" @toggle-file-menu="toggleFileMenu"></ribbon>
  </div>
  <div class="container-canvas">
    <div class="canvas-left" v-show="layoutState.showStructureTree" :style="{
      width: layoutState.structureTreeWidth + 'px',
      minWidth: layoutState.structureTreeWidth === 0 ? '0' : '300px',
      margin: layoutState.structureTreeWidth === 0 ? '0' : '15px'
    }">
      <Dialog :title="'构件树'" :visible="layoutState.showStructureTree" @close="toggleStructureTreeDialog">
        <StructureTree ref="structureTreeRef" :tree-data="pageState.treeData" :visible="layoutState.showStructureTree"
          @table-cell-click="tableRowClick" @table-checkbox-click="onTableSelectChange" :style="themeStyle" />
      </Dialog>
    </div>

    <DragBar ref="leftDragBarRef" v-show="layoutState.showStructureTree" side="left"
      :current-width="layoutState.structureTreeWidth" :show-handle="true" @drag-start="handleDragStart" />

    <div id="canvas-middle">
      <!-- 动画控制器组件 -->
      <div v-show="layoutState.showAnimationPanel"
        :style="{ width: layoutState.animationPanelWidth, minWidth: layoutState.showAnimationPanel ? '300px' : '0' }">
        <AnimationController ref="animationControllerRef" :is-visible="layoutState.showAnimationPanel" :scene="scene"
          :initial-camera-state="sceneManager.initialCameraState" :camera="sceneManager.camera"
          :original-material-properties="originalMaterialProperties" @animation-event="handleAnimationEvent" />
      </div>

      <!-- 检查结果区域 -->
      <div class="inspect-wrapper" v-show="layoutState.showInspectResult" :style="{
        width: layoutState.inspectResultWidth + 'px',
        minWidth: layoutState.inspectResultWidth === 0 ? '0' : '800px',
        display: 'flex',
        height: '100%'
      }">
        <div id="codeInspect" style="flex: 1 1 0;">
          <Inspect :visible="layoutState.showInspectResult" :should-init="shouldInitInspectData"
            :inspect-type="inspectType" @update:visible="onInspectVisibleChange" :style="themeStyle" />
          @update:visible="onInspectVisibleChange" />
        </div>
        <DragBar ref="inspectDragBarRef" v-show="layoutState.showInspectResult" side="inspect"
          :current-width="layoutState.inspectResultWidth" :show-handle="false" @drag-start="handleDragStart" />
      </div>

      <!-- 主画布区域 -->
      <div id="rightArea" :style="{ flex: layoutState.showAnimationPanel ? '2 1 0' : '1 1 0' }">
        <div id="khanonjs">
          <component :is="KhanonViewer" v-show="KhanonViewer"></component>
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
        <PropertyTable :property-data="pageState.property" :visible="layoutState.showPropertyTable">
        </PropertyTable>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
declare global {
  interface Window {
    isAnimationStopped: boolean;
    [key: string]: any;
  }
}
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
// 检查是否在Tauri环境中运行
const isTauriEnv = isTauri();
console.log('是否在Tauri环境中运行:', isTauriEnv);

import { onMounted, reactive, ref, shallowRef, watch, markRaw, computed, onUnmounted } from 'vue'
import * as BABYLON from '@babylonjs/core'
import { Core } from '@khanonjs/engine/base/core/core';
import FileMenuSidebar from './components/FileMenuSidebar.vue';
import TitleBar from './components/TitleBar.vue';
import DragBar from './components/DragBar.vue';
import Ribbon from "./components/Ribbon.vue"
import AnimationController from './components/AnimationController.vue';
import Dialog from './components/Dialog.vue';
import Inspect from './components/Inspect.vue';
import StructureTree from './components/StructureTree.vue';
import PropertyTable from './components/PropertyTable.vue';

import { useModelStore, useSceneStore } from './store';
import { useSettingsStore } from './store/settings';

import { SlicePlane } from './utils/analysis/slice/slicePlane.ts'
import { Measure } from './utils/analysis/measure'
import { ifcPropertyColumns } from './utils/config'
import { getBoundingBoxForMeshes, updateTempLineLabel } from './utils/index.ts'
import { IfcSpaceGen } from "./utils/ifc/ifcspacegen.ts";
import { IfcExplosion } from './utils/ifc/IfcExplosion.ts';
import * as animationFns from './utils/blockly/animation.ts';
import { useLayoutManager } from './composables/useLayoutManager.ts';
import { ModelManager } from "./services/model-manager.ts";
import { useDragResize } from './composables/useDragResize.ts';
import { IfcPropertyUtils } from './services/property-manager.ts';
import { SceneManager } from './services/scene-manager.ts';
import { themeColors } from './styles/themes';
import './styles/app.css';

let initResult: any = null; // 用于存储初始化结果
// 批量挂载所有导出函数到 window
Object.keys(animationFns).forEach((key: any) => {
  // 只挂载函数
  if (typeof (animationFns as any)[key] === 'function') {
    window[key] = (animationFns as any)[key];
  }
});
window.isAnimationStopped = false;

let isMaximized = ref(true); // 窗口是否最大化
let isFileMenuVisible = ref(false);
let scene: BABYLON.Scene
let selectedMeshId: any;
let isHightlight = true;
let isFocus = false;
let isGrid = false; // 是否显示网格
let measure: Measure | null;
let CoordinateTemp = {
  point: null as { x: number, y: number, z: number } | null
}

let selectedMeshIds = new Set<string>(); // 当前选中的mesh
let originalMaterialProperties = new Map<string, { alpha: number }>(); // 存储原始材质属性
let isClickVisible = ref(true); // 是否通过点击选择可见
let shouldInitInspectData = ref(false);
let inspectType = ref('');
let lastClickedMeshId: string | null = null; // 记录上次点击的mesh ID

const sceneStore = useSceneStore()
const modelStore = useModelStore();
const settingsStore = useSettingsStore();
const sceneManager = SceneManager.getInstance();
const ifcPropertyUtils = IfcPropertyUtils.getInstance();
const modelManager = ModelManager.getInstance();
const {
  layoutState, switchToMode, isMode, toggleStructureTree, togglePropertyTable, canToggleComponents,
  setStructureTreeWidth, setPropertyTableWidth, setInspectResultWidth, LayoutMode: LM,
} = useLayoutManager();
const KhanonViewer = shallowRef<any>(null)
const structureTreeRef = ref()
const animationControllerRef = ref() // 动画控制器引用
const leftDragBarRef = ref<InstanceType<typeof DragBar> | null>(null)
const inspectDragBarRef = ref<InstanceType<typeof DragBar> | null>(null)
const rightDragBarRef = ref<InstanceType<typeof DragBar> | null>(null)

const ifcPropertyColumn = shallowRef(markRaw(ifcPropertyColumns[0]))
const activeTab = ref('property')
const pageState = reactive({
  structureDialogVisible: false,  // 场景目录
  propertyDialogVisible: false,  // 构件特性
  treeData: [] as any[],
  ifcExpressIds: [] as any[],
  propertyAll: [] as any[],
  property: [] as any[], // 构件特性
})

const themeStyle = computed(() => {
  const currentTheme = themeColors.find(t => t.value === settingsStore.themeColor) || themeColors[0];
  return {
    '--theme-color': currentTheme.value,
    '--theme-hover-color': currentTheme.hover,
    '--td-brand-color': currentTheme.value
  };
});

watch(() => settingsStore.themeColor, (newColor) => {
  const currentTheme = themeColors.find(t => t.value === newColor) || themeColors[0];
  const ribbonElement = document.querySelector('#ribbon .smart-ribbon-header');
  if (ribbonElement) {
    (ribbonElement as HTMLElement).style.setProperty('--smart-surface', currentTheme.value);
    (ribbonElement as HTMLElement).style.setProperty('--smart-ui-state-hover', currentTheme.hover);
  }
});

// 处理 Ribbon 标签页切换
const handleRibbonTabChange = (tabIndex: number) => {
  console.log('Ribbon tab changed to:', tabIndex);

  switch (tabIndex) {
    case 0: // 查看
      switchToMode(LM.VIEW);
      shouldInitInspectData.value = false;
      break;
    case 1: // 检查
      switchToMode(LM.CANVAS_ONLY);
      shouldInitInspectData.value = false;
      break;
    case 2: // 设置
      switchToMode(LM.VIEW);
      shouldInitInspectData.value = false;
      break;
    case 3: // 测量
      switchToMode(LM.MEASURE);
      shouldInitInspectData.value = false;
      break;
    case 4: // 动画
      switchToMode(LM.ANIMATION);
      shouldInitInspectData.value = false;
      if (animationControllerRef.value) {
        animationControllerRef.value.initializeBlockly();
      }
      break;
    default:
      switchToMode(LM.VIEW);
      shouldInitInspectData.value = false;
  }
};


// 设置拖拽配置和回调
const dragConfig = { minWidth: 300, maxWidthRatio: 0.6, containerSelector: '.container-canvas' };

const dragCallbacks = {
  onWidthChange: (side: string, newWidth: number) => {
    if (side === 'left' && layoutState.value.showStructureTree) {
      setStructureTreeWidth(newWidth);
    } else if (side === 'right' && layoutState.value.showPropertyTable) {
      setPropertyTableWidth(newWidth);
    } else if (side === 'inspect' && layoutState.value.showInspectResult) {
      setInspectResultWidth(newWidth);
    }
  },
  onDragStart: (side: string) => {
    const dragBarRef = getDragBarRef(side);
    if (dragBarRef?.value) {
      dragBarRef.value.setDragging(true);
    }
  },
  onDragEnd: (side: string) => {
    const dragBarRef = getDragBarRef(side);
    if (dragBarRef?.value) {
      dragBarRef.value.setDragging(false);
    }
  }
};

// 获取对应的 DragBar 引用
const getDragBarRef = (side: string) => {
  switch (side) {
    case 'left':
      return leftDragBarRef;
    case 'right':
      return rightDragBarRef;
    case 'inspect':
      return inspectDragBarRef;
    default:
      return null;
  }
};

// 创建拖拽管理器
const { startDrag, cleanup } = useDragResize(dragConfig, dragCallbacks);

// 修改拖拽处理函数
const handleDragStart = (side: string, event: MouseEvent, currentWidth: number) => {
  startDrag(side, event, currentWidth);
};

const onInspectVisibleChange = (visible: boolean) => {
  if (!visible) {
    // 当检查结果组件被关闭时，切换到画布模式（只显示画布）
    switchToMode(LM.CANVAS_ONLY);
    shouldInitInspectData.value = false;
    inspectType.value = '';
  }
};
const toggleFileMenu = () => {
  isFileMenuVisible.value = !isFileMenuVisible.value;
};

const handleRibbonInteraction = () => {
  if (isFileMenuVisible.value) {
    isFileMenuVisible.value = false;
  }
};

const handleNavigate = (action: 'pan' | 'rotate' | 'zoomIn' | 'zoomOut' | 'rotateRight' | 'rotateLeft') => {
  isHightlight = true;
  sceneManager.handleNavigate(action);
}

// 视图
const handleView = (view: 'default' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') => {
  isHightlight = true;
  sceneManager.handleView(view);
}

// 剖切
const handleSlice = (action: 'visible' | 'reset' | 'x' | 'y' | 'z') => {
  isHightlight = false;
  if (action === 'reset') {
    isHightlight = true;
  }
  sceneManager.handleSlice(action, SlicePlane);
};

const handleVisibility = (mode: 'showAll' | 'hideSelected' | 'isolateSelected' | 'transparentSelected') => {
  isHightlight = true;
  sceneManager.handleVisibility(
    mode,
    selectedMeshIds,
    selectedMeshId,
    originalMaterialProperties,
    isClickVisible
  );
};
// 测量
const handleMeasure = (type: 'distance' | 'area' | 'angle' | 'coordinate' | 'clear') => {
  clear();
  isHightlight = false;
  if (type === 'clear') {
    isHightlight = true;
  }
  measure = sceneManager.handleMeasure(type, measure, CoordinateTemp, updateTempLineLabel);
}

// 构件树
const handleBuildTree = () => {
  console.log('handleBuildTree called');
  // 如果当前是画布模式，切换回查看模式并显示构件树
  if (isMode(LM.CANVAS_ONLY)) {
    switchToMode(LM.VIEW);
  } else {
    toggleStructureTree();
  }
};

// 更新属性表切换方法 - 在画布模式下也允许切换回查看模式
const handlePropertiesTable = () => {
  // 如果当前是画布模式，切换回查看模式并显示属性表
  if (isMode(LM.CANVAS_ONLY)) {
    switchToMode(LM.VIEW);
  } else {
    togglePropertyTable();
  }
};
// 更新Dialog关闭处理
const toggleStructureTreeDialog = () => {
  if (canToggleComponents.value) {
    toggleStructureTree();
  }
};

const togglePropertyTableDialog = () => {
  if (canToggleComponents.value) {
    togglePropertyTable();
  }
};
const handleExplosion = (type: any) => {
  sceneManager.handleExplosion(type);
}
// 灯光设置
const handleLightSettings = (data: any) => {
  isHightlight = true
  sceneManager.setLightSettings(data);
}
const handleLightSettingsReset = () => {
  isHightlight = true
  sceneManager.resetLightSettings();
}
// 修改场景背景色
const handleChangeScene = (data: any) => {
  isHightlight = true
  sceneManager.setSceneSettings(data);
}
// 清除残留
function clear() {
  if (sceneManager.scene) {
    if (measure) {
      measure.destroy();
      measure = null;
    }
  }
  // 调用SceneManager的清理方法
  sceneManager.clear();
}
function resetGlobalVariables() {
  selectedMeshIds.clear();
  originalMaterialProperties.clear();
  isClickVisible.value = true;
  lastClickedMeshId = null;
  selectedMeshId = null;
  isHightlight = true;
  isFocus = false;
  isGrid = false;
  measure = null;
  CoordinateTemp = {
    point: null as { x: number, y: number, z: number } | null
  };
  // 清空相机历史记录
  sceneManager.clear();
  // 重置动画状态
  // 重置动画状态（通过动画控制器）
  if (animationControllerRef.value) {
    animationControllerRef.value.resetAnimationState();
  }
  shouldInitInspectData.value = false;
}

// 文件上传事件
const handleFileUploaded = () => {
  console.log("文件已上传", modelStore.modelData);
  // 获取模型数据
  const modelData = modelStore.modelData
  if (modelData) {
    clear();
    resetGlobalVariables();
    let arr = Array.from(Core.getActiveScenes());
    scene = arr[0].babylon.scene;
    // 使用SceneManager初始化场景
    sceneManager.initializeScene(scene);
    sceneManager.setIfcExplosion(new IfcExplosion(scene));
    switchToMode(LM.VIEW);
    inspectType.value = "";
    // 初始化动画控制器
    if (animationControllerRef.value) {
      animationControllerRef.value.initializeBlockly();
    }

    sceneManager.setupSceneAfterModelLoad();
    sceneManager.setupCameraAndLight()

    // 处理地面和阴影
    const bbox = getBoundingBoxForMeshes(sceneManager.scene!.meshes);
    const handleInspectboxFocus = document.getElementById("checkboxFocus") as HTMLInputElement;
    if (handleInspectboxFocus.checked) {
      isGrid = true;
      sceneManager.setupGround(bbox, isGrid);
    }

    // 设置阴影
    sceneManager.setupShadows();

    // 保存原始材质属性
    sceneManager.saveOriginalMaterialProperties(originalMaterialProperties);

    initResult = ifcPropertyUtils.initializeModelData(modelData);

    pageState.treeData = initResult.treeData;
    pageState.property = [];
    pageState.ifcExpressIds = initResult.ifcExpressIds;
    pageState.propertyAll = initResult.propertyAll;
    structureTreeRef.value.scrollToRow(1)
    structureTreeRef.value.clearSelected();

    const ribbon = document.querySelector('smart-ribbon') as any;
    if (ribbon) {
      ribbon.selectTab(0);
    }
  }
};

// 动画事件处理（委托给动画控制器）
const handleAnimationEvent = async (action: 'start' | 'pause' | 'stop' | 'reset' | 'toolbox') => {
  if (animationControllerRef.value) {
    await animationControllerRef.value.handleAnimationEvent(action);
  }
};

const handleAnimationClick = (event: string) => {
  if (event === 'click' && animationControllerRef.value) {
    animationControllerRef.value.initializeBlockly();
  }
};
const handleInspectClick = async (event: number) => {
  console.log("handleInspectClick", event);

  // 验证事件参数
  if (![1, 2, 3, 4, 5].includes(event)) {
    console.warn("Invalid inspect event:", event);
    return;
  }
  let map = {
    1: "基础数据",
    2: "规划报建",
    3: "施工图审查",
    4: "智慧工地监管",
    5: "竣工验收"
  } as const
  inspectType.value = map[event as keyof typeof map];
  shouldInitInspectData.value = true;
  switchToMode(LM.INSPECT);
  console.log("开始检查", modelStore);

  const file = modelStore.file;
  if (file) {
    modelManager.setupInspectDataListener(file, event);
  }
};
const handleSpaceGenerate = async (action: 'generate' | 'export') => {
  console.log("handleSpaceGenerate", action);
  const file = modelStore.file;
  if (file) {
    const gen = new IfcSpaceGen(file);
    const result = gen.generateSpaces(); //生成IfcSpace
    if (action === 'generate') {
      result.then((rs) => {
        console.log("生成空间", rs);
        rs.forEach((mesh, idx) => {
          let positions = mesh.vertexData;
          if (Array.isArray(positions[0])) {
            positions = positions.flat();
          }
          let indices = mesh.faceData;
          if (Array.isArray(indices[0])) {
            indices = indices.flat();
          }
          // 创建自定义网格
          const customMesh = new BABYLON.Mesh(`space_${idx}`, scene);

          // 创建顶点数据
          const vertexData = new BABYLON.VertexData();
          vertexData.positions = positions; // 顶点坐标
          vertexData.indices = indices;     // 面索引

          // 初始化 normals 数组
          vertexData.normals = new Array(positions.length).fill(0);

          // 计算法线
          BABYLON.VertexData.ComputeNormals(vertexData.positions, vertexData.indices, vertexData.normals);

          // 应用到网格
          vertexData.applyToMesh(customMesh);

          // 设置材质（如半透明高亮）
          const mat = new BABYLON.StandardMaterial(`mat_${idx}`, scene);
          mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
          mat.alpha = 1;
          customMesh.material = mat;
        })
        alert("生成空间成功");
      })
    } else if (action === 'export') {
      result.then(async (rs) => {
        console.log("导出", rs);
        if (rs.length > 0) {
          await gen.save(); //保存到文件
          alert("导出成功！");
        }
        else {
          console.log("fail");
          alert("导出失败，请检查空间数据或模型！");
        }
      })
    }
  }
}

const onTableSelectChange = (event: any) => {
  console.log('表格选中状态变化:', event);

  // 解析事件数据
  let expressId = event.args[0]?.originData?.expressId;
  const isChecked = event.selectState; // 
  if (event.args[0].cellLocation === 'columnHeader') {
    expressId = IfcPropertyUtils.rootExpressId; // 如果是表头点击，使用根节点
  }

  if (!expressId) {
    console.warn('未找到expressId');
    return;
  }
  // 使用修改后的工具类更新模型可见性
  ifcPropertyUtils.updateModelVisibilityByCheckbox(scene, expressId, isChecked, pageState.treeData,);
};
// 结构目录 行 点击
const tableRowClick = async (event: any) => {
  if (!scene) {
    console.warn('tableRowClick called, but scene is not initialized yet.');
    return;
  }


  const tree = modelStore.modelData.tree;

  let expressID: string | null = null;
  let globalId: string | null = null;

  // 统一处理 expressID（来自表格点击或场景点击）

  // 处理表格点击事件
  if (event[0]?.originData?.expressId) {
    expressID = event[0]?.originData?.type === 'ifcSiteNode'
      ? event[0]?.originData?.expressId.replace('ifcSiteNode_', '')
      : event[0]?.originData?.expressId;
    globalId = event[0]?.originData?.globalId || expressID; // 优先使用 GlobalId
    selectedMeshIds.clear()
    selectedMeshIds = new Set(ifcPropertyUtils.getChildrenExpressIds(event[0]?.originData));
    lastClickedMeshId = expressID; // 记录上次点击的mesh ID
  }
  // 处理场景点击事件
  else if (event?.detail?.expressID !== undefined) {
    expressID = event.detail.expressID; // 来自场景点击事件
    globalId = event.detail.globalId || expressID; // 优先使用 GlobalId
    CoordinateTemp.point = event.detail.point
    if (expressID) {
      lastClickedMeshId = expressID; // 记录上次点击的mesh ID
      let node = ifcPropertyUtils.findNodeByExpressId(tree, expressID);
      if (structureTreeRef.value) {
        structureTreeRef.value.scrollToRow(node);
      }
    }
    else {
      if (structureTreeRef.value) {
        structureTreeRef.value.clearSelected();
      }
    }
  }
  else {
    console.warn('tableRowClick: 无法解析事件数据', event);
    return;
  }

  if (!isClickVisible.value) {
    expressID = lastClickedMeshId;
  }

  if (!expressID) {
    // 清除所有高亮和选中状态
    selectedMeshId = null;
    lastClickedMeshId = null;
    selectedMeshIds.clear();

    // 清除属性表数据
    pageState.property = [];

    // 清除场景中的高亮
    ifcPropertyUtils.clearAllHighlights(scene)
    const colorPicker = document.getElementById("colorPicker") as any;
    if (expressID === '' && colorPicker) {
      colorPicker.opened = false
    }
    return;
  }

  selectedMeshId = expressID

  let property = await ifcPropertyUtils.getProperty(expressID, pageState.propertyAll, pageState.ifcExpressIds)
  pageState.property = await ifcPropertyUtils.flattenTreeToGroupedItems(property);

  const meshConfig = {
    scene,
    selectedMeshId,
    globalId: globalId || expressID,
    isHighlight: isHightlight,
    isFocus
  };

  const treeConfig = {
    treeData: pageState.treeData,
    structureTreeRef: structureTreeRef.value,
    pageState: {
      structureDialogVisible: pageState.structureDialogVisible
    }
  };

  // 调用统一的处理方法
  await ifcPropertyUtils.handleComponentClick(expressID, meshConfig, treeConfig);
}


// 属性表tab切换
const handleTabChange = (event: any) => {
  activeTab.value = event
  const newValue =
    event === 'location' ? ifcPropertyColumns[1] :
      event === 'catalog' ? ifcPropertyColumns[2] :
        event === 'relation' ? ifcPropertyColumns[3] :
          ifcPropertyColumns[0]

  ifcPropertyColumn.value = markRaw(newValue)
}

onMounted(async () => {
  switchToMode(LM.CANVAS_ONLY);
  setTimeout(() => {
    const initialTheme = themeColors.find(t => t.value === settingsStore.themeColor) || themeColors[0];
    const ribbonElement = document.querySelector('#ribbon .smart-ribbon-header');
    if (ribbonElement) {
      (ribbonElement as HTMLElement).style.setProperty('--smart-surface', initialTheme.value);
      (ribbonElement as HTMLElement).style.setProperty('--smart-ui-state-hover', initialTheme.hover);
    }
  }, 550); // Wait for the ribbon component to initialize

  // 动态导入组件
  const module = await import('./components/KhanonViewer.vue')
  KhanonViewer.value = module.default
  window.addEventListener('mesh-clicked', tableRowClick);
  window.addEventListener("mouse-down", handleHisBefore)
  window.addEventListener("mouse-up", handleHisAfter)
  window.addEventListener("mouse-wheel", handleHisBefore)


  window.addEventListener("resize", async () => {
    if (isTauriEnv) {
      const maximized = await getCurrentWindow().isMaximized();
      if (maximized) {
        isMaximized.value = true;
      } else {
        isMaximized.value = false;
      }
    }
  });
  // 禁用右键菜单
  // window.addEventListener('contextmenu', async (event) => {
  //   event.preventDefault();
  // });
  if (isTauriEnv) {
    invoke('show_mainscreen').catch(error => {
      console.error('调用 show_mainscreen 失败:', error);
    });
  } else {
    console.log('不在Tauri环境中，无法调用show_mainscreen');
  }

  //  场景目录事件 - 已通过组件事件绑定，无需手动添加监听器
  watch(
    () => sceneStore.sceneSettings,
    (newVal) => {
      handleChangeScene(newVal)
    },
    { deep: true }
  )
})
// 组件卸载时清理
onUnmounted(() => {
  cleanup();
});
const handleHisBefore = (event: any) => {
  sceneManager.getCameraHistoryManager().recordState(event);
}

const handleHisAfter = (event: any) => {

  sceneManager.getCameraHistoryManager().recordState(event);
}
// 打开文件
const handleOpenFile = async () => {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput) {
    console.error('File input element not found');
    return;
  } fileInput.click();
}

const handleReplay = () => {
  sceneManager.undo();
}

const handleRedo = () => {
  sceneManager.redo();
}

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

/* 更新动画面板样式 */
#canvas-middle>div:first-child {
  /* 动画面板样式 */
  background: #f8f8f8;
  border-right: 1px solid #e0e0e0;
  transition: width 0.3s ease;
}

/* 确保画布区域正确伸缩 */
#rightArea {
  transition: flex 0.3s ease;
  min-width: 300px;
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


#khanonjs {
  width: 100%;
  height: 100%;
  background: rgb(236, 241, 245);
}

#khanonjs-canvas {
  outline: none;
}
</style>
