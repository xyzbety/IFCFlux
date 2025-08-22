import { getIfcChineseName } from '../utils/ifc/ifcMap';
import * as BABYLON from '@babylonjs/core';
import { highlightMeshes, restoreMaterials } from '../utils/ifc-api';
/**
 * IFC属性处理工具函数
 */

export interface MeshHighlightConfig {
  scene: BABYLON.Scene;
  selectedMeshId: string;
  globalId: string;
  isHighlight: boolean;
  isFocus: boolean;
}

export interface TreeSyncConfig {
  treeData: any[];
  structureTreeRef?: any;
  pageState: {
    structureDialogVisible: boolean;
  };
}

export class IfcPropertyUtils {

  static rootExpressId = '0';
  static hiddenNodeIds = new Set<string>();

  /**
 * 在树结构中查找指定 expressId 的节点
 * @param treeData 树结构数据
 * @param expressID 要查找的 expressId
 * @returns 找到的节点或 undefined
 */
  static findNodeByExpressId(treeData: any[], expressID: string): any | undefined {
    // 深度优先搜索函数
    function dfs(node: any): any | undefined {
      // 检查当前节点是否匹配
      if (node.expressId === expressID) {
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
  static getAllChildrenExpressIds(nodes: any[], parentExpressId: string | number): string[] {
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
        node.children.forEach(child => collectAllChildren(child));
      }
    };

    const targetNode = findNode(nodes, parentExpressId);
    if (targetNode) {
      collectAllChildren(targetNode);
    }

    return allIds;
  }

  /**
   * 获取所有节点的 expressId
   * @param nodes - 节点数组
   * @returns 所有节点的expressId数组
   */
  static getAllExpressIds(nodes: any[]): string[] {
    let ids: string[] = [];
    nodes.forEach(node => {
      if (node.expressId) {
        ids.push(String(node.expressId));
      }
      if (node.children && node.children.length > 0) {
        ids = ids.concat(this.getAllExpressIds(node.children));
      }
    });
    return ids;
  }

  /**
   * 判断是否为特殊mesh（不需要处理可见性的mesh）
   * @param meshName - mesh名称
   * @returns 是否为特殊mesh
   */
  static isSpecialMesh(meshName: string): boolean {
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
   * 更新模型可见性（通用版本）
   * @param scene - Babylon.js场景对象
   * @param selectedRowKeys - 选中的行键数组
   * @param treeData - 树形数据
   * @param clearStateSets - 清理状态集合的回调函数
   */
  static updateModelVisibility(
    scene: any,
    selectedRowKeys: (string | number)[],
    treeData: any[],
    clearStateSets?: () => void
  ): void {
    if (!scene) return;

    // 获取所有选中节点及其子节点的 expressId
    const allVisibleIds = new Set<string>();

    selectedRowKeys.forEach(expressId => {
      const childrenIds = this.getAllChildrenExpressIds(treeData, expressId);
      childrenIds.forEach(id => allVisibleIds.add(String(id)));
    });
    console.log('所有可见的expressId:', Array.from(allVisibleIds));

    // 更新场景中所有 mesh 的可见性
    scene.meshes.forEach(mesh => {
      // 跳过特殊 mesh
      if (this.isSpecialMesh(mesh.name)) {
        return;
      }

      // 根据 expressId 或 globalId 判断是否应该可见
      const meshExpressId = mesh.metadata?.globalId || mesh.id;
      const shouldBeVisible = allVisibleIds.has(String(meshExpressId));

      // 设置可见性
      mesh.isVisible = shouldBeVisible;

      // 可选：打印调试信息
      if (!shouldBeVisible && mesh.isVisible !== shouldBeVisible) {
        console.log(`隐藏模型: ${meshExpressId}`);
      }
    });

    // 调用清理状态集合的回调
    if (clearStateSets) {
      clearStateSets();
    }
  }
  /**
   * 基于复选框状态更新模型可见性
   * @param scene - Babylon.js场景对象  
   * @param expressId - 当前操作的节点expressId
   * @param isChecked - 复选框是否选中
   * @param treeData - 树形数据
   **/
  static updateModelVisibilityByCheckbox(
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
        this.hiddenNodeIds.delete(String(id));
      });
      console.log(`显示节点及子节点: ${expressId}`);
    } else {
      // 复选框未选中：隐藏当前节点及其子节点
      currentNodeAndChildrenIds.forEach(id => {
        this.hiddenNodeIds.add(String(id));
      });
      console.log(`隐藏节点及子节点: ${expressId}`);
    }

    console.log('当前隐藏的节点集合:', Array.from(this.hiddenNodeIds));

    // 更新场景中所有 mesh 的可见性
    scene.meshes.forEach(mesh => {
      // 跳过特殊 mesh
      if (this.isSpecialMesh(mesh.name)) {
        return;
      }

      // 根据 expressId 或 globalId 判断是否应该可见
      const meshExpressId = mesh.metadata?.globalId || mesh.id;
      const shouldBeHidden = this.hiddenNodeIds.has(String(meshExpressId));

      // 设置可见性：如果在隐藏集合中则隐藏，否则显示
      const newVisibility = !shouldBeHidden;

      if (mesh.isVisible !== newVisibility) {
        mesh.isVisible = newVisibility;
        console.log(`${newVisibility ? '显示' : '隐藏'}模型: ${meshExpressId}`);
      }
    });
  }
  /**
   * 查找父节点IDs路径
   * @param tree - 树形数据
   * @param targetId - 目标节点ID
   * @param path - 当前路径
   * @returns 父节点ID路径数组
   */
  static findParentIds(tree: any[], targetId: string | number, path: string[] = []): string[] | null {
    for (const node of tree) {
      if (String(node.expressId) === String(targetId)) {
        return path;
      }
      if (node.children) {
        const result = this.findParentIds(node.children, targetId, [...path, String(node.expressId)]);
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * 获取构件属性数据（纯数据处理，不依赖组件状态）
   * @param expressID - 构件ID
   * @param propertyAll - 所有属性数据
   * @param ifcExpressIds - IFC Express IDs映射
   * @returns 格式化的属性数据数组
   */
  static async getProperty(
    expressID: string,
    propertyAll: any[],
    ifcExpressIds: any[]
  ): Promise<any[]> {
    const showPropertyKey = ['GlobalId', 'Name', 'LongName', 'ObjectType', 'Tag', 'Phase', 'type'];
    const property = [];
    const pset = propertyAll[expressID];
    let spec: any[] = [];
    const expressIdsArray = Object.values(ifcExpressIds);

    // 找到当前expressID的索引
    const currentIndex = expressIdsArray.findIndex(id => id === expressID);

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
      console.log(`未找到expressID: ${expressID}`);
    }

    if (pset === undefined) {
      return [];
    } else if (Object.keys(pset).length > 0) {
      const value = [] as any[];
      let id = 1;

      Object.keys(pset).map((key: string) => {
        if (showPropertyKey.indexOf(key) > -1) {
          const v = pset[key]?.value !== undefined ? pset[key]?.value : pset[key];
          if (v !== null) {
            if (key === 'type') {
              value.push({
                id,
                name: 'IfcEntity',
                value: getIfcChineseName(v)
              });
            } else {
              value.push({
                id,
                name: key,
                value: v
              });
            }
            id++;
          }
        }
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

      spec.forEach((p: any) => {
        if (p.type === 1451395588) {
          id++;
          property.push({
            id,
            name: p.Name?.value,
            value: '',
            children: p.HasProperties.map((v: any) => {
              const value = propertyAll[v?.value];
              id++;
              return {
                id,
                name: value.Name.value,
                value: typeof (value.NominalValue) === ('string' || 'number') ? value.NominalValue : String(value.NominalValue?.value)
              };
            }),
          });
        }
      });
    }

    return property;
  }

  static async flattenTreeToGroupedItems(treeData) {
    const result = [];

    treeData.forEach(parentNode => {
      // 检查是否有子节点
      if (parentNode.children && Array.isArray(parentNode.children)) {
        // 遍历子节点，添加 group 字段
        parentNode.children.forEach(child => {
          result.push({
            id: child.id,
            name: child.name,
            value: child.value,
            group: parentNode.name
          });
        });
      }
    });

    return result;
  }
  /**
   * 简化版本：只返回 expressId 到行号的映射
   */
  static getExpressIdToRowMapping(treeData) {
    const mapping = new Map();
    let currentRow = 1;

    function traverse(node) {
      // 记录当前节点的行号
      if (node.expressId) {
        mapping.set(node.expressId, currentRow);
      }
      currentRow++;

      // 处理子节点
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverse(child));
      }
    }

    if (Array.isArray(treeData)) {
      treeData.forEach(node => traverse(node));
    } else {
      traverse(treeData);
    }

    return mapping;
  }

  /**
   * 初始化模型数据的通用处理
   * @param modelData - 模型数据
   * @param findNodesUpToLevel - 查找节点到指定层级的函数
   * @returns 初始化结果
   */
  static initializeModelData(
    modelData: any
  ): {
    treeData: any[];
    expandedKeys: any[];
    allExpressIds: string[];
    ifcExpressIds: any[];
    propertyAll: any[];
  } {
    const treeData = modelData.tree;
    this.rootExpressId = modelData.tree[0].expressId;

    // 结构目录默认展开到第五层级
    const expandedKeys = IfcPropertyUtils.findNodesUpToLevel(treeData, 5);

    // 获取所有节点的 expressId 并设置为默认选中
    const allExpressIds = this.getAllExpressIds(treeData);

    const ifcExpressIds = modelData.ifcExpressIds;
    const propertyAll = modelData.properties;

    return {
      treeData,
      expandedKeys,
      allExpressIds,
      ifcExpressIds,
      propertyAll
    };
  }
  /**
     * 处理构件点击事件 - 包含树同步和mesh高亮
     * @param expressID - 构件的expressID
     * @param meshConfig - mesh高亮配置
     * @param treeConfig - 树同步配置（可选）
     * @returns Promise<boolean> - 是否成功处理
     */
  static async handleComponentClick(
    expressID: string,
    meshConfig: MeshHighlightConfig,
    treeConfig?: TreeSyncConfig
  ): Promise<boolean> {
    if (!expressID || !meshConfig.scene) {
      console.warn('handleComponentClick: expressID or scene is missing');
      return false;
    }

    try {

      const highlighted = await this.highlightComponentMesh(expressID, meshConfig, treeConfig?.treeData);

      return highlighted;
    } catch (error) {
      console.error('handleComponentClick error:', error);
      return false;
    }
  }


  /**
   * 高亮构件对应的mesh
   * @param expressID - 构件的expressID
   * @param meshConfig - mesh高亮配置
   * @param treeData - 树数据（用于查找子节点）
   * @returns boolean - 是否成功高亮
   */
  private static async highlightComponentMesh(
    expressID: string,
    meshConfig: MeshHighlightConfig,
    treeData?: any[]
  ): Promise<boolean> {
    const { scene, selectedMeshId, globalId, isHighlight, isFocus } = meshConfig;

    // 查找当前节点及其所有子节点的expressID
    const allExpressIds = treeData ?
      this.findAllChildExpressIds(treeData, expressID) :
      [expressID];

    allExpressIds.push(expressID); // 包含当前节点本身
    const expressIdSet = new Set(allExpressIds);

    // 基于 GlobalId 查找对应的mesh进行联动
    const exactMatches = scene.meshes.filter(mesh => {
      // 优先使用 GlobalId 匹配，如果没有则使用 expressId
      return expressIdSet.has(mesh.metadata?.globalId) || expressIdSet.has(mesh.id);
    });

    // 排除天空盒
    if (exactMatches.length === 1 && exactMatches[0]?.name === 'skyBox') {
      return false;
    }

    // 检查mesh可见性
    let isVisibleMeshHighlight = true;
    scene.meshes.forEach((mesh) => {
      if (mesh.name === selectedMeshId || mesh.metadata?.globalId === globalId) {
        isVisibleMeshHighlight = mesh.isVisible;
      }
    });

    // 高亮mesh
    if (isHighlight && isVisibleMeshHighlight && exactMatches.length > 0) {
      highlightMeshes(exactMatches, scene, isFocus);
      return true;
    }

    return false;
  }

  /**
   * 批量处理构件点击事件
   * @param expressIDs - 构件ID数组
   * @param meshConfig - mesh高亮配置
   * @param treeConfig - 树同步配置（可选）
   * @returns Promise<number> - 成功处理的数量
   */
  static async handleMultipleComponentsClick(
    expressIDs: string[],
    meshConfig: MeshHighlightConfig,
    treeConfig?: TreeSyncConfig
  ): Promise<number> {
    let successCount = 0;

    for (const expressID of expressIDs) {
      const success = await this.handleComponentClick(expressID, meshConfig, treeConfig);
      if (success) {
        successCount++;
      }
    }

    return successCount;
  }

  /**
   * 检查构件是否可见
   * @param expressID - 构件ID
   * @param scene - 场景对象
   * @param treeData - 树数据（可选）
   * @returns boolean - 是否可见
   */
  static isComponentVisible(expressID: string, scene: BABYLON.Scene, treeData?: any[]): boolean {
    const allExpressIds = treeData ?
      this.findAllChildExpressIds(treeData, expressID) :
      [expressID];

    allExpressIds.push(expressID);
    const expressIdSet = new Set(allExpressIds);

    const relatedMeshes = scene.meshes.filter(mesh => {
      return expressIdSet.has(mesh.metadata?.globalId) || expressIdSet.has(mesh.id);
    });

    return relatedMeshes.some(mesh => mesh.isVisible);
  }

  /**
   * 获取构件对应的所有mesh
   * @param expressID - 构件ID
   * @param scene - 场景对象
   * @param treeData - 树数据（可选）
   * @returns BABYLON.AbstractMesh[] - 相关的mesh数组
   */
  static getComponentMeshes(expressID: string, scene: BABYLON.Scene, treeData?: any[]): BABYLON.AbstractMesh[] {
    const allExpressIds = treeData ?
      this.findAllChildExpressIds(treeData, expressID) :
      [expressID];

    allExpressIds.push(expressID);
    const expressIdSet = new Set(allExpressIds);

    return scene.meshes.filter(mesh => {
      return expressIdSet.has(mesh.metadata?.globalId) || expressIdSet.has(mesh.id);
    });
  }

  /**
   * 清除所有高亮效果
   * @param scene - 场景对象
   */
  static clearAllHighlights(scene: BABYLON.Scene): void {
    // 这里可以调用已有的清除高亮的方法
    // 例如：clearHighlights(scene) 
    restoreMaterials(scene)
    scene.meshes.forEach(mesh => {
      if (mesh.renderOutline) {
        mesh.renderOutline = false;
      }
      if (mesh.outlineColor) {
        mesh.outlineColor = BABYLON.Color3.Black();
      }
      if (mesh.outlineWidth) {
        mesh.outlineWidth = 0;
      }
    });
  }

  // 递归查找指定层级节点
  static findNodesUpToLevel(nodes: any[], maxLevel: number, currentLevel = 1, result: string[] = []) {
    if (!nodes || currentLevel > maxLevel) return result;

    nodes.forEach(node => {
      if (currentLevel <= maxLevel) {
        result.push(node.expressId);
      }
      if (node.children && node.children.length > 0) {
        IfcPropertyUtils.findNodesUpToLevel(node.children, maxLevel, currentLevel + 1, result);
      }
    });

    return result;
  };


  static findAllChildExpressIds(nodes: any[], targetExpressId: string, result: string[] = []): string[] {
    for (const node of nodes) {
      if (node.expressId === targetExpressId) {
        // 找到目标节点，递归收集所有子节点
        if (node.children && node.children.length > 0) {
          IfcPropertyUtils.collectChildExpressIds(node.children, result);
        }
        break;
      }

      // 继续搜索子节点
      if (node.children && node.children.length > 0) {
        IfcPropertyUtils.findAllChildExpressIds(node.children, targetExpressId, result);
      }
    }
    return result;
  }

  // 辅助函数：收集所有子节点的expressID
  static collectChildExpressIds(nodes: any[], result: string[]) {
    nodes.forEach(node => {
      result.push(node.expressId);
      if (node.children && node.children.length > 0) {
        IfcPropertyUtils.collectChildExpressIds(node.children, result);
      }
    });
  }


  static getChildrenExpressIds(node) {
    let expressIds: any[] = [];

    function traverse(children) {
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
    }

    traverse(node.children);
    return expressIds;
  }
}