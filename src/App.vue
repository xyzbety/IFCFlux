<template>
    <FileMenuSidebar :visible="isFileMenuVisible" @update:visible="isFileMenuVisible = $event" @request-open-file="handleOpenFile" />
  <div class="container-title" data-tauri-drag-region :style="themeStyle">
    <div class="title-left">
      <img src="/logo.png" alt="logo" style="padding: 0 5px;margin-left: 0px;" />
      <span>IFCFlux</span>
      <img src="/icons/open-file.svg" class="icon" @click="handleOpenFile" />
      <img src="/icons/undo.svg" class="icon" @click="handleReplay" />
      <img src="/icons/redo.svg" class="icon" @click="handleRedo" />
    </div>
    <div class="title-right">
      <img src="/icons/minimize.svg" class="icon" @click="minimize" />
      <img src="/icons/restore.svg" class="icon" v-if="isMaximized" @click="maximize" />
      <img src="/icons/maximize.svg" class="icon" v-if="!isMaximized" @click="maximize" />
      <img src="/icons/close.svg" class="icon" @click="close" />
    </div>
  </div>
  <div class="container-ribbon" :style="themeStyle" @click="handleRibbonInteraction">
    <ribbon @navigate-event="handleNavigate" @change-view="handleView" @visible-control="handleVisibility"
      @measure-event="handleMeasure" @slice-event='handleSlice' @build-tree="handleBuildTree"
      @explosion-event="handleExplosion" @properties-table="handlePropertiesTable" @file-uploaded="handleFileUploaded"
      @space-generate="handleSpaceGenerate" @light-settings="handleLightSettings" @inspect-click="handleInspectClick"
      @light-settings-reset="handleLightSettingsReset" @scene-settings="handleChangeScene"
      @animation-event="handleAnimationEvent" @animation-click="handleAnimationClick"
      @toggle-file-menu="toggleFileMenu"></ribbon>
  </div>
  <div class=" container-canvas">
    <div class="canvas-left" :style="{
      width: leftWidth + 'px',
      minWidth: leftWidth === 0 ? '0' : '350px',
      margin: leftWidth === 0 ? '0' : '15px'
    }">
      <Dialog :title="'构件树'" :visible="pageState.structureDialogVisible" @close="handleBuildTree">
        <StructureTree v-if="pageState.structureDialogVisible" ref="structureTreeRef" :tree-data="pageState.treeData"
          :active-row-key="pageState.sceneStructureTree.activeRowKey"
          :expanded-ids="pageState.sceneStructureTree.expandedIds"
          :selected-row-keys="pageState.sceneStructureTree.selectedRowKeys" :visible="pageState.structureDialogVisible"
          @row-click="tableRowClick" @expanded-change="onExpandedRowKeysChange" @select-change="onTableSelectChange" />
      </Dialog>
    </div>
    <div class="drag-bar drag-bar-left" @mousedown="startDrag('left', $event)" v-if="pageState.structureDialogVisible"></div>
    <div id="canvas-middle">
      <div id="codePanel" v-show="isAnimationsVisible === true">
        <div id="blocklyDiv"></div>
      </div>
      <div class="inspect-wrapper" v-show="isAnimationsVisible === false && isInspectVisible" :style="{
        width: inspectWidth + 'px',
        minWidth: inspectWidth === 0 ? '0' : '800px',
        display: 'flex',
        height: '100%'
      }">
        <div id="codeInspect" style="flex: 1 1 0;">
          <Inspect :visible="isInspectVisible" :should-init="shouldInitInspectData" @update:visible="onInspectVisibleChange" />
        </div>
        <div class="drag-bar drag-bar-inspect" @mousedown="startDrag('inspect', $event)"></div>
      </div>

      <div id="rightArea">
        <div id="khanonjs">
          <component :is="KhanonViewer" v-if="KhanonViewer"></component>
        </div>
      </div>
    </div>
    <div class="drag-bar drag-bar-right" @mousedown="startDrag('right', $event)" v-if="pageState.propertyDialogVisible"></div>
    <div class="canvas-right" :style="{
      width: rightWidth + 'px',
      minWidth: rightWidth === 0 ? '0' : '350px',
      margin: rightWidth === 0 ? '0' : '15px'
    }">
      <Dialog-r :title="'属性表'" :visible="pageState.propertyDialogVisible" @close=handlePropertiesTable
        @tab-change="handleTabChange" :activeTab="activeTab">
        <PropertyTable v-if="pageState.propertyDialogVisible" ref="propertyTableRef" :property-data="pageState.property"
          :expanded-ids="pageState.propertyExpandIds" :active-tab="activeTab" :visible="pageState.propertyDialogVisible"
          @expanded-change="treeNodesChange" />
      </Dialog-r>
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

// 检查是否在Tauri环境中运行
const isTauriEnv = isTauri();
console.log('是否在Tauri环境中运行:', isTauriEnv);
import { onMounted, reactive, ref, shallowRef, watch, markRaw, nextTick, computed, defineComponent, DefineComponent } from 'vue'
import { themeColors } from './styles/themes';
import './styles/app.css';
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui';
import { Core } from '@myfront/bimflux/dist/base/core/core';
import { CubeView, } from '@myfront/bimflux/dist';
import { getCurrentWindow } from '@tauri-apps/api/window';


import Ribbon from "./components/Ribbon.vue"
import FileMenuSidebar from './components/FileMenuSidebar.vue';
import Dialog from './components/Dialog.vue';
import DialogR from './components/DialogR.vue';
import Inspect from './components/Inspect.vue';
import StructureTree from './components/StructureTree.vue';
import PropertyTable from './components/PropertyTable.vue';
import ArrowDown from '/icons/arrow-down.svg'
import ArrowRight from '/icons/arrow-right.svg'
import { useModelStore, useSceneStore } from './store';
import { useSettingsStore } from './store/settings';
import { SlicePlane } from './utils/slice/slicePlane'
import { Measure } from './utils/measure/measure'
import { ifcStructureColumns, ifcPropertyColumns } from './utils/config'
import {
  findNodesUpToLevel, findAllChildExpressIds, highlightMeshes, isCameraStateEqual,
  applyCameraState, setupCameraByBoundingBox, getBoundingBoxForMeshes, createGround,
  resetModelToInitialState, restoreMaterials, getChildrenExpressIds, updateTempLineLabel
} from './utils/ifc-api'
import { IfcSpaceGen } from "./utils/ifcspacegen.ts";
import { IfcExplosion } from './utils/ifcLoader/IfcExplosion.ts';
import { getIfcChineseName } from './utils/ifcMap';

import * as Blockly from 'blockly';
import { workspace, initBlocks } from "./blockly/blocks";
import { javascriptGenerator } from 'blockly/javascript';
import { animatables } from './blockly/animation.ts';
import * as animationFns from './blockly/animation.ts';

// 批量挂载所有导出函数到 window
Object.keys(animationFns).forEach((key: keyof typeof animationFns) => {
  // 只挂载函数
  if (typeof (animationFns as any)[key] === 'function') {
    window[key] = (animationFns as any)[key];
  }
});
window.isAnimationStopped = false;

let isMaximized = ref(true); // 窗口是否最大化
let isAnimationsVisible = ref<boolean | null>(null); // 是否显示动画面板
const isInspectVisible = ref(false);
const sceneStore = useSceneStore()
const settingsStore = useSettingsStore();
const isFileMenuVisible = ref(false);

const themeStyle = computed(() => {
  const currentTheme = themeColors.find(t => t.value === settingsStore.themeColor) || themeColors[0];
  return {
    '--theme-color': currentTheme.value,
    '--theme-hover-color': currentTheme.hover,
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

const KhanonViewer = shallowRef<DefineComponent | null>(null)
const structureTreeRef = ref()
const propertyTableRef = ref()
const ifcPropertyColumn = shallowRef(markRaw(ifcPropertyColumns[0]))

// 过滤掉描述列的构件树列配置
const ifcStructureColumnsFiltered = ifcStructureColumns.filter((col: any) => col.colKey !== 'description')

console.log('ifcPropertyColumn', ifcPropertyColumn.value)
const activeTab = ref('property')

let scene: BABYLON.Scene
let camera: BABYLON.ArcRotateCamera;
let light: BABYLON.DirectionalLight;
let slicePlane: SlicePlane | null;
let selectedMeshId: any;
let isHightlight = true;
let isFocus = false;
let isGrid = false; // 是否显示网格
let measure: Measure | null;
let CoordinateTemp = {
  point: null as { x: number, y: number, z: number } | null
}
let initialCameraState: {
  alpha: number,
  beta: number,
  radius: number,
  target: BABYLON.Vector3
} | null = null;

let cameraState: any[] = [];
let currentIndex = -1; // 当前状态的索引

let toolboxVisible = true; // 添加状态跟踪
let isToggling = false; // 防止重复切换

let hiddenMeshIds = new Set<string>(); // 存储已隐藏的mesh ID
let isolatedMeshIds = new Set<string>(); // 存储已隔离的mesh ID
let transparentMeshIds = new Set<string>(); // 存储已半透明的mesh ID
let selectedMeshIds = new Set<string>(); // 当前选中的mesh
// 添加一个映射来存储原始材质属性
let originalMaterialProperties = new Map<string, { alpha: number }>(); // 存储原始材质属性
let isClickVisible = ref(true); // 是否通过点击选择可见
let shouldInitInspectData = ref(false);
let lastClickedMeshId: string | null = null; // 记录上次点击的mesh ID

const pageState = reactive({
  structureDialogVisible: false,  // 场景目录
  propertyDialogVisible: false,  // 构件特性
  treeData: [] as any[],
  ifcExpressIds: [] as any[],
  sceneStructureTree: { //场景目录
    selectedRowKeys: [] as (string | number)[],  //多选
    activeRowKey: [] as string[] as (string | number)[], // 激活
    expandedIds: [] as (string | number)[],   // 展开
    ids: [] as (string | number)[],  // id 集合
  },
  propertyAll: [] as any[],
  property: [] as any[], // 构件特性
  propertyExpandIds: [] as any[],  // 构件特性 节点展开
})

const leftWidth = ref(350);
const rightWidth = ref(350);
const inspectWidth = ref(800); // 默认宽度
let dragging = false;
let dragSide = '';
let startX = 0;
let startWidth = 0;
const showTreeTable = ref(true);
const showPropertyTable = ref(true);
function startDrag(side: 'left' | 'right' | 'inspect', event: MouseEvent) {
  dragging = true;
  dragSide = side;
  document.body.style.cursor = 'ew-resize';
  startX = event.clientX;
  startWidth =
    side === 'left'
      ? leftWidth.value
      : side === 'right'
        ? rightWidth.value
        : inspectWidth.value;

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!dragging) return;
  const container = document.querySelector('.container-canvas');
  if (!container) return;
  const totalWidth = container.clientWidth;
  const maxWidth = totalWidth;
  let newWidth =
    startWidth +
    (dragSide === 'left'
      ? event.clientX - startX
      : dragSide === 'right'
        ? startX - event.clientX
        : event.clientX - startX);
  newWidth = Math.max(350, Math.min(maxWidth, newWidth));
  if (dragSide === 'left') {
    leftWidth.value = newWidth;
  } else if (dragSide === 'right') {
    rightWidth.value = newWidth;
  } else if (dragSide === 'inspect') {
    inspectWidth.value = newWidth;
  }
}

function stopDrag() {
  dragging = false;
  document.body.style.cursor = '';
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}
function onInspectVisibleChange(val) {
  isInspectVisible.value = val;
  if (!val) {
    inspectWidth.value = 0;
  } else {
    // 重新打开时恢复默认宽度
    inspectWidth.value = 800;
  }
  console.log('checkVisibleChange', inspectWidth.value, isInspectVisible.value);
}

const toggleFileMenu = () => {
  isFileMenuVisible.value = !isFileMenuVisible.value;
};

const handleRibbonInteraction = () => {
  if (isFileMenuVisible.value) {
    isFileMenuVisible.value = false;
  }
};
// 导航控制
const handleNavigate = (action: 'pan' | 'rotate' | 'zoomIn' | 'zoomOut' | 'rotateRight' | 'rotateLeft') => {
  isHightlight = true;
  const camera = scene.activeCamera as BABYLON.ArcRotateCamera;

  switch (action) {
    case 'pan':
      camera._panningMouseButton = 0;
      break;
    case 'rotate':
      camera._panningMouseButton = 2;
      break;
    case 'zoomIn':
      camera.radius -= 10;
      break;
    case 'zoomOut':
      camera.radius += 10;
      break;
    case 'rotateLeft':
      camera.alpha += 0.3;
      break;
    case 'rotateRight':
      camera.alpha -= 0.3;
      break;
  }
  let event = {
    detail: {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone ? camera.target.clone() : { ...camera.target }
    }
  };
  handleHisBefore(event);
}
// 视图
const handleView = (view: 'default' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') => {
  isHightlight = true;
  const camera = scene.activeCamera as BABYLON.ArcRotateCamera;

  // 视角参数映射
  const viewParams: Record<string, { alpha?: number, beta?: number }> = {
    top: { alpha: Math.PI / 2, beta: 0 },
    bottom: { alpha: Math.PI / 2, beta: Math.PI },
    front: { alpha: Math.PI / 2, beta: Math.PI / 2 },
    back: { alpha: -Math.PI / 2, beta: Math.PI / 2 },
    left: { alpha: Math.PI, beta: Math.PI / 2 },
    right: { alpha: 0, beta: Math.PI / 2 },
    default: {}
  };

  const params = viewParams[view] || {};
  const t = (initialCameraState?.target?.clone ? initialCameraState.target.clone() : initialCameraState?.target) ?? new BABYLON.Vector3(0, 0, 0);
  camera.setTarget(t);
  camera.alpha = params.alpha ?? initialCameraState?.alpha ?? 2 * Math.PI / 3;
  camera.beta = params.beta ?? initialCameraState?.beta ?? Math.PI / 3;
  camera.radius = initialCameraState?.radius ?? 150;

  let event = {
    detail: {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone ? camera.target.clone() : { ...camera.target }
    }
  };
  handleHisBefore(event);
};

const handleVisibility = (mode: 'showAll' | 'hideSelected' | 'isolateSelected' | 'transparentSelected') => {
  isHightlight = true;
  restoreMaterials(scene);

  if (mode === 'showAll') {
    isClickVisible.value = true;
    // 显示所有mesh并清空所有集合
    hiddenMeshIds.clear();
    isolatedMeshIds.clear();
    transparentMeshIds.clear();
    selectedMeshIds.clear();

    scene.meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
      }
      mesh.isVisible = true;
      // 还原透明度到原始值
      if (mesh.material) {
        const originalProps = originalMaterialProperties.get(mesh.id);
        if (originalProps) {
          mesh.material.alpha = originalProps.alpha;
        } else {
          mesh.material.alpha = 1;
        }
      }
    });
    return;
  } else {
    isClickVisible.value = false;
  }

  // 根据模式将选中的mesh添加到对应的集合中
  if (mode === 'hideSelected' || mode === 'isolateSelected' || mode === 'transparentSelected') {
    let targetSet: Set<string>;

    if (mode === 'hideSelected') {
      targetSet = hiddenMeshIds;
    } else if (mode === 'isolateSelected') {
      targetSet = isolatedMeshIds;
    } else {
      targetSet = transparentMeshIds;
    }

    // 添加选中的mesh到对应集合
    if (selectedMeshIds && selectedMeshIds.size > 0) {
      selectedMeshIds.forEach(id => {
        targetSet.add(id);
      });
    } else if (selectedMeshId) {
      // 保持原有的单个元素处理逻辑
      targetSet.add(selectedMeshId);
    }

    console.log(`已${mode === 'hideSelected' ? '隐藏' : mode === 'isolateSelected' ? '隔离' : '半透明'}的mesh IDs:`, Array.from(targetSet));
  }

  scene.meshes.forEach(mesh => {
    if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
      return;
    }


    let meshVisible = true;
    let meshTransparent = false;

    // 1. 检查是否被隐藏
    if (hiddenMeshIds.has(mesh.id)) {
      meshVisible = false;
    }
    // 2. 检查隔离模式（只有隔离的mesh才显示）
    if (isolatedMeshIds.size > 0) {
      meshVisible = isolatedMeshIds.has(mesh.id);
    }

    // 3. 检查透明状态（只在可见时生效）
    if (meshVisible && transparentMeshIds.has(mesh.id)) {
      meshTransparent = true;
    }

    // 应用可见性
    mesh.isVisible = meshVisible;

    // 应用透明度
    if (meshTransparent) {
      // 为半透明mesh设置材质
      if (mesh.material && mesh.material.getClassName && mesh.material.getClassName() === "StandardMaterial") {
        if (!(mesh.material as any)._isClonedForTransparent) {
          const newMat = mesh.material.clone(mesh.material.name + "_transparent");
          if (newMat) {
            newMat.alpha = 0.5;
            (newMat as any)._isClonedForTransparent = true;
            mesh.material = newMat;
          }
        } else {
          mesh.material.alpha = 0.5;
        }
      } else if (mesh.material) {
        const newMat = mesh.material.clone(mesh.material.name + "_transparent");
        if (newMat) {
          newMat.alpha = 0.5;
          (newMat as any)._isClonedForTransparent = true;
          mesh.material = newMat;
        }
      }
    } else {
      // 还原非半透明mesh的透明度到原始值
      if (mesh.material) {
        const originalProps = originalMaterialProperties.get(mesh.id);
        if (originalProps) {
          mesh.material.alpha = originalProps.alpha;
        } else {
          mesh.material.alpha = 1;
        }
      }
    }
  });
};
// 测量
const handleMeasure = (type: 'distance' | 'area' | 'angle' | 'coordinate' | 'clear') => {
  clear();
  console.log(camera.radius)
  let markSize = 1;
  markSize = 0.1 + (camera.radius / 100) * 0.5;
  markSize = Math.max(0.1, Math.min(markSize, 5));
  isHightlight = false;
  if (type === 'clear') {
    isHightlight = true;
    return;
  }
  const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("myUI", true, scene);
  const container = new GUI.Rectangle();
  container.width = "200px";
  container.height = "100px";
  container.background = "transparent";
  container.thickness = 0;
  container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  advancedTexture.addControl(container);

  const distanceLabel = new GUI.TextBlock();
  distanceLabel.color = "Red";
  distanceLabel.fontSize = 24;
  distanceLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  container.addControl(distanceLabel);
  const anchor = BABYLON.MeshBuilder.CreateSphere("anchor", { diameter: 0.01 }, scene);
  anchor.isVisible = false;
  container.linkWithMesh(anchor);

  if (type === 'coordinate') {
    CoordinateTemp.point = null;
    const sphere = BABYLON.MeshBuilder.CreateSphere("pointMarker", { diameter: markSize }, scene);
    container.linkWithMesh(sphere);
    const material = new BABYLON.StandardMaterial("pointMaterial", scene);
    material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    // 添加发光效果
    material.emissiveColor = material.diffuseColor.scale(0.3);
    sphere.material = material;
    sphere.setEnabled(false)
    // measure = new Coordinate(scene, 'modelCoordinates');
    scene.onBeforeRenderObservable.add(() => {
      if (CoordinateTemp.point) {
        sphere.setEnabled(true)
        sphere.position = new BABYLON.Vector3(CoordinateTemp.point?.x, CoordinateTemp.point?.y, CoordinateTemp.point?.z);
        distanceLabel.text =
          `x: ${CoordinateTemp.point.x.toFixed(2)}\n` +
          `y: ${CoordinateTemp.point.y.toFixed(2)}\n` +
          `z: ${CoordinateTemp.point.z.toFixed(2)}`;
      }
    });
    return;
  }
  measure = new Measure(scene, type, markSize);
  measure.setLineColor(new BABYLON.Color4(255, 0, 0, 1));
  scene.onBeforeRenderObservable.add(() => {
    const meshes = scene.meshes.filter(mesh => mesh.name === "tempLine");
    if (meshes.length > 0) {
      const tempLine = meshes[0];
      updateTempLineLabel(tempLine, anchor);
    }
    if (type === 'distance') {
      distanceLabel.text = measure?.lineDistance ? `${measure.lineDistance.toFixed(2)} m` : '';
    } else if (type === 'area') {
      distanceLabel.text = measure?.area ? `${measure.area.toFixed(2)} m²` : '';
    } else if (type === 'angle') {
      distanceLabel.text = measure?.angle ? `${measure.angle.toFixed(2)} °` : '';
    }
  });
}
// 剖切
const handleSlice = (action: 'visible' | 'reset' | 'x' | 'y' | 'z') => {
  isHightlight = false;

  if (action === 'visible') {
    if (slicePlane) {
      slicePlane.isShowPlane = !slicePlane.isShowPlane;
    }
    return;
  }

  if (action === 'reset') {
    if (slicePlane) {
      slicePlane.destroy();
      slicePlane = null;
    }
    return;
  }

  // x/y/z 方向剖切
  if (slicePlane) {
    slicePlane.destroy();
    slicePlane = null;
  }
  slicePlane = new SlicePlane(scene, 80);
  slicePlane.start(action);
};

// 构件树
const handleBuildTree = () => {
  isHightlight = true
  pageState.structureDialogVisible = !pageState.structureDialogVisible
  const canvasLeft = document.getElementsByClassName('canvas-left')[0] as HTMLElement
  canvasLeft.style.width = pageState.structureDialogVisible ? '350px' : '0';
  canvasLeft.style.margin = pageState.structureDialogVisible ? '15px' : '0';
  leftWidth.value = pageState.structureDialogVisible ? 350 : 0
  const ribbonItem = document.querySelectorAll('.smart-ribbon-item');
  if (ribbonItem) {
    ribbonItem.forEach(item => {
      if ((item as any).label === "构件树") {
        const smartButton = item.querySelector('smart-button');
        if (pageState.structureDialogVisible)
          smartButton?.classList.add("selected")
        else
          smartButton?.classList.remove("selected")
      }
    })
  }
}

// 属性表
const handlePropertiesTable = () => {
  isHightlight = true
  pageState.propertyDialogVisible = !pageState.propertyDialogVisible
  const canvasRight = document.getElementsByClassName('canvas-right')[0] as HTMLElement
  canvasRight.style.width = pageState.propertyDialogVisible ? '350px' : '0';
  canvasRight.style.margin = pageState.propertyDialogVisible ? '15px' : '0';
  rightWidth.value = pageState.propertyDialogVisible ? 350 : 0
  if (pageState.propertyDialogVisible) {
    showPropertyTable.value = false;
    nextTick(() => {
      showPropertyTable.value = true;
    });
  }
  const ribbonItem = document.querySelectorAll('.smart-ribbon-item');
  if (ribbonItem) {
    ribbonItem.forEach(item => {
      if ((item as any).label === "属性表") {
        const smartButton = item.querySelector('smart-button');
        if (pageState.propertyDialogVisible)
          smartButton?.classList.add("selected")
        else
          smartButton?.classList.remove("selected")
      }
    })
  }
}
let ifcExplosion: IfcExplosion | null = null;
const handleExplosion = (type: any) => {
  if (!scene || !ifcExplosion) return;
  if (type === 'clear') {
    clear()
    ifcExplosion.destroy(); // 还原模型
    return;
  }
  let axisVec = new BABYLON.Vector3(
    Number(type.X) || 0,
    Number(type.Y) || 0,
    Number(type.Z) || 0
  )
  ifcExplosion.bom(axisVec)
}
// 灯光设置
const handleLightSettings = (data: any) => {
  isHightlight = true
  if (data.lightX)
    light.direction.x = Number(data.lightX)
  if (data.lightY)
    light.direction.y = Number(data.lightY)
  if (data.lightZ)
    light.direction.z = Number(data.lightZ)
  if (data.lightIndensity || data.lightIndensity === 0)
    light.intensity = Number(data.lightIndensity)
  if (data.lightShadowEnabled === true)
    light.shadowEnabled = data.lightShadowEnabled
  if (data.lightShadowEnabled === false)
    light.shadowEnabled = data.lightShadowEnabled
}
const handleLightSettingsReset = () => {
  isHightlight = true
  const handleSliderX = document.getElementById("horizontalSliderX") as any;
  const handleSliderY = document.getElementById("horizontalSliderY") as any;
  const handleSliderZ = document.getElementById("horizontalSliderZ") as any;
  const inputIndensity = document.getElementById("inputIndensity") as HTMLInputElement;
  const checkboxShadow = document.getElementById("checkboxShadow") as HTMLInputElement;
  light.direction = new BABYLON.Vector3(1, -0.5, 0.5)
  light.intensity = 0.75
  light.shadowEnabled = true
  if (handleSliderX) handleSliderX.val(light.direction.x)
  if (handleSliderY) handleSliderY.val(light.direction.y)
  if (handleSliderZ) handleSliderZ.val(light.direction.z)
  if (inputIndensity) inputIndensity.value = light.intensity.toString()
  if (checkboxShadow) checkboxShadow.checked = true
}

// 修改场景背景色
const handleChangeScene = (data: any) => {
  isHightlight = true
  const khanonjs = document.getElementById("khanonjs") as HTMLCanvasElement;
  if (data.backgroundColor) {
    // 渐变
    // khanonjs.style.background = `linear-gradient(to bottom, ${data.backgroundColor}, rgb(187, 195, 199,1.0))`;
    khanonjs.style.backgroundColor = data.backgroundColor;
  }
  if (scene) {
    let ground = scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
    if (data.focusMode || data.focusMode === false) {
      // 计算模型包围盒
      const bbox = getBoundingBoxForMeshes(scene.meshes);
      if (!ground) {
        createGround(scene, bbox, isGrid);
        ground = scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
      }
      // isFocus = data.focusMode
      isGrid = data.focusMode
      console.log("地面网格", isGrid)
      ground?.setEnabled(isGrid)
    }
    if (data.dragSpeed)
      camera.panningSensibility = 20 - data.dragSpeed
  }
}
// 清除残留
function clear() {
  if (scene) {
    // restoreMaterials(scene)
    const existingUI = scene.textures.filter(t => t.name === "myUI");
    if (existingUI) {
      existingUI.forEach(t => t.dispose());
    }
    const oldMeshes = scene.meshes.filter(mesh =>
      mesh.name === "measureLine" ||
      mesh.name === "tempLine" ||
      mesh.name === "measureRectangle" ||
      mesh.name === "tempRectangle" ||
      mesh.name === "rectangleMesh" ||
      mesh.name === "pointMarker"
    );
    oldMeshes.forEach(mesh => mesh.dispose());
    if (measure) {
      measure.destroy();
      measure = null;
    }
    const explosionSliderX = document.getElementById("explosionSliderX") as any;
    const explosionSliderY = document.getElementById("explosionSliderY") as any;
    const explosionSliderZ = document.getElementById("explosionSliderZ") as any;
    if (explosionSliderX) explosionSliderX.val(0)
    if (explosionSliderY) explosionSliderY.val(0)
    if (explosionSliderZ) explosionSliderZ.val(0)
  }
}
function resetGlobalVariables() {
  hiddenMeshIds.clear();
  isolatedMeshIds.clear();
  transparentMeshIds.clear();
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
  if (slicePlane) {
    slicePlane.destroy();
    slicePlane = null;
  }
  toolboxVisible = true; // 添加状态跟踪
  isToggling = false; // 防止重复切换

  // 重置相机状态历史
  cameraState = [];
  currentIndex = -1;
  // 重置动画状态
  animatables.forEach(anim => anim.stop());
  animatables.length = 0;
  window.isAnimationStopped = false;
  shouldInitInspectData.value = false;
}

// 文件上传事件
const handleFileUploaded = () => {
  const modelStore = useModelStore()
  console.log("文件已上传", modelStore.modelData);
  // 获取模型数据
  const modelData = modelStore.modelData
  if (modelData) {
    clear();
    resetGlobalVariables();
    let arr = Array.from(Core.getActiveScenes());
    scene = arr[0].babylon.scene;
    camera = scene.activeCamera as BABYLON.ArcRotateCamera;
    ifcExplosion = new IfcExplosion(scene)
    if (workspace) {
      workspace.clear();
    }
    if (!workspace || (workspace as any).getAllBlocks().length === 0) {
      initBlocks(scene)
    }

    // 计算模型包围盒
    const bbox = getBoundingBoxForMeshes(scene.meshes);

    setupCameraByBoundingBox(camera, bbox);
    initialCameraState = {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone ? camera.target.clone() : new BABYLON.Vector3(camera.target.x, camera.target.y, camera.target.z)
    };

    const linkMesh = BABYLON.MeshBuilder.CreateBox("linkMesh", { size: 0.1 }, scene);
    linkMesh.position = initialCameraState.target;
    linkMesh.setEnabled(false); // 不显示链接点

    const handleInspectboxFocus = document.getElementById("checkboxFocus") as HTMLInputElement;
    if (handleInspectboxFocus.checked) {
      createGround(scene, bbox, isGrid);
    }

    if (camera) {
      console.log("camera", camera.panningSensibility);
      light = scene.getLightByName("fillLight") as BABYLON.DirectionalLight;
      const shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
      shadowGenerator.usePoissonSampling = true;
      if (shadowGenerator) {
        scene.meshes.forEach((mesh) => {
          const grid = scene.meshes.find(m => m.name === 'infiniteGrid');
          if (mesh !== grid) {
            shadowGenerator.addShadowCaster(mesh); // 仅模型投射阴影
            mesh.receiveShadows = true;
          }
          // 保存原始材质属性
          if (mesh.material && !originalMaterialProperties.has(mesh.id)) {
            originalMaterialProperties.set(mesh.id, {
              alpha: mesh.material.alpha
            });
          }
        });
      }
    }

    // 初始化cubeView
    new CubeView(scene)
    scene.onBeforeRenderObservable.add(() => {
      scene.getEngine().resize();
      scene.getEngine().setDepthBuffer(true);
      scene.getEngine().setDepthWrite(true);
      scene.getEngine().setDepthFunction(BABYLON.Engine.LEQUAL);
    });
    pageState.treeData = modelData.tree
    console.log("构件树数据", pageState.treeData);
    pageState.property = []
    pageState.ifcExpressIds = modelData.ifcExpressIds

    // 结构目录默认展开到第三层级
    const expandedKeys = findNodesUpToLevel(modelData.tree, 5); // 增加展开层级到5层

    // **新增：获取所有节点的 expressId 并设置为默认选中**
    const getAllExpressIds = (nodes) => {
      let ids = [];
      nodes.forEach(node => {
        if (node.expressId) {
          ids.push(String(node.expressId)); // 确保是字符串类型
        }
        if (node.children && node.children.length > 0) {
          ids = ids.concat(getAllExpressIds(node.children));
        }
      });
      return ids;
    };
    
    // 设置默认全选
    const allExpressIds = getAllExpressIds(modelData.tree);
    pageState.sceneStructureTree.selectedRowKeys = allExpressIds;
    
    console.log("默认选中的节点IDs:", allExpressIds);
    pageState.sceneStructureTree.expandedIds = expandedKeys
    pageState.propertyAll = modelData.properties

    // 设置展开状态
    pageState.sceneStructureTree.expandedIds = expandedKeys;
    // **新增：确保默认全选时所有模型可见**
    nextTick(() => {
      updateModelVisibility(allExpressIds);
    });

    // 文件加载后，显示构件树和属性表
    pageState.structureDialogVisible = true;
    pageState.propertyDialogVisible = true;
    leftWidth.value = 350;
    rightWidth.value = 350;

    // 更新Ribbon中按钮的状态
    const ribbonItem = document.querySelectorAll('.smart-ribbon-item');
    if (ribbonItem) {
      ribbonItem.forEach(item => {
        if ((item as any).label === "构件树" || (item as any).label === "属性表") {
          const smartButton = item.querySelector('smart-button');
          smartButton?.classList.add("selected")
        }
      })
    }
  }
};

const handleAnimationEvent = async (action: 'start' | 'pause' | 'stop' | 'reset' | 'toolbox') => {
  if (action === 'toolbox') {
    // 防抖处理
    if (isToggling) return;
    isToggling = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const blocklyToolbox = document.getElementsByClassName("blocklyToolbox")[0];

      if (blocklyToolbox) {
        (blocklyToolbox as HTMLElement).style.display = toolboxVisible ? 'none' : 'block';
        toolboxVisible = !toolboxVisible;
      }
    } finally {
      // 延迟重置，防止快速点击
      setTimeout(() => { isToggling = false; }, 300);
      return;
    }
  }
  if (action === 'pause') {
    animatables.forEach(anim => anim.pause());
    return;
  }
  if (action === 'stop') {
    window.isAnimationStopped = true; // 标记停止
    animatables.forEach(anim => anim.stop());
    animatables.length = 0;
    // 重置模型到初始状态
    resetModelToInitialState(scene, initialCameraState, camera, originalMaterialProperties);
    return;
  }
  if (action === 'reset') {
    // 可选：重置模型状态
    return;
  }
  // start
  // 检查是否有暂停的动画，有则恢复，无则重新生成代码
  let hasPaused = false;
  animatables.forEach(anim => {
    if (anim.paused) {
      anim.restart();
      hasPaused = true;
    }
  });
  if (hasPaused) return; // 有暂停动画则只恢复，不重新生成代码

  // 没有暂停动画，才重新生成和执行
  animatables.forEach(anim => anim.stop());
  animatables.length = 0;
  window.isAnimationStopped = false; // 重置标志
  // 重置模型到初始状态
  resetModelToInitialState(scene, initialCameraState, camera, originalMaterialProperties);
  // 等待一帧确保重置完成
  await new Promise(resolve => requestAnimationFrame(resolve));

  javascriptGenerator.addReservedWords('code');
  var code = javascriptGenerator.workspaceToCode(workspace);
  // 在每个 await 前自动插入停止检查
  const enhancedCode = code.replace(
    /(\s*)(await\s+)/g,
    '$1if(window.isAnimationStopped) return;\n$1$2'
  );

  console.log("生成的代码", code);
  console.log("增强后的代码", enhancedCode);
  eval(`(async () => { ${enhancedCode} })()`);
};

const handleAnimationClick = (event: string) => {
  console.log("handleAnimationClick", event);
  if (event === 'click') {
    if (!workspace || (workspace as any).getAllBlocks().length === 0) {
      initBlocks(scene)
      console.log('initBlocks')
    }
    isAnimationsVisible.value = true
    pageState.structureDialogVisible = true
    pageState.propertyDialogVisible = true
    handleBuildTree()
    handlePropertiesTable()
    const codePanel = document.getElementById("codePanel") as HTMLDivElement;
    codePanel.style.flex = '0.75 1 0';
    codePanel.style.borderRight = '1px solid #ccc';
    setTimeout(() => {
      if (workspace) {
        (workspace as any).getToolbox()?.refreshSelection();
        Blockly.svgResize(workspace as any);
      }
    }, 100);
  } else if (event === 'unclick') {
    isAnimationsVisible.value = true
    pageState.structureDialogVisible = false
    pageState.propertyDialogVisible = false
    handleBuildTree()
    handlePropertiesTable()
    const codePanel = document.getElementById("codePanel") as HTMLDivElement;
    codePanel.style.flex = '0 1 0';
  } else if (event === 'unclick-inspect') {
    isAnimationsVisible.value = false
    pageState.structureDialogVisible = true
    pageState.propertyDialogVisible = true
    handleBuildTree()
    handlePropertiesTable()
    const codePanel = document.getElementById("codePanel") as HTMLDivElement;
    codePanel.style.flex = '0.75 1 0';
    codePanel.style.borderRight = '1px solid #ccc';
  }
}
const handleSpaceGenerate = async (action: 'generate' | 'export') => {
  console.log("handleSpaceGenerate", action);
  const modelStore = useModelStore();
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
async function handleInspectClick(event: string) {
  console.log("handleInspectClick", event);
  if (event === 'show') {
    isInspectVisible.value = true; // 先隐藏
    shouldInitInspectData.value = false; // 只显示，不初始化数据
    await nextTick(); // 等待DOM更新
  } else if (event === 'inspect') {
    isInspectVisible.value = true;
    shouldInitInspectData.value = true; // 
  }
  inspectWidth.value = 800;
}
// 构件特性 节点展开
const treeNodesChange = (value: (string | number)[]) => {
  console.log('treeNodesChange', value);
  pageState.propertyExpandIds = value
}

// 构件树展开状态变化处理
const onExpandedRowKeysChange = (expandedRowKeys: (string | number)[]) => {
  console.log('构件树展开状态变化:', expandedRowKeys);
  pageState.sceneStructureTree.expandedIds = expandedRowKeys;
}

// 表格选中状态变化处理
const onTableSelectChange = (selectedRowKeys: (string | number)[], { selectedRowData }: { selectedRowData: any[] }) => {
  console.log('表格选中状态变化:', selectedRowKeys, selectedRowData);
  pageState.sceneStructureTree.selectedRowKeys = selectedRowKeys;
   // 更新模型可见性
  updateModelVisibility(selectedRowKeys);
};
// 递归获取节点及其所有子节点的 expressId
const getAllChildrenExpressIds = (nodes, parentExpressId) => {
  let allIds = [];
  
  const findNode = (nodeList, targetId) => {
    for (const node of nodeList) {
      if (String(node.expressId) === String(targetId)) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNode(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  
  const collectAllChildren = (node) => {
    if (node.expressId) {
      allIds.push(String(node.expressId));
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => collectAllChildren(child));
    }
  };
  
  const targetNode = findNode(nodes, parentExpressId);
  if (targetNode) {
    collectAllChildren(targetNode);
  }
  
  return allIds;
};

// 更新模型可见性
const updateModelVisibility = (selectedRowKeys) => {
  if (!scene) return;
  
  // 获取所有选中节点及其子节点的 expressId
  const allVisibleIds = new Set();
  
  selectedRowKeys.forEach(expressId => {
    const childrenIds = getAllChildrenExpressIds(pageState.treeData, expressId);
    childrenIds.forEach(id => allVisibleIds.add(String(id)));
  });
  
  console.log('应该可见的节点IDs:', Array.from(allVisibleIds));
  
  // 更新场景中所有 mesh 的可见性
  scene.meshes.forEach(mesh => {
    // 跳过特殊 mesh（天空盒、地面、网格等）
    if (mesh.name === 'skyBox' || 
        mesh.name === 'ground' || 
        mesh.name === 'infiniteGrid' ||
        mesh.name === 'measureLine' ||
        mesh.name === 'tempLine' ||
        mesh.name === 'measureRectangle' ||
        mesh.name === 'tempRectangle' ||
        mesh.name === 'rectangleMesh' ||
        mesh.name === 'pointMarker') {
      return;
    }
    
    // 根据 expressId 或 globalId 判断是否应该可见
    const meshExpressId = mesh.metadata?.globalId || mesh.id;
    const shouldBeVisible = allVisibleIds.has(String(meshExpressId));
    
    // 设置可见性
    mesh.isVisible = shouldBeVisible;
    
    // 可选：打印调试信息
    if (!shouldBeVisible && mesh.isVisible !== shouldBeVisible) {
      console.log(`隐藏模型: ${meshExpressId}`);
    }
  });
  
  // 清除其他状态集合，避免冲突
  hiddenMeshIds.clear();
  isolatedMeshIds.clear();
  transparentMeshIds.clear();
  
  console.log(`可见模型数量: ${Array.from(allVisibleIds).length}`);
};

function findParentIds(tree, targetId, path = []) {
  for (const node of tree) {
    if (String(node.expressId) === String(targetId)) {
      return path;
    }
    if (node.children) {
      const result = findParentIds(node.children, targetId, [...path, String(node.expressId)]);
      if (result) return result;
    }
  }
  return null;
}
// 结构目录 行 点击
const tableRowClick = async (event: any) => {
  if (!scene) {
    console.warn('tableRowClick called, but scene is not initialized yet.');
    return;
  }
  let expressID: string | null = null;
  let globalId: string | null = null;
  
  // 统一处理 expressID（来自表格点击或场景点击）

  // 处理表格点击事件
  if (event?.row?.expressId) {
    const { row } = event
    expressID = row.type === 'ifcSiteNode'
      ? row.expressId.replace('ifcSiteNode_', '')
      : row.expressId;
    globalId = row.globalId || expressID; // 优先使用 GlobalId
    selectedMeshIds.clear()
    selectedMeshIds = new Set(getChildrenExpressIds(row));
    lastClickedMeshId = expressID; // 记录上次点击的mesh ID
  }
  // 处理场景点击事件
  else if (event?.detail?.expressID !== undefined) {
    expressID = event.detail.expressID; // 来自场景点击事件
    globalId = event.detail.globalId || expressID; // 优先使用 GlobalId
    CoordinateTemp.point = event.detail.point
    console.log('CoordinateTemp:', CoordinateTemp);
    if (expressID)
      lastClickedMeshId = expressID; // 记录上次点击的mesh ID
  }
  // 处理直接传入的行数据（TDesign表格的row-click事件）
  else if (event?.expressId) {
    const row = event
    expressID = row.type === 'ifcSiteNode'
      ? row.expressId.replace('ifcSiteNode_', '')
      : row.expressId;
    globalId = row.globalId || expressID; // 优先使用 GlobalId
    selectedMeshIds.clear()
    selectedMeshIds = new Set(getChildrenExpressIds(row));
    lastClickedMeshId = expressID; // 记录上次点击的mesh ID
  }
  else {
    console.warn('tableRowClick: 无法解析事件数据', event);
    return;
  }
  
  if (!isClickVisible.value) {
    expressID = lastClickedMeshId;
  }

  if (!expressID) {
    console.warn('tableRowClick: expressID is null');
    return;
  }

  selectedMeshId = expressID
  const colorPicker = document.getElementById("colorPicker") as any;
  if (expressID === '' && colorPicker) {
    colorPicker.opened = false
  }

  pageState.property = await getProperty(expressID)
  pageState.propertyExpandIds = pageState.property.map((item: any) => item.id)
  console.log('tableRowClick', pageState.property);
  console.log('pageState.propertyExpandIds', pageState.propertyExpandIds);

  if (pageState.structureDialogVisible && structureTreeRef.value) {
    // 1. 找到所有父节点 expressId
    const parentIds = findParentIds(pageState.treeData, expressID) || [];
    // 2. 合并到 expandedIds
    pageState.sceneStructureTree.expandedIds = Array.from(new Set([
      ...pageState.sceneStructureTree.expandedIds,
      ...parentIds
    ]));
    console.log('parentIds:', parentIds);
    console.log('expandedIds:', pageState.sceneStructureTree.expandedIds);
    // 3. 设置高亮并滚动
    nextTick(() => {
      pageState.sceneStructureTree.activeRowKey = [String(expressID)];
      nextTick(() => {
        structureTreeRef.value.gotoRow(expressID);
      });
    });
  }
  // 查找当前节点及其所有子节点的expressID
  const allExpressIds = findAllChildExpressIds(pageState.treeData, expressID);
  allExpressIds.push(expressID); // 包含当前节点本身
  const expressIdSet = new Set(allExpressIds);

  // 基于 GlobalId 查找对应的mesh进行联动
  const exactMatches = scene.meshes.filter(mesh => {
    // 优先使用 GlobalId 匹配，如果没有则使用 expressId
    return expressIdSet.has(mesh.metadata?.globalId) || expressIdSet.has(mesh.id);
  });
  
  if (exactMatches.length === 1 && exactMatches[0]?.name === 'skyBox')
    return;
  // 高亮mesh
  let isVisibleMesHighlight = true;
  scene.meshes.forEach((mesh) => {
    if (mesh.name === selectedMeshId || mesh.metadata?.globalId === globalId) {
      isVisibleMesHighlight = mesh.isVisible;
    }
  })
  if (isHightlight && isVisibleMesHighlight) {
    highlightMeshes(exactMatches, scene, isFocus);
  }
}

// 获取属性
const getProperty = async (expressID: string) => {
  const showPropertyKey = ['GlobalId', 'Name', 'LongName', 'ObjectType', 'Tag', 'Phase', 'type']
  const property = []
  const pset = pageState.propertyAll[expressID]
  let spec: any[] = []
  const expressIdsArray = Object.values(pageState.ifcExpressIds);

  // 找到当前expressID的索引
  const currentIndex = expressIdsArray.findIndex(id => id === expressID);

  if (currentIndex !== -1) {
    const currentElement = expressIdsArray[currentIndex];
    const nextElement = expressIdsArray[currentIndex + 1]; // 可能为undefined

    if (currentElement && nextElement) {
      for (let i = Number(currentElement); i < Number(nextElement); i++) {
        const currentData = pageState.propertyAll[i];
        if (currentData) {
          spec.push(currentData);
        }
      }
    }
  } else {
    console.log(`未找到expressID: ${expressID}`);
  }
  if (pset === undefined) {
    return []
  } else if (Object.keys(pset).length > 0) {
    const value = [] as any
    let id = 1
    Object.keys(pset).map((key: string) => {
      if (showPropertyKey.indexOf(key) > -1) {
        const v = pset[key]?.value !== undefined ? pset[key]?.value : pset[key]
        if (v !== null) {
          if (key === 'type') {
            value.push({
              id,
              name: 'IfcEntity',
              value: getIfcChineseName(v)
            })
          } else {
            value.push({
              id,
              name: key,
              value: v
            })
          }
          id++
        }
      }
    })
    const specific = {
      id,
      name: 'Element Specific',
      value: '',
      children: value.sort((a: any, b: any) => {
        return a.name - b.name
      }),
      // spread: true
    }
    property.push(specific)

    spec.forEach((p: any) => {
      if (p.type === 1451395588) {
        // console.log(p)
        id++
        property.push({
          id,
          name: p.Name?.value,
          value: '',
          children: p.HasProperties.map((v: any) => {
            const value = pageState.propertyAll[v?.value]
            id++
            return {
              id,
              name: value.Name.value,
              value: typeof (value.NominalValue) === ('string' || 'number') ? value.NominalValue : String(value.NominalValue?.value)
            }
          }),
          // spread: true
        })
      }
    })

  }
  return property
}
// 结构目录 多选
const selectChange = (event: any) => {
  const options = event.detail;
  const selectedIds = new Set(options.selectKeys);
  scene.meshes.forEach(mesh => {
    // 跳过天空盒等特殊mesh
    if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
      return;
    }
    mesh.isVisible = selectedIds.has(mesh.id);
  });
};

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
  // Set initial theme for ribbon after a delay to ensure it's rendered
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
    console.log('窗口大小改变');
    if (isTauriEnv) {
      const maximized = await getCurrentWindow().isMaximized();
      console.log('当前窗口是否最大化:', maximized);
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

// 记录历史状态前
const handleHisBefore = (event: any) => {
  // console.log('handleHisBefore', event);
  if (!event.detail) return;

  const newState = {
    alpha: event.detail.alpha,
    beta: event.detail.beta,
    radius: event.detail.radius,
    target: event.detail.target.clone ? event.detail.target.clone() : { ...event.detail.target }
  };

  // 如果数组为空或状态发生变化
  if (currentIndex === -1 || !isCameraStateEqual(cameraState[currentIndex], newState)) {
    // 如果在历史中间有新操作，丢弃后面的历史
    if (currentIndex < cameraState.length - 1) {
      cameraState = cameraState.slice(0, currentIndex + 1);
    }

    cameraState.push(newState);
    currentIndex = cameraState.length - 1;
    // console.log('状态已添加到历史', newState);
  } else {
    // console.log('状态未变化，不添加到历史');
  }
}

// 记录历史状态后
const handleHisAfter = (event: any) => {
  if (!event.detail) return;

  const newState = {
    alpha: event.detail.alpha,
    beta: event.detail.beta,
    radius: event.detail.radius,
    target: event.detail.target.clone ? event.detail.target.clone() : { ...event.detail.target }
  };

  // 如果数组为空或状态发生变化
  if (currentIndex === -1 || !isCameraStateEqual(cameraState[currentIndex], newState)) {
    // 如果在历史中间有新操作，丢弃后面的历史
    if (currentIndex < cameraState.length - 1) {
      cameraState = cameraState.slice(0, currentIndex + 1);
    }

    cameraState.push(newState);
    currentIndex = cameraState.length - 1;
    // console.log('状态已添加到历史', newState);
  } else {
    // console.log('状态未变化，不添加到历史');
  }
}

// 打开文件
const handleOpenFile = async () => {
  const fileInput = document.getElementById('fileInput');
  if (!fileInput) {
    console.error('File input element not found');
    return;
  } fileInput.click();
}
// 回退到上一个状态
const handleReplay = () => {
  if (currentIndex <= 0) {
    return;
  }

  currentIndex--;
  const prevState = cameraState[currentIndex];
  applyCameraState(prevState, camera);
}

// 重做到下一个状态
const handleRedo = () => {
  if (currentIndex >= cameraState.length - 1) {
    return;
  }

  currentIndex++;
  const nextState = cameraState[currentIndex];
  applyCameraState(nextState, camera);
}


// 最大化窗口
const maximize = async () => {
  if (isTauriEnv) {
    const maximized = await getCurrentWindow().isMaximized();
    if (maximized) {
      await getCurrentWindow().unmaximize();
    } else {
      await getCurrentWindow().maximize();
    }
  } else {
    console.log("Maximize action is only available in Tauri environment.");
  }
};

// 最小化窗口
const minimize = async () => {
  if (isTauriEnv) {
    await getCurrentWindow().minimize();
  } else {
    console.log("Minimize action is only available in Tauri environment.");
  }
};

// 关闭窗口
const close = async () => {
  if (isTauriEnv) {
    await getCurrentWindow().close();
  } else {
    console.log("Close action is only available in Tauri environment.");
  }
};



</script>

<style>
.container-title {
  /* background-color: #185abd; */
  color: white;
}

.container-title,
.title-left,
.title-right {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  font-size: 40px;
}

.title-left img {
  height: 15px;
  padding: 0 5px;
}

.title-left span {
  height: 40px;
  line-height: 40px;
  font-size: 16px;
  padding: 0 5px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.title-left span:hover {
  background-color: #1651aa;
}

.title-left svg:hover,
.title-right svg:hover {
  background-color: #1651aa;
  cursor: pointer;
}

.title-right svg:last-child:hover {
  cursor: pointer;
  background-color: #e81123;
}

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

#canvas-middle {
  flex: 1 1 0;
  min-width: 0;
  position: relative;
  background: white;
  display: flex;
  height: 100%;
}

.drag-bar {
  width: 1px;
  cursor: ew-resize;
  background: #e0e0e0;
  z-index: 10;
  position: relative;
  transition: background 0.2s;
}

.drag-bar:hover {
  background: #b0b0b0;
}

.inspect-wrapper {
  display: flex;
  height: 100%;
}

#codeInspect {
  height: 100%;
  flex: 1 1 0;
}

.drag-bar-inspect {
  width: 1px;
  flex: none;
  /* 关键：防止被flex挤压 */
  cursor: ew-resize;
  background: #e0e0e0;
  z-index: 10;
  height: 100%;
  transition: background 0.2s;
}

.drag-bar-inspect:hover {
  background: #b0b0b0;
}

#codePanel {
  flex: 0 1 0;
  height: 100%;
  box-sizing: border-box;
}

#rightArea {
  flex: 1 1 0;
  height: 100%;
  box-sizing: border-box;
}

#blocklyDiv {
  width: 100%;
  height: 100%;
}

.blocklyMainBackground {
  stroke-width: 0;
}

#khanonjs {
  width: 100%;
  height: 100%;
  background: white;
}

#khanonjs-canvas {
  outline: none;
}
</style>
