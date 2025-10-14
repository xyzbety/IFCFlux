import * as BABYLON from "@babylonjs/core";
import { type ISliceShape, type IBaseSlice, type ISlicePlane, type ISliceShapeBorder, type ISliceShapeFill, type ISliceShapeStyle, DEFAULT_SHAPE_STYLE } from "./type";
import { deepMerge } from "./utils";
import { SceneManager } from "../../../services/scene-manager";
import { createArrowWithLine, createSmallPlane, setupRotationAndDrag, createCornerBorders, setupArrowDragWithPlaneMove, setupScenePointerHandlers } from "./utils";

export class SlicePlane implements IBaseSlice {
  border!: ISliceShapeBorder;
  fill!: ISliceShapeFill;
  plane: BABYLON.Mesh | null = null;
  scene: BABYLON.Scene;
  viewer: any;
  _clipPlaneIndex: number | undefined;
  _pointerObservable: BABYLON.Nullable<BABYLON.Observer<BABYLON.PointerInfo>> = null;
  _isReverse: boolean = false;
  _isOperatingHandle: boolean = true;
  _isShowPlane: boolean = true;
  size: number;
  sceneManager: SceneManager;

  constructor(scene: BABYLON.Scene, size: number = 10) {
    this.scene = scene;
    this.size = size;
    this.sceneManager = SceneManager.getInstance();
  }

  // ===================== 属性访问器 =====================
  set isShowPlane(value: boolean) {
    this._isShowPlane = value;
    if (this.plane) {
      this.plane.isVisible = value;
      const children = this.plane.getChildMeshes(false);
      children.forEach(child => child.isVisible = value);
    }
  }

  get isShowPlane() {
    return this._isShowPlane;
  }

  set isOperatingHandle(value: boolean) {
    this._isOperatingHandle = value;
  }

  get isOperatingHandle() {
    return this._isOperatingHandle;
  }

  set isReverse(value: boolean) {
    this._isReverse = value;
    this.updateClipPlane();
  }

  get isReverse() {
    return this._isReverse;
  }

  set position(position: BABYLON.Vector3 | number[]) {
    if (this.plane) {
      this.plane.position = position instanceof BABYLON.Vector3 ? position : new BABYLON.Vector3(...position);
      this.updateClipPlane();
    }
  }

  get position(): BABYLON.Vector3 {
    return this.plane?.position || BABYLON.Vector3.Zero();
  }

  set rotation(rotation: number[]) {
    if (this.plane) {
      this.plane.rotation.x = BABYLON.Tools.ToRadians(rotation[0]);
      this.plane.rotation.y = BABYLON.Tools.ToRadians(rotation[1]);
      this.plane.rotation.z = BABYLON.Tools.ToRadians(rotation[2]);
      this.updateClipPlane();
    }
  }

  get rotation(): BABYLON.Vector3 {
    return this.plane?.rotation || BABYLON.Vector3.Zero();
  }

  // ===================== 核心方法 =====================
  createPlane(shape: ISliceShape, styleProps?: ISliceShapeStyle) {
    this.disposePlane();

    const style = deepMerge(DEFAULT_SHAPE_STYLE, styleProps);
    const plane = BABYLON.MeshBuilder.CreatePlane("slicePlane", {
      size: this.size,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, this.scene);
    plane.renderingGroupId = 1;

    plane.position = shape.position instanceof BABYLON.Vector3 ? shape.position : new BABYLON.Vector3(...shape.position);

    if (shape.normal) {
      plane.lookAt(plane.position.add(shape.normal));
    }

    if (shape?.rotation?.length) {
      this.rotation = shape.rotation;
    }

    this.setupPlaneAppearance(plane, style);
    this.setupPlaneControls(plane);

    this.plane = plane;
    this.plane.isVisible = this.isShowPlane;
  }

  private setupPlaneAppearance(plane: BABYLON.Mesh, style: ISliceShapeStyle) {
    plane.enableEdgesRendering();
    plane.edgesWidth = 5;
    plane.edgesColor = BABYLON.Color4.FromHexString(style.border.color);

    const material = new BABYLON.StandardMaterial("planeMaterial", this.scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(style.fill.color);
    material.alpha = style.fill.opacity;
    material.backFaceCulling = false;
    plane.material = material;
  }

  private setupPlaneControls(plane: BABYLON.Mesh) {
    const arrow = createArrowWithLine(this.scene, plane, this.size, {
      position: "left",
      arrowOffset: 1,
      arrowColor: new BABYLON.Color3(1, 0.5, 0),
      lineColor: new BABYLON.Color3(1, 0.5, 0),
    });
    arrow.renderingGroupId = 1;
    const smallPlaneRight = createSmallPlane(this.scene, plane, this.size, {
      position: "right",
      size: 1,
      offset: 1,
      rotationAxis: "x",
      iconPath: "./icons/rotate-x.svg",
    });
    smallPlaneRight.renderingGroupId = 1;
    const smallPlaneTop = createSmallPlane(this.scene, plane, this.size, {
      position: "top",
      size: 1,
      offset: 1,
      rotationAxis: "y",
      iconPath: "./icons/rotate-y.svg",
    });
    smallPlaneTop.renderingGroupId = 1;

    const borders = createCornerBorders(
      this.scene,
      plane,
      this.size,
      2,
      0.1,
      0.3,
      new BABYLON.Color3(1, 0.5, 0)
    );
    borders.forEach(border => {
      border.renderingGroupId = 1;
    });
    setupArrowDragWithPlaneMove(this.scene, arrow, plane, () => this.updateClipPlane(), this.scene.activeCamera);
    setupRotationAndDrag(this.scene, plane, { smallPlaneRight, smallPlaneTop }, () => this.updateClipPlane(), this.scene.activeCamera);
    setupScenePointerHandlers(this.scene);
  }

  updateClipPlane() {
    if (!this.plane) return;

    this.plane.computeWorldMatrix(true);
    const normal = this.plane.getFacetNormal(0);
    const sourcePlane = BABYLON.Plane.FromPositionAndNormal(this.plane.position, normal);

    if (!this._isReverse) {
      sourcePlane.normal.scaleInPlace(-1);
      sourcePlane.d = -sourcePlane.d - 0.001;
      sourcePlane.normalize();
    }

    this.planetoSceneClip(sourcePlane);
  }

  planetoSceneClip(plane: BABYLON.Plane | null) {
    if (this._clipPlaneIndex !== undefined) {
      this._setClipPlane(this._clipPlaneIndex, plane);
    } else {
      for (let i = 0; i < 6; i++) {
        const clipPlaneAttr = `clipPlane${i !== 0 ? i + 1 : ''}`;
        if (!this.scene[clipPlaneAttr]) {
          this._clipPlaneIndex = i;
          this._setClipPlane(i, plane);
          break;
        }
      }
    }
  }

  private _setClipPlane(index: number, plane: BABYLON.Plane | null) {
    this.scene[`clipPlane${index !== 0 ? index + 1 : ''}`] = plane;
  }

  start(type?: string) {
    if (this._pointerObservable) {
      this.scene.onPointerObservable.remove(this._pointerObservable);
      this._pointerObservable = null;
    }

    let isPointerUp = false;
    let isDragging = false;
    let lastPointerPosition: { x: number; y: number } | null = null;

    this._pointerObservable = this.scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERUP:
          if (!isPointerUp && !isDragging) {
            isPointerUp = true;
            this.snapPlane(type);
            this.updateClipPlane();
            this._pointerObservable?.remove();
          }
          break;

        case BABYLON.PointerEventTypes.POINTERDOWN:
          isDragging = false;
          lastPointerPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
          break;

        case BABYLON.PointerEventTypes.POINTERMOVE:
          if (!isPointerUp) {
            this.snapPlane(type);
          }
          if (pointerInfo.event.buttons === 1 && lastPointerPosition) {
            const deltaX = pointerInfo.event.clientX - lastPointerPosition.x;
            const deltaY = pointerInfo.event.clientY - lastPointerPosition.y;
            lastPointerPosition = { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
              isDragging = true;
            }
          }
          break;
      }
    });
  }

  snapPlane(type?: string) {
    const ray = this.scene.createPickingRay(
      this.scene.pointerX,
      this.scene.pointerY,
      BABYLON.Matrix.Identity(),
      this.scene.activeCamera
    );

    const hit = this.scene.pickWithRay(ray, (mesh) => mesh.id !== 'slicePlane');
    if (hit.hit && hit.pickedMesh && hit.pickedPoint) {
      const normal = this.getNormalByType(type, hit);
      if (normal) {
        this.createPlane({ position: hit.pickedPoint, normal });
      }
    }
  }

  private getNormalByType(type: string | undefined, hit: BABYLON.PickingInfo): BABYLON.Vector3 | null {
    if (type === 'x') return new BABYLON.Vector3(1, 0, 0);
    if (type === 'y') return new BABYLON.Vector3(0, 0, -1);
    if (type === 'z') return new BABYLON.Vector3(0, 1, 0);
    return this.getNormalByFace(hit.pickedMesh!, hit.faceId!);
  }

  getNormalByFace(mesh: BABYLON.Mesh, faceId: number): BABYLON.Vector3 | null {
    const indices = mesh.getIndices();
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

    if (indices && positions) {
      const v1Index = indices[faceId * 3];
      const v2Index = indices[faceId * 3 + 1];
      const v3Index = indices[faceId * 3 + 2];

      const v1 = new BABYLON.Vector3(
        positions[v1Index * 3],
        positions[v1Index * 3 + 1],
        positions[v1Index * 3 + 2]
      );
      const v2 = new BABYLON.Vector3(
        positions[v2Index * 3],
        positions[v2Index * 3 + 1],
        positions[v2Index * 3 + 2]
      );
      const v3 = new BABYLON.Vector3(
        positions[v3Index * 3],
        positions[v3Index * 3 + 1],
        positions[v3Index * 3 + 2]
      );

      return BABYLON.Vector3.Cross(v2.subtract(v1), v3.subtract(v1)).normalize();
    }
    return null;
  }

  private disposePlane() {
    if (this.plane) {
      this.plane.dispose();
      this.plane = null;
    }
  }

  destroy() {
    this.disposePlane();
    this.planetoSceneClip(null);
    this._pointerObservable?.remove();
    this._pointerObservable = null;
  }
}
