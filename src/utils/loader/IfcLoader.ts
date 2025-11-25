import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { cacheDB } from './CacheDB';
import { IfcParser } from "./IfcParser";
import { ifcGuidToUuid } from '../ifc/ifcGuidConverter'


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

/**
 * IFC模型加载器，用于加载和解析IFC文件并在Babylon.js场景中渲染
 */
export class IfcLoader {
    private materialsMap: Map<number, BABYLON.AbstractMesh[]>; // 材质映射表（按颜色ID分组存储网格）
    private materialCache: Map<number, BABYLON.StandardMaterial>; // 材质缓存（避免重复创建）
    private geometryCache: Map<string, BABYLON.Mesh[]>;
    private materialParentMeshes: Map<number, BABYLON.Mesh>; // 材质父网格映射表

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
        this.materialsMap = new Map(); // 材质映射表（按颜色ID分组存储网格）
        this.materialCache = new Map(); // 材质缓存（避免重复创建）
        this.geometryCache = new Map();
        this.materialParentMeshes = new Map(); // 材质父网格映射表

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
            simplificationThreshold: 500
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
        this.ifcParser = new IfcParser(this.ifcApi);
        if (this.isParser) {
            // Pass null for onProgress to make property parsing silent
            const parsedData: any = await this.ifcParser.load(null, this.modelID!);
            this.ifcTree = parsedData.tree;
            this.properties = parsedData.properties;
            this.ifcExpressIds = parsedData.ifcExpressIds;
            this.psetLines = parsedData.psetLines;
            this.psetRelations = parsedData.psetRelations;
            console.log('IFC树已加载,解析完成');
        }

        return new Promise(async (resolve, reject) => {
            try {
                this.model.setEnabled(false);

                const flatMeshes = this.ifcApi.LoadAllGeometry(this.modelID!);
                const geometryCount = flatMeshes.size();
                console.log(`正在加载${geometryCount}个图元`);
                let loadedGeometries = 0;

                const processMeshes = async (): Promise<void> => {
                    // Start progress from 0 for geometry loading
                    if (onProgress) {
                        onProgress(0, "正在创建图元", 0, geometryCount);
                    }

                    for (let i = 0; i < geometryCount; i++) {
                        const mesh = flatMeshes.get(i);
                        this.processGeometryData(mesh);

                        loadedGeometries++;
                        if (onProgress) {
                            const percent = (loadedGeometries / geometryCount) * 100;
                            onProgress(percent, "正在创建图元", loadedGeometries, geometryCount);
                        }

                        (mesh as any).delete;
                        const batchSize = Math.max(50, Math.min(1000, Math.floor(geometryCount / 100)));
                        if (i % batchSize === 0) await new Promise(r => setTimeout(r, 0));
                    }
                    (flatMeshes as any).delete();
                };

                await processMeshes();

                if (this.useInstancing) {
                    this.geometryCache.forEach((meshes) => {
                        if (meshes.length >= this.instanceThreshold) {
                            const rootMesh = meshes[0];
                            rootMesh.isVisible = false;
                            meshes.forEach((mesh) => {
                                const instance = rootMesh.createInstance(mesh.name);
                                instance.id = mesh.id;
                                this.processInstancedMeshTransform(mesh.metadata, instance);
                                instance.parent = this.model;
                                instance.metadata = mesh.metadata;
                                if (mesh.name !== rootMesh.name) {
                                    mesh.dispose();
                                }
                            });
                            rootMesh.name = `inst_${rootMesh.name}`;
                        } else {
                            const mesh = meshes[0];
                            this.processMeshTransform(mesh);
                            mesh.isVisible = true;
                            if (this.isFreezeTransformMatrix) {
                                mesh.freezeWorldMatrix();
                            }
                        }
                    });
                    this.geometryCache.clear();
                }

                this.mergeMeshesByMaterial();

                this.isComplete = true;
                this.model.setEnabled(true);

                console.log('模型加载完成');

                this.ifcApi.CloseModel(this.modelID!);
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
            this.ifcApi.CloseModel(this.modelID || 0);
        }

        return null;
    }

    private processGeometryData(flatMesh: IFlatGeometry): void {
        const placedGeometries = flatMesh.geometries;
        const size = placedGeometries.size();
        const baseExpressID = flatMesh.expressID;
        const entity: IIfcEntity = this.ifcApi.GetLine(this.modelID!, baseExpressID);
        const baseGuid = ifcGuidToUuid(entity.GlobalId.value)
        // 跳过处理不存在空间结构关系的元素
        if (!this.ifcExpressIds.includes(String(baseExpressID))) {
            return
        }
        for (let i = 0; i < size; i++) {
            const placedGeometry = placedGeometries.get(i);

            // 使用原始的expressID和GUID，不创建新的标识
            const mesh = this.createGeometryMesh(placedGeometry, baseExpressID);
            if (mesh) {
                this.processMeshTransform(mesh);
                this.assignMeshMaterial(placedGeometry, mesh);

                // 获取材质ID
                const colorID = this.calculateColorID(placedGeometry.color);

                // 保存原始网格信息到元数据
                if (!mesh.metadata) {
                    mesh.metadata = {};
                }
                // 直接保存原始的expressID和GUID，不修改
                mesh.metadata.originalExpressID = baseExpressID;
                mesh.metadata.originalGuid = baseGuid;
                mesh.metadata.instanceIndex = i; // 保存实例索引
                mesh.metadata.colorID = colorID;

                // 设置网格的ID和名称：GUID作为ID，expressID作为name
                mesh.id = baseGuid;
                mesh.name = `${baseExpressID}`;

                // 将网格添加到对应的材质组
                if (!this.materialsMap.has(colorID)) {
                    this.materialsMap.set(colorID, []);
                }
                this.materialsMap.get(colorID)!.push(mesh);

                // 设置网格可见性
                mesh.isVisible = false; // 先隐藏，等待合并
                if (this.isFreezeTransformMatrix) {
                    mesh.freezeWorldMatrix();
                }
            }
        }
    }

    private createGeometryMesh(geometry: IGeometryData, expressID: number): BABYLON.Mesh | null {
        try {
            const geometryExpressID = geometry.geometryExpressID;
            const geometryKey = `${geometryExpressID}`;
            const expressIDKey = `${expressID}`;

            // 创建新几何并加入缓存
            const meshData = this.ifcApi.GetGeometry(this.modelID!, geometryExpressID);
            if (!meshData || meshData.GetVertexDataSize() === 0) {
                return null;
            }

            const mesh = new BABYLON.Mesh(expressIDKey, this.scene);
            mesh.parent = this.model;
            mesh.isVisible = false;

            const vertexData = this.createVertexData(meshData);
            if (vertexData) {
                vertexData.applyToMesh(mesh, true);
                mesh.metadata = {
                    geometryKey: geometryKey,
                    flatTransformation: geometry.flatTransformation,
                };

                return mesh;
            }
            return null;
        } catch (error) {
            console.warn("几何网格创建失败:", error);
            return null;
        }
    }

    private processMeshTransform(mesh: BABYLON.Mesh): void {
        try {
            // 动态保留有效数字，避免直接截断
            // const adjustedTransformation = mesh.metadata.flatTransformation.map(num => {
            //   if (Math.abs(num) < 1e-5) return 0;  // 极小值视为0
            //   return parseFloat(num.toExponential(10));  // 科学记数法保留10位有效数字
            // });
            const transformMatrix = BABYLON.Matrix.FromArray(mesh.metadata.flatTransformation);
            // const transformMatrix = BABYLON.Matrix.FromArray(adjustedTransformation);

            if (!transformMatrix.isIdentity()) {
                mesh.metadata.originalTransform = transformMatrix.clone();
                mesh.bakeTransformIntoVertices(transformMatrix);
                mesh.refreshBoundingInfo();
            }
        } catch (error) {
            console.warn("mesh网格变换处理失败:", error);
        }
    }

    private processInstancedMeshTransform(geometry: any, instance: BABYLON.InstancedMesh): void {
        try {
            // 从几何数据获取变换矩阵
            // const adjustedTransformation = geometry.flatTransformation.map(num => {
            //     if (Math.abs(num) < 1e-5) return 0;  // 极小值视为0
            //     return parseFloat(num.toExponential(10));  // 科学记数法保留10位有效数字
            // });
            const transformMatrix = BABYLON.Matrix.FromArray(geometry.flatTransformation);
            // const transformMatrix = BABYLON.Matrix.FromArray(adjustedTransformation);

            const scale = new BABYLON.Vector3();
            const rotation = new BABYLON.Quaternion();
            const translation = new BABYLON.Vector3();

            // 分解矩阵为平移、旋转和缩放
            if (transformMatrix.decompose(scale, rotation, translation)) {
                // 将分解结果应用到实例网格
                instance.position = translation;
                instance.rotationQuaternion = rotation;
                instance.scaling = scale;
                instance.computeWorldMatrix(true); // 强制更新世界矩阵
                instance.refreshBoundingInfo(true);
            } else {
                console.warn("Matrix decomposition failed for mesh:", instance.name);
            }
        } catch (error) {
            console.warn("instancedMesh网格变换处理失败:", error);
        }
    }

    /**
     * 创建顶点数据
     * @param geometry 几何数据
     */
    private createVertexData(geometry: any): BABYLON.VertexData | null {
        try {
            const vertexArray = this.ifcApi.GetVertexArray(
                geometry.GetVertexData(),
                geometry.GetVertexDataSize()
            );
            const indexArray = this.ifcApi.GetIndexArray(
                geometry.GetIndexData(),
                geometry.GetIndexDataSize()
            );

            // 创建Babylon顶点数据
            const vertexData = new BABYLON.VertexData();
            const { positions, normals } = this.extractPositionAndNormals(vertexArray);

            // 动态判断是否需要几何简化
            let simplifiedPositions = positions;
            let simplifiedNormals = normals;
            let simplifiedIndices = indexArray;

            const vertexCount = positions.length / 3;
            const shouldSimplify = this.shouldSimplifyGeometry(vertexCount);

            if (shouldSimplify) {
                const simplified = this.simplifyGeometry(positions, normals, indexArray);
                simplifiedPositions = simplified.positions;
                simplifiedNormals = simplified.normals;
                simplifiedIndices = simplified.indices;
            }

            vertexData.positions = simplifiedPositions;
            vertexData.normals = simplifiedNormals;
            vertexData.indices = simplifiedIndices;

            // @ts-ignore
            geometry.delete();
            return vertexData;
        } catch (error) {
            console.warn("顶点数据创建失败:", error);
            return null;
        }
    }

    /**
     * 判断单个几何体是否需要简化
     * @param vertexCount 顶点数量
     * @returns 是否需要简化
     */
    private shouldSimplifyGeometry(vertexCount: number): boolean {
        if (vertexCount > 6000) {
            return true; // 大量顶点，总是简化
        } else if (vertexCount > 1000) {
            return false; // 暂时不简化，保持精度
        } else {
            return false; // 少量顶点，不需要简化
        }
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
     * 几何简化算法（基于顶点合并）
     * @param positions 原始顶点位置
     * @param normals 原始法线
     * @param indices 原始索引
     */
    private simplifyGeometry(
        positions: Float32Array,
        normals: Float32Array,
        indices: Uint32Array
    ): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
        const tolerance = 0.01; // 合并容差
        const vertexCount = positions.length / 3;

        // 创建顶点映射表
        const vertexMap = new Map<string, number>();
        const newPositions: number[] = [];
        const newNormals: number[] = [];

        // 合并相近顶点
        for (let i = 0; i < vertexCount; i++) {
            const x = positions[i * 3];
            const y = positions[i * 3 + 1];
            const z = positions[i * 3 + 2];

            // 量化顶点坐标
            const quantizedX = Math.round(x / tolerance) * tolerance;
            const quantizedY = Math.round(y / tolerance) * tolerance;
            const quantizedZ = Math.round(z / tolerance) * tolerance;

            const key = `${quantizedX},${quantizedY},${quantizedZ}`;

            if (!vertexMap.has(key)) {
                const newIndex = newPositions.length / 3;
                vertexMap.set(key, newIndex);
                newPositions.push(x, y, z);
                newNormals.push(
                    normals[i * 3],
                    normals[i * 3 + 1],
                    normals[i * 3 + 2]
                );
            }
        }

        // 重新映射索引
        const newIndices: number[] = [];
        for (let i = 0; i < indices.length; i++) {
            const vertexIndex = indices[i];
            const x = positions[vertexIndex * 3];
            const y = positions[vertexIndex * 3 + 1];
            const z = positions[vertexIndex * 3 + 2];

            const quantizedX = Math.round(x / tolerance) * tolerance;
            const quantizedY = Math.round(y / tolerance) * tolerance;
            const quantizedZ = Math.round(z / tolerance) * tolerance;

            const key = `${quantizedX},${quantizedY},${quantizedZ}`;
            const newIndex = vertexMap.get(key);

            if (newIndex !== undefined) {
                newIndices.push(newIndex);
            }
        }

        return {
            positions: new Float32Array(newPositions),
            normals: new Float32Array(newNormals),
            indices: new Uint32Array(newIndices)
        };
    }

    /**
     * 分配网格材质
     * @param geometry 几何数据
     * @param mesh 目标网格
     */
    private assignMeshMaterial(geometry: IGeometryData, mesh: BABYLON.Mesh): void {
        const color = geometry.color;
        const colorID = this.calculateColorID(color);

        if (this.isLineModel) {
            // mesh.material.wireframe = true; // 启用线框模式但是有对角线
            mesh.enableEdgesRendering();
            mesh.edgesColor = new BABYLON.Color4(color.x, color.y, color.z, color.w);
        } else {
            // 获取或创建材质
            if (!this.materialCache.has(colorID)) {
                const material = this.createBabylonMaterial(color);
                this.materialCache.set(colorID, material);
            }
            mesh.material = this.materialCache.get(colorID)!;
        }

        // 添加网格到材质分组
        if (!this.materialsMap.has(colorID)) {
            this.materialsMap.set(colorID, []);
        }
        this.materialsMap.get(colorID)!.push(mesh);
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
        material.alpha = a;

        // 禁用背面剔除
        material.backFaceCulling = true;
        material.reflectionTexture = null;

        // 设置双面渲染
        material.sideOrientation = BABYLON.Mesh.DOUBLESIDE;

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


    /**
     * 合并相同材质的网格
     * 按材质分组几何体，分别合并每个材质组的几何体
     * 修改：保留原始子网格，修复mergedFrom数据重复问题
     */
    private mergeMeshesByMaterial(): void {
        // 创建按材质分组的几何体映射表（类似Three.js的geometriesByMaterials）
        const geometriesByMaterials = new Map<number, BABYLON.VertexData[]>();
        const originalMeshesByMaterial = new Map<number, BABYLON.Mesh[]>();

        // 第一步：收集所有网格的几何数据，按材质分组（类似Three.js的storeGeometryByMaterial）
        this.materialsMap.forEach((meshes, colorID) => {
            if (meshes.length > 0) {
                const validMeshes = meshes.filter(mesh =>
                    mesh && !mesh.isDisposed() && mesh.geometry
                );

                if (validMeshes.length > 0) {
                    const geometries: BABYLON.VertexData[] = [];
                    const originalMeshes: BABYLON.Mesh[] = [];

                    // 收集每个网格的几何数据
                    validMeshes.forEach(mesh => {
                        if (mesh.geometry) {
                            const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
                            geometries.push(vertexData);
                            originalMeshes.push(mesh as BABYLON.Mesh);
                        }
                    });

                    if (geometries.length > 0) {
                        geometriesByMaterials.set(colorID, geometries);
                        originalMeshesByMaterial.set(colorID, originalMeshes);
                    }
                }
            }
        });

        // 第二步：对每个材质组的几何体进行合并（类似Three.js的mergeBufferGeometries）
        const mergedMeshes: BABYLON.Mesh[] = [];

        geometriesByMaterials.forEach((geometries, colorID) => {
            if (geometries.length > 1) {
                try {
                    // 预计算总数据量，避免数组动态扩容
                    let totalPositions = 0;
                    let totalNormals = 0;
                    let totalIndices = 0;

                    geometries.forEach(vertexData => {
                        if (vertexData.positions) totalPositions += vertexData.positions.length;
                        if (vertexData.normals) totalNormals += vertexData.normals.length;
                        if (vertexData.indices) totalIndices += vertexData.indices.length;
                    });

                    // 合并相同材质的几何体（类似Three.js的mergeBufferGeometries）
                    const mergedVertexData = new BABYLON.VertexData();

                    // 预分配数组大小
                    const positions = new Array(totalPositions);
                    const normals = new Array(totalNormals);
                    const indices = new Array(totalIndices);

                    let positionIndex = 0;
                    let normalIndex = 0;
                    let indicesIndex = 0;
                    let vertexOffset = 0;

                    geometries.forEach(vertexData => {
                        // 添加位置数据 - 直接写入预分配的数组
                        if (vertexData.positions) {
                            for (let i = 0; i < vertexData.positions.length; i++) {
                                positions[positionIndex++] = vertexData.positions[i];
                            }
                        }

                        // 添加法线数据 - 直接写入预分配的数组
                        if (vertexData.normals) {
                            for (let i = 0; i < vertexData.normals.length; i++) {
                                normals[normalIndex++] = vertexData.normals[i];
                            }
                        }

                        // 添加索引数据（需要偏移，类似Three.js的索引偏移）
                        if (vertexData.indices) {
                            for (let i = 0; i < vertexData.indices.length; i++) {
                                indices[indicesIndex++] = vertexData.indices[i] + vertexOffset;
                            }
                        }

                        // 更新顶点偏移量
                        if (vertexData.positions) {
                            vertexOffset += vertexData.positions.length / 3;
                        }
                    });

                    // 设置合并后的顶点数据
                    mergedVertexData.positions = positions;
                    mergedVertexData.normals = normals;
                    mergedVertexData.indices = indices;

                    // 创建合并后的网格
                    const mergedMesh = new BABYLON.Mesh(`merged_material_${colorID}`, this.scene);
                    mergedVertexData.applyToMesh(mergedMesh);

                    // 设置材质（保持原有的材质缓存机制）
                    const material = this.materialCache.get(colorID);
                    if (material) {
                        mergedMesh.material = material;
                    }

                    mergedMesh.parent = this.model;
                    mergedMesh.isVisible = true;

                    // 保存合并信息到元数据，保留所有原始网格的expressID、GUID等数据
                    const originalMeshes = originalMeshesByMaterial.get(colorID) || [];

                    // 设置合并网格的ID和name：使用第一个子网格的GUID作为ID，expressID作为name
                    const firstOriginalMesh = originalMeshes[0];
                    if (firstOriginalMesh && firstOriginalMesh.metadata) {
                        const baseGuid = firstOriginalMesh.metadata.originalGuid;
                        const baseExpressID = firstOriginalMesh.metadata.originalExpressID;
                        if (baseGuid) {
                            mergedMesh.id = baseExpressID;
                        }
                        if (baseExpressID) {
                            mergedMesh.name = `${baseGuid}`;
                        }
                    }

                    // 使用Set来去重，避免重复的mergedFrom数据
                    const uniqueMeshData = new Map<string, any>();

                    // 保存原始网格的几何数据用于后续clone，然后销毁网格以节省内存
                    const originalMeshData: any[] = [];
                    originalMeshes.forEach(mesh => {
                        if (!mesh.isDisposed()) {
                            const metadata = mesh.metadata || {};
                            const key = `${metadata.originalExpressID}_${metadata.instanceIndex}`;
                            if (!uniqueMeshData.has(key)) {
                                uniqueMeshData.set(key, {
                                    originalExpressID: metadata.originalExpressID,
                                    originalGuid: metadata.originalGuid,
                                    instanceIndex: metadata.instanceIndex
                                });
                            }

                            // 提取网格的几何数据用于后续clone，确保完整保留GUID和材质信息
                            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                            const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
                            const indices = mesh.getIndices();

                            // 确保几何数据存在且有效
                            if (positions && positions.length > 0 && indices && indices.length > 0) {
                                const meshData = {
                                    positions: positions,
                                    normals: normals,
                                    indices: indices,
                                    metadata: {
                                        ...mesh.metadata, // 完整保留所有元数据，包括GUID
                                        originalExpressID: metadata.originalExpressID,
                                        originalGuid: metadata.originalGuid,
                                        instanceIndex: metadata.instanceIndex,
                                        colorID: metadata.colorID, // 确保保留材质ID
                                        originalMaterial: mesh.material // 保存原始材质
                                    },
                                    material: mesh.material, // 保留原始材质
                                    transformMatrix: mesh.getWorldMatrix().clone(),
                                };
                                originalMeshData.push(meshData);
                            } else {
                                console.warn(`网格 ${mesh.name} 的几何数据无效，跳过保存`);
                            }

                            // 销毁原始网格以节省内存
                            mesh.dispose();
                        }
                    });

                    // 为合并网格添加子网格操作功能
                    mergedMesh.metadata = {
                        isMergedMesh: true,
                        originalMaterialId: colorID,
                        mergedFrom: Array.from(uniqueMeshData.values()),
                        originalMeshData: originalMeshData, // 保留原始网格的几何数据
                        mergedGeometryCount: geometries.length,
                        // 确保合并网格本身也有正确的ID信息
                        originalExpressID: firstOriginalMesh?.metadata?.originalExpressID,
                        originalGuid: firstOriginalMesh?.metadata?.originalGuid,
                        // 子网格操作功能
                        hideSubMesh: this.createHideSubMeshFunction(mergedMesh, originalMeshData),
                        restoreSubMesh: this.createRestoreSubMeshFunction(mergedMesh, originalMeshData)
                    };

                    mergedMeshes.push(mergedMesh);

                    console.log(`合并了材质 ${colorID} 的 ${geometries.length} 个几何体，保留了 ${originalMeshes.length} 个原始子网格数据，合并后的网格数量为 ${mergedMeshes.length} 个`);

                } catch (error) {
                    console.error(`合并材质 ${colorID} 的几何体时发生错误:`, error);
                    // 如果合并失败，保持原始网格不变
                    const originalMeshes = originalMeshesByMaterial.get(colorID) || [];
                    originalMeshes.forEach(mesh => {
                        if (mesh && !mesh.isDisposed()) {
                            mesh.isVisible = true;
                            mergedMeshes.push(mesh);
                        }
                    });
                }
            } else if (geometries.length === 1) {
                // 单个几何体，不需要合并，直接使用原始网格
                const originalMeshes = originalMeshesByMaterial.get(colorID) || [];
                if (originalMeshes.length > 0) {
                    const mesh = originalMeshes[0];
                    if (mesh && !mesh.isDisposed()) {
                        mesh.isVisible = true;

                        // 为单个网格也添加子网格操作功能
                        if (mesh.metadata) {
                            // 保存原始网格的几何数据
                            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                            const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
                            const indices = mesh.getIndices();

                            if (positions && positions.length > 0 && indices && indices.length > 0) {
                                const originalMeshData = [{
                                    positions: positions,
                                    normals: normals,
                                    indices: indices,
                                    metadata: { ...mesh.metadata },
                                    isVisible: true,
                                    material: mesh.material,
                                }];

                                // 更新网格的元数据，添加子网格操作功能
                                mesh.metadata = {
                                    ...mesh.metadata,
                                    isMergedMesh: false, // 标记为未合并的网格
                                    originalMeshData: originalMeshData,
                                    hideSubMesh: this.createHideSubMeshFunction(mesh, originalMeshData),
                                    restoreSubMesh: this.createRestoreSubMeshFunction(mesh, originalMeshData)
                                };
                            }
                        }

                        mergedMeshes.push(mesh);
                    }
                }
            }
        });

        // 第三步：清空原始材质映射表，用合并后的网格替换
        this.materialsMap.clear();

        // 将合并后的网格按材质重新分组
        mergedMeshes.forEach(mesh => {
            const metadata = mesh.metadata || {};
            const colorID = metadata.originalMaterialId || this.calculateColorIDFromMesh(mesh);

            if (!this.materialsMap.has(colorID)) {
                this.materialsMap.set(colorID, []);
            }
            this.materialsMap.get(colorID)!.push(mesh);
        });

        console.log(`网格合并完成，共创建了 ${mergedMeshes.length} 个合并后的网格，保留了所有原始子网格`);
    }

    /**
     * 从网格计算颜色ID（用于回退机制）
     */
    private calculateColorIDFromMesh(mesh: BABYLON.Mesh): number {
        if (mesh.material && mesh.material instanceof BABYLON.StandardMaterial) {
            const material = mesh.material as BABYLON.StandardMaterial;
            const color = material.diffuseColor;
            if (color) {
                return Math.floor(color.r * 255) + Math.floor(color.g * 255) + Math.floor(color.b * 255);
            }
        }
        return 0;
    }
    /**
     * 创建隐藏子网格的函数（通过expressID）
     * @param mergedMesh 合并后的网格
     * @param originalMeshData 原始网格数据
     */
    private createHideSubMeshFunction(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): (expressID: number) => void {
        return (expressID: number) => {
            let foundAny = false;

            // 遍历所有子网格，隐藏所有匹配expressID的网格
            originalMeshData.forEach((meshData) => {
                if (meshData.metadata?.originalExpressID === expressID) {
                    // 标记该子网格为隐藏状态
                    meshData.isVisible = false;
                    foundAny = true;
                }
            });

            if (foundAny) {
                // 重新构建合并网格以应用隐藏效果
                this.rebuildMergedMesh(mergedMesh, originalMeshData);
            } else {
                console.warn(`未找到expressID为 ${expressID} 的子网格`);
            }
        };
    }


    /**
     * 创建恢复子网格的函数（通过expressID）
     * @param mergedMesh 合并后的网格
     * @param originalMeshData 原始网格数据
     */
    private createRestoreSubMeshFunction(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): (expressID?: number) => void {
        return (expressID?: number) => {
            if (expressID === undefined) {
                // 恢复所有子网格
                originalMeshData.forEach(meshData => {
                    meshData.isVisible = true;
                });
                this.rebuildMergedMesh(mergedMesh, originalMeshData);
            } else {
                let foundAny = false;

                // 遍历所有子网格，恢复所有匹配expressID的网格
                originalMeshData.forEach((meshData) => {
                    if (meshData.metadata?.originalExpressID === expressID) {
                        meshData.isVisible = true;
                        foundAny = true;
                    }
                });

                if (foundAny) {
                    this.rebuildMergedMesh(mergedMesh, originalMeshData);
                } else {
                    console.warn(`未找到expressID为 ${expressID} 的子网格`);
                }
            }
        };
    }

    /**
     * 重新构建合并网格
     * @param mergedMesh 合并后的网格
     * @param originalMeshData 原始网格数据
     */
    private rebuildMergedMesh(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): void {
        try {
            // 预计算总顶点数和索引数
            let totalPositions = 0;
            let totalIndices = 0;
            const geometryGroups = new Map<number, { positions: number[], normals: number[], indices: number[] }>();

            // 第一遍：计算每个expressID的总数据量
            const groupSizes = new Map<number, { positions: number, normals: number, indices: number }>();

            originalMeshData.forEach(meshData => {
                const expressID = meshData.metadata?.originalExpressID;
                if (!expressID || meshData.isVisible === false) return;

                if (!groupSizes.has(expressID)) {
                    groupSizes.set(expressID, { positions: 0, normals: 0, indices: 0 });
                }
                const size = groupSizes.get(expressID)!;
                size.positions += meshData.positions.length;
                size.normals += meshData.normals.length;
                size.indices += meshData.indices.length;

                totalPositions += meshData.positions.length;
                totalIndices += meshData.indices.length;
            });

            // 第二遍：预分配数组并填充数据
            originalMeshData.forEach(meshData => {
                const expressID = meshData.metadata?.originalExpressID;
                if (!expressID || meshData.isVisible === false) return;

                if (!geometryGroups.has(expressID)) {
                    const size = groupSizes.get(expressID)!;
                    geometryGroups.set(expressID, {
                        positions: new Array(size.positions),
                        normals: new Array(size.normals),
                        indices: new Array(size.indices)
                    });
                }
                const group = geometryGroups.get(expressID)!;

                // 追踪当前写入位置
                if (!group.currentPosIndex) group.currentPosIndex = 0;
                if (!group.currentNormalIndex) group.currentNormalIndex = 0;
                if (!group.currentIndicesIndex) group.currentIndicesIndex = 0;

                // 直接写入预分配的数组
                for (let i = 0; i < meshData.positions.length; i++) {
                    group.positions[group.currentPosIndex++] = meshData.positions[i];
                }
                for (let i = 0; i < meshData.normals.length; i++) {
                    group.normals[group.currentNormalIndex++] = meshData.normals[i];
                }
                for (let i = 0; i < meshData.indices.length; i++) {
                    group.indices[group.currentIndicesIndex++] = meshData.indices[i];
                }
            });

            if (geometryGroups.size === 0) {
                mergedMesh.isVisible = false;
                return;
            }

            // 预分配内存
            const positions = new Float32Array(totalPositions);
            const normals = new Float32Array(totalPositions);
            const indices = new Uint32Array(totalIndices);

            let vertexOffset = 0;
            let indexOffset = 0;

            // 合并数据 - 使用循环避免栈溢出
            geometryGroups.forEach(group => {
                const groupVertexCount = group.positions.length / 3;

                // 填充位置和法线数据
                for (let i = 0; i < group.positions.length; i++) {
                    positions[vertexOffset * 3 + i] = group.positions[i];
                    normals[vertexOffset * 3 + i] = group.normals[i];
                }

                // 填充索引数据（带偏移）
                for (let i = 0; i < group.indices.length; i++) {
                    indices[indexOffset + i] = group.indices[i] + vertexOffset;
                }

                vertexOffset += groupVertexCount;
                indexOffset += group.indices.length;
            });

            if (vertexOffset === 0) {
                mergedMesh.isVisible = false;
                return;
            }

            // 应用合并后的数据
            const mergedVertexData = new BABYLON.VertexData();
            mergedVertexData.positions = positions;
            mergedVertexData.normals = normals;
            mergedVertexData.indices = indices;
            mergedVertexData.applyToMesh(mergedMesh);

            mergedMesh.isVisible = true;
            mergedMesh.refreshBoundingInfo(); // 仅调用一次
        } catch (error) {
            console.error('重新构建合并网格时发生错误:', error);
        }
    }


}