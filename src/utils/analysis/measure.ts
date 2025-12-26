import * as BABYLON from "@babylonjs/core";
import { EffectManager } from "../../services/scene-effect";

// 常量定义
const LINE_COLOR = new BABYLON.Color3(1.0, 0.5, 0);
const TEMP_LINE_COLOR = new BABYLON.Color3(1.0, 0.5, 0);

export class Measure {
    private markSize: number;
    private points: BABYLON.Vector3[];
    private pointMarkers: BABYLON.Mesh[];
    public lineDistance: number;
    public area: number;
    public angle: number;
    private scene: BABYLON.Scene;
    private measureType: 'distance' | 'area' | 'angle' | 'coordinate';
    private areaPoints: BABYLON.Vector3[];
    private areaLines: BABYLON.Mesh[];
    private areaMarkers: BABYLON.Mesh[];
    private areaMeasurementActive: boolean;
    private coordinateMarker?: BABYLON.Mesh;
    private coordinatePoint: BABYLON.Vector3 | null;
    private _pointerObservable: BABYLON.Nullable<BABYLON.Observer<BABYLON.PointerInfo>>;
    private tempLine?: BABYLON.Mesh;
    private line?: BABYLON.Mesh;
    private effectManager: any;
    private lastUpdateTime: number = 0;
    private updateThrottle: number = 16; // 约60fps的更新频率

    constructor(scene: BABYLON.Scene, type: 'distance' | 'area' | 'angle' | 'coordinate', markSize?: number) {
        this.markSize = markSize || 1; // 默认标记点大小
        this.points = [];
        this.pointMarkers = [];
        this.lineDistance = 0;
        this.area = 0;
        this.angle = 0;
        this.scene = scene;
        this.measureType = type;
        this.areaPoints = []; // 存储面积测量的所有点
        this.areaLines = []; // 存储面积测量的线条（只显示边界）
        this.areaMarkers = []; // 存储面积测量的标记点
        this.areaMeasurementActive = false; // 标记是否正在进行面积测量
        this.coordinateMarker = undefined;
        this.coordinatePoint = null;
        this._pointerObservable = null;
        this.addObserver();
        this.effectManager = EffectManager.getInstance(scene);
    }

    // 创建 Tube
    private createTube(name: string, points: BABYLON.Vector3[], color: BABYLON.Color3, updatable: boolean = false): BABYLON.Mesh {
        const tube = BABYLON.MeshBuilder.CreateTube(name, {
            path: points,
            radius: this.markSize * 0.3,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            updatable: updatable
        }, this.scene);

        tube.isPickable = false;
        tube.renderingGroupId = 1;

        // 创建材质
        BABYLON.Effect.ShadersStore["customVertexShader"] = `
            precision highp float;

            attribute vec3 position;
            attribute vec2 uv;

            uniform mat4 worldViewProjection;

            varying vec2 vUV;
            void main() {
                vUV = uv;
                gl_Position = worldViewProjection * vec4( position, 1.0);

            }`;

        BABYLON.Effect.ShadersStore["customFragmentShader"] = `
            varying vec2 vUV;

            void main() {
                vec3 bgColor = vec3(1.0, 1.0, 1.0);  // 白色背景
                vec3 stripeColor = vec3(1.0, 0.5, 0.0); // 橙色条纹
                vec3 pixel = bgColor;
                
                // 创建白橙白橙白...的条纹效果
                float stripeWidth = 0.06;  // 每条条纹的宽度
                float stripePattern = mod(vUV.y, stripeWidth * 2.0);
                
                // 如果在橙色条纹区域内，则使用橙色
                if (stripePattern < stripeWidth) {
                    pixel = stripeColor;
                }
                
                // 确保第一行和最后一行都是橙色
                if (vUV.y < stripeWidth || vUV.y > 1.0 - stripeWidth) {
                    pixel = stripeColor;
                }
                
                gl_FragColor = vec4(pixel, 1.0);
            }`;

        var shaderMaterial = new BABYLON.ShaderMaterial("shader", this.scene, {
            vertex: "custom",
            fragment: "custom",
        },
            {
                attributes: ["position", "normal", "uv"],
                uniforms: ["worldViewProjection", "view", "projection"]
            });

        shaderMaterial.backFaceCulling = false;
        tube.material = shaderMaterial;

        this.effectManager.simpleTarget.renderList.push(tube);
        this.effectManager?.simpleTarget.setMaterialForRendering(tube, tube.material);

        return tube;
    }

    // 更新 Tube 的路径
    private updateTubePath(tube: BABYLON.Mesh, startPoint: BABYLON.Vector3, endPoint: BABYLON.Vector3): void {
        const newPath = [startPoint, endPoint];
        BABYLON.MeshBuilder.CreateTube(tube.name, {
            path: newPath,
            radius: this.markSize * 0.3,
            instance: tube
        });
    }

    // 绘制测量线
    private createMeasureLine(point: BABYLON.Vector3): void {
        this.points.push(point.clone());
        if (this.pointMarkers.length === 2) {
            this.pointMarkers.forEach(marker => marker.dispose(true));
            this.pointMarkers = [];
        }
        this.createMarker(point);
        if (this.line) {
            this.line.dispose(true);
            this.line = undefined;
        }
        if (this.points.length === 2) {
            this.tempLine?.dispose(true);
            this.tempLine = undefined;
            this.lineDistance = BABYLON.Vector3.Distance(this.points[0], this.points[1]);
            this.line = this.createTube('measureLine', this.points, LINE_COLOR);
            this.points = [];
        }
    }

    private createMeasureLineToMouse(point: BABYLON.Vector3): void {
        // 节流控制，避免过于频繁的更新
        const currentTime = Date.now();
        if (currentTime - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = currentTime;

        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            BABYLON.Matrix.Identity(),
            this.scene.activeCamera
        );

        // 优化：只检测modelMesh层级，忽略其他mesh
        const pickResult = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.parent?.name === "modelMesh";
        }, true);

        if (pickResult?.hit && pickResult.pickedPoint && pickResult.pickedMesh) {
            if (pickResult.pickedMesh.parent?.name === "modelMesh") {
                // 如果临时 Tube 不存在，则创建一个可更新的
                if (!this.tempLine) {
                    this.tempLine = this.createTube('tempLine', [point, pickResult.pickedPoint], TEMP_LINE_COLOR, true);
                } else {
                    // 更新现有 Tube 的路径
                    this.updateTubePath(this.tempLine, point, pickResult.pickedPoint);
                }

                if (this.measureType === 'distance') {
                    this.lineDistance = BABYLON.Vector3.Distance(point, pickResult.pickedPoint);
                }

                if (this.measureType === 'angle' && this.points.length === 2) {
                    const pointA = this.points[0];
                    const pointB = this.points[1];
                    const pointC = pickResult.pickedPoint;
                    const vectorBA = pointA.subtract(pointB);
                    const vectorBC = pointC.subtract(pointB);
                    const dotProduct = BABYLON.Vector3.Dot(vectorBA.normalize(), vectorBC.normalize());
                    const radians = Math.acos(dotProduct);
                    this.angle = BABYLON.Angle.FromRadians(radians).degrees();
                }
            }
        }
    }

    // 开始新的面积测量（清除上一次的数据）
    private startNewAreaMeasurement(): void {
        // 无论当前状态如何，都清除之前的数据
        this.clearPreviousAreaMeasurement();
        this.areaMeasurementActive = true;
        console.log('Started new area measurement');
    }

    // 清除所有临时线条
    private clearTempLines(): void {
        // 清除主要的临时线条
        this.tempLine?.dispose(true);
        this.tempLine = undefined;

        // 清除所有可能的临时线条名称
        const tempLineNames = ['tempLine', 'tempLine_toMouse', 'tempLine_mouseToFirst'];

        tempLineNames.forEach(name => {
            const mesh = this.scene.getMeshByName(name);
            if (mesh) {
                mesh.dispose(true);
            }
        });
    }


    // 清除上一次面积测量的数据
    private clearPreviousAreaMeasurement(): void {
        // 清除面积线条
        this.areaLines.forEach(line => line.dispose(true));
        this.areaLines = [];

        // 清除面积标记点
        this.areaMarkers.forEach(marker => marker.dispose(true));
        this.areaMarkers = [];

        // 清除所有临时线条
        this.clearTempLines();

        // 重置数据
        this.areaPoints = [];
        this.area = 0;

        console.log('Cleared previous area measurement data');
    }

    // 改进的面积测量：支持多个点，立即计算和显示面积
    private createAreaFromMultiplePoints(point: BABYLON.Vector3): void {
        // 如果面积测量未激活（说明是新的一轮测量或者刚完成上一轮），开始新的面积测量
        if (!this.areaMeasurementActive) {
            this.startNewAreaMeasurement();
        }

        this.areaPoints.push(point.clone());
        this.createAreaMarker(point);

        const pointCount = this.areaPoints.length;

        // 从第3个点开始，立即计算并显示面积
        if (pointCount >= 3) {
            this.calculateTotalArea();
            this.updateAreaBoundaryLines();
        } else if (pointCount === 2) {
            // 只有两个点时，绘制一条连线
            this.updateAreaBoundaryLines();
        }
    }

    // 更新面积边界线条（只显示多边形的边，不显示内部分割线）
    private updateAreaBoundaryLines(): void {
        // 清除所有现有线条
        this.areaLines.forEach(line => line.dispose(true));
        this.areaLines = [];

        if (this.areaPoints.length < 2) return;

        // 为每条边单独创建 Tube
        for (let i = 0; i < this.areaPoints.length; i++) {
            const startPoint = this.areaPoints[i];
            const endPoint = (i === this.areaPoints.length - 1) ? this.areaPoints[0] : this.areaPoints[i + 1];
            const boundaryLine = this.createTube(`areaBoundary_${i}`, [startPoint, endPoint], LINE_COLOR);
            this.areaLines.push(boundaryLine);
        }
    }


    // 计算总面积（使用三角形分割法）
    private calculateTotalArea(): void {
        if (this.areaPoints.length < 3) {
            this.area = 0;
            return;
        }

        let totalArea = 0;

        // 使用第一个点作为基准点，将多边形分割成三角形
        for (let i = 2; i < this.areaPoints.length; i++) {
            const p1 = this.areaPoints[0];
            const p2 = this.areaPoints[i - 1];
            const p3 = this.areaPoints[i];

            const v1 = p2.subtract(p1);
            const v2 = p3.subtract(p1);
            const cross = BABYLON.Vector3.Cross(v1, v2);
            const triangleArea = cross.length() / 2;
            totalArea += triangleArea;
        }

        this.area = totalArea;
        console.log(`Total area after ${this.areaPoints.length} points:`, this.area);
    }

    // 面积测量时的鼠标跟随线
    private createAreaLineToMouse(): void {
        if (this.areaPoints.length === 0) return;

        // 节流控制
        const currentTime = Date.now();
        if (currentTime - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = currentTime;

        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            BABYLON.Matrix.Identity(),
            this.scene.activeCamera
        );

        // 优化：只检测modelMesh层级，忽略其他mesh
        const pickResult = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.parent?.name === "modelMesh";
        }, true);

        if (pickResult?.hit && pickResult.pickedPoint && pickResult.pickedMesh) {
            if (pickResult.pickedMesh.parent?.name === "modelMesh") {
                const lastPoint = this.areaPoints[this.areaPoints.length - 1];

                if (this.areaPoints.length === 1) {
                    // 第一个点到鼠标的线
                    if (!this.tempLine) {
                        this.tempLine = this.createTube('tempLine', [this.areaPoints[0], pickResult.pickedPoint], TEMP_LINE_COLOR, true);
                    } else {
                        this.updateTubePath(this.tempLine, this.areaPoints[0], pickResult.pickedPoint);
                    }
                } else {
                    // 创建两条独立的 Tube：最后一个点到鼠标的线，以及鼠标到第一个点的线（预览封闭图形）
                    // 获取或创建最后一点到鼠标位置的线
                    let lineToMouse = this.scene.getMeshByName('tempLine_toMouse') as BABYLON.Mesh;
                    if (!lineToMouse) {
                        lineToMouse = this.createTube('tempLine_toMouse', [lastPoint, pickResult.pickedPoint], TEMP_LINE_COLOR, true);
                    } else {
                        this.updateTubePath(lineToMouse, lastPoint, pickResult.pickedPoint);
                    }

                    // 获取或创建鼠标位置到第一点的线
                    let mouseToFirstLine = this.scene.getMeshByName('tempLine_mouseToFirst') as BABYLON.Mesh;
                    if (!mouseToFirstLine) {
                        mouseToFirstLine = this.createTube('tempLine_mouseToFirst', [pickResult.pickedPoint, this.areaPoints[0]], TEMP_LINE_COLOR, true);
                    } else {
                        this.updateTubePath(mouseToFirstLine, pickResult.pickedPoint, this.areaPoints[0]);
                    }

                    // 保存临时线条引用，用于后续清理
                    this.tempLine = lineToMouse;
                }
            }
        }
    }

    // 完成面积测量（双击触发）
    private finishAreaMeasurement(): void {
        if (this.areaPoints.length >= 3) {
            // 清除临时线条
            this.tempLine?.dispose(true);
            this.tempLine = undefined;

            // 计算最终面积
            this.calculateTotalArea();

            // 标记面积测量完成
            this.areaMeasurementActive = false;
            this.clearTempLines()

            console.log(`Final area measurement completed: ${this.area}`);
            console.log(`Area measurement finished with ${this.areaPoints.length} points`);
        } else {
            console.log('Area measurement requires at least 3 points');
        }
    }

    // 重置当前面积测量
    public resetAreaMeasurement(): void {
        this.clearPreviousAreaMeasurement();
        this.areaMeasurementActive = false;
        console.log('Area measurement reset');
    }


    private createMeasureAngleLine(point: BABYLON.Vector3): void {
        this.points.push(point.clone());
        if (this.points.length === 4) {
            const meshes = this.scene.meshes.filter(mesh => mesh.name === "measureLine");
            meshes.forEach(mesh => mesh.dispose());
            this.points = [];
            this.points.push(point.clone());
            this.pointMarkers.forEach(marker => marker.dispose());
            this.pointMarkers = [];
        }
        this.createMarker(point);
        if (this.points.length === 2) {
            this.tempLine?.dispose(true);
            this.tempLine = undefined;
            this.line = this.createTube('measureLine', this.points, LINE_COLOR);
        }
        if (this.points.length === 3) {
            this.tempLine?.dispose(true);
            this.tempLine = undefined;
            this.line = this.createTube('measureLine', [this.points[1], this.points[2]], LINE_COLOR);

            const pointA = this.points[0];
            const pointB = this.points[1];
            const pointC = this.points[2];
            const vectorBA = pointA.subtract(pointB);
            const vectorBC = pointC.subtract(pointB);
            const dotProduct = BABYLON.Vector3.Dot(vectorBA.normalize(), vectorBC.normalize());
            const radians = Math.acos(dotProduct);
            this.angle = BABYLON.Angle.FromRadians(radians).degrees();
        }
    }
    // 修改事件监听
    private addObserver(): void {
        this._pointerObservable = this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERTAP:
                    if (this.measureType === 'distance' && pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedPoint) {
                        this.createMeasureLine(pointerInfo.pickInfo.pickedPoint);
                    }
                    // 修改面积测量逻辑
                    if (this.measureType === 'area' && pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedPoint) {
                        this.createAreaFromMultiplePoints(pointerInfo.pickInfo.pickedPoint);
                    }
                    if (this.measureType === 'angle' && pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedPoint) {
                        this.createMeasureAngleLine(pointerInfo.pickInfo.pickedPoint);
                    }
                    // 坐标测量逻辑
                    if (this.measureType === 'coordinate' && pointerInfo.pickInfo && pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh && pointerInfo.pickInfo.pickedPoint) {
                        this.createCoordinateMarker(pointerInfo.pickInfo.pickedPoint);
                    }
                    // 单击鼠标右键完成面积测量
                    if (pointerInfo.event.button === 2) {
                        if (this.measureType === 'area' && this.areaMeasurementActive) {
                            this.finishAreaMeasurement();
                        }
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if (this.points.length === 1 && (this.measureType === 'distance' || this.measureType === 'angle')) {
                        this.createMeasureLineToMouse(this.points[0]);
                    }
                    if (this.measureType === 'angle' && this.points.length === 2) {
                        this.createMeasureLineToMouse(this.points[1]);
                    }
                    // 修改面积测量的鼠标跟随
                    if (this.measureType === 'area' && this.areaPoints.length > 0 && this.areaMeasurementActive) {
                        this.createAreaLineToMouse();
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERDOUBLETAP:
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    break;
            }
        });
    }

    // 创建面积测量的标记点
    private createAreaMarker(point: BABYLON.Vector3): void {
        const marker = BABYLON.MeshBuilder.CreateSphere("areaPointMarker", {
            diameter: this.markSize,
            segments: 32
        }, this.scene);
        marker.isPickable = false;
        marker.position = point.clone();
        marker.renderingGroupId = 1;
        const material = new BABYLON.StandardMaterial("areaMarkerMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.emissiveColor = material.diffuseColor.scale(0.3);
        marker.material = material;
        this.areaMarkers.push(marker);
        this.effectManager.simpleTarget.renderList.push(marker);
        this.effectManager?.simpleTarget.setMaterialForRendering(marker, marker.material);
    }

    // 创建坐标标记点
    private createCoordinateMarker(point: BABYLON.Vector3): void {
        // 清除之前的坐标标记点
        this.coordinateMarker?.dispose();
        this.coordinateMarker = undefined;

        // 创建新的标记点
        this.coordinateMarker = BABYLON.MeshBuilder.CreateSphere("coordinateMarker", {
            diameter: this.markSize,
            segments: 32
        }, this.scene);

        this.coordinateMarker.isPickable = false;
        this.coordinateMarker.position = point.clone();
        this.coordinateMarker.renderingGroupId = 1;

        const material = new BABYLON.StandardMaterial("coordinateMarkerMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.emissiveColor = material.diffuseColor.scale(0.3);
        this.coordinateMarker.material = material;

        this.coordinatePoint = point.clone();

        // 添加到渲染列表
        this.effectManager.simpleTarget.renderList.push(this.coordinateMarker);
        this.effectManager?.simpleTarget.setMaterialForRendering(this.coordinateMarker, this.coordinateMarker.material);
    }

    // 创建标记点（用于距离和角度测量）
    private createMarker(point: BABYLON.Vector3): void {
        const marker = BABYLON.MeshBuilder.CreateSphere("pointMarker", {
            diameter: this.markSize,
            segments: 32
        }, this.scene);
        marker.isPickable = false; // 标记点不参与拾取
        marker.position = point.clone();
        marker.renderingGroupId = 1;
        const material = new BABYLON.StandardMaterial("markerMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.emissiveColor = material.diffuseColor.scale(0.3);
        marker.material = material;
        this.pointMarkers.push(marker);
        this.effectManager.simpleTarget.renderList.push(marker);
        this.effectManager?.simpleTarget.setMaterialForRendering(marker, marker.material);
    }

    // 获取测量结果的公共方法
    public getLineDistance(): number {
        return this.lineDistance;
    }

    public getArea(): number {
        return this.area;
    }

    public getAngle(): number {
        return this.angle;
    }


    public isAreaMeasurementActive(): boolean {
        return this.areaMeasurementActive;
    }

    public getAreaPointsCount(): number {
        return this.areaPoints.length;
    }

    public getCoordinatePoint(): BABYLON.Vector3 | null {
        return this.coordinatePoint;
    }

    public getMeasureType(): 'distance' | 'area' | 'angle' | 'coordinate' {
        return this.measureType;
    }

    public destroy(): void {
        this._pointerObservable?.remove();
        this._pointerObservable = null;

        this.tempLine?.dispose(true);
        this.tempLine = undefined;

        this.line?.dispose(true);
        this.line = undefined;

        // 清除所有面积测量数据
        this.clearPreviousAreaMeasurement();

        // 清除坐标测量数据
        this.coordinateMarker?.dispose(true);
        this.coordinateMarker = undefined;
        this.coordinatePoint = null;

        this.pointMarkers.forEach(marker => marker.dispose(true));
        this.pointMarkers = [];

        // 清理其他资源
        this.points = [];
        this.areaPoints = [];
    }
}