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

// 模型高亮
let highlightLayer: BABYLON.HighlightLayer | null = null;

export function setHighlightMaterial(scene: BABYLON.Scene) {
    // 创建 ShaderMaterial 并启用透明混合
    const shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom"
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["worldViewProjection", "time"],
        needAlphaBlending: true // 启用透明混合
    });

    // 设置初始 uniform 值
    shaderMaterial.setTexture("colorTexture", new BABYLON.Texture("/textures/tex_1.png", scene));

    shaderMaterial.setFloat("time", 0.0);

    // 关闭背面剔除以实现双面渲染
    shaderMaterial.backFaceCulling = false;

    const vertexShader = `
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;

            uniform mat4 worldViewProjection;

            varying vec2 vUv;
            varying vec3 fNormal;
            varying vec3 vPosition;
            void main()
            {
                vUv = uv;
                fNormal=normal;
                vPosition=position;
                gl_Position = worldViewProjection * vec4(position, 1.0);
            }`;

    const fragmentShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec3 fNormal;
            varying vec3 vPosition;

            uniform float time;
            uniform sampler2D colorTexture;

        void main( void ) {
            vec2 position = vUv;
            vec3 tempNomal= normalize(fNormal);
            float power=step(0.95,abs(tempNomal.y));
             
            // 使用浅蓝色基础色
            vec3 lightBlue = vec3(0.8, 1.0, 1.0); // 浅蓝色
            float intensity = 0.5; // 降低强度
             
            vec4 colorb = vec4(lightBlue * intensity, 1.0); // 浅蓝色，带透明度
            vec4 colora = texture2D(colorTexture,vec2(vUv.x,fract(vUv.y-time))) * 0.2; // 降低动态纹理强度
             
            if(power>0.95){
                gl_FragColor = colorb;
            }else{
                // 混合时使用更温和的叠加
                gl_FragColor = vec4(lightBlue * (intensity + colora.rgb * 0.1), 1.0);
            }       
        }`;

    BABYLON.Effect.ShadersStore["customVertexShader"] = vertexShader;
    BABYLON.Effect.ShadersStore["customFragmentShader"] = fragmentShader;
    return shaderMaterial;
}

export function highlightMeshes(meshes: BABYLON.AbstractMesh[], scene: BABYLON.Scene, isFocus: boolean) {
    restoreMaterials(scene);

    // 创建高亮层（只创建一次）
    if (!highlightLayer) {
        highlightLayer = new BABYLON.HighlightLayer("highlightLayer", scene, {
            mainTextureFixedSize: 1024,        // 提高纹理分辨率
            alphaBlendingMode: BABYLON.Engine.ALPHA_COMBINE,
        });
        highlightLayer.outerGlow = false;
        highlightLayer.innerGlow = true;
        console.log("创建高亮层", highlightLayer);
    }
    meshes.forEach(mesh => {
        if (!mesh.metadata) mesh.metadata = {};


        // 保存原始状态
        mesh.metadata.originalMaterial = mesh.material;
        mesh.metadata.originalVisibility = mesh.isVisible;
        mesh.metadata.clonedMeshes = []; // 保存克隆的引用

        mesh.renderOverlay = true; // 确保启用覆盖渲染
        mesh.overlayColor = new BABYLON.Color4(0.68, 1.0, 1.0, 0.5); // 浅蓝色
        // mesh.material = setHighlightMaterial(scene);
        mesh.isVisible = true;
        highlightLayer!.addMesh(mesh, new BABYLON.Color3(0.0, 1.0, 1.0)); // 浅蓝色高亮
        // mesh.enableEdgesRendering();
        // mesh.edgesWidth = 2; // 设置边缘宽度
        // mesh.edgesColor = new BABYLON.Color4(0.0, 1.0, 1.0, 1.0);
        // console.log(mesh.edgesRenderer.linesPositions);
        // var poss = []
        // for (let i = 0; i < mesh.edgesRenderer.linesPositions.length; i += 3 * 4) {
        //     const e = new BABYLON.Vector3(
        //         mesh.edgesRenderer.linesPositions[i],
        //         mesh.edgesRenderer.linesPositions[i + 1],
        //         mesh.edgesRenderer.linesPositions[i + 2]
        //     )
        //     const e2 = new BABYLON.Vector3(
        //         mesh.edgesRenderer.linesPositions[i + 6],
        //         mesh.edgesRenderer.linesPositions[i + 6 + 1],
        //         mesh.edgesRenderer.linesPositions[i + 6 + 2]
        //     )
        //     poss.push([e, e2]);
        // }
        // BABYLON.GreasedLineMaterialDefaults.DEFAULT_WIDTH = 0.01
        // let line = BABYLON.CreateGreasedLine("lineEdge", { points: poss }, {
        //     color: new BABYLON.Color3(0, 1, 1),
        // });
        // line.renderingGroupId = 1; // 确保线条在同一渲染组
        // line.parent = mesh

    });

    // 自动聚焦（保持原有逻辑）
    if (isFocus && meshes.length > 0) {
        try {
            const bbox = getBoundingBoxForMeshes(meshes);
            scene.activeCamera!.setTarget(bbox.center);
            scene.activeCamera!.radius = bbox.maximum.subtract(bbox.minimum).length() * 1.8;
        } catch (e) {
            console.error("Focus error:", e);
        }
    }
}
// 修改恢复函数
export function restoreMaterials(scene: BABYLON.Scene) {
    // 清除高亮层
    if (highlightLayer) {
        highlightLayer.removeAllMeshes();
        highlightLayer.dispose();
        highlightLayer = null;
    }

    scene.meshes.forEach(mesh => {
        if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
            return;
        }
        if (mesh.metadata?.originalMaterial !== undefined) {
            // 恢复材质
            mesh.material = mesh.metadata.originalMaterial;
            mesh.isVisible = mesh.metadata.originalVisibility !== false;
            mesh.renderingGroupId = 0; // 恢复渲染组
            mesh.renderOverlay = false; // 关闭覆盖渲染
            // mesh.enableEdgesRendering(false);   
            // const lineMeshes = mesh.getChildMeshes(false, (node) => node.name === "lineEdge");
            // if (lineMeshes.length > 0) {
            //     lineMeshes.forEach(line => line.dispose());
            // }
            // 清理metadata
            delete mesh.metadata.originalMaterial;
            delete mesh.metadata.originalVisibility;
            delete mesh.metadata.isHighlighted;
        }
    });
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