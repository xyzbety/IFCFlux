import * as BABYLON from "@babylonjs/core";
import { type ISliceShape, type IBaseSlice, type ISlicePlane, type ISliceShapeBorder, type ISliceShapeFill, type ISliceShapeStyle, DEFAULT_SHAPE_STYLE } from "./type";
import { deepMerge } from "./utils";
// import "@babylonjs/inspector"; // 可选：引入调试工具 


export class SlicePlane implements IBaseSlice {

  // 剖切边框
  border!: ISliceShapeBorder

  // 剖切填充
  fill!: ISliceShapeFill

  plane: any

  sourcePlane: any

  scene: any
  viewer: any
  _clipPlaneIndex!: number
  _planeVisualization: any

  // 鼠标监听实例
  _pointerObservable: any

  // 是否反向剖切
  _isReverse: boolean = false

  gizmoManager: any
  utilLayer: any

  _isOperatingHandle: boolean = true

  _isShowPlane: boolean = true

  size: number = 10

  set isShowPlane(value: boolean) {
    this._isShowPlane = value;
    if (this.plane) {
      this.plane.isVisible = value;
    }
    if (this.gizmoManager) {
      if (value && this._isOperatingHandle) {
        if (this.gizmoManager.rotationGizmo) {
          this.gizmoManager.rotationGizmo.attachedMesh = this.plane;
        }
      } else {
        if (this.gizmoManager.rotationGizmo) {
          this.gizmoManager.rotationGizmo.attachedMesh = null;
        }
      }
    }
  }
  get isShowPlane() {
    return this._isShowPlane
  }

  set isOperatingHandle(value: boolean) {
    this._isOperatingHandle = value
    if (this.gizmoManager) {
      const mesh = this._isOperatingHandle ? this.plane : null;
      if (this.gizmoManager.rotationGizmo) {
        this.gizmoManager.rotationGizmo.attachedMesh = mesh;
      }
    }
  }
  get isOperatingHandle() {
    return this._isOperatingHandle
  }
  set isReverse(value: boolean) {
    this._isReverse = value
  }

  get isReverse() {
    return this._isReverse
  }

  /**
   * 设置剖切面的中心点
   */
  set position(position: any) {
    this.plane.position = position instanceof BABYLON.Vector3 ? position : new BABYLON.Vector3(...position)
    this.updateClipPlane()
  }

  /**
 * 获取剖切面的中心点
 */
  get position() {
    return this.plane.position
  }

  /**
   * 设置剖切面的旋转
   */
  set rotation(rotation: number[]) {
    this.plane.rotation.x = BABYLON.Tools.ToRadians(rotation[0]);

    // 设置旋转值（绕 Y 轴旋转 90 度）
    this.plane.rotation.y = BABYLON.Tools.ToRadians(rotation[1]);

    this.plane.rotation.z = BABYLON.Tools.ToRadians(rotation[2]);
    this.updateClipPlane()
  }

  /**
 * 获取剖切面的旋转
 */
  get rotation() {
    return this.plane.rotation
  }

  constructor(scene: BABYLON.Scene, size: number = 10) {
    this.scene = scene
    this.size = size
    // this.createClipPlane(shape, styleProps)
         this._tranformListen()

    // this.mousePointer()
  }

  /**
 * 给场景设置剖切面
 * @param plane 平面
 */
  planetoSceneClip(plane: any) {
    // clipPlane最多只能设置6个
    // this.scene.clipPlane = plane
    // console.log('this.scene.clipPlane', this.scene.clipPlane);

    if (this._clipPlaneIndex !== undefined) {
      this._setClipPlane(this._clipPlaneIndex, plane)
    } else {
      let i = 0
      while (i < 6 && this._clipPlaneIndex === undefined) {
        const clipPlaneAttr = `clipPlane${i !== 0 ? i + 1 : ''}`

        if (!this.scene[clipPlaneAttr]) {
          this._clipPlaneIndex = i
          this.planetoSceneClip(plane)
        }
        i++
      }
      if (i > 6) {
        throw new Error("clipPlane最多只能设置6个!");
      }
    }
    // console.log('this._clipPlaneIndex', this._clipPlaneIndex);

  }

  _setClipPlane(i: number, plane: any) {
    this.scene[`clipPlane${i !== 0 ? i + 1 : ''}`] = plane
  }

  /**
   * 创建几何可视平面
   * @param shape 平面信息
   * @param styleProps 平面样式
   */
  createPlane(shape: ISliceShape, styleProps?: ISliceShapeStyle) {
    if (this.plane) {
      this.plane.dispose()
      this.plane = null
    }

    const style = deepMerge(DEFAULT_SHAPE_STYLE, styleProps)
    // console.log('style', style);
    const plane = BABYLON.MeshBuilder.CreatePlane("slicePlane", {
      size: this.size,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    })
    const position = shape.position
    plane.position = position


    if (shape.normal) {
      plane.lookAt(position.add(shape.normal));
    }
    if (shape?.rotation && shape?.rotation.length) {
      plane.rotation.x = BABYLON.Tools.ToRadians(shape?.rotation[0]);

      // 设置旋转值（绕 Y 轴旋转 90 度）
      plane.rotation.y = BABYLON.Tools.ToRadians(shape?.rotation[1]);

      plane.rotation.z = BABYLON.Tools.ToRadians(shape?.rotation[2]);
    }

    // 设置平面边缘线
    plane.enableEdgesRendering();
    plane.edgesWidth = style.border.width;
    plane.edgesColor = BABYLON.Color4.FromHexString(style.border.color)


    const material = new BABYLON.StandardMaterial("cubeMaterial", this.scene);
    // 设置平面颜色
    material.diffuseColor = BABYLON.Color3.FromHexString(style.fill.color)
    // 设置平面透明度
    material.alpha = style.fill.opacity;
    material.backFaceCulling = false
    plane.material = material
    const pointerDragBehavior = new BABYLON.PointerDragBehavior();
    pointerDragBehavior.onDragEndObservable.add(() => {
      this.updateClipPlane()
    });
    plane.addBehavior(pointerDragBehavior);
    this.plane = plane
    this.plane.isVisible = this.isShowPlane
  }

  /**
   * 创建具有剖切功能的可视平面
   * @param shape 平面信息
   * @param styleProps 平面样式
   */
  createClipPlane(shape: ISliceShape, styleProps?: ISliceShapeStyle) {
    this.createPlane(shape, styleProps)
    this.plane.computeWorldMatrix(true);   // 强制更新世界矩阵 
    this.updateClipPlane()
    if (this.isOperatingHandle) {
      this.gizmoManager.attachedMesh = this.plane
    }


  }

  /**
   * 更新剖切平面
   */
  updateClipPlane() {
    // 强制更新世界矩阵（关键修复！）
    this.plane.computeWorldMatrix(true);
    // 获取平面法线
    const normal = this.plane.getFacetNormal(0);
    // 从几何平面中获取sourcePlane，用于设置剖切面
    const sourcePlane = BABYLON.Plane.FromPositionAndNormal(this.plane.position, normal);
    if (!this._isReverse) {
      sourcePlane.normal.scaleInPlace(-1);
      // 添加一个容错,保证原始plane材质正常
      const faultTolerant = 0.001
      sourcePlane.d = -sourcePlane.d - faultTolerant;
      sourcePlane.normalize();  // 重新归一化 
    }

    this.planetoSceneClip(sourcePlane)
  }

  _tranformListen() {
    // 先清理现有的gizmo
    if (this.gizmoManager) {
      this.gizmoManager.dispose();
    }

    this.utilLayer = new BABYLON.UtilityLayerRenderer(this.scene);

    const rotationGizmo = new BABYLON.RotationGizmo(this.utilLayer);

    rotationGizmo.xGizmo.isEnabled = true;
    rotationGizmo.yGizmo.isEnabled = true;
    rotationGizmo.zGizmo.isEnabled = false

    // 设置拖动结束时更新剖切平面
    const updateCallback = () => this.updateClipPlane();

    rotationGizmo.xGizmo.dragBehavior.onDragEndObservable.add(updateCallback);
    rotationGizmo.yGizmo.dragBehavior.onDragEndObservable.add(updateCallback);


    // 保存gizmo引用
    this.gizmoManager = {
      rotationGizmo: rotationGizmo,
      dispose: () => {
        rotationGizmo.dispose();
      }
    };
  }
  /**
 * 处理鼠标控制创建剖切面
 */
  start(type?: string) {
    let isPointerUp = false
    let isDragging = false;
    let lastPointerPosition: any = null;
    this._pointerObservable = this.scene.onPointerObservable.add((pointerInfo: any) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERUP:
          if (!isPointerUp && !isDragging) {
            isPointerUp = true;
            this.snapPlane(type)
            this.updateClipPlane()
            if (this.isOperatingHandle) {
              // 适配新的gizmoManager结构
              if (this.gizmoManager.rotationGizmo) {
                this.gizmoManager.rotationGizmo.attachedMesh = this.plane;
              }
            }

            // 移除鼠标指针监听器
            this._pointerObservable.remove()
            console.log('POINTERUP');
          }
          break;
        case BABYLON.PointerEventTypes.POINTERDOWN:
          isDragging = false; // 开始点击，重置拖动状态
          lastPointerPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
        case BABYLON.PointerEventTypes.POINTERMOVE:
          console.log('POINTERMOVE');
          !isPointerUp && this.snapPlane(type)
          if (pointerInfo.event.buttons === 1) { // 检查是否按下左键
            const deltaX = pointerInfo.event.clientX - lastPointerPosition.x;
            const deltaY = pointerInfo.event.clientY - lastPointerPosition.y;
            lastPointerPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
            // 如果移动超过一定阈值，标记为拖动
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
              isDragging = true;
            }
          }
          break;
      }
      // isDragging = false;
    });

  }

  /**
   * 通过鼠标点吸附几何面创建平面
   */
  snapPlane(type?: string) {
    // 点创建击射线
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      BABYLON.Matrix.Identity(),
      this.scene.activeCamera
    );
    const hit = this.scene.pickWithRay(ray, (mesh: any) => {
      // 排除planeVisualization剖切平面
      return mesh.name !== 'slicePlane'
    })
    if (hit.hit && hit.pickedMesh) {

      if (type === 'x') {
        this.createPlane({ position: hit.pickedPoint, normal: new BABYLON.Vector3(1, 0, 0) })
      } else if (type === 'y') {
        this.createPlane({ position: hit.pickedPoint, normal: new BABYLON.Vector3(0, 0, -1) })
      } else if (type === 'z') {
        this.createPlane({ position: hit.pickedPoint, normal: new BABYLON.Vector3(0, 1, 0) })
      } else {
        this.createPlane({ position: hit.pickedPoint, normal: this.getNormalByFace(hit.pickedMesh, hit.faceId) })
      }

    }
  }

  /**
   * 通过面ID获取Mesh的法线
   * @param mesh 几何Mesh
   * @param faceId 面ID
   * @returns 法线
   */
  getNormalByFace(mesh: BABYLON.Mesh, faceId: number) {
    // 获取平面法线
    const indices = mesh.getIndices();

    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (indices && positions) {
      const v1Index = indices[faceId * 3];
      const v2Index = indices[faceId * 3 + 1];
      const v3Index = indices[faceId * 3 + 2];

      const v1 = new BABYLON.Vector3(positions[v1Index * 3], positions[v1Index * 3 + 1], positions[v1Index * 3 + 2]);
      const v2 = new BABYLON.Vector3(positions[v2Index * 3], positions[v2Index * 3 + 1], positions[v2Index * 3 + 2]);
      const v3 = new BABYLON.Vector3(positions[v3Index * 3], positions[v3Index * 3 + 1], positions[v3Index * 3 + 2]);

      const edge1 = v2.subtract(v1);
      const edge2 = v3.subtract(v1);
      const normal = BABYLON.Vector3.Cross(edge1, edge2).normalize();
      return normal;
    }
    return null;
  }
  /**
 * 销毁所有资源 
 */
  destroy() {
    // 1. 销毁剖切盒网格 
    if (this.plane) {
      this.plane.dispose();
      this.plane = null as any;
    }

    // 2. 移除剖切平面
    this.planetoSceneClip(null)

    // 3. 清理其他引用 
    this.border = null as any;
    this.fill = null as any;
    this.plane = null;

    // 适配新的gizmoManager结构
    if (this.gizmoManager && this.gizmoManager.dispose) {
      this.gizmoManager.dispose();
    }
    this.gizmoManager = null as any;

    // 4. 移除事件监听
    if (this._pointerObservable) {
      this.scene.onPointerObservable.remove(this._pointerObservable);
      this._pointerObservable = null;
    }
  }
}