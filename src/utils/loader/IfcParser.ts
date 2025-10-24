import { IfcCategoryMap } from '../ifc/ifc-category-map';
import { IfcElements } from "../ifc/ifc-elements-map";
import { GeometryTypes } from '../ifc/ifc-geometry-types';
import * as WEBIFC from "web-ifc";
import { getSpatialTree } from '../ifc/spatial-tree';


export interface IfcItemsCategories {
  [itemID: number]: number;
}
interface IfcProperties {
  [expressID: number]: {
    [attribute: string]: any;
  };
}


export class IfcParser {

  // 已加载数量
  public loadedCount: number = 0;

  /** WebIFC API实例 */
  private readonly webIfc = null;

  /** 是否递归地获取空间项的属性 */
  recursiveSpatial = true;

  /** 已访问的片段缓存 */
  private readonly visitedFragments = new Map<string, { index: number; fragment: any }>();

  /** 加载器配置 */
  settings = {
    excludedCategories: new Set<number>(),
    includedCategories: new Set<number>(),
    optionalCategories: [WEBIFC.IFCSPACE]
  };

  /** 元素ID到分类ID的映射 */
  categories: IfcItemsCategories = {};

  /** 元素ID到片段键的映射 */
  private elementToFragmentKeysMap: { [expressID: string]: number[] } = {};

  /** 当前片段键计数器 */
  private fragmentKeyCounter = 0;

  /** 几何体数据存储 */
  items: Record<string, {
    buffer: any[]; instances: Array<{
      color: any;
      matrix: any;
      expressID: number;
    }>
  }> = {};

  /** 片段键到片段ID的映射 */
  private fragmentKeyToIdMap: { [key: number]: string } = {};

  private psetLines?: WEBIFC.Vector<number> // 存储所有属性集（Pset）的行 ID
  private psetRelations?: number[][] // 存储属性集与元素之间的关系


  constructor(webIfc: any = null) {
    if (webIfc) {
      this.webIfc = webIfc
    } else {
      this.webIfc = new WEBIFC.IfcAPI()
    }
  }

  /**
   * 获取模型中所有元素的分类信息
   * @param modelID 模型ID
   */
  private getAllElementCategories(modelID: number): void {
    const elementsCategories: IfcItemsCategories = {};
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
  async load(data: Uint8Array | null = null, modelID: number | null = null): Promise<{
    modelID: number;
    data: Record<number, [number[], number[]]>;
    keyFragments: Record<number, string>;
    _groupSystems: Record<string, any>;
    properties: Record<string, any>;
    psetRelations: number[][];
    psetLines: WEBIFC.Vector<number>
  }> {
    if (data === null && modelID === null) {
      throw new Error('Either data or modelID must be provided');
    }
    let model: any;
    if (data) {
      model = {
        modelID: await this.readIfcFile(data),
        data: {},
        keyFragments: {},
        _groupSystems: {},
        properties: {}
      };
    } else {
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

    const { properties, psetLines, psetRelations, total } = await this.getModelProperties(model.modelID);

    model.properties = properties;
    this.psetRelations = psetRelations;
    this.psetLines = psetLines;
    const spatialTree = getSpatialTree({
      expandedIds: [],
      properties: model.properties,
      entities: [...Object.keys(model._groupSystems.entities), "IFCPROJECT", "IFCBUILDING", "IFCBUILDINGSTOREY"]
    })

    return {
      modelID: model.modelID,
      data: model.data,
      keyFragments: model.keyFragments,
      _groupSystems: {},
      properties: model.properties,
      psetRelations: this.psetRelations,
      psetLines: this.psetLines,
      ...spatialTree
    };
  }


  async readIfcFile(data: Uint8Array) {
    await this.webIfc.Init();
    return this.webIfc.OpenModel(data);
  }

  private getStructure(
    type: number,
    result: Set<number>,
    webIfc: WEBIFC.IfcAPI
  ) {
    const found = webIfc.GetLineIDsWithType(0, type);
    const size = found.size();
    for (let i = 0; i < size; i++) {
      const id = found.get(i);
      result.add(id);
    }
  }
  private async getAllGeometriesIDs(modelID: number, webIfc: WEBIFC.IfcAPI) {
    const placementIDs = new Set<number>();
    const structures = new Set<number>();
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

    const geometriesIDs = new Set<number>();
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
  async getModelProperties(modelID: number): Promise<IfcProperties> {
    const psetLines = this.webIfc.GetLineIDsWithType(
      modelID as number,
      WEBIFC.IFCRELDEFINESBYPROPERTIES
    )
    const psetRelations = []
    const geometriesIDs = await this.getAllGeometriesIDs(modelID, this.webIfc)
    const properties = {} as { [key: string]: any }
    properties.coordinationMatrix = this.webIfc.GetCoordinationMatrix(modelID);
    const allLinesIDs = await this.webIfc.GetAllLines(modelID);
    const linesCount = allLinesIDs.size();


    let counter = 0;
    for (let i = 0; i < linesCount; i++) {
      const id = allLinesIDs.get(i);
      let props;
      if (!geometriesIDs.has(id)) {
        try {
          props = await this.webIfc.GetLine(modelID, id);
        } catch (e) {
          console.log(`Properties of the element ${id} could not be processed`);
        }
        if (props) {
          if (props.type === 4186316022 && props.RelatedObjects) {
            psetRelations.push(props.RelatedObjects.map((item) => {
              if (item && item.value) return item.value
              return item
            }));
          }
        }
        properties[id] = props;

        counter++;
      }
    }
    return { properties, psetLines, psetRelations }
  }
  /**
   * 保存元素ID到片段键的映射关系
   * @param expressID 元素ID
   */
  private saveElementToFragmentMapping(expressID: string): void {
    if (!this.elementToFragmentKeysMap[expressID]) {
      this.elementToFragmentKeysMap[expressID] = [];
    }
    this.elementToFragmentKeysMap[expressID].push(this.fragmentKeyCounter);
  }

  /**
   * 生成模型数据结构
   * @param model 模型对象
   */
  private async generateModelData(model: {
    data: Record<number, [number[], number[]]>;
    keyFragments: Record<number, string>;
  }): Promise<void> {
    for (const id in this.items) {

      const { instances } = this.items[id];
      // const fragment = new FRAGS.Fragment(buffer, material, instances.length);
      this.fragmentKeyToIdMap[this.fragmentKeyCounter] = 'fragment.id';
      const previousIDs = new Set<number>();
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const { expressID } = instance;

        let isComposite = false;
        if (!previousIDs.has(expressID)) {
          previousIDs.add(expressID);
        } else {
          isComposite = true;
        }
        if (!isComposite) {
          this.saveElementToFragmentMapping(expressID.toString());
        }
      }
      this.fragmentKeyCounter++;
    }

    const itemsData: Record<number, [number[], number[]]> = {};
    for (const id in this.elementToFragmentKeysMap) {
      const keys: number[] = [];
      const rels: number[] = [];
      const idNum = parseInt(id, 10);
      const level = 0;

      const category = this.categories[idNum] || 0;
      rels.push(level, category);

      for (const key of this.elementToFragmentKeysMap[id]) {
        keys.push(key);
      }
      itemsData[idNum] = [keys, rels];
    }
    // model.data = itemsData;
    // model.keyFragments = this.fragmentKeyToIdMap;

  }
  private async readAllGeometries() {


    // Some categories (like IfcSpace) need to be created explicitly
    const optionals = this.settings.optionalCategories;

    // Force IFC space to be transparent
    if (optionals.includes(WEBIFC.IFCSPACE)) {
      const index = optionals.indexOf(WEBIFC.IFCSPACE);
      optionals.splice(index, 1);
      this.webIfc.StreamAllMeshesWithTypes(0, [WEBIFC.IFCSPACE], (mesh: any) => {
        if (this.isExcluded(mesh.expressID)) {
          return;
        }
        this.streamMesh(mesh, true);
      });
    }

    // Load rest of optional categories (if any)
    if (optionals.length) {
      this.webIfc.StreamAllMeshesWithTypes(0, optionals, (mesh: any) => {
        if (this.isExcluded(mesh.expressID)) {
          return;
        }
        this.streamMesh(mesh);
      });
    }

    // Load common categories
    // 生成相同expressID组和geometryID
    this.webIfc.StreamAllMeshes(0, (mesh: WEBIFC.FlatMesh) => {
      this.loadedCount++;
      if (this.isExcluded(mesh.expressID)) {
        return;
      }
      this.streamMesh(mesh);
      mesh.delete;
    });


  }

  streamMesh(
    mesh: WEBIFC.FlatMesh,
    forceTransparent = false
  ) {
    const size = mesh.geometries.size();
    for (let i = 0; i < size; i++) {
      const geometry = mesh.geometries.get(i);
      const geometryID = geometry.geometryExpressID;
      // Transparent geometries need to be separated
      const isColorTransparent = geometry.color.w !== 1;
      const isTransparent = isColorTransparent || forceTransparent;
      const prefix = isTransparent ? "-" : "+";
      const idWithTransparency = prefix + geometryID;
      if (forceTransparent) geometry.color.w = 0.1;

      if (!this.items[idWithTransparency]) {
        const buffer = this.newBufferGeometry(geometryID);
        if (!buffer) continue;
        this.items[idWithTransparency] = { buffer, instances: [] };
      }

      this.items[idWithTransparency].instances.push({
        color: { ...geometry.color },
        matrix: geometry.flatTransformation,
        expressID: mesh.expressID,
      });
    }

  }


  private newBufferGeometry(geometryID: number) {
    const geometry = this.webIfc.GetGeometry(0, geometryID);
    const verts = this.getVertices(geometry);
    if (!verts.length) return null;
    const indices = this.getIndices(geometry);
    if (!indices.length) return null;

    geometry.delete();
    return [];
  }

  private getIndices(geometryData: WEBIFC.IfcGeometry) {
    const indices = this.webIfc.GetIndexArray(
      geometryData.GetIndexData(),
      geometryData.GetIndexDataSize()
    ) as Uint32Array;
    return indices;
  }
  private getVertices(geometryData: WEBIFC.IfcGeometry) {
    const verts = this.webIfc.GetVertexArray(
      geometryData.GetVertexData(),
      geometryData.GetVertexDataSize()
    ) as Float32Array;
    return verts;
  }

  /**
   * 按实体类型分组模型元素
   * @param model 模型对象
   */
  private groupByEntityType(model: {
    data: Record<number, [number[], number[]]>;
    _groupSystems: Record<string, any>;
    keyFragments: Record<number, string>;
  }): void {
    if (!model._groupSystems.entities) {
      model._groupSystems.entities = {};
    }

    for (const expressID in model.data) {
      const [, type] = model.data[expressID][1]; // 获取分类类型
      const entityName = IfcCategoryMap[type].cn;
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
  private saveItemToGroup(
    group: {
      data: Record<string, [number[], number[]]>;
      keyFragments: Record<number, string>;
      _groupSystems: Record<string, any>;
    },
    systemName: string,
    className: string,
    expressID: string
  ): void {
    if (!group._groupSystems[systemName]) {
      group._groupSystems[systemName] = {};
    }
    const keys = group.data[expressID as any];

    if (!keys) return;
    for (const key of keys[0]) {
      const fragmentID = group.keyFragments[key];
      if (fragmentID) {
        const system = group._groupSystems[systemName];
        if (!system[className]) {
          system[className] = {};
        }
        if (!system[className][fragmentID]) {
          system[className][fragmentID] = new Set<string>();
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
  private isExcluded(id: number): boolean {
    const category = this.categories[id];
    return this.settings.excludedCategories.has(category);
  }
}