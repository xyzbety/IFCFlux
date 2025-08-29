import * as BABYLON from '@babylonjs/core'
import { Scene, SceneInterface } from '@khanonjs/engine'

import { SceneCamera } from '../utils/camera'


@Scene({
  configuration: {
    clearColor: new BABYLON.Color4(1.0, 0.0, 1.0, 1.0)
  },
  meshes: [
  ],
})
export class SceneMonsters extends SceneInterface {
  private mainlight?: BABYLON.DirectionalLight
  private fillLight?: BABYLON.DirectionalLight
  private skybox?: BABYLON.Mesh


  onStart() {
    this.switchCamera(SceneCamera, {})
    // 启用调试层
    // this.babylon.scene.debugLayer.show({
    //   showExplorer: true,
    //   showInspector: true
    // });

    // 启用后期处理链以支持高级光照特性
    this.babylon.scene.enableDepthRenderer();
    // 设置右手坐标系
    this.babylon.scene.useRightHandedSystem = true;
    // 启用物理渲染
    this.babylon.scene.autoClear = false;

    // 启用深度渲染
    this.babylon.scene.enableDepthRenderer();

    // 创建两个半球光实现全局光照
    // 主光（较强，模拟太阳光）
    this.mainlight = new BABYLON.DirectionalLight(
      "mainLight",
      new BABYLON.Vector3(-1, -1, -1), // 方向：左上后方
      this.babylon.scene
    );
    this.mainlight.intensity = 0.5; // 主光强度
    this.mainlight.shadowEnabled = true
    this.fillLight = new BABYLON.DirectionalLight(
      'fillLight',
      new BABYLON.Vector3(1, -0.5, 0.5),
      this.babylon.scene
    );
    this.fillLight.intensity = 0.75;

    // this.mainlight.direction.normalize();
    // this.fillLight.direction.normalize();
    const ambientLight = new BABYLON.HemisphericLight(
      "ambientLight",
      new BABYLON.Vector3(0, 1, 0), // 上方照射
      this.babylon.scene
    );
    ambientLight.intensity = 0.1; // 弱环境光
    const bottomLight = new BABYLON.HemisphericLight(
      "bottomLight",
      new BABYLON.Vector3(0, -1, 0), // 正上方照射
      this.babylon.scene
    );
    bottomLight.intensity = 0.5;
  }

  async onLoaded(): void {

    let isDragging = false;

    // 监听鼠标点击事件
    this.babylon.scene.onPointerObservable.add((pointerInfo: BABYLON.PointerInfo) => {
      let camera = this.babylon.scene.activeCamera as BABYLON.ArcRotateCamera;
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
        console.log('点击的物体：', pointerInfo.pickInfo);
        if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh) {
          // 确保所有父级可见
          let parent = pointerInfo.pickInfo.pickedMesh.parent;
          while (parent) {
            parent.isVisible = true;
            parent = parent.parent;
          }
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: {
              expressID: pointerInfo.pickInfo.pickedMesh.name, // 假设 mesh.name 存储了 expressID
              mesh: pointerInfo.pickInfo.pickedMesh,
              point: pointerInfo.pickInfo.pickedPoint
            }
          }));
          console.log('pointerInfo.pickInfo.pickedMesh', pointerInfo.pickInfo.pickedMesh)
        }
        else {
          console.log('没有点击到任何物体');
          window.dispatchEvent(new CustomEvent('mesh-clicked', {
            detail: {
              expressID: '', // 假设 mesh.id 存储了 expressID
              mesh: '',
              point: ''
            }
          }));
        }
      }
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERDOWN:
          // console.log('鼠标按下', camera);
          window.dispatchEvent(new CustomEvent('mouse-down', {
            detail: {
              alpha: camera.alpha,
              beta: camera.beta,
              radius: camera.radius,
              target: camera.target,
            }
          }));
          isDragging = true;
          break;

        case BABYLON.PointerEventTypes.POINTERUP:
          // console.log('鼠标抬起');
          window.dispatchEvent(new CustomEvent('mouse-up', {
            detail: {
              alpha: camera.alpha,
              beta: camera.beta,
              radius: camera.radius,
              target: camera.target,
            }
          }));
          isDragging = false;
          break;

        case BABYLON.PointerEventTypes.POINTERMOVE:
          if (isDragging) {
            // console.log('鼠标拖动中');
            // 这里可以添加拖动时的相机控制逻辑
          }
          break;

        case BABYLON.PointerEventTypes.POINTERWHEEL:
          // console.log('鼠标滚轮事件', pointerInfo.event);
          window.dispatchEvent(new CustomEvent('mouse-wheel', {
            detail: {
              alpha: camera.alpha,
              beta: camera.beta,
              radius: camera.radius,
              target: camera.target,
            }
          }));
      }
    })

  }
  onUnload(): void {
    // 释放自定义创建的资源
    // 销毁半球光源对象，释放相关GPU资源
    this.light?.dispose()
    // 销毁天空盒网格对象，移除场景中的天空盒
    this.skybox?.dispose()
    // 解除对象引用，帮助垃圾回收
    this.light = undefined
    this.skybox = undefined
  }
}
