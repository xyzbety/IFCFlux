// 导入 web-ifc 库的核心功能，以及用于处理向量、颜色和属性的特定类
import { IfcAPI, Vector, Color, Properties } from 'web-ifc'
// 导入 web-ifc 库中定义的特定 IFC 实体类型常量
import { IFCPROJECT, IFCRELDEFINESBYPROPERTIES, IFCSPACE, IFCRELASSOCIATESCLASSIFICATION } from 'web-ifc'
// 导入 proj4 库，用于坐标系转换
import proj4 from 'proj4'
// 导入 Node.js 的 crypto 模块中的 webcrypto API，用于生成加密安全的随机数
// const { webcrypto } = require('crypto');
import { GeometryTypes } from './ifcGeometryTypes';
import { IfcElements } from "./ifcElementsMap";
// 从本地工具文件中导入辅助函数、常量和类型定义
import {
  getHash,
  DummyElementsSet,
  RelationElementsSet,
  PropNames,
  IfcTypesMap,

} from './ifcUtils'
import {
  IFCParserProps,
  IExportMesh,
  ExportMeshes,
  IGeometryReference,
  IMaterial,
  INode,
  IGeometryReferences,
  IChunk
} from './ifcTypes'

// 定义 IFC 解析器类
export class IFCParser {
  private ifcapi: any // web-ifc API 的实例
  private fileId: string // 文件的唯一标识符
  private modelId?: number // IFC 模型的 ID，由 web-ifc API 打开模型后返回
  private startTime?: number // 解析开始时间，用于性能测量
  private endTime?: number // 解析结束时间，用于性能测量
  private types: any // 存储模型中所有元素的类型映射（expressID -> 类型）
  private psetLines?: Vector<number> // 存储所有属性集（Pset）的行 ID
  private psetRelations?: number[][] // 存储属性集与元素之间的关系
  private properties?: any // 存储模型中所有解析出的属性
  private allElementsPropsIdMap: { [key: number]: number[] } = {}; // 存储所有元素的属性ID映射
  private propCache: { [key: number]: any } = {} // 属性缓存，避免重复解析
  private geometryReferences: IGeometryReferences = {} // 几何引用，存储每个元素对应的几何体ID
  private exportMeshes: IExportMesh[] = []; // 存储所有物理元素的几何网格数据
  private dummyExportMeshes: IExportMesh[] = []; // 存储所有虚拟元素（如 IfcSpace）的几何网格数据
  private exportMeshesMap: { [key: number]: IExportMesh[] } = {}; // 映射表：元素 expressID -> 其对应的物理几何网格数组
  private dummyExportMeshesMap: { [key: number]: IExportMesh[] } = {}; // 映射表：元素 expressID -> 其对应的虚拟几何网格数组
  //@ts-ignore
  private spatialNodeCount: number = 0 // 空间结构节点的计数器
  //@ts-ignore
  private geometryIdsCount: number = 0 // 几何体ID的计数器
  private ifcRelContainedInSpatialStructure: { [key: string]: any } = {}; // 存储“包含在空间结构中”的关系
  private ifcRelAggregates: { [key: string]: any } = {}; // 存储“聚合”关系

  public invertTypeMap: { [key: string]: number } = {}; // 对实体类型字典翻转（类型名 -> 类型ID）
  public physicalElements: { [key: string]: any } = {}; // 存储过滤后的物理实体元素
  public dummyElements: { [key: string]: any } = {}; // 存储过滤后的虚拟元素（如空间）
  public relationElements: { [key: string]: any } = {}; // 存储过滤后的关系元素
  public classficationLines: Vector<number>; // IfcRelAssociatesClassification 类型的行ID集合
  public defindsByTypePropsIdMap: { [key: number]: number[] } = {}; // IFCRELDEFINESBYTYPE 定义的属性集


  constructor(props: IFCParserProps) {
    const { fileId } = props
    this.ifcapi = new IfcAPI() // 初始化 web-ifc API
    this.ifcapi.SetWasmPath('/web-ifc/', false) // 设置 wasm 文件的路径
    this.fileId = fileId // 保存文件 ID
  }

  // 解析 IFC 文件数据
  async parse(data: File, detail_level: number, containing_geometry: boolean = false) {
    await this.ifcapi.Init() // 初始化 ifcapi
    // @ts-ignore
    // 打开模型数据，并设置一些解析参数
    const buffer = await data.arrayBuffer()
    this.modelId = this.ifcapi.OpenModel(new Uint8Array(buffer), {
      COORDINATE_TO_ORIGIN: false, // 不将坐标系移动到原点
      // OPTIMIZE_PROFILES: true, // 优化轮廓
      CIRCLE_SEGMENTS: detail_level, // 设置圆的线段数，影响几何精细度
      // MEMORY_LIMIT: 8294967296, // 内存限制
      // TAPE_SIZE: 6, // 磁带大小
      // LINEWRITER_BUFFER: 4267296 // 行写入器缓冲区
    })

    this.startTime = performance.now() // 记录解析开始时间

    // 预填充模型中所有元素的类型
    this.types = await this.getAllTypesOfModel()

    // 预先缓存属性集、它们与对象的关系，以及所有属性
    const { psetLines, psetRelations, properties, allElementsPropsIdMap } = await this.getAllProps()
    this.psetLines = psetLines
    this.psetRelations = psetRelations
    this.properties = properties
    this.allElementsPropsIdMap = allElementsPropsIdMap
    if (!containing_geometry) {
      return;
    }
    // 获取所有分类关联关系的行ID
    this.classficationLines = this.ifcapi.GetLineIDsWithType(
      this.modelId as number,
      IFCRELASSOCIATESCLASSIFICATION
    )
    // 创建并保存几何体；本地只存储引用

    this.geometryReferences = await this.createAndSaveMeshes()

    // 创建并保存空间树，同时填充属性和几何引用
    this.spatialNodeCount = 0
    const structure = await this.createSpatialStructure()
    // console.log('1111', this.ifcapi.modelSchemaList) // 打印模型的 schema 列表
    // 返回根结构节点的 ID 和其闭包长度
    return { id: structure.id, tCount: structure.closureLen }
  }

  // 获取工地的坐标
  async getSiteCoord() {
    const siteCoordinates = []
    // 确保 parse 方法已经被调用并完成
    if (!this.properties) {
      throw new Error('parse方法还未执行或未完成');
    }

    // 筛选出类型为 "IFCSITE" 的属性
    const ifcSS = Object.values(this.properties as Record<string, {
      RefLatitude: GeographicCoordinate
      RefLongitude: GeographicCoordinate
      RefElevation: any
      type: string;
    }>).filter(prop => prop.type === "IFCSITE");

    const ifcSiteData = ifcSS[0]; // 获取第一个 IFCSITE 数据

    // 查找具有非空坐标值的 IFCSITE
    const siteWithNonNull1Values = ifcSS.find(site =>
      site.RefLatitude !== null &&
      site.RefLongitude !== null &&
      site.RefElevation !== null
    );
    // console.log('ttt', siteWithNonNull1Values);

    // 如果不存在 IFCSITE 实体，则返回默认坐标 [0,0,0]
    if (ifcSiteData === undefined) {
      return [0, 0, 0];
    } else {
      // 转换纬度和经度为十进制
      let rlati = convertToDecimalDegrees(normalizeCoordinates(ifcSiteData.RefLatitude));
      let rlong = convertToDecimalDegrees(normalizeCoordinates(ifcSiteData.RefLongitude));

      // 定义源坐标系 (WGS 84) 和目标坐标系 (Web Mercator)
      const fromProjection = 'EPSG:4326'; // WGS 84
      const toProjection = 'EPSG:3857'; // Web Mercator


      // 使用 proj4 进行坐标转换
      const coordResult = await this.convertCoordinates(rlati, rlong);

      //  proj4(fromProjection, toProjection, [rlong, rlati]);

      let refElevation = ifcSiteData.RefElevation ?? 0; // 获取高程，如果不存在则为 0
      // console.log("refLongitude:", refLongitude.toFixed(8), "refLatitude:", refLatitude, "refElevation:", refElevation);
      siteCoordinates.push(coordResult.refLongitude, coordResult.refLatitude, refElevation)


      // 返回工地坐标
      return siteCoordinates;
    }
  }
  // 使用 proj4 库转换坐标
  public async convertCoordinates(rlati: number, rlong: number) {
    // 定义坐标系的EPSG编码
    const fromProjection = 'EPSG:4326'; // WGS 84
    const toProjection = 'EPSG:3857'; // Web Mercator

    // 使用 proj4 进行坐标转换
    const [refLongitude, refLatitude] = proj4(fromProjection, toProjection, [rlong, rlati]);

    // 返回转换后的经纬度
    return { refLongitude, refLatitude };
  }



  // 方法用于遍历和分类所有元素
  public async getAllElements(projectGuid: any) {
    // 检查属性是否已定义
    if (!this.properties) {
      console.log('No properties to display.');
      return;
    }

    // 获取 properties 对象的所有键 (expressID)
    const keys = Object.keys(this.properties);

    await this.invertMap(); // 创建反向类型映射
    // console.log('dict:', this.invertTypeMap)
    let storeys: { [key: string]: any } = {} // 用于存储楼层信息
    // 遍历所有键
    let entityId = 1;
    for (const key of keys) {
      const value = this.properties[key];
      if (DummyElementsSet.includes(value.type)) {
        // 如果元素是虚拟元素 (如 IfcSpace), 存入 dummyElements
        const dic = {
          "id": entityId,
          "guid": formatGuid(value.GlobalId),
          "extid": value.GlobalId ?? null,
          "name": value.Name ?? null,
          "description": value.Description ?? null,
          "tag": value.Tag ?? null,
          "in_model": projectGuid,
          "in_project": null,
          "in_site": null,
          "in_building": null,
          "in_storey": null,
          "of_category": value.type ?? null,
          "of_family": value.PredefinedType ?? null,
          "of_type": value.ObjectType ?? null,
          "of_level": null, // 待定: 找到当前构件所属的BuildingStorey的Name值，即为标高
          "of_discipline": null
        };
        this.dummyElements[key] = dic;
        entityId++;
        if (value.type === "IFCBUILDINGSTOREY") {
          storeys[dic.guid] = dic.name; // 如果是楼层，则记录其名称
        }
      } else if (RelationElementsSet.includes(value.type)) {
        // 如果元素是关系元素 (如 IfcRelAggregates), 存入 relationElements
        let relating_object_id = null;
        let related_object_ids = null;
        const values = Object.values(value);
        if (Array.isArray(values[6])) { // 判断关联对象的结构
          relating_object_id = values[7];
          related_object_ids = values[6];
        } else {
          relating_object_id = values[6];
          related_object_ids = Array.isArray(values[7]) ? values[7] : [values[7]];
        }
        const obj = await this.ifcapi.GetLine(this.modelId, relating_object_id);
        const relating_object = obj ? formatGuid(obj.GlobalId.value) : null;
        let related_objects = []
        for (const line_id of related_object_ids) {
          const obj = await this.ifcapi.GetLine(this.modelId, line_id);
          if (!obj) continue;
          related_objects.push(formatGuid(obj.GlobalId.value));
        }

        const dic = {
          "id": entityId,
          "guid": formatGuid(value.GlobalId),
          "extid": value.GlobalId ?? null,
          "name": value.Name ?? null,
          "description": value.Description ?? null,
          "in_model": projectGuid,
          "rel_type": value.type ?? null,
          "relating_object": relating_object,
          "related_objects": related_objects
        };
        this.relationElements[key] = dic;
        // 如果是空间包含关系，记录下来
        if (relating_object && value.type == 'IFCRELCONTAINEDINSPATIALSTRUCTURE') {
          this.ifcRelContainedInSpatialStructure[relating_object] = related_objects;
        }
        // 如果是聚合关系，记录下来
        if (relating_object && value.type == 'IFCRELAGGREGATES') {
          this.ifcRelAggregates[relating_object] = related_objects;
        }
        entityId++;
      } else if (IfcElements.hasOwnProperty(this.invertTypeMap[value.type])) {
        // 如果是物理元素, 存入 physicalElements
        const dic = {
          "id": entityId,
          "guid": formatGuid(value.GlobalId),
          "extid": value.GlobalId ?? null,
          "name": value.Name ?? null,
          "description": value.Description ?? null,
          "tag": value.Tag ?? null,
          "in_model": projectGuid,
          "in_project": null,
          "in_site": null,
          "in_building": null,
          "in_storey": null,
          "of_category": value.type ?? null,
          "of_family": value.PredefinedType ?? null,
          "of_type": value.ObjectType ?? null,
          "of_level": null, // 待定: 找到当前构件所属的BuildingStorey的Name值，即为标高
          "of_discipline": null
        };
        this.physicalElements[key] = dic;
        entityId++;
      }
    }
    // 根据空间包含关系，更新物理和虚拟元素的楼层信息
    Object.entries(this.ifcRelContainedInSpatialStructure).forEach(([key, value]) => {

      for (const phy of Object.values(this.physicalElements)) {
        if (value.includes(phy.guid)) {
          phy.in_storey = key;
          phy.of_level = storeys[key] ?? null;
        }
      }

      for (const dummy of Object.values(this.dummyElements)) {
        if (value.includes(dummy.guid)) {
          dummy.in_storey = key;
          dummy.of_level = storeys[key] ?? null;
        }
      }
    });

    // 根据聚合关系，更新虚拟元素（主要是IfcSpace）的楼层信息
    Object.entries(this.ifcRelAggregates).forEach(([key, value]) => {

      for (const dummy of Object.values(this.dummyElements)) {
        if (dummy.of_category == 'IFCSPACE' && value.includes(dummy.guid)) {
          dummy.in_storey = key;
          dummy.of_level = storeys[key] ?? null;
        }
      }
    });

  }

  // 获取所有 Element 属性的数据
  public async getAllElementsProps() {
    return this.allElementsPropsIdMap;
  }

  // 获取包含实体几何数据的 mesh 映射表
  // 描述的是一个实体 Element 和几何 ShapeRepresentation 之间的关系
  public async getExportMeshesMap() {
    return this.exportMeshesMap;
  }

  // 获取包含虚拟几何数据的 mesh 映射表
  // 描述的是一个虚拟 Element 和几何 ShapeRepresentation 之间的关系
  public async getDummyExportMeshesMap() {
    return this.dummyExportMeshesMap;
  }


  // 获取所有的实体几何相关数据，存储在 exportMeshes 中
  public async getAllExportMeshes() {
    return this.exportMeshes;
  }

  // 获取所有的虚拟实体几何相关数据，存储在 dummyExportMeshes 中
  public async getAllDummyExportMeshes() {
    return this.dummyExportMeshes;
  }


  // 对字典 Map 进行键值对翻转
  public invertMap(): void {
    const invertedMap: { [key: string]: number } = {};
    Object.entries(IfcTypesMap).forEach(([key, value]) => {
      // 由于 Object.entries() 将键作为字符串返回，需要将键转换回数字
      invertedMap[value] = Number(key);
    });
    this.invertTypeMap = invertedMap;
  }

  // 创建空间结构树
  async createSpatialStructure(): Promise<INode> {
    const chunks = await this.getSpatialTreeChunks() // 获取空间关系的“块”
    const allProjectLines = await this.ifcapi.GetLineIDsWithType(
      this.modelId as number,
      IFCPROJECT
    )
    // 创建项目根节点
    const project = {
      expressID: allProjectLines.get(0),
      type: 'IFCPROJECT',
      export_type: 'Base',
      elements: [],
      closure: []
    } as INode

    // 递归填充空间节点
    await this.populateSpatialNode(project, chunks, [], 0)

    this.endTime = performance.now() // 记录结束时间
    //@ts-ignore
    // 计算并添加解析时间
    project.parseTime = (this.endTime - this.startTime as number).toFixed(2) + 'ms'
    project.fileId = this.fileId

    return project
  }

  // 递归地填充空间节点
  async populateSpatialNode(node: INode, chunks: IChunk, closures: (Iterable<unknown> | null | undefined)[], depth?: number): Promise<string> {
    // @ts-ignore
    depth++
    closures.push([]) // 为当前节点的子节点创建一个新的闭包数组
    // 获取子节点（通过聚合和空间包含关系）
    await this.getChildren(node, chunks, PropNames.aggregates, closures, depth)
    await this.getChildren(node, chunks, PropNames.spatial, closures, depth)

    node.closure = [...new Set(closures.pop())] as string[] // 合并子节点的闭包，并去重

    // 获取几何信息，设置 displayValue
    // 将几何体 ID 添加到闭包中
    if (
      this.geometryReferences[node.expressID] &&
      this.geometryReferences[node.expressID].length !== 0
    ) {
      node['@displayValue'] = this.geometryReferences[node.expressID]
      node.closure.push(
        ...this.geometryReferences[node.expressID].map((ref) => ref.referencedId)
      )
    }
    node.closureLen = node.closure.length // 记录闭包长度
    node.__closure = this.formatClosure(node.closure) // 格式化闭包为字典
    node.id = getHash(node) // 计算节点的哈希 ID

    // 移除项目根节点的闭包，以减小体积
    if (depth === 1) {
      //@ts-ignore
      delete node.closure
    }
    return node.id
  }

  // 将闭包 ID 数组格式化为字典形式
  formatClosure(idsArray: string[]) {
    const cl: { [key: string]: 1 } = {}
    for (const id of idsArray) cl[id] = 1
    return cl
  }

  // 获取并处理一个节点的子节点
  async getChildren(node: INode, chunks: IChunk, propName: { name?: number; relating?: string; related?: string; key: any }, closures: any, _depth?: number) {
    const children = chunks[node.expressID] // 从关系块中获取子节点 ID
    if (!children) return
    const prop = propName.key as keyof INode
    const nodes: INode[] = []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      let cnode = this.createNode(child)
      cnode = { ...cnode, ...(await this.getItemProperties(cnode.expressID)) } // 获取子节点的属性
      cnode.id = await this.populateSpatialNode(cnode, chunks, closures) // 递归填充子节点

      // 将子节点的 ID 和闭包 ID 添加到父节点的闭包中
      for (const closure of closures) {
        closure.push(cnode.id)
        // 始终使用循环方式，避免展开运算符导致的栈溢出
        for (const id of cnode['closure']) closure.push(id)
      }

      //@ts-ignore
      delete cnode.closure // 处理完后删除子节点的闭包，以节省内存
      nodes.push(cnode)
    }

    // @ts-ignore
    // 将子节点作为引用添加到当前节点
    node[prop] = nodes.map((node) => ({
      export_type: 'reference',
      referencedId: node.id
    }))
  }

  // 获取一个元素的属性，使用缓存
  async getItemProperties(id: number) {
    if (this.propCache[id]) return this.propCache[id] // 如果缓存中有，直接返回

    let props = {}
    const directProps = this.properties[id.toString()] // 获取直接属性
    props = { ...directProps }

    const psetIds = []
    // 查找与此元素关联的属性集
    if (this.psetRelations && this.psetLines) {
      for (let i = 0; i < this.psetRelations.length; i++) {
        if (this.psetRelations[i].includes(id))
          psetIds.push(this.psetLines.get(i).toString())
      }
    }

    // 获取属性集的定义 ID
    const rawPsetIds = psetIds.map((id) =>
      this.properties[id].RelatingPropertyDefinition.toString()
    )
    // 获取属性集对象
    const rawPsets = rawPsetIds.map((id) => this.properties[id])
    for (const pset of rawPsets) {
      //@ts-ignore
      // 解包属性集并添加到属性对象中
      props[pset.Name] = this.unpackPsetOrComplexProp(pset)
    }

    this.propCache[id] = props // 将结果存入缓存
    return props
  }

  // 解包属性集或复杂属性
  unpackPsetOrComplexProp(pset: { HasProperties: any }) {
    const parsed: { [key: string]: any } = {}
    if (!pset.HasProperties || !Array.isArray(pset.HasProperties)) return parsed
    for (const id of pset.HasProperties) {
      const value = this.properties[id.toString()]
      if (value?.type === 'IFCCOMPLEXPROPERTY') {
        parsed[value.Name] = this.unpackPsetOrComplexProp(value) // 递归解包复杂属性
      } else if (value?.type === 'IFCPROPERTYSINGLEVALUE') {
        parsed[value.Name] = value.NominalValue // 获取单一属性值
      }
    }
    return parsed
  }

  // 获取空间树的关系“块”
  async getSpatialTreeChunks(): Promise<IChunk> {
    const treeChunks = {} as IChunk
    await this.getChunks(treeChunks, PropNames.aggregates) // 获取聚合关系
    await this.getChunks(treeChunks, PropNames.spatial) // 获取空间包含关系
    return treeChunks
  }

  // 获取指定关系类型的所有实例
  async getChunks(chunks: IChunk, propName: {
    name: number;
    relating: string;
    related: string;
    key: string;
  }) {
    const relation = await this.ifcapi.GetLineIDsWithType(this.modelId as number, propName.name)
    for (let i = 0; i < relation.size(); i++) {
      const rel = await this.ifcapi.GetLine(this.modelId as number, relation.get(i), false)
      this.saveChunk(chunks, propName, rel)
    }
  }

  // 保存关系数据到“块”中
  saveChunk(chunks: IChunk, propName: {
    name: number;
    relating: string;
    related: string;
    key: string;
  }, rel: { [x: string]: any[] }) {
    //@ts-ignore
    const relating = rel[propName.relating].value // 获取关联方
    const related = rel[propName.related].map((r) => r.value) // 获取被关联方
    if (chunks[relating] === undefined) {
      chunks[relating] = related
    } else {
      chunks[relating] = chunks[relating].concat(related)
    }
  }

  // 获取模型中所有元素的类型
  async getAllTypesOfModel() {
    const result = {} as { [key: string]: any }
    const elements = Object.keys(IfcElements).map((e) => parseInt(e))
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const lines = await this.ifcapi.GetLineIDsWithType(this.modelId as number, element)
      const size = lines.size()
      for (let i = 0; i < size; i++) result[lines.get(i)] = element
    }
    return result
  }

  // 获取模型中所有的属性（使用流式处理避免内存溢出）
  async getAllProps() {
    const psetLines = this.ifcapi.GetLineIDsWithType(
      this.modelId as number,
      IFCRELDEFINESBYPROPERTIES
    )

    const psetRelations = []
    const properties = {} as { [key: string]: any }
    const allElementsPropsIdMap: { [key: number]: number[] } = {}; // 存储所有实体的属性数据
    const geometryIds = await this.getAllGeometriesIds() // 获取所有几何体 ID，以排除它们

    // 使用流式处理，逐个类型获取属性，避免一次性加载所有行
    const propertyElementTypes = Object.keys(IfcElements).map(e => parseInt(e));
    
    for (const elementType of propertyElementTypes) {
      try {
        const lines = await this.ifcapi.GetLineIDsWithType(this.modelId as number, elementType);
        const size = lines.size();
        
        // 限制每个类型处理的最大数量，避免内存溢出
        const maxPerType = 10000; // 每个类型最多处理1万个元素
        const processCount = Math.min(size, maxPerType);
        
        for (let i = 0; i < processCount; i++) {
          const id = lines.get(i);
          if (!geometryIds.has(id)) { // 如果不是几何体，则处理其属性
            const props = await this.getItemProperty(id);
            if (props) {
              if (props.type === 'IFCRELDEFINESBYPROPERTIES' && props.RelatedObjects) {
                psetRelations.push(props.RelatedObjects);
                for (const relatedObjectId of props.RelatedObjects) {
                  // 将属性集ID和实体ID的关系添加到 allElementsPropsIdMap
                  const propertyDefinitionId = Number(props.RelatingPropertyDefinition);
                  if (allElementsPropsIdMap[propertyDefinitionId]) {
                    allElementsPropsIdMap[propertyDefinitionId].push(relatedObjectId);
                  } else {
                    allElementsPropsIdMap[propertyDefinitionId] = [relatedObjectId];
                  }
                }
              }
              if (props.type === 'IFCRELDEFINESBYTYPE' && props.RelatedObjects) {
                const relatingTypeId = Number(props.RelatingType);
                const relatingType = await this.ifcapi.GetLine(this.modelId as number, relatingTypeId);
                const propertySetIds = relatingType.HasPropertySets;
                if (propertySetIds) {
                  for (const relatedObjectId of props.RelatedObjects) {
                    // 将属性集ID和实体ID的关系添加到 defindsByTypePropsIdMap
                    for (const propertyDefinitionId of propertySetIds) {
                      if (allElementsPropsIdMap[propertyDefinitionId.value]) {
                        this.defindsByTypePropsIdMap[propertyDefinitionId.value].push(relatedObjectId);
                      } else {
                        this.defindsByTypePropsIdMap[propertyDefinitionId.value] = [relatedObjectId];
                      }
                    }
                  }
                }
              }

              properties[id] = props;
            }
          }
        }
        
        console.log(`Processed ${processCount} elements of type ${elementType}`);
      } catch (error) {
        console.error(`Error processing element type ${elementType}:`, error);
      }
    }

    return { psetLines, psetRelations, properties, allElementsPropsIdMap };
  }


  // 新方法来获取指定ID的 IFC 行信息
  async getLineById(lineId: number) {
    if (this.modelId === undefined) {
      throw new Error("Model ID is not set.");
    }

    try {
      const line = await this.ifcapi.GetLine(this.modelId, lineId);
      return line;
    } catch (error) {
      console.error("Failed to get line:", error);
      throw error; // 或者处理错误，返回null/undefined或特定错误信息
    }
  }

  // 获取单个元素的属性
  async getItemProperty(id: number) {
    try {
      const props = await this.ifcapi.GetLine(this.modelId as number, id)
      if (props.type) {
        props.type = IfcTypesMap[props.type] // 将类型 ID 转换为类型名称
      }
      this.inPlaceFormatItemProperties(props) // 格式化属性
      return props
    } catch (e) {
      console.error(e, `There was an issue getting props of id ${id}`)
    }
  }

  // 原地格式化元素属性，主要是将 { value: ... } 结构解包
  inPlaceFormatItemProperties(props: { [key: string]: any }) {
    Object.keys(props).forEach((key) => {
      const value = props[key]
      if (value && value.value !== undefined) props[key] = value.value
      else if (Array.isArray(value))
        props[key] = value.map((item) => {
          if (item && item.value) return item.value
          return item
        })
    })
  }

  // 创建一个基础的空间节点对象
  createNode(id: number): INode {
    const typeName = this.getNodeType(id)
    return {
      export_type: typeName,
      expressID: id,
      type: typeName,
      elements: [],
      properties: null,
      closure: []
    } as INode
  }

  // 根据 expressID 获取节点类型名称
  getNodeType(id: number) {
    const typeID = this.types[id]
    return IfcElements[typeID]
  }

  // 获取模型中所有几何体的 ID（使用更高效的方法避免内存溢出）
  async getAllGeometriesIds() {
    // 使用一个轻量级的对象来存储几何体ID，避免Map的内存限制
    const geometriesIds: { [key: number]: boolean } = {};
    const geomTypesArray = Array.from(GeometryTypes); // 从预定义的几何类型集合中获取
    
    // 分批处理几何体类型，避免一次性加载过多数据
    for (let i = 0; i < geomTypesArray.length; i++) {
      const category = geomTypesArray[i];
      try {
        const ids = await this.ifcapi.GetLineIDsWithType(this.modelId as number, category);
        const idsSize = ids.size();
        
        // 限制每个类型处理的最大数量，避免内存溢出
        const maxPerType = 100000; // 每个类型最多处理10万个ID
        const processCount = Math.min(idsSize, maxPerType);
        
        for (let j = 0; j < processCount; j++) {
          const id = ids.get(j);
          geometriesIds[id] = true;
        }
        
        console.log(`Processed ${processCount} geometry IDs for category ${category}`);
      } catch (error) {
        console.error(`Error adding geometry IDs for category ${category}:`, error);
      }
    }
    
    this.geometryIdsCount = Object.keys(geometriesIds).length;
    
    // 返回一个代理对象，提供has方法但不存储所有数据
    return {
      has: (id: number) => geometriesIds.hasOwnProperty(id)
    };
  }


  // 创建并保存所有几何网格
  async createAndSaveMeshes() {
    const geometryReferences: IGeometryReferences = {}
    const dummyGeometryReferences: IGeometryReferences = {}

    this.exportMeshes = [];
    this.dummyExportMeshes = [];
    // 这一部分主要进行虚拟构件的几何处理，当前主要处理 IFCSPACE
    this.ifcapi.StreamAllMeshesWithTypes(this.modelId as number, [IFCSPACE], async (mesh: { geometries: any; expressID: number }) => {
      const placedGeometries = mesh.geometries
      dummyGeometryReferences[mesh.expressID] = []
      this.dummyExportMeshesMap[mesh.expressID] = [];  // 初始化该 expressID 的列表
      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i)
        const geometry = this.ifcapi.GetGeometry(
          this.modelId as number,
          placedGeometry.geometryExpressID
        )

        // 获取顶点和索引数据
        const verts = [...this.ifcapi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize())]
        const indices = [...this.ifcapi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize())]

        // 提取顶点、法线并应用变换矩阵
        const { vertices, normals } = this.extractVertexData(verts, placedGeometry.flatTransformation)
        const faces = this.extractFaces(indices) // 提取面

        // 创建 Export 网格对象
        const exportMesh = {
          export_type: 'Objects.Geometry.Mesh',
          units: 'm',
          volume: 0,
          area: 0,
          vertices,
          normals,
          faces,
          renderMaterial: placedGeometry.color ? this.colorToMaterial(placedGeometry.color) : null
        } as IExportMesh

        exportMesh.id = getHash(exportMesh) // 计算哈希 ID

        this.dummyExportMeshes.push(exportMesh)
        dummyGeometryReferences[mesh.expressID].push({
          export_type: 'reference',
          referencedId: exportMesh.id
        } as IGeometryReference)
        this.dummyExportMeshesMap[mesh.expressID].push(exportMesh);  // 添加 exportMesh 到对应的列表中
      }
    })

    // 流式处理所有物理构件的网格
    this.ifcapi.StreamAllMeshes(this.modelId as number, async (mesh: { geometries: any; expressID: number }) => {
      const placedGeometries = mesh.geometries
      geometryReferences[mesh.expressID] = []
      this.exportMeshesMap[mesh.expressID] = [];  // 初始化该 expressID 的列表
      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i)
        const geometry = this.ifcapi.GetGeometry(
          this.modelId as number,
          placedGeometry.geometryExpressID
        )
        // 获取顶点和索引数据
        const verts = [...this.ifcapi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize())]
        const indices = [...this.ifcapi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize())]

        // 提取顶点、法线并应用变换矩阵
        const { vertices, normals } = this.extractVertexData(verts, placedGeometry.flatTransformation)
        const faces = this.extractFaces(indices)

        // 创建 Export 网格对象
        const exportMesh = {
          export_type: 'Objects.Geometry.Mesh',
          units: 'm',
          volume: 0,
          area: 0,
          vertices,
          normals,
          faces,
          renderMaterial: placedGeometry.color ? this.colorToMaterial(placedGeometry.color) : null
        } as IExportMesh

        exportMesh.id = getHash(exportMesh)

        this.exportMeshes.push(exportMesh)
        geometryReferences[mesh.expressID].push({
          export_type: 'reference',
          referencedId: exportMesh.id
        } as IGeometryReference)
        this.exportMeshesMap[mesh.expressID].push(exportMesh);  // 添加 exportMesh 到对应的列表中
      }
    })

    return geometryReferences
  }



  // 从索引数组中提取面信息
  extractFaces(indices: any[]) {
    const faces = []
    for (let i = 0; i < indices.length; i++) {
      // Export 的面格式通常是 [number_of_vertices, v1, v2, v3, ...]
      // web-ifc 直接提供三角面索引，所以这里可能需要根据目标格式调整
      // if (i % 3 === 0) faces.push(0) // 如果需要面顶点数量前缀
      faces.push(indices[i])
    }
    return faces
  }

  // 从交错的顶点数据中提取顶点和法线，并应用变换矩阵
  extractVertexData(vertexData: any[], matrix: any[]) {
    const vertices = []
    const normals = []
    let isNormalData = false
    for (let i = 0; i < vertexData.length; i++) {
      isNormalData ? normals.push(vertexData[i]) : vertices.push(vertexData[i])
      if ((i + 1) % 3 === 0) isNormalData = !isNormalData
    }

    // 应用变换矩阵
    for (let k = 0; k < vertices.length; k += 3) {
      const x: number = vertices[k],
        y: number = vertices[k + 1],
        z: number = vertices[k + 2]
      vertices[k] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
      // 这里进行了坐标系转换 (Y 和 Z 轴交换并反转 Z)，以适应某些渲染引擎的坐标系
      vertices[k + 1] =
        (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) * -1
      vertices[k + 2] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]
    }
    vertices.forEach(element => {
      if (element === null) {
        console.log('vertice is null');
      }
    });

    return { vertices, normals }
  }

  // 将 web-ifc 的颜色对象转换为 Export 的渲染材质对象
  colorToMaterial(color: Color) {
    // 将 RGBA 颜色分量转换为一个整数
    const intColor = Math.floor(
      ((color.w * 255) << 24) +
      ((color.x * 255) << 16) +
      ((color.y * 255) << 8) +
      color.z * 255
    )
    const material: IMaterial = {
      red: color.x,
      green: color.y,
      blue: color.z,
      diffuse: intColor,
      opacity: color.w,
      metalness: 0,
      roughness: 1,
      export_type: 'Objects.Other.RenderMaterial'
    }
    material.id = getHash(material) // 计算材质的哈希 ID
    return material
  }
}

// 定义地理坐标类型（度、分、秒、百万分之一秒）
type GeographicCoordinate = Array<any>;

// 将 IfcSite 的经纬度数据转换为十进制格式
function convertToDecimalDegrees([degrees, minutes, seconds, millionthsOfSecond]: Array<any>): number {
  // 确保所有非零的度量组件具有与度数相同的符号
  const sign = Math.sign(degrees);
  minutes = Math.abs(minutes) * sign;
  seconds = Math.abs(seconds) * sign;
  if (isNaN(millionthsOfSecond)) {
    millionthsOfSecond = 0;
  } else {
    millionthsOfSecond = Math.abs(millionthsOfSecond) * sign;
  }

  // 计算十进制值
  return degrees + minutes / 60 + seconds / 3600 + millionthsOfSecond / 3600000000;
}


// 规范化坐标数据，处理 { value: ... } 格式的对象
function normalizeCoordinates(coordinates: Array<any>): Array<number> {
  if (coordinates === null) {
    return [0, 0, 0, 0];
  }
  return coordinates.map(item => {
    if (typeof item === 'object' && item !== null && 'value' in item) {
      return item.value; // 提取 'value' 属性
    }
    return item;
  });
}



// 下面这部分对 GUID 进行规范化处理
const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

// 将 32 位十六进制 GUID 压缩为 22 位 base64 格式
function compress(g: string): string {
  const bs = Array.from({ length: g.length / 2 }, (_, i) => parseInt(g.slice(i * 2, i * 2 + 2), 16));

  function b64(v: number, l: number = 4): string {
    return Array.from({ length: l }, (_, i) => chars[Math.floor(v / Math.pow(64, i)) % 64]).reverse().join('');
  }

  return b64(bs[0], 2) + bs.slice(1).reduce((acc, _, i, arr) =>
    i % 3 === 0 ? acc + b64((arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2]) : acc, '');
}

// 将 22 位 base64 格式的 GUID 解压为 32 位十六进制格式
function expand(g: string): string {
  function b64(v: string): number {
    return Array.from(v).reduce((acc, c) => acc * 64 + chars.indexOf(c), 0);
  }

  const bs: number[] = [b64(g.substring(0, 2))];

  for (let i = 0; i < 5; i++) {
    const d = b64(g.substring(2 + 4 * i, 6 + 4 * i));
    for (let j = 0; j < 3; j++) {
      bs.push((d >> (8 * (2 - j))) % 256);
    }
  }
  return bs.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 将 32 位十六进制 GUID 格式化为带连字符的 36 位 ISO 格式
function split(g: string): string {
  return `${g.slice(0, 8)}-${g.slice(8, 12)}-${g.slice(12, 16)}-${g.slice(16, 20)}-${g.slice(20, 32)}`;
}

// 将 GUID 转换为 ISO 格式 (36位，小写，带连字符)
function formatGuid2Iso(guid: string): string {
  if (guid.length === 36) {
    return guid.toLowerCase();
  }
  return split(expand(guid)).replace('{', '').replace('}', '');
}

// 统一的 GUID 格式化函数出口
export function formatGuid(guid: string): string {
  // 根据输入 GUID 的格式调用相应的转换函数
  if (guid.length === 22) {
    // 如果是压缩格式，则展开为 ISO 格式
    return formatGuid2Iso(guid);
  } else if (guid.length === 32) {
    // 如果是 32 位无连字符格式，则压缩它
    const cleanedGuid = guid.replace(/-/g, ''); // 确保没有连字符
    return compress(cleanedGuid);
  }
  // 如果格式未知或已经是 36 位的 ISO 格式，返回原始 GUID
  return guid;
}


// 生成一个 64 位的随机整数 ID (类似 NanoID，但这里是纯数字)
// function generateNanoId() {
//   const buffer = new Uint8Array(8); // 64位 = 8字节
//   webcrypto.getRandomValues(buffer); // 使用加密安全的随机数生成器填充 buffer

//   let nanoId = 0n; // 使用 BigInt 来处理 64 位整数
//   for (let i = 0; i < buffer.length; i++) {
//     // 将每个字节拼接到 BigInt 中
//     nanoId = (nanoId << 8n) | BigInt(buffer[i]);
//   }

//   return nanoId;
// }