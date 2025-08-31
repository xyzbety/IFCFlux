import { IfcCategoryMap } from '../ifc/ifc-category-map';
import { IfcElements } from "../ifc/ifc-elements-map";
import { GeometryTypes } from '../ifc/ifc-geometry-types';
import * as WEBIFC from "web-ifc";
import { getSpatialTree } from '../ifc/spatial-tree';
export class IfcParser {
    constructor(webIfc = null) {
        /** WebIFC API实例 */
        this.webIfc = null;
        /** 是否递归地获取空间项的属性 */
        this.recursiveSpatial = true;
        /** 已访问的片段缓存 */
        this.visitedFragments = new Map();
        /** 加载器配置 */
        this.settings = {
            excludedCategories: new Set(),
            includedCategories: new Set(),
            optionalCategories: [WEBIFC.IFCSPACE]
        };
        /** 元素ID到分类ID的映射 */
        this.categories = {};
        /** 元素ID到片段键的映射 */
        this.elementToFragmentKeysMap = {};
        /** 当前片段键计数器 */
        this.fragmentKeyCounter = 0;
        /** 几何体数据存储 */
        this.items = {};
        /** 片段键到片段ID的映射 */
        this.fragmentKeyToIdMap = {};
        if (webIfc) {
            this.webIfc = webIfc;
        }
        else {
            this.webIfc = new WEBIFC.IfcAPI();
        }
    }
    /**
     * 获取模型中所有元素的分类信息
     * @param modelID 模型ID
     */
    getAllElementCategories(modelID) {
        const elementsCategories = {};
        const categoriesIDs = Object.keys(IfcElements).map((e) => parseInt(e, 10));
        for (let i = 0; i < categoriesIDs.length; i++) {
            const element = categoriesIDs[i];
            const lines = this.webIfc.GetLineIDsWithType(modelID, element);
            const size = lines.size();
            for (let i = 0; i < size; i++) {
                elementsCategories[lines.get(i)] = element;
            }
        }
        this.categories = elementsCategories;
    }
    /**
     * 加载IFC文件并解析模型数据
     * @param data IFC文件数据
     * @returns 解析后的模型对象
     */
    async load(data = null, modelID = null, onProgress = null) {
        if (data === null && modelID === null) {
            throw new Error('Either data or modelID must be provided');
        }
        let model;
        if (data) {
            model = {
                modelID: await this.readIfcFile(data),
                data: {},
                keyFragments: {},
                _groupSystems: {},
                properties: {}
            };
        }
        else {
            model = {
                modelID: modelID,
                data: {},
                keyFragments: {},
                _groupSystems: {},
                properties: {}
            };
        }
        await this.readAllGeometries();
        this.getAllElementCategories(model.modelID);
        this.generateModelData(model);
        this.groupByEntityType(model);
        model.properties = await this.getModelProperties(model.modelID, onProgress);
        const spatialTree = getSpatialTree({
            expandedIds: [],
            properties: model.properties,
            entities: [...Object.keys(model._groupSystems.entities), "IFCPROJECT", "IFCBUILDING", "IFCBUILDINGSTOREY"]
        });
        return {
            modelID: model.modelID,
            data: model.data,
            keyFragments: model.keyFragments,
            _groupSystems: {},
            properties: model.properties,
            ...spatialTree
        };
    }
    async readIfcFile(data) {
        await this.webIfc.Init();
        return this.webIfc.OpenModel(data);
    }
    getStructure(type, result, webIfc) {
        const found = webIfc.GetLineIDsWithType(0, type);
        const size = found.size();
        for (let i = 0; i < size; i++) {
            const id = found.get(i);
            result.add(id);
        }
    }
    async getAllGeometriesIDs(modelID, webIfc) {
        const placementIDs = new Set();
        const structures = new Set();
        this.getStructure(WEBIFC.IFCPROJECT, structures, webIfc);
        this.getStructure(WEBIFC.IFCSITE, structures, webIfc);
        this.getStructure(WEBIFC.IFCBUILDING, structures, webIfc);
        this.getStructure(WEBIFC.IFCBUILDINGSTOREY, structures, webIfc);
        this.getStructure(WEBIFC.IFCSPACE, structures, webIfc);
        for (const id of structures) {
            const properties = webIfc.GetLine(0, id);
            const placementRef = properties.ObjectPlacement;
            if (!placementRef || placementRef.value === null) {
                continue;
            }
            const placementID = placementRef.value;
            placementIDs.add(placementID);
            const placementProps = webIfc.GetLine(0, placementID);
            const relPlacementID = placementProps.RelativePlacement;
            if (!relPlacementID || relPlacementID.value === null) {
                continue;
            }
            placementIDs.add(relPlacementID.value);
            const relPlacement = webIfc.GetLine(0, relPlacementID.value);
            const location = relPlacement.Location;
            if (location && location.value !== null) {
                placementIDs.add(location.value);
            }
        }
        const geometriesIDs = new Set();
        const geomTypesArray = Array.from(GeometryTypes);
        for (let i = 0; i < geomTypesArray.length; i++) {
            const category = geomTypesArray[i];
            // eslint-disable-next-line no-await-in-loop
            const ids = await webIfc.GetLineIDsWithType(modelID, category);
            const idsSize = ids.size();
            for (let j = 0; j < idsSize; j++) {
                const id = ids.get(j);
                if (placementIDs.has(id)) {
                    continue;
                }
                geometriesIDs.add(id);
            }
        }
        return geometriesIDs;
    }
    /**
     *
     * @param modelID
     */
    /**
     * 获取模型属性数据
     * @param modelID 模型ID
     * @returns 包含所有非几何元素属性的对象
     */
    async getModelProperties(modelID, onProgress = null) {
        const geometriesIDs = await this.getAllGeometriesIDs(modelID, this.webIfc);
        let properties = {};
        properties.coordinationMatrix = this.webIfc.GetCoordinationMatrix(modelID);
        const allLinesIDs = await this.webIfc.GetAllLines(modelID);
        const linesCount = allLinesIDs.size();
        const BATCH_SIZE = 1000;

        for (let i = 0; i < linesCount; i++) {
            const id = allLinesIDs.get(i);
            if (!geometriesIDs.has(id)) {
                try {
                    properties[id] = await this.webIfc.GetLine(modelID, id);
                }
                catch (e) {
                    console.log(`Properties of the element ${id} could not be processed`);
                }
            }

            if (i % BATCH_SIZE === 0) {
                // Silent processing
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        return properties;
    }
    /**
     * 保存元素ID到片段键的映射关系
     * @param expressID 元素ID
     */
    saveElementToFragmentMapping(expressID) {
        if (!this.elementToFragmentKeysMap[expressID]) {
            this.elementToFragmentKeysMap[expressID] = [];
        }
        this.elementToFragmentKeysMap[expressID].push(this.fragmentKeyCounter);
    }
    /**
     * 生成模型数据结构
     * @param model 模型对象
     */
    async generateModelData(model) {
        for (const id in this.items) {
            const { instances } = this.items[id];
            // const fragment = new FRAGS.Fragment(buffer, material, instances.length);
            this.fragmentKeyToIdMap[this.fragmentKeyCounter] = 'fragment.id';
            const previousIDs = new Set();
            for (let i = 0; i < instances.length; i++) {
                const instance = instances[i];
                const { expressID } = instance;
                let isComposite = false;
                if (!previousIDs.has(expressID)) {
                    previousIDs.add(expressID);
                }
                else {
                    isComposite = true;
                }
                if (!isComposite) {
                    this.saveElementToFragmentMapping(expressID.toString());
                }
            }
            this.fragmentKeyCounter++;
        }
        const itemsData = {};
        for (const id in this.elementToFragmentKeysMap) {
            const keys = [];
            const rels = [];
            const idNum = parseInt(id, 10);
            const level = 0;
            const category = this.categories[idNum] || 0;
            rels.push(level, category);
            for (const key of this.elementToFragmentKeysMap[id]) {
                keys.push(key);
            }
            itemsData[idNum] = [keys, rels];
        }
        model.data = itemsData;
        model.keyFragments = this.fragmentKeyToIdMap;
    }
    async readAllGeometries() {
        // Some categories (like IfcSpace) need to be created explicitly
        const optionals = this.settings.optionalCategories;
        // Force IFC space to be transparent
        if (optionals.includes(WEBIFC.IFCSPACE)) {
            const index = optionals.indexOf(WEBIFC.IFCSPACE);
            optionals.splice(index, 1);
            this.webIfc.StreamAllMeshesWithTypes(0, [WEBIFC.IFCSPACE], (mesh) => {
                if (this.isExcluded(mesh.expressID)) {
                    return;
                }
                this.streamMesh(mesh, true);
            });
        }
        // Load rest of optional categories (if any)
        if (optionals.length) {
            this.webIfc.StreamAllMeshesWithTypes(0, optionals, (mesh) => {
                if (this.isExcluded(mesh.expressID)) {
                    return;
                }
                this.streamMesh(mesh);
            });
        }
        // Load common categories
        this.webIfc.StreamAllMeshes(0, (mesh) => {
            if (this.isExcluded(mesh.expressID)) {
                return;
            }
            this.streamMesh(mesh);
        });
    }
    streamMesh(mesh, forceTransparent = false) {
        const size = mesh.geometries.size();
        for (let i = 0; i < size; i++) {
            const geometry = mesh.geometries.get(i);
            const geometryID = geometry.geometryExpressID;
            // Transparent geometries need to be separated
            const isColorTransparent = geometry.color.w !== 1;
            const isTransparent = isColorTransparent || forceTransparent;
            const prefix = isTransparent ? "-" : "+";
            const idWithTransparency = prefix + geometryID;
            if (forceTransparent)
                geometry.color.w = 0.1;
            if (!this.items[idWithTransparency]) {
                const buffer = this.newBufferGeometry(geometryID);
                if (!buffer)
                    continue;
                this.items[idWithTransparency] = { buffer, instances: [] };
            }
            this.items[idWithTransparency].instances.push({
                color: { ...geometry.color },
                matrix: geometry.flatTransformation,
                expressID: mesh.expressID,
            });
        }
    }
    newBufferGeometry(geometryID) {
        const geometry = this.webIfc.GetGeometry(0, geometryID);
        const verts = this.getVertices(geometry);
        if (!verts.length)
            return null;
        const indices = this.getIndices(geometry);
        if (!indices.length)
            return null;
        geometry.delete();
        return [];
    }
    getIndices(geometryData) {
        const indices = this.webIfc.GetIndexArray(geometryData.GetIndexData(), geometryData.GetIndexDataSize());
        return indices;
    }
    getVertices(geometryData) {
        const verts = this.webIfc.GetVertexArray(geometryData.GetVertexData(), geometryData.GetVertexDataSize());
        return verts;
    }
    /**
     * 按实体类型分组模型元素
     * @param model 模型对象
     */
    groupByEntityType(model) {
        if (!model._groupSystems.entities) {
            model._groupSystems.entities = {};
        }
        for (const expressID in model.data) {
            const [, type] = model.data[expressID][1]; // 获取分类类型
            const entityName = IfcCategoryMap[type];
            this.saveItemToGroup(model, "entities", entityName, expressID);
        }
    }
    /**
     * 保存元素到分组系统
     * @param group 模型分组对象
     * @param systemName 系统名称
     * @param className 分类名称
     * @param expressID 元素ID
     */
    saveItemToGroup(group, systemName, className, expressID) {
        if (!group._groupSystems[systemName]) {
            group._groupSystems[systemName] = {};
        }
        const keys = group.data[expressID];
        if (!keys)
            return;
        for (const key of keys[0]) {
            const fragmentID = group.keyFragments[key];
            // console.log('>>>keys', fragmentID);
            if (fragmentID) {
                const system = group._groupSystems[systemName];
                if (!system[className]) {
                    system[className] = {};
                }
                if (!system[className][fragmentID]) {
                    system[className][fragmentID] = new Set();
                }
                system[className][fragmentID].add(expressID);
            }
        }
    }
    /**
     * 检查元素是否在排除列表中
     * @param id 元素ID
     * @returns 是否被排除
     */
    isExcluded(id) {
        const category = this.categories[id];
        return this.settings.excludedCategories.has(category);
    }
}
