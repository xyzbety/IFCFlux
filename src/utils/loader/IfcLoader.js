import * as WEBIFC from "web-ifc";
import * as BABYLON from "@babylonjs/core";
import { EarthTool } from "@myfront/bimflux/dist/main/EarthTool";
import { cacheDB } from '@myfront/bimflux/dist/main/CacheDB';
import { IfcParser } from "@myfront/bimflux/dist/main/IfcParser";
import { GeometryTypes } from "@myfront/bimflux/dist/main/ifc/ifc-geometry-types";
/**
 * IFC模型加载器，用于加载和解析IFC文件并在Babylon.js场景中渲染
 */
export class IfcLoader {
    /**
     * 构造函数，初始化加载器
     * @param url IFC文件URL或File对象
     * @param scene Babylon.js场景实例
     * @param isEarth 是否显示地球
     */
    constructor(url, scene) {
        this.materialsMap = new Map(); // 材质映射表（按颜色ID分组存储网格）
        this.materialCache = new Map(); // 材质缓存（避免重复创建）
        this.geometryCache = new Map();
        this.camera = null; //摄像机对象，用于获取当前视角和位置 */
        // 经度
        this.longitude = 0;
        // 纬度
        this.latitude = 0;
        // 高度
        this.height = 0;
        // 是否显示地球
        this.isEarth = false;
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
        this.url = url;
        this.scene = scene;
        this.camera = this.scene.getCameraByName("EarthCamera");
        this.worldOrigin = EarthTool.worldOrigin;
        this.model = new BABYLON.Mesh('modelMesh', this.scene);
        this.ifcApi = new WEBIFC.IfcAPI();
        this.ifcApi.SetWasmPath('./', false);
    }
    /**
     * 加载并解析IFC模型
     * @returns 返回包含模型的根网格或null（加载失败时）
     */
    async load(longitude = 0, latitude = 0, height = 0) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.height = height;
        await this.loadFileToArrayBuffer();
        if (this.isParser) {
            const ifcParser = new IfcParser(this.ifcApi);
            this.ifcTree = await ifcParser.load(null, this.modelID);
            console.log('IFC树已加载,解析完成');
        }
        this.totalCount = this.ifcApi.GetIfcEntityList(this.modelID).length;
        try {
            this.model.setEnabled(false); // 禁用模型网格，避免加载时渲染
            const flatMeshes = this.ifcApi.LoadAllGeometry(this.modelID);
            this.totalCount = flatMeshes.size();
            const processMeshes = async () => {
                for (let i = 0; i < this.totalCount; i++) {
                    const mesh = flatMeshes.get(i);
                    this.processGeometryData(mesh); 
                    this.loadedCount++;
                    mesh.delete;
                    if (i % 200 === 0) await new Promise(r => setTimeout(r, 0));
                }
                // 清理资源
                flatMeshes.delete();
            };
            await processMeshes();
            // 处理同一几何，创建实例（webifc中 相同geometryExpressID 指向同一几何数据）
            if (this.useInstancing) {
                this.geometryCache.forEach((meshes) => {
                    if (meshes.length >= this.instanceThreshold) {
                        const rootMesh = meshes[0];
                        rootMesh.isVisible = false;
                        meshes.forEach((mesh) => {
                            const instance = rootMesh.createInstance(mesh.name);
                            this.processInstancedMeshTransform(mesh.metadata, instance);
                            instance.parent = this.model;
                            instance.metadata = mesh.metadata;
                            if (mesh.name !== rootMesh.name) {
                                mesh.dispose();
                            }
                        });
                        rootMesh.name = `inst_${rootMesh.name}`;
                    }
                    else {
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
            this.loadedCount = this.totalCount;
            this.loadedCount = this.totalCount;
            this.isComplete = true;
            // 关闭模型并返回结果
            this.model.setEnabled(true); 
            this.ifcApi.CloseModel(this.modelID);
        }
        catch (error) {
            console.error("IFC加载过程中发生错误:", error);
            return null;
        }
    }
    isWebUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        }
        catch (e) {
            return false;
        }
    }
    async loadBinary(url) {
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
        }
        catch (error) {
            console.error(`加载二进制文件失败: ${url}`, error);
            return null;
        }
    }
    async loadFileToArrayBuffer() {
        // 初始化web-ifc API
        await this.ifcApi.Init();
        // 处理不同类型的输入（URL或File对象）
        let buffer = null;
        if (this.url instanceof File) {
            // 如果是File对象，读取为ArrayBuffer
            buffer = await this.url.arrayBuffer();
        }
        else {
            const isWebUrl = this.isWebUrl(this.url);
            if (isWebUrl) {
                buffer = await this.loadBinary(this.url);
            }
        }
        if (buffer) {
            this.modelID = await this.ifcApi.OpenModel(new Uint8Array(buffer), {
                COORDINATE_TO_ORIGIN: false
            });
        }
        else {
            console.error("无法获取IFC文件数据");
        }
        if (this.modelID === null || this.modelID < 0) {
            console.error("IFC模型打开失败");
            this.ifcApi.CloseModel(this.modelID || 0);
        }
        return null;
    }
    async getAllGeometriesIds() {
        const geometriesIds = new Set();
        const geomTypesArray = Array.from(GeometryTypes);
        for (let i = 0; i < geomTypesArray.length; i++) {
            const category = geomTypesArray[i];
            try {
                const ids = await this.ifcApi.GetLineIDsWithType(this.modelID, category);
                const idsSize = ids.size();
                for (let j = 0; j < idsSize; j++) {
                    geometriesIds.add(ids.get(j));
                }
            }
            catch (error) {
                console.error(`Error adding geometry IDs for category ${category}:`, error);
            }
        }
        return geometriesIds;
    }

    processGeometryData(flatMeshe) {
        const placedGeometries = flatMeshe.geometries;
        const size = placedGeometries.size();
        const expressID = flatMeshe.expressID;
        if (size > 1) {
            const meshes = [];
            for (let i = 0; i < size; i++) {
                const placedGeometry = placedGeometries.get(i);
                const mesh = this.createGeometryMesh(placedGeometry, flatMeshe.expressID);
                if (mesh) {
                    this.processMeshTransform(mesh);
                    this.assignMeshMaterial(placedGeometry, mesh);
                    if (this.isFreezeTransformMatrix) {
                        mesh.freezeWorldMatrix();
                    }
                    if (this.isEarth) {
                        mesh.renderingGroupId = 17;
                    }
                    meshes.push(mesh);
                }
            }
            const mergedMesh = BABYLON.Mesh.MergeMeshes(meshes, true, true);
            mergedMesh.name = `${expressID}`;
            mergedMesh.id = `${expressID}`;
            mergedMesh.parent = this.model;
        }
        else if (size === 1) {
            const placedGeometry = placedGeometries.get(0);
            const mesh = this.createGeometryMesh(placedGeometry, flatMeshe.expressID);
            this.assignMeshMaterial(placedGeometry, mesh);
            if (this.useInstancing) {
                const geometryKey = mesh.metadata.geometryKey;
                if (this.geometryCache.has(geometryKey)) {
                    const geometryMehs = this.geometryCache.get(geometryKey);
                    geometryMehs.push(mesh);
                }
                else {
                    this.geometryCache.set(geometryKey, [mesh]);
                }
            }
            else {
                this.processMeshTransform(mesh);
                mesh.isVisible = true;
                if (this.isFreezeTransformMatrix) {
                    mesh.freezeWorldMatrix();
                }
                if (this.isEarth) {
                    mesh.renderingGroupId = 17;
                }
            }
        }
    }
    createGeometryMesh(geometry, expressID) {
        try {
            const geometryExpressID = geometry.geometryExpressID;
            const geometryKey = `${geometryExpressID}`;
            const expressIDKey = `${expressID}`;
            // 创建新几何并加入缓存
            const meshData = this.ifcApi.GetGeometry(this.modelID, geometryExpressID);
            if (!meshData || meshData.GetVertexDataSize() === 0)
                return null;
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
        }
        catch (error) {
            console.warn("几何网格创建失败:", error);
            return null;
        }
    }
    processMeshTransform(mesh) {
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
        }
        catch (error) {
            console.warn("mesh网格变换处理失败:", error);
        }
    }
    processInstancedMeshTransform(geometry, instance) {
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
            }
            else {
                console.warn("Matrix decomposition failed for mesh:", instance.name);
            }
        }
        catch (error) {
            console.warn("instancedMesh网格变换处理失败:", error);
        }
    }
    /**
   * 创建顶点数据
   * @param geometry 几何数据
   */
    createVertexData(geometry) {
        try {
            const vertexArray = this.ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
            const indexArray = this.ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
            // 创建Babylon顶点数据
            const vertexData = new BABYLON.VertexData();
            const { positions, normals } = this.extractPositionAndNormals(vertexArray);
            vertexData.positions = positions;
            vertexData.normals = normals;
            vertexData.indices = indexArray;
            //@ts-ignore
            geometry.delete();
            return vertexData;
        }
        catch (error) {
            console.warn("顶点数据创建失败:", error);
            return null;
        }
    }
    /**
   * 从顶点数组中提取位置和法线数据
   * @param vertices 原始顶点数据数组
   */
    extractPositionAndNormals(vertices) {
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
    assignMeshMaterial(geometry, mesh) {
        const color = geometry.color;
        const colorID = this.calculateColorID(color);
        if (this.isLineModel) {
            // mesh.material.wireframe = true; // 启用线框模式但是有对角线
            mesh.enableEdgesRendering();
            mesh.edgesColor = new BABYLON.Color4(color.x, color.y, color.z, color.w);
        }
        else {
            // // 获取或创建材质
            if (!this.materialCache.has(colorID)) {
                const material = this.createBabylonMaterial(color);
                this.materialCache.set(colorID, material);
            }
            mesh.material = this.materialCache.get(colorID);
        }
        // 添加网格到材质分组
        if (!this.materialsMap.has(colorID)) {
            this.materialsMap.set(colorID, []);
        }
        this.materialsMap.get(colorID).push(mesh);
    }
    /**
   * 创建Babylon材质
   * @param color 颜色数据
   */
    createBabylonMaterial(color) {
        const [r, g, b, a] = [color.x, color.y, color.z, color.w];
        const materialID = `mat_shader_${this.calculateColorID(color)}`;
        const material = new BABYLON.StandardMaterial(materialID, this.scene);
        // 设置基础颜色和透明度
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.alpha = a;
        // 禁用背面剔除
        material.backFaceCulling = false;
        material.reflectionTexture = null;
        material.environmentIntensity = 0;
        // 设置双面渲染
        material.sideOrientation = BABYLON.Mesh.DOUBLESIDE;
        return material;
    }
    /**
  * 计算颜色唯一标识
  * @param color 颜色对象
  */
    calculateColorID(color) {
        return (Math.floor(color.x * 255) +
            Math.floor(color.y * 255) +
            Math.floor(color.z * 255) +
            Math.floor(color.w * 255));
    }
}
