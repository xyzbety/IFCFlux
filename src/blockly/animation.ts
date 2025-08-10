import * as BABYLON from '@babylonjs/core';
import { createAnimatable } from "../utils/ifc-api";
import { hexToRgb } from "../utils/ifc-api";
// animation.ts
import { useSceneStore } from "../store/index";

export async function setBgColor(color) {
    const store = useSceneStore();
    store.setSceneSettings({ backgroundColor: color });
    return Promise.resolve();
}

export async function showModel(scene, meshName) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) setMeshVisible(mesh, true);
    scene.render && scene.render();
    return Promise.resolve();
}
// animation.ts
export async function hideModel(scene, meshName) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    console.log('hideModel called', meshName, mesh);
    if (mesh) setMeshVisible(mesh, false);
    scene.render && scene.render();
    return Promise.resolve();
}
export async function disposeModel(scene, meshName) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    console.log('disposeModel called', meshName, mesh);
    if (mesh) setMeshDispose(mesh);
    scene.render && scene.render();
    return Promise.resolve();
}
export async function lightIntensity(scene, intensity) {
    const light = scene.getLightByName("fillLight") as BABYLON.DirectionalLight;
    light.intensity = intensity;
    scene.render && scene.render();
    return Promise.resolve();
}
export async function setFog(scene, color, FOG_MODE, fogDensity) {
    console.log('setFog called', hexToRgb(color), FOG_MODE, fogDensity);
    let fogMode;
    switch (FOG_MODE) {
        case "LINEAR":
            fogMode = BABYLON.Scene.FOGMODE_LINEAR;
            break;
        case "NONE":
            fogMode = BABYLON.Scene.FOGMODE_NONE;
            break;
        case "EXP":
            fogMode = BABYLON.Scene.FOGMODE_EXP;
            break;
        case "EXP2":
            fogMode = BABYLON.Scene.FOGMODE_EXP2;
            break;
        default:
            fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    }
    scene.fogMode = fogMode;
    scene.fogColor = new BABYLON.Color3(hexToRgb(color).r / 255, hexToRgb(color).g / 255, hexToRgb(color).b / 255);
    scene.fogDensity = fogDensity;
    scene.fogStart = 10;
    scene.fogEnd = 1000;
    // 确保启用雾效果
    scene.fogEnabled = true;
    console.log('Fog applied:', {
        mode: FOG_MODE,
        start: scene.fogStart,
        end: scene.fogEnd,
        density: scene.fogDensity
    });
    return Promise.resolve();
}
export async function setCameraAlpha(scene, alpha) {
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
    if (camera) {
        camera.alpha = alpha;
        console.log(`Camera alpha set to ${alpha}`);
    }
    return Promise.resolve();
}
export async function setCameraBeta(scene, beta) {
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
    if (camera) {
        camera.beta = beta;
        console.log(`Camera beta set to ${beta}`);
    }
    return Promise.resolve();
}
export async function setCameraInertia(scene, inertia) {
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;
    if (camera) {
        camera.inertia = inertia;
        console.log(`Camera inertia set to ${inertia}`);
    }
    return Promise.resolve();
}
export async function cameraFollow(scene, meshName, radius, duration = 2) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;

    console.log('radius:', radius);
    console.log('cameraFollow called', mesh, camera);

    if (mesh && camera) {
        // 获取目标位置
        const meshPosition = mesh.getAbsolutePosition();

        // 当前相机状态
        const currentTarget = camera.getTarget().clone();
        const currentRadius = camera.radius;

        // 目标相机状态
        const targetRadius = parseFloat(radius) || 7;

        // 创建动画Promise数组
        const animations = [];

        // 1. 相机目标位置动画
        const targetAnimation = new Promise(resolve => {
            const anim = BABYLON.Animation.CreateAndStartAnimation(
                "cameraTargetAnim",
                camera,
                "target",
                60, // fps
                Math.round(duration * 60), // 总帧数
                currentTarget,
                meshPosition,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase(), // 缓动函数
                resolve
            );
            animatables.push(anim);
        });

        // 2. 相机半径动画
        const radiusAnimation = new Promise(resolve => {
            const anim = BABYLON.Animation.CreateAndStartAnimation(
                "cameraRadiusAnim",
                camera,
                "radius",
                60,
                Math.round(duration * 60),
                currentRadius,
                targetRadius,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
                new BABYLON.CubicEase(),
                resolve
            );
            animatables.push(anim);
        });

        animations.push(targetAnimation, radiusAnimation);

        // 等待所有动画完成
        await Promise.all(animations);

        console.log(`Camera smoothly moved to follow ${meshName} at radius ${radius}`);
    }

    scene.render && scene.render();
    return Promise.resolve();
}
export async function moveByXYZ(scene, meshName, { x, y, z }, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        const to = mesh.position.add(new BABYLON.Vector3(x, y, z));
        return new Promise(resolve => {
            createAnimatable(mesh, "position", { to, duration });
            const anim = mesh.getScene().beginAnimation(mesh, 0, Math.round(duration * 60), false, 1.0, resolve);
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function moveToXYZ(scene, meshName, { x, y, z }, useY, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        let to;
        if (useY) {
            to = new BABYLON.Vector3(x, y, z);
        } else {
            to = new BABYLON.Vector3(x, mesh.position.y, z);
        }
        return new Promise(resolve => {
            createAnimatable(mesh, "position", { to, duration });
            const anim = mesh.getScene().beginAnimation(mesh, 0, Math.round(duration * 60), false, 1.0, resolve);
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}
export async function rotateAnim(scene, meshName, { rotX, rotY, rotZ, duration, reverse, loop, easing }) {
    const mesh = scene.meshes.find((m: { name: any; }) => m.name === meshName);
    if (mesh) {
        createAnimatable(mesh, "rotation", { to: new BABYLON.Vector3(rotX, rotY, rotZ), duration, reverse, loop, easingType: easing });
        return new Promise(resolve => {
            const frameCount = Math.max(1, Math.round(duration * 60));
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                reverse ? frameCount * 2 : frameCount,
                !!loop,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}
export async function moveAnim(scene, meshName, { rotX, rotY, rotZ, duration, reverse, loop, easing }) {
    const mesh = scene.meshes.find((m: { name: any; }) => m.name === meshName);
    if (mesh) {
        createAnimatable(mesh, "position", { to: new BABYLON.Vector3(rotX, rotY, rotZ), duration, reverse, loop, easingType: easing });
        return new Promise(resolve => {
            const frameCount = Math.max(1, Math.round(duration * 60));
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                reverse ? frameCount * 2 : frameCount,
                !!loop,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function moveToModel(scene, model1, model2, useY, duration = 3) {
    const mesh1 = scene.meshes.find(m => m.name === model1);
    const mesh2 = scene.meshes.find(m => m.name === model2);
    if (mesh1 && mesh2) {
        const centerLocal = mesh2.getBoundingInfo().boundingBox.center;
        const centerWorld = BABYLON.Vector3.TransformCoordinates(centerLocal, mesh2.getWorldMatrix());
        let to;
        if (useY) {
            to = centerWorld;
        } else {
            to = new BABYLON.Vector3(centerWorld.x, mesh1.position.y, centerWorld.z);
        }
        return new Promise(resolve => {
            createAnimatable(mesh1, "position", { to, duration });
            const anim = mesh1.getScene().beginAnimation(
                mesh1,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}
export async function rotateModelXYZ(scene, meshName, x, y, z, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        const to = mesh.rotation.add(new BABYLON.Vector3(x, y, z));
        return new Promise(resolve => {
            createAnimatable(mesh, "rotation", { to, duration });
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function rotateTo(scene, meshName, x, y, z, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        const to = new BABYLON.Vector3(x, y, z);
        return new Promise(resolve => {
            createAnimatable(mesh, "rotation", { to, duration });
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                () => {
                    console.log(`Set rotation of ${mesh.name} to (${x}, ${y}, ${z}) radians`);
                    resolve();
                }
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function lookAtModel(scene, model1, model2, useY, duration = 3) {
    const mesh1 = scene.meshes.find(m => m.name === model1);
    const mesh2 = scene.meshes.find(m => m.name === model2);
    if (mesh1 && mesh2) {
        let target = mesh2.position.clone();
        if (!useY) {
            target.y = mesh1.position.y;
        }
        // 计算目标朝向的旋转欧拉角
        const direction = target.subtract(mesh1.position).normalize();
        const targetYaw = Math.atan2(direction.x, direction.z);
        const targetPitch = Math.asin(direction.y);
        const to = new BABYLON.Vector3(targetPitch, targetYaw, mesh1.rotation.z);

        return new Promise(resolve => {
            createAnimatable(mesh1, "rotation", { to, duration });
            const anim = mesh1.getScene().beginAnimation(
                mesh1,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                () => {
                    console.log(`${mesh1.name} look at ${mesh2.name}, useY=${useY}`);
                    resolve();
                }
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}
export async function scaleModel(scene, meshName, x, y, z, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        const to = new BABYLON.Vector3(x, y, z);
        return new Promise(resolve => {
            createAnimatable(mesh, "scaling", { to, duration });
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function moveForward(scene, meshName, direction, speed, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh) {
        let moveVec = BABYLON.Vector3.Zero();
        if (direction === "forward") {
            moveVec = mesh.getDirection(new BABYLON.Vector3(0, 0, 1)).scale(speed);
        } else if (direction === "sideways") {
            moveVec = mesh.getDirection(new BABYLON.Vector3(1, 0, 0)).scale(speed);
        } else if (direction === "strafe") {
            moveVec = mesh.getDirection(new BABYLON.Vector3(-1, 0, 0)).scale(speed);
        }
        const to = mesh.position.add(moveVec);
        return new Promise((resolve) => {
            createAnimatable(mesh, "position", { to, duration });
            const anim = mesh.getScene().beginAnimation(
                mesh,
                0,
                Math.round(duration * 60),
                false,
                1.0,
                resolve
            );
            animatables.push(anim);
        });
    }
    return Promise.resolve();
}

export async function setPivot(scene, meshName, x, y, z, duration = 3) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (mesh && mesh.getPivotPoint && mesh.setPivotPoint) {
        const from = mesh.getPivotPoint();
        const to = new BABYLON.Vector3(x, y, z);

        // 创建动画
        const animation = new BABYLON.Animation(
            "pivotAnim",
            "pivotDummy", // 虚拟属性
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        const keys = [
            { frame: 0, value: from.clone() },
            { frame: Math.round(duration * 60), value: to.clone() }
        ];
        animation.setKeys(keys);

        // 用虚拟对象承载动画
        const dummy = { pivotDummy: from.clone() };
        scene.stopAnimation(dummy);
        const anim = scene.beginDirectAnimation(
            dummy,
            [animation],
            0,
            Math.round(duration * 60),
            false,
            1.0,
            () => {
                mesh.setPivotPoint(to);
                console.log(`Set pivot of ${mesh.name} to (${x}, ${y}, ${z})`);
            },
            undefined,
            (evt) => {
                // 每帧回调，实时设置 pivot
                mesh.setPivotPoint(dummy.pivotDummy);
            }
        );
        animatables.push(anim);
        return new Promise(resolve => setTimeout(resolve, duration * 1000));
    }
    return Promise.resolve();
}

export async function waitSeconds(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
export async function waitUntil(condition: () => boolean, checkInterval = 100) {
    return new Promise<void>(resolve => {
        function check() {
            if (condition()) {
                resolve();
            } else {
                setTimeout(check, checkInterval);
            }
        }
        check();
    });
}

export async function setAlpha(scene, meshName, alpha) {
    const mesh = scene.meshes.find(m => m.name === meshName);
    if (!mesh) return;
    if (mesh.material && mesh.material.diffuseColor) {
        mesh.material.alpha = alpha;
    } else {
        const material = new BABYLON.StandardMaterial("color", scene);
        material.alpha = alpha;
        mesh.material = material;
    }
    if (mesh.getChildren) {
        mesh.getChildren().forEach(mesh => {
            if (mesh.material && mesh.material.diffuseColor) {
                mesh.material.alpha = alpha;
            } else {
                const material = new BABYLON.StandardMaterial("color", scene);
                material.alpha = alpha;
                mesh.material = material;
            }
        });
    }
}
function setMeshVisible(mesh, visible) {
    mesh.isVisible = visible;
    if (mesh.getChildren) {
        mesh.getChildren().forEach(child => setMeshVisible(child, visible));
    }
}
function setMeshDispose(mesh) {
    mesh.dispose();
    if (mesh.getChildren) {
        mesh.getChildren().forEach(child => setMeshDispose(child));
    }
}
export const animatables: BABYLON.Animatable[] = [];