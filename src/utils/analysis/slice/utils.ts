import * as BABYLON from '@babylonjs/core';
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
  }
): BABYLON.Mesh {
  const parentHalfSize = parentSize / 2;
  const localPosition = getLocalPosition(options.position, parentHalfSize, options.arrowOffset);

  // 创建箭身和箭头部件
  const cylinder = createCylinder(scene, "arrowCylinder", { height: 1.5, diameter: 0.2 });
  const cone1 = createCone(scene, "arrowCone1", { height: 0.5, diameter: 0.5 }, new BABYLON.Vector3(0, 1, 0));
  const cone2 = createCone(scene, "arrowCone2", { height: 0.5, diameter: 0.5 }, new BABYLON.Vector3(0, -1, 0), Math.PI);

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
  const linePoints = getLinePoints(options.position, parentHalfSize, options.arrowOffset);
  const line = BABYLON.MeshBuilder.CreateLines("arrowConnectorLine", { points: linePoints }, scene);
  line.parent = parent;
  line.material = createStandardMaterial(scene, "lineMaterial", options.lineColor, true, false);

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
  }
): BABYLON.Mesh {
  const parentHalfSize = parentSize / 2;
  const smallPlane = BABYLON.MeshBuilder.CreatePlane(`smallPlane${options.position}`, {
    size: options.size,
    sideOrientation: BABYLON.Mesh.DOUBLESIDE,
  }, scene);
  smallPlane.parent = parent;

  // 设置位置和旋转
  const { position, rotation } = getSmallPlaneTransform(options.position, parentHalfSize, options.offset, options.rotationAxis);
  smallPlane.position = position;
  smallPlane.rotation = rotation;

  // 创建连接线
  const linePoints = getSmallPlaneLinePoints(options.position, parentHalfSize, options.offset, options.size);
  const line = BABYLON.MeshBuilder.CreateLines(`smallPlaneConnectorLine${options.position}`, { points: linePoints }, scene);
  line.parent = parent;

  // 设置材质（禁用剖切）
  smallPlane.material = createTextureMaterial(scene, "smallPlaneMaterial", options.iconPath, false);
  line.material = createStandardMaterial(scene, "lineMaterial", new BABYLON.Color3(1, 0.5, 0), true, false);

  return smallPlane;
}

/**
 * 设置场景指针事件处理器
 */
export function setupScenePointerHandlers(scene: BABYLON.Scene) {
  // 清理旧处理器
  scene.onPointerMove = undefined;
  scene.onPointerUp = undefined;

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
}

/**
 * 设置箭头拖拽逻辑
 */
export function setupArrowDragWithPlaneMove(
  scene: BABYLON.Scene,
  arrow: BABYLON.Mesh,
  plane: BABYLON.Mesh,
  updateClipPlane: () => void,
  camera: BABYLON.ArcRotateCamera
): void {
  arrow.actionManager = new BABYLON.ActionManager(scene);

  arrow.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
      arrow.scaling = new BABYLON.Vector3(1.3, 1.3, 1.3);
    })
  );

  arrow.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, (evt) => {
      if (camera) camera.detachControl();
      dragArrowState.initialMousePosition = new BABYLON.Vector2(evt.pointerX, evt.pointerY);
      dragArrowState.initialPlanePosition = plane.position.clone();
      dragArrowState.arrow = arrow;
      dragArrowState.plane = plane;
      dragArrowState.updateClipPlane = updateClipPlane;
      dragArrowState.camera = camera;
    })
  );
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
 * 创建四个角的边框
 */
export function createCornerBorders(
  scene: BABYLON.Scene,
  plane: BABYLON.Mesh,
  size: number,
  borderLength: number = 2,
  borderThickness: number = 0.1,
  hoverBorderThickness: number = 0.3,
  borderColor: BABYLON.Color3 = new BABYLON.Color3(1, 0.5, 0)
): BABYLON.Mesh[] {
  const borderMaterial = new BABYLON.StandardMaterial("borderMaterial", scene);
  borderMaterial.diffuseColor = borderColor;

  const cornerGroups: Record<string, BABYLON.Mesh[]> = {
    topRight: [],
    bottomRight: [],
    topLeft: [],
    bottomLeft: [],
  };

  // 创建右上角边框（水平方向）
  const topBorder = createBorder(scene, plane, "topBorder", {
    width: borderLength,
    height: borderThickness,
    depth: borderThickness,
    position: new BABYLON.Vector3(size / 2 - borderLength / 2, size / 2, 0),
    material: borderMaterial,
    group: cornerGroups.topRight,
  });

  // 创建右上角垂直边框（垂直方向）
  const rightBorder = createBorder(scene, plane, "rightBorder", {
    width: borderThickness,
    height: borderLength,
    depth: borderThickness,
    position: new BABYLON.Vector3(size / 2, size / 2 - borderLength / 2, 0),
    material: borderMaterial,
    group: cornerGroups.topRight,
  });

  // 创建右下角边框（水平方向）
  const bottomBorder = createBorder(scene, plane, "bottomBorder", {
    width: borderLength,
    height: borderThickness,
    depth: borderThickness,
    position: new BABYLON.Vector3(size / 2 - borderLength / 2, -size / 2, 0),
    material: borderMaterial,
    group: cornerGroups.bottomRight,
  });

  // 创建右下角垂直边框（垂直方向）
  const rightBorderBottom = createBorder(scene, plane, "rightBorderBottom", {
    width: borderThickness,
    height: borderLength,
    depth: borderThickness,
    position: new BABYLON.Vector3(size / 2, -size / 2 + borderLength / 2, 0),
    material: borderMaterial,
    group: cornerGroups.bottomRight,
  });

  // 创建左上角边框（水平方向）
  const topBorderLeft = createBorder(scene, plane, "topBorderLeft", {
    width: borderLength,
    height: borderThickness,
    depth: borderThickness,
    position: new BABYLON.Vector3(-size / 2 + borderLength / 2, size / 2, 0),
    material: borderMaterial,
    group: cornerGroups.topLeft,
  });

  // 创建左上角垂直边框（垂直方向）
  const leftBorderTop = createBorder(scene, plane, "leftBorderTop", {
    width: borderThickness,
    height: borderLength,
    depth: borderThickness,
    position: new BABYLON.Vector3(-size / 2, size / 2 - borderLength / 2, 0),
    material: borderMaterial,
    group: cornerGroups.topLeft,
  });

  // 创建左下角边框（水平方向）
  const bottomBorderLeft = createBorder(scene, plane, "bottomBorderLeft", {
    width: borderLength,
    height: borderThickness,
    depth: borderThickness,
    position: new BABYLON.Vector3(-size / 2 + borderLength / 2, -size / 2, 0),
    material: borderMaterial,
    group: cornerGroups.bottomLeft,
  });

  // 创建左下角垂直边框（垂直方向）
  const leftBorderBottom = createBorder(scene, plane, "leftBorderBottom", {
    width: borderThickness,
    height: borderLength,
    depth: borderThickness,
    position: new BABYLON.Vector3(-size / 2, -size / 2 + borderLength / 2, 0),
    material: borderMaterial,
    group: cornerGroups.bottomLeft,
  });

  // 为所有边框添加悬停和拖拽逻辑
  const borders = [
    topBorder, rightBorder, bottomBorder, rightBorderBottom,
    topBorderLeft, leftBorderTop, bottomBorderLeft, leftBorderBottom,
  ];
  borders.forEach(border => setupBorderActions(scene, border, cornerGroups, borderThickness, hoverBorderThickness));
  return borders
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

function getLinePoints(position: string, parentHalfSize: number, offset: number): BABYLON.Vector3[] {
  switch (position) {
    case "left": return [
      new BABYLON.Vector3(-parentHalfSize, 0, 0),
      new BABYLON.Vector3(-parentHalfSize - offset + 0.1, 0, 0),
    ];
    case "right": return [
      new BABYLON.Vector3(parentHalfSize, 0, 0),
      new BABYLON.Vector3(parentHalfSize + offset - 0.1, 0, 0),
    ];
    case "top": return [
      new BABYLON.Vector3(0, parentHalfSize, 0),
      new BABYLON.Vector3(0, parentHalfSize + offset - 0.1, 0),
    ];
    case "bottom": return [
      new BABYLON.Vector3(0, -parentHalfSize, 0),
      new BABYLON.Vector3(0, -parentHalfSize - offset + 0.1, 0),
    ];
    default: throw new Error("Unsupported position");
  }
}

function getSmallPlaneTransform(
  position: string,
  parentHalfSize: number,
  offset: number,
  rotationAxis: string
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
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, (evt) => {
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

function createBorder(
  scene: BABYLON.Scene,
  parent: BABYLON.Mesh,
  name: string,
  options: {
    width: number;
    height: number;
    depth: number;
    position: BABYLON.Vector3;
    material: BABYLON.StandardMaterial;
    group: BABYLON.Mesh[];
  }
): BABYLON.Mesh {
  const border = BABYLON.MeshBuilder.CreateBox(name, {
    width: options.width,
    height: options.height,
    depth: options.depth,
  }, scene);
  border.position = options.position;
  border.material = options.material;
  border.parent = parent;
  options.group.push(border);
  return border;
}

function setupBorderActions(
  scene: BABYLON.Scene,
  border: BABYLON.Mesh,
  cornerGroups: Record<string, BABYLON.Mesh[]>,
  borderThickness: number,
  hoverBorderThickness: number
): void {
  border.actionManager = new BABYLON.ActionManager(scene);

  // 悬停效果
  border.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
      const group = findBorderGroup(border, cornerGroups);
      if (group) updateBorderScaling(group, hoverBorderThickness / borderThickness);
    })
  );

  // 移出恢复
  border.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
      const group = findBorderGroup(border, cornerGroups);
      if (group) updateBorderScaling(group, 1);
    })
  );

  // 拖拽逻辑
  border.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, (evt) => {
      if (scene.activeCamera) scene.activeCamera.detachControl();
      dragState.initialMousePosition = new BABYLON.Vector2(evt.pointerX, evt.pointerY);
      dragState.initialPlaneScaling = dragState.plane?.scaling.clone() || new BABYLON.Vector3(1, 1, 1);
      dragState.activeBorder = border;
      dragState.plane = border.parent as BABYLON.Mesh;
      dragState.isVertical = border.name.includes("right") || border.name.includes("left");
    })
  );
}

function findBorderGroup(border: BABYLON.Mesh, cornerGroups: Record<string, BABYLON.Mesh[]>): BABYLON.Mesh[] | undefined {
  for (const group of Object.values(cornerGroups)) {
    if (group.includes(border)) return group;
  }
  return undefined;
}

function updateBorderScaling(group: BABYLON.Mesh[], scale: number): void {
  group.forEach(b => {
    if (b.name.includes("top") || b.name.includes("bottom")) {
      b.scaling.y = scale;
    } else {
      b.scaling.x = scale;
    }
  });
}

function handleArrowDrag(scene: BABYLON.Scene): void {
  if (!dragArrowState.initialMousePosition || !dragArrowState.initialPlanePosition || !dragArrowState.plane) return;

  const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
  const deltaX = currentMousePosition.x - dragArrowState.initialMousePosition.x;
  const deltaY = currentMousePosition.y - dragArrowState.initialMousePosition.y;
  const dragSpeed = 0.05;

  dragArrowState.plane.position = dragArrowState.initialPlanePosition.add(
    new BABYLON.Vector3(deltaX * dragSpeed, -deltaY * dragSpeed, deltaY * dragSpeed)
  );
  dragArrowState.updateClipPlane?.();
}

function handleRotation(scene: BABYLON.Scene): void {
  if (!rotateState.initialMousePosition || !rotateState.activeRotationAxis || !rotateState.plane) return;

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
  if (!dragState.initialMousePosition || !dragState.initialPlaneScaling || !dragState.activeBorder || !dragState.plane) return;

  const currentMousePosition = new BABYLON.Vector2(scene.pointerX, scene.pointerY);
  const deltaX = currentMousePosition.x - dragState.initialMousePosition.x;
  const deltaY = currentMousePosition.y - dragState.initialMousePosition.y;
  const dragSpeed = 0.005;

  if (dragState.isVertical) {
    // 水平方向缩放（左右拖动）
    dragState.plane.scaling.x = Math.max(0.1, dragState.initialPlaneScaling.x + deltaX * dragSpeed);
  } else {
    // 垂直方向缩放（上下拖动）
    // 鼠标往下移动（deltaY为正）时减小缩放，往上移动（deltaY为负）时增加缩放
    dragState.plane.scaling.y = Math.max(0.1, dragState.initialPlaneScaling.y - deltaY * dragSpeed);
  }
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
  dragState.activeBorder = null;
  dragState.plane = null;
  dragState.isVertical = null;
  scene.activeCamera?.attachControl(scene.getEngine().getRenderingCanvas()!, true);
}
