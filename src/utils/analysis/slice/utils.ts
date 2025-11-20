import * as BABYLON from '@babylonjs/core';
import { EffectManager } from '../../../services/scene-effect';
// 常见对象类型
export interface CommonObject {
  [key: string | number]: string | number | boolean | CommonObject
}
/**
 * 合并两个对象
 * @param a 对象一 
 * @param b 对象二
 * @returns 
 */
export const deepMerge = (a: CommonObject, b: CommonObject) => {
  const output = { ...a };

  for (const key in b) {
    // 如果 b 的属性是对象且 a 的对应属性也是对象，则递归合并 
    if (typeof b[key] === 'object' && b[key] !== null && !Array.isArray(b[key])) {
      if (a[key] && typeof a[key] === 'object' && !Array.isArray(a[key])) {
        output[key] = deepMerge(a[key], b[key]);
      } else {
        // 如果 a 中没有对应属性或不是对象，直接覆盖 
        output[key] = b[key];
      }
    } else {
      // 非对象属性或数组，直接覆盖（可根据需求调整数组的处理逻辑）
      output[key] = b[key];
    }
  }

  return output;
}

// 全局状态变量
const dragState = {
  initialMousePosition: null as BABYLON.Vector2 | null,
  initialPlaneScaling: null as BABYLON.Vector3 | null,
  activeBorder: null as BABYLON.Mesh | null,
  isVertical: null as boolean | null,
  plane: null as BABYLON.Mesh | null,
};

const dragArrowState = {
  initialMousePosition: null as BABYLON.Vector2 | null,
  initialPlanePosition: null as BABYLON.Vector3 | null,
  arrow: null as BABYLON.Mesh | null,
  plane: null as BABYLON.Mesh | null,
  updateClipPlane: null as (() => void) | null,
  camera: null as BABYLON.ArcRotateCamera | null,
};

const rotateState = {
  initialRotation: 0,
  initialMousePosition: null as BABYLON.Vector2 | null,
  activeRotationAxis: null as "x" | "y" | null,
  plane: null as BABYLON.Mesh | null,
  updateClipPlane: null as (() => void) | null,
  camera: null as BABYLON.ArcRotateCamera | null,
};

/**
 * 创建平面
 */
export function createPlaneCustom(
  scene: BABYLON.Scene,
  options: {
    size: number;
    position: BABYLON.Vector3;
    color: BABYLON.Color3;
    alpha: number;
  }
): BABYLON.Mesh {
  const plane = BABYLON.MeshBuilder.CreatePlane("plane", {
    size: options.size,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
  }, scene);
  plane.position = options.position;

  const material = new BABYLON.StandardMaterial("planeMaterial", scene);
  material.diffuseColor = options.color;
  material.alpha = options.alpha;
  plane.material = material;

  return plane;
}

/**
 * 创建箭头和连接线
 */
export function createArrowWithLine(
  scene: BABYLON.Scene,
  parent: BABYLON.Mesh,
  parentSize: number,
  options: {
    position: "top" | "right" | "bottom" | "left";
    arrowOffset: number;
    arrowColor: BABYLON.Color3;
    lineColor: BABYLON.Color3;
    scaleFactor: number;
    effectManager: EffectManager
  }
): BABYLON.Mesh {
  const parentHalfSize = parentSize / 2;
  const localPosition = getLocalPosition(options.position, parentHalfSize, options.arrowOffset);

  // 创建箭身和箭头部件
  const cylinder = createCylinder(scene, "arrowCylinder", { height: 1.0, diameter: 0.15 });
  const cone1 = createCone(scene, "arrowCone1", { height: 0.5, diameter: 0.5 }, new BABYLON.Vector3(0, 0.6, 0));
  const cone2 = createCone(scene, "arrowCone2", { height: 0.5, diameter: 0.5 }, new BABYLON.Vector3(0, -0.6, 0), Math.PI);

  // 设置材质（禁用剖切）
  const material = createStandardMaterial(scene, "arrowMaterial", options.arrowColor, false, false);
  [cylinder, cone1, cone2].forEach(mesh => mesh.material = material);

  // 合并网格
  const mergedMesh = BABYLON.Mesh.MergeMeshes([cylinder, cone1, cone2], true);
  if (!mergedMesh) throw new Error("Failed to merge arrow meshes");

  mergedMesh.name = "arrow";
  mergedMesh.position = localPosition;
  mergedMesh.rotation.x = Math.PI / 2;
  mergedMesh.parent = parent;

  // 创建连接线（禁用剖切）
  const linePoints = getLinePoints(options.position, parentHalfSize, options.arrowOffset, 0.075 * options.scaleFactor);
  const line = BABYLON.MeshBuilder.CreateLines("arrowConnectorLine", { points: linePoints }, scene);
  line.parent = parent;
  line.material = createStandardMaterial(scene, "lineMaterial", options.lineColor, true, false);
  if (options.effectManager?.simpleTarget?.renderList) {
    options.effectManager.simpleTarget.renderList.push(line);
    options.effectManager.simpleTarget.setMaterialForRendering(line, line.material);
  }
  mergedMesh.scaling = new BABYLON.Vector3(options.scaleFactor, options.scaleFactor, options.scaleFactor);


  return mergedMesh;
}

/**
 * 创建小平面
 */
export function createSmallPlane(
  scene: BABYLON.Scene,
  parent: BABYLON.Mesh,
  parentSize: number,
  options: {
    position: "top" | "right" | "bottom" | "left";
    size: number;
    offset: number;
    rotationAxis: "x" | "y";
    iconPath: string;
    effectManager: EffectManager
  }
): BABYLON.Mesh {
  const parentHalfSize = parentSize / 2;
  const smallPlane = BABYLON.MeshBuilder.CreatePlane(`smallPlane${options.position}`, {
    size: options.size,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
  }, scene);
  smallPlane.parent = parent;

  // 设置位置和旋转
  const { position, rotation } = getSmallPlaneTransform(options.position, parentHalfSize, options.offset);
  smallPlane.position = position;
  smallPlane.rotation = rotation;

  // 创建连接线
  const linePoints = getSmallPlaneLinePoints(options.position, parentHalfSize, options.offset, options.size);
  const line = BABYLON.MeshBuilder.CreateLines(`smallPlaneConnectorLine${options.position}`, { points: linePoints }, scene);
  line.parent = parent;
  line.renderingGroupId = 1;

  // 设置材质（禁用剖切）
  smallPlane.material = createTextureMaterial(scene, "smallPlaneMaterial", options.iconPath, false);
  line.material = createStandardMaterial(scene, "lineMaterial", new BABYLON.Color3(1, 0.5, 0), true, false);
  if (options.effectManager?.simpleTarget?.renderList) {
    options.effectManager.simpleTarget.renderList.push(line);
    options.effectManager.simpleTarget.setMaterialForRendering(line, line.material);
  }
  return smallPlane;
}

/**
 * 设置场景指针事件处理器
 */
export function setupScenePointerHandlers(scene: BABYLON.Scene) {
  // 清理旧处理器
  scene.onPointerMove = undefined;
  scene.onPointerUp = undefined;
  isCameraMoving(scene);

  // 绑定新处理器
  scene.onPointerMove = () => {
    if (!scene.activeCamera) return;
    // 拖拽优先级高于旋转
    if (dragArrowState.initialMousePosition && dragArrowState.plane) {
      handleArrowDrag(scene);
    } else if (rotateState.initialMousePosition && rotateState.plane) {
      handleRotation(scene);
    } else if (dragState.initialMousePosition && dragState.plane) {
      handleBorderDrag(scene);
    }
  };

  scene.onPointerUp = () => {
    resetDragArrowState(scene);
    resetRotateState(scene);
    resetDragState(scene);
    scene.activeCamera?.attachControl(scene.getEngine().getRenderingCanvas()!, true);
  };

  scene.onPointerDown = () => {
    if (isCameraMoving(scene)) {
      return; // 如果相机正在旋转，不启用拖拽
    }
    enablePlaneDrag(scene); // 确保拖拽行为启用
  };

}


/**
 * 设置旋转逻辑
 */
export function setupRotationAndDrag(
  scene: BABYLON.Scene,
  plane: BABYLON.Mesh,
  options: {
    smallPlaneRight: BABYLON.Mesh;
    smallPlaneTop: BABYLON.Mesh;
  },
  updateClipPlane: () => void,
  camera: BABYLON.ArcRotateCamera
): void {
  setupSmallPlaneActions(scene, options.smallPlaneRight, plane, "x", updateClipPlane, camera);
  setupSmallPlaneActions(scene, options.smallPlaneTop, plane, "y", updateClipPlane, camera);
}


/**
 * 创建四条管道，沿着平面的四个边延伸
 * @param scene 场景对象
 * @param plane 平面对象
 * @param size 平面的尺寸
 * @param tubeRadius 管道半径（默认为 0.1）
 * @param tubeColor 管道颜色
 * @returns 返回所有管道的数组
 */
export function createCornerTubes(
  scene: BABYLON.Scene,
  plane: BABYLON.Mesh,
  size: number,
  tubeLength: number = 2,
  tubeRadius: number = 0.1,
  tubeColor: BABYLON.Color3 = new BABYLON.Color3(1, 0.5, 0),
  hoverTubeRadius: number = 0.13 // 悬停时的管道半径
): BABYLON.Mesh[] {
  const tubes: BABYLON.Mesh[] = [];
  const halfSize = size / 2;
  const material = new BABYLON.StandardMaterial("tubeMaterial", scene);
  material.diffuseColor = tubeColor;
  material.clipPlane = false;

  // 定义四个角的坐标和方向
  const corners = [
    {
      name: "topRight",
      x: halfSize,
      y: halfSize,
      horizontalDir: 1,  // 水平方向：向右（X 轴正方向）
      verticalDir: -1   // 垂直方向：向下（Y 轴负方向）
    },
    {
      name: "topLeft",
      x: -halfSize,
      y: halfSize,
      horizontalDir: -1, // 水平方向：向左（X 轴负方向）
      verticalDir: -1    // 垂直方向：向下（Y 轴负方向）
    },
    {
      name: "bottomLeft",
      x: -halfSize,
      y: -halfSize,
      horizontalDir: -1, // 水平方向：向左（X 轴负方向）
      verticalDir: 1     // 垂直方向：向上（Y 轴正方向）
    },
    {
      name: "bottomRight",
      x: halfSize,
      y: -halfSize,
      horizontalDir: 1,  // 水平方向：向右（X 轴正方向）
      verticalDir: 1    // 垂直方向：向上（Y 轴正方向）
    }
  ];

  // 为每个角创建一个“L”形管道
  corners.forEach(corner => {
    // 定义“L”形管道的路径（水平 + 垂直）
    const lShapePoints = [
      new BABYLON.Vector3(corner.x - corner.horizontalDir * tubeLength, corner.y, 0), // 起点（角点）
      new BABYLON.Vector3(
        corner.x, // 水平终点
        corner.y,
        0
      ),
      new BABYLON.Vector3(
        corner.x, // 垂直起点（与水平终点重合）
        corner.y + corner.verticalDir * tubeLength,  // 垂直终点
        0
      )
    ];

    const lShapeTube = BABYLON.MeshBuilder.CreateTube(
      `${corner.name}LShapeTube`,
      {
        path: lShapePoints,
        radius: tubeRadius,
        cap: BABYLON.Mesh.CAP_ALL
      },
      scene
    );
    lShapeTube.material = material;
    lShapeTube.parent = plane;
    const pivotMatrix = BABYLON.Matrix.Translation(-corner.x, -corner.y, 0);
    lShapeTube.setPivotMatrix(pivotMatrix);

    tubes.push(lShapeTube);

    // 设置悬停、移出和拖拽逻辑
    setupTubeActions(scene, lShapeTube, tubeRadius, hoverTubeRadius);
  });

  return tubes;
}
export function createPlaneEdges(scene: BABYLON.Scene, plane: BABYLON.Mesh, size: number, color: BABYLON.Color3): BABYLON.LinesMesh[] {
  const edges: BABYLON.LinesMesh[] = [];
  const halfSize = size / 2;

  // 定义四个边缘的顶点位置
  const positions = [
    // 上边缘
    new BABYLON.Vector3(-halfSize, halfSize, 0),
    new BABYLON.Vector3(halfSize, halfSize, 0),
    // 右边缘
    new BABYLON.Vector3(halfSize, halfSize, 0),
    new BABYLON.Vector3(halfSize, -halfSize, 0),
    // 下边缘
    new BABYLON.Vector3(halfSize, -halfSize, 0),
    new BABYLON.Vector3(-halfSize, -halfSize, 0),
    // 左边缘
    new BABYLON.Vector3(-halfSize, -halfSize, 0),
    new BABYLON.Vector3(-halfSize, halfSize, 0),
  ];

  // 创建线段
  const edgeLines = BABYLON.MeshBuilder.CreateLines("planeEdges", {
    points: positions
  }, scene);
  edgeLines.material = createStandardMaterial(scene, "lineMaterial", color, true, false);

  // 将线段附加到平面上
  edgeLines.parent = plane;
  edges.push(edgeLines);

  return edges;
}
function setupTubeActions(
  scene: BABYLON.Scene,
  tube: BABYLON.Mesh,
  tubeRadius: number,
  hoverTubeRadius: number
): void {
  tube.actionManager = new BABYLON.ActionManager(scene);

  // 悬停效果：增大管道半径
  tube.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
      tube.scaling = new BABYLON.Vector3(
        hoverTubeRadius / tubeRadius,
        hoverTubeRadius / tubeRadius,
        hoverTubeRadius / tubeRadius
      );
    })
  );

  tube.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
      tube.scaling = new BABYLON.Vector3(1, 1, 1);
    })
  );

  // 按下效果：增大管道半径
  tube.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
      tube.scaling = new BABYLON.Vector3(
        hoverTubeRadius / tubeRadius,
        hoverTubeRadius / tubeRadius,
        hoverTubeRadius / tubeRadius
      );
    })
  );

  // 拖拽逻辑
  tube.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, (evt) => {
      if (scene.activeCamera) scene.activeCamera.detachControl();
      dragState.initialMousePosition = new BABYLON.Vector2(evt.pointerX, evt.pointerY);
      dragState.initialPlaneScaling = dragState.plane?.scaling.clone() || new BABYLON.Vector3(1, 1, 1);
      dragState.activeBorder = tube;
      dragState.plane = tube.parent as BABYLON.Mesh;
      dragState.isVertical = tube.name.includes("Right") || tube.name.includes("Left");
    })
  );
}


function createCylinder(scene: BABYLON.Scene, name: string, options: { height: number; diameter: number }): BABYLON.Mesh {
  return BABYLON.MeshBuilder.CreateCylinder(name, options, scene);
}

function createCone(
  scene: BABYLON.Scene,
  name: string,
  options: { height: number; diameter: number },
  position: BABYLON.Vector3,
  rotationZ: number = 0
): BABYLON.Mesh {
  const cone = BABYLON.MeshBuilder.CreateCylinder(name, { ...options, diameterTop: 0 }, scene);
  cone.position = position;
  cone.rotation.z = rotationZ;
  return cone;
}

function createStandardMaterial(
  scene: BABYLON.Scene,
  name: string,
  color: BABYLON.Color3,
  emissive: boolean = false,
  clipPlane: boolean = true
): BABYLON.StandardMaterial {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.backFaceCulling = false;
  if (emissive) material.emissiveColor = color;
  material.clipPlane = clipPlane;
  return material;
}

function createTextureMaterial(
  scene: BABYLON.Scene,
  name: string,
  texturePath: string,
  clipPlane: boolean = true
): BABYLON.StandardMaterial {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseTexture = new BABYLON.Texture(texturePath, scene);
  material.diffuseTexture.hasAlpha = true;
  material.backFaceCulling = false;
  material.clipPlane = clipPlane;
  return material;
}

function getLocalPosition(position: string, parentHalfSize: number, offset: number): BABYLON.Vector3 {
  switch (position) {
    case "left": return new BABYLON.Vector3(-parentHalfSize - offset, 0, 0);
    case "right": return new BABYLON.Vector3(parentHalfSize + offset, 0, 0);
    case "top": return new BABYLON.Vector3(0, parentHalfSize + offset, 0);
    case "bottom": return new BABYLON.Vector3(0, -parentHalfSize - offset, 0);
    default: throw new Error("Unsupported position");
  }
}

function getLinePoints(position: string, parentHalfSize: number, offset: number, cylinderDiameter = 0.1): BABYLON.Vector3[] {
  switch (position) {
    case "left": return [
      new BABYLON.Vector3(-parentHalfSize, 0, 0),
      new BABYLON.Vector3(-parentHalfSize - offset + cylinderDiameter, 0, 0),
    ];
    case "right": return [
      new BABYLON.Vector3(parentHalfSize, 0, 0),
      new BABYLON.Vector3(parentHalfSize + offset - cylinderDiameter, 0, 0),
    ];
    case "top": return [
      new BABYLON.Vector3(0, parentHalfSize, 0),
      new BABYLON.Vector3(0, parentHalfSize + offset - cylinderDiameter, 0),
    ];
    case "bottom": return [
      new BABYLON.Vector3(0, -parentHalfSize, 0),
      new BABYLON.Vector3(0, -parentHalfSize - offset + cylinderDiameter, 0),
    ];
    default: throw new Error("Unsupported position");
  }
}

function getSmallPlaneTransform(
  position: string,
  parentHalfSize: number,
  offset: number,
): { position: BABYLON.Vector3; rotation: BABYLON.Vector3 } {
  const rotation = new BABYLON.Vector3();
  let localPosition = BABYLON.Vector3.Zero();

  switch (position) {
    case "right":
      localPosition = new BABYLON.Vector3(parentHalfSize + offset, 0, 0);
      rotation.x = Math.PI / 2;
      break;
    case "top":
      localPosition = new BABYLON.Vector3(0, parentHalfSize + offset, 0);
      rotation.z = Math.PI / 2;
      break;
    case "left":
      localPosition = new BABYLON.Vector3(-parentHalfSize - offset, 0, 0);
      rotation.x = Math.PI / 2;
      break;
    case "bottom":
      localPosition = new BABYLON.Vector3(0, -parentHalfSize - offset, 0);
      rotation.z = Math.PI / 2;
      break;
    default: throw new Error("Unsupported position");
  }

  return { position: localPosition, rotation };
}

function getSmallPlaneLinePoints(
  position: string,
  parentHalfSize: number,
  offset: number,
  size: number
): BABYLON.Vector3[] {
  switch (position) {
    case "right": return [
      new BABYLON.Vector3(parentHalfSize, 0, 0),
      new BABYLON.Vector3(parentHalfSize + offset - size / 2, 0, 0),
    ];
    case "top": return [
      new BABYLON.Vector3(0, parentHalfSize, 0),
      new BABYLON.Vector3(0, parentHalfSize + offset - size / 2, 0),
    ];
    case "left": return [
      new BABYLON.Vector3(-parentHalfSize, 0, 0),
      new BABYLON.Vector3(-parentHalfSize - offset + size / 2, 0, 0),
    ];
    case "bottom": return [
      new BABYLON.Vector3(0, -parentHalfSize, 0),
      new BABYLON.Vector3(0, -parentHalfSize - offset + size / 2, 0),
    ];
    default: throw new Error("Unsupported position");
  }
}

function setupSmallPlaneActions(
  scene: BABYLON.Scene,
  smallPlane: BABYLON.Mesh,
  plane: BABYLON.Mesh,
  axis: "x" | "y",
  updateClipPlane: () => void,
  camera: BABYLON.ArcRotateCamera
): void {
  smallPlane.actionManager = new BABYLON.ActionManager(scene);

  smallPlane.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
      smallPlane.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
    })
  );
  smallPlane.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
      smallPlane.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
    })
  );

  smallPlane.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
      smallPlane.scaling = new BABYLON.Vector3(1, 1, 1);
    })
  );

  smallPlane.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnLeftPickTrigger, (evt) => {
      camera.detachControl();
      rotateState.initialRotation = axis === "x" ? plane.rotation.x : plane.rotation.y;
      rotateState.initialMousePosition = new BABYLON.Vector2(evt.pointerX, evt.pointerY);
      rotateState.activeRotationAxis = axis;
      rotateState.plane = plane;
      rotateState.updateClipPlane = updateClipPlane;
      rotateState.camera = camera;
    })
  );
}


function handleArrowDrag(scene: BABYLON.Scene): void {
  if (!dragArrowState.initialMousePosition || !dragArrowState.initialPlanePosition || !dragArrowState.plane) return;

  const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
  const deltaX = currentMousePosition.x - dragArrowState.initialMousePosition.x;
  const deltaY = currentMousePosition.y - dragArrowState.initialMousePosition.y;
  const dragSpeed = 0.05;

  dragArrowState.plane.position = dragArrowState.initialPlanePosition.add(
    new BABYLON.Vector3(deltaX * dragSpeed, -deltaY * dragSpeed, -deltaY * dragSpeed)
  );
  dragArrowState.updateClipPlane?.();
}

function handleRotation(scene: BABYLON.Scene): void {

  if (!rotateState.initialMousePosition || !rotateState.activeRotationAxis || !rotateState.plane) return;
  // 禁用拖拽行为
  const dragBehavior = rotateState.plane.behaviors.find(b => b instanceof BABYLON.PointerDragBehavior) as BABYLON.PointerDragBehavior | undefined;
  if (dragBehavior) {
    dragBehavior.enabled = false;
  }
  const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
  const deltaX = currentMousePosition.x - rotateState.initialMousePosition.x;
  const rotationSpeed = 0.005;

  if (rotateState.activeRotationAxis === "x") {
    rotateState.plane.rotation.x = rotateState.initialRotation + deltaX * rotationSpeed;
  } else if (rotateState.activeRotationAxis === "y") {
    rotateState.plane.rotation.y = rotateState.initialRotation + deltaX * rotationSpeed;
  }
  rotateState.updateClipPlane?.();
}

function handleBorderDrag(scene: BABYLON.Scene): void {
  if (!dragState.initialMousePosition || !dragState.plane) return;
  const dragBehavior = dragState.plane.behaviors.find(b => b instanceof BABYLON.PointerDragBehavior) as BABYLON.PointerDragBehavior | undefined;
  if (dragBehavior) {
    dragBehavior.enabled = false;
  }

  const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
  const deltaX = currentMousePosition.x - dragState.initialMousePosition.x;
  const deltaY = currentMousePosition.y - dragState.initialMousePosition.y;
  const dragSpeed = 0.005;

  // 直接基于当前缩放值进行增量调整
  dragState.plane.scaling.x = Math.max(0.1, dragState.plane.scaling.x + deltaX * dragSpeed);
  dragState.plane.scaling.y = Math.max(0.1, dragState.plane.scaling.y - deltaY * dragSpeed);

  // 更新初始鼠标位置，以便下一次拖拽基于新的位置
  dragState.initialMousePosition = currentMousePosition;
}



function resetDragArrowState(scene: BABYLON.Scene): void {
  if (dragArrowState.camera) {
    const canvas = scene.getEngine().getRenderingCanvas();
    if (canvas) dragArrowState.camera.attachControl(canvas, true);
  }
  if (dragArrowState.arrow) dragArrowState.arrow.scaling = new BABYLON.Vector3(1, 1, 1);

  dragArrowState.initialMousePosition = null;
  dragArrowState.initialPlanePosition = null;
  dragArrowState.arrow = null;
  dragArrowState.plane = null;
  dragArrowState.updateClipPlane = null;
}

function resetRotateState(scene: BABYLON.Scene): void {
  if (rotateState.plane) {
    if (rotateState.activeRotationAxis === "x") {
      const right = rotateState.plane.getChildMeshes(false, m => m.name.startsWith("smallPlaneright"))[0];
      if (right) right.scaling = new BABYLON.Vector3(1, 1, 1);
    } else if (rotateState.activeRotationAxis === "y") {
      const top = rotateState.plane.getChildMeshes(false, m => m.name.startsWith("smallPlanetop"))[0];
      if (top) top.scaling = new BABYLON.Vector3(1, 1, 1);
    }
  }

  if (rotateState.camera) {
    const canvas = scene.getEngine().getRenderingCanvas();
    if (canvas) rotateState.camera.attachControl(canvas, true);
  }

  rotateState.initialMousePosition = null;
  rotateState.activeRotationAxis = null;
  rotateState.plane = null;
  rotateState.updateClipPlane = null;
  rotateState.camera = null;
}

function resetDragState(scene: BABYLON.Scene): void {
  dragState.initialMousePosition = null;
  dragState.initialPlaneScaling = null;
  if (dragState.activeBorder) {
    dragState.activeBorder.scaling = new BABYLON.Vector3(1, 1, 1);
    dragState.activeBorder = null;
  }
  dragState.plane = null;
  dragState.isVertical = null;
  scene.activeCamera?.attachControl(scene.getEngine().getRenderingCanvas()!, true);
}


function isCameraMoving(scene: BABYLON.Scene): boolean {
  const camera = scene.activeCamera as BABYLON.ArcRotateCamera | undefined;
  if (!camera) {
    console.log("相机未检测到移动/旋转状态（无活动相机）");
    return false;
  }

  let lastAlpha = camera.alpha;
  let lastBeta = camera.beta;

  scene.onBeforeRenderObservable.add(() => {
    if (camera.alpha !== lastAlpha || camera.beta !== lastBeta) {
      lastAlpha = camera.alpha;
      lastBeta = camera.beta;
      disablePlaneDrag(scene);
      return true
    } else {
      enablePlaneDrag(scene);
    }
  });

  return false;
}


// 禁用平面拖拽行为
function disablePlaneDrag(scene: BABYLON.Scene) {
  const plane = scene.meshes.find(m => m.name === "slicePlane");
  if (plane) {
    const dragBehavior = plane.behaviors.find(
      b => b instanceof BABYLON.PointerDragBehavior
    ) as BABYLON.PointerDragBehavior | undefined;
    if (dragBehavior) {
      dragBehavior.enabled = false;
    }
  }
}

// 启用平面拖拽行为
function enablePlaneDrag(scene: BABYLON.Scene) {
  const plane = scene.meshes.find(m => m.name === "slicePlane");
  if (plane) {
    const dragBehavior = plane.behaviors.find(
      b => b instanceof BABYLON.PointerDragBehavior
    ) as BABYLON.PointerDragBehavior | undefined;
    if (dragBehavior) {
      dragBehavior.enabled = true;
    }
  }
}