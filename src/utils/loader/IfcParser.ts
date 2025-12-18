import { IfcCategoryMap } from '../ifc/ifcCategoryMap';
import { IfcElements } from "../ifc/ifcElementsMap";
import { GeometryTypes } from '../ifc/ifcGeometryTypes';
import * as WEBIFC from "web-ifc";
import { getSpatialTree } from '../ifc/ifcStructureCreator';
import { ifcGuidToUuid } from '../ifc/ifcGuidConverter';

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

  /** 当前处理的模型ID */
  private currentModelID: number | null = null;

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
   * 带进度回调的模型加载方法
   * @param onProgress 进度回调函数
   * @param modelID 模型ID
   * @returns 解析后的模型对象
   */
  async loadWithProgress(onProgress: (percent: number) => void, modelID: number): Promise<{
    modelID: number;
    data: Record<number, [number[], number[]]>;
    keyFragments: Record<number, string>;
    _groupSystems: Record<string, any>;
    properties: Record<string, any>;
    psetRelations: number[][];
    psetLines: WEBIFC.Vector<number>;
    tree: any;
    ifcExpressIds: any;
  }> {
    const model = {
      modelID: modelID,
      data: {},
      keyFragments: {},
      _groupSystems: {},
      properties: {}
    };

    // 直接在主线程中处理属性，带进度回调
    const result = await this.getModelPropertiesWithProgress(modelID, onProgress);
    const { properties, psetLines, psetRelations, total } = result;

    model.properties = properties;
    this.psetRelations = psetRelations;
    this.psetLines = psetLines;
    const spatialTree = getSpatialTree({
      expandedIds: [],
      properties: model.properties,
      entities: ["IFCPROJECT", "IFCBUILDING", "IFCBUILDINGSTOREY"]
    });

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
    this.currentModelID = this.webIfc.OpenModel(data);
    return this.currentModelID;
  }

  private getStructure(modelID: number, type: number, result: { [key: number]: boolean }, webIfc: WEBIFC.IfcAPI) {
    const found = webIfc.GetLineIDsWithType(modelID, type);
    const size = found.size();
    for (let i = 0; i < size; i++) {
      const id = found.get(i);
      result[id] = true;
    }
  }

  private async getAllGeometriesIDs(modelID: number, webIfc: WEBIFC.IfcAPI): Promise<number[]> {
    // 使用对象来避免Set大小限制
    const placementIDs: { [key: number]: boolean } = {};
    const structures: { [key: number]: boolean } = {};

    // 使用正确的modelID
    this.getStructure(modelID, WEBIFC.IFCPROJECT, structures, webIfc);
    this.getStructure(modelID, WEBIFC.IFCSITE, structures, webIfc);
    this.getStructure(modelID, WEBIFC.IFCBUILDING, structures, webIfc);
    this.getStructure(modelID, WEBIFC.IFCBUILDINGSTOREY, structures, webIfc);
    this.getStructure(modelID, WEBIFC.IFCSPACE, structures, webIfc);

    for (const id of Object.keys(structures).map(Number)) {
      try {
        const properties = webIfc.GetLine(modelID, id);
        if (!properties) continue;

        const placementRef = properties.ObjectPlacement;
        if (!placementRef || placementRef.value === null) {
          continue;
        }
        const placementID = placementRef.value;
        placementIDs[placementID] = true;

        const placementProps = webIfc.GetLine(modelID, placementID);
        if (!placementProps) continue;

        const relPlacementID = placementProps.RelativePlacement;
        if (!relPlacementID || relPlacementID.value === null) {
          continue;
        }

        placementIDs[relPlacementID.value] = true;
        const relPlacement = webIfc.GetLine(modelID, relPlacementID.value);
        if (!relPlacement) continue;

        const location = relPlacement.Location;
        if (location && location.value !== null) {
          placementIDs[location.value] = true;
        }
      } catch (error) {
        console.warn(`处理结构元素 ${id} 时出错:`, error);
      }
    }

    // 使用数组来避免Set大小限制
    const geometriesIDs: number[] = [];
    const geomTypesArray = Array.from(GeometryTypes);

    for (let i = 0; i < geomTypesArray.length; i++) {
      const category = geomTypesArray[i];
      try {
        const ids = webIfc.GetLineIDsWithType(modelID, category);
        const idsSize = ids.size();
        for (let j = 0; j < idsSize; j++) {
          const id = ids.get(j);
          if (placementIDs[id]) {
            continue;
          }
          geometriesIDs.push(id);
        }
      } catch (error) {
        console.warn(`获取几何类型 ${category} 时出错:`, error);
      }
    }

    // console.log(`找到 ${geometriesIDs.length} 个几何体元素`);
    return geometriesIDs;
  }
  /**
   * 
   * @param modelID 
   */

  /**
   * 带进度回调的模型属性获取方法（性能优化版）
   * @param modelID 模型ID
   * @param onProgress 进度回调函数
   * @returns 包含所有非几何元素属性的对象
   */
  async getModelPropertiesWithProgress(modelID: number, onProgress: (percent: number) => void): Promise<IfcProperties> {
    console.log(`开始获取模型属性，模型ID: ${modelID}`);

    const psetLines = this.webIfc.GetLineIDsWithType(
      modelID as number,
      WEBIFC.IFCRELDEFINESBYPROPERTIES
    );
    const psetRelations = [];
    const properties = {} as { [key: string]: any };
    properties.coordinationMatrix = this.webIfc.GetCoordinationMatrix(modelID);

    const types = this.webIfc.GetAllTypesOfModel(modelID);

    // 使用流式处理，避免一次性加载所有几何ID
    const geometriesIDs = await this.getAllGeometriesIDs(modelID, this.webIfc);
    // 使用对象作为集合，避免Set的大小限制
    const geometriesSet: { [key: number]: boolean } = {};
    for (const id of geometriesIDs) {
      geometriesSet[id] = true;
    }

    let totalProcessed = 0;
    const startTime = Date.now();

    // 智能类型处理策略：先处理小类型，大类型采用更优化的并行策略
    const smallTypes = [];
    const largeTypes = [];

    // 计算总非几何元素数量（实际要处理的元素）- 优化版：避免重复遍历
    let totalNonGeometryElements = 0;
    const typeEntries = Object.values(types);

    for (const type of typeEntries) {
      const ids = this.webIfc.GetLineIDsWithType(modelID, type.typeID);
      const idsSize = ids.size();

      if (idsSize === 0) continue;

      // 统计非几何元素数量
      let typeNonGeometryCount = 0;
      for (let i = 0; i < idsSize; i++) {
        const id = ids.get(i);
        if (!geometriesSet[id]) {
          typeNonGeometryCount++;
        }
      }

      totalNonGeometryElements += typeNonGeometryCount;

      // 超过1000个元素的类型视为大类型
      if (idsSize > 1000) {
        largeTypes.push({ type, idsSize, ids, nonGeometryCount: typeNonGeometryCount });
      } else {
        smallTypes.push({ type, idsSize, ids, nonGeometryCount: typeNonGeometryCount });
      }
    }

    console.log(`总元素数量: ${totalNonGeometryElements} (非几何元素)`);

    // 如果没有元素要处理，直接返回
    if (totalNonGeometryElements === 0) {
      onProgress(100);
      return { properties, psetLines, psetRelations, total: 0 };
    }

    // 进度更新优化：使用防抖和阈值控制
    let lastProgress = 0;
    const updateProgress = (processed: number) => {
      const progress = Math.min(100, Math.round((processed / totalNonGeometryElements) * 100));
      // 只有当进度变化超过1%时才更新，避免频繁回调
      if (progress > lastProgress + 1 || progress === 100) {
        onProgress(progress);
        lastProgress = progress;
      }
    };

    // 先并行处理所有小类型
    const smallTypePromises = smallTypes.map(async ({ type, idsSize, ids, nonGeometryCount }) => {
      try {
        // 收集非几何元素ID
        const nonGeometryIds: number[] = [];
        for (let i = 0; i < idsSize; i++) {
          const id = ids.get(i);
          if (!geometriesSet[id]) {
            nonGeometryIds.push(id);
          }
        }

        if (nonGeometryIds.length === 0) return 0;

        // 对小类型使用较大的批次大小
        const batchSize = Math.min(100, Math.max(20, nonGeometryIds.length));
        let typeProcessed = 0;

        // 批量并行处理
        for (let i = 0; i < nonGeometryIds.length; i += batchSize) {
          const batchIds = nonGeometryIds.slice(i, i + batchSize);

          // 并行处理当前批次
          const batchPromises = batchIds.map(async (id) => {
            try {
              const props = await this.webIfc.GetLine(modelID, id);
              if (props) {
                if (props.GlobalId) {
                  props.GlobalId.value = ifcGuidToUuid(props.GlobalId.value);
                }
                if (props.type === 4186316022 && props.RelatedObjects) {
                  psetRelations.push(props.RelatedObjects.map((item) => {
                    if (item && item.value) return item.value;
                    return item;
                  }));
                }
                properties[id] = props;
                return 1;
              }
            } catch (e) {
              // 静默处理错误
            }
            return 0;
          });

          const batchResults = await Promise.allSettled(batchPromises);
          const successfulCount = batchResults.reduce((count, result) => {
            if (result.status === 'fulfilled' && result.value === 1) {
              return count + 1;
            }
            return count;
          }, 0);

          typeProcessed += successfulCount;
          totalProcessed += successfulCount;

          // 优化进度更新：只在批次结束时更新，避免频繁回调
          updateProgress(totalProcessed);
        }

        return typeProcessed;

      } catch (error) {
        console.warn(`处理小类型 ${type.typeID} 时出错:`, error);
        return 0;
      }
    });

    // 等待小类型处理完成
    const smallTypeResults = await Promise.allSettled(smallTypePromises);
    const smallTypeTotal = smallTypeResults.reduce((sum, result) => {
      if (result.status === 'fulfilled') {
        return sum + result.value;
      }
      return sum;
    }, 0);

    // 优化大类型处理：使用更智能的并行策略
    const largeTypePromises = largeTypes.map(async ({ type, idsSize, ids, nonGeometryCount }) => {
      try {
        // 收集非几何元素ID
        const nonGeometryIds: number[] = [];
        for (let i = 0; i < idsSize; i++) {
          const id = ids.get(i);
          if (!geometriesSet[id]) {
            nonGeometryIds.push(id);
          }
        }

        if (nonGeometryIds.length === 0) return 0;

        // 对大类型使用更优化的批次策略
        const elementCount = nonGeometryIds.length;
        let batchSize = 50; // 默认批次大小
        let concurrency = 5; // 默认并发数

        if (elementCount > 100000) {
          batchSize = 100;
          concurrency = 3; // 超大型类型减少并发数
        } else if (elementCount > 10000) {
          batchSize = 75;
          concurrency = 4;
        }

        let typeProcessed = 0;
        let batchIndex = 0;

        // 使用并发控制处理大类型
        while (batchIndex < nonGeometryIds.length) {
          // 准备当前批次
          const currentBatch = [];
          for (let i = 0; i < concurrency && batchIndex < nonGeometryIds.length; i++) {
            const batchStart = batchIndex;
            const batchEnd = Math.min(batchIndex + batchSize, nonGeometryIds.length);
            const batchIds = nonGeometryIds.slice(batchStart, batchEnd);
            currentBatch.push(batchIds);
            batchIndex = batchEnd;
          }

          // 并行处理当前批次组
          const batchGroupPromises = currentBatch.map(async (batchIds) => {
            const batchPromises = batchIds.map(async (id) => {
              try {
                const props = await this.webIfc.GetLine(modelID, id);
                if (props) {
                  if (props.GlobalId) {
                    props.GlobalId.value = ifcGuidToUuid(props.GlobalId.value);
                  }
                  if (props.type === 4186316022 && props.RelatedObjects) {
                    psetRelations.push(props.RelatedObjects.map((item) => {
                      if (item && item.value) return item.value;
                      return item;
                    }));
                  }
                  properties[id] = props;
                  return 1;
                }
              } catch (e) {
                // 静默处理错误
              }
              return 0;
            });

            const batchResults = await Promise.allSettled(batchPromises);
            return batchResults.reduce((count, result) => {
              if (result.status === 'fulfilled' && result.value === 1) {
                return count + 1;
              }
              return count;
            }, 0);
          });

          const batchGroupResults = await Promise.allSettled(batchGroupPromises);
          const successfulCount = batchGroupResults.reduce((count, result) => {
            if (result.status === 'fulfilled') {
              return count + result.value;
            }
            return count;
          }, 0);

          typeProcessed += successfulCount;
          totalProcessed += successfulCount;

          // 优化进度更新：只在批次组结束时更新
          updateProgress(totalProcessed);

          // 定期给GC时间，但只在处理大量数据时
          if (typeProcessed % 5000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }

        return typeProcessed;

      } catch (error) {
        console.warn(`处理大类型 ${type.typeID} 时出错:`, error);
        return 0;
      }
    });

    // 等待所有大类型处理完成
    const largeTypeResults = await Promise.allSettled(largeTypePromises);
    const largeTypeTotal = largeTypeResults.reduce((sum, result) => {
      if (result.status === 'fulfilled') {
        return sum + result.value;
      }
      return sum;
    }, 0);

    // 确保最终进度显示100%
    onProgress(100);

    const totalTime = Date.now() - startTime;
    console.log(`属性获取完成，小类型: ${smallTypeTotal} 个, 大类型: ${largeTypeTotal} 个, 总耗时: ${totalTime}ms`);

    return { properties, psetLines, psetRelations, total: totalNonGeometryElements };
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
      // 立即释放WebAssembly内存
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

  /**
   * 清理内存和资源
   * 在解析完成后调用此方法释放WebAssembly内存和其他资源
   */
  public dispose(): void {
    try {
      // 清理WebAssembly相关资源
      if (this.currentModelID !== null && this.webIfc && this.webIfc.CloseModel) {
        this.webIfc.CloseModel(this.currentModelID);
        this.currentModelID = null;
      }

      // 清理属性集相关数据
      if (this.psetLines && this.psetLines.delete) {
        this.psetLines.delete();
        this.psetLines = undefined;
      }

      // 清理所有缓存数据
      this.categories = {};
      this.elementToFragmentKeysMap = {};
      this.fragmentKeyToIdMap = {};
      this.items = {};
      this.psetRelations = undefined;

      // 清理配置和缓存
      this.settings.excludedCategories.clear();
      this.settings.includedCategories.clear();
      this.settings.optionalCategories = [WEBIFC.IFCSPACE];

      // 清理已访问的片段缓存
      this.visitedFragments.clear();

      // 重置计数器
      this.fragmentKeyCounter = 0;
      this.loadedCount = 0;

      console.log('IFC解析器内存清理完成');
    } catch (error) {
      console.warn('清理IFC解析器内存时出错:', error);
    }
  }
}