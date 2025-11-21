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
  private ifcExplosion: IfcExplosion | null = null;
  private hiddenMeshIds: Set<number> = new Set(); // 存储已隐藏的mesh ID
  private isolatedMeshIds: Set<number> = new Set(); // 存储已隔离的mesh ID
  private transparentMeshIds: Set<number> = new Set(); // 存储已半透明的mesh ID
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
   * 初始化场景
   * @param scene BABYLON场景实例
   */
  public initializeScene(scene: BABYLON.Scene) {
    this.scene = scene;

    // --- Scene Properties ---
    this.scene.useRightHandedSystem = true;
    this.scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 0);
    this.scene.autoClear = true;
    this.scene.debugLayer.show();

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

          let targetExpressID = clickedMesh.id;
          let targetMesh = clickedMesh;

          // 检查是否是合并网格
          if (clickedMesh.metadata?.isMergedMesh) {
            // 找到点击位置对应的子网格
            const subMeshInfo = this.findClickedSubMesh(clickedMesh, clickedPoint);
            if (subMeshInfo) {
              targetExpressID = subMeshInfo.expressID;
              targetMesh = subMeshInfo.mesh;
              console.log(`成功找到子网格: ${targetExpressID}`);
            } else {
              // 如果找不到子网格，使用合并网格的mergedFrom信息
              const mergedFrom = clickedMesh.metadata?.mergedFrom || [];
              if (mergedFrom.length > 0) {
                // 使用第一个子网格的信息作为回退
                const firstSubMesh = mergedFrom[0];
                targetExpressID = firstSubMesh.originalExpressID || clickedMesh.id;
                console.log(`未找到精确子网格，使用第一个子网格: ${targetExpressID}`);
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
   * @param selectedMeshId 当前选中的网格ID
   * @param isClickVisibleRef 是否通过点击选择可见的引用
   */
  public handleVisibility(
    mode: 'showAll' | 'hideSelected' | 'isolateSelected' | 'transparentSelected',
    selectedMeshIds: Set<number>,
    isClickVisibleRef: { value: boolean }
  ) {
    if (!this.scene) return;

    // 恢复所有材质
    this.restoreMaterials();

    if (mode === 'showAll') {
      isClickVisibleRef.value = true;
      // 显示所有mesh并清空所有集合
      this.hiddenMeshIds.clear();
      this.isolatedMeshIds.clear();
      this.transparentMeshIds.clear();
      selectedMeshIds.clear();

      this.scene.meshes.forEach(mesh => {
        if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
          return;
        }

        // 显示所有高亮网格
        if (mesh.name.includes('highlight')) {
          mesh.isVisible = true;
          return;
        }

        // 如果是合并网格，恢复所有子网格
        if (mesh.metadata?.isMergedMesh && mesh.metadata.restoreSubMesh) {
          mesh.metadata.restoreSubMesh(); // 恢复所有子网格
        }

        mesh.isVisible = true;
        // 还原透明度到原始值
        if (mesh.material) {
          this.effectManager?.simpleTarget?.setMaterialForRendering(mesh, mesh.material);
          const originalProps = this.originalMaterialProperties.get(mesh.id);
          if (originalProps) {
            if (mesh.material.name === 'highlightMat') {
              mesh.material.alpha = 0.5;
            } else
              mesh.material.alpha = originalProps.alpha;
          } else {
            mesh.material.alpha = 1;
          }
        }
      });
      return;
    } else {
      isClickVisibleRef.value = false;
    }

    // 根据模式将选中的mesh添加到对应的集合中
    if (mode === 'hideSelected' || mode === 'isolateSelected' || mode === 'transparentSelected') {
      let targetSet: Set<number>;

      if (mode === 'hideSelected') {
        targetSet = this.hiddenMeshIds;
      } else if (mode === 'isolateSelected') {
        targetSet = this.isolatedMeshIds;
      } else {
        targetSet = this.transparentMeshIds;
      }

      // 添加选中的mesh到对应集合
      if (selectedMeshIds && selectedMeshIds.size > 0) {
        selectedMeshIds.forEach(id => {
          targetSet.add(id);
        });
      } else if (this.selectedMeshId) {
        // 保持原有的单个元素处理逻辑
        targetSet.add(Number(this.selectedMeshId));
      }

      console.log(`已${mode === 'hideSelected' ? '隐藏' : mode === 'isolateSelected' ? '隔离' : '半透明'}的mesh IDs:`, Array.from(targetSet));
    }
    console.log("this.hiddenMeshIds", this.hiddenMeshIds)

    this.scene.meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
      }

      // 处理高亮网格的可见性
      if (mesh.name.includes('highlight')) {
        if (mode === 'showAll') {
          mesh.isVisible = true;
        } else if (mode === 'hideSelected') {
          // 隐藏选中模式：隐藏所有高亮网格
          mesh.isVisible = false;
        } else {
          // isolateSelected 和 transparentSelected 模式：检查是否应该显示高亮网格
          let shouldShowHighlight = false;
          
          if (selectedMeshIds && selectedMeshIds.size > 0) {
            // 如果有选中的mesh，检查高亮网格对应的原始mesh是否在选中集合中
            const originalMeshId = mesh.metadata?.originalExpressID;
            if (originalMeshId && selectedMeshIds.has(Number(originalMeshId))) {
              shouldShowHighlight = true;
            }
          } else if (this.selectedMeshId) {
            // 单个选中元素的情况
            const originalMeshId = mesh.metadata?.originalExpressID;
            if (originalMeshId && Number(originalMeshId) === Number(this.selectedMeshId)) {
              shouldShowHighlight = true;
            }
          }
          
          mesh.isVisible = shouldShowHighlight;
        }
        return; // 高亮网格单独处理，不需要后续逻辑
      }

      let meshVisible = true;
      let meshTransparent = false;

      // 1. 检查是否被隐藏
      if (this.hiddenMeshIds.has(mesh.id)) {
        meshVisible = false;
      }
      // 2. 检查隔离模式（只有隔离的mesh才显示）
      if (this.isolatedMeshIds.size > 0) {
        meshVisible = this.isolatedMeshIds.has(mesh.id);
      }

      // 3. 检查透明状态（只在可见时生效）
      if (meshVisible && this.transparentMeshIds.has(mesh.id)) {
        meshTransparent = true;
      }

      // 应用可见性
      mesh.isVisible = meshVisible;

      // 如果是合并网格，处理子网格的隐藏、半透明和隔离效果
      if (mesh.metadata?.isMergedMesh) {
        const mergedFrom = mesh.metadata.mergedFrom || [];

        // 检查是否处于隔离模式
        const isIsolationMode = this.isolatedMeshIds.size > 0;

        // 检查当前合并网格是否有子网格在隔离集合中
        const hasIsolatedSubMesh = mergedFrom.some((subMeshInfo: any) =>
          this.isolatedMeshIds.has(subMeshInfo.originalExpressID)
        );

        // 处理隔离模式：只有隔离的子网格可见，其他所有子网格都隐藏
        if (isIsolationMode && hasIsolatedSubMesh) {
          // 遍历所有子网格
          mergedFrom.forEach((subMeshInfo: any) => {
            const expressID = subMeshInfo.originalExpressID;

            if (this.isolatedMeshIds.has(expressID)) {
              // 隔离的子网格：确保可见
              if (mesh.metadata.restoreSubMesh) {
                mesh.metadata.restoreSubMesh(expressID);
              }
            } else {
              // 非隔离的子网格：隐藏
              if (mesh.metadata.hideSubMesh) {
                mesh.metadata.hideSubMesh(expressID);
              }
            }
          });
        } else if (!isIsolationMode) {
          // 非隔离模式：处理隐藏和半透明效果
          mergedFrom.forEach((subMeshInfo: any) => {
            const expressID = subMeshInfo.originalExpressID;

            // 检查子网格的expressID是否在隐藏集合中
            if (this.hiddenMeshIds.has(expressID)) {
              // 隐藏子网格
              if (mesh.metadata.hideSubMesh) {
                mesh.metadata.hideSubMesh(expressID);
              }
            }
            // 检查子网格的expressID是否在半透明集合中
            else if (this.transparentMeshIds.has(expressID)) {
              // 半透明子网格
              if (mesh.metadata.transparentSubMesh) {
                mesh.metadata.transparentSubMesh(expressID, 0.5);
              }
            } else {
              // 既不在隐藏也不在半透明集合中：确保可见
              if (mesh.metadata.restoreSubMesh) {
                mesh.metadata.restoreSubMesh(expressID);
              }
            }
          });
        }
      }

      // 应用透明度（针对非合并网格或合并网格整体）
      if (meshTransparent) {
        // 为半透明mesh设置材质
        if (mesh.material && mesh.material.getClassName && mesh.material.getClassName() === "StandardMaterial") {
          if (!(mesh.material as any)._isClonedForTransparent) {
            const newMat = mesh.material.clone(mesh.material.name + "_transparent");
            if (newMat) {
              newMat.alpha = 0.5;
              (newMat as any)._isClonedForTransparent = true;
              mesh.material = newMat;
              this.effectManager?.simpleTarget?.setMaterialForRendering(mesh, newMat);
            }
          } else {
            mesh.material.alpha = 0.5;
            this.effectManager?.simpleTarget?.setMaterialForRendering(mesh, mesh.material);
          }
        } else if (mesh.material) {
          const newMat = mesh.material.clone(mesh.material.name + "_transparent");
          if (newMat) {
            newMat.alpha = 0.5;
            (newMat as any)._isClonedForTransparent = true;
            mesh.material = newMat;
            this.effectManager?.simpleTarget?.setMaterialForRendering(mesh, newMat);
          }
        }
      } else {
        // 还原非半透明mesh的透明度到原始值
        if (mesh.material) {
          this.effectManager?.simpleTarget?.setMaterialForRendering(mesh, mesh.material);
          const originalProps = this.originalMaterialProperties.get(mesh.id);
          if (originalProps) {
            mesh.material.alpha = originalProps.alpha;
          } else {
            mesh.material.alpha = 1;
          }
        }
      }
    });
  }

  /**
   * 恢复所有网格的材质
   */
  public restoreMaterials() {
    if (!this.scene) return;
    this.scene.meshes.forEach(mesh => {
      if (mesh.material && (mesh.material as any)._isClonedForTransparent) {
        const originalMaterialName = mesh.material.name.replace("_transparent", "");
        const originalMaterial = this.scene!.materials.find(mat => mat.name === originalMaterialName);
        if (originalMaterial) {
          mesh.material = originalMaterial;
        }
      }
    });
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
    } else {
      // 计算标记尺寸
      const markSize = this.calculateMarkSize();

      // 创建测量UI
      const { distanceLabel, anchor } = this.createMeasurementUI();

      this.measure = new Measure(this.scene, type, markSize, markSize * 0.5);

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
      this.light.shadowEnabled = false;

      const handleSliderX = document.getElementById("horizontalSliderX") as any;
      const handleSliderY = document.getElementById("horizontalSliderY") as any;
      const handleSliderZ = document.getElementById("horizontalSliderZ") as any;
      const inputIndensity = document.getElementById("inputIndensity") as HTMLInputElement;
      const checkboxShadow = document.getElementById("checkboxShadow") as HTMLInputElement;

      if (handleSliderX) handleSliderX.val(this.light.direction.x);
      if (handleSliderY) handleSliderY.val(this.light.direction.y);
      if (handleSliderZ) handleSliderZ.val(this.light.direction.z);
      if (inputIndensity) inputIndensity.value = this.light.intensity.toString();
      if (checkboxShadow) checkboxShadow.checked = false;
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
      this.effectManager!.highlightColor = BABYLON.Color4.FromHexString(rgbToHex(data.value));
      await this.ifcPropertyUtils.handleComponentClick(this.selectedMeshId, meshConfig, this.modelStore.modelData.tree);
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
    const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.') || fileName;
    const exportFileName = `${fileNameWithoutExtension}.${type}`;

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

  /**
   * 在合并网格中找到点击位置对应的子网格
   * @param mergedMesh 合并后的父网格
   * @param clickedPoint 点击的世界坐标点
   * @returns 子网格信息，包含expressID和虚拟网格对象
   */
  private findClickedSubMesh(mergedMesh: BABYLON.Mesh, clickedPoint: BABYLON.Vector3): { expressID: string } | null {
    const metadata = mergedMesh.metadata || {};
    const originalMeshData = metadata.originalMeshData || [];

    if (originalMeshData.length === 0) {
      console.warn('合并网格中没有保存子网格数据');
      return null;
    }

    // 将点击点转换到合并网格的局部坐标系
    const worldMatrix = mergedMesh.getWorldMatrix();
    const inverseWorldMatrix = worldMatrix.clone().invert();
    const localPoint = BABYLON.Vector3.TransformCoordinates(clickedPoint, inverseWorldMatrix);

    let closestSubMesh: { expressID: string; distance: number } | null = null;

    // 遍历所有子网格数据，找到距离点击点最近的子网格
    for (let i = 0; i < originalMeshData.length; i++) {
      const meshData = originalMeshData[i];

      // 检查几何数据是否有效
      if (!meshData.positions || !meshData.indices || meshData.positions.length === 0 || meshData.indices.length === 0) {
        console.warn(`子网格 ${i} 的几何数据无效，跳过`);
        continue;
      }

      // 将点击点转换到子网格的局部坐标系
      const subMeshTransform = meshData.transformMatrix;
      const inverseSubMeshTransform = subMeshTransform.clone().invert();
      const subMeshLocalPoint = BABYLON.Vector3.TransformCoordinates(localPoint, inverseSubMeshTransform);

      // 检查点击点是否在子网格的包围盒内
      if (this.isPointInMeshBounds(subMeshLocalPoint, meshData.positions, meshData.indices)) {
        // 计算点击点到子网格表面的距离
        const distance = this.calculateDistanceToMeshSurface(subMeshLocalPoint, meshData.positions, meshData.indices);

        // 放宽距离阈值，确保能匹配到子网格
        // 如果距离在合理范围内，或者点击点在包围盒内但距离计算失败，都认为是有效的点击
        if (distance < 5.0 || (distance === Infinity && this.isPointInMeshBounds(subMeshLocalPoint, meshData.positions, meshData.indices))) {
          const subMeshMetadata = meshData.metadata || {};
          const expressID = subMeshMetadata.originalExpressID || `${i}`;
          const guid = subMeshMetadata.originalGuid;


          // 如果找到更近的子网格，更新结果
          if (!closestSubMesh || distance < closestSubMesh.distance) {
            closestSubMesh = {
              expressID: expressID,
              distance: distance
            };
          }
        }
      }
    }

    // 如果精确查找失败，使用包围盒中心距离作为回退
    if (!closestSubMesh) {
      console.log('精确查找失败，使用包围盒中心距离回退');
      for (let i = 0; i < originalMeshData.length; i++) {
        const meshData = originalMeshData[i];
        if (!meshData.positions || meshData.positions.length === 0) continue;

        const subMeshTransform = meshData.transformMatrix;
        const inverseSubMeshTransform = subMeshTransform.clone().invert();
        const subMeshLocalPoint = BABYLON.Vector3.TransformCoordinates(localPoint, inverseSubMeshTransform);

        // 计算包围盒中心距离
        const bounds = this.calculateMeshBounds(meshData.positions);
        const center = new BABYLON.Vector3(
          (bounds.minX + bounds.maxX) / 2,
          (bounds.minY + bounds.maxY) / 2,
          (bounds.minZ + bounds.maxZ) / 2
        );
        const distance = BABYLON.Vector3.Distance(subMeshLocalPoint, center);

        // 使用较大的阈值
        if (distance < 10.0) {
          const subMeshMetadata = meshData.metadata || {};
          const expressID = subMeshMetadata.originalExpressID || `${i}`;
          const guid = subMeshMetadata.originalGuid;

          if (!closestSubMesh || distance < closestSubMesh.distance) {
            closestSubMesh = {
              expressID: expressID,
              distance: distance
            };
          }
        }
      }
    }

    console.log("找到子网格", closestSubMesh);
    // 返回距离最近的子网格，如果没有找到则返回null
    return closestSubMesh ? { expressID: closestSubMesh.expressID } : null;
  }

  /**
   * 检查点是否在网格的包围盒内
   * @param point 局部坐标点
   * @param positions 顶点位置数据
   * @param indices 索引数据
   * @returns 是否在包围盒内
   */
  private isPointInMeshBounds(point: BABYLON.Vector3, positions: number[], indices: number[]): boolean {
    if (!positions || positions.length === 0 || !indices || indices.length === 0) {
      return false;
    }

    // 计算网格的包围盒
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    // 检查点是否在包围盒内
    return point.x >= minX && point.x <= maxX &&
      point.y >= minY && point.y <= maxY &&
      point.z >= minZ && point.z <= maxZ;
  }

  /**
   * 计算点到网格表面的距离
   * @param point 局部坐标点
   * @param positions 顶点位置数据
   * @param indices 索引数据
   * @returns 到网格表面的距离
   */
  private calculateDistanceToMeshSurface(point: BABYLON.Vector3, positions: number[], indices: number[]): number {
    if (!positions || positions.length === 0 || !indices || indices.length === 0) {
      return Infinity;
    }

    let minDistance = Infinity;

    // 遍历所有三角形面片
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      // 获取三角形的三个顶点
      const v1 = new BABYLON.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new BABYLON.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
      const v3 = new BABYLON.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

      // 计算点到三角形平面的距离
      const distance = this.distancePointToTriangle(point, v1, v2, v3);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * 计算点到三角形的距离
   * @param point 点
   * @param v1 三角形顶点1
   * @param v2 三角形顶点2
   * @param v3 三角形顶点3
   * @returns 点到三角形的距离
   */
  private distancePointToTriangle(point: BABYLON.Vector3, v1: BABYLON.Vector3, v2: BABYLON.Vector3, v3: BABYLON.Vector3): number {
    // 计算三角形法线
    const edge1 = v2.subtract(v1);
    const edge2 = v3.subtract(v1);
    const normal = BABYLON.Vector3.Cross(edge1, edge2);

    // 计算点到平面的距离
    const planeDistance = Math.abs(BABYLON.Vector3.Dot(point.subtract(v1), normal)) / normal.length();

    // 检查点是否在三角形内部
    if (this.isPointInTriangle(point, v1, v2, v3)) {
      return planeDistance;
    }

    // 如果不在三角形内部，计算到三条边的距离
    const distanceToEdge1 = this.distancePointToLineSegment(point, v1, v2);
    const distanceToEdge2 = this.distancePointToLineSegment(point, v2, v3);
    const distanceToEdge3 = this.distancePointToLineSegment(point, v3, v1);

    return Math.min(planeDistance, distanceToEdge1, distanceToEdge2, distanceToEdge3);
  }

  /**
   * 检查点是否在三角形内部
   */
  private isPointInTriangle(point: BABYLON.Vector3, v1: BABYLON.Vector3, v2: BABYLON.Vector3, v3: BABYLON.Vector3): boolean {
    const d1 = this.sign(point, v1, v2);
    const d2 = this.sign(point, v2, v3);
    const d3 = this.sign(point, v3, v1);

    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

    return !(hasNeg && hasPos);
  }

  /**
   * 计算点到线段的距离
   */
  private distancePointToLineSegment(point: BABYLON.Vector3, lineStart: BABYLON.Vector3, lineEnd: BABYLON.Vector3): number {
    const lineVec = lineEnd.subtract(lineStart);
    const lineLength = lineVec.length();
    const lineDir = lineVec.normalize();

    const pointVec = point.subtract(lineStart);
    const projection = BABYLON.Vector3.Dot(pointVec, lineDir);

    if (projection <= 0) {
      return pointVec.length();
    } else if (projection >= lineLength) {
      return point.subtract(lineEnd).length();
    } else {
      const closestPoint = lineStart.add(lineDir.scale(projection));
      return point.subtract(closestPoint).length();
    }
  }

  /**
   * 计算点的符号（用于三角形内部检测）
   */
  private sign(p1: BABYLON.Vector3, p2: BABYLON.Vector3, p3: BABYLON.Vector3): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  /**
   * 计算网格的包围盒边界
   * @param positions 顶点位置数据
   * @returns 包围盒边界对象
   */
  private calculateMeshBounds(positions: number[]): { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number } {
    if (!positions || positions.length === 0) {
      return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    // 如果所有值都是无穷大，返回默认值
    if (minX === Infinity) {
      return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
    }

    return { minX, minY, minZ, maxX, maxY, maxZ };
  }
}