import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { cacheDB } from './CacheDB';
import { IfcParser } from "./IfcParser";
import { ifcGuidToUuid } from '../ifc/ifcGuidConverter'
import { mergeMeshesByMaterial, simplifyGeometry } from '../ifc/ifcMeshProcess';

// 定义进度回调函数类型
type ProgressCallback = (percent: number, message: string, loaded: number, total: number) => void;

// 定义颜色接口
interface IColor {
    x: number;
    y: number;
    z: number;
    w: number;
}

// 定义几何数据接口
interface IGeometryData {
    geometryExpressID: number;
    flatTransformation: number[];
    color: IColor;
}

// 定义平面几何数据接口
interface IFlatGeometry {
    geometries: {
        size(): number;
        get(index: number): IGeometryData;
    };
    expressID: number;
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
        await this.loadFileToArrayBuffer(detail_level);
        console.log('IFC文件已加载,开始解析IFC模型');
        this.ifcParser = new IfcParser(this.ifcApi);
        if (this.isParser) {
            // Pass null for onProgress to make property parsing silent
            const parsedData: any = await this.ifcParser.load(null, this.modelID!);
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

                // 收集所有几何数据，按材质分组，不直接渲染
                let geometryCount = 0;

                console.log('开始流式处理几何数据...');
                let processedCount = 0;

                this.ifcApi.StreamAllMeshes(this.modelID!, (flatMesh: any) => {
                    const placedGeometries = flatMesh.geometries;

                    for (let i = 0; i < placedGeometries.size(); i++) {
                        const placedGeometry = placedGeometries.get(i);
                        const vertexData = this.createMergedVertexData(placedGeometry);

                        if (vertexData) {
                            // 获取IFC实体的GlobalId并转换为UUID
                            const entity: IIfcEntity = this.ifcApi.GetLine(this.modelID!, flatMesh.expressID) as IIfcEntity;
                            const baseGuid = ifcGuidToUuid(entity.GlobalId.value);
                            // 跳过处理不存在空间结构关系的元素
                            if (!this.ifcExpressIds.includes(String(flatMesh.expressID))) {
                                return
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
                                    originalExpressID: flatMesh.expressID,
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

                            geometryCount++;

                            // 调试信息
                            if (geometryCount % 1000 === 0) {
                                console.log(`收集几何体 ${geometryCount} [ID:${flatMesh.expressID}] [GUID:${baseGuid}] 颜色:`, placedGeometry.color);
                            }
                        }
                    }

                    processedCount++;
                    if (onProgress && processedCount % 100 === 0) {
                        const progress = Math.min((processedCount / 1000) * 100, 95);
                        onProgress(progress, `已处理 ${processedCount} 个几何体`, processedCount, 1000);
                    }
                });

                console.log(`收集了 ${geometryCount} 个几何体，按 ${this.materialsMap.size} 种材质分组`);

                console.log('IFC模型已加载,流式处理完成');

                // 关闭模型并清理API
                if (this.modelID !== null) {
                    console.log('关闭模型...', this.ifcApi);
                    this.ifcApi.CloseModel(this.modelID);
                    this.modelID = null;
                    this.ifcApi.Dispose();
                }

                if (window.gc) {
                    window.gc();
                }
                mergeMeshesByMaterial(this.materialsMap, this.materialCache, this.scene, this.model);
                // 清理材质映射表以释放内存
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
                buffer = await this.loadBinary(this.url);
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

            this.modelID = await this.ifcApi.OpenModel(new Uint8Array(buffer), config);
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
     * 创建合并用的顶点数据（参照Three.js实现）
     * @param placedGeometry 放置的几何数据
     */
    private createMergedVertexData(placedGeometry: IGeometryData): BABYLON.VertexData | null {
        let meshData: any = null;
        try {
            const geometryExpressID = placedGeometry.geometryExpressID;

            // 获取几何数据
            meshData = this.ifcApi.GetGeometry(this.modelID!, geometryExpressID);
            if (!meshData || meshData.GetVertexDataSize() === 0) {
                if (meshData) {
                    // @ts-ignore
                    meshData.delete();
                }
                return null;
            }

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
            const vertexData = new BABYLON.VertexData();
            const { positions, normals } = this.extractPositionAndNormals(vertexArray);

            // 应用变换矩阵到顶点和法线
            const transformedData = this.applyTransformationToVertices(positions, normals, placedGeometry.flatTransformation);

            vertexData.positions = transformedData.positions;
            vertexData.normals = transformedData.normals;
            vertexData.indices = indexArray;

            return vertexData;
        } catch (error) {
            console.warn("创建合并顶点数据失败:", error);
            return null;
        } finally {
            if (meshData) {
                try {
                    // @ts-ignore
                    meshData.delete();
                } catch (e) {
                    // 忽略删除错误
                }
            }
        }
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