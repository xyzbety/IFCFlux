import { IfcElementTypeIds, IfcGeometryTypeIds, IfcTypes } from '../common/ifcTypes';
import * as WEBIFC from "web-ifc";
import { getSpatialTree } from './ifcStructureCreator';
import { ifcGuidToUuid } from '../common/ifcGuidConverter';

export interface IfcItemsCategories {
  [itemID: number]: number;
}
interface IfcProperties {
  [expressID: number]: {
    [attribute: string]: any;
  };
}

export interface IAnnotationGeometry {
  expressID: number;
  lines: number[][][];
  texts: IAnnotationText[];
}

export interface IAnnotationText {
  expressID: number;
  text: string;
  position: number[];
  path?: string;
  boxAlignment?: string;
  extent?: [number, number];
}



export class IfcLoaderParser {

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
    const categoriesIDs = IfcElementTypeIds;

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
   * @param totalNonGeometryElements 可选：预先计算的非几何元素总数
   * @param allNonGeometryIds 可选：预先收集的非几何元素列表
   * @returns 解析后的模型对象
   */
  async loadWithProgress(
    onProgress: (percent: number) => void,
    modelID: number,
    totalNonGeometryElements?: number,
    allNonGeometryIds?: { typeIndex: number; ids: number[]; count: number }[]
  ): Promise<{
    modelID: number;
    data: Record<number, [number[], number[]]>;
    keyFragments: Record<number, string>;
    _groupSystems: Record<string, any>;
    properties: Record<string, any>;
    psetRelations: number[][];
    psetLines: WEBIFC.Vector<number>;
    tree: any;
    ifcExpressIds: any;
    annotationGeometries: IAnnotationGeometry[];
  }> {
    const model = {
      modelID: modelID,
      data: {},
      keyFragments: {},
      _groupSystems: {},
      properties: {}
    };

    // 直接在主线程中处理属性，带进度回调
    const result = await this.getModelPropertiesWithProgress(
      modelID,
      onProgress,
      totalNonGeometryElements,
      allNonGeometryIds
    );
    const { properties, psetLines, psetRelations, total } = result;

    model.properties = properties;
    this.psetRelations = psetRelations;
    this.psetLines = psetLines;
    const annotationGeometries = this.collectAnnotationGeometries(modelID);
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
      annotationGeometries,
      ...spatialTree
    };
  }



  private collectAnnotationGeometries(modelID: number): IAnnotationGeometry[] {
    const geometries: IAnnotationGeometry[] = [];

    try {
      const annotationLines = this.webIfc.GetLineIDsWithType(modelID, WEBIFC.IFCANNOTATION);
      for (let i = 0; i < annotationLines.size(); i++) {
        const annotationId = annotationLines.get(i);
        try {
          const annotation = this.webIfc.GetLine(modelID, annotationId);
          const placementMatrix = this.getPlacementMatrix(modelID, annotation?.ObjectPlacement?.value);
          const representationId = annotation?.Representation?.value;
          if (!representationId) continue;

          const definitionShape = this.webIfc.GetLine(modelID, representationId);
          const representationRefs = definitionShape?.Representations || [];
          const lines: number[][][] = [];
          const texts: IAnnotationText[] = [];
          const visited = new Set<number>();

          for (const ref of representationRefs) {
            const repId = ref?.value ?? ref;
            if (typeof repId !== 'number') continue;
            this.collectAnnotationItemGeometry(modelID, repId, placementMatrix, lines, texts, visited);
          }

          if (lines.length > 0 || texts.length > 0) {
            geometries.push({
              expressID: annotationId,
              lines,
              texts,
            });
          }
        } catch (error) {
          console.warn(`解析注释几何 ${annotationId} 时出错:`, error);
        }
      }
    } catch (error) {
      console.warn('收集IfcAnnotation几何失败:', error);
    }

    return geometries;
  }

  private collectAnnotationItemGeometry(
    modelID: number,
    itemId: number,
    placementMatrix: number[],
    lines: number[][][],
    texts: IAnnotationText[],
    visited: Set<number>,
  ): void {
    if (visited.has(itemId)) return;
    visited.add(itemId);

    let item: any;
    try {
      item = this.webIfc.GetLine(modelID, itemId);
    } catch {
      return;
    }

    if (!item) return;

    const typeName = (IfcTypes[item.type]?.en || IfcTypes[item.type]?.name || '').toUpperCase();
    if (item.Item?.value !== undefined) {
      const childId = item.Item.value;
      if (typeof childId === 'number') {
        this.collectAnnotationItemGeometry(modelID, childId, placementMatrix, lines, texts, visited);
      }
      return;
    }

    if (typeName === 'IFCTEXTLITERALWITHEXTENT' || typeName === 'IFCTEXTLITERAL') {
      this.collectAnnotationTextGeometry(modelID, item, placementMatrix, texts);
      return;
    }

    if (typeName === 'IFCPOLYLINE') {
      const polyline = this.extractPolylinePoints(modelID, item, placementMatrix);
      if (polyline.length >= 2) {
        lines.push(polyline);
      }
      return;
    }

    if (typeName === 'IFCINDEXEDPOLYCURVE') {
      const polyline = this.extractIndexedPolylinePoints(item, placementMatrix);
      if (polyline.length >= 2) {
        lines.push(polyline);
      }
      return;
    }

    if (Array.isArray(item.Elements)) {
      for (const child of item.Elements) {
        const childId = child?.value ?? child;
        if (typeof childId === 'number') {
          this.collectAnnotationItemGeometry(modelID, childId, placementMatrix, lines, texts, visited);
        }
      }
    }

    if (Array.isArray(item.Items)) {
      for (const child of item.Items) {
        const childId = child?.value ?? child;
        if (typeof childId === 'number') {
          this.collectAnnotationItemGeometry(modelID, childId, placementMatrix, lines, texts, visited);
        }
      }
    }

    if (Array.isArray(item.Segments)) {
      for (const segment of item.Segments) {
        const parentCurveId = segment?.ParentCurve?.value ?? segment?.ParentCurve;
        if (typeof parentCurveId === 'number') {
          this.collectAnnotationItemGeometry(modelID, parentCurveId, placementMatrix, lines, texts, visited);
        }
      }
    }

    if (item.ParentCurve?.value !== undefined) {
      const parentCurveId = item.ParentCurve.value;
      if (typeof parentCurveId === 'number') {
        this.collectAnnotationItemGeometry(modelID, parentCurveId, placementMatrix, lines, texts, visited);
      }
    }

    if (item.BasisCurve?.value !== undefined) {
      const basisCurveId = item.BasisCurve.value;
      if (typeof basisCurveId === 'number') {
        this.collectAnnotationItemGeometry(modelID, basisCurveId, placementMatrix, lines, texts, visited);
      }
    }
  }

  private collectAnnotationTextGeometry(
    modelID: number,
    item: any,
    annotationPlacementMatrix: number[],
    texts: IAnnotationText[],
  ): void {
    const literal = (item?.Literal?.value ?? item?.Literal ?? item?.Name?.value ?? item?.Name ?? '').toString().trim();
    if (!literal) return;

    const textPlacementMatrix = this.getAxisPlacementMatrix(modelID, item?.Placement?.value);
    const worldMatrix = this.combinePlacementMatrices(annotationPlacementMatrix, textPlacementMatrix);

    const extentId = item?.Extent?.value;
    const extent = typeof extentId === 'number'
      ? this.getPlanarExtent(modelID, extentId)
      : undefined;
    const boxAlignment = (item?.BoxAlignment?.value ?? '').toString().toLowerCase();
    const centerOffset = this.getTextCenterOffset(boxAlignment, extent);
    const centerPoint = this.transformPoint(centerOffset, worldMatrix);
    const normal = this.normalizeVector([worldMatrix[8], worldMatrix[9], worldMatrix[10]], [0, 0, 1]);
    const liftedPoint = [
      centerPoint[0] + normal[0] * 0.02,
      centerPoint[1] + normal[1] * 0.02,
      centerPoint[2] + normal[2] * 0.02,
    ];
    const textPosition = this.convertIfcPointToScenePoint(liftedPoint);

    texts.push({
      expressID: item.expressID ?? 0,
      text: literal,
      position: textPosition,
      path: item?.Path?.value,
      boxAlignment: item?.BoxAlignment?.value,
      extent,
    });
  }

  private getTextCenterOffset(boxAlignment: string, extent?: [number, number]): number[] {
    if (!extent) {
      return [0, 0, 0];
    }

    const [width, height] = extent;
    const offsetX = boxAlignment.includes('left')
      ? width / 2
      : boxAlignment.includes('right')
        ? -width / 2
        : 0;
    const offsetY = boxAlignment.includes('top')
      ? -height / 2
      : boxAlignment.includes('bottom')
        ? height / 2
        : 0;

    return [offsetX, offsetY, 0];
  }

  private getPlanarExtent(modelID: number, extentId: number): [number, number] | undefined {
    try {
      const extent = this.webIfc.GetLine(modelID, extentId);
      if (!extent) return undefined;

      const sizeInX = Number(extent?.SizeInX?._representationValue ?? extent?.SizeInX?.value ?? 0);
      const sizeInY = Number(extent?.SizeInY?._representationValue ?? extent?.SizeInY?.value ?? 0);
      if (!Number.isFinite(sizeInX) || !Number.isFinite(sizeInY)) return undefined;
      return [sizeInX, sizeInY];
    } catch {
      return undefined;
    }
  }

  private extractPolylinePoints(modelID: number, polyline: any, placementMatrix: number[]): number[][] {
    const points: number[][] = [];
    const pointRefs = polyline?.Points || [];

    for (const pointRef of pointRefs) {
      const pointId = pointRef?.value ?? pointRef;
      if (typeof pointId !== 'number') continue;

      let point: any;
      try {
        point = this.webIfc.GetLine(modelID, pointId);
      } catch {
        continue;
      }

      if (!point) continue;

      const coordinates = this.getPointCoordinates(point);
      points.push(this.convertIfcPointToScenePoint(this.transformPoint(coordinates, placementMatrix)));
    }

    return points;
  }

  private extractIndexedPolylinePoints(polycurve: any, placementMatrix: number[]): number[][] {
    const points: number[][] = [];
    const coordList = polycurve?.Points?.CoordList || polycurve?.Points?.Coordinates || [];

    for (const coord of coordList) {
      if (!Array.isArray(coord)) continue;
      const tuple = this.getPointTuple(coord);
      points.push(this.convertIfcPointToScenePoint(this.transformPoint(tuple, placementMatrix)));
    }

    return points;
  }

  private getPlacementMatrix(modelID: number, placementId?: number): number[] {
    if (!placementId) {
      return this.identityMatrix();
    }

    let placement: any;
    try {
      placement = this.webIfc.GetLine(modelID, placementId);
    } catch {
      return this.identityMatrix();
    }

    if (!placement) {
      return this.identityMatrix();
    }

    const parentPlacementId = placement.PlacementRelTo?.value;
    const parentMatrix = parentPlacementId ? this.getPlacementMatrix(modelID, parentPlacementId) : this.identityMatrix();
    const localMatrix = this.getAxisPlacementMatrix(modelID, placement.RelativePlacement?.value);
    return this.combinePlacementMatrices(parentMatrix, localMatrix);
  }

  private getAxisPlacementMatrix(modelID: number, axisPlacementId?: number): number[] {
    if (!axisPlacementId) {
      return this.identityMatrix();
    }

    let axisPlacement: any;
    try {
      axisPlacement = this.webIfc.GetLine(modelID, axisPlacementId);
    } catch {
      return this.identityMatrix();
    }

    if (!axisPlacement) {
      return this.identityMatrix();
    }

    const typeName = (IfcTypes[axisPlacement.type]?.en || IfcTypes[axisPlacement.type]?.name || '').toUpperCase();
    if (typeName !== 'IFCAXIS2PLACEMENT2D' && typeName !== 'IFCAXIS2PLACEMENT3D') {
      return this.identityMatrix();
    }

    const location = axisPlacement.Location?.value !== undefined
      ? this.getPointCoordinates(this.webIfc.GetLine(modelID, axisPlacement.Location.value))
      : [0, 0, 0];
    const zAxis = axisPlacement.Axis?.value !== undefined
      ? this.getDirectionVector(this.webIfc.GetLine(modelID, axisPlacement.Axis.value), [0, 0, 1])
      : [0, 0, 1];
    const xAxis = axisPlacement.RefDirection?.value !== undefined
      ? this.getDirectionVector(this.webIfc.GetLine(modelID, axisPlacement.RefDirection.value), [1, 0, 0])
      : [1, 0, 0];

    const normalizedZ = this.normalizeVector(zAxis, [0, 0, 1]);
    const normalizedX = this.normalizeVector(xAxis, [1, 0, 0]);
    const normalizedY = this.normalizeVector(this.crossVector(normalizedZ, normalizedX), [0, 1, 0]);
    const orthogonalX = this.normalizeVector(this.crossVector(normalizedY, normalizedZ), [1, 0, 0]);

    return [
      orthogonalX[0], orthogonalX[1], orthogonalX[2], 0,
      normalizedY[0], normalizedY[1], normalizedY[2], 0,
      normalizedZ[0], normalizedZ[1], normalizedZ[2], 0,
      location[0], location[1], location[2], 1,
    ];
  }

  private getPointCoordinates(point: any): number[] {
    if (!point?.Coordinates) {
      return [0, 0, 0];
    }
    return this.getPointTuple(point.Coordinates);
  }

  private getPointTuple(values: any[]): number[] {
    const coords = values.map((value) => {
      if (value && typeof value === 'object') {
        return Number(value._representationValue ?? value.value ?? 0);
      }
      return Number(value ?? 0);
    });

    return [
      coords[0] ?? 0,
      coords[1] ?? 0,
      coords[2] ?? 0,
    ];
  }

  private getDirectionVector(direction: any, fallback: number[]): number[] {
    if (!direction?.DirectionRatios) {
      return fallback;
    }
    const ratios = direction.DirectionRatios.map((value: any) => {
      if (value && typeof value === 'object') {
        return Number(value._representationValue ?? value.value ?? 0);
      }
      return Number(value ?? 0);
    });
    return [
      ratios[0] ?? fallback[0],
      ratios[1] ?? fallback[1],
      ratios[2] ?? fallback[2],
    ];
  }

  private transformPoint(point: number[], matrix: number[]): number[] {
    const [x, y, z] = point;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    ];
  }

  /**
   * 将 IFC 的 z-up 坐标转换为场景中的 y-up 坐标。
   * 这是一个绕 X 轴 -90° 的旋转，保持右手系不变。
   */
  private convertIfcPointToScenePoint(point: number[]): number[] {
    const [x, y, z] = point;
    return [x, z, -y];
  }

  private combinePlacementMatrices(parent: number[], local: number[]): number[] {
    const translation = this.transformPoint([local[12], local[13], local[14]], parent);
    const xAxis = this.transformDirection([local[0], local[1], local[2]], parent);
    const yAxis = this.transformDirection([local[4], local[5], local[6]], parent);
    const zAxis = this.transformDirection([local[8], local[9], local[10]], parent);

    return [
      xAxis[0], xAxis[1], xAxis[2], 0,
      yAxis[0], yAxis[1], yAxis[2], 0,
      zAxis[0], zAxis[1], zAxis[2], 0,
      translation[0], translation[1], translation[2], 1,
    ];
  }

  private transformDirection(direction: number[], matrix: number[]): number[] {
    const [x, y, z] = direction;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z,
      matrix[1] * x + matrix[5] * y + matrix[9] * z,
      matrix[2] * x + matrix[6] * y + matrix[10] * z,
    ];
  }

  private normalizeVector(vector: number[], fallback: number[]): number[] {
    const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2 + vector[2] ** 2);
    if (!length) return fallback;
    return [vector[0] / length, vector[1] / length, vector[2] / length];
  }

  private crossVector(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private identityMatrix(): number[] {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
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

  /**
   * 收集所有非几何元素ID并统计总数
   * @param modelID 模型ID
   * @returns 包含总数和非几何元素列表的对象
   */
  public async collectNonGeometryElements(
    modelID: number
  ): Promise<{ total: number; elements: { typeIndex: number; ids: number[]; count: number }[] }> {
    // 优化：使用普通对象替代 Set，避免 Set 大小限制
    const geometriesIDs = await this.getAllGeometriesIDs(modelID, this.webIfc);
    const geometriesSet: { [key: number]: boolean } = {};
    for (let i = 0; i < geometriesIDs.length; i++) {
      geometriesSet[geometriesIDs[i]] = true;
    }

    const types = this.webIfc.GetAllTypesOfModel(modelID);
    const typeEntries = Object.values(types);
    const allNonGeometryIds: { typeIndex: number; ids: number[]; count: number }[] = [];
    let totalNonGeometryElements = 0;

    for (let typeIndex = 0; typeIndex < typeEntries.length; typeIndex++) {
      const type = typeEntries[typeIndex];
      const ids = this.webIfc.GetLineIDsWithType(modelID, type.typeID);
      const idsSize = ids.size();

      if (idsSize === 0) continue;

      const nonGeometryIds: number[] = new Array(Math.min(idsSize, 5000));
      let nonGeometryCount = 0;

      for (let i = 0; i < idsSize; i++) {
        const id = ids.get(i);
        if (!geometriesSet[id]) {
          nonGeometryIds[nonGeometryCount++] = id;
        }
      }

      if (nonGeometryCount > 0) {
        totalNonGeometryElements += nonGeometryCount;
        allNonGeometryIds.push({ typeIndex, ids: nonGeometryIds, count: nonGeometryCount });
      }
    }

    return { total: totalNonGeometryElements, elements: allNonGeometryIds };
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
    const geomTypesArray = IfcGeometryTypeIds;

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
   * 带进度回调的模型属性获取方法（极致性能优化版）
   * @param modelID 模型ID
   * @param onProgress 进度回调函数
   * @param totalNonGeometryElements 可选：预先计算的非几何元素总数
   * @param allNonGeometryIds 可选：预先收集的非几何元素列表
   * @returns 包含所有非几何元素属性的对象
   */
  async getModelPropertiesWithProgress(
    modelID: number,
    onProgress: (percent: number) => void,
    totalNonGeometryElements?: number,
    allNonGeometryIds?: { typeIndex: number; ids: number[]; count: number }[]
  ): Promise<IfcProperties> {
    console.log(`开始获取模型属性，模型ID: ${modelID}`);

    const psetLines = this.webIfc.GetLineIDsWithType(
      modelID as number,
      WEBIFC.IFCRELDEFINESBYPROPERTIES
    );
    const psetRelations: number[][] = [];
    const properties = {} as { [key: string]: any };
    properties.coordinationMatrix = this.webIfc.GetCoordinationMatrix(modelID);

    // 使用预先收集的非几何元素列表，避免重复计算
    let finalNonGeometryIds: { typeIndex: number; ids: number[]; count: number }[];
    let finalTotal: number;

    if (allNonGeometryIds !== undefined) {
      // 已提供元素列表和总数，直接使用
      finalNonGeometryIds = allNonGeometryIds;
      finalTotal = totalNonGeometryElements ?? allNonGeometryIds.reduce((sum, entry) => sum + entry.count, 0);
    } else {
      // 未提供，需要收集并计算
      const result = await this.collectNonGeometryElements(modelID);
      finalNonGeometryIds = result.elements;
      finalTotal = totalNonGeometryElements ?? result.total;
    }

    let totalProcessed = 0;
    const startTime = Date.now();

    // 优化2：使用预收集的数据进行处理
    const BATCH_SIZE = 500;
    const YIELD_INCREMENT = finalTotal / 100;  // 每多处理 finalTotal / 100 个元素更新一次 UI

    let lastProgress = 0;
    let lastYieldAt = 0;  // 记录上次更新 UI 时的 totalAttempted
    let totalAttempted = 0;  // 追踪尝试处理的元素数（包括失败的）
    const updateProgress = (processed: number, force: boolean = false) => {
      const progress = finalTotal > 0
        ? Math.min(100, Math.round((processed / finalTotal) * 100))
        : 100;
      // 当强制更新或进度变化超过2%时才更新，平滑显示
      if (force || progress > lastProgress + 2 || progress === 100) {
        onProgress(progress);
        lastProgress = progress;
      }
    };

    // 优化3：直接串行处理所有类型
    for (const entry of finalNonGeometryIds) {
      const nonGeometryIds = entry.ids;
      const nonGeometryCount = entry.count;

      // 优化5：直接串行处理，避免Promise开销
      // 批处理但保持同步，减少事件循环开销
      for (let offset = 0; offset < nonGeometryCount; offset += BATCH_SIZE) {
        const end = Math.min(offset + BATCH_SIZE, nonGeometryCount);

        for (let i = offset; i < end; i++) {
          const id = nonGeometryIds[i];
          totalAttempted++;  // 每尝试一个元素就计数
          try {
            const props = this.webIfc.GetLine(modelID, id);
            if (props) {
              // 优化6：内联 GlobalId 转换
              if (props.GlobalId) {
                props.GlobalId.value = ifcGuidToUuid(props.GlobalId.value);
              }
              // 优化7：快速检查 + 内联 map 操作
              if (props.type === 4186316022 && props.RelatedObjects) {
                const relatedObjects = props.RelatedObjects;
                const mappedLength = relatedObjects.length;
                const mapped = new Array<number>(mappedLength);
                for (let j = 0; j < mappedLength; j++) {
                  const item = relatedObjects[j];
                  mapped[j] = (item && item.value) ? item.value : item;
                }
                psetRelations.push(mapped);
              }
              properties[id] = props;
              totalProcessed++;
            }
          } catch (e) {
            // 静默处理错误
          }
        }

        // 比上次更新多处理了 YIELD_INCREMENT 个元素时，更新 UI 并让出控制权
        if (totalAttempted - lastYieldAt >= YIELD_INCREMENT) {
          updateProgress(totalProcessed, true);  // 强制更新 UI
          await new Promise(resolve => setTimeout(resolve, 0));
          lastYieldAt = totalAttempted;
          // console.log(`已处理 ${totalProcessed} 个元素，总共  ${finalTotal} 个元素,处理间隔${YIELD_INCREMENT}`);
        }
      }

    }

    // 确保最终进度显示100%
    onProgress(100);

    const totalTime = Date.now() - startTime;
    const speed = totalProcessed > 0 ? Math.round(totalProcessed / (totalTime / 1000)) : 0;
    console.log(`属性获取完成，共 ${totalProcessed} 个元素, 总耗时: ${totalTime}ms, 速度: ${speed} 元素/秒`);

    return { properties, psetLines, psetRelations, total: finalTotal };
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
      const entityName = IfcTypes[type]?.cn || IfcTypes[type]?.en || '';
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
