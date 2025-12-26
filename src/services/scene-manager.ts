import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import '@babylonjs/inspector'
import { MessagePlugin } from 'tdesign-vue-next';
import { setupCameraByBoundingBox, createGround, rgbToHex, calculateEdgeWidthByBoundingBox, updateTempLineLabel } from '../utils';
import { IfcExplosion } from '../utils/analysis/explosion';
import { SlicePlane } from '../utils/analysis/slice/slicePlane';
import { Measure } from '../utils/analysis/measure';
import { CubeView } from './scene-cube'
import { CameraHistoryManager } from './scene-history';
import { useModelStore, useSceneStore } from '../store';
import { exportGLB, exportDB, exportJSON } from './model-export';
import { EffectManager } from './scene-effect';
import { IfcPropertyUtils } from './model-property';
import { findClickedSubMesh, collectTransparentMeshData, createMergedTransparentMesh, cleanupTransparentResources, findClosestSubMeshWithFallback } from '../utils/ifc/ifcMeshProcess';

export class SceneManager {
  private static instance: SceneManager | null = null;

  public scene: BABYLON.Scene | null = null;
  public camera: BABYLON.ArcRotateCamera | null = null;
  public light: BABYLON.DirectionalLight | null = null;
  public initialCameraState: {
    alpha: number;
    beta: number;
    radius: number;
    target: BABYLON.Vector3;
  } | null = null;
  public bbox: BABYLON.BoundingBox | null = null;

  private cameraHistoryManager: CameraHistoryManager;
  private slicePlane: SlicePlane | null = null;
  private measure: Measure | null = null;
  public isMeasuring: boolean = false;
  private ifcExplosion: IfcExplosion | null = null;
  private hiddenMeshIds: Set<number> = new Set(); // 存储已隐藏的mesh ID
  private isolatedMeshIds: Set<number> = new Set(); // 存储已隔离的mesh ID
  private transparentMeshIds: Set<number> = new Set(); // 存储已半透明的mesh ID
  private modifiedMergedMeshes: Set<BABYLON.Mesh> = new Set(); // 跟踪被修改过的合并网格
  private sceneStore = useSceneStore();
  private modelStore = useModelStore();
  private ifcPropertyUtils = IfcPropertyUtils.getInstance();
  private effectManager: EffectManager | null = null;
  public selectedMeshId: string | '' = '';
  private utilityLayer: BABYLON.UtilityLayerRenderer | null = null;
  private originalMaterialProperties = new Map<string, { alpha: number; originalMaterial: BABYLON.Material }>(); //存储原始材质属性的Map

  private constructor() {
    // 私有构造函数，防止外部实例化
    this.cameraHistoryManager = CameraHistoryManager.getInstance();
  }

  // 获取单例实例
  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  // 重置单例（如果需要）
  public static resetInstance(): void {
    SceneManager.instance = null;
  }

  /**
   * 清空修改记录（在新模型加载时调用）
   */
  public clearModificationHistory(): void {
    this.modifiedMergedMeshes.clear();
    console.log('已清空网格修改记录');
  }

  /**
   * 初始化场景
   * @param scene BABYLON场景实例
   */
  public initializeScene(scene: BABYLON.Scene) {
    this.scene = scene;

    // 清空之前的修改记录
    this.clearModificationHistory();

    // --- Scene Properties ---
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 0);
    this.scene.autoClear = true;
    // this.scene.debugLayer.show();

    // --- Camera Creation ---
    const canvas = scene.getEngine().getRenderingCanvas();
    this.camera = new BABYLON.ArcRotateCamera('camera', 2 * Math.PI / 3, Math.PI / 3, 150, BABYLON.Vector3.Zero(), this.scene);
    if (canvas) {
      this.camera.attachControl(canvas, true);
    }
    this.camera.inertia = 0;
    this.camera.wheelDeltaPercentage = 0.05;
    this.camera.panningInertia = 0;
    this.camera.panningSensibility = 20;
    this.scene.activeCamera = this.camera;

    // Enable depth renderer after camera is set
    this.scene.enableDepthRenderer();

    // --- Light Creation ---
    const mainlight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-1, -1, -1), this.scene);
    mainlight.intensity = 0.5;
    mainlight.shadowEnabled = false;


    const fillLight = new BABYLON.DirectionalLight('fillLight', new BABYLON.Vector3(1, -0.5, 0.5), this.scene);
    fillLight.intensity = 0.75;
    this.light = fillLight; // Assign main light for shadows

    const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.1;

    const bottomLight = new BABYLON.HemisphericLight("bottomLight", new BABYLON.Vector3(0, -1, 0), this.scene);
    bottomLight.intensity = 0.5;

    // --- Pointer Events ---
    let isDragging = false;
    this.scene.onPointerObservable.add((pointerInfo: BABYLON.PointerInfo) => {
      if (!this.camera) return;
      if (this.isMeasuring) return;

      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
        if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
          let parent = pointerInfo.pickInfo.pickedMesh.parent;
          while (parent) {
            if (parent instanceof BABYLON.AbstractMesh) {
              parent.isVisible = true;
            }
            parent = parent.parent;
          }

          // 检测是否为合并网格，如果是则找到对应的子网格
          const clickedMesh = pointerInfo.pickInfo.pickedMesh;
          const clickedPoint = pointerInfo.pickInfo.pickedPoint;
          console.log(`点击的网格ID: ${clickedMesh.id}`, clickedMesh);

          let targetExpressID = clickedMesh.id;
          let targetMesh = clickedMesh;

          // 检查是否是合并网格
          if (clickedMesh.metadata?.isMergedMesh) {
            // 找到点击位置对应的子网格
            const subMeshInfo = findClickedSubMesh(clickedMesh, clickedPoint!);
            if (subMeshInfo) {
              targetExpressID = subMeshInfo.expressID;
              console.log(`成功找到子网格: ${targetExpressID}`);
            } else {
              // 如果找不到精确子网格，持续查找距离点击点最近的子网格
              const originalMeshData = clickedMesh.metadata?.originalMeshData || [];
              if (originalMeshData.length > 0) {
                // 使用改进的距离查找算法，只考虑可见的子网格
                const closestMesh = findClosestSubMeshWithFallback(clickedMesh, clickedPoint!, originalMeshData);
                if (closestMesh) {
                  targetExpressID = closestMesh.metadata.originalExpressID || clickedMesh.id;
                  console.log(`使用距离最近子网格: ${targetExpressID}`);
                } else {
                  // 如果没有找到可见的子网格，使用父网格的ID
                  targetExpressID = clickedMesh.id;
                  console.log(`没有找到可见的子网格，使用父网格ID: ${targetExpressID}`);
                }
              }
            }
          }

          this.selectedMeshId = targetExpressID;
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: {
              expressID: targetExpressID,
              mesh: targetMesh,
              point: clickedPoint
            }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: { expressID: '', mesh: '', point: '' }
          }));
          this.selectedMeshId = '';
        }
      }

      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          window.dispatchEvent(new CustomEvent('mouse-down', {
            detail: {
              alpha: this.camera.alpha,
              beta: this.camera.beta,
              radius: this.camera.radius,
              target: this.camera.target,
            }
          }));
          isDragging = true;
          break;

        case BABYLON.PointerEventTypes.POINTERUP:
          this.sceneStore.setCameraState({ position: this.camera.position, target: this.camera.target });
          window.dispatchEvent(new CustomEvent('mouse-up', {
            detail: {
              alpha: this.camera.alpha,
              beta: this.camera.beta,
              radius: this.camera.radius,
              target: this.camera.target,
            }
          }));
          isDragging = false;
          break;

        case BABYLON.PointerEventTypes.POINTERWHEEL:
          this.sceneStore.setCameraState({ position: this.camera.position, target: this.camera.target });
          window.dispatchEvent(new CustomEvent('mouse-wheel', {
            detail: {
              alpha: this.camera.alpha,
              beta: this.camera.beta,
              radius: this.camera.radius,
              target: this.camera.target,
            }
          }));
          break;
      }
    });

    // --- Final Setup ---
    this.cameraHistoryManager.setCamera(this.camera);

    this.scene.onBeforeRenderObservable.add(() => {
      if (!this.scene) return;
      this.scene.getEngine().resize();
      this.scene.getEngine().setDepthBuffer(true);
      this.scene.getEngine().setDepthWrite(true);
      this.scene.getEngine().setDepthFunction(BABYLON.Engine.LEQUAL);
    });
  }

  /**
   * 批量处理场景网格（合并材质保存和阴影设置）
   */
  public async batchProcessSceneMeshes(): Promise<void> {
    if (!this.scene) return;

    const meshes = this.scene.meshes;
    const totalMeshes = meshes.length;

    if (totalMeshes === 0) {
      console.log('场景中没有网格需要处理');
      return;
    }

    // 创建阴影生成器（如果需要）
    let shadowGenerator: BABYLON.ShadowGenerator | null = null;
    if (this.light && this.effectManager?.simpleTarget) {
      shadowGenerator = new BABYLON.ShadowGenerator(2048, this.light);
      shadowGenerator.usePoissonSampling = true;

      // 初始化渲染列表
      if (!this.effectManager.simpleTarget.renderList) {
        this.effectManager.simpleTarget.renderList = [];
      }
    }

    // 预先查找网格（避免循环中重复查找）
    const grid = meshes.find(m => m.name === 'infiniteGrid');

    let materialProcessed = 0;
    let materialSkipped = 0;
    let shadowCasters = 0;
    let shadowReceivers = 0;
    let invalidMeshes = 0;

    // 优化批次处理
    const batchSize = Math.min(800, Math.max(200, Math.ceil(totalMeshes / 8)));
    const batches = Math.ceil(totalMeshes / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, totalMeshes);

      // 同步处理当前批次
      for (let i = start; i < end; i++) {
        const mesh = meshes[i];

        // 跳过无效网格
        if (!mesh || !mesh.material) {
          invalidMeshes++;
          continue;
        }

        // 1. 保存原始材质属性
        if (!this.originalMaterialProperties.has(mesh.id)) {
          this.originalMaterialProperties.set(mesh.id, {
            alpha: mesh.material.alpha,
            originalMaterial: mesh.material
          });
          materialProcessed++;
        } else {
          materialSkipped++;
        }

        // 2. 设置阴影和渲染目标（如果阴影生成器存在）
        if (shadowGenerator && this.effectManager?.simpleTarget) {
          // 添加到渲染列表（避免重复添加）
          if (!this.effectManager.simpleTarget.renderList.includes(mesh)) {
            this.effectManager.simpleTarget.renderList.push(mesh);
            this.effectManager.simpleTarget.setMaterialForRendering(mesh, mesh.material);
          }

          // 设置阴影属性（排除网格）
          if (mesh !== grid) {
            shadowGenerator.addShadowCaster(mesh);
            shadowCasters++;

            // 仅对可见且有材质的网格启用接收阴影
            if (mesh.isVisible && mesh.material) {
              mesh.receiveShadows = true;
              shadowReceivers++;
            }
          }
        }
      }

      // 每批次结束后让出控制权
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`批量处理完成：`);
    console.log(`- 材质：处理 ${materialProcessed} 个，跳过 ${materialSkipped} 个`);
    if (shadowGenerator) {
      console.log(`- 阴影：${shadowCasters}个投射器，${shadowReceivers}个接收器`);
    }
    console.log(`- 无效网格：${invalidMeshes} 个，总计 ${totalMeshes} 个网格`);
  }

  /**
   * 设置地面网格
   * @param bbox 包围盒
   * @param isGrid 是否显示网格
   */
  public setupGround(isGrid: boolean) {
    if (!this.scene || !this.effectManager?.simpleTarget) return;
    const grid = createGround(this.scene, this.bbox, isGrid);
    this.effectManager.simpleTarget.renderList.push(grid);
    this.effectManager.simpleTarget.setMaterialForRendering(grid, grid.material);
  }
  /**
   * 设置场景相机和光照
   */
  public setupCameraAndLight() {
    if (!this.scene) return;
    if (!this.effectManager) {
      this.effectManager = EffectManager.getInstance(this.scene);
    }
    this.effectManager.resetResources()

    // 计算模型包围盒
    const { min, max } = this.scene.meshes[0].getHierarchyBoundingVectors();
    const bboxSize = max.subtract(min);
    const diagonalLength = bboxSize.length();
    this.bbox = new BABYLON.BoundingBox(min, max);

    // 基于实测数据优化的动态边框宽度计算
    this.effectManager.edgeWidth = calculateEdgeWidthByBoundingBox(diagonalLength);
    console.log("边缘宽度调整为", this.effectManager.edgeWidth);

    if (this.camera) {
      setupCameraByBoundingBox(this.camera, this.bbox);
      this.initialCameraState = {
        alpha: this.camera.alpha,
        beta: this.camera.beta,
        radius: this.camera.radius,
        target: this.camera.target.clone ?
          this.camera.target.clone() :
          new BABYLON.Vector3(this.camera.target.x, this.camera.target.y, this.camera.target.z)
      };

      // 设置初始相机状态到历史管理器
      this.cameraHistoryManager.setInitialState(this.initialCameraState);
      new CubeView(this.scene);
    }
  }

  /**
   * 处理导航操作
   * @param action 导航操作类型
   */
  public handleNavigate(action: 'pan' | 'rotate' | 'zoomIn' | 'zoomOut' | 'rotateRight' | 'rotateLeft') {
    if (!this.camera) {
      console.error("Camera is not initialized. Cannot handle navigation.");
      return;
    }

    switch (action) {
      case 'pan':
        this.camera._panningMouseButton = 0; // 左键平移
        break;
      case 'rotate':
        this.camera._panningMouseButton = 2; // 右键平移
        break;
      case 'zoomIn':
        this.camera.radius *= 0.9; // 缩小半径以放大
        break;
      case 'zoomOut':
        this.camera.radius *= 1.1; // 增大半径以缩小
        break;
      case 'rotateLeft':
        this.camera.alpha -= 0.1;
        break;
      case 'rotateRight':
        this.camera.alpha += 0.1;
        break;
    }

    this.sceneStore.setCameraState({ position: this.camera.position, target: this.camera.target });

    // 记录当前状态
    this.cameraHistoryManager.recordCurrentState(this.camera);
  }

  /**
   * 处理视图切换
   * @param view 视图类型
   */
  public handleView(view: 'default' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right') {
    if (!this.camera) {
      console.error("Camera is not initialized. Cannot handle view change.");
      return;
    }
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
    if (this.initialCameraState && this.initialCameraState.target) {
      const t = this.initialCameraState.target.clone();
      this.camera.setTarget(t);
    } else {
      this.camera.setTarget(BABYLON.Vector3.Zero());
    }
    this.camera.alpha = params.alpha ?? this.initialCameraState?.alpha ?? 2 * Math.PI / 3;
    this.camera.beta = params.beta ?? this.initialCameraState?.beta ?? Math.PI / 3;
    this.camera.radius = this.initialCameraState?.radius ?? 150;

    this.sceneStore.setCameraState({ position: this.camera.position, target: this.camera.target });

    // 记录当前状态
    this.cameraHistoryManager.recordCurrentState(this.camera);
  }

  /**
   * 处理模型可见性控制
   * @param mode 可见性模式
   * @param selectedMeshIds 选中的网格ID集合
   * @param expressID 当前选中的网格ID
   */
  public handleVisibility(
    mode: 'showAll' | 'hideSelected' | 'isolateSelected' | 'transparentSelected',
    selectedMeshIds: Set<number>,
    expressID: string
  ) {
    if (!this.scene) return;

    // 根据模式将选中的mesh添加到对应的集合中
    if (mode === 'hideSelected' || mode === 'isolateSelected' || mode === 'transparentSelected') {
      this.addSelectedMeshesToTargetSet(mode, selectedMeshIds);
    }

    switch (mode) {
      case 'hideSelected':
        this.handleHideSelected(selectedMeshIds);
        break;
      case 'isolateSelected':
        this.handleIsolateSelected();
        break;
      case 'transparentSelected':
        this.handleTransparentSelected(selectedMeshIds);
        break;
      case 'showAll':
        this.handleShowAll(selectedMeshIds, expressID);
        break;
    }
  }
  /**
   * 处理隐藏选中网格
   */
  private handleHideSelected(selectedMeshIds: Set<number>) {
    // 第一步：处理选中子网格的隐藏
    this.scene!.meshes.forEach(mesh => {
      if (mesh.metadata?.isMergedMesh) {
        const originalMeshData = mesh.metadata.originalMeshData || [];
        let meshWasModified = false;

        originalMeshData.forEach((subMeshInfo: any) => {
          const expressID = subMeshInfo.metadata.originalExpressID;
          if (selectedMeshIds.has(expressID)) {
            mesh.metadata.hideSubMesh(expressID);
            meshWasModified = true;
          }
        });

        // 如果这个合并网格被修改了，记录下来
        if (meshWasModified) {
          this.modifiedMergedMeshes.add(mesh);
        }
      }
    });

    // 第二步：延迟隐藏高亮网格，确保子网格的批处理重建先完成
    // 批处理延迟是10ms，所以设置为15ms确保在重建后执行
    setTimeout(() => {
      this.scene!.meshes.forEach(mesh => {
        if (mesh.name.includes('highlight')) {
          mesh.isVisible = false;
        }
      });
    }, 15); // 15ms延迟，确保子网格重建操作先执行
  }

  /**
   * 处理隔离选中网格
   */
  private handleIsolateSelected() {
    this.scene!.meshes.forEach(mesh => {
      if (mesh.name.includes('highlight')) {
        mesh.isVisible = true;
      } else {
        mesh.isVisible = false;
        // 如果是合并网格被隐藏，也标记为修改过
        if (mesh.metadata?.isMergedMesh) {
          this.modifiedMergedMeshes.add(mesh);
        }
      }
    });
  }

  /**
   * 处理半透明选中网格
   */
  private async handleTransparentSelected(selectedMeshIds: Set<number>) {
    const transparentMeshes: BABYLON.AbstractMesh[] = [];

    // 第一步：收集选中子网格的数据，不隐藏原始子网格
    const materialGroups = collectTransparentMeshData(selectedMeshIds, this.scene!);

    // 第二步：创建半透明网格并等待渲染完成
    materialGroups.forEach((groupDataList, materialKey) => {
      if (groupDataList.length > 0) {
        const transparentMesh = createMergedTransparentMesh(groupDataList, materialKey, this.scene!);
        this.effectManager?.simpleTarget?.renderList.push(transparentMesh);
        this.effectManager?.simpleTarget?.setMaterialForRendering(transparentMesh, transparentMesh.material);
        transparentMeshes.push(transparentMesh);
      }
    });

    // 第三步：应用高亮效果到半透明网格
    this.effectManager?.applyHighlight(transparentMeshes);

    // 第四步：强制渲染一帧，确保半透明网格完全显示
    await this.waitForNextFrame();

    // 第五步：隐藏选中的原始子网格（现在半透明网格已经可见）
    this.scene!.meshes.forEach(mesh => {
      if (mesh.metadata?.isMergedMesh) {
        const originalMeshData = mesh.metadata.originalMeshData || [];
        let meshWasModified = false;

        originalMeshData.forEach((subMeshInfo: any) => {
          const expressID = subMeshInfo.metadata.originalExpressID;
          if (selectedMeshIds.has(expressID)) {
            mesh.metadata.hideSubMesh(expressID);
            meshWasModified = true;
          }
        });

        // 如果这个合并网格被修改了，记录下来
        if (meshWasModified) {
          this.modifiedMergedMeshes.add(mesh);
        }
      }
    });

    // 第六步：隐藏可能冲突的高亮网格
    this.scene!.meshes.forEach(mesh => {
      if (mesh.name.includes('highlight')) {
        mesh.isVisible = false;
      }
    });
  }

  /**
   * 等待下一帧渲染完成
   */
  private waitForNextFrame(): Promise<void> {
    return new Promise((resolve) => {
      if (this.scene) {
        this.scene.executeWhenReady(() => {
          // 等待当前帧完成
          requestAnimationFrame(() => {
            resolve();
          });
        });
      } else {
        resolve();
      }
    });
  }


  /**
   * 处理显示所有网格
   */
  private handleShowAll(selectedMeshIds: Set<number>, expressID: string) {
    // 清空所有集合
    this.hiddenMeshIds.clear();
    this.isolatedMeshIds.clear();
    this.transparentMeshIds.clear();

    // 清理半透明相关资源
    cleanupTransparentResources(this.scene!);

    // 优化：只恢复被修改过的合并网格，而不是全部重建
    const totalMergedMeshes = this.scene!.meshes.filter(mesh => mesh.metadata?.isMergedMesh).length;

    if (this.modifiedMergedMeshes.size > 0) {
      console.log(`显示全部：只重建 ${this.modifiedMergedMeshes.size} 个被修改过的合并网格（总共 ${totalMergedMeshes} 个合并网格）`);

      this.modifiedMergedMeshes.forEach(mesh => {
        if (mesh.metadata?.isMergedMesh && mesh.metadata.restoreSubMesh) {
          mesh.metadata.restoreSubMesh();
        }
      });

      // 清空修改过的网格记录
      this.modifiedMergedMeshes.clear();
    } else {
      console.log(`显示全部：没有需要重建的合并网格（总共 ${totalMergedMeshes} 个合并网格）`);
    }

    // 恢复所有网格可见性（对普通网格和未被修改的合并网格）
    this.scene!.meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
      }

      // 对于所有网格设置可见性（已被修改的网格在restoreSubMesh中已经处理过）
      mesh.isVisible = true;
    });

    // 重新高亮选中的网格
    if (selectedMeshIds && selectedMeshIds.size > 0) {
      const meshConfig = { scene: this.scene!, isFocus: false };
      this.ifcPropertyUtils.handleComponentClick(expressID, meshConfig, this.modelStore.modelData.tree);
    }
  }

  /**
   * 将选中的网格添加到对应的目标集合
   */
  private addSelectedMeshesToTargetSet(
    mode: 'hideSelected' | 'isolateSelected' | 'transparentSelected',
    selectedMeshIds: Set<number>
  ) {
    // 根据模式获取对应的目标集合
    let targetSet: Set<number>;
    switch (mode) {
      case 'hideSelected': targetSet = this.hiddenMeshIds; break;
      case 'isolateSelected': targetSet = this.isolatedMeshIds; break;
      case 'transparentSelected': targetSet = this.transparentMeshIds; break;
      default: targetSet = new Set();
    }

    if (selectedMeshIds && selectedMeshIds.size > 0) {
      selectedMeshIds.forEach(id => targetSet.add(id));
    } else if (this.selectedMeshId) {
      targetSet.add(Number(this.selectedMeshId));
    }
  }

  /**
   * 处理测量功能
   * @param type 测量类型
   */
  public handleMeasure(
    type: 'distance' | 'area' | 'angle' | 'coordinate' | 'clear'
  ) {
    this.effectManager!.isHighlightRender = false;
    if (!this.scene || !this.camera) return;

    // 初始化Utility Layer
    if (!this.utilityLayer) {
      this.utilityLayer = new BABYLON.UtilityLayerRenderer(this.scene);
    }

    // 清理现有测量资源
    this.cleanupMeasurementResources();
    if (this.measure) {
      this.measure.destroy();
      this.measure = null;
    }

    if (type === 'clear') {
      this.effectManager!.isHighlightRender = true;
      this.isMeasuring = false;
    } else {
      this.isMeasuring = true;
      // 计算标记尺寸
      const markSize = this.calculateMarkSize();

      // 创建测量UI
      const { distanceLabel, anchor } = this.createMeasurementUI();

      this.measure = new Measure(this.scene, type, markSize);
      MessagePlugin.info(`点击场景开始测量，按下鼠标右键结束测量`);

      this.scene.onBeforeRenderObservable.add(() => {
        const meshes = this.scene!.meshes.filter(mesh => mesh.name === "tempLine");
        if (meshes.length > 0) {
          const tempLine = meshes[0];
          updateTempLineLabel(tempLine, anchor);
        }
        if (type === 'distance') {
          distanceLabel.text = this.measure?.lineDistance ? `${this.measure.lineDistance.toFixed(2)} m` : '';
        } else if (type === 'area') {
          distanceLabel.text = this.measure?.area ? `${this.measure.area.toFixed(2)} m²` : '';
        } else if (type === 'angle') {
          distanceLabel.text = this.measure?.angle ? `${this.measure.angle.toFixed(2)} °` : '';
        } else if (type === 'coordinate') {
          const coordinatePoint = this.measure?.getCoordinatePoint();
          if (!coordinatePoint) return;
          anchor.position = coordinatePoint;
          distanceLabel.text =
            `x: ${coordinatePoint.x.toFixed(2)}\n` +
            `y: ${coordinatePoint.y.toFixed(2)}\n` +
            `z: ${coordinatePoint.z.toFixed(2)}`;
        }
      });

    }
  }

  /**
   * 清理测量相关的资源
   */
  private cleanupMeasurementResources(): void {
    if (!this.scene || !this.utilityLayer) return;

    // 清除UI元素
    const existingUI = this.utilityLayer.utilityLayerScene.textures.filter(t => t.name === "myUI");
    existingUI.forEach(t => t.dispose());

    // 清除测量相关的网格
    const oldMeshes = this.scene.meshes.filter(mesh =>
      mesh.name === "measureLine" ||
      mesh.name === "tempLine" ||
      mesh.name === "measureRectangle" ||
      mesh.name === "tempRectangle" ||
      mesh.name === "rectangleMesh" ||
      mesh.name === "pointMarker"
    );
    oldMeshes.forEach(mesh => mesh.dispose());
  }

  /**
   * 计算标记尺寸
   */
  private calculateMarkSize(): number {
    if (!this.camera) return 1;
    let markSize = 0.1 + (this.camera.radius / 100) * 0.5;
    return Math.max(0.1, Math.min(markSize, 5));
  }

  /**
   * 创建测量UI
   */
  private createMeasurementUI(): { distanceLabel: GUI.TextBlock; anchor: BABYLON.Mesh } {
    if (!this.scene || !this.utilityLayer) {
      throw new Error("Scene or utility layer not initialized");
    }

    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("myUI", true, this.utilityLayer.utilityLayerScene);
    // advancedTexture.renderScale = 0.5
    const container = new GUI.Rectangle();
    container.width = "300px";
    container.height = "200px";
    container.background = "transparent";
    container.thickness = 0;
    container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    advancedTexture.addControl(container);

    const distanceLabel = new GUI.TextBlock();
    distanceLabel.color = "red";
    distanceLabel.fontSize = 48;
    distanceLabel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    container.addControl(distanceLabel);

    const anchor = BABYLON.MeshBuilder.CreateSphere("anchor", { diameter: 0.01 }, this.scene);
    anchor.isVisible = false;
    container.linkWithMesh(anchor);

    return { distanceLabel, anchor };
  }

  /**
   * 设置剖切面
   * @param action 剖切操作
   */
  public handleSlice(action: 'visible' | 'reset' | 'x' | 'y' | 'z') {
    if (!this.scene) return;

    if (action === 'visible') {
      if (this.slicePlane) {
        this.slicePlane.isShowPlane = !this.slicePlane.isShowPlane;
      }
      return;
    }

    if (action === 'reset') {
      if (this.slicePlane) {
        this.slicePlane.destroy();
        this.slicePlane = null;
      }
      this.scene.meshes.forEach(mesh => {
        mesh.isPickable = true
      });
      return;
    }

    // x/y/z 方向剖切
    if (this.slicePlane) {
      this.slicePlane.destroy();
      this.slicePlane = null;
    }
    this.scene.meshes.forEach(mesh => {
      mesh.isPickable = false
    });
    let slicePlaneSize = 20; // 默认大小
    if (this.bbox) {
      const boundingBoxSize = this.bbox.extendSize;
      slicePlaneSize = Math.max(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z);
    }

    this.slicePlane = new SlicePlane(this.scene, slicePlaneSize);
    console.log("剖切面尺寸:", slicePlaneSize);
    this.slicePlane.start(action);
  }

  /**
   * 设置爆炸效果
   * @param data 爆炸参数
   */
  public handleExplosion(data: any) {
    console.log("爆炸类型", data);
    if (!this.scene || !this.ifcExplosion) return;

    if (data.type === 'explosion-clear') {
      this.ifcExplosion.destroy(); // 还原模型
      const handleSliderExplosionX = document.getElementById("horizontalSliderExplosionX") as any;
      const handleSliderExplosionY = document.getElementById("horizontalSliderExplosionY") as any;
      const handleSliderExplosionZ = document.getElementById("horizontalSliderExplosionZ") as any;
      if (handleSliderExplosionX) handleSliderExplosionX.val(0);
      if (handleSliderExplosionY) handleSliderExplosionY.val(0);
      if (handleSliderExplosionZ) handleSliderExplosionZ.val(0);
      return;
    }
    // 获取当前爆炸参数
    const currentX = this.ifcExplosion.currentX || 0;
    const currentY = this.ifcExplosion.currentY || 0;
    const currentZ = this.ifcExplosion.currentZ || 0;

    // 根据输入更新爆炸参数
    let newX = currentX;
    let newY = currentY;
    let newZ = currentZ;

    if (data.type === 'explosion-x') {
      newX = Number(data.value);
    } else if (data.type === 'explosion-y') {
      newY = Number(data.value);
    } else if (data.type === 'explosion-z') {
      newZ = Number(data.value);
    }

    // 应用新的爆炸参数
    this.ifcExplosion.bom(new BABYLON.Vector3(newX, newY, newZ));

    // 更新当前爆炸参数
    this.ifcExplosion.currentX = newX;
    this.ifcExplosion.currentY = newY;
    this.ifcExplosion.currentZ = newZ;
  }

  /**
   * 设置灯光
   * @param data 灯光设置数据
   */
  public setLightSettings(data: any) {
    if (!this.light) return;

    if (data.type === 'direction-x')
      this.light.direction.x = Number(data.value);
    if (data.type === 'direction-y')
      this.light.direction.y = Number(data.value);
    if (data.type === 'direction-z')
      this.light.direction.z = Number(data.value);
    if (data.type === 'reset') {
      this.light.direction = new BABYLON.Vector3(1, -0.5, 0.5);
      this.light.intensity = 0.75;
      this.light.shadowEnabled = true;

      const handleSliderX = document.getElementById("horizontalSliderX") as any;
      const handleSliderY = document.getElementById("horizontalSliderY") as any;
      const handleSliderZ = document.getElementById("horizontalSliderZ") as any;
      const inputIndensity = document.getElementById("inputIndensity") as HTMLInputElement;
      const checkboxShadow = document.getElementById("checkboxShadow") as HTMLInputElement;

      if (handleSliderX) handleSliderX.val(this.light.direction.x);
      if (handleSliderY) handleSliderY.val(this.light.direction.y);
      if (handleSliderZ) handleSliderZ.val(this.light.direction.z);
      if (inputIndensity) inputIndensity.value = this.light.intensity.toString();
      if (checkboxShadow) checkboxShadow.checked = true;
    }
    if (data.type === 'indensity')
      this.light.intensity = Number(data.value);
    if (data.type === 'shadow')
      this.light.shadowEnabled = data.value;

  }

  /**
   * 设置场景背景
   * @param data 场景设置数据
   */
  public async setSceneSettings(data: any) {
    if (!this.scene) return;
    const meshConfig = { scene: this.scene, isFocus: false };
    const viewer = document.getElementById("viewer-canvas") as HTMLDivElement;
    if (data.type === 'backgroundColor' && viewer) {
      viewer.style.backgroundColor = data.value;
    }

    if (data.type === 'gridMode') {
      let ground = this.scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
      if (!ground) {
        this.setupGround(true);
        ground = this.scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
      } else {
        ground.setEnabled(data.value);
      }
    }
    if (data.type === 'highlightMode') {
      this.effectManager!.isHighlightRender = data.value;
      console.log("this.effectManager.isHighlightRender", this.effectManager!.isHighlightRender, this.selectedMeshId);
      await this.ifcPropertyUtils.handleComponentClick(this.selectedMeshId, meshConfig, this.modelStore.modelData.tree);
    }
    if (data.type === 'highlightColor') {
      const newColor = BABYLON.Color4.FromHexString(rgbToHex(data.value));
      this.effectManager!.updateHighlightColor(newColor);
    }
    if (data.type === 'edgeMode') {
      this.effectManager!.isEdegeRender = data.value;
      this.effectManager!.edgeRender(this.selectedMeshId);
    }
    if (data.type === 'edgeColor') {
      this.effectManager!.edgeColor = BABYLON.Color4.FromHexString(rgbToHex(data.value));
      this.effectManager!.edgeRender(this.selectedMeshId);
    }
  }

  public async exportSceneData(type: 'glb' | 'db' | 'json', isTauriEnv: boolean) {
    if (!this.scene) return;

    const fileName = this.modelStore.file?.name ?? "untitled";
    const fileNameWithoutExtension = fileName.split('.')[0] || fileName;
    const fileNameWithExt = fileName.split('.').slice(0, -1).join('.') || fileName;
    const exportFileName = `${fileNameWithExt}.${type}`;

    const saveDialogConfig = {
      title: `请选择 ${type} 文件导出路径`,
      defaultPath: exportFileName,
      filters: [{ name: "", extensions: [type] }]
    };

    try {
      switch (type) {
        case 'glb':
          await exportGLB(this.scene, fileNameWithoutExtension, isTauriEnv, saveDialogConfig);
          break;
        case 'json':
          await exportJSON(this.scene, fileNameWithoutExtension, isTauriEnv, saveDialogConfig);
          break;
        case 'db':
          await exportDB(this.modelStore, fileNameWithoutExtension, isTauriEnv, saveDialogConfig);
          break;
        default:
          throw new Error(`不支持的文件类型: ${type}`);
      }
    } catch (error) {
      console.error("导出失败:", error);
      MessagePlugin.error({
        content: `导出失败: ${error instanceof Error ? error.message : String(error)}`,
        duration: 2000
      });
    }
  }

  /**
   * 撤销操作
   */
  public undo() {
    if (this.camera) {
      this.cameraHistoryManager.undo(this.camera);
    }
  }

  /**
   * 重做操作
   */
  public redo() {
    if (this.camera) {
      this.cameraHistoryManager.redo(this.camera);
    }
  }

  public setDefaultScene() {
    this.scene?.createOrUpdateSelectionOctree();
    this.scene?.cleanCachedTextureBuffer();
    const handleGridCheckbox = document.getElementById("gridCheckbox") as HTMLInputElement;
    if (handleGridCheckbox.checked) {
      this.setupGround(handleGridCheckbox.checked);
    }
    const handleHighlightCheckbox = document.getElementById("highlightCheckbox") as HTMLInputElement;
    if (handleHighlightCheckbox.checked) {
      this.effectManager!.isHighlightRender = handleHighlightCheckbox.checked;
    }
    const handleEdgeCheckbox = document.getElementById("edgeCheckbox") as HTMLInputElement;
    if (handleEdgeCheckbox.checked) {
      this.effectManager!.isEdegeRender = handleEdgeCheckbox.checked;
      this.effectManager!.edgeRender();
    }
    const handleHighlightColor = document.getElementById("highlightColorPicker") as HTMLInputElement;
    if (handleHighlightColor.value) {
      this.effectManager!.highlightColor = BABYLON.Color4.FromHexString(rgbToHex(handleHighlightColor.value));
    }
    const handleEdgeColor = document.getElementById("edgeColorPicker") as HTMLInputElement;
    if (handleEdgeColor.value) {
      this.effectManager!.edgeColor = BABYLON.Color4.FromHexString(rgbToHex(handleEdgeColor.value));
      this.effectManager!.edgeRender();
    }
  }
  /**
   * 清除场景资源
   */
  public clear() {
    if (this.slicePlane) {
      this.slicePlane.destroy();
      this.slicePlane = null;
    }
    // 清空相机历史记录
    this.cameraHistoryManager.clear();
    if (!this.scene) return;
    if (this.scene._edgeRenderLineShader) {
      this.scene._edgeRenderLineShader.dispose();
      this.scene._edgeRenderLineShader = null;
    }
    this.selectedMeshId = '';
    this.originalMaterialProperties.clear();

    // 清理UI纹理
    this.cleanupMeasurementResources();
    if (this.measure) {
      this.measure.destroy();
      this.measure = null;
    }

    // 重置爆炸滑块
    const handleSliderExplosionX = document.getElementById("horizontalSliderExplosionX") as any;
    const handleSliderExplosionY = document.getElementById("horizontalSliderExplosionY") as any;
    const handleSliderExplosionZ = document.getElementById("horizontalSliderExplosionZ") as any;
    if (handleSliderExplosionX) handleSliderExplosionX.val(0);
    if (handleSliderExplosionY) handleSliderExplosionY.val(0);
    if (handleSliderExplosionZ) handleSliderExplosionZ.val(0);
  }

  /**
   * 设置IfcExplosion实例
   * @param explosion IfcExplosion实例
   */
  public setIfcExplosion(explosion: any) {
    this.ifcExplosion = explosion;
  }

  /**
   * 获取相机历史管理器
   */
  public getCameraHistoryManager(): CameraHistoryManager {
    return this.cameraHistoryManager;
  }


}