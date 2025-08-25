import * as BABYLON from '@babylonjs/core'
import {
  Camera,
  CameraInterface
} from '@khanonjs/engine'

@Camera()
export class SceneCamera extends CameraInterface {
  onInitialize(scene: BABYLON.Scene): BABYLON.TargetCamera {
    // 创建弧形旋转相机（轨道相机）
    // 参数说明：
    // 'camera' - 相机名称
    // 0 - 初始水平旋转角度（alpha，弧度）
    // 0 - 初始垂直旋转角度（beta，弧度） 
    // 100 - 相机与目标的距离（半径）
    // new BABYLON.Vector3(0, 0, 0) - 相机环绕的目标点（场景原点）
    // scene - 所属场景对象
    const camera = new BABYLON.ArcRotateCamera('camera', 2 * Math.PI / 3,  Math.PI / 3, 150, new BABYLON.Vector3(0, 0, 0), scene)
    camera.inertia = 0
    camera.wheelDeltaPercentage = 0.05
    camera.panningInertia = 0;
    camera.panningSensibility = 20;

    return camera
  }
}
