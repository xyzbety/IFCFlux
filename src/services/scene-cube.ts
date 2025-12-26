import * as BABYLON from '@babylonjs/core'
import { SceneManager } from './scene-manager';

export class CubeView {
  private scene: BABYLON.Scene;
  private cubeElement: any;
  private camera?: BABYLON.ArcRotateCamera;
  private lastAlpha: number = 0;
  private lastBeta: number = 0;
  private sceneManager = SceneManager.getInstance();

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.camera = this.scene.activeCamera as BABYLON.ArcRotateCamera;
    this.cubeElement = document.querySelector('.cube');

    if (this.cubeElement) {
      this.cubeElement.addEventListener('select', this.handleCubeSelect);
    }

    this.scene.onBeforeRenderObservable.add(this.handleBeforeRender);
  }

  private handleCubeSelect = (e: any) => {
    console.log('Cube select event:', e);
    const { heading, tilt } = e.detail?.item;
    if (this.camera && typeof heading === 'number' && typeof tilt === 'number') {
      this.rotateCamera(this.camera, heading, tilt);
      this.sceneManager.getCameraHistoryManager().recordCurrentState(this.camera);
    }
  }

  private handleBeforeRender = () => {
    if (!this.camera || !this.cubeElement) {
      return;
    }
    if (this.camera.alpha !== this.lastAlpha || this.camera.beta !== this.lastBeta) {
      // 将弧度转换为角度
      const rotateY = this.camera.alpha * 180 / Math.PI - 90;
      const rotateX = this.camera.beta * 180 / Math.PI - 90;

      // 正确解析当前transform中的rotate值
      let currentRotateX = 0;
      let currentRotateY = 0;
      const transform = this.cubeElement.style.transform;
      if (transform) {
        const rotateXMatch = transform.match(/rotateX\(([^)]+)deg\)/);
        const rotateYMatch = transform.match(/rotateY\(([^)]+)deg\)/);
        currentRotateX = rotateXMatch ? parseFloat(rotateXMatch[1]) : 0;
        currentRotateY = rotateYMatch ? parseFloat(rotateYMatch[1]) : 0;
      }

      // 计算新的旋转角度，确保平滑过渡
      let newRotateY = rotateY;
      let newRotateX = rotateX;

      // 处理Y轴旋转，避免不必要的大角度旋转
      while (newRotateY - currentRotateY > 180) newRotateY -= 360;
      while (newRotateY - currentRotateY < -180) newRotateY += 360;

      // 处理X轴旋转，避免不必要的大角度旋转
      while (newRotateX - currentRotateX > 180) newRotateX -= 360;
      while (newRotateX - currentRotateX < -180) newRotateX += 360;

      const rotationUpdateEvent = new CustomEvent('camera-rotation-change', {
        detail: { rotateX, rotateY, alpha: this.camera.alpha, beta: this.camera.beta },
        bubbles: true
      });
      this.cubeElement.dispatchEvent(rotationUpdateEvent);

      // 更新缓存值
      this.lastAlpha = this.camera.alpha;
      this.lastBeta = this.camera.beta;
    }
  }

  private rotateCamera(camera: BABYLON.ArcRotateCamera, heading: number, tilt: number): void {
    // 将角度转换为弧度
    const alpha = (heading + 90) * Math.PI / 180;
    const beta = tilt * Math.PI / 180;

    camera.alpha = alpha;
    camera.beta = beta;
  }
}