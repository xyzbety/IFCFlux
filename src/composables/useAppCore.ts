import { reactive, ref, shallowRef, watch, markRaw, computed, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import * as BABYLON from '@babylonjs/core';
import { useModelStore, useSceneStore } from '../store';
import { useSettingsStore } from '../store/settings';
import { Measure } from '../utils/analysis/measure';
import { ifcPropertyColumns } from '../utils/config';
import { getBoundingBoxForMeshes, updateTempLineLabel } from '../utils/index';
import { IfcSpaceGen } from "../utils/ifc/ifcspacegen";
import { IfcExplosion } from '../utils/ifc/IfcExplosion';
import * as animationFns from '../utils/blockly/animation';
import { useLayoutManager } from './useLayoutManager';
import { ModelManager } from "../services/model-manager";
import { useDragResize } from './useDragResize';
import { IfcPropertyUtils } from '../services/property-manager';
import { SceneManager } from '../services/scene-manager';
import { RibbonEventManager } from './useRibbonEvent';
import { eventManager } from '../services/event-manager';

// Global declarations
declare global {
    interface Window {
        isAnimationStopped: boolean;
        [key: string]: any;
    }
}

export function useAppCore() {
    let initResult: any = null; // 用于存储初始化结果
    // 批量挂载所有导出函数到 window
    Object.keys(animationFns).forEach((key: any) => {
        // 只挂载函数
        if (typeof (animationFns as any)[key] === 'function') {
            window[key] = (animationFns as any)[key];
        }
    });
    window.isAnimationStopped = false;

    const isTauriEnv = isTauri();
    let isMaximized = ref(true);
    let isSidebarVisible = ref(false);
    let selectedMeshId: any;
    let isHightlight = true;
    let isFocus = false;
    let isGrid = false;
    let measure: Measure | null;
    let CoordinateTemp = {
        point: null as { x: number, y: number, z: number } | null
    };

    let selectedMeshIds = new Set<string>();
    let originalMaterialProperties = new Map<string, { alpha: number }>();
    let isClickVisible = ref(true);
    let inspectType = ref('');
    let lastClickedMeshId: string | null = null;

    const sceneStore = useSceneStore();
    const modelStore = useModelStore();
    const settingsStore = useSettingsStore();
    const sceneManager = SceneManager.getInstance();
    const ifcPropertyUtils = IfcPropertyUtils.getInstance();
    const modelManager = ModelManager.getInstance();
    const {
        layoutState, switchToMode, toggleStructureTree, togglePropertyTable, canToggleComponents,
        setStructureTreeWidth, setPropertyTableWidth, setInspectResultWidth, LayoutMode: LM,
    } = useLayoutManager();

    const structureTreeRef = ref();
    const animationControllerRef = ref();
    const leftDragBarRef = ref<any>(null);
    const inspectDragBarRef = ref<any>(null);
    const rightDragBarRef = ref<any>(null);

    const ifcPropertyColumn = shallowRef(markRaw(ifcPropertyColumns[0]));
    const activeTab = ref('property');
    const pageState = reactive({
        treeData: [] as any[],
        ifcExpressIds: [] as any[],
        propertyAll: [] as any[],
        property: [] as any[],
        groupMap: {} as Record<number, any>
    });

    const themeStyle = computed(() => ({
        '--theme-color-primary': settingsStore.theme.value,
        '--td-brand-color': settingsStore.theme.value
    }));

    const hexToRgba = (hex: string, alpha: number) => {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, ( r, g, b) => r + r + g + g + b + b);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    watch(() => settingsStore.theme, (newTheme) => {
        if (newTheme && newTheme.value && newTheme.hover && newTheme.active) {
            const root = document.documentElement;
            root.style.setProperty('--theme-color-primary', newTheme.value);
            root.style.setProperty('--theme-color-hover', newTheme.hover);
            root.style.setProperty('--theme-color-active', newTheme.active);

            // Set background colors for menu items directly from the theme object
            root.style.setProperty('--theme-color-active-bg', newTheme.active);
            root.style.setProperty('--theme-color-hover-bg', newTheme.hover);

            // Set the shadow color for active setting cards
            root.style.setProperty('--theme-color-active-shadow', hexToRgba(newTheme.active, 0.3));
        }
    }, { deep: true, immediate: true });

    const handleRibbonTabChange = (tabIndex: number) => {
        if (!sceneManager.scene) {
            switchToMode(LM.CANVAS_ONLY);
            return;
        }
        switch (tabIndex) {
            case 0: case 2: switchToMode(LM.VIEW); break;
            case 1: switchToMode(LM.CANVAS_ONLY); break;
            case 3: switchToMode(LM.MEASURE); break;
            case 4:
                switchToMode(LM.ANIMATION);
                if (animationControllerRef.value) {
                    animationControllerRef.value.initializeBlockly();
                }
                break;
            default: switchToMode(LM.VIEW);
        }
    };

    const dragConfig = { minWidth: 300, maxWidthRatio: 0.6, containerSelector: '.container-canvas' };
    const dragCallbacks = {
        onWidthChange: (side: string, newWidth: number) => {
            if (side === 'left' && layoutState.value.showStructureTree) setStructureTreeWidth(newWidth);
            else if (side === 'right' && layoutState.value.showPropertyTable) setPropertyTableWidth(newWidth);
            else if (side === 'inspect' && layoutState.value.showInspectResult) setInspectResultWidth(newWidth);
        },
        onDragStart: (side: string) => getDragBarRef(side)?.value?.setDragging(true),
        onDragEnd: (side: string) => getDragBarRef(side)?.value?.setDragging(false)
    };

    const getDragBarRef = (side: string) => {
        if (side === 'left') return leftDragBarRef;
        if (side === 'right') return rightDragBarRef;
        if (side === 'inspect') return inspectDragBarRef;
        return null;
    };

    const { startDrag, cleanup } = useDragResize(dragConfig, dragCallbacks);

    const handleDragStart = (side: string, event: MouseEvent, currentWidth: number) => {
        startDrag(side, event, currentWidth);
    };

    const onInspectVisibleChange = (visible: boolean) => {
        if (!visible) {
            switchToMode(LM.CANVAS_ONLY);
            inspectType.value = '';
        }
    };

    const toggleFileMenu = () => isSidebarVisible.value = !isSidebarVisible.value;
    const handleRibbonInteraction = () => { if (isSidebarVisible.value) isSidebarVisible.value = false; };
    const handleNavigate = (action: any) => sceneManager.handleNavigate(action);
    const handleView = (view: any) => sceneManager.handleView(view);
    const handleSlice = (action: any) => {
        isHightlight = action === 'reset';
        console.log('handleSlice', action,isHightlight);
        sceneManager.handleSlice(action);
    };
    const handleVisibility = (mode: any) => {
        isHightlight = true;
        sceneManager.handleVisibility(mode, selectedMeshIds, selectedMeshId, originalMaterialProperties, isClickVisible);
    };
    const handleMeasure = (type: any) => {
        clear();
        isHightlight = type === 'clear';
        measure = sceneManager.handleMeasure(type, measure, CoordinateTemp, updateTempLineLabel);
    };
    const handleBuildTree = () => toggleStructureTree();
    const handlePropertiesTable = () => togglePropertyTable();
    const toggleStructureTreeDialog = () => { if (canToggleComponents.value) toggleStructureTree(); };
    const togglePropertyTableDialog = () => { if (canToggleComponents.value) togglePropertyTable(); };
    // const handleExplosion = (type: any) => sceneManager.handleExplosion(type);
    const handleLightSettings = (data: any) => { isHightlight = true; sceneManager.setLightSettings(data); };
    const handleLightSettingsReset = () => { isHightlight = true; sceneManager.resetLightSettings(); };
    const handleChangeScene = (data: any) => { isHightlight = true; sceneManager.setSceneSettings(data); };

    function clear() {
        if (measure) {
            measure.destroy();
            measure = null;
        }
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
        CoordinateTemp.point = null;
        sceneManager.clear();
        if (animationControllerRef.value) {
            animationControllerRef.value.resetAnimationState();
        }
    }

    const handleFileUploaded = async (file: File) => {
        if (!file || !sceneManager.scene) return;
        const scene = sceneManager.scene;
        clear();
        pageState.treeData = [];
        resetGlobalVariables();

        try {
            await modelManager.loadModel(file, () => {
                const modelData = modelStore.modelData;
                if (modelData) {
                    sceneManager.setIfcExplosion(new IfcExplosion(scene));
                    switchToMode(LM.VIEW);
                    inspectType.value = "";
                    if (animationControllerRef.value) animationControllerRef.value.initializeBlockly();
                    sceneManager.setupSceneAfterModelLoad();
                    sceneManager.setupCameraAndLight();
                    const bbox = getBoundingBoxForMeshes(sceneManager.scene!.meshes);
                    const handleInspectboxFocus = document.getElementById("checkboxFocus") as HTMLInputElement;
                    if (handleInspectboxFocus.checked) {
                        isGrid = true;
                        sceneManager.setupGround(bbox, isGrid);
                    }
                    sceneManager.setupShadows();
                    sceneManager.saveOriginalMaterialProperties(originalMaterialProperties);
                    initResult = ifcPropertyUtils.initializeModelData(modelData);
                    pageState.treeData = initResult.treeData;
                    pageState.property = [];
                    pageState.groupMap = {};
                    pageState.ifcExpressIds = initResult.ifcExpressIds;
                    pageState.propertyAll = initResult.propertyAll;
                    eventManager.emit('file-loaded');
                }
            });
        } catch (error) {
            console.error("Error loading model in App.vue:", error);
        }
    };

    const handleAnimationEvent = async (action: any) => {
        if (animationControllerRef.value) await animationControllerRef.value.handleAnimationEvent(action);
    };

    const handleAnimationClick = (event: string) => {
        if (event === 'click' && animationControllerRef.value) animationControllerRef.value.initializeBlockly();
    };

    const handleInspectClick = async (event: number) => {
        if (!sceneManager.scene) return;
        const map = { 1: "基础数据", 2: "规划报建", 3: "施工图审查", 4: "智慧工地监管", 5: "竣工验收" } as const;
        inspectType.value = map[event as keyof typeof map];
        switchToMode(LM.INSPECT);
        if (modelStore.file) modelManager.setupInspectDataListener(modelStore.file, event);
    };

    const handleSpaceGenerate = async (action: 'generate' | 'export') => {
        if (modelStore.file && sceneManager.scene) {
            const scene = sceneManager.scene;
            const gen = new IfcSpaceGen(modelStore.file);
            const result = await gen.generateSpaces();
            if (action === 'generate') {
                result.forEach((mesh: any, idx: number) => {
                    const customMesh = new BABYLON.Mesh(`space_${idx}`, scene);
                    const vertexData = new BABYLON.VertexData();
                    vertexData.positions = mesh.vertexData.flat();
                    vertexData.indices = mesh.faceData.flat();
                    if (vertexData.positions && vertexData.indices) {
                        vertexData.normals = new Array(vertexData.positions.length).fill(0);
                        BABYLON.VertexData.ComputeNormals(vertexData.positions, vertexData.indices, vertexData.normals);
                        vertexData.applyToMesh(customMesh);
                        const mat = new BABYLON.StandardMaterial(`mat_${idx}`, scene);
                        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
                        mat.alpha = 1;
                        customMesh.material = mat;
                    }
                });
                alert("生成空间成功");
            } else if (action === 'export') {
                if (result.length > 0) {
                    await gen.save();
                    alert("导出成功！");
                } else {
                    alert("导出失败，请检查空间数据或模型！");
                }
            }
        }
    };

    const onTableSelectChange = (event: any) => {
        if (!sceneManager.scene) return;
        let expressId = event.args[0]?.originData?.expressId;
        const isChecked = event.selectState;
        if (event.args[0].cellLocation === 'columnHeader') expressId = IfcPropertyUtils.rootExpressId;
        if (expressId) ifcPropertyUtils.updateModelVisibilityByCheckbox(sceneManager.scene, expressId, isChecked, pageState.treeData);
    };

    const tableRowClick = async (event: any) => {
        console.log("tableRowClick:", event);
        if (!sceneManager.scene || !modelStore.modelData) return;
        const scene = sceneManager.scene;
        const tree = modelStore.modelData.tree;
        let expressID: string | null = null;
        let globalId: string | null = null;

        if (event[0]?.originData?.expressId) {
            expressID = event[0]?.originData?.type === 'ifcSiteNode' ? event[0]?.originData?.expressId.replace('ifcSiteNode_', '') : event[0]?.originData?.expressId;
            globalId = event[0]?.originData?.globalId || expressID;
            selectedMeshIds = new Set(ifcPropertyUtils.getChildrenExpressIds(event[0]?.originData));
            lastClickedMeshId = expressID;
        } else if (event?.detail?.expressID !== undefined) {
            expressID = event.detail.expressID;
            globalId = event.detail.globalId || expressID;
            CoordinateTemp.point = event.detail.point;
            if (expressID) {
                lastClickedMeshId = expressID;
                let node = ifcPropertyUtils.findNodeByExpressId(tree, expressID);
                eventManager.emit('scroll-to-node', node);
            } else {
                eventManager.emit('clear-selection');
            }
        } else {
            return;
        }

        if (!isClickVisible.value) expressID = lastClickedMeshId;

        if (!expressID) {
            selectedMeshId = null;
            lastClickedMeshId = null;
            selectedMeshIds.clear();
            pageState.property = [];
            pageState.groupMap = {};
            ifcPropertyUtils.clearAllHighlights(scene);
            return;
        }

        selectedMeshId = expressID;
        let property = await ifcPropertyUtils.getProperty(expressID, pageState.propertyAll, pageState.ifcExpressIds);
        const { items, groupRowMap } = await ifcPropertyUtils.flattenTreeToGroupedItems(property);
        pageState.property = items;
        pageState.groupMap = groupRowMap;
        const meshConfig = { scene, selectedMeshId, globalId: globalId || expressID, isHighlight: isHightlight, isFocus };
        await ifcPropertyUtils.handleComponentClick(expressID, meshConfig, pageState.treeData);
    };

    const handleTabChange = (event: any) => {
        activeTab.value = event;
        const newValue = event === 'location' ? ifcPropertyColumns[1] : event === 'catalog' ? ifcPropertyColumns[2] : event === 'relation' ? ifcPropertyColumns[3] : ifcPropertyColumns[0];
        ifcPropertyColumn.value = markRaw(newValue);
    };

    const handleFocusOnClick = (enabled: boolean) => {
        isFocus = !isFocus
    }
    const handleHisBefore = (event: any) => sceneManager.getCameraHistoryManager().recordState(event);
    const handleHisAfter = (event: any) => sceneManager.getCameraHistoryManager().recordState(event);
    const handleOpenFile = () => document.getElementById('fileInput')?.click();
    const handleReplay = () => sceneManager.undo();
    const handleRedo = () => sceneManager.redo();

    const handleResize = async () => {
        if (isTauriEnv) {
            isMaximized.value = await getCurrentWindow().isMaximized();
        }
    };

    onMounted(async () => {
        const ribbonManager = RibbonEventManager.getInstance();
        ribbonManager.initialize({
            modelStore: modelStore,
            emit: (eventName: string, ...args: any[]) => {
                const eventMap: { [key: string]: Function } = {
                    'navigate-event': handleNavigate, 'change-view': handleView, 'visible-control': handleVisibility,
                    'measure-event': handleMeasure, 'slice-event': handleSlice, 'build-tree': handleBuildTree,
                    'properties-table': handlePropertiesTable, 'file-uploaded': handleFileUploaded,
                    'space-generate': handleSpaceGenerate, 'light-settings': handleLightSettings,
                    'inspect-click': handleInspectClick, 'light-settings-reset': handleLightSettingsReset,
                    'scene-settings': handleChangeScene, 'animation-event': handleAnimationEvent,
                    'animation-click': handleAnimationClick, 'ribbon-tab-change': handleRibbonTabChange,
                    'toggle-file-menu': toggleFileMenu,'focus-on-click': handleFocusOnClick,
                };
                eventMap[eventName]?.(...args);
            }
        });
        ribbonManager.bindRibbonEvents();

        switchToMode(LM.CANVAS_ONLY);
        // This logic is now handled by the watcher and CSS variables.
        // The setTimeout might have been for waiting for the ribbon component to render.
        // If direct CSS variable application is not enough, we might need to re-evaluate,
        // but for now, the watcher with `immediate: true` should cover it.

        eventManager.add('mesh-clicked', tableRowClick);
        eventManager.add('mouse-down', handleHisBefore);
        eventManager.add('mouse-up', handleHisAfter);
        eventManager.add('mouse-wheel', handleHisBefore);
        eventManager.add("resize", handleResize);

        if (isTauriEnv) invoke('show_mainscreen').catch(console.error);

        watch(() => sceneStore.sceneSettings, handleChangeScene, { deep: true });
    });

    onUnmounted(() => {
        cleanup();
        eventManager.remove('mesh-clicked');
        eventManager.remove('mouse-down');
        eventManager.remove('mouse-up');
        eventManager.remove('mouse-wheel');
        eventManager.remove('resize');
    });

    return {
        isMaximized, isSidebarVisible, layoutState, structureTreeRef, animationControllerRef,
        leftDragBarRef, inspectDragBarRef, rightDragBarRef, pageState, activeTab, ifcPropertyColumn,
        themeStyle, inspectType,
        handleOpenFile, handleReplay, handleRedo, handleFileUploaded, handleRibbonInteraction,
        toggleStructureTreeDialog, togglePropertyTableDialog, tableRowClick, onTableSelectChange,
        handleDragStart, onInspectVisibleChange, handleTabChange,
        sceneManager,
        originalMaterialProperties,
        handleAnimationEvent
    };
}