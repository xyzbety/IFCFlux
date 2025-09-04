import * as BABYLON from '@babylonjs/core'


export class CubeView {
  private scene: BABYLON.Scene;
  private cubeElement: any;
  // 添加相机引用和旋转角度缓存
  private camera?: BABYLON.ArcRotateCamera;
  private lastAlpha: number = 0;
  private lastBeta: number = 0;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.camera = this.scene.activeCamera as BABYLON.ArcRotateCamera;;
    this.cubeElement = this.createCubeElement();

    this.cubeElement.addEventListener('select', (e: any) => {
      console.log('e', e)
      const { heading, tilt } = e.detail?.item
      this.rotateCamera(this.camera!, heading, tilt)

    })

    // 注册渲染循环监听
    this.scene.onBeforeRenderObservable.add(() => {
      if (this.camera &&
        (this.camera.alpha !== this.lastAlpha ||
          this.camera.beta !== this.lastBeta)) {

        // 将弧度转换为角度（注意Y轴方向可能需要取反）  
        const rotateY = this.camera.alpha * 180 / Math.PI - 90;
        const rotateX = this.camera.beta * 180 / Math.PI;

        // 应用旋转角度到cube元素
        this.cubeElement.rotateY = rotateY - this.cubeElement.rotateY > 180 ? rotateY - 360 : rotateY
        this.cubeElement.rotateX = rotateX - 90
        this.cubeElement.updateTransform() 

        // 更新缓存值
        this.lastAlpha = this.camera.alpha;
        this.lastBeta = this.camera.beta;
      }
    });
  }

  private rotateCamera(camera: BABYLON.ArcRotateCamera, heading: number, tilt: number) {

    // 将角度转换为弧度
    const alpha = (heading + 90) * Math.PI / 180;
    const beta = (tilt) * Math.PI / 180;

    camera.alpha = alpha;
    camera.beta = beta;

  }

  private createCubeElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget-ui';
    container.style.cssText = `
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        box-sizing: border-box;
    `;  // 修正后的样式
    container.innerHTML = `

     <div id="cube-view"
        style="pointer-events: auto; display: flex; position: absolute; top: 0px; right: 80px; flex-flow: column; align-items: center;">
      </div>

    `;
    const parent = document.getElementById('viewer');
    parent?.appendChild(container);

    const cube = document.createElement('m-cube');
    cube.setAttribute('data-node-ref', 'cubeNode');
    cube.style.cssText = 'position: absolute; z-index: 1000;';

    container.querySelector('#cube-view')?.appendChild(cube);
    return cube;
  }



}