import { reactive, ref, shallowRef, watch, markRaw, computed, onMounted, onUnmounted } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getMatches } from '@tauri-apps/plugin-cli';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useModelStore, useSceneStore, useSelectedStore } from '../store';
import { useSettingsStore } from '../store/settings';
import { ifcPropertyColumns } from '../utils/config';
import { IfcExplosion } from '../utils/analysis/explosion';
import { useLayoutManager } from './useLayoutManager';
import { ModelManager } from "../services/model-manager";
import { useDragResize } from './useDragResize';
import { IfcPropertyUtils } from '../services/model-property';
import { SceneManager } from '../services/scene-manager';
import { RibbonEventManager } from './useRibbonEvent';
import { eventManager } from '../services/scene-event';
import { IfcLoader } from '../utils/loader/IfcLoader';
import { saveAsGLB, saveAsDB, saveAsJSON } from '../services/model-export';


// 单例实例存储
let appCoreInstance: ReturnType<typeof createAppCore> | null = null;

function createAppCore() {
    const isTauriEnv = isTauri();
    let isMaximized = ref(true);
    let isSidebarVisible = ref(false);
    let isFocus = false;

    let expressID: string;
    let selectedMeshIds = new Set<number>();
    let inspectType = ref('');
    let lastClickedMeshId: string | null = null;

    const sceneStore = useSceneStore();
    const modelStore = useModelStore();
    const settingsStore = useSettingsStore();
    const selectedStore = useSelectedStore();
    const sceneManager = SceneManager.getInstance();
    const ifcPropertyUtils = IfcPropertyUtils.getInstance();
    const modelManager = ModelManager.getInstance();
    const {
        layoutState, switchToMode, toggleStructureTree, togglePropertyTable, canToggleComponents,
        setStructureTreeWidth, setPropertyTableWidth, setInspectResultWidth, LayoutMode: LM,
    } = useLayoutManager();

    const structureTreeRef = ref();
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
        groupMap: {} as Map<number, any>,
        psetRelations: [] as any[],
    });

    const themeStyle = computed(() => ({
        '--theme-color-primary': settingsStore.theme.value,
        '--td-brand-color': settingsStore.theme.value
    }));

    const hexToRgba = (hex: string, alpha: number) => {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (r, g, b) => r + r + g + g + b + b);
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
        if (!modelStore.modelData) {
            switchToMode(LM.CANVAS_ONLY);
            return;
        }
        switch (tabIndex) {
            case 0: switchToMode(LM.VIEW); break;
            case 1: switchToMode(LM.CANVAS_ONLY); break;
            case 2: switchToMode(LM.VIEW); break;
            case 3: switchToMode(LM.VIEW); break;
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
        console.log('handleSlice', action);
        sceneManager.handleSlice(action);
    };
    const handleVisibility = (mode: any) => {
        sceneManager.handleVisibility(mode, selectedMeshIds, expressID);
    };
    const handleMeasure = (type: any) => {
        sceneManager.clear();
        sceneManager.handleMeasure(type);
    };
    const handleBuildTree = () => toggleStructureTree();
    const handlePropertiesTable = () => togglePropertyTable();
    const toggleStructureTreeDialog = () => { if (canToggleComponents.value) toggleStructureTree(); };
    const togglePropertyTableDialog = () => { if (canToggleComponents.value) togglePropertyTable(); };
    const handleExplosion = (type: any) => sceneManager.handleExplosion(type);
    const handleLightSettings = (data: any) => { sceneManager.setLightSettings(data); };
    const handleChangeScene = (data: any) => { sceneManager.setSceneSettings(data); };

    const handleExportSetting = async (type: 'glb' | 'db' | 'json') => {
        console.log('handleExportSetting', type);
        await sceneManager.exportSceneData(type, isTauriEnv);
    }

    function resetGlobalVariables() {
        selectedMeshIds.clear();
        lastClickedMeshId = null;
        sceneManager.clear();
    }

    const handleFileUploaded = async (file: File) => {
        if (!file || !sceneManager.scene) return;
        const scene = sceneManager.scene;
        sceneManager.clear();
        pageState.treeData = [];
        resetGlobalVariables();
        if (window.gc) {
            window.gc();
        }
        try {
            const t0 = performance.now();
            if (file.size > 600 * 1024 * 1024) {
                MessagePlugin.info({ content: '文件过大，加载需要较长时间，请耐心等待', duration: 3000 });
            }
            await modelManager.loadModel(file, async () => {
                const modelData = modelStore.modelData;
                if (modelData) {
                    inspectType.value = "";
                    pageState.treeData = modelData.tree;
                    pageState.property = [];
                    pageState.groupMap = new Map<number, any>();
                    pageState.ifcExpressIds = modelData.ifcExpressIds;
                    pageState.propertyAll = modelData.properties;
                    pageState.psetRelations = modelData.psetRelations;
                    eventManager.emit('file-loaded');

                    sceneManager.setIfcExplosion(new IfcExplosion(scene));
                    switchToMode(LM.VIEW);
                    sceneManager.setupCameraAndLight();
                    sceneManager.setDefaultScene()
                    await sceneManager.batchProcessSceneMeshes();
                    const t1 = performance.now();
                    console.log(`模型加载完成，耗时 ${(t1 - t0) / 1000} 秒`);
                    // await sceneManager.saveOriginalMaterialProperties();
                }
            });
        } catch (error) {
            console.error("Error loading model in App.vue:", error);
        }
    };

    const handleInspectClick = async (event: number) => {
        if (!sceneManager.scene) return;
        const map = { 1: "基础数据", 2: "规划报建", 3: "施工图审查", 4: "智慧工地监管", 5: "竣工验收" } as const;
        inspectType.value = map[event as keyof typeof map];
        switchToMode(LM.INSPECT);
        if (modelStore.file) modelManager.setupInspectDataListener(modelStore.file, event);
    };

    const onTableSelectChange = (event: any) => {
        if (!sceneManager.scene) return;
        let expressId = event.args[0]?.originData?.expressId;
        const isChecked = event.selectState;
        console.log("onTableSelectChange:", modelStore.modelData.tree[0].expressId);
        if (event.args[0].cellLocation === 'columnHeader') expressId = modelStore.modelData.tree[0].expressId;
        if (expressId) ifcPropertyUtils.updateModelVisibilityByCheckbox(sceneManager.scene, expressId, isChecked, pageState.treeData);
    };

    const tableRowClick = async (event: any) => {
        console.log("tableRowClick:", event);
        selectedStore.updateSelectedRowKey(null);
        const handleColorPicker = document.getElementById("colorPicker") as any;
        handleColorPicker.opened = false;
        const highlightColorPicker = document.getElementById("highlightColorPicker") as any;
        highlightColorPicker.opened = false;
        const edgeColorPicker = document.getElementById("edgeColorPicker") as any;
        edgeColorPicker.opened = false;
        if (!sceneManager.scene || !modelStore.modelData) return;
        const scene = sceneManager.scene;
        const tree = modelStore.modelData.tree;
        if (sceneManager.isMeasuring) return;
        if (event[0]?.originData?.expressId) {
            expressID = event[0]?.originData?.type === 'ifcSiteNode' ? event[0]?.originData?.expressId.replace('ifcSiteNode_', '') : event[0]?.originData?.expressId;
            selectedMeshIds = ifcPropertyUtils.processYourData(new Set(ifcPropertyUtils.getChildrenExpressIds(expressID, pageState.treeData)));
            console.log('点击表格的expressID:', expressID, selectedMeshIds, event[0]?.originData);
            lastClickedMeshId = expressID;
        } else if (event?.detail?.expressID !== undefined) {
            expressID = event.detail.expressID;
            if (expressID) {
                lastClickedMeshId = expressID;
                let node = ifcPropertyUtils.findNodeByExpressId(tree, expressID);
                selectedMeshIds = ifcPropertyUtils.processYourData(new Set(ifcPropertyUtils.getChildrenExpressIds(expressID, pageState.treeData)));
                console.log('点击场景的expressID:', expressID, selectedMeshIds);
                eventManager.emit('scroll-to-node', node);
            } else {
                eventManager.emit('clear-selection');
            }
        } else {
            return;
        }
        if (expressID === 'slicePlane') return
        if (!expressID) {
            lastClickedMeshId = null;
            selectedMeshIds.clear();
            pageState.property = [];
            pageState.groupMap = new Map<number, any>();;
            ifcPropertyUtils.clearAllHighlights(scene);
            return;
        }
        sceneManager.selectedMeshId = expressID;
        let property = await ifcPropertyUtils.getProperty(expressID, pageState.propertyAll, pageState.ifcExpressIds, pageState.psetRelations, modelStore.psetLines);
        const { items, groupRowMap } = await ifcPropertyUtils.flattenTreeToGroupedItems(property);
        pageState.property = items;
        pageState.groupMap = groupRowMap;
        const meshConfig = { scene, isFocus };
        await ifcPropertyUtils.handleComponentClick(expressID, meshConfig, pageState.treeData);
    };

    const handleTabChange = (event: any) => {
        activeTab.value = event;
        const newValue = event === 'location' ? ifcPropertyColumns[1] : event === 'catalog' ? ifcPropertyColumns[2] : event === 'relation' ? ifcPropertyColumns[3] : ifcPropertyColumns[0];
        ifcPropertyColumn.value = markRaw(newValue);
    };

    const handleInteractionSetting = (data: any) => {
        if (data.type === 'dragSpeed' && sceneManager.camera) {
            sceneManager.camera.panningSensibility = 20 - data.value;
        }
        if (data.type === 'focusMode') {
            isFocus = data.value
        }
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

    const convertFileByCli = async () => {
        try {
            const matches = await getMatches();
            if (matches.subcommand?.name === 'convert') {
                const input = matches.subcommand.matches.args.input.value as string;
                const output = matches.subcommand.matches.args.output.value as string;
                const extension = output.split('.').pop();
                if (extension !== 'glb' && extension !== 'json' && extension !== 'db') {
                    await invoke('print_to_terminal', { message: '错误：不支持的文件格式，仅支持 .glb、.json 或 .db 后缀！' });
                    await invoke('exit_process');
                    return;
                }

                // 读取文件（增加错误捕获）
                await invoke('print_to_terminal', { message: '正在读取文件...' });
                let content: string;
                try {
                    content = await invoke('read_file', { path: input });
                } catch (error) {
                    await invoke('print_to_terminal', { message: `文件读取失败: ${error}` });
                    await invoke('exit_process');
                    return;
                }

                const encoder = new TextEncoder();
                const buffer = encoder.encode(content).buffer;
                if (!buffer) return;
                const file = new File([buffer], 'converted.ifc', { type: 'application/ifc' });
                const ifcLoader = new IfcLoader(file, sceneManager.scene!);
                await ifcLoader.load();
                await invoke('print_to_terminal', { message: '正在进行文件格式转换...' });

                // 根据扩展名处理不同格式
                try {
                    await invoke('print_to_terminal', { message: '正在导出文件...' });
                    if (extension === 'glb') {
                        await saveAsGLB(sceneManager.scene!, output);
                    } else if (extension === 'json') {
                        await saveAsJSON(sceneManager.scene!, output);
                    } else if (extension === 'db') {
                        await saveAsDB(file, input, output);
                    }
                    await invoke('print_to_terminal', { message: '文件导出成功！' });
                    await invoke('exit_process');
                } catch (error) {
                    await invoke('print_to_terminal', { message: error.message });
                    await invoke('exit_process');
                }
            }
        } catch (error) {
            await invoke('print_to_terminal', { message: `程序运行异常: ${error}` });
            await invoke('exit_process');
        }
    };

    onMounted(async () => {
        const ribbonManager = RibbonEventManager.getInstance();
        ribbonManager.initialize({
            modelStore: modelStore,
            emit: (eventName: string, ...args: any[]) => {
                const eventMap: { [key: string]: Function } = {
                    'navigate-event': handleNavigate, 'change-view': handleView, 'visible-control': handleVisibility,
                    'measure-event': handleMeasure, 'slice-event': handleSlice, 'build-tree': handleBuildTree, 'explosion-event': handleExplosion,
                    'properties-table': handlePropertiesTable, 'file-uploaded': handleFileUploaded,
                    'light-settings': handleLightSettings, 'inspect-click': handleInspectClick, 'scene-settings': handleChangeScene,
                    'ribbon-tab-change': handleRibbonTabChange, 'toggle-file-menu': toggleFileMenu,
                    'interaction-settings': handleInteractionSetting, 'export-settings': handleExportSetting,
                };
                eventMap[eventName]?.(...args);
            }
        });

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

        if (isTauriEnv) {
            await invoke('show_mainscreen').catch(console.error);
            await convertFileByCli();
        }

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
        isMaximized, isSidebarVisible, layoutState, structureTreeRef,
        leftDragBarRef, inspectDragBarRef, rightDragBarRef, pageState, activeTab,
        themeStyle, inspectType,
        handleOpenFile, handleReplay, handleRedo, handleFileUploaded, handleRibbonInteraction,
        toggleStructureTreeDialog, togglePropertyTableDialog, tableRowClick, onTableSelectChange,
        handleDragStart, onInspectVisibleChange, handleTabChange,
    };
}

export function useAppCore() {
    if (!appCoreInstance) {
        appCoreInstance = createAppCore();
        console.log('创建新的app管理器单例实例');
    }

    return appCoreInstance;
}
