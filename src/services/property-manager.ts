import { getIfcChineseName } from '../utils/ifc/ifcMap';
import * as BABYLON from '@babylonjs/core';
import { getBoundingBoxForMeshes } from '../utils';

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
  private static instance: IfcPropertyUtils | null = null;
  
  public static rootExpressId = '0';
  private hiddenNodeIds = new Set<string>();
  private highlightLayer: any = null;

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
   * 获取构件属性数据（纯数据处理，不依赖组件状态）
   * @param expressID - 构件ID
   * @param propertyAll - 所有属性数据
   * @param ifcExpressIds - IFC Express IDs映射
   * @returns 格式化的属性数据数组
   */
  public async getProperty(
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

  public async flattenTreeToGroupedItems(treeData): Promise<any[]> {
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
   * 初始化模型数据的通用处理
   * @param modelData - 模型数据
   * @returns 初始化结果
   */
  public initializeModelData(
    modelData: any
  ): {
    treeData: any[];
    ifcExpressIds: any[];
    propertyAll: any[];
  } {
    const treeData = modelData.tree;
    IfcPropertyUtils.rootExpressId = modelData.tree[0].expressId;

    const ifcExpressIds = modelData.ifcExpressIds;
    const propertyAll = modelData.properties;

    return {
      treeData,
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
  public async handleComponentClick(
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
  private async highlightComponentMesh(
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
      this.highlightMeshes(exactMatches, scene, isFocus);
      return true;
    }

    return false;
  }

  private highlightMeshes(meshes: BABYLON.AbstractMesh[], scene: BABYLON.Scene, isFocus: boolean) {
    this.restoreMaterials(scene);

    // 创建高亮层（只创建一次）
    if (!this.highlightLayer) {
      this.highlightLayer = new BABYLON.HighlightLayer("highlightLayer", scene, {
        mainTextureFixedSize: 1024,        // 提高纹理分辨率
        alphaBlendingMode: BABYLON.Engine.ALPHA_COMBINE,
      });
      this.highlightLayer.outerGlow = false;
      this.highlightLayer.innerGlow = true;
      console.log("创建高亮层", this.highlightLayer);
    }

    meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
      }
      if (!mesh.metadata) mesh.metadata = {};

      // 保存原始状态
      mesh.metadata.originalMaterial = mesh.material;
      mesh.metadata.originalVisibility = mesh.isVisible;
      mesh.metadata.clonedMeshes = []; // 保存克隆的引用

      mesh.renderOverlay = true; // 确保启用覆盖渲染
      mesh.overlayColor = new BABYLON.Color4(0.68, 1.0, 1.0, 0.5); // 浅蓝色
      mesh.isVisible = true;
      this.highlightLayer!.addMesh(mesh, new BABYLON.Color3(0.0, 1.0, 1.0)); // 浅蓝色高亮
    });

    // 自动聚焦（保持原有逻辑）
    if (isFocus && meshes.length > 0) {
      try {
        const bbox = getBoundingBoxForMeshes(meshes);
        scene.activeCamera!.setTarget(bbox.center);
        scene.activeCamera!.radius = bbox.maximum.subtract(bbox.minimum).length() * 1.8;
      } catch (e) {
        console.error("Focus error:", e);
      }
    }
  }

  public restoreMaterials(scene: BABYLON.Scene) {
    // 清除高亮层
    if (this.highlightLayer) {
      this.highlightLayer.removeAllMeshes();
      this.highlightLayer.dispose();
      this.highlightLayer = null;
    }

    scene.meshes.forEach(mesh => {
      if (mesh.name === 'skyBox' || mesh.name === 'ground' || mesh.name === 'infiniteGrid') {
        return;
      }
      if (mesh.metadata?.originalMaterial !== undefined) {
        // 恢复材质
        mesh.material = mesh.metadata.originalMaterial;
        mesh.isVisible = mesh.metadata.originalVisibility !== false;
        mesh.renderingGroupId = 0; // 恢复渲染组
        mesh.renderOverlay = false; // 关闭覆盖渲染
        // 清理metadata
        delete mesh.metadata.originalMaterial;
        delete mesh.metadata.originalVisibility;
        delete mesh.metadata.isHighlighted;
      }
    });
  }

  /**
   * 清除所有高亮效果
   * @param scene - 场景对象
   */
  public clearAllHighlights(scene: BABYLON.Scene): void {
    this.restoreMaterials(scene);
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

  public getChildrenExpressIds(node): any[] {
    let expressIds: any[] = [];

    const traverse = (children) => {
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
}