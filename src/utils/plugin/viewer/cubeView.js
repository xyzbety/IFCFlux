export class CubeView {
    constructor(scene) {
        this.lastAlpha = 0;
        this.lastBeta = 0;
        this.scene = scene;
        this.camera = this.scene.activeCamera;
        ;
        this.cubeElement = this.createCubeElement();
        this.cubeElement.addEventListener('select', (e) => {
            console.log('e', e);
            const { heading, tilt } = e.detail?.item;
            this.rotateCamera(this.camera, heading, tilt);
        });
        // 注册渲染循环监听
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.camera &&
                (this.camera.alpha !== this.lastAlpha ||
                    this.camera.beta !== this.lastBeta)) {
                // 将弧度转换为角度（注意Y轴方向可能需要取反）  
                const rotateY = this.camera.alpha * 180 / Math.PI - 90;
                const rotateX = this.camera.beta * 180 / Math.PI;
                // 应用旋转角度到cube元素
                this.cubeElement.rotateY = rotateY - this.cubeElement.rotateY > 180 ? rotateY - 360 : rotateY;
                this.cubeElement.rotateX = rotateX - 90;
                // 更新缓存值
                this.lastAlpha = this.camera.alpha;
                this.lastBeta = this.camera.beta;
            }
        });
    }
    rotateCamera(camera, heading, tilt) {
        // 获取场景中模型的包围盒
        const rootMesh = this.scene.meshes[0];
        const { min, max } = rootMesh.getHierarchyBoundingVectors();
        const size = max.subtract(min);
        // 使用最大边长的1.5倍作为安全半径
        const radius = Math.max(size.x, size.y, size.z) * 1.5;
        const distance = radius * 2;
        // 将角度转换为弧度
        const alpha = (heading + 90) * Math.PI / 180;
        const beta = (tilt) * Math.PI / 180;
        camera.radius = distance;
        camera.alpha = alpha;
        camera.beta = beta;
    }
    createCubeElement() {
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
    `; // 修正后的样式
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
