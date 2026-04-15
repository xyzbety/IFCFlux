import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { CreateGreasedLine } from "@babylonjs/core/Meshes/Builders/greasedLineBuilder.js";
import { GreasedLineMeshMaterialType } from "@babylonjs/core/Materials/GreasedLine/greasedLineMaterialInterfaces.js";
import { cacheDB } from './CacheDB';
import { IfcLoaderParser, IAnnotationGeometry, IAnnotationText } from "./IfcLoaderParser";
import { ifcGuidToUuid } from '../common/ifcGuidConverter'
import { calculateEdges, mergeMeshesByMaterial } from '../common/ifcMeshProcess';
import { isIfcElementType } from '../common/ifcTypes';
import { getWebIfcWasmPath, resolveWebIfcWasmPath } from "../common/webIfcWasmPath";

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
    private annotationGeometries: IAnnotationGeometry[] = [];
    private annotationMeshes: BABYLON.AbstractMesh[] = [];
    private annotationTextVisibilityLinks: Array<{
        proxy: BABYLON.AbstractMesh;
        display: BABYLON.AbstractMesh;
    }> = [];
    private annotationTextVisibilityObserver: BABYLON.Observer<BABYLON.Scene> | null = null;
    private annotationFontLoadPromise: Promise<void> | null = null;

    // 注释文字样式
    private readonly annotationFontFamily = 'SarasaUiSC';
    private readonly annotationLabelFontWeight = '1';
    private readonly annotationLabelFontSize = 4;
    private readonly annotationLabelRenderScale = 8;
    private readonly annotationTextColorHex = '#00ff00';

    // 注释文字布局
    private readonly annotationLabelPaddingX = 24;
    private readonly annotationLabelPaddingY = 12;
    private readonly annotationLabelLineHeight = 1.2;
    private readonly annotationLabelPixelsPerUnit = 140;
    private readonly annotationLabelMinWidth = 2;
    private readonly annotationLabelMaxWidth = 12;
    private readonly annotationLabelMinHeight = 0.9;
    private readonly annotationLabelMaxHeight = 5;
    private readonly annotationLabelOcclusionPaddingPx = 2;
    private readonly annotationLabelOcclusionMinSize = 0.05;

    // 注释线条样式
    private readonly annotationLineColorHex = '#00ff00';
    private readonly annotationLineWidth = 4;

    // 注释文字遮挡策略
    private readonly annotationTextDepthFunction = BABYLON.Engine.ALWAYS;
    private readonly annotationTextOcclusionType = BABYLON.AbstractMesh.OCCLUSION_TYPE_STRICT;
    private readonly annotationTextOcclusionAlgorithmType = BABYLON.AbstractMesh.OCCLUSION_ALGORITHM_TYPE_ACCURATE;
    private readonly annotationTextOcclusionRetryCount = -1;
    private readonly annotationTextRenderingGroupId = 2;

    private url: string | File;
    private scene: BABYLON.Scene;
    public model: BABYLON.Mesh;
    public ifcApi: WEBIFC.IfcAPI;
    private ifcParser: IfcLoaderParser;

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
        this.annotationGeometries = [];
        this.annotationFontLoadPromise = null;

        this.url = url;
        this.scene = scene;
        this.model = new BABYLON.Mesh('modelMesh', this.scene);
        this.ifcApi = new WEBIFC.IfcAPI();
        const wasmDirectory = getWebIfcWasmPath();
        this.ifcApi.SetWasmPath(wasmDirectory, true);
    }
    /**
     * 加载并解析IFC模型
     * @param onProgress - a callback function that will be called with the loading progress
     * @returns 返回包含模型的根网格或null（加载失败时）
     */
    public async load(onProgress: ProgressCallback | null = null, detail_level: number = 12): Promise<void> {
        // const startTime = performance.now();
        await this.loadFileToArrayBuffer(detail_level, onProgress);
        // const loadTime = performance.now() - startTime;
        // console.log('IFC文件已加载,开始解析IFC模型', ((loadTime) / 1000).toFixed(2));

        this.ifcParser = new IfcLoaderParser(this.ifcApi);
        this.disposeAnnotationMeshes();
        this.annotationGeometries = [];
        const collectResult = await this.ifcParser.collectNonGeometryElements(this.modelID!);
        const { total: totalNonGeometryElements, elements: allNonGeometryIds } = collectResult;
        console.log(`开始解析`, totalNonGeometryElements);

        // 根据 totalNonGeometryElements 动态计算 initialProgress
        // 几千个元素 -> initialProgress 较小（约0.05-0.15）
        // 八九百万元素 -> initialProgress 较大（约0.4-0.6）
        // 使用对数函数平滑过渡
        const initialProgress = Math.max(
            0.05,  // 最小值 5%（针对小模型）
            Math.min(
                0.60,  // 最大值 60%（针对超大模型）
                0.05 + 0.55 * Math.log10(totalNonGeometryElements / 1000 + 1) / 4
            )
        );
        console.log(`属性解析阶段进度占比: ${(initialProgress * 100).toFixed(1)}%`);

        // 计算剩余进度 (0.99 - initialProgress)
        const remainingProgress = 0.99 - initialProgress;

        // 剩余进度按权重分配：materialProgress 增加最多，然后 geometryProgress，streamGetData，最后 edgeProcess
        // 分配权重：material=5, geometry=3, stream=2, edge=1
        const totalWeight = 5 + 3 + 2 + 1; // 11
        const materialWeight = 5;
        const streamWeight = 3;
        const geometryWeight = 2;
        const edgeWeight = 1;

        // 按权重分配剩余进度，保持原比例关系
        const streamProgress = remainingProgress * (streamWeight / totalWeight);
        const geometryProgress = remainingProgress * (geometryWeight / totalWeight);
        const materialProgress = remainingProgress * (materialWeight / totalWeight);
        const edgeProcess = remainingProgress * (edgeWeight / totalWeight);

        if (this.isParser) {
            // 阶段2：解析属性 (0% - 45%)
            const parsedData: any = await this.ifcParser.loadWithProgress(
                (percent) => {
                    const mappedPercent = percent * initialProgress;

                    if (onProgress) {
                        onProgress(mappedPercent, "正在解析模型...", Math.floor(mappedPercent), 100);
                    }
                },
                this.modelID!,
                totalNonGeometryElements,
                allNonGeometryIds
            );

            this.ifcTree = parsedData.tree;
            this.properties = parsedData.properties;
            this.ifcExpressIds = parsedData.ifcExpressIds;
            this.annotationGeometries = parsedData.annotationGeometries || [];

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
                // StreamAllMeshes现在是异步操作，逐个类型处理
                // const tStart = performance.now();
                await this.streamGetData((percent) => {
                    const mappedPercent = initialProgress * 100 + percent * streamProgress;
                    if (onProgress) {
                        onProgress(mappedPercent, "正在处理几何数据...", Math.floor(mappedPercent), 100);
                    }
                });
                // const tEnd = performance.now();
                // console.log('IFC模型已加载,流式处理完成', (tEnd - tStart).toFixed(2));
                // 关闭模型并清理API
                if (this.modelID !== null) {
                    console.log('关闭模型...');
                    this.ifcApi.CloseModel(this.modelID);
                    this.modelID = null;
                    this.ifcApi.Dispose();
                }
                const t0 = performance.now();

                // 阶段3：处理几何数据
                await this.processGeometryDataWithProgress((percent) => {
                    const mappedPercent = (initialProgress + streamProgress) * 100 + percent * geometryProgress;

                    if (onProgress) {
                        onProgress(mappedPercent, "正在处理几何数据...", Math.floor(mappedPercent), 100);
                    }
                })

                // 清理几何缓存
                if (this.geometryCache) {
                    this.geometryCache.clear();
                }
                const t1 = performance.now();
                console.log('几何处理耗时：', t1 - t0);
                console.log('IFC模型已加载,分批处理完成');

                // 执行实际的合并操作并获取预计算的边框数据
                // 合并阶段进度
                await mergeMeshesByMaterial(this.materialsMap, this.materialCache, this.scene, this.model, (percent) => {
                    const mappedPercent = (initialProgress + streamProgress + geometryProgress) * 100 + percent * materialProgress;
                    if (onProgress) {
                        onProgress(mappedPercent, '正在合并网格...', Math.floor(mappedPercent), 100);
                    }
                });


                // 清理材质映射表以释放内存
                this.materialCache.clear();
                this.materialsMap.clear();
                console.log('合并材质耗时', performance.now() - t1);

                // 使用预计算的边框数据渲染边框
                // 边框阶段进度
                await this.renderEdgesFromPrecomputedData((progress) => {
                    if (onProgress) {
                        // 将边框进度映射到最后区间
                        const mappedProgress = (initialProgress + streamProgress + geometryProgress + materialProgress) * 100 + (progress * edgeProcess);
                        onProgress(mappedProgress, `正在计算边界...`, Math.floor(mappedProgress), 100);
                    }
                });

                await this.renderAnnotationGeometries();

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
        const wasmDirectory = await resolveWebIfcWasmPath();
        this.ifcApi.SetWasmPath(wasmDirectory, true);

        // 初始化web-ifc API
        await this.ifcApi.Init();
        this.ifcApi.SetLogLevel(WEBIFC.LogLevel.LOG_LEVEL_OFF);// 关闭日志输出

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
                MEMORY_LIMIT: 4294967295, // 内存限制（uint32 最大值）
                // TAPE_SIZE: 134217728, // 磁带大小
                // // LINEWRITER_BUFFER: 4267296 // 行写入器缓冲区
                // BOOLEAN_UNION_THRESHOLD: 500,    // 从默认150提高到200  
                // TOLERANCE_PLANE_INTERSECTION: 1.0e-3,    // 放宽容差  
                // TOLERANCE_PLANE_DEVIATION: 1.0e-3,       // 放宽容差  
                // TOLERANCE_SCALAR_EQUALITY: 1.0e-3,       // 放宽容差  
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
        // console.log(`计算颜色唯一标识，颜色：${color.x}, ${color.y}, ${color.z}, ${color.w}`, `标识：${materialID}`);
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
        const r = Math.floor(color.x * 255);
        const g = Math.floor(color.y * 255);
        const b = Math.floor(color.z * 255);
        const a = Math.floor(color.w * 255);

        // 使用位运算确保唯一性：RGBA 各占 8 位，共 32 位
        // 使用 >>> 0 强制转为无符号整数，避免负数
        return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    private async streamGetData(onProgress?: (percent: number) => void) {
        const allPropertyElementTypes = this.ifcApi.GetAllTypesOfModel(this.modelID as number);

        // 同时过滤：只保留 IFC 元素类型，并跳过指定的不需要的类型
        const existingTypes: number[] = [];
        const skippedTypes = new Set([
            WEBIFC.IFCOPENINGELEMENT,
            WEBIFC.IFCSPACE,
            WEBIFC.IFCOPENINGSTANDARDCASE
        ]);

        for (const type of allPropertyElementTypes) {
            const typeID = Number(type.typeID);
            if (Number.isFinite(typeID) && isIfcElementType(typeID) && !skippedTypes.has(typeID)) {
                existingTypes.push(typeID);
            }
        }

        console.log(`开始收集几何体数据，共 ${existingTypes.length} 种类型`);

        // 初始化原始几何数据缓存
        this.geometryCache.set('rawGeometries', []);

        // 逐个类型处理，每处理完一个类型让出CPU
        for (let i = 0; i < existingTypes.length; i++) {
            const typeID = existingTypes[i];

            this.ifcApi.StreamAllMeshesWithTypes(this.modelID!, [typeID], (flatMesh: any) => {
                const placedGeometries = flatMesh.geometries;

                for (let j = 0; j < placedGeometries.size(); j++) {
                    const placedGeometry = placedGeometries.get(j);

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

            // 每处理完一个类型让出CPU，以便UI更新
            await new Promise(resolve => setTimeout(resolve, 0));

            // 更新进度
            if (onProgress && existingTypes.length > 0) {
                const progressPercent = ((i + 1) / existingTypes.length) * 100;
                onProgress(progressPercent);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * 带进度回调的几何数据处理方法（优化版本 - 保持实时进度）
     * @param onProgress 进度回调函数（内部进度 0-100）
     */
    private async processGeometryDataWithProgress(onProgress: ((percent: number) => void) | null): Promise<void> {
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
                onProgress(100);
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
                    const progressPercent = (processedGeometryCount / validGeometriesCount) * 100;
                    onProgress(progressPercent);
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
            onProgress(100);
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
                    updatable: false,
                }, this.scene);
                edges.color = new BABYLON.Color3(0, 0, 0);
                edges.setEnabled(false);
                edges.isPickable = false;
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

    private disposeAnnotationMeshes(): void {
        if (this.annotationTextVisibilityObserver) {
            this.scene.onBeforeRenderObservable.remove(this.annotationTextVisibilityObserver);
            this.annotationTextVisibilityObserver = null;
        }
        this.annotationTextVisibilityLinks = [];
        for (const mesh of this.annotationMeshes) {
            try {
                mesh.dispose(false, true);
            } catch (error) {
                console.warn('释放注释几何时出错:', error);
            }
        }
        this.annotationMeshes = [];
    }

    private async renderAnnotationGeometries(): Promise<void> {
        if (!this.annotationGeometries || this.annotationGeometries.length === 0) {
            return;
        }

        const lineColor = BABYLON.Color3.FromHexString(this.annotationLineColorHex);
        const hasTextAnnotations = this.annotationGeometries.some((annotation) =>
            (annotation.texts || []).some((textItem) => Boolean(textItem.text?.trim()))
        );
        if (hasTextAnnotations) {
            await this.ensureAnnotationFontLoaded();
        }
        let renderedCount = 0;
        let renderedTextCount = 0;

        for (const annotation of this.annotationGeometries) {
            const lineSets = (annotation.lines || [])
                .map((line: number[][]) => line
                    .filter((point) => Array.isArray(point) && point.length >= 2)
                    .map((point) => new BABYLON.Vector3(point[0], point[1], point[2] ?? 0)))
                .filter((line: BABYLON.Vector3[]) => line.length >= 2);

            if (lineSets.length > 0) {
                const mesh = CreateGreasedLine(
                    `annotation-${annotation.expressID}`,
                    {
                        points: lineSets,
                    },
                    {
                        color: lineColor,
                        width: this.annotationLineWidth,
                        sizeAttenuation: true,
                        materialType: GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE,
                    },
                    this.scene
                );
                mesh.parent = this.model;
                mesh.isPickable = false;
                mesh.isVisible = true;
                mesh.receiveShadows = false;
                mesh.metadata = {
                    isAnnotationMesh: true,
                    annotationKind: 'line',
                    originalExpressID: annotation.expressID,
                };
                if (mesh.material) {
                    mesh.material.disableDepthWrite = false;
                    mesh.material.depthFunction = BABYLON.Engine.LEQUAL;
                }
                this.annotationMeshes.push(mesh);
            }

            const texts = annotation.texts || [];
            if (texts.length > 0) {
                renderedTextCount += await this.renderAnnotationTexts(annotation, texts);
            }

            if (lineSets.length > 0 || texts.length > 0) {
                renderedCount++;
            }
        }

        console.log(`注释几何已加载，共 ${renderedCount} 个对象，${renderedTextCount} 条文字`);
    }

    private async ensureAnnotationFontLoaded(): Promise<void> {
        if (this.annotationFontLoadPromise) {
            return this.annotationFontLoadPromise;
        }

        this.annotationFontLoadPromise = (async () => {
            if (typeof document === 'undefined' || !document.fonts?.load) {
                return;
            }

            await document.fonts.load(
                `${this.annotationLabelFontWeight} ${this.annotationLabelFontSize}px ${this.annotationFontFamily}`
            );

            if (document.fonts.ready) {
                await document.fonts.ready;
            }
        })().catch((error) => {
            console.warn('加载注释字体失败:', error);
        });

        return this.annotationFontLoadPromise;
    }

    private async renderAnnotationTexts(
        annotation: IAnnotationGeometry,
        texts: IAnnotationText[],
    ): Promise<number> {
        let renderedTextCount = 0;

        for (const textItem of texts) {
            try {
                const textValue = textItem.text.trim();
                if (!textValue) continue;

                const labelMesh = this.createAnnotationLabelMesh(annotation, textItem, textValue);
                this.annotationMeshes.push(labelMesh);
                renderedTextCount++;
            } catch (error) {
                console.warn(`渲染注释文字 ${annotation.expressID}/${textItem.expressID} 时出错:`, error);
            }
        }

        return renderedTextCount;
    }

    private createAnnotationLabelMesh(
        annotation: IAnnotationGeometry,
        textItem: IAnnotationText,
        textValue: string,
    ): BABYLON.AbstractMesh {
        const lines = textValue.split(/\r?\n/).map((line) => line.trimEnd());
        const alignment = this.getAnnotationTextAlignment(textItem.boxAlignment);
        const fontWeight = this.annotationLabelFontWeight;
        const renderScale = this.annotationLabelRenderScale;
        const baseFontSizePx = this.annotationLabelFontSize;
        let drawFontSizePx = baseFontSizePx;
        let drawLineHeightPx = Math.ceil(drawFontSizePx * this.annotationLabelLineHeight);
        const paddingX = this.annotationLabelPaddingX;
        const paddingY = this.annotationLabelPaddingY;
        const occlusionPaddingPx = this.annotationLabelOcclusionPaddingPx;

        const measureCanvas = document.createElement('canvas');
        const measureContext = measureCanvas.getContext('2d');
        if (!measureContext) {
            throw new Error('无法创建注释文字测量上下文');
        }

        measureContext.font = `${fontWeight} ${drawFontSizePx}px ${this.annotationFontFamily}, sans-serif`;
        const measuredWidths = lines.map((line) => measureContext.measureText(line).width);
        const textWidthPx = Math.ceil(Math.max(...measuredWidths, 0));
        const textHeightPx = drawLineHeightPx * Math.max(1, lines.length);
        let contentTextWidthPx = textWidthPx;
        let contentTextHeightPx = textHeightPx;

        let logicalTextureWidth = Math.ceil(textWidthPx + paddingX * 2);
        let logicalTextureHeight = Math.ceil(textHeightPx + paddingY * 2);

        let displayPlaneWidth = logicalTextureWidth / this.annotationLabelPixelsPerUnit;
        let displayPlaneHeight = logicalTextureHeight / this.annotationLabelPixelsPerUnit;
        const fitScale = Math.min(
            1,
            this.annotationLabelMaxWidth / Math.max(displayPlaneWidth, 1),
            this.annotationLabelMaxHeight / Math.max(displayPlaneHeight, 1),
        );

        if (fitScale < 1) {
            drawFontSizePx = Math.max(4, Math.floor(baseFontSizePx * fitScale));
            drawLineHeightPx = Math.ceil(drawFontSizePx * this.annotationLabelLineHeight);
            measureContext.font = `${fontWeight} ${drawFontSizePx}px ${this.annotationFontFamily}, sans-serif`;
            const resizedWidths = lines.map((line) => measureContext.measureText(line).width);
            const resizedTextWidthPx = Math.ceil(Math.max(...resizedWidths, 0));
            const resizedTextHeightPx = drawLineHeightPx * Math.max(1, lines.length);
            logicalTextureWidth = Math.ceil(resizedTextWidthPx + paddingX * 2);
            logicalTextureHeight = Math.ceil(resizedTextHeightPx + paddingY * 2);
            contentTextWidthPx = resizedTextWidthPx;
            contentTextHeightPx = resizedTextHeightPx;
            displayPlaneWidth = logicalTextureWidth / this.annotationLabelPixelsPerUnit;
            displayPlaneHeight = logicalTextureHeight / this.annotationLabelPixelsPerUnit;
        }

        displayPlaneWidth = Math.min(this.annotationLabelMaxWidth, Math.max(this.annotationLabelMinWidth, displayPlaneWidth));
        displayPlaneHeight = Math.min(this.annotationLabelMaxHeight, Math.max(this.annotationLabelMinHeight, displayPlaneHeight));
        // 遮挡检测只看真实文字区域，不把展示层的留白算进去。
        const occlusionPlaneWidth = Math.max(
            this.annotationLabelOcclusionMinSize,
            (contentTextWidthPx + occlusionPaddingPx * 2) / this.annotationLabelPixelsPerUnit,
        );
        const occlusionPlaneHeight = Math.max(
            this.annotationLabelOcclusionMinSize,
            (contentTextHeightPx + occlusionPaddingPx * 2) / this.annotationLabelPixelsPerUnit,
        );

        const textureWidth = Math.max(2, Math.ceil(logicalTextureWidth * renderScale));
        const textureHeight = Math.max(2, Math.ceil(logicalTextureHeight * renderScale));

        const texture = new BABYLON.DynamicTexture(
            `annotation-texture-${annotation.expressID}-${textItem.expressID}`,
            { width: textureWidth, height: textureHeight },
            this.scene,
            false,
            BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
            BABYLON.Engine.TEXTUREFORMAT_RGBA,
            true
        );
        texture.hasAlpha = true;
        texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

        const context = texture.getContext() as unknown as CanvasRenderingContext2D;
        const canvasWidth = texture.getSize().width;
        const canvasHeight = texture.getSize().height;
        const logicalCanvasWidth = canvasWidth / renderScale;
        const logicalCanvasHeight = canvasHeight / renderScale;
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        context.font = `${fontWeight} ${drawFontSizePx}px ${this.annotationFontFamily}, sans-serif`;
        context.fillStyle = '#ffffff';
        context.textAlign = alignment;
        context.textBaseline = 'middle';

        const textX = alignment === 'left'
            ? paddingX
            : alignment === 'right'
                ? logicalCanvasWidth - paddingX
                : logicalCanvasWidth / 2;
        const totalTextHeight = lines.length * drawLineHeightPx;
        const startY = (logicalCanvasHeight - totalTextHeight) / 2 + drawLineHeightPx / 2;
        lines.forEach((line, index) => {
            context.fillText(line, Math.round(textX), Math.round(startY + index * drawLineHeightPx));
        });
        texture.update(true);

        const occlusionProxy = BABYLON.MeshBuilder.CreatePlane(
            `annotation-text-proxy-${annotation.expressID}-${textItem.expressID}`,
            {
                width: occlusionPlaneWidth,
                height: occlusionPlaneHeight,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            },
            this.scene
        );
        occlusionProxy.parent = this.model;
        occlusionProxy.position = new BABYLON.Vector3(
            textItem.position[0] ?? 0,
            textItem.position[1] ?? 0,
            textItem.position[2] ?? 0,
        );
        const occlusionAlphaIndex = 1_000_000;
        occlusionProxy.renderingGroupId = 0;
        occlusionProxy.alphaIndex = occlusionAlphaIndex;
        occlusionProxy.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        occlusionProxy.isPickable = false;
        occlusionProxy.receiveShadows = false;
        occlusionProxy.metadata = {
            isAnnotationMesh: true,
            isAnnotationTextOcclusionProxy: true,
            annotationKind: 'text',
            originalExpressID: annotation.expressID,
            originalTextExpressID: textItem.expressID,
        };

        const occlusionMaterial = new BABYLON.StandardMaterial(
            `annotation-text-occlusion-material-${annotation.expressID}-${textItem.expressID}`,
            this.scene
        );
        occlusionMaterial.disableColorWrite = true;
        occlusionMaterial.disableDepthWrite = true;
        occlusionMaterial.backFaceCulling = false;
        occlusionMaterial.disableLighting = true;
        occlusionMaterial.alpha = 0;
        occlusionMaterial.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        occlusionProxy.material = occlusionMaterial;
        this.applyAnnotationTextOcclusionBehavior(occlusionProxy);
        this.annotationMeshes.push(occlusionProxy);

        const plane = BABYLON.MeshBuilder.CreatePlane(
            `annotation-text-${annotation.expressID}-${textItem.expressID}`,
            {
                width: displayPlaneWidth,
                height: displayPlaneHeight,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE,
            },
            this.scene
        );
        plane.parent = this.model;
        plane.position = new BABYLON.Vector3(
            textItem.position[0] ?? 0,
            textItem.position[1] ?? 0,
            textItem.position[2] ?? 0,
        );
        plane.renderingGroupId = this.annotationTextRenderingGroupId;
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        plane.isPickable = false;
        plane.receiveShadows = false;
        plane.metadata = {
            isAnnotationMesh: true,
            annotationKind: 'text',
            originalExpressID: annotation.expressID,
            originalTextExpressID: textItem.expressID,
        };

        const material = new BABYLON.StandardMaterial(
            `annotation-text-material-${annotation.expressID}-${textItem.expressID}`,
            this.scene
        );
        material.diffuseColor = BABYLON.Color3.White();
        material.emissiveColor = BABYLON.Color3.FromHexString(this.annotationTextColorHex);
        material.specularColor = BABYLON.Color3.Black();
        material.backFaceCulling = false;
        material.disableLighting = true;
        material.useEmissiveAsIllumination = false;
        material.alpha = 1;
        material.useAlphaFromDiffuseTexture = true;
        material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        material.diffuseTexture = texture;
        material.emissiveTexture = null;
        material.disableDepthWrite = true;
        material.depthFunction = this.annotationTextDepthFunction;
        plane.material = material;
        this.applyAnnotationTextOverlayBehavior(plane);
        this.registerAnnotationTextVisibilityLink(occlusionProxy, plane);

        return plane;
    }

    private applyAnnotationTextOcclusionBehavior(mesh: BABYLON.AbstractMesh): void {
        mesh.occlusionType = this.annotationTextOcclusionType;
        mesh.occlusionQueryAlgorithmType = this.annotationTextOcclusionAlgorithmType;
        mesh.occlusionRetryCount = this.annotationTextOcclusionRetryCount;

        if (mesh.material) {
            mesh.material.disableColorWrite = true;
            mesh.material.disableDepthWrite = true;
            mesh.material.depthFunction = BABYLON.Engine.LEQUAL;
        }
    }

    private applyAnnotationTextOverlayBehavior(mesh: BABYLON.AbstractMesh): void {
        mesh.occlusionType = BABYLON.AbstractMesh.OCCLUSION_TYPE_NONE;

        if (mesh.material) {
            mesh.material.disableDepthWrite = true;
            mesh.material.depthFunction = this.annotationTextDepthFunction;
        }
    }

    private registerAnnotationTextVisibilityLink(proxy: BABYLON.AbstractMesh, display: BABYLON.AbstractMesh): void {
        this.annotationTextVisibilityLinks.push({ proxy, display });

        if (!this.annotationTextVisibilityObserver) {
            this.annotationTextVisibilityObserver = this.scene.onBeforeRenderObservable.add(() => {
                for (const link of this.annotationTextVisibilityLinks) {
                    const shouldShow = !link.proxy.isOccluded;
                    if (link.display.isVisible !== shouldShow) {
                        link.display.isVisible = shouldShow;
                    }
                }
            });
        }
    }

    private getAnnotationTextAlignment(boxAlignment?: string): 'left' | 'center' | 'right' {
        const alignment = (boxAlignment || '').toLowerCase();
        if (alignment.includes('right')) {
            return 'right';
        }
        if (alignment.includes('left')) {
            return 'left';
        }
        return 'center';
    }

    // 公共 getter 方法
    public get MaterialsMap(): Map<number, IMergeGeometryData[]> {
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
