import * as BABYLON from "@babylonjs/core";
import { EffectManager } from "../../services/scene-effect";

export class Measure {
    private markSize: number;
    private points: BABYLON.Vector3[];
    private pointMarkers: BABYLON.Mesh[];
    public lineDistance: number;
    private lineColor: BABYLON.Color4;
    public area: number;
    public angle: number;
    private scene: BABYLON.Scene;
    private measureType: 'distance' | 'area' | 'angle';
    private areaPoints: BABYLON.Vector3[];
    private areaLines: BABYLON.LinesMesh[];
    private areaMarkers: BABYLON.Mesh[];
    private areaMeasurementActive: boolean;
    private _pointerObservable: BABYLON.Nullable<BABYLON.Observer<BABYLON.PointerInfo>>;
    private tempLine?: BABYLON.LinesMesh;
    private line?: BABYLON.LinesMesh;
    private effectManager: any;

    constructor(scene: BABYLON.Scene, type: 'distance' | 'area' | 'angle', markSize?: number) {
        this.markSize = markSize || 1; // 默认标记点大小
        this.points = [];
        this.pointMarkers = [];
        this.lineDistance = 0;
        this.lineColor = new BABYLON.Color4(1, 0, 0, 1);
        this.area = 0;
        this.angle = 0;
        this.scene = scene;
        this.measureType = type;
        this.areaPoints = []; // 存储面积测量的所有点
        this.areaLines = []; // 存储面积测量的线条（只显示边界）
        this.areaMarkers = []; // 存储面积测量的标记点
        this.areaMeasurementActive = false; // 标记是否正在进行面积测量
        this._pointerObservable = null;
        this.addObserver();
        this.effectManager = EffectManager.getInstance(scene);
    }

    public setLineColor(color: BABYLON.Color4): void {
        this.lineColor = color;
    }

    // 绘制测量线
    private createMeasureLine(point: BABYLON.Vector3): void {
        this.points.push(point.clone());
        if (this.pointMarkers.length === 2) {
            this.pointMarkers.forEach(marker => marker.dispose());
            this.pointMarkers = [];
        }
        this.createMarker(point);
        if (this.line) {
            this.line.dispose();
            this.line = undefined;
        }
        if (this.points.length === 2) {
            this.tempLine?.dispose();
            this.tempLine = undefined;
            this.lineDistance = BABYLON.Vector3.Distance(this.points[0], this.points[1]);
            this.line = BABYLON.MeshBuilder.CreateLines("measureLine", {
                points: this.points,
                colors: [this.lineColor, this.lineColor]
            }, this.scene);
            this.line.isPickable = false; // 测量线不参与拾取
            this.line.renderingGroupId = 1;
            this.points = [];
            this.effectManager.simpleTarget.renderList.push(this.line);
            this.effectManager?.simpleTarget.setMaterialForRendering(this.line, this.line.material);
        }
    }

    private createMeasureLineToMouse(point: BABYLON.Vector3): void {
        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            BABYLON.Matrix.Identity(),
            this.scene.activeCamera
        );
        const pickResult = this.scene.pickWithRay(ray);

        if (pickResult?.hit && pickResult.pickedPoint && pickResult.pickedMesh) {
            if (pickResult.pickedMesh.parent?.name === "modelMesh") {
                if (this.tempLine) {
                    this.tempLine.dispose();
                    this.tempLine = undefined;
                }
                this.tempLine = BABYLON.MeshBuilder.CreateLines("tempLine", {
                    points: [point, pickResult.pickedPoint],
                    colors: [this.lineColor, this.lineColor]
                }, this.scene);
                this.tempLine.isPickable = false;
                this.tempLine.renderingGroupId = 1;
                this.effectManager.simpleTarget.renderList.push(this.tempLine);
                this.effectManager?.simpleTarget.setMaterialForRendering(this.tempLine, this.tempLine.material);

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

    // 清除上一次面积测量的数据
    private clearPreviousAreaMeasurement(): void {
        // 清除面积线条
        this.areaLines.forEach(line => line.dispose());
        this.areaLines = [];

        // 清除面积标记点
        this.areaMarkers.forEach(marker => marker.dispose());
        this.areaMarkers = [];

        // 清除临时线条
        this.tempLine?.dispose();
        this.tempLine = undefined;

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
        this.areaLines.forEach(line => line.dispose());
        this.areaLines = [];

        if (this.areaPoints.length < 2) return;

        // 绘制多边形的边界线条
        const boundaryPoints = [...this.areaPoints];

        // 如果有3个或更多点，形成封闭多边形
        if (this.areaPoints.length >= 3) {
            boundaryPoints.push(this.areaPoints[0]); // 闭合多边形
        }

        // 创建边界线条
        const boundaryLine = BABYLON.MeshBuilder.CreateLines("areaBoundary", {
            points: boundaryPoints,
            colors: Array(boundaryPoints.length).fill(this.lineColor)
        }, this.scene);
        boundaryLine.isPickable = false; // 边界线条不参与拾取
        boundaryLine.renderingGroupId = 1;
        this.areaLines.push(boundaryLine);
        this.effectManager.simpleTarget.renderList.push(boundaryLine);
        this.effectManager?.simpleTarget.setMaterialForRendering(boundaryLine, boundaryLine.material);
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

        const ray = this.scene.createPickingRay(
            this.scene.pointerX,
            this.scene.pointerY,
            BABYLON.Matrix.Identity(),
            this.scene.activeCamera
        );
        const pickResult = this.scene.pickWithRay(ray);

        if (pickResult?.hit && pickResult.pickedPoint && pickResult.pickedMesh) {
            if (pickResult.pickedMesh.parent?.name === "modelMesh") {
                // 清除之前的鼠标跟随线
                this.tempLine?.dispose();
                this.tempLine = undefined;

                const lastPoint = this.areaPoints[this.areaPoints.length - 1];

                if (this.areaPoints.length === 1) {
                    // 第一个点到鼠标的线
                    this.tempLine = BABYLON.MeshBuilder.CreateLines("tempLine", {
                        points: [this.areaPoints[0], pickResult.pickedPoint],
                        colors: [this.lineColor, this.lineColor]
                    }, this.scene);
                    this.tempLine.isPickable = false; // 临时线条不参与拾取
                    this.tempLine.renderingGroupId = 1;
                    this.effectManager.simpleTarget.renderList.push(this.tempLine);
                    this.effectManager?.simpleTarget.setMaterialForRendering(this.tempLine, this.tempLine.material);
                } else {
                    // 最后一个点到鼠标的线，以及鼠标到第一个点的线（预览封闭图形）
                    const previewPoints = [
                        lastPoint,
                        pickResult.pickedPoint,
                        this.areaPoints[0]
                    ];
                    this.tempLine = BABYLON.MeshBuilder.CreateLines("tempLine", {
                        points: previewPoints,
                        colors: [this.lineColor, this.lineColor, this.lineColor]
                    }, this.scene);
                    this.tempLine.isPickable = false; // 临时线条不参与拾取
                    this.tempLine.renderingGroupId = 1;
                    this.effectManager.simpleTarget.renderList.push(this.tempLine);
                    this.effectManager?.simpleTarget.setMaterialForRendering(this.tempLine, this.tempLine.material);
                }
            }
        }
    }

    // 完成面积测量（双击触发）
    private finishAreaMeasurement(): void {
        if (this.areaPoints.length >= 3) {
            // 清除临时线条
            this.tempLine?.dispose();
            this.tempLine = undefined;

            // 计算最终面积
            this.calculateTotalArea();

            // 标记面积测量完成
            this.areaMeasurementActive = false;

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
            this.tempLine?.dispose();
            this.tempLine = undefined;
            this.line = BABYLON.MeshBuilder.CreateLines("measureLine", {
                points: this.points,
                colors: [this.lineColor, this.lineColor]
            }, this.scene);
            this.line.isPickable = false; // 角度测量线不参与拾取
            this.line.renderingGroupId = 1;
            this.effectManager.simpleTarget.renderList.push(this.line);
            this.effectManager?.simpleTarget.setMaterialForRendering(this.line, this.line.material);
        }
        if (this.points.length === 3) {
            this.tempLine?.dispose();
            this.tempLine = undefined;
            this.line = BABYLON.MeshBuilder.CreateLines("measureLine", {
                points: [this.points[1], this.points[2]],
                colors: [this.lineColor, this.lineColor]
            }, this.scene);
            this.line.isPickable = false; // 角度测量线不参与拾取
            const pointA = this.points[0];
            const pointB = this.points[1];
            const pointC = this.points[2];
            const vectorBA = pointA.subtract(pointB);
            const vectorBC = pointC.subtract(pointB);
            const dotProduct = BABYLON.Vector3.Dot(vectorBA.normalize(), vectorBC.normalize());
            const radians = Math.acos(dotProduct);
            this.angle = BABYLON.Angle.FromRadians(radians).degrees();
            this.line.renderingGroupId = 1;
            this.effectManager.simpleTarget.renderList.push(this.line);
            this.effectManager?.simpleTarget.setMaterialForRendering(this.line, this.line.material);
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
                    // 双击完成面积测量
                    if (this.measureType === 'area' && this.areaMeasurementActive) {
                        this.finishAreaMeasurement();
                    }
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
        material.diffuseColor = new BABYLON.Color3(this.lineColor.r, this.lineColor.g, this.lineColor.b);
        material.emissiveColor = material.diffuseColor.scale(0.3);
        marker.material = material;
        this.areaMarkers.push(marker);
        this.effectManager.simpleTarget.renderList.push(marker);
        this.effectManager?.simpleTarget.setMaterialForRendering(marker, marker.material);
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
        material.diffuseColor = new BABYLON.Color3(this.lineColor.r, this.lineColor.g, this.lineColor.b);
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

    public getMeasureType(): 'distance' | 'area' | 'angle' {
        return this.measureType;
    }

    public isAreaMeasurementActive(): boolean {
        return this.areaMeasurementActive;
    }

    public getAreaPointsCount(): number {
        return this.areaPoints.length;
    }

    public destroy(): void {
        this._pointerObservable?.remove();
        this._pointerObservable = null;

        this.tempLine?.dispose();
        this.tempLine = undefined;

        this.line?.dispose();
        this.line = undefined;

        // 清除所有面积测量数据
        this.clearPreviousAreaMeasurement();

        this.pointMarkers.forEach(marker => marker.dispose());
        this.pointMarkers = [];

        // 清理其他资源
        this.points = [];
        this.areaPoints = [];
    }
}