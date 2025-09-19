import * as BABYLON from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials';


// 找到最大包围盒
export function getBoundingBoxForMeshes(meshes: BABYLON.AbstractMesh[]): BABYLON.BoundingBox {
    if (meshes.length === 0) {
        throw new Error("Mesh数组不能为空");
    }

    // 初始化最小和最大点
    let min = new BABYLON.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    let max = new BABYLON.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

    meshes.forEach(mesh => {
        // 更新mesh的世界矩阵以确保包围盒计算准确
        mesh.computeWorldMatrix(true);

        // 获取mesh的包围盒
        const boundingBox = mesh.getBoundingInfo().boundingBox;

        // 转换到世界坐标
        const meshMin = BABYLON.Vector3.TransformCoordinates(boundingBox.minimum, mesh.getWorldMatrix());
        const meshMax = BABYLON.Vector3.TransformCoordinates(boundingBox.maximum, mesh.getWorldMatrix());

        // 更新总体最小和最大点
        min = BABYLON.Vector3.Minimize(min, meshMin);
        max = BABYLON.Vector3.Maximize(max, meshMax);
    });

    return new BABYLON.BoundingBox(min, max);
}

export function createGround(scene: BABYLON.Scene, bbox: any, isGrid: boolean) {
    const gridWidth = (bbox.maximum.x - bbox.minimum.x) * 1.5;
    const gridHeight = (bbox.maximum.z - bbox.minimum.z) * 1.5;
    // 网格Y坐标放在模型底部稍微低一点
    const gridY = bbox.minimum.y - 0.1;
    // 创建一个大平面
    const grid = BABYLON.MeshBuilder.CreateGround(
        "infiniteGrid",
        { width: gridWidth, height: gridHeight, subdivisions: 20 },
        scene
    );
    const gridMaterial = new GridMaterial("gridMaterial", scene);
    gridMaterial.majorUnitFrequency = 1; // 主线每1格
    gridMaterial.minorUnitVisibility = 1; // 次线可见度
    gridMaterial.gridRatio = gridWidth / 30; // 每格实际大小
    // gridMaterial.lineColor = new BABYLON.Color3(1.0, 1.0, 1.0); // 主线颜色
    gridMaterial.mainColor = new BABYLON.Color3(1.0, 1.0, 1.0); // 背景色
    gridMaterial.opacity = 0.999; // 接近1但不完全1
    gridMaterial.alphaMode = BABYLON.Engine.ALPHA_COMBINE;
    gridMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND; // 允许alpha混合
    gridMaterial.backFaceCulling = false;
    gridMaterial.useMaxLine = true;
    grid.material = gridMaterial;
    grid.position = bbox.center;
    grid.position.y = gridY;
    grid.setEnabled(isGrid);
    console.log("地面加载完成", grid);
}
// 提取相机初始化设置为独立函数
export function setupCameraByBoundingBox(camera: BABYLON.ArcRotateCamera, bbox: any) {
    // 计算包围盒中心和最大跨度
    const center = bbox.center; // {x, y, z}
    const sizeX = bbox.maximum.x - bbox.minimum.x;
    const sizeY = bbox.maximum.y - bbox.minimum.y;
    const sizeZ = bbox.maximum.z - bbox.minimum.z;
    const maxSize = Math.max(sizeX, sizeY, sizeZ);

    // 设置相机目标为模型中心
    camera.setTarget(new BABYLON.Vector3(center.x, center.y, center.z));
    camera.alpha = 2 * Math.PI / 3; // 设置初始角度
    camera.beta = Math.PI / 3; // 设置初始仰角

    // 设置相机距离（radius），让模型完整显示
    camera.radius = maxSize * 1.8;

    // 根据距离动态调整相机平移惯性和灵敏度
    const minRadius = 10;
    const maxRadius = 1000;
    const minInertia = 0;
    const maxInertia = 0.5;

    // 归一化radius到0~1
    const norm = Math.min(Math.max((camera.radius - minRadius) / (maxRadius - minRadius), 0), 1);
    // 灵敏度和惯性插值
    camera.panningInertia = minInertia + (maxInertia - minInertia) * norm;
}
export function rgbToHex(rgb: string): string {
    // 匹配 rgb 或 rgba 格式
    const result = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!result) return "#000000";
    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);
    // 转为十六进制并补零
    return (
        "#" +
        [r, g, b]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase()
    );
}
export function hexToRgb(hex: string): { r: number, g: number, b: number } {
    console.log("hexToRgb", hex);
    // 移除 # 符号
    hex = hex.replace('#', '');

    // 解析十六进制颜色值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b }
}
export function createAnimatable(mesh: BABYLON.Mesh, prop: 'rotation' | 'position', params: {
    to: BABYLON.Vector3,
    duration: number,
    reverse?: boolean,
    loop?: boolean,
    easingType?: string
}) {
    const { to, duration, reverse, loop, easingType } = params;
    const frameCount = Math.max(1, Math.round(duration * 60));
    const from = mesh[prop].clone();
    const keys = [
        { frame: 0, value: from },
        { frame: frameCount, value: to }
    ];
    if (reverse) {
        keys.push({ frame: frameCount * 2, value: from });
    }
    const animation = new BABYLON.Animation(
        `${prop}Anim`,
        prop,
        60,
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        loop ? BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE : BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    animation.setKeys(keys);

    let easingFunction: BABYLON.EasingFunction | undefined;
    switch (easingType) {
        case "SineEase": easingFunction = new BABYLON.SineEase(); break;
        case "CubicEase": easingFunction = new BABYLON.CubicEase(); break;
        case "QuadraticEase": easingFunction = new BABYLON.QuadraticEase(); break;
        case "ExponentialEase": easingFunction = new BABYLON.ExponentialEase(); break;
        case "BounceEase": easingFunction = new BABYLON.BounceEase(); break;
        case "ElasticEase": easingFunction = new BABYLON.ElasticEase(); break;
        case "BackEase": easingFunction = new BABYLON.BackEase(); break;
        default: easingFunction = undefined;
    }
    if (easingFunction) {
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        animation.setEasingFunction(easingFunction);
    }
    mesh.animations = [animation];
    return animation;
}


export function resetModelToInitialState(scene, initialCameraState, camera, originalMaterialProperties) {
    if (!scene) return;

    try {
        // 重置所有模型网格到初始状态
        scene.meshes.forEach(mesh => {
            // 跳过特殊网格
            if (mesh.name === 'skyBox' ||
                mesh.name === 'ground' ||
                mesh.name === 'infiniteGrid' ||
                mesh.name === 'linkMesh' ||
                mesh.name.startsWith('measure') ||
                mesh.name.startsWith('temp')) {
                return;
            }

            // 重置位置、旋转、缩放
            if (mesh.metadata && mesh.metadata.initialState) {
                // 如果有保存的初始状态，恢复到初始状态
                mesh.position.copyFrom(mesh.metadata.initialState.position);
                mesh.rotation.copyFrom(mesh.metadata.initialState.rotation);
                mesh.scaling.copyFrom(mesh.metadata.initialState.scaling);
            } else {
                // 没有保存的初始状态，设置为默认值
                mesh.position.set(0, 0, 0);
                mesh.rotation.set(0, 0, 0);
                mesh.scaling.set(1, 1, 1);
            }

            // 重置可见性和透明度
            mesh.isVisible = true;
            mesh.visibility = 1.0;
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

        // 重置摄像机到初始状态
        if (initialCameraState && camera) {
            camera.alpha = initialCameraState.alpha;
            camera.beta = initialCameraState.beta;
            camera.radius = initialCameraState.radius;
            camera.setTarget(initialCameraState.target.clone ?
                initialCameraState.target.clone() :
                new BABYLON.Vector3(initialCameraState.target.x, initialCameraState.target.y, initialCameraState.target.z)
            );
        }

        console.log('模型状态已重置到初始状态', camera.radius, initialCameraState.radius);

    } catch (error) {
        console.error('重置模型状态时出错:', error);
    }
};

export function updateTempLineLabel(tempLine: BABYLON.AbstractMesh, anchor: BABYLON.Mesh) {
    if (!tempLine) return;
    const points = tempLine.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    if (!points || points.length < 6) return;
    // 取起点和终点
    const start = new BABYLON.Vector3(points[0], points[1], points[2]);
    const end = new BABYLON.Vector3(points[points.length - 3], points[points.length - 2], points[points.length - 1]);
    // 计算中点
    const mid = BABYLON.Vector3.Center(start, end);
    anchor.position.copyFrom(mid);
}

export function debounce(func: Function, wait: number = 500) {
    let timeout: number | null = null;
    return function executedFunction(...args: any[]) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
};


export function throttle(func: Function, limit: number) {
    let inThrottle: boolean = false;
    return function (this: any, ...args: any[]) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

