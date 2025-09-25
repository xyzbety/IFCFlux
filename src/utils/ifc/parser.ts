
import { IfcAPI, Vector, Color, Properties } from 'web-ifc'
import { IFCPROJECT, IFCRELDEFINESBYPROPERTIES, IFCSPACE, IFCRELASSOCIATESCLASSIFICATION } from 'web-ifc'
import proj4 from 'proj4'
// const { webcrypto } = require('crypto');

import {
  getHash,
  IfcElements,
  DummyElementsSet,
  RelationElementsSet,
  PropNames,
  GeometryTypes,
  IfcTypesMap,

} from './utils'
import {
  IFCParserProps,
  ISpeckleMesh,
  SpeckleMeshes,
  IGeometryReference,
  IMaterial,
  INode,
  IGeometryReferences,
  IChunk
} from './types'

export class IFCParser {
  private ifcapi: any
  private fileId: string
  private modelId?: number
  private startTime?: number
  private endTime?: number
  private types: any
  private psetLines?: Vector<number>
  private psetRelations?: number[][]
  private properties?: any
  private allElementsPropsIdMap: { [key: number]: number[] } = {};
  private propCache: { [key: number]: any } = {}
  private geometryReferences: IGeometryReferences = {}
  private speckleMeshes: ISpeckleMesh[] = [];
  private dummySpeckleMeshes: ISpeckleMesh[] = [];
  private speckleMeshesMap: { [key: number]: ISpeckleMesh[] } = {};
  private dummySpeckleMeshesMap: { [key: number]: ISpeckleMesh[] } = {};
  //@ts-ignore
  private spatialNodeCount: number = 0
  //@ts-ignore
  private geometryIdsCount: number = 0
  private ifcRelContainedInSpatialStructure: { [key: string]: any } = {};
  private ifcRelAggregates: { [key: string]: any } = {};

  public invertTypeMap: { [key: string]: number } = {}; // 对实体类型字典翻转
  public physicalElements: { [key: string]: any } = {}; //存储过滤后的实体元素
  public dummyElements: { [key: string]: any } = {}; //存储过滤后的虚拟元素
  public relationElements: { [key: string]: any } = {}; //存储过滤后的关系元素
  public classficationLines: Vector<number>; //IfcRelAssociatesClassification
  public defindsByTypePropsIdMap: { [key: number]: number[] } = {}; //IFCRELDEFINESBYTYPE定义的属性集


  constructor(props: IFCParserProps) {
    const { fileId } = props
    this.ifcapi = new IfcAPI()
    this.ifcapi.SetWasmPath('/web-ifc/', false)
    this.fileId = fileId

  }

  async parse(data: File, detail_level: number) {
    await this.ifcapi.Init()
    console.log('parse data', data);
    // @ts-ignore
    const buffer = await data.arrayBuffer()
    this.modelId = this.ifcapi.OpenModel(new Uint8Array(buffer), {
      COORDINATE_TO_ORIGIN: false,
      // OPTIMIZE_PROFILES: true,
      CIRCLE_SEGMENTS: detail_level, // 测试一下
      // MEMORY_LIMIT: 8294967296,
      // TAPE_SIZE: 6,
      // LINEWRITER_BUFFER: 4267296
    })

    this.startTime = performance.now()

    // prepoulate types
    this.types = await this.getAllTypesOfModel()

    // prime caches for property sets and their relating objects, as well as,
    // most importantly, all the properties.
    const { psetLines, psetRelations, properties, allElementsPropsIdMap } = await this.getAllProps()
    this.psetLines = psetLines
    this.psetRelations = psetRelations
    this.properties = properties
    this.allElementsPropsIdMap = allElementsPropsIdMap
    this.classficationLines = this.ifcapi.GetLineIDsWithType(
        this.modelId as number,
        IFCRELASSOCIATESCLASSIFICATION
    )
    // create and save the geometries; we're storing only references locally.
    this.geometryReferences = await this.createAndSaveMeshes()

    // create and save the spatial tree, populating both properties and geometry references
    // where appropriate
    this.spatialNodeCount = 0
    // const structure = await this.createSpatialStructure()
    // console.log('1111', this.ifcapi.modelSchemaList)
    // return { id: structure.id, tCount: structure.closureLen }
  }

  // 获取site的坐标
  async getSiteCoord() {
    const siteCoordinates = []
    // 确保parse方法已经被调用并完成
    if (!this.properties) {
      throw new Error('parse方法还未执行或未完成');
    }

    // 现在可以安全地使用this.properties
    // const ifcSiteData = Object.values(this.properties).filter(prop => prop.type === "IFCSITE");
    const ifcSS = Object.values(this.properties as Record<string, {
      RefLatitude: GeographicCoordinate
      RefLongitude: GeographicCoordinate
      RefElevation: any
      type: string;
    }>).filter(prop => prop.type === "IFCSITE");

    const ifcSiteData = ifcSS[0];

    const siteWithNonNull1Values = ifcSS.find(site =>
      site.RefLatitude !== null &&
      site.RefLongitude !== null &&
      site.RefElevation !== null
    );
    // console.log('ttt', siteWithNonNull1Values);

    // 光谷广场位置的IFCSITE的latitude和longitude：(30,30,28,728), (114,23,37,633)
    if (ifcSiteData === undefined) { // 如果IFCSITE实体是不存在的，那么就直接返回默认坐标[0,0,0]
      return [0, 0, 0];
    } else {
      let rlati = convertToDecimalDegrees(normalizeCoordinates(ifcSiteData.RefLatitude));
      let rlong = convertToDecimalDegrees(normalizeCoordinates(ifcSiteData.RefLongitude));

      // TODO：经纬度需要从4326的度数调整成3857的米来表示
      const fromProjection = 'EPSG:4326'; // WGS 84
      const toProjection = 'EPSG:3857'; // Web Mercator


      // 使用proj4进行坐标转换，FIXME: 转换之后的数据对不上，是可能什么原因造成的？
      const coordResult = await this.convertCoordinates(rlati, rlong);

      //  proj4(fromProjection, toProjection, [rlong, rlati]);

      let refElevation = ifcSiteData.RefElevation ?? 0;
      // console.log("refLongitude:", refLongitude.toFixed(8), "refLatitude:", refLatitude, "refElevation:", refElevation);
      siteCoordinates.push(coordResult.refLongitude, coordResult.refLatitude, refElevation)


      // 根据需要进行进一步处理
      return siteCoordinates;
    }
  }
  public async convertCoordinates(rlati: number, rlong: number) {
    // 定义坐标系的EPSG编码
    const fromProjection = 'EPSG:4326'; // WGS 84
    const toProjection = 'EPSG:3857'; // Web Mercator

    // 使用 proj4 进行坐标转换
    const [refLongitude, refLatitude] = proj4(fromProjection, toProjection, [rlong, rlati]);

    // 返回转换后的经纬度
    return { refLongitude, refLatitude };
  }



  // 方法用于打印 properties 中的所有属性
  public async getAllElements(projectGuid: any) {
    // 首先检查 properties 是否已定义
    if (!this.properties) {
      console.log('No properties to display.');
      return;
    }

    // 获取 properties 对象的所有键
    const keys = Object.keys(this.properties);

    await this.invertMap();
    // console.log('dict:', this.invertTypeMap)
    let storeys: { [key: string]: any } = {}
    // 遍历所有键
    let entityId = 1;
    // let physicalIndex = 1;
    // let dummyIndex = 1;
    for (const key of keys) {
      const value = this.properties[key];
      if (DummyElementsSet.includes(value.type)) {
        // 这里的数据丢给scene_dummy
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
          "of_level": null, // TODO: 找到当前构件所属的BuildingStorey的Name值，即为标高
          "of_discipline": null
        };
        this.dummyElements[key] = dic;
        // dummyIndex++;
        entityId++;
        if (value.type === "IFCBUILDINGSTOREY") {
          storeys[dic.guid] = dic.name;
        }
      } else if (RelationElementsSet.includes(value.type)) {
        // 这里的数据丢给scene_relation
        let relating_object_id = null;
        let related_object_ids = null;
        const values = Object.values(value);
        if(Array.isArray(values[6])){
          relating_object_id = values[7];
          related_object_ids = values[6];
        }else{
          relating_object_id = values[6];
          related_object_ids = Array.isArray(values[7])? values[7] : [values[7]];
        }
        const obj = await this.ifcapi.GetLine(this.modelId, relating_object_id);
        const relating_object = obj? formatGuid(obj.GlobalId.value) : null;
        let related_objects = []
        for (const line_id of related_object_ids){
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
        if (relating_object && value.type == 'IFCRELCONTAINEDINSPATIALSTRUCTURE') {
          this.ifcRelContainedInSpatialStructure[relating_object] = related_objects;
        }
        if (relating_object && value.type == 'IFCRELAGGREGATES') {
          this.ifcRelAggregates[relating_object] = related_objects;
        }
        // dummyIndex++;
        entityId++;
      }else if (IfcElements.hasOwnProperty(this.invertTypeMap[value.type])) {
        //这里的数据丢给scene_physical
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
          "of_level": null, // TODO: 找到当前构件所属的BuildingStorey的Name值，即为标高
          "of_discipline": null
        };
        this.physicalElements[key] = dic;
        entityId++;
        // physicalIndex++;
      }
    }
    Object.entries(this.ifcRelContainedInSpatialStructure).forEach(([key, value]) => {

      for(const phy of Object.values(this.physicalElements)){
        if(value.includes(phy.guid)){
          phy.in_storey = key;
          phy.of_level = storeys[key] ?? null;
        }
      }

      for(const dummy of Object.values(this.dummyElements)){
        if(value.includes(dummy.guid)){
          dummy.in_storey = key;
          dummy.of_level = storeys[key] ?? null;
        }
      }
    });

    Object.entries(this.ifcRelAggregates).forEach(([key, value]) => {

      for(const dummy of Object.values(this.dummyElements)){
        if(dummy.of_category=='IFCSPACE' && value.includes(dummy.guid)){
          dummy.in_storey = key;
          dummy.of_level = storeys[key] ?? null;
        }
      }
    });

  }

  // 获取所有Element属性的数据
  public async getAllElementsProps() {
    return this.allElementsPropsIdMap;
  }

  // 获取包含实体几何数据的mesh映射表
  // 描述的是一个实体Element和几何ShapeRepresentation之间的关系
  public async getSpeckleMeshesMap() {
    return this.speckleMeshesMap;
  }

  // 获取包含虚拟几何数据的mesh映射表
  // 描述的是一个虚拟Element和几何ShapeRepresentation之间的关系
  public async getDummySpeckleMeshesMap() {
    return this.dummySpeckleMeshesMap;
  }


  // 获取所有的实体几何相关数据，存储在speckleMeshes中
  public async getAllSpeckleMeshes() {
    return this.speckleMeshes;
  }

  // 获取所有的虚拟实体几何相关数据，存储在dummySpeckleMeshes中
  public async getAllDummySpeckleMeshes() {
    return this.dummySpeckleMeshes;
  }


  // 对字典Map进行键值对翻转
  public invertMap(): void {
    const invertedMap: { [key: string]: number } = {};
    Object.entries(IfcTypesMap).forEach(([key, value]) => {
      // 由于Object.entries()将键作为字符串返回，需要将键转换回数字
      invertedMap[value] = Number(key); // 保持键的数字类型不变
    });
    this.invertTypeMap = invertedMap;
  }

  async createSpatialStructure(): Promise<INode> {
    const chunks = await this.getSpatialTreeChunks()
    const allProjectLines = await this.ifcapi.GetLineIDsWithType(
      this.modelId as number,
      IFCPROJECT
    )
    const project = {
      expressID: allProjectLines.get(0),
      type: 'IFCPROJECT',
      speckle_type: 'Base',
      elements: [],
      closure: []
    } as INode

    await this.populateSpatialNode(project, chunks, [], 0)

    this.endTime = performance.now()
    //@ts-ignore
    project.parseTime = (this.endTime - this.startTime as number).toFixed(2) + 'ms'
    project.fileId = this.fileId

    return project
  }

  async populateSpatialNode(node: INode, chunks: IChunk, closures: (Iterable<unknown> | null | undefined)[], depth?: number): Promise<string> {
    // @ts-ignore
    depth++
    closures.push([])
    await this.getChildren(node, chunks, PropNames.aggregates, closures, depth)
    await this.getChildren(node, chunks, PropNames.spatial, closures, depth)

    node.closure = [...new Set(closures.pop())] as string[]

    // get geometry, set displayValue
    // add geometry ids to closure
    if (
      this.geometryReferences[node.expressID] &&
      this.geometryReferences[node.expressID].length !== 0
    ) {
      node['@displayValue'] = this.geometryReferences[node.expressID]
      node.closure.push(
        ...this.geometryReferences[node.expressID].map((ref) => ref.referencedId)
      )
    }
    node.closureLen = node.closure.length
    node.__closure = this.formatClosure(node.closure)
    node.id = getHash(node)

    // remove project level node closure
    if (depth === 1) {
      //@ts-ignore
      delete node.closure
    }
    return node.id
  }

  formatClosure(idsArray: string[]) {
    const cl: { [key: string]: 1 } = {}
    for (const id of idsArray) cl[id] = 1
    return cl
  }

  async getChildren(node: INode, chunks: IChunk, propName: { name?: number; relating?: string; related?: string; key: any }, closures: any, _depth?: number) {
    const children = chunks[node.expressID]
    if (!children) return
    const prop = propName.key as keyof INode
    const nodes: INode[] = []
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      let cnode = this.createNode(child)
      cnode = { ...cnode, ...(await this.getItemProperties(cnode.expressID)) }
      cnode.id = await this.populateSpatialNode(cnode, chunks, closures)

      for (const closure of closures) {
        closure.push(cnode.id)
        if (cnode['closure'].length > 30_000)
          for (const id of cnode['closure']) closure.push(id)
        else closure.push(...cnode['closure'])
      }

      //@ts-ignore
      delete cnode.closure
      nodes.push(cnode)
    }

    // @ts-ignore
    node[prop] = nodes.map((node) => ({
      speckle_type: 'reference',
      referencedId: node.id
    }))
  }

  async getItemProperties(id: number) {
    if (this.propCache[id]) return this.propCache[id]

    let props = {}
    const directProps = this.properties[id.toString()]
    props = { ...directProps }

    const psetIds = []
    if (this.psetRelations && this.psetLines) {
      for (let i = 0; i < this.psetRelations.length; i++) {
        if (this.psetRelations[i].includes(id))
          psetIds.push(this.psetLines.get(i).toString())
      }
    }

    const rawPsetIds = psetIds.map((id) =>
      this.properties[id].RelatingPropertyDefinition.toString()
    )
    const rawPsets = rawPsetIds.map((id) => this.properties[id])
    for (const pset of rawPsets) {
      //@ts-ignore
      props[pset.Name] = this.unpackPsetOrComplexProp(pset)
    }

    this.propCache[id] = props
    return props
  }

  unpackPsetOrComplexProp(pset: { HasProperties: any }) {
    const parsed: { [key: string]: any } = {}
    if (!pset.HasProperties || !Array.isArray(pset.HasProperties)) return parsed
    for (const id of pset.HasProperties) {
      const value = this.properties[id.toString()]
      if (value?.type === 'IFCCOMPLEXPROPERTY') {
        parsed[value.Name] = this.unpackPsetOrComplexProp(value)
      } else if (value?.type === 'IFCPROPERTYSINGLEVALUE') {
        parsed[value.Name] = value.NominalValue
      }
    }
    return parsed
  }

  async getSpatialTreeChunks(): Promise<IChunk> {
    const treeChunks = {} as IChunk
    await this.getChunks(treeChunks, PropNames.aggregates)
    await this.getChunks(treeChunks, PropNames.spatial)
    return treeChunks
  }

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

  saveChunk(chunks: IChunk, propName: {
    name: number;
    relating: string;
    related: string;
    key: string;
  }, rel: { [x: string]: any[] }) {
    //@ts-ignore
    const relating = rel[propName.relating].value
    const related = rel[propName.related].map((r) => r.value)
    if (chunks[relating] === undefined) {
      chunks[relating] = related
    } else {
      chunks[relating] = chunks[relating].concat(related)
    }
  }

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

  async getAllProps() {
    const psetLines = this.ifcapi.GetLineIDsWithType(
      this.modelId as number,
      IFCRELDEFINESBYPROPERTIES
    )

    const psetRelations = []
    const properties = {} as { [key: string]: any }
    const allElementsPropsIdMap: { [key: number]: number[] } = {}; // 存储所有实体的属性数据
    const geometryIds = await this.getAllGeometriesIds()
    const allLinesIDs = await this.ifcapi.GetAllLines(this.modelId as number)
    const allLinesCount = allLinesIDs.size()
    for (let i = 0; i < allLinesCount; i++) {
      // console.log(`${((i / allLinesCount) * 100).toFixed(3)}% props.`)
      const id = allLinesIDs.get(i)
      // console.log('id:', id, geometryIds)
      if (!geometryIds.has(id)) {
        const props = await this.getItemProperty(id)
        if (props) {
          if (props.type === 'IFCRELDEFINESBYPROPERTIES' && props.RelatedObjects) {
            psetRelations.push(props.RelatedObjects)
            // console.log('psets:', props.RelatingPropertyDefinition, props.RelatedObjects);
            for (const relatedObjectId of props.RelatedObjects) {
              // 将属性集ID和实体ID的关系添加到allElementsPropsIdMap
              const propertyDefinitionId = Number(props.RelatingPropertyDefinition)
              if (allElementsPropsIdMap[propertyDefinitionId]) {
                allElementsPropsIdMap[propertyDefinitionId].push(relatedObjectId);
              } else {
                allElementsPropsIdMap[propertyDefinitionId] = [relatedObjectId];
              }
            }
          }
          if(props.type === 'IFCRELDEFINESBYTYPE' && props.RelatedObjects){
            const relatingTypeId = Number(props.RelatingType)
            const relatingType = await this.ifcapi.GetLine(this.modelId as number, relatingTypeId)
            const propertySetIds = relatingType.HasPropertySets
            if(propertySetIds){
              for (const relatedObjectId of props.RelatedObjects) {
                // 将属性集ID和实体ID的关系添加到allElementsPropsIdMap
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

          properties[id] = props
        }
      }
    }

    return { psetLines, psetRelations, properties, allElementsPropsIdMap }
  }


  // 新方法来获取线条信息
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

  async getItemProperty(id: number) {
    try {
      const props = await this.ifcapi.GetLine(this.modelId as number, id)
      if (props.type) {
        props.type = IfcTypesMap[props.type]
      }
      this.inPlaceFormatItemProperties(props)
      return props
    } catch (e) {
      console.error(e, `There was an issue getting props of id ${id}`)
    }
  }

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

  createNode(id: number): INode {
    const typeName = this.getNodeType(id)
    return {
      speckle_type: typeName,
      expressID: id,
      type: typeName,
      elements: [],
      properties: null,
      closure: []
    } as INode
  }

  getNodeType(id: number) {
    const typeID = this.types[id]
    return IfcElements[typeID]
  }

  async getAllGeometriesIds() {
    const geometriesIds = new Set();
    const geomTypesArray = Array.from(GeometryTypes);
    for (let i = 0; i < geomTypesArray.length; i++) {
      const category = geomTypesArray[i];
      try {
        const ids = await this.ifcapi.GetLineIDsWithType(this.modelId as number, category);
        const idsSize = ids.size();
        for (let j = 0; j < idsSize; j++) {
          geometriesIds.add(ids.get(j));
        }
      } catch (error) {
        console.error(`Error adding geometry IDs for category ${category}:`, error);
        // Handle the error or continue processing as needed
      }
    }
    this.geometryIdsCount = geometriesIds.size;
    return geometriesIds;
  }


  async createAndSaveMeshes() {
    const geometryReferences: IGeometryReferences = {}
    const dummyGeometryReferences: IGeometryReferences = {}

    this.speckleMeshes = [];
    this.dummySpeckleMeshes = [];
    // 这一部分主要进行dummy（虚拟）构件的几何处理，当前主要处理IFCSPACE
    // IfcSpace IfcSystem IfcZone IfcBuiltSystem IfcDistributionSystem IfcDistributionCircuit IfcStructuralAnalysisModel 20240724
    this.ifcapi.StreamAllMeshesWithTypes(this.modelId as number, [IFCSPACE], async (mesh: { geometries: any; expressID: number }) => {
      const placedGeometries = mesh.geometries
      dummyGeometryReferences[mesh.expressID] = []
      this.dummySpeckleMeshesMap[mesh.expressID] = [];  // 初始化该expressID的列表
      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i)
        // console.log('expressID', mesh.expressID, placedGeometry.geometryExpressID)
        const geometry = this.ifcapi.GetGeometry(
          this.modelId as number,
          placedGeometry.geometryExpressID
        )

        const verts = [
          ...this.ifcapi.GetVertexArray(
            geometry.GetVertexData(),
            geometry.GetVertexDataSize()
          )
        ]

        const indices = [
          ...this.ifcapi.GetIndexArray(
            geometry.GetIndexData(),
            geometry.GetIndexDataSize()
          )
        ]

        const { vertices, normals } = this.extractVertexData(
          verts,
          placedGeometry.flatTransformation
        )
        const faces = this.extractFaces(indices) // TODO: 方形？

        const speckleMesh = {
          speckle_type: 'Objects.Geometry.Mesh',
          units: 'm',
          volume: 0,
          area: 0,
          vertices,
          normals,
          faces,
          renderMaterial: placedGeometry.color
            ? this.colorToMaterial(placedGeometry.color)
            : null
        } as ISpeckleMesh

        speckleMesh.id = getHash(speckleMesh)
        // Note: the web-ifc api disposes of the data post callback, and doesn't know that it's async;
        // we cannot and should not await things in here. I'm not entirely sure what's going on :)
        // await this.serverApi.saveObject(speckleMesh)

        this.dummySpeckleMeshes.push(speckleMesh)
        dummyGeometryReferences[mesh.expressID].push({
          // eslint-disable-next-line camelcase
          speckle_type: 'reference',
          referencedId: speckleMesh.id
        } as IGeometryReference)
        this.dummySpeckleMeshesMap[mesh.expressID].push(speckleMesh);  // 添加speckleMesh到对应的列表中
        // console.log(`${(count++).toFixed(3)} geoms generated.`)
      }
    })


    this.ifcapi.StreamAllMeshes(this.modelId as number, async (mesh: { geometries: any; expressID: number }) => {
      const placedGeometries = mesh.geometries
      // console.log('GEID', placedGeometries.size(), mesh.expressID);

      geometryReferences[mesh.expressID] = []
      this.speckleMeshesMap[mesh.expressID] = [];  // 初始化该expressID的列表
      for (let i = 0; i < placedGeometries.size(); i++) {
        const placedGeometry = placedGeometries.get(i)
        // console.log('expressID', mesh.expressID, placedGeometry.geometryExpressID)
        const geometry = this.ifcapi.GetGeometry(
          this.modelId as number,
          placedGeometry.geometryExpressID
        )

        const verts = [
          ...this.ifcapi.GetVertexArray(
            geometry.GetVertexData(),
            geometry.GetVertexDataSize()
          )
        ]

        const indices = [
          ...this.ifcapi.GetIndexArray(
            geometry.GetIndexData(),
            geometry.GetIndexDataSize()
          )
        ]

        const { vertices, normals } = this.extractVertexData(
          verts,
          placedGeometry.flatTransformation
        )
        const faces = this.extractFaces(indices) // TODO: 方形？

        const speckleMesh = {
          speckle_type: 'Objects.Geometry.Mesh',
          units: 'm',
          volume: 0,
          area: 0,
          vertices,
          normals,
          faces,
          renderMaterial: placedGeometry.color
            ? this.colorToMaterial(placedGeometry.color)
            : null
        } as ISpeckleMesh

        speckleMesh.id = getHash(speckleMesh)
        // Note: the web-ifc api disposes of the data post callback, and doesn't know that it's async;
        // we cannot and should not await things in here. I'm not entirely sure what's going on :)
        // await this.serverApi.saveObject(speckleMesh)

        this.speckleMeshes.push(speckleMesh)
        geometryReferences[mesh.expressID].push({
          // eslint-disable-next-line camelcase
          speckle_type: 'reference',
          referencedId: speckleMesh.id
        } as IGeometryReference)
        this.speckleMeshesMap[mesh.expressID].push(speckleMesh);  // 添加speckleMesh到对应的列表中
        // console.log(`${(count++).toFixed(3)} geoms generated.`)
      }
    })

    return geometryReferences
  }



  extractFaces(indices: any[]) {
    const faces = []
    for (let i = 0; i < indices.length; i++) {
      // if (i % 3 === 0) faces.push(0) // ??? 等一下干
      faces.push(indices[i])
    }
    return faces
  }

  extractVertexData(vertexData: any[], matrix: any[]) {
    const vertices = []
    const normals = []
    let isNormalData = false
    for (let i = 0; i < vertexData.length; i++) {
      isNormalData ? normals.push(vertexData[i]) : vertices.push(vertexData[i])
      if ((i + 1) % 3 === 0) isNormalData = !isNormalData
    }

    // apply the transform
    for (let k = 0; k < vertices.length; k += 3) {
      const x: number = vertices[k],
        y: number = vertices[k + 1],
        z: number = vertices[k + 2]
      vertices[k] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
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

  colorToMaterial(color: Color) {
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
      // eslint-disable-next-line camelcase
      speckle_type: 'Objects.Other.RenderMaterial'
    }
    material.id = getHash(material)
    return material
  }
}

// 定义一个类型表示经纬度的度、分、秒、百万分之一秒
// type GeographicCoordinate = [number, number, number, number];
type GeographicCoordinate = Array<any>;

// 转换IfcSite的经纬度数据为十进制
// All non-zero measure components shall have the same sign (positive or negative)
function convertToDecimalDegrees([degrees, minutes, seconds, millionthsOfSecond]: Array<any>): number {
  // 确保所有非零的度量组件具有与度数相同的符号
  const sign = Math.sign(degrees);
  minutes = Math.abs(minutes) * sign;
  seconds = Math.abs(seconds) * sign;
  // millionthsOfSecond = Math.abs(millionthsOfSecond) * sign;
  if (isNaN(millionthsOfSecond)) {
    millionthsOfSecond = 0;
  } else {
    millionthsOfSecond = Math.abs(millionthsOfSecond) * sign;
  }

  return degrees + minutes / 60 + seconds / 3600 + millionthsOfSecond / 3600000000;
}

// 示例使用
// let refLatitude: GeographicCoordinate = [-50, 58, 33, 110400];
// let decimalLatitude: number = convertToDecimalDegrees(refLatitude);
// console.log('十进制纬度:', decimalLatitude.toFixed(8)); // 输出保留8位小数

// 处理IFCSITE的时候产生莫名其妙的数据返回，需要用上这个数据规范化的方法
function normalizeCoordinates(coordinates: Array<any>): Array<number> {
  if (coordinates === null) {
    return [0, 0, 0, 0];
  }
  return coordinates.map(item => {
    if (typeof item === 'object' && item !== null && 'value' in item) {
      return item.value; // 转换特殊对象为其'value'值
    }
    return item; // 直接返回非对象值
  });
}



// 下面这部分对guid进行规范化处理，产生formatGuid函数
const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

function compress(g: string): string {
  const bs = Array.from({ length: g.length / 2 }, (_, i) => parseInt(g.slice(i * 2, i * 2 + 2), 16));

  function b64(v: number, l: number = 4): string {
    return Array.from({ length: l }, (_, i) => chars[Math.floor(v / Math.pow(64, i)) % 64]).reverse().join('');
  }

  return b64(bs[0], 2) + bs.slice(1).reduce((acc, _, i, arr) =>
    i % 3 === 0 ? acc + b64((arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2]) : acc, '');
}

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

function split(g: string): string {
  return `${g.slice(0, 8)}-${g.slice(8, 12)}-${g.slice(12, 16)}-${g.slice(16, 20)}-${g.slice(20, 32)}`;
}

function formatGuid2Iso(guid: string): string {
  if (guid.length === 36) {
    return guid.toLowerCase();
  }
  return split(expand(guid)).replace('{', '').replace('}', '');
}

// 包装compress/expand/split为一个函数出口
export function formatGuid(guid: string): string {
  // 根据GUID的格式调用相应的转换函数
  if (guid.length === 22) {
    // 如果GUID是压缩格式，转换为ISO格式
    return formatGuid2Iso(guid);
  } else if (guid.length === 32) {
    // 如果GUID是32位没有短横线的格式，
    // 假设用户想要压缩它
    const cleanedGuid = guid.replace(/-/g, ''); // 移除短横线
    return compress(cleanedGuid);
  }
  // 如果格式未知或者已经是36位的ISO格式，返回原始GUID
  return guid;
}

// 示例使用
// console.log(formatGuid('0i9V02G_HBeQoBlU0_ZaL_')); // 展开为ISO格式
// console.log(formatGuid('f70dd363bfe3495d84a02c02dcb7d4d2')); // 压缩为短格式
// console.log(formatGuid('f70dd363-bfe3-495d-84a0-2c02dcb7d4d2')); // 压缩为短格式

// 生成physical/dummy表的id字段方法（要求为整数）
// function generateNanoId() {
//   const buffer = new Uint8Array(8); // 64位 = 8字节
//   webcrypto.getRandomValues(buffer);

//   let nanoId = 0n;
//   for (let i = 0; i < buffer.length; i++) {
//     nanoId = (nanoId << 8n) | BigInt(buffer[i]);
//   }

//   return nanoId;
// }

// console.log(`Generated NanoID: ${generateNanoId()}`);
