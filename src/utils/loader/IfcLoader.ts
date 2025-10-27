import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { cacheDB } from './CacheDB';
import { IfcParser } from "./IfcParser";
import { GeometryTypes } from "../ifc/ifcGeometryTypes";
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

/**
 * IFC模型加载器，用于加载和解析IFC文件并在Babylon.js场景中渲染
 */
export class IfcLoader {
    private materialsMap: Map<number, BABYLON.AbstractMesh[]>; // 材质映射表（按颜色ID分组存储网格）
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
    public async load(onProgress: ProgressCallback | null = null, detail_level:number = 12): Promise<void> {
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
                        if (i % 200 === 0) await new Promise(r => setTimeout(r, 0));
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

                this.isComplete = true;
                this.model.setEnabled(true);
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
            this.modelID = await this.ifcApi.OpenModel(new Uint8Array(buffer), {
                COORDINATE_TO_ORIGIN: false, // 不将坐标系移动到原点
                // OPTIMIZE_PROFILES: true, // 优化轮廓
                CIRCLE_SEGMENTS: detail_level, // 设置圆的线段数，影响几何精细度
                // MEMORY_LIMIT: 8294967296, // 内存限制
                // TAPE_SIZE: 6, // 磁带大小
                // LINEWRITER_BUFFER: 4267296 // 行写入器缓冲区
            });
        } else {
            console.error("无法获取IFC文件数据");
        }

        if (this.modelID === null || this.modelID < 0) {
            console.error("IFC模型打开失败");
            this.ifcApi.CloseModel(this.modelID || 0);
        }

        return null;
    }

    private async getAllGeometriesIds(): Promise<Set<number>> {
        const geometriesIds = new Set<number>();
        const geomTypesArray = Array.from(GeometryTypes);

        for (let i = 0; i < geomTypesArray.length; i++) {
            const category = geomTypesArray[i];
            try {
                const ids = await this.ifcApi.GetLineIDsWithType(this.modelID!, category);
                const idsSize = ids.size();
                for (let j = 0; j < idsSize; j++) {
                    geometriesIds.add(ids.get(j));
                }
            } catch (error) {
                console.error(`Error adding geometry IDs for category ${category}:`, error);
            }
        }

        return geometriesIds;
    }

    private processGeometryData(flatMesh: IFlatGeometry): void {
        const placedGeometries = flatMesh.geometries;
        const size = placedGeometries.size();
        const expressID = flatMesh.expressID;
        const entity: IIfcEntity = this.ifcApi.GetLine(this.modelID!, expressID);
        const guid = ifcGuidToUuid(entity.GlobalId.value)


        if (size > 1) {
            const meshes: BABYLON.Mesh[] = [];
            for (let i = 0; i < size; i++) {
                const placedGeometry = placedGeometries.get(i);
                const mesh = this.createGeometryMesh(placedGeometry, flatMesh.expressID);
                if (mesh) {
                    this.processMeshTransform(mesh);
                    this.assignMeshMaterial(placedGeometry, mesh);
                    if (this.isFreezeTransformMatrix) {
                        mesh.freezeWorldMatrix();
                    }
                    meshes.push(mesh);
                }
            }

            const mergedMesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
            if (mergedMesh) {
                mergedMesh.id = `${expressID}`;
                mergedMesh.name = guid;
                mergedMesh.parent = this.model;
            }
        } else if (size === 1) {
            const placedGeometry = placedGeometries.get(0);
            const mesh = this.createGeometryMesh(placedGeometry, flatMesh.expressID);
            if (mesh) {
                mesh.id = `${expressID}`;
                mesh.name = guid;
                this.assignMeshMaterial(placedGeometry, mesh);

                if (this.useInstancing) {
                    const geometryKey = mesh.metadata.geometryKey;
                    if (this.geometryCache.has(geometryKey)) {
                        const geometryMeshes = this.geometryCache.get(geometryKey)!;
                        geometryMeshes.push(mesh);
                    } else {
                        this.geometryCache.set(geometryKey, [mesh]);
                    }
                } else {
                    this.processMeshTransform(mesh);
                    mesh.isVisible = true;
                    if (this.isFreezeTransformMatrix) {
                        mesh.freezeWorldMatrix();
                    }
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

            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.indices = indexArray;

            // @ts-ignore
            geometry.delete();
            return vertexData;
        } catch (error) {
            console.warn("顶点数据创建失败:", error);
            return null;
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
        material.backFaceCulling = false;
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
     * 销毁资源
     */
    public dispose(): void {
        // 清理材质缓存
        this.materialCache.forEach(material => {
            if (!material.dispose) {
                material.dispose();
            }
        });
        this.materialCache.clear();

        // 清理材质映射
        this.materialsMap.clear();

        // 清理几何缓存
        this.geometryCache.clear();

        // 销毁模型
        if (this.model && !this.model.isDisposed) {
            this.model.dispose();
        }

        // 关闭IFC模型
        if (this.modelID !== null) {
            this.ifcApi.CloseModel(this.modelID);
        }
    }
}