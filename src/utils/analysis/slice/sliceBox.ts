import * as BABYLON from "@babylonjs/core";
import { type ISliceBox, type ISliceProps, type ISliceShapeBorder, type ISliceShapeFill, type UpdateSliceBoxType, type ISliceShapeStyle, DEFAULT_SHAPE_STYLE } from "./type";
import { deepMerge } from "./utils";


/**
 * 操作选项
 */
const OPERATION_OPTION = {
  'add': 1,
  'subtract': -1,
}

/**
 * 方向选项
 */
const DIRECTION_OPTION = {
  'positive': -1, // 正方向
  'negative': 1, // 负方向
}

export class SliceBox {

  // 剖切形状
  box!: BABYLON.Mesh

  // 剖切边框
  border!: ISliceShapeBorder;

  // 剖切填充
  fill!: ISliceShapeFill

  plane: any

  _plane: any

  scene: any

  props!: ISliceProps

  vertex: any

  originSize: number[] = []

  planes = []
  set position(position: any) {
    this.box.position = position instanceof BABYLON.Vector3 ? position : new BABYLON.Vector3(...position)
  }

  get position() {
    return this.box.position
  }

  set width(value: number) {
    this.box.scaling.x = value / this.originSize[0]
    this.setClipPlanes()
  }

  get width() {
    return this.originSize[0] * this.box.scaling.x
  }

  get height() {
    return this.originSize[1] * this.box.scaling.y
  }

  set height(value: number) {
    this.box.scaling.y = value / this.originSize[1]
    this.setClipPlanes()
  }

  get depth() {
    return this.originSize[2] * this.box.scaling.y
  }
  set depth(value: number) {
    this.box.scaling.z = value / this.originSize[2]
    this.setClipPlanes()
  }


  constructor(scene: BABYLON.Scene, shape: ISliceBox, styleProps?: ISliceShapeStyle) {
    this.scene = scene
    styleProps && (this.props = styleProps)
    this.createBox(shape, styleProps)
    this.tranformListen()
  }
  /**
   * 给场景设置剖切面
   * @param i 序号
   * @param plane 平面
   */
  planetoSceneClip(i: number, plane: any) {
    // clipPlane最多只能设置6个
    if (i > 6) {
      throw new Error("clipPlane最多只能设置6个!");
    }
    this.scene[`clipPlane${i !== 0 ? i + 1 : ''}`] = plane
  }

  /**
   * 更新剖切盒大小
   * @param type 更新类型
   * @param step 步长
   */
  updateBox(type: UpdateSliceBoxType, step: number = 1) {
    // 获取更新类型的各个参数
    const typeArr = type.split('-')
    const axis = typeArr[0]
    const direction = DIRECTION_OPTION[typeArr[1] as keyof typeof DIRECTION_OPTION]
    const operation = OPERATION_OPTION[typeArr[2] as keyof typeof OPERATION_OPTION]

    // 处理更新类型错误的情况，抛出错误
    if (!axis || direction === undefined || operation === undefined) {
      const typeTip = Object.keys(DIRECTION_OPTION).flatMap(dir =>
        Object.keys(OPERATION_OPTION).map(op => `x-${dir}-${op}, y-${dir}-${op}, z-${dir}-${op}`)
      ).join(', ')
      throw new Error(`剖切盒更新类型参数错误，仅支持以下格式: ${typeTip}`);
    }

    // 对不用更新类型进行处理
    switch (axis) {
      case 'x':
        this.box.position.x = this.box.position.x + direction * operation * step / 2
        this.width = this.width + step * operation
        break;
      case 'y':
        this.box.position.y = this.box.position.y + direction * operation * step / 2
        this.height = this.height + step * operation
        break;
      case 'z':
        this.box.position.x = this.box.position.x + direction * operation * step / 2
        this.depth = this.depth + step * operation
        break;
      default:
        break;
    }
  }
  /**
   * 创建剖切盒
   * @param shape 
   * @param styleProps 剖切盒样式 
   */
  createBox(shape: ISliceBox, styleProps?: ISliceShapeStyle) {
    const style = deepMerge(DEFAULT_SHAPE_STYLE, styleProps)
    // 创建几何box
    this.box = BABYLON.MeshBuilder.CreateBox("slicBox", {
      width: shape.width, // 宽度，对应x轴
      depth: shape.depth, // 深度， 对应z轴
      height: shape.height, // 高度，对应y轴
    }, this.scene);
    this.position = shape.position

    this.box.enableEdgesRendering();
    this.box.edgesWidth = style.border.width;
    this.box.edgesColor = BABYLON.Color4.FromHexString(style.border.color)

    // 设置盒子的材质
    const defaultMat = new BABYLON.StandardMaterial("otherMat", this.scene);
    defaultMat.diffuseColor = BABYLON.Color3.FromHexString(style.fill.color)
    defaultMat.alpha = style.fill.opacity;
    defaultMat.backFaceCulling = false
    this.box.material = defaultMat;

    // 获取盒子的原始顶点，每个面由三个顶点组成
    this.vertex = this.box.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    // 获取盒子的原始大小
    const boundingInfo = this.box.getBoundingInfo();
    const { x, y, z } = boundingInfo.boundingBox.extendSize
    this.originSize = [x * 2, y * 2, z * 2]

    this.setClipPlanes()
  }

  /**
   * 设置场景裁剪plane
   */
  setClipPlanes() {
    if (this.vertex) {
      const worldMatrix = this.box.computeWorldMatrix(true);
      for (let i = 0; i < this.vertex!.length; i += 12) {
        const point1 = new BABYLON.Vector3(...this.vertex.slice(i, i + 3))
        const point2 = new BABYLON.Vector3(...this.vertex.slice(i + 3, i + 6))
        const point3 = new BABYLON.Vector3(...this.vertex.slice(i + 6, i + 9))
        const cPoint1 = BABYLON.Vector3.TransformCoordinates(point1, worldMatrix);
        const cPoint2 = BABYLON.Vector3.TransformCoordinates(point2, worldMatrix);
        const cPoint3 = BABYLON.Vector3.TransformCoordinates(point3, worldMatrix);
        const plane = BABYLON.Plane.FromPoints(cPoint1, cPoint2, cPoint3)

        plane.normal.scaleInPlace(-1);
        plane.d = -plane.d;

        plane.normalize();  // 重新归一化 
        this.planes.push(plane)
        this.planetoSceneClip(i / 12, plane)
      }
    }
  }

  /**
   * 监听鼠标控制剖切盒子变化
   */
  tranformListen() {
    // 注意：临时写法，gizmoManager(物体操作控件)应该在场景中只存在一个较好。
    const gizmoManager = new BABYLON.GizmoManager(this.scene);
    gizmoManager.positionGizmoEnabled = true;
    gizmoManager.usePointerToAttachGizmos = false;
    gizmoManager.scaleGizmoEnabled = true;
    gizmoManager.attachableMeshes = [this.box];
    gizmoManager.attachToMesh(this.box);
    if (gizmoManager.gizmos.positionGizmo) {
      gizmoManager.gizmos.positionGizmo.scaleRatio = 2; // 设置位置 Gizmo 标记的大小
      gizmoManager.gizmos.positionGizmo.onDragObservable.add(() => {
        this.setClipPlanes()
      });
    }

    if (gizmoManager.gizmos.scaleGizmo) {
      gizmoManager.gizmos.scaleGizmo.scaleRatio = 1; // 设置缩放 Gizmo 标记的大小
      gizmoManager.gizmos.scaleGizmo.onDragObservable.add(() => {
        this.setClipPlanes()
      });
    }
  }

  modifyMouseCamera() {
    const camera = this.scene.cameras[0]
    // 获取指针输入控制器 
    const pointersInput = camera.inputs.attached["pointers"];
    // 仅保留右键（平移）和中键（缩放），移除左键（索引0）
    pointersInput.buttons = [1, 2];
  }


  /**
   * 销毁所有资源 
   */
  destroy() {
    // 1. 销毁剖切盒网格 
    if (this.box) {
      this.box.dispose();
      this.box = null as any;
    }

    // 2. 移除所有剖切平面引用 
    for (let i = 0; i < this.planes.length; i++) {
      this.scene[`clipPlane${i !== 0 ? i + 1 : ''}`] = null;
    }
    this.planes = [];

    // 3. 清理其他引用 
    this.border = null as any;
    this.fill = null as any;
    this.plane = null;
    this._plane = null;
    this.vertex = null;
    this.originSize = [];
    this.props = null as any;
  }
}