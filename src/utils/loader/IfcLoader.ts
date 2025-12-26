import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { cacheDB } from './CacheDB';
import { IfcParser } from "./IfcParser";
import { ifcGuidToUuid } from '../ifc/ifcGuidConverter'
import { calculateEdges, mergeMeshesByMaterial } from '../ifc/ifcMeshProcess';

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
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint32Array;
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

        await this.loadFileToArrayBuffer(detail_level, onProgress);
        console.log('IFC文件已加载,开始解析IFC模型');

        this.ifcParser = new IfcParser(this.ifcApi);

        if (this.isParser) {
            // 阶段2：解析属性 (0% - 50%)
            const parsedData: any = await this.ifcParser.loadWithProgress(
                (percent) => {
                    // 将解析进度映射到0%-50%的范围
                    const mappedPercent = percent * 0.45;

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
                // StreamAllMeshes是同步操作，无法在中间更新UI，不更新进度条
                this.streamGetData()
                console.log('IFC模型已加载,流式处理完成');
                // 关闭模型并清理API
                if (this.modelID !== null) {
                    console.log('关闭模型...');
                    this.ifcApi.CloseModel(this.modelID);
                    this.modelID = null;
                    this.ifcApi.Dispose();
                }

                // 阶段3：处理几何数据 (45% - 70%)
                await this.processGeometryDataWithProgress(onProgress)

                // 清理几何缓存
                if (this.geometryCache) {
                    this.geometryCache.clear();
                }

                console.log('IFC模型已加载,分批处理完成');

                // 执行实际的合并操作并获取预计算的边框数据
                // 合并阶段进度：70-90%
                await mergeMeshesByMaterial(this.materialsMap, this.materialCache, this.scene, this.model, (percent, message) => {
                    if (onProgress) {
                        onProgress(percent, message, Math.floor(percent), 100);
                    }
                });


                // 清理材质映射表以释放内存
                this.materialCache.clear();
                this.materialsMap.clear();

                // 使用预计算的边框数据渲染边框
                // 边框阶段进度：90-99%
                await this.renderEdgesFromPrecomputedData((progress) => {
                    if (onProgress) {
                        // 将边框进度映射到90-99%区间
                        const mappedProgress = 90 + (progress * 0.09); // 0-100% -> 90-99%
                        onProgress(mappedProgress, `正在计算边界...`, Math.floor(mappedProgress), 100);
                    }
                });

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

    private async loadFileToArrayBuffer(detail_level: number, onProgress: ProgressCallback | null): Promise<null> {
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
                MEMORY_LIMIT: 8294967296, // 内存限制
                // TAPE_SIZE: 6, // 磁带大小
                // LINEWRITER_BUFFER: 4267296 // 行写入器缓冲区
            };

            this.modelID = this.ifcApi.OpenModel(new Uint8Array(buffer), config);
            // const worker = new Worker(new URL('/stream.worker.js', import.meta.url), { type: 'module' });

            // // 等待Web Worker执行完成
            // await new Promise<void>((resolve, reject) => {
            //     worker.postMessage({ command: 'init', ifcData: buffer });

            //     worker.onmessage = (event) => {
            //         console.log("Web Worker返回数据", event.data);

            //         if (event.data.command === 'progress') {
            //             // 处理进度更新
            //             console.log(`Web Worker进度更新: ${event.data.progress}%`);
            //             if (onProgress)
            //                 onProgress(event.data.progress, event.data.message, event.data.loaded, event.data.total);
            //         } else if (event.data.command === 'init_complete') {
            //             worker.terminate(); // 清理Worker
            //             resolve();
            //         }
            //     };

            //     worker.onerror = (error) => {
            //         console.error('Web Worker发生错误:', error);
            //         worker.terminate(); // 清理Worker
            //         reject(error);
            //     };
            // });

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
     * 应用变换矩阵到顶点位置和法线（优化版本）
     * @param positions 原始顶点位置
     * @param normals 原始法线
     * @param transformation 变换矩阵
     */
    private applyTransformationToVertices(positions: Float32Array, normals: Float32Array, transformation: number[]): { positions: Float32Array; normals: Float32Array } {
        // 优化：避免频繁创建Vector3对象，使用直接数组操作
        const matrix = BABYLON.Matrix.FromArray(transformation);
        const transformedPositions = new Float32Array(positions.length);
        const transformedNormals = new Float32Array(normals.length);

        // 检查是否是单位矩阵（无变换）
        const isIdentityMatrix = this.isIdentityMatrix(transformation);

        if (isIdentityMatrix) {
            // 如果是单位矩阵，直接复制数据，避免复杂的变换计算
            transformedPositions.set(positions);
            transformedNormals.set(normals);
            return { positions: transformedPositions, normals: transformedNormals };
        }

        // 预计算矩阵的旋转部分（用于法线变换）
        const rotationMatrix = this.extractRotationMatrix(matrix);

        // 使用批量处理，避免频繁的对象创建
        const vertexCount = positions.length / 3;

        for (let i = 0; i < vertexCount; i++) {
            const baseIndex = i * 3;

            // 变换顶点位置（直接数组操作）
            const x = positions[baseIndex];
            const y = positions[baseIndex + 1];
            const z = positions[baseIndex + 2];

            // 手动计算变换后的坐标（避免Vector3对象创建）
            const transformedX = transformation[0] * x + transformation[4] * y + transformation[8] * z + transformation[12];
            const transformedY = transformation[1] * x + transformation[5] * y + transformation[9] * z + transformation[13];
            const transformedZ = transformation[2] * x + transformation[6] * y + transformation[10] * z + transformation[14];

            transformedPositions[baseIndex] = transformedX;
            transformedPositions[baseIndex + 1] = transformedY;
            transformedPositions[baseIndex + 2] = transformedZ;

            // 变换法线（只应用旋转和缩放）
            const nx = normals[baseIndex];
            const ny = normals[baseIndex + 1];
            const nz = normals[baseIndex + 2];

            // 手动计算变换后的法线
            const transformedNx = rotationMatrix[0] * nx + rotationMatrix[3] * ny + rotationMatrix[6] * nz;
            const transformedNy = rotationMatrix[1] * nx + rotationMatrix[4] * ny + rotationMatrix[7] * nz;
            const transformedNz = rotationMatrix[2] * nx + rotationMatrix[5] * ny + rotationMatrix[8] * nz;

            // 归一化法线
            const length = Math.sqrt(transformedNx * transformedNx + transformedNy * transformedNy + transformedNz * transformedNz);
            if (length > 0) {
                transformedNormals[baseIndex] = transformedNx / length;
                transformedNormals[baseIndex + 1] = transformedNy / length;
                transformedNormals[baseIndex + 2] = transformedNz / length;
            } else {
                transformedNormals[baseIndex] = nx;
                transformedNormals[baseIndex + 1] = ny;
                transformedNormals[baseIndex + 2] = nz;
            }
        }

        return { positions: transformedPositions, normals: transformedNormals };
    }

    /**
     * 检查是否是单位矩阵
     */
    private isIdentityMatrix(matrix: number[]): boolean {
        // 检查变换矩阵是否接近单位矩阵（无变换）
        return (
            Math.abs(matrix[0] - 1) < 1e-6 && Math.abs(matrix[5] - 1) < 1e-6 && Math.abs(matrix[10] - 1) < 1e-6 &&
            Math.abs(matrix[15] - 1) < 1e-6 &&
            Math.abs(matrix[1]) < 1e-6 && Math.abs(matrix[2]) < 1e-6 && Math.abs(matrix[3]) < 1e-6 &&
            Math.abs(matrix[4]) < 1e-6 && Math.abs(matrix[6]) < 1e-6 && Math.abs(matrix[7]) < 1e-6 &&
            Math.abs(matrix[8]) < 1e-6 && Math.abs(matrix[9]) < 1e-6 && Math.abs(matrix[11]) < 1e-6 &&
            Math.abs(matrix[12]) < 1e-6 && Math.abs(matrix[13]) < 1e-6 && Math.abs(matrix[14]) < 1e-6
        );
    }

    /**
     * 提取矩阵的旋转部分（3x3子矩阵）
     */
    private extractRotationMatrix(matrix: BABYLON.Matrix): number[] {
        return [
            matrix.m[0], matrix.m[1], matrix.m[2],
            matrix.m[4], matrix.m[5], matrix.m[6],
            matrix.m[8], matrix.m[9], matrix.m[10]
        ];
    }



    /**
     * 从顶点数组中提取位置和法线数据（优化版本）
     * @param vertices 原始顶点数据数组
     */
    private extractPositionAndNormals(vertices: Float32Array): {
        positions: Float32Array;
        normals: Float32Array;
    } {
        const vertexCount = vertices.length / 6;
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);

        // 优化：使用直接数组索引操作，避免频繁的subarray调用
        for (let i = 0; i < vertexCount; i++) {
            const vertexIndex = i * 6;
            const positionIndex = i * 3;

            // 直接复制位置数据
            positions[positionIndex] = vertices[vertexIndex];
            positions[positionIndex + 1] = vertices[vertexIndex + 1];
            positions[positionIndex + 2] = vertices[vertexIndex + 2];

            // 直接复制法线数据
            normals[positionIndex] = vertices[vertexIndex + 3];
            normals[positionIndex + 1] = vertices[vertexIndex + 4];
            normals[positionIndex + 2] = vertices[vertexIndex + 5];
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

                let meshData = null;

                try {
                    // 在收集阶段只获取原始几何数据
                    const geometryExpressID = placedGeometry.geometryExpressID;
                    meshData = this.ifcApi.GetGeometry(this.modelID!, geometryExpressID);

                    if (meshData && meshData.GetVertexDataSize() > 0) {
                        // 只获取顶点和索引数组，不创建VertexData对象
                        const vertexArray = this.ifcApi.GetVertexArray(
                            meshData.GetVertexData(),
                            meshData.GetVertexDataSize()
                        );
                        const indexArray = this.ifcApi.GetIndexArray(
                            meshData.GetIndexData(),
                            meshData.GetIndexDataSize()
                        );
                        const entity: IIfcEntity = this.ifcApi.GetLine(this.modelID!, flatMesh.expressID) as IIfcEntity;

                        // 存储原始几何数据，延迟创建顶点数据
                        const rawGeometryData = {
                            expressID: flatMesh.expressID,
                            placedGeometry: placedGeometry,
                            vertexArray: vertexArray,
                            indexArray: indexArray,
                            entity: entity
                        };

                        // 临时存储原始数据
                        if (!this.geometryCache.has('rawGeometries')) {
                            this.geometryCache.set('rawGeometries', []);
                        }
                        this.geometryCache.get('rawGeometries').push(rawGeometryData);
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
            }

        });
    }

    /**
     * 带进度回调的几何数据处理方法（优化版本 - 保持实时进度）
     * @param onProgress 进度回调函数
     */
    private async processGeometryDataWithProgress(onProgress: ProgressCallback | null): Promise<void> {
        const rawGeometries = this.geometryCache.get('rawGeometries') || [];
        const totalGeometries = rawGeometries.length;

        if (totalGeometries === 0) {
            return;
        }

        // 优化批处理大小，根据几何体数量动态调整
        const batchSize = Math.min(Math.max(100, Math.floor(totalGeometries / 10)), 500);
        let processedGeometryCount = 0;

        console.log(`开始处理几何数据，共 ${totalGeometries} 个几何体，批处理大小: ${batchSize}`);

        // 预计算有效的几何体索引，避免重复检查
        const validGeometryIndices: number[] = [];
        for (let i = 0; i < rawGeometries.length; i++) {
            const geometryData = rawGeometries[i];
            if (geometryData.vertexArray && geometryData.vertexArray.length > 0) {
                const expressID = geometryData.expressID;
                // 提前检查空间结构关系，避免在循环中重复检查
                if (this.ifcExpressIds && this.ifcExpressIds.includes(String(expressID))) {
                    validGeometryIndices.push(i);
                }
            }
        }

        const validGeometriesCount = validGeometryIndices.length;
        console.log(`有效几何体数量: ${validGeometriesCount}/${totalGeometries}`);

        if (validGeometriesCount === 0) {
            if (onProgress) {
                onProgress(70, "没有有效的几何体数据", 70, 100);
            }
            return;
        }

        // 使用异步串行处理，保持实时进度更新
        const processBatchAsync = async (batchStart: number, batchEnd: number): Promise<void> => {
            for (let i = batchStart; i < batchEnd; i++) {
                const geometryIndex = validGeometryIndices[i];
                const geometryData = rawGeometries[geometryIndex];

                await this.processSingleGeometry(geometryData);

                processedGeometryCount++;

                // 优化进度更新频率：每处理500个几何体更新一次进度
                if (onProgress && (processedGeometryCount % 500 === 0 || i === batchEnd - 1)) {
                    const progressPercent = 45 + (processedGeometryCount / validGeometriesCount) * 25;
                    onProgress(progressPercent, "正在处理几何数据...", Math.floor(progressPercent), 100);
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        };

        // 异步串行处理所有批次
        for (let batchStart = 0; batchStart < validGeometriesCount; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, validGeometriesCount);
            await processBatchAsync(batchStart, batchEnd);
        }

        // 处理完成，更新最终进度
        if (onProgress) {
            onProgress(70, "几何数据处理完成", 70, 100);
        }

        console.log(`几何数据处理完成，共处理 ${processedGeometryCount} 个几何体`);
    }

    /**
     * 处理单个几何体（优化版本）
     * @param geometryData 几何体数据
     */
    private async processSingleGeometry(geometryData: any): Promise<void> {
        const { expressID, placedGeometry, vertexArray, indexArray, entity } = geometryData;

        try {
            // 获取IFC实体的GlobalId并转换为UUID
            const baseGuid = ifcGuidToUuid(entity.GlobalId.value);

            // 计算颜色ID并获取/创建材质
            const colorID = this.calculateColorID(placedGeometry.color);
            if (!this.materialCache.has(colorID)) {
                const material = this.createBabylonMaterial(placedGeometry.color);
                this.materialCache.set(colorID, material);
            }
            const material = this.materialCache.get(colorID)!;

            // 提取位置和法线数据
            const { positions, normals } = this.extractPositionAndNormals(vertexArray);

            // 应用变换矩阵到顶点和法线
            const transformedData = this.applyTransformationToVertices(positions, normals, placedGeometry.flatTransformation);

            // 存储合并用的几何数据
            const mergeData: IMergeGeometryData = {
                positions: transformedData.positions,
                normals: transformedData.normals,
                indices: indexArray,
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
        } catch (error) {
            console.warn(`处理几何体 ${expressID} 时出错:`, error);
        }
    }

    /**
     * 使用预计算的边框数据渲染边框（优化版本，避免重复获取顶点数据）
     */
    private async renderEdgesFromPrecomputedData(onProgress?: (progress: number) => void) {
        const t0 = performance.now();
        let allEdgeData: BABYLON.Vector3[][] = [];
        const indexAttrs: BABYLON.IndicesArray[] = []
        const indexCounts: number[] = []
        const positionAttrs: BABYLON.FloatArray[] = []

        try {
            this.scene.meshes.forEach((mesh) => {
                indexAttrs.push(mesh.getIndices()!);
                indexCounts.push(mesh.getTotalIndices());
                positionAttrs.push(mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!);
            })

            // 收集所有网格的边缘数据
            for (let i = 1; i < indexAttrs.length; i++) {
                const edgeData = calculateEdges(indexAttrs[i], indexCounts[i], positionAttrs[i], 15);
                for (let j = 0; j < edgeData.length; j++) {
                    allEdgeData.push(edgeData[j]);
                }

                const progress = (i / (indexAttrs.length - 1)) * 100; // 减1因为从索引1开始
                onProgress?.(progress);

                // 定期让出控制权，保持UI响应
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            if (allEdgeData.length > 0) {
                const edges = BABYLON.MeshBuilder.CreateLineSystem("meshEdge", {
                    lines: allEdgeData,
                    updatable: true,
                }, this.scene);
                edges.color = new BABYLON.Color3(0, 0, 0);
                edges.setEnabled(false);
            } else {
                console.warn('没有预计算的边框数据可渲染');
            }

            const t1 = performance.now();
            console.log(`预计算边框数据组装完成，耗时 ${((t1 - t0) / 1000).toFixed(2)} 秒，总边数量: ${allEdgeData.length}`);

        } catch (error) {
            console.error('使用预计算数据创建边框时出错:', error);
        } finally {
            // 计算完成后清理所有数据以释放内存
            allEdgeData.length = 0;
            allEdgeData = [];

            // 清理数组数据
            indexAttrs.length = 0;
            indexCounts.length = 0;
            positionAttrs.length = 0;

            console.log('边框计算完成，所有数据已清理');
        }
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