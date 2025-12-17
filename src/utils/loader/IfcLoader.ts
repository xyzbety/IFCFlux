import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { cacheDB } from './CacheDB';
import { IfcParser } from "./IfcParser";
import { ifcGuidToUuid } from '../ifc/ifcGuidConverter'
import { mergeMeshesByMaterial } from '../ifc/ifcMeshProcess';

// 定义进度回调函数类型
type ProgressCallback = (percent: number, message: string, loaded: number, total: number) => void;

// 定义颜色接口
interface IColor {
    x: number;
    y: number;
    z: number;
    w: number;
}



// 定义IFC实体接口
interface IIfcEntity {
    GlobalId: {
        value: string;
    };
}

// 定义几何优化配置接口
interface IGeometryOptimizationConfig {
    // 几何精度级别
    detailLevel: number;
    // 是否启用快速布尔运算
    useFastBooleans: boolean;
    // 是否优化轮廓
    optimizeProfiles: boolean;
    // 简化阈值（顶点数量超过此值进行简化）
    simplificationThreshold: number;
}

// 定义合并用几何数据接口
interface IMergeGeometryData {
    vertexData: BABYLON.VertexData;
    material: BABYLON.StandardMaterial;
    metadata: any;
}

/**
 * IFC模型加载器，用于加载和解析IFC文件并在Babylon.js场景中渲染
 */
export class IfcLoader {
    private materialsMap: Map<number, IMergeGeometryData[]>; // 材质映射表（直接存储合并数据）
    private materialCache: Map<number, BABYLON.StandardMaterial>; // 材质缓存（避免重复创建）
    private geometryCache: Map<string, BABYLON.Mesh[]>;

    // 已加载数量
    private loadedCount: number;
    // 总数量
    private totalCount: number;
    // 模型是否加载完成
    private isComplete: boolean;
    // 线模型
    private isLineModel: boolean;
    // ifc文件的模型id
    public modelID: number | null;
    // 是否冻结变换矩阵
    private isFreezeTransformMatrix: boolean;
    // 是否启用实例化
    private useInstancing: boolean;
    // 实例化阈值（相同类型的网格超过此数量将被转换为实例）
    private instanceThreshold: number;
    // 是否启用调试可视化
    private enableDebugVisualization: boolean;
    // 是否解析ifc树
    private isParser: boolean;
    // 几何优化配置
    private geometryOptimization: IGeometryOptimizationConfig;

    public ifcTree: any; // 用于存储解析后的IFC树
    public properties: any;
    public ifcExpressIds: any;
    public psetLines: any;
    public psetRelations: any;

    private url: string | File;
    private scene: BABYLON.Scene;
    public model: BABYLON.Mesh;
    public ifcApi: WEBIFC.IfcAPI;
    private ifcParser: IfcParser;

    /**
     * 构造函数，初始化加载器
     * @param url IFC文件URL或File对象
     * @param scene Babylon.js场景实例
     */
    constructor(url: string | File, scene: BABYLON.Scene) {
        this.materialsMap = new Map(); // 材质映射表（直接存储合并数据）
        this.materialCache = new Map(); // 材质缓存（避免重复创建）
        this.geometryCache = new Map();

        // 已加载数量
        this.loadedCount = 0;
        // 总数量
        this.totalCount = 0;
        // 模型是否加载完成
        this.isComplete = false;
        // 线模型
        this.isLineModel = false;
        // ifc文件的模型id
        this.modelID = null;
        // 是否冻结变换矩阵
        this.isFreezeTransformMatrix = false;
        // 是否启用实例化
        this.useInstancing = false;
        // 实例化阈值（相同类型的网格超过此数量将被转换为实例）
        this.instanceThreshold = 3;
        // 是否启用调试可视化
        this.enableDebugVisualization = false;
        // 是否解析ifc树
        this.isParser = true;
        // 几何优化配置
        this.geometryOptimization = {
            detailLevel: 8,
            useFastBooleans: true,
            optimizeProfiles: true,
            simplificationThreshold: 1000
        };

        this.ifcTree = null; // 用于存储解析后的IFC树
        this.properties = null;
        this.ifcExpressIds = null;

        this.url = url;
        this.scene = scene;
        this.model = new BABYLON.Mesh('modelMesh', this.scene);
        this.ifcApi = new WEBIFC.IfcAPI();
        this.ifcApi.SetWasmPath('/web-ifc/', true);
    }
    /**
     * 加载并解析IFC模型
     * @param onProgress - a callback function that will be called with the loading progress
     * @returns 返回包含模型的根网格或null（加载失败时）
     */
    public async load(onProgress: ProgressCallback | null = null, detail_level: number = 12): Promise<void> {

        // 阶段1：准备文件 (0% - 10%)
        await this.smoothProgress(onProgress, 0, 10, "正在准备文件...");
        await this.loadFileToArrayBuffer(detail_level);
        console.log('IFC文件已加载,开始解析IFC模型');

        this.ifcParser = new IfcParser(this.ifcApi);

        if (this.isParser) {
            // 阶段2：解析属性 (10% - 60%)
            // 使用带实时进度的解析方法
            const parsedData: any = await this.ifcParser.loadWithProgress(
                (percent) => {
                    // 将解析进度映射到10%-60%的范围
                    const mappedPercent = 10 + percent * 0.5;

                    if (onProgress) {
                        onProgress(mappedPercent, "正在解析模型...", Math.floor(mappedPercent), 100);
                    }
                },
                this.modelID!
            );

            this.ifcTree = parsedData.tree;
            this.properties = parsedData.properties;
            this.ifcExpressIds = parsedData.ifcExpressIds;

            // 将 psetLines 从 web-ifc Vector 转换为普通数组，避免对象被删除后无法访问
            if (parsedData.psetLines && parsedData.psetLines.size) {
                this.psetLines = [];
                for (let i = 0; i < parsedData.psetLines.size(); i++) {
                    this.psetLines.push(parsedData.psetLines.get(i));
                }
            } else {
                this.psetLines = parsedData.psetLines;
            }

            this.psetRelations = parsedData.psetRelations;
            this.ifcParser.dispose();
            console.log('IFC树已加载,解析完成');
        }

        return new Promise(async (resolve, reject) => {
            try {
                this.model.setEnabled(false);

                console.log('开始流式处理几何数据...');
                // StreamAllMeshes是同步操作，无法在中间更新UI，不更新进度条
                this.streamGetData()

                console.log('IFC模型已加载,流式处理完成');

                // 阶段3：处理几何数据 (60% - 85%)
                await this.processGeometryDataWithProgress(onProgress)

                // 清理临时数据
                this.geometryCache.delete('completeGeometries');

                console.log('IFC模型已加载,分批处理完成');

                // 关闭模型并清理API
                if (this.modelID !== null) {
                    console.log('关闭模型...', this.ifcApi);
                    this.ifcApi.CloseModel(this.modelID);
                    this.modelID = null;
                    this.ifcApi.Dispose();
                }

                // 优化几何阶段（不更新进度条）
                if (window.gc) {
                    window.gc();
                }


                // 执行实际的合并操作
                await mergeMeshesByMaterial(this.materialsMap, this.materialCache, this.scene, this.model, (percent, message) => {
                    if (onProgress) {
                        // 直接使用mergeMeshesByMaterial返回的进度百分比
                        onProgress(percent, message, Math.floor(percent), 100);
                    }
                });

                // 阶段5：完成 (95% - 100%)
                await this.smoothProgress(onProgress, 95, 100, "加载完成");

                // 清理材质映射表以释放内存
                this.materialCache.clear();
                this.materialsMap.clear();

                // 清理几何缓存
                if (this.geometryCache) {
                    this.geometryCache.clear();
                }

                this.isComplete = true;
                this.model.setEnabled(true);
                this.model.isVisible = true;

                // 最终垃圾回收
                if (window.gc) {
                    window.gc();
                }

                resolve();
            } catch (error) {
                console.error("IFC加载过程中发生错误:", error);
                reject(error);
            }
        });
    }

    /**
     * 平滑进度更新方法
     * @param onProgress 进度回调函数
     * @param startPercent 起始进度百分比
     * @param endPercent 结束进度百分比
     * @param message 进度消息
     */
    private async smoothProgress(onProgress: ProgressCallback | null, startPercent: number, endPercent: number, message: string): Promise<void> {
        if (!onProgress) return;

        const range = endPercent - startPercent;
        if (range <= 0) {
            onProgress(endPercent, message, Math.floor(endPercent), 100);
            return;
        }

        // 简化动画时长计算，固定为1秒
        const duration = 100;
        const updateInterval = 50;

        return new Promise<void>((resolve) => {
            const startTime = Date.now();

            const updateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(elapsed / duration, 1);

                // 简化缓动函数
                const easeProgress = progressRatio * progressRatio; // 二次缓动
                const currentProgress = Math.floor(startPercent + easeProgress * range);

                onProgress(currentProgress, message, currentProgress, 100);

                if (progressRatio < 1) {
                    setTimeout(updateProgress, updateInterval);
                } else {
                    resolve();
                }
            };

            onProgress(startPercent, message, Math.floor(startPercent), 100);
            setTimeout(updateProgress, updateInterval);
        });
    }


    private isWebUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    private async loadBinary(url: string): Promise<ArrayBuffer | null> {
        try {
            // 尝试从缓存读取
            const cached = await cacheDB.get(url);
            if (cached) {
                return cached;
            }

            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`无法加载二进制文件: ${url}`);
                return null;
            }

            const buffer = await response.arrayBuffer();
            // 写入缓存（不阻塞返回）
            cacheDB.set(url, buffer).catch(console.error);
            return buffer;
        } catch (error) {
            console.error(`加载二进制文件失败: ${url}`, error);
            return null;
        }
    }

    private async loadFileToArrayBuffer(detail_level: number): Promise<null> {
        // 初始化web-ifc API
        await this.ifcApi.Init();

        // 处理不同类型的输入（URL或File对象）
        let buffer: ArrayBuffer | null = null;

        if (this.url instanceof File) {
            // 如果是File对象，读取为ArrayBuffer
            buffer = await this.url.arrayBuffer();
        } else {
            const isWebUrl = this.isWebUrl(this.url);
            if (isWebUrl) {
                const arrayBuffer = await this.loadBinary(this.url);
                buffer = arrayBuffer;
            }
        }
        if (buffer) {
            // 应用几何优化配置
            const config = {
                COORDINATE_TO_ORIGIN: false, // 不将坐标系移动到原点
                OPTIMIZE_PROFILES: this.geometryOptimization.optimizeProfiles, // 优化轮廓
                USE_FAST_BOOLS: this.geometryOptimization.useFastBooleans, // 启用快速布尔运算
                CIRCLE_SEGMENTS: this.geometryOptimization.detailLevel, // 设置圆的线段数，影响几何精细度
                // MEMORY_LIMIT: 8294967296, // 内存限制
                // TAPE_SIZE: 6, // 磁带大小
                // LINEWRITER_BUFFER: 4267296 // 行写入器缓冲区
            };

            this.modelID = this.ifcApi.OpenModel(new Uint8Array(buffer), config);
        } else {
            console.error("无法获取IFC文件数据");
        }

        if (this.modelID === null || this.modelID < 0) {
            console.error("IFC模型打开失败");
            // 不在这里关闭模型，避免重复释放
        }

        return null;
    }


    /**
     * 应用变换矩阵到顶点位置和法线
     * @param positions 原始顶点位置
     * @param normals 原始法线
     * @param transformation 变换矩阵
     */
    private applyTransformationToVertices(positions: Float32Array, normals: Float32Array, transformation: number[]): { positions: Float32Array; normals: Float32Array } {
        const matrix = BABYLON.Matrix.FromArray(transformation);
        const transformedPositions = new Float32Array(positions.length);
        const transformedNormals = new Float32Array(normals.length);

        for (let i = 0; i < positions.length; i += 3) {
            // 变换顶点位置
            const vertex = new BABYLON.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            const transformed = BABYLON.Vector3.TransformCoordinates(vertex, matrix);
            transformedPositions[i] = transformed.x;
            transformedPositions[i + 1] = transformed.y;
            transformedPositions[i + 2] = transformed.z;

            // 变换法线（只应用旋转和缩放，不应用平移）
            const normal = new BABYLON.Vector3(normals[i], normals[i + 1], normals[i + 2]);
            const transformedNormal = BABYLON.Vector3.TransformNormal(normal, matrix).normalize();
            transformedNormals[i] = transformedNormal.x;
            transformedNormals[i + 1] = transformedNormal.y;
            transformedNormals[i + 2] = transformedNormal.z;
        }

        return { positions: transformedPositions, normals: transformedNormals };
    }



    /**
     * 从顶点数组中提取位置和法线数据
     * @param vertices 原始顶点数据数组
     */
    private extractPositionAndNormals(vertices: Float32Array): {
        positions: Float32Array;
        normals: Float32Array;
    } {
        const count = vertices.length / 6;
        const positions = new Float32Array(count * 3);
        const normals = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const base = i * 6;
            positions.set(vertices.subarray(base, base + 3), i * 3);
            normals.set(vertices.subarray(base + 3, base + 6), i * 3);
        }

        return { positions, normals };
    }

    /**
     * 创建Babylon材质
     * @param color 颜色数据
     */
    private createBabylonMaterial(color: IColor): BABYLON.StandardMaterial {
        const [r, g, b, a] = [color.x, color.y, color.z, color.w];
        const materialID = `mat_shader_${this.calculateColorID(color)}`;
        const material = new BABYLON.StandardMaterial(materialID, this.scene);

        // 设置基础颜色和透明度
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.specularColor = new BABYLON.Color3(0, 0, 0); // 移除高光
        material.emissiveColor = new BABYLON.Color3(0, 0, 0); // 移除自发光

        // 处理透明度
        if (a < 1.0) {
            material.alpha = a;
            material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        } else {
            material.alpha = 1.0;
        }

        // 禁用背面剔除，确保双面渲染
        material.backFaceCulling = false;
        material.sideOrientation = BABYLON.Mesh.DOUBLESIDE;

        // 确保光照正确
        material.disableLighting = false;

        return material;
    }

    /**
     * 计算颜色唯一标识
     * @param color 颜色对象
     */
    private calculateColorID(color: IColor): number {
        return (
            Math.floor(color.x * 255) +
            Math.floor(color.y * 255) +
            Math.floor(color.z * 255) +
            Math.floor(color.w * 255)
        );
    }

    private streamGetData() {
        this.ifcApi.StreamAllMeshes(this.modelID!, (flatMesh: any) => {
            const placedGeometries = flatMesh.geometries;

            for (let i = 0; i < placedGeometries.size(); i++) {
                const placedGeometry = placedGeometries.get(i);

                let vertexData = null;
                let meshData = null;

                try {
                    // 在收集阶段就获取几何数据
                    const geometryExpressID = placedGeometry.geometryExpressID;
                    meshData = this.ifcApi.GetGeometry(this.modelID!, geometryExpressID);

                    if (meshData && meshData.GetVertexDataSize() > 0) {
                        // 获取顶点和索引数据
                        const vertexArray = this.ifcApi.GetVertexArray(
                            meshData.GetVertexData(),
                            meshData.GetVertexDataSize()
                        );
                        const indexArray = this.ifcApi.GetIndexArray(
                            meshData.GetIndexData(),
                            meshData.GetIndexDataSize()
                        );

                        // 创建顶点数据
                        vertexData = new BABYLON.VertexData();
                        const { positions, normals } = this.extractPositionAndNormals(vertexArray);

                        // 应用变换矩阵到顶点和法线
                        const transformedData = this.applyTransformationToVertices(positions, normals, placedGeometry.flatTransformation);

                        vertexData.positions = transformedData.positions;
                        vertexData.normals = transformedData.normals;
                        vertexData.indices = indexArray;
                    } else {
                        if (meshData) {
                            meshData.delete();
                        }
                        // 跳过无效的几何数据
                        continue;
                    }
                } catch (error) {
                    console.warn(`收集几何体 ${flatMesh.expressID} 数据时出错:`, error);
                    if (meshData) {
                        try {
                            meshData.delete();
                        } catch (e) { }
                    }
                    continue;
                } finally {
                    if (meshData) {
                        try {
                            meshData.delete();
                        } catch (e) { }
                    }
                }

                // 存储完整的几何数据
                const completeGeometryData = {
                    expressID: flatMesh.expressID,
                    placedGeometry: placedGeometry,
                    vertexData: vertexData
                };

                // 临时存储完整数据
                if (!this.geometryCache.has('completeGeometries')) {
                    this.geometryCache.set('completeGeometries', []);
                }
                this.geometryCache.get('completeGeometries').push(completeGeometryData);
            }

        });
    }

    /**
     * 带进度回调的几何数据处理方法
     * @param onProgress 进度回调函数
     */
    private async processGeometryDataWithProgress(onProgress: ProgressCallback | null): Promise<void> {
        const completeGeometries = this.geometryCache.get('completeGeometries') || [];
        const totalGeometries = completeGeometries.length;

        if (totalGeometries === 0) {
            return;
        }

        const batchSize = 50;
        let processedGeometryCount = 0;

        console.log(`开始处理几何数据，共 ${totalGeometries} 个几何体`);

        // 使用异步处理批次，带进度更新
        const processBatchAsync = async (batchIndex: number): Promise<void> => {
            const batch = completeGeometries.slice(batchIndex, batchIndex + batchSize);

            for (const geometryData of batch) {
                const { expressID, placedGeometry, vertexData } = geometryData;

                try {
                    // 使用已经创建好的顶点数据
                    if (vertexData && vertexData.positions && vertexData.positions.length > 0) {
                        // 获取IFC实体的GlobalId并转换为UUID
                        const entity: IIfcEntity = this.ifcApi.GetLine(this.modelID!, expressID) as IIfcEntity;
                        const baseGuid = ifcGuidToUuid(entity.GlobalId.value);

                        // 跳过处理不存在空间结构关系的元素
                        if (!this.ifcExpressIds.includes(String(expressID))) {
                            continue;
                        }

                        // 计算颜色ID并获取/创建材质
                        const colorID = this.calculateColorID(placedGeometry.color);
                        if (!this.materialCache.has(colorID)) {
                            const material = this.createBabylonMaterial(placedGeometry.color);
                            this.materialCache.set(colorID, material);
                        }
                        const material = this.materialCache.get(colorID)!;

                        // 直接存储合并用的几何数据，不创建任何网格对象
                        const mergeData: IMergeGeometryData = {
                            vertexData: vertexData,
                            material: material,
                            metadata: {
                                originalExpressID: expressID,
                                geometryExpressID: placedGeometry.geometryExpressID,
                                globalId: entity.GlobalId.value,
                                guid: baseGuid,
                                color: placedGeometry.color,
                                transformation: placedGeometry.flatTransformation
                            }
                        };

                        // 按材质分组存储合并数据
                        if (!this.materialsMap.has(colorID)) {
                            this.materialsMap.set(colorID, []);
                        }
                        this.materialsMap.get(colorID)!.push(mergeData);

                        processedGeometryCount++;

                        // 每处理10个几何体更新一次进度
                        if (processedGeometryCount % 10 === 0 && onProgress) {
                            const progressPercent = 60 + (processedGeometryCount / totalGeometries) * 25;
                            onProgress(progressPercent, "正在处理几何数据...", Math.floor(progressPercent), 100);
                        }
                    }
                } catch (error) {
                    console.warn(`处理几何体 ${expressID} 时出错:`, error);
                    continue;
                }
            }

        };

        // 逐批异步处理，带进度更新
        for (let batchIndex = 0; batchIndex < totalGeometries; batchIndex += batchSize) {
            await processBatchAsync(batchIndex);

            // 每处理完一批后，让出控制权给浏览器，让UI有机会更新
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // 处理完成，更新最终进度
        if (onProgress) {
            onProgress(85, "几何数据处理完成", 85, 100);
        }

        console.log(`几何数据处理完成，共处理 ${processedGeometryCount} 个几何体`);
    }
    // 公共 getter 方法
    public get MaterialsMap(): Map<number, BABYLON.AbstractMesh[]> {
        return this.materialsMap;
    }

    public get IsComplete(): boolean {
        return this.isComplete;
    }

    public get LoadedCount(): number {
        return this.loadedCount;
    }

    public get TotalCount(): number {
        return this.totalCount;
    }

    // 公共配置方法
    public setLineModel(isLineModel: boolean): void {
        this.isLineModel = isLineModel;
    }

    public setFreezeTransformMatrix(freeze: boolean): void {
        this.isFreezeTransformMatrix = freeze;
    }

    public setUseInstancing(useInstancing: boolean): void {
        this.useInstancing = useInstancing;
    }

    public setInstanceThreshold(threshold: number): void {
        this.instanceThreshold = threshold;
    }

    public setEnableDebugVisualization(enable: boolean): void {
        this.enableDebugVisualization = enable;
    }

    public setIsParser(isParser: boolean): void {
        this.isParser = isParser;
    }
}