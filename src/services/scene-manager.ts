import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';
import { GLTF2Export } from "@babylonjs/serializers";
import { MessagePlugin } from 'tdesign-vue-next';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { setupCameraByBoundingBox, createGround } from '../utils';
import { IfcExplosion } from '../utils/ifc/IfcExplosion';
import { SlicePlane } from '../utils/analysis/slice/slicePlane';
import { Measure } from '../utils/analysis/measure';
import { CubeView } from '../services/cube-manager'
import { CameraHistoryManager } from './history-manager';
import { useModelStore, useSceneStore } from '../store';
import { IFCParser2DB } from '../utils/ifc/ifcparse2db'

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
  private ifcExplosion: IfcExplosion | null = null;
  private hiddenMeshIds: Set<string> = new Set(); // 存储已隐藏的mesh ID
  private isolatedMeshIds: Set<string> = new Set(); // 存储已隔离的mesh ID
  private transparentMeshIds: Set<string> = new Set(); // 存储已半透明的mesh ID
  private sceneStore = useSceneStore();
  private modelStore = useModelStore();

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
    this.scene.autoClear = false;

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
    mainlight.shadowEnabled = true;


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
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: {
              expressID: pointerInfo.pickInfo.pickedMesh.id,
              mesh: pointerInfo.pickInfo.pickedMesh,
              point: pointerInfo.pickInfo.pickedPoint
            }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: { expressID: '', mesh: '', point: '' }
          }));
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
   * 保存场景中所有网格的原始材质属性
   * @param originalMaterialProperties 存储原始材质属性的Map
   */
  public async saveOriginalMaterialProperties(originalMaterialProperties: Map<string, { alpha: number }>) {
    if (!this.scene) return;

    for (const mesh of this.scene.meshes) {
      // 保存原始材质属性
      if (mesh.material && !originalMaterialProperties.has(mesh.id)) {
        originalMaterialProperties.set(mesh.id, {
          alpha: mesh.material.alpha
        });
      }

      // 每处理100个网格，让出控制权给浏览器，防止阻塞UI
      if (this.scene.meshes.indexOf(mesh) % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    console.log('原始材质属性保存完毕');
  }

  /**
   * 设置地面网格
   * @param bbox 包围盒
   * @param isGrid 是否显示网格
   */
  public setupGround(isGrid: boolean) {
    if (!this.scene) return;
    createGround(this.scene, this.bbox, isGrid);
  }

  /**
   * 设置阴影生成器
   */
  public async setupShadows() {
    if (!this.scene || !this.light) return;

    const shadowGenerator = new BABYLON.ShadowGenerator(2048, this.light);
    shadowGenerator.usePoissonSampling = true;

    if (shadowGenerator) {
      const grid = this.scene.meshes.find(m => m.name === 'infiniteGrid');

      for (let i = 0; i < this.scene.meshes.length; i++) {
        const mesh = this.scene.meshes[i];
        if (mesh !== grid) {
          shadowGenerator.addShadowCaster(mesh); // 仅模型投射阴影
          mesh.receiveShadows = true;
        }

        if (i % 2000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    console.log("阴影生成器设置完成");
  }
  /**
   * 设置场景相机和光照
   */
  public setupCameraAndLight() {
    if (!this.scene) return;

    // 计算模型包围盒
    const { min, max } = this.scene.meshes[0].getHierarchyBoundingVectors();
    this.bbox = new BABYLON.BoundingBox(min, max)

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
      const linkMesh = BABYLON.MeshBuilder.CreateBox("linkMesh", { size: 0.1 }, this.scene);
      linkMesh.position = this.initialCameraState.target;
      linkMesh.setEnabled(false); // 不显示链接点
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
   * @param originalMaterialProperties 原始材质属性映射
   * @param isClickVisibleRef 是否通过点击选择可见的引用
   */
  public handleVisibility(
    mode: 'showAll' | 'hideSelected' | 'isolateSelected' | 'transparentSelected',
    selectedMeshIds: Set<string>,
    selectedMeshId: string | null,
    originalMaterialProperties: Map<string, { alpha: number }>,
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
      isClickVisibleRef.value = false;
    }

    // 根据模式将选中的mesh添加到对应的集合中
    if (mode === 'hideSelected' || mode === 'isolateSelected' || mode === 'transparentSelected') {
      let targetSet: Set<string>;

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
      } else if (selectedMeshId) {
        // 保持原有的单个元素处理逻辑
        targetSet.add(selectedMeshId);
      }

      console.log(`已${mode === 'hideSelected' ? '隐藏' : mode === 'isolateSelected' ? '隔离' : '半透明'}的mesh IDs:`, Array.from(targetSet));
    }

    this.scene.meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
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
   * @param measure 测量实例
   * @param CoordinateTemp 坐标临时存储
   * @param updateTempLineLabel 更新临时线标签的函数
   * @returns 新的Measure实例或null
   */
  public handleMeasure(
    type: 'distance' | 'area' | 'angle' | 'coordinate' | 'clear',
    measure: Measure | null,
    CoordinateTemp: { point: { x: number, y: number, z: number } | null },
    updateTempLineLabel: (tempLine: BABYLON.AbstractMesh, anchor: BABYLON.Mesh) => void
  ): Measure | null {
    if (!this.scene || !this.camera) return measure;

    // 清除现有的UI元素
    const existingUI = this.scene.textures.filter(t => t.name === "myUI");
    if (existingUI) {
      existingUI.forEach(t => t.dispose());
    }

    const oldMeshes = this.scene.meshes.filter(mesh =>
      mesh.name === "measureLine" ||
      mesh.name === "tempLine" ||
      mesh.name === "measureRectangle" ||
      mesh.name === "tempRectangle" ||
      mesh.name === "rectangleMesh" ||
      mesh.name === "pointMarker"
    );
    oldMeshes.forEach(mesh => mesh.dispose());

    if (type === 'clear') {
      if (measure) {
        measure.destroy();
        measure = null;
      }
      return measure;
    }

    let markSize = 1;
    markSize = 0.1 + (this.camera.radius / 100) * 0.5;
    markSize = Math.max(0.1, Math.min(markSize, 5));

    const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("myUI", true, this.scene);
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
    const anchor = BABYLON.MeshBuilder.CreateSphere("anchor", { diameter: 0.01 }, this.scene);
    anchor.isVisible = false;
    container.linkWithMesh(anchor);

    if (type === 'coordinate') {
      CoordinateTemp.point = null;
      const sphere = BABYLON.MeshBuilder.CreateSphere("pointMarker", { diameter: markSize }, this.scene);
      container.linkWithMesh(sphere);
      const material = new BABYLON.StandardMaterial("pointMaterial", this.scene);
      material.diffuseColor = new BABYLON.Color3(1, 0, 0);
      // 添加发光效果
      material.emissiveColor = material.diffuseColor.scale(0.3);
      sphere.material = material;
      sphere.setEnabled(false)

      this.scene.onBeforeRenderObservable.add(() => {
        if (CoordinateTemp.point) {
          sphere.setEnabled(true)
          sphere.position = new BABYLON.Vector3(CoordinateTemp.point.x, CoordinateTemp.point.y, CoordinateTemp.point.z);
          distanceLabel.text =
            `x: ${CoordinateTemp.point.x.toFixed(2)}\n` +
            `y: ${CoordinateTemp.point.y.toFixed(2)}\n` +
            `z: ${CoordinateTemp.point.z.toFixed(2)}`;
        }
      });
      return measure;
    }

    if (measure) {
      measure.destroy();
    }
    measure = new Measure(this.scene, type, markSize);
    measure.setLineColor(new BABYLON.Color4(255, 0, 0, 1));

    this.scene.onBeforeRenderObservable.add(() => {
      const meshes = this.scene!.meshes.filter(mesh => mesh.name === "tempLine");
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

    return measure;
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
      return;
    }

    // x/y/z 方向剖切
    if (this.slicePlane) {
      this.slicePlane.destroy();
      this.slicePlane = null;
    }
    let slicePlaneSize = 80; // 默认大小
    if (this.bbox) {
      const boundingBoxSize = this.bbox.extendSize.scale(2);
      slicePlaneSize = Math.max(boundingBoxSize.x, boundingBoxSize.y, boundingBoxSize.z) * 1.5;
    }

    this.slicePlane = new SlicePlane(this.scene, slicePlaneSize);
    console.log("剖切面尺寸:", slicePlaneSize);
    this.slicePlane.start(action);
  }

  /**
   * 设置爆炸效果
   * @param type 爆炸参数
   */
  public handleExplosion(type: any) {
    console.log("爆炸类型", type);
    if (!this.scene || !this.ifcExplosion) return;

    if (type === 'clear') {
      this.ifcExplosion.destroy(); // 还原模型
      return;
    }

    if (type === 'axis') {
      this.ifcExplosion.bom(new BABYLON.Vector3(0, 0.5, 0));
    }
  }

  /**
   * 设置灯光
   * @param data 灯光设置数据
   */
  public setLightSettings(data: any) {
    if (!this.light) return;

    if (data.lightX !== undefined)
      this.light.direction.x = Number(data.lightX);
    if (data.lightY !== undefined)
      this.light.direction.y = Number(data.lightY);
    if (data.lightZ !== undefined)
      this.light.direction.z = Number(data.lightZ);
    if (data.lightIndensity !== undefined)
      this.light.intensity = Number(data.lightIndensity);
    if (data.lightShadowEnabled !== undefined)
      this.light.shadowEnabled = data.lightShadowEnabled;
  }

  /**
   * 重置灯光设置
   */
  public resetLightSettings() {
    console.log("重置灯光设置");
    if (!this.light) return;

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

  /**
   * 设置场景背景
   * @param data 场景设置数据
   */
  public setSceneSettings(data: any) {
    if (!this.scene) return;

    const viewer = document.getElementById("viewer-canvas") as HTMLDivElement;
    if (data.backgroundColor && viewer) {
      viewer.style.backgroundColor = data.backgroundColor;
    }

    if (data.gridMode !== undefined) {
      let ground = this.scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
      if (!ground) {
        this.setupGround(true);
        ground = this.scene.meshes.find(mesh => mesh.name === 'infiniteGrid');
      } else {
        ground.setEnabled(data.gridMode);
      }
    }

    if (data.dragSpeed !== undefined && this.camera) {
      this.camera.panningSensibility = 20 - data.dragSpeed;
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
      if (type === 'glb') {
        const options = {
          shouldExportNode: (node: any) => {
            if (node instanceof BABYLON.Mesh) {
              return node.isEnabled() && node.getTotalVertices() > 0;
            }
            return true;
          }
        };
        const exportResult = await GLTF2Export.GLBAsync(this.scene!, fileNameWithoutExtension, options);
        const exportFile = exportResult.files[exportFileName];
        if (!(exportFile instanceof Blob)) {
          throw new Error("导出的 GLB 文件格式无效");
        }

        if (!isTauriEnv) {
          exportResult.downloadFiles();
        } else {
          const savePath = await save(saveDialogConfig);
          if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
          }
          const arrayBuffer = await exportFile.arrayBuffer();
          await writeFile(savePath, new Uint8Array(arrayBuffer));
        }
      }
      else if (type === 'json') {
        const exportDataScene = BABYLON.SceneSerializer.Serialize(this.scene!);
        const exportFile = JSON.stringify(exportDataScene, null, 2);

        if (!isTauriEnv) {
          const blob = new Blob([exportFile], { type: "application/json" });
          const a = document.createElement('a');
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = exportFileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 0);
        } else {
          const savePath = await save(saveDialogConfig);
          if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
          }
          await writeTextFile(savePath, exportFile);
        }
      }
      else if (type === 'db') {
        if (this.modelStore.file) {
          const fileName = this.modelStore.file?.name ?? "untitled";
          const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.') || fileName;
          const exportFileName = `${fileNameWithoutExtension}.db`;
          const envConfig = {
              x: 0, // 经度
              y: 0, // 纬度
              z: 0,
              a: 0,
              detail_level: 12
          };
          const parser = new IFCParser2DB();
          if (!isTauriEnv) {
            MessagePlugin.loading({
                content: '正在导出数据库文件，请稍候...',
                duration: 0, // 设置为0表示不自动关闭
                closeBtn: false
            });
            const result = await parser.start(this.modelStore.file, fileNameWithoutExtension, envConfig);
            console.log('result', result);
            MessagePlugin.closeAll();
            if (result) {
              const url = URL.createObjectURL(result);
              const a = document.createElement('a');
              a.href = url;
              a.download = exportFileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              // 显示成功消息
              MessagePlugin.success({
                  content: '导出成功！',
                  duration: 1000
              });
            } else {
                MessagePlugin.error({
                    content: '导出失败: 参数错误！',
                    duration: 1000
                });
            }
            return;
          }
          const savePath = await save(saveDialogConfig);
          if (!savePath) {
              MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
              return;
          }
          MessagePlugin.loading({
              content: '正在导出数据库文件，请稍候...',
              duration: 0, // 设置为0表示不自动关闭
              closeBtn: false
          });
          const result = await parser.start(this.modelStore.file, fileNameWithoutExtension, envConfig);
          console.log('result tauri', result);
          MessagePlugin.closeAll();
          if (result) {
              const arrayBuffer = await result.arrayBuffer();
              const uint8Array = new Uint8Array(arrayBuffer);
              await writeFile(savePath, uint8Array);
            
              MessagePlugin.success({
                  content: '导出成功！',
                  duration: 1000
              });
          } else {
                MessagePlugin.error({
                  content: '导出失败: 参数错误！',
                  duration: 1000
              });
          }
          return;
        }
      }
      MessagePlugin.success({ content: '导出成功！', duration: 1000 });
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

    // 清理UI纹理
    const existingUI = this.scene.textures.filter(t => t.name === "myUI");
    if (existingUI) {
      existingUI.forEach(t => t.dispose());
    }

    // 清理测量相关的网格
    const oldMeshes = this.scene.meshes.filter(mesh =>
      mesh.name === "measureLine" ||
      mesh.name === "tempLine" ||
      mesh.name === "measureRectangle" ||
      mesh.name === "tempRectangle" ||
      mesh.name === "rectangleMesh" ||
      mesh.name === "pointMarker"
    );
    oldMeshes.forEach(mesh => mesh.dispose());

    // 重置爆炸滑块
    const explosionSliderX = document.getElementById("explosionSliderX");
    const explosionSliderY = document.getElementById("explosionSliderY");
    const explosionSliderZ = document.getElementById("explosionSliderZ");
    if (explosionSliderX) {
      (explosionSliderX as any).val(0);
    }
    if (explosionSliderY) {
      (explosionSliderY as any).val(0);
    }
    if (explosionSliderZ) {
      (explosionSliderZ as any).val(0);
    }
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