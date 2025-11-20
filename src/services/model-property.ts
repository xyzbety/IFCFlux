import { IfcCategoryMap } from '../utils/ifc/ifcCategoryMap'
import * as BABYLON from '@babylonjs/core';
import { EffectManager } from './scene-effect';

export interface MeshHighlightConfig {
  scene: BABYLON.Scene;
  isFocus: boolean;
}

export class IfcPropertyUtils {
  private static instance: IfcPropertyUtils | null = null;

  private hiddenNodeIds = new Set<number>();
  private effectManager: EffectManager | null = null;

  private constructor() {
    // 私有构造函数，防止外部实例化
  }

  // 获取单例实例
  public static getInstance(): IfcPropertyUtils {
    if (!IfcPropertyUtils.instance) {
      IfcPropertyUtils.instance = new IfcPropertyUtils();
    }
    return IfcPropertyUtils.instance;
  }

  // 重置单例（如果需要）
  public static resetInstance(): void {
    IfcPropertyUtils.instance = null;
  }

  /**
   * 在树结构中查找指定 expressId 的节点
   * @param treeData 树结构数据
   * @param expressID 要查找的 expressId
   * @returns 找到的节点或 undefined
   */
  public findNodeByExpressId(treeData: any[], expressID: string): any | undefined {
    // 深度优先搜索函数
    function dfs(node: any): any | undefined {
      // 检查当前节点是否匹配
      if (node.expressId == expressID) {
        return node;
      }

      // 递归检查子节点
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = dfs(child);
          if (found) {
            return found;
          }
        }
      }

      return undefined;
    }

    // 处理数组形式的树数据
    if (Array.isArray(treeData)) {
      for (const node of treeData) {
        const found = dfs(node);
        if (found) {
          return found;
        }
      }
    }
    // 处理单个根节点的情况
    else if (treeData) {
      return dfs(treeData);
    }

    return undefined;
  }

  /**
   * 递归获取节点及其所有子节点的 expressId
   * @param nodes - 节点数组
   * @param parentExpressId - 父节点的expressId
   * @returns 所有子节点的expressId数组
   */
  public getAllChildrenExpressIds(nodes: any[], parentExpressId: string | number): string[] {
    let allIds: string[] = [];

    const findNode = (nodeList: any[], targetId: string | number): any => {
      for (const node of nodeList) {
        if (String(node.expressId) === String(targetId)) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const collectAllChildren = (node: any): void => {
      if (node.expressId) {
        allIds.push(String(node.expressId));
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => collectAllChildren(child));
      }
    };

    const targetNode = findNode(nodes, parentExpressId);
    if (targetNode) {
      collectAllChildren(targetNode);
    }

    return allIds;
  }

  /**
   * 判断是否为特殊mesh（不需要处理可见性的mesh）
   * @param meshName - mesh名称
   * @returns 是否为特殊mesh
   */
  public isSpecialMesh(meshName: string): boolean {
    const specialMeshNames = [
      'skyBox',
      'ground',
      'infiniteGrid',
      'measureLine',
      'tempLine',
      'measureRectangle',
      'tempRectangle',
      'rectangleMesh',
      'pointMarker'
    ];
    return specialMeshNames.includes(meshName);
  }

  /**
   * 基于复选框状态更新模型可见性
   * @param scene - Babylon.js场景对象  
   * @param expressId - 当前操作的节点expressId
   * @param isChecked - 复选框是否选中
   * @param treeData - 树形数据
   **/
  public updateModelVisibilityByCheckbox(
    scene: any,
    expressId: string | number,
    isChecked: boolean,
    treeData: any[],
  ): void {
    if (!scene) return;

    // 获取当前节点及其所有子节点的 expressId
    const currentNodeAndChildrenIds = this.getAllChildrenExpressIds(treeData, expressId);
    console.log(`节点 ${expressId} 及其子节点:`, currentNodeAndChildrenIds);

    if (isChecked) {
      // 复选框选中：显示当前节点及其子节点
      currentNodeAndChildrenIds.forEach(id => {
        this.hiddenNodeIds.delete(Number(id));
      });
      console.log(`显示节点及子节点: ${expressId}`);
    } else {
      // 复选框未选中：隐藏当前节点及其子节点
      currentNodeAndChildrenIds.forEach(id => {
        this.hiddenNodeIds.add(Number(id));
      });
      console.log(`隐藏节点及子节点: ${expressId}`);
    }

    console.log('当前隐藏的节点集合:', Array.from(this.hiddenNodeIds));

    // 更新场景中所有 mesh 的可见性
    scene.meshes.forEach((mesh: BABYLON.AbstractMesh) => {
      // 跳过特殊 mesh
      if (this.isSpecialMesh(mesh.id)) {
        return;
      }

      // 处理合并网格的可见性控制
      if (mesh.metadata?.isMergedMesh) {
        const mergedFrom = mesh.metadata.mergedFrom || [];

        // 遍历所有子网格
        mergedFrom.forEach((subMeshInfo: any) => {
          const expressID = subMeshInfo.originalExpressID;

          // 检查子网格的expressID是否在隐藏集合中
          if (this.hiddenNodeIds.has(Number(expressID))) {
            // 隐藏子网格
            if (mesh.metadata.hideSubMesh) {
              mesh.metadata.hideSubMesh(expressID);
              console.log(`隐藏子网格: ${expressID}`);
            }
          } else {
            // 不在隐藏集合中：确保可见
            if (mesh.metadata.restoreSubMesh) {
              mesh.metadata.restoreSubMesh(expressID);
            }
          }
        });

      }
      if(mesh.name.includes('highlight')){
        if(isChecked){
          mesh.isVisible = true;
        }else{
          mesh.isVisible = false;
        }
      }
    });
  }

  /**
   * 获取构件属性数据（纯数据处理，不依赖组件状态）
   * @param expressID - 构件ID
   * @param propertyAll - 所有属性数据
   * @param ifcExpressIds - IFC Express IDs映射
   * @returns 格式化的属性数据数组
   */
  public async getProperty(
    expressID: string,
    propertyAll: any[],
    ifcExpressIds: any[],
    psetRelations: any[],
    psetLines: any,
  ): Promise<any[]> {
    const showPropertyKey = ['type', 'GlobalId', 'Name', 'PredefinedType', 'ObjectType', 'Tag'];
    const property = [];
    const processedExpressID = expressID;
    const pset = propertyAll[Number(processedExpressID)];
    let spec: any[] = [];
    const expressIdsArray = Object.values(ifcExpressIds);

    // 找到当前expressID的索引
    const currentIndex = expressIdsArray.findIndex(id => id == processedExpressID);

    if (currentIndex !== -1) {
      const currentElement = expressIdsArray[currentIndex];
      const nextElement = expressIdsArray[currentIndex + 1];

      if (currentElement && nextElement) {
        for (let i = Number(currentElement); i < Number(nextElement); i++) {
          const currentData = propertyAll[i];
          if (currentData) {
            spec.push(currentData);
          }
        }
      }
    } else {
      console.log(`未找到expressID: ${processedExpressID}`);
    }

    if (pset === undefined) {
      return [];
    } else if (Object.keys(pset).length > 0) {
      const value = [] as any[];
      let id = 1;

      showPropertyKey.forEach((key: string) => {
        let v = '';
        if (key === 'type') {
          // 特殊处理 type 属性
          if (pset[key] !== undefined) {
            v = IfcCategoryMap[pset[key]]?.en || '';
          }
          value.push({
            id,
            name: 'IfcEntity',
            value: v
          });
        } else {
          // 处理其他属性
          if (pset[key] !== undefined) {
            v = pset[key]?.value !== undefined ? pset[key]?.value : pset[key];
          }
          value.push({
            id,
            name: key,
            value: v
          });
        }
        id++;
      });

      const specific = {
        id,
        name: 'Element Specific',
        value: '',
        children: value.sort((a: any, b: any) => {
          return a.name - b.name;
        }),
      };
      property.push(specific);

      // 获取关联属性集
      spec.forEach((p: any) => {
        if (p.type === 1451395588) {
          id++;
          property.push({
            id,
            name: p.Name?.value,
            value: '',
            children: p.HasProperties.map((v: any) => {
              const value = propertyAll[v?.value];
              let nominalValue = value.NominalValue;
              if (typeof nominalValue === 'boolean') {
                nominalValue = nominalValue ? '是' : '否';
              }
              else if (typeof nominalValue === 'object' && nominalValue !== null && 'value' in nominalValue) {
                if (typeof nominalValue.value === 'boolean') {
                  nominalValue = nominalValue.value ? '是' : '否';
                } else {
                  nominalValue = nominalValue.value;
                }
              }
              id++;
              return {
                id,
                name: value.Name.value,
                value: nominalValue
              };
            }),
          });
        }
      });

      const psetIds = [] as any
      // 查找与此元素关联的属性集
      if (psetRelations && psetLines) {
        for (let i = 0; i < psetRelations.length; i++) {
          if (psetRelations[i].includes(Number(processedExpressID))) {
            psetIds.push(psetLines.get(i))
          }
        }
      }

      // 获取属性集的定义 ID
      const rawPsetIds = psetIds.map((id: number) =>
        propertyAll[id].RelatingPropertyDefinition.value
      )

      // 获取属性集对象
      const rawPsets = rawPsetIds.map((id: number) => propertyAll[id])
      for (const pset of rawPsets) {
        //@ts-ignore
        // 解包属性集并添加到属性对象中
        // property[pset.Name] = this.unpackPsetOrComplexProp(pset, propertyAll)
        property.push({
          id,
          name: pset.Name?.value,
          children: this.unpackPsetOrComplexProp(pset, propertyAll, id)
        })
      }


    }

    return property;
  }

  // 解包属性集或复杂属性
  private unpackPsetOrComplexProp(pset: { HasProperties: any }, properties: any, id: any) {
    const parsed: any = []
    if (!pset.HasProperties || !Array.isArray(pset.HasProperties)) return parsed
    for (const psetId of pset.HasProperties) {
      const value = properties[psetId.value]
      id++;
      if (value?.type === 2542286263) {
        parsed[value.Name] = this.unpackPsetOrComplexProp(value, properties, id) // 递归解包复杂属性
      } else if (value?.type === 3650150729) {
        let nominalValue = value.NominalValue;
        if (typeof nominalValue === 'boolean') {
          nominalValue = nominalValue ? '是' : '否';
        }
        else if (typeof nominalValue === 'object' && nominalValue !== null && 'value' in nominalValue) {
          if (typeof nominalValue.value === 'boolean') {
            nominalValue = nominalValue.value ? '是' : '否';
          } else {
            nominalValue = nominalValue.value;
          }
        }
        id++;
        parsed.push({
          id,
          name: value.Name.value,
          value: nominalValue
        })
      }
    }
    return parsed
  }

  public async flattenTreeToGroupedItems(treeData: any[]): Promise<{
    items: any[];
    groupRowMap: Map<number, string>;
  }> {
    const result: any[] = [];
    const groupRowMap = new Map<number, string>();

    // 首先收集所有分组数据
    const groupedData: { [key: string]: any[] } = {};

    treeData.forEach((parentNode: { children: any[]; name: any; }) => {
      // 检查是否有子节点
      if (parentNode.children && Array.isArray(parentNode.children)) {
        groupedData[parentNode.name] = parentNode.children.map((child: { id: any; name: any; value: any; }) => ({
          id: child.id,
          name: child.name,
          value: child.value,
          group: parentNode.name
        }));
      }
    });

    // 确保 Element Specific 排在第一位
    const sortedGroupNames = Object.keys(groupedData).sort((a, b) => {
      // Element Specific 永远排在第一位
      if (a === 'Element Specific' && b !== 'Element Specific') {
        return -1;
      }
      if (b === 'Element Specific' && a !== 'Element Specific') {
        return 1;
      }
      // 如果都是 Element Specific 或都不是，按首字母排序
      return a.localeCompare(b);
    });

    let currentRow = 1; // 从第1行开始

    // 按排序后的分组名处理数据
    sortedGroupNames.forEach(groupName => {
      // 记录行数对应的分组名
      groupRowMap.set(currentRow, groupName);

      // 分组名占一行
      currentRow++;

      // 添加该分组的所有子项
      const groupItems = groupedData[groupName];
      groupItems.forEach(item => {
        result.push(item);
        currentRow++;
      });
    });

    return {
      items: result,
      groupRowMap
    };
  }

  /**
   * 处理构件点击事件 - 包含树同步和mesh高亮
   * @param expressID - 构件的expressID
   * @param meshConfig - mesh高亮配置
   * @param treeConfig - 树同步配置（可选）
   */
  public async handleComponentClick(
    expressID: string,
    meshConfig: MeshHighlightConfig,
    treeData?: any[]
  ) {
    console.log('handleComponentClick:', expressID, meshConfig, treeData);
    if (!expressID || !meshConfig.scene) {
      console.warn('handleComponentClick: expressID or scene is missing');
      return;
    }

    try {
      const { scene, isFocus } = meshConfig;
      const result = this.findAllChildExpressIds(treeData, expressID);
      result.push(expressID);
      // 统一使用字符串类型进行匹配
      const expressIdSet = new Set(result.map(id => String(id)));

      const exactMatches = []
      scene.meshes.forEach(mesh => {

        if (mesh.metadata && mesh.metadata.originalMeshData) {
          mesh.metadata.originalMeshData.forEach((item: any) => {
            // 统一使用字符串类型进行匹配
            if (expressIdSet.has(String(item.metadata.originalExpressID))) {
              exactMatches.push(item);
            }
          })
        }
      });
      const highlightMeshes = [];
      if (exactMatches.length) {
        exactMatches.forEach((item, index) => {
          const highlightMesh = new BABYLON.Mesh(`highlight_${expressID}_${index}`, scene);
          if (!highlightMeshes.includes(highlightMesh))
            highlightMeshes.push(highlightMesh);

          // 设置mesh的几何数据 - 使用正确的数据源
          if (item.positions && item.indices) {
            const vertexData = new BABYLON.VertexData();
            vertexData.positions = item.positions;
            vertexData.indices = item.indices;

            // 如果有法线数据，也设置上
            if (item.normals) {
              vertexData.normals = item.normals;
            }

            vertexData.applyToMesh(highlightMesh);
          }

          // 设置mesh的变换信息
          if (item.transformMatrix) {
            highlightMesh.setPivotMatrix(item.transformMatrix);
          }

          // 关键修复：为新创建的高亮mesh设置材质
          // 使用合并网格的材质作为基础材质
          if (item.material) {
            highlightMesh.material = item.material;
          } else {
            // 如果没有材质，创建一个默认的材质
            const defaultMaterial = new BABYLON.StandardMaterial(`highlight_default_${expressID}`, scene);
            defaultMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            highlightMesh.material = defaultMaterial;
          }

          // 确保高亮mesh可见
          highlightMesh.isVisible = true;
          highlightMesh.isPickable = false;

          // 设置mesh的ID和metadata
          highlightMesh.id = expressID;
          highlightMesh.metadata = {
            isHighlightMesh: true,
            originalExpressID: expressID,
            createdFromMergedMesh: false,
          };

        })
      }
      if (highlightMeshes.length > 0) {
        let mergedHighlightMesh = null
        if (highlightMeshes.length === 1) {
          mergedHighlightMesh = highlightMeshes[0];
        } else {
          mergedHighlightMesh = this.mergeHighlightMeshes(highlightMeshes, scene, expressID);

          // 清理临时创建的高亮网格
          highlightMeshes.forEach(mesh => {
            mesh.dispose();
          });
        }

        if (!this.effectManager) {
          this.effectManager = EffectManager.getInstance(scene);
        }

        // 将合并后的网格添加到效果管理器
        this.effectManager.simpleTarget?.renderList?.push(mergedHighlightMesh);
        this.effectManager.simpleTarget.setMaterialForRendering(mergedHighlightMesh, mergedHighlightMesh.material);

        this.effectManager.applyHighlight([mergedHighlightMesh]);

        // 自动聚焦
        if (isFocus) {
          try {
            const bbox = mergedHighlightMesh.getBoundingInfo().boundingBox;
            const arcRotateCamera = scene.activeCamera as BABYLON.ArcRotateCamera;
            arcRotateCamera.setTarget(bbox.center);
            arcRotateCamera.radius = bbox.maximum.subtract(bbox.minimum).length() * 1.8;
          } catch (e) {
            console.error("Focus error:", e);
          }
        }
        return;
      }

      return;
    } catch (error) {
      console.error('handleComponentClick error:', error);
      return;
    }
  }

  /**
   * 合并所有高亮网格成一个网格
   * @param highlightMeshes - 高亮网格数组
   * @param scene - 场景对象
   * @param expressID - 构件ID
   * @returns 合并后的网格
   */
  private mergeHighlightMeshes(highlightMeshes: BABYLON.Mesh[], scene: BABYLON.Scene, expressID: string): BABYLON.Mesh {
    if (highlightMeshes.length === 1) {
      // 如果只有一个网格，直接返回
      return highlightMeshes[0];
    }

    // 创建合并后的网格
    const mergedMesh = new BABYLON.Mesh(`merged_highlight_${expressID}`, scene);

    // 收集所有网格的顶点数据
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    const allNormals: number[] = [];

    let vertexOffset = 0;

    highlightMeshes.forEach((mesh, index) => {
      // 获取网格的几何数据
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = mesh.getIndices();
      const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

      if (positions && indices) {
        // 添加顶点位置数据
        allPositions.push(...positions);

        // 添加索引数据（需要偏移）
        const offsetIndices = indices.map(idx => idx + vertexOffset);
        allIndices.push(...offsetIndices);

        // 添加法线数据（如果有）
        if (normals) {
          allNormals.push(...normals);
        }

        // 更新顶点偏移量
        vertexOffset += positions.length / 3;
      }
    });

    // 创建顶点数据并应用到合并后的网格
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = allPositions;
    vertexData.indices = allIndices;

    if (allNormals.length > 0) {
      vertexData.normals = allNormals;
    }

    vertexData.applyToMesh(mergedMesh);

    // 设置材质（使用第一个网格的材质）
    if (highlightMeshes[0].material) {
      mergedMesh.material = highlightMeshes[0].material;
    } else {
      // 创建默认材质
      const defaultMaterial = new BABYLON.StandardMaterial(`merged_highlight_default_${expressID}`, scene);
      defaultMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
      mergedMesh.material = defaultMaterial;
    }

    // 设置网格属性
    mergedMesh.isVisible = true;
    mergedMesh.isPickable = false;
    mergedMesh.id = expressID;
    mergedMesh.metadata = {
      isHighlightMesh: true,
      originalExpressID: expressID,
      createdFromMergedMesh: true,
      mergedFrom: highlightMeshes.length
    };

    console.log(`成功合并 ${highlightMeshes.length} 个高亮网格`);
    return mergedMesh;
  }

  /**
   * 清除所有高亮效果
   * @param scene - 场景对象
   */
  public clearAllHighlights(scene: BABYLON.Scene): void {
    if (!this.effectManager) {
      this.effectManager = EffectManager.getInstance(scene);
    }
    this.effectManager.clearAll();
  }

  public findAllChildExpressIds(nodes: any[], targetExpressId: string, result: string[] = []): string[] {
    for (const node of nodes) {
      if (node.expressId === targetExpressId) {
        // 找到目标节点，递归收集所有子节点
        if (node.children && node.children.length > 0) {
          this.collectChildExpressIds(node.children, result);
        }
        break;
      }

      // 继续搜索子节点
      if (node.children && node.children.length > 0) {
        this.findAllChildExpressIds(node.children, targetExpressId, result);
      }
    }
    return result;
  }

  // 辅助函数：收集所有子节点的expressID
  public collectChildExpressIds(nodes: any[], result: string[]) {
    nodes.forEach(node => {
      result.push(node.expressId);
      if (node.children && node.children.length > 0) {
        this.collectChildExpressIds(node.children, result);
      }
    });
  }

  public getChildrenExpressIds(node: { children: any; }): any[] {
    let expressIds: any[] = [];

    const traverse = (children: any[]) => {
      if (children && Array.isArray(children)) {
        children.forEach(child => {
          if (child.expressId) {
            expressIds.push(child.expressId);
          }
          if (child.children) {
            traverse(child.children);
          }
        });
      }
    };

    traverse(node.children);
    return expressIds;
  }

  /**
 * 在嵌套结构中根据 guid 查找对应的 expressId
 * @param {Array<Object>} data 嵌套结构的根节点数组
 * @param {string} targetGuid 目标 guid
 * @returns {string | null} 匹配的 expressId，未找到则返回 null
 */
  public findExpressIdByGuid(data: any[], targetGuid: string): string | null {
    for (const node of data) {
      // 检查当前节点的 guid 是否匹配
      if (node.guid === targetGuid) {
        return node.expressId;
      }

      // 递归检查子节点
      if (node.children && node.children.length > 0) {
        const result = this.findExpressIdByGuid(node.children, targetGuid);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }
}


/**
 * 获取树形结构中所有需要展开的父节点的 key 值
 * @param data - 树形结构的顶层节点列表
 * @param childrenKey - 子节点在数据结构中的字段名，默认为 'children'
 * @returns 包含所有需要展开的父节点 key 的数组
 */
export function getAllExpandedKeys(data: any[], childrenKey = 'children') {
  // 初始化一个空数组，用于存储所有需要展开的父节点的 key
  const keys: string[] = [];

  /**
   * 递归遍历树形结构的辅助函数
   * @param list - 当前层级的节点列表
   */
  function traverse(list: any[]) {
    // 遍历当前层级的每个节点
    list.forEach(item => {
      // 检查当前节点是否有子节点
      if (item[childrenKey] && item[childrenKey].length) {
        // 如果有子节点，将当前节点的 key 存入 keys 数组
        keys.push(item.key);
        // 递归遍历子节点
        traverse(item[childrenKey]);
      }
    });
  }

  // 从顶层节点开始遍历
  traverse(data);
  // 返回所有需要展开的父节点的 key
  return keys;
}

/**
 * 将对象转换为树形结构数据
 * @param obj - 需要转换的原始对象
 * @returns 转换后的树形结构数据
 */
export function convertToTreeData(obj: any) {
  // 用于生成唯一ID的计数器
  let idCounter = 1;
  // 存储最终的树形结构数据
  const result = [];

  // 处理基础属性（非对象或数组类型的属性）
  const baseChildren = [];
  for (const [key, value] of Object.entries(obj)) {
    // 检查属性是否为非对象或数组类型
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      baseChildren.push({
        id: idCounter++, // 生成唯一ID
        key: `base-${idCounter}`, // 生成唯一key
        name: key === 'Entity' ? 'IfcEntity' : (key === 'Guid' ? 'GlobalId' : key), // 特殊字段名映射
        value: value, // 属性值
        _parentName: 'Element Specific' // 标记父节点名称
      });
    }
  }

  // 如果有基础属性，则添加到结果中
  if (baseChildren.length) {
    result.push({
      id: idCounter++,
      key: `element-specific-${idCounter}`,
      name: 'Element Specific', // 父节点名称
      value: '', // 父节点值
      children: baseChildren // 子节点列表
    });
  }

  // 处理对象类型的属性（属性集）
  for (const [key, value] of Object.entries(obj)) {
    // 检查属性是否为对象类型且非数组
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 遍历对象的子属性
      const children = Object.entries(value).map(([subKey, subVal]) => ({
        id: idCounter++,
        key: `child-${idCounter}`,
        name: subKey, // 子属性名称
        state: Array.isArray(subVal) ? subVal[0] : subVal, // 状态值（如果是数组，取第一个元素）
        value: Array.isArray(subVal)
          ? (typeof subVal[1] === 'boolean' ? (subVal[1] ? '是' : '否') : subVal[1]) // 处理布尔值显示
          : subVal, // 属性值
        dataType: Array.isArray(subVal) ? subVal[2] : subVal, // 数据类型（如果是数组，取第三个元素）
        _parentName: key // 标记父节点名称
      }));

      // 将属性集添加到结果中
      result.push({
        id: idCounter++,
        key: `parent-${idCounter}`,
        name: key, // 属性集名称
        value: '', // 父节点值
        children // 子节点列表
      });
    }
  }

  // 返回最终的树形结构数据
  return result;
}
