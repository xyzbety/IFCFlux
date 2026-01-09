import * as BABYLON from '@babylonjs/core';

export interface EdgeData {
  lines: BABYLON.Vector3[][];
}

/**
 * 几何简化函数（已禁用，直接返回原始数据）
 * 为了提升性能，完全跳过顶点简化
 * @param positions 原始顶点位置
 * @param normals 原始法线
 * @param indices 原始索引
 */
export function simplifyGeometry(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  // 完全跳过简化，直接返回原始数据
  // 这样可以大幅提升合并网格的性能
  return {
    positions: positions,
    normals: normals,
    indices: indices
  };
}

/**
 * 边缘计算函数（优化版）
 * 使用数字哈希+直接数组操作，性能最大化
 */
export function calculateEdges(indexAttr: number[], indexCount: number, positionAttr: number[], thresholdAngle = 15): BABYLON.Vector3[][] {
  // 预计算阈值
  const thresholdDot = Math.cos(BABYLON.Angle.FromDegrees(thresholdAngle).radians());
  const precision = 10000;

  // 使用 Map 存储边信息（避免 Vector3 克隆，改用索引）
  const edgeMap = new Map<number, { normalX: number; normalY: number; normalZ: number; v0Index: number; v1Index: number }>();

  // 预分配 edges 数组
  const estimatedEdgeCount = Math.floor(indexCount / 3 * 0.6);
  const edges: BABYLON.Vector3[][] = new Array(estimatedEdgeCount);
  let edgesIndex = 0;

  // 重用临时变量（避免 Vector3 对象创建）
  let ax = 0, ay = 0, az = 0;
  let bx = 0, by = 0, bz = 0;
  let cx = 0, cy = 0, cz = 0;
  let nx = 0, ny = 0, nz = 0;

  /**
   * 计算顶点的数字哈希（使用位运算，避免字符串拼接）
   */
  const getVertexHash = (x: number, y: number, z: number): number => {
    const qx = Math.round(x * precision) + 2097151; // 偏移到非负
    const qy = Math.round(y * precision) + 2097151;
    const qz = Math.round(z * precision) + 2097151;
    // 使用 MurmurHash 风格混合，避免字符串拼接
    return ((qx * 31 + qy) * 31 + qz) >>> 0;
  };

  // 主循环：处理每个三角形
  for (let i = 0; i < indexCount; i += 3) {
    const i0 = indexAttr[i] * 3;
    const i1 = indexAttr[i + 1] * 3;
    const i2 = indexAttr[i + 2] * 3;

    // 直接读取顶点坐标（无 Vector3 对象）
    ax = positionAttr[i0];
    ay = positionAttr[i0 + 1];
    az = positionAttr[i0 + 2];
    bx = positionAttr[i1];
    by = positionAttr[i1 + 1];
    bz = positionAttr[i1 + 2];
    cx = positionAttr[i2];
    cy = positionAttr[i2 + 1];
    cz = positionAttr[i2 + 2];

    // 计算顶点哈希（避免重复计算）
    const hash0 = getVertexHash(ax, ay, az);
    const hash1 = getVertexHash(bx, by, bz);
    const hash2 = getVertexHash(cx, cy, cz);

    // 跳过退化三角形
    if (hash0 === hash1 || hash1 === hash2 || hash2 === hash0) {
      continue;
    }

    // 计算三角形法线（直接数学运算）
    const edge1x = bx - ax, edge1y = by - ay, edge1z = bz - az;
    const edge2x = cx - ax, edge2y = cy - ay, edge2z = cz - az;
    nx = edge1y * edge2z - edge1z * edge2y;
    ny = edge1z * edge2x - edge1x * edge2z;
    nz = edge1x * edge2y - edge1y * edge2x;

    // 归一化法线
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-6) continue; // 退化三角形
    nx /= len;
    ny /= len;
    nz /= len;

    const hashes = [hash0, hash1, hash2];

    // 处理每条边
    for (let j = 0; j < 3; j++) {
      const jNext = (j + 1) % 3;
      const hashA = hashes[j];
      const hashB = hashes[jNext];

      // 生成边键（顺序无关，数字运算）
      const small = hashA < hashB ? hashA : hashB;
      const large = hashA < hashB ? hashB : hashA;
      const edgeKey = (small * 31 + large) >>> 0;

      if (edgeMap.has(edgeKey)) {
        // 找到匹配的边，检查法线夹角
        const existingEdge = edgeMap.get(edgeKey)!;

        // 计算法线点积
        const dot = nx * existingEdge.normalX +
          ny * existingEdge.normalY +
          nz * existingEdge.normalZ;

        // 如果夹角大于阈值，创建边缘线段
        if (dot <= thresholdDot) {
          // 根据边的索引选择顶点
          let v0x, v0y, v0z, v1x, v1y, v1z;
          if (j === 0) {
            v0x = ax; v0y = ay; v0z = az;
            v1x = bx; v1y = by; v1z = bz;
          } else if (j === 1) {
            v0x = bx; v0y = by; v0z = bz;
            v1x = cx; v1y = cy; v1z = cz;
          } else {
            v0x = cx; v0y = cy; v0z = cz;
            v1x = ax; v1y = ay; v1z = az;
          }

          edges[edgesIndex++] = [
            new BABYLON.Vector3(v0x, v0y, v0z),
            new BABYLON.Vector3(v1x, v1y, v1z)
          ];
        }

        // 移除已处理的边
        edgeMap.delete(edgeKey);
      } else {
        // 存储新边（使用索引，避免 Vector3 克隆）
        edgeMap.set(edgeKey, {
          normalX: nx,
          normalY: ny,
          normalZ: nz,
          v0Index: indexAttr[i + j],
          v1Index: indexAttr[i + jNext]
        });
      }
    }
  }

  // 处理剩余的边界边
  const remainingEdges = edgeMap.size;

  if (remainingEdges > 0) {
    // 扩展 edges 数组（一次性分配）
    if (edgesIndex + remainingEdges > edges.length) {
      edges.length = edgesIndex + remainingEdges;
    }

    // 添加边界边
    for (const [edgeKey, edgeInfo] of edgeMap) {
      const v0Index = edgeInfo.v0Index * 3;
      const v1Index = edgeInfo.v1Index * 3;

      edges[edgesIndex++] = [
        new BABYLON.Vector3(positionAttr[v0Index], positionAttr[v0Index + 1], positionAttr[v0Index + 2]),
        new BABYLON.Vector3(positionAttr[v1Index], positionAttr[v1Index + 1], positionAttr[v1Index + 2])
      ];
    }
  }

  // 截断数组到实际大小
  edges.length = edgesIndex;

  return edges;
}

/**
 * 合并相同材质的网格
 * 按材质分组几何体，分别合并每个材质组的几何体
 */
export async function mergeMeshesByMaterial(
  materialsMap: Map<number, any[]>,
  materialCache: Map<number, BABYLON.StandardMaterial>,
  scene: BABYLON.Scene,
  model: BABYLON.Mesh,
  onProgress?: (percent: number) => void
): Promise<void> {
  // 创建按材质分组的几何体映射表（使用新的数据结构）
  const geometriesByMaterials = new Map<number, any[]>();
  const originalMeshesByMaterial = new Map<number, any[]>();

  // 第一步：收集所有几何数据，按材质分组
  const totalMaterials = materialsMap.size;
  let processedMaterials = 0;

  // 使用 for...of 循环替代 forEach，以便在异步函数中使用 await
  for (const [colorID, dataArray] of materialsMap) {
    if (dataArray.length > 0) {
      const geometries: any[] = [];
      const originalMeshData: any[] = [];

      // 检查数据类型并处理
      for (const data of dataArray) {
        if (data) {
          let geometryData: any = null;
          let metadata: any = null;

          if (data.positions && data.indices && data.material && data.metadata) {
            geometryData = {
              positions: data.positions,
              normals: data.normals,
              indices: data.indices
            };
            metadata = data.metadata;
            originalMeshData.push({
              geometryData: geometryData,
              metadata: metadata
            });
          }

          if (geometryData) {
            geometries.push(geometryData);
          }
        }
      }

      if (geometries.length > 0) {
        geometriesByMaterials.set(colorID, geometries);
        originalMeshesByMaterial.set(colorID, originalMeshData);
      }
    }

    // 更新收集阶段的进度（收集阶段占总进度的30%）
    processedMaterials++;
    if (onProgress) {
      const collectProgress = (processedMaterials / totalMaterials) * 30;
      onProgress(collectProgress);
      // console.log(`合并网格阶段 - 收集进度: ${processedMaterials}/${totalMaterials} -> ${collectProgress}%`);

      // 添加微小延迟，让进度条有足够时间显示
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // 第二步：对每个材质组的几何体进行合并
  const totalMergeGroups = geometriesByMaterials.size;
  let processedMergeGroups = 0;

  // 使用 for...of 循环替代 forEach
  for (const [colorID, geometries] of geometriesByMaterials) {
    if (geometries.length > 1) {
      try {
        // 合并相同材质的几何体
        const mergedVertexData = new BABYLON.VertexData();

        // 预计算总大小，避免动态扩容
        let totalPositions = 0;
        let totalNormals = 0;
        let totalIndices = 0;

        for (const geometryData of geometries) {
          // 累计总大小
          if (geometryData.positions) {
            totalPositions += geometryData.positions.length;
          }
          if (geometryData.normals) {
            totalNormals += geometryData.normals.length;
          }
          if (geometryData.indices) {
            totalIndices += geometryData.indices.length;
          }
        }

        // 预分配数组 - 优化：使用TypedArray提高性能
        const positions: Float32Array = new Float32Array(totalPositions);
        const normals: Float32Array = new Float32Array(totalNormals);
        const indices: Uint32Array = new Uint32Array(totalIndices);

        let positionIndex = 0;
        let normalIndex = 0;
        let indexIndex = 0;
        let vertexOffset = 0;

        // 优化：使用更高效的数据复制方式
        for (const geometry of geometries) {
          // 使用set方法批量复制数组数据，比循环更快
          if (geometry.positions) {
            positions.set(geometry.positions, positionIndex);
            positionIndex += geometry.positions.length;
          }

          if (geometry.normals) {
            normals.set(geometry.normals, normalIndex);
            normalIndex += geometry.normals.length;
          }

          // 索引需要偏移，使用循环处理
          if (geometry.indices) {
            const indicesArray = geometry.indices;
            for (let i = 0; i < indicesArray.length; i++) {
              indices[indexIndex++] = indicesArray[i] + vertexOffset;
            }
          }

          // 更新顶点偏移量
          if (geometry.positions) {
            vertexOffset += geometry.positions.length / 3;
          }
        }

        // 设置合并后的顶点数据
        // 【优化】直接使用 TypedArray，避免 Array.from() 转换
        // Babylon.js VertexData 支持直接使用 TypedArray
        mergedVertexData.positions = positions;   // 直接使用 Float32Array
        mergedVertexData.normals = normals;      // 直接使用 Float32Array  
        mergedVertexData.indices = indices;       // 直接使用 Uint32Array

        // 创建合并后的网格
        const mergedMesh = new BABYLON.Mesh(`merged_material_${colorID}`, scene);
        mergedVertexData.applyToMesh(mergedMesh, true);

        // 设置材质（保持原有的材质缓存机制）
        const material = materialCache.get(colorID)
        if (material) {
          mergedMesh.material = material;
        }

        mergedMesh.parent = model;
        mergedMesh.isVisible = true;

        // 保存原始几何数据用于后续操作
        const originalMeshData: any[] = [];
        const meshDataArray = originalMeshesByMaterial.get(colorID) || [];

        // 设置合并网格的ID和name：使用第一个子网格的GUID作为ID，expressID作为name
        const firstOriginalData = meshDataArray[0];
        if (firstOriginalData && firstOriginalData.metadata) {
          const baseGuid = firstOriginalData.metadata.guid;
          const baseExpressID = firstOriginalData.metadata.originalExpressID;
          if (baseExpressID !== undefined) {
            mergedMesh.id = baseExpressID;
          }
          if (baseGuid) {
            mergedMesh.name = `${baseGuid}`;
          }
        }

        for (const meshData of meshDataArray) {
          if (meshData.geometryData && meshData.metadata) {
            // 直接使用原始几何数据
            const positions = meshData.geometryData.positions;
            const normals = meshData.geometryData.normals || new Float32Array(meshData.geometryData.positions.length);
            const indices = meshData.geometryData.indices;

            // 确保几何数据存在且有效
            if (positions && positions.length > 0 && indices && indices.length > 0) {
              const data = {
                positions: positions,
                normals: normals || new Float32Array(positions.length), // 如果没有法线，创建默认法线
                indices: indices,
                metadata: {
                  ...meshData.metadata, // 完整保留所有元数据，包括GUID
                  originalExpressID: meshData.metadata.ifcExpressID || meshData.metadata.originalExpressID,
                  originalGuid: meshData.metadata.guid || meshData.metadata.originalGuid,
                  geometryExpressID: meshData.metadata.geometryExpressID,
                  globalId: meshData.metadata.globalId,
                  color: meshData.metadata.color,
                  transformation: meshData.metadata.transformation
                },
                transformMatrix: BABYLON.Matrix.Identity(), // 变换已经预应用到顶点数据中
                material: materialCache.get(colorID)
              };
              originalMeshData.push(data);
            } else {
              console.warn(`几何数据无效，跳过保存`);
            }
          }
        }

        // 为合并网格添加子网格操作功能
        mergedMesh.metadata = {
          isMergedMesh: true,
          originalMaterialId: colorID,
          originalMeshData: originalMeshData, // 保留原始网格的几何数据
          mergedGeometryCount: geometries.length,
          // 确保合并网格本身也有正确的ID信息
          originalExpressID: firstOriginalData?.metadata?.originalExpressID,
          originalGuid: firstOriginalData?.metadata?.originalGuid,
          // 子网格操作功能
          hideSubMesh: createHideSubMeshFunction(mergedMesh, originalMeshData),
          restoreSubMesh: createRestoreSubMeshFunction(mergedMesh, originalMeshData)
        };

      } catch (error) {
        console.error(`合并材质 ${colorID} 的几何体时发生错误:`, error);
        // 如果合并失败，保持原始网格不变
        const originalMeshes = originalMeshesByMaterial.get(colorID) || [];
        for (const mesh of originalMeshes) {
          if (mesh && !mesh.isDisposed()) {
            mesh.isVisible = true;
          }
        }
      }
    } else if (geometries.length === 1) {
      // 单个几何体，直接创建网格
      const meshDataArray = originalMeshesByMaterial.get(colorID) || [];
      if (meshDataArray.length > 0) {
        const meshData = meshDataArray[0];
        let geometryData = meshData.geometryData;

        if (geometryData) {
          // 创建顶点数据并应用到网格 - 优化：直接使用TypedArray
          const vertexData = new BABYLON.VertexData();
          vertexData.positions = geometryData.positions;
          vertexData.normals = geometryData.normals || new Float32Array(geometryData.positions.length);
          vertexData.indices = geometryData.indices;

          // 创建单个网格
          const mesh = new BABYLON.Mesh(`single_material_${colorID}`, scene);
          vertexData.applyToMesh(mesh);
          mesh.material = materialCache.get(colorID);
          mesh.parent = model;
          mesh.isVisible = true;

          // 设置网格ID和元数据
          if (meshData.metadata) {
            mesh.id = meshData.metadata.originalExpressID || 0;
            mesh.name = meshData.metadata.guid || 'unnamed';

            // 保存几何数据用于子网格操作（使用原始数据）
            const originalMeshData = [{
              positions: geometryData.positions,
              normals: geometryData.normals || new Float32Array(geometryData.positions.length),
              indices: geometryData.indices,
              metadata: { ...meshData.metadata },
              transformMatrix: BABYLON.Matrix.Identity(),
              material: mesh.material
            }];

            mesh.metadata = {
              ...meshData.metadata,
              isMergedMesh: true,
              originalMeshData: originalMeshData,
              hideSubMesh: createHideSubMeshFunction(mesh, originalMeshData),
              restoreSubMesh: createRestoreSubMeshFunction(mesh, originalMeshData)
            };
          }
        }
      }
    }
    // 更新合并阶段的进度（合并阶段占总进度的16%）
    processedMergeGroups++;
    if (onProgress) {
      const mergeProgress = 30 + (processedMergeGroups / totalMergeGroups) * 70; // 75%-90%
      onProgress(mergeProgress);
      // console.log(`合并网格阶段 - 合并进度: ${processedMergeGroups}/${totalMergeGroups} -> ${mergeProgress}%`);

      // 添加微小延迟，让进度条有足够时间显示
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // 第三步：清空原始材质映射表，用合并后的网格替换
  materialsMap.clear();

}


/**
 * 创建隐藏子网格的函数（通过expressID）
 * @param mergedMesh 合并后的网格
 * @param originalMeshData 原始网格数据
 */
function createHideSubMeshFunction(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): (expressID: number) => void {
  // 全局批处理机制，所有网格共享同一个批处理
  if (!(globalThis as any).globalBatchHandler) {
    (globalThis as any).globalBatchHandler = {
      timeout: null,
      pendingOperations: new Map<BABYLON.Mesh, Set<number>>(),
      pendingMeshData: new Map<BABYLON.Mesh, any[]>()
    };
  }

  const batchHandler = (globalThis as any).globalBatchHandler;

  return (expressID: number) => {
    // 立即标记为隐藏
    let foundAny = false;
    originalMeshData.forEach((meshData) => {
      if (meshData.metadata?.originalExpressID === expressID) {
        meshData.isVisible = false;
        foundAny = true;
      }
    });

    if (!foundAny) {
      console.warn(`未找到expressID为 ${expressID} 的子网格`);
      return;
    }

    // 添加到全局批处理队列
    if (!batchHandler.pendingOperations.has(mergedMesh)) {
      batchHandler.pendingOperations.set(mergedMesh, new Set());
      batchHandler.pendingMeshData.set(mergedMesh, originalMeshData);
    }
    batchHandler.pendingOperations.get(mergedMesh)!.add(expressID);

    // 清除之前的定时器
    if (batchHandler.timeout) {
      clearTimeout(batchHandler.timeout);
    }

    // 设置新的定时器（收集所有操作，延迟重建）
    batchHandler.timeout = setTimeout(() => {
      let totalHidden = 0;

      // 处理所有待处理的网格
      batchHandler.pendingOperations.forEach((expressIDs, mesh) => {
        const meshData = batchHandler.pendingMeshData.get(mesh);
        if (meshData && expressIDs.size > 0) {
          totalHidden += expressIDs.size;
          rebuildMergedMesh(mesh, meshData);
        }
      });

      if (totalHidden > 0) {
        console.log(`批量隐藏 ${totalHidden} 个模型`);
      }

      // 清空批处理队列
      batchHandler.pendingOperations.clear();
      batchHandler.pendingMeshData.clear();
    }, 10); // 进一步缩短延迟时间到10ms，更快响应
  };
}


/**
 * 创建恢复子网格的函数（通过expressID）
 * @param mergedMesh 合并后的网格
 * @param originalMeshData 原始网格数据
 */
function createRestoreSubMeshFunction(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): (expressID?: number) => void {
  // 全局批处理机制，所有网格共享同一个批处理
  if (!(globalThis as any).globalRestoreBatchHandler) {
    (globalThis as any).globalRestoreBatchHandler = {
      timeout: null,
      pendingOperations: new Map<BABYLON.Mesh, Set<number>>(),
      pendingMeshData: new Map<BABYLON.Mesh, any[]>(),
      pendingFullRestore: new Set<BABYLON.Mesh>() // 用于全量恢复
    };
  }

  const batchHandler = (globalThis as any).globalRestoreBatchHandler;

  return (expressID?: number) => {
    if (expressID === undefined) {
      // 恢复所有子网格
      originalMeshData.forEach(meshData => {
        meshData.isVisible = true;
      });

      // 添加到全量恢复队列
      batchHandler.pendingFullRestore.add(mergedMesh);
      batchHandler.pendingMeshData.set(mergedMesh, originalMeshData);

      // 清除之前的定时器
      if (batchHandler.timeout) {
        clearTimeout(batchHandler.timeout);
      }

      // 设置新的定时器（批量处理，延迟重建）
      batchHandler.timeout = setTimeout(() => {
        let totalRestored = batchHandler.pendingFullRestore.size;

        // 处理所有待处理的全量恢复
        batchHandler.pendingFullRestore.forEach(mesh => {
          const meshData = batchHandler.pendingMeshData.get(mesh);
          if (meshData) {
            rebuildMergedMesh(mesh, meshData);
          }
        });

        if (totalRestored > 0) {
          console.log(`批量全量恢复 ${totalRestored} 个模型`);
        }

        // 清空批处理队列
        batchHandler.pendingFullRestore.clear();
        batchHandler.pendingOperations.clear();
        batchHandler.pendingMeshData.clear();
      }, 10); // 缩短延迟时间到10ms

      return;
    }

    // 立即标记为显示
    let foundAny = false;
    originalMeshData.forEach((meshData) => {
      if (meshData.metadata?.originalExpressID === expressID) {
        meshData.isVisible = true;
        foundAny = true;
      }
    });

    if (!foundAny) {
      console.warn(`未找到expressID为 ${expressID} 的子网格`);
      return;
    }

    // 添加到全局批处理队列
    if (!batchHandler.pendingOperations.has(mergedMesh)) {
      batchHandler.pendingOperations.set(mergedMesh, new Set());
      batchHandler.pendingMeshData.set(mergedMesh, originalMeshData);
    }
    batchHandler.pendingOperations.get(mergedMesh)!.add(expressID);

    // 清除之前的定时器
    if (batchHandler.timeout) {
      clearTimeout(batchHandler.timeout);
    }

    // 设置新的定时器（收集所有操作，延迟重建）
    batchHandler.timeout = setTimeout(() => {
      let totalRestored = 0;

      // 处理所有待处理的网格
      batchHandler.pendingOperations.forEach((expressIDs, mesh) => {
        const meshData = batchHandler.pendingMeshData.get(mesh);
        if (meshData && expressIDs.size > 0) {
          totalRestored += expressIDs.size;
          rebuildMergedMesh(mesh, meshData);
        }
      });

      // 处理全量恢复
      batchHandler.pendingFullRestore.forEach(mesh => {
        const meshData = batchHandler.pendingMeshData.get(mesh);
        if (meshData) {
          rebuildMergedMesh(mesh, meshData);
        }
      });

      if (totalRestored > 0 || batchHandler.pendingFullRestore.size > 0) {
        console.log(`批量恢复 ${totalRestored + batchHandler.pendingFullRestore.size} 个模型`);
      }

      // 清空批处理队列
      batchHandler.pendingOperations.clear();
      batchHandler.pendingFullRestore.clear();
      batchHandler.pendingMeshData.clear();
    }, 10); // 缩短延迟时间到10ms
  };
}

/**
 * 重新构建合并网格
 * @param mergedMesh 合并后的网格
 * @param originalMeshData 原始网格数据
 */
function rebuildMergedMesh(mergedMesh: BABYLON.Mesh, originalMeshData: any[]): void {
  try {
    console.log('重新构建合并网格');
    // 性能优化：预计算总顶点和索引数量
    let totalVertexCount = 0;
    let totalIndexCount = 0;

    // 第一遍遍历：计算总大小
    for (let i = 0; i < originalMeshData.length; i++) {
      const meshData = originalMeshData[i];
      const expressID = meshData.metadata?.originalExpressID;
      if (!expressID) continue;

      if (meshData.isVisible !== false) {
        if (meshData.positions) {
          totalVertexCount += meshData.positions.length / 3;
        }
        if (meshData.indices) {
          totalIndexCount += meshData.indices.length;
        }
      }
    }

    if (totalVertexCount === 0) {
      // 没有可见的几何数据，隐藏合并网格
      mergedMesh.isVisible = false;
      return;
    }

    // 预分配数组大小，避免动态扩容
    const positions: number[] = new Array(totalVertexCount * 3);
    const normals: number[] = new Array(totalVertexCount * 3);
    const indices: number[] = new Array(totalIndexCount);

    let positionIndex = 0;
    let normalIndex = 0;
    let indexIndex = 0;
    let vertexOffset = 0;

    // 第二遍遍历：填充数据
    for (let i = 0; i < originalMeshData.length; i++) {
      const meshData = originalMeshData[i];
      const expressID = meshData.metadata?.originalExpressID;
      if (!expressID) continue;

      if (meshData.isVisible !== false) {
        // 复制位置数据
        if (meshData.positions) {
          for (let j = 0; j < meshData.positions.length; j++) {
            positions[positionIndex++] = meshData.positions[j];
          }
        }

        // 复制法线数据
        if (meshData.normals) {
          for (let j = 0; j < meshData.normals.length; j++) {
            normals[normalIndex++] = meshData.normals[j];
          }
        } else {
          // 如果没有法线数据，填充默认值
          const vertexCount = meshData.positions ? meshData.positions.length / 3 : 0;
          for (let j = 0; j < vertexCount * 3; j++) {
            normals[normalIndex++] = 0;
          }
        }

        // 复制并偏移索引数据
        if (meshData.indices) {
          for (let j = 0; j < meshData.indices.length; j++) {
            indices[indexIndex++] = meshData.indices[j] + vertexOffset;
          }
        }

        // 更新顶点偏移量
        if (meshData.positions) {
          vertexOffset += meshData.positions.length / 3;
        }
      }
    }

    // 确保网格设置为可更新
    // mergedMesh.isVisible = true;

    // 使用updateVerticesData更新现有网格数据
    mergedMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions, true);
    mergedMesh.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals, true);
    mergedMesh.setIndices(indices);

    // 刷新边界框
    mergedMesh.refreshBoundingInfo();

  } catch (error) {
    console.error('重新构建合并网格时发生错误:', error);
  }
}
/**
 * 在合并网格中找到点击位置对应的子网格
 * @param mergedMesh 合并后的父网格
 * @param clickedPoint 点击的世界坐标点
 * @returns 子网格信息，包含expressID和虚拟网格对象
 */
export function findClickedSubMesh(mergedMesh: BABYLON.AbstractMesh, clickedPoint: BABYLON.Vector3): { expressID: string } | null {
  const metadata = mergedMesh.metadata || {};
  const originalMeshData = metadata.originalMeshData || [];

  if (originalMeshData.length === 0) {
    console.warn('合并网格中没有保存子网格数据，网格ID:', mergedMesh.id, '网格名称:', mergedMesh.name);
    return null;
  }

  // 将点击点转换到合并网格的局部坐标系
  const worldMatrix = mergedMesh.getWorldMatrix();
  const inverseWorldMatrix = worldMatrix.clone().invert();
  const localPoint = BABYLON.Vector3.TransformCoordinates(clickedPoint, inverseWorldMatrix);

  let closestSubMesh: { expressID: string; distance: number } | null = null;

  // 遍历所有子网格数据，找到距离点击点最近的子网格
  for (let i = 0; i < originalMeshData.length; i++) {
    const meshData = originalMeshData[i];

    // 跳过隐藏的子网格
    if (meshData.isVisible === false) {
      continue;
    }

    // 检查几何数据是否有效
    if (!meshData.positions || !meshData.indices || meshData.positions.length === 0 || meshData.indices.length === 0) {
      console.warn(`子网格 ${i} 的几何数据无效，跳过`);
      continue;
    }

    // 将点击点转换到子网格的局部坐标系
    const subMeshTransform = meshData.transformMatrix;
    const inverseSubMeshTransform = subMeshTransform.clone().invert();
    const subMeshLocalPoint = BABYLON.Vector3.TransformCoordinates(localPoint, inverseSubMeshTransform);

    // 检查点击点是否在子网格的包围盒内
    if (isPointInMeshBounds(subMeshLocalPoint, meshData.positions, meshData.indices)) {
      // 计算点击点到子网格表面的距离
      const distance = calculateDistanceToMeshSurface(subMeshLocalPoint, meshData.positions, meshData.indices);

      // 放宽距离阈值，确保能匹配到子网格
      // 如果距离在合理范围内，或者点击点在包围盒内但距离计算失败，都认为是有效的点击
      if (distance < 5.0 || (distance === Infinity && isPointInMeshBounds(subMeshLocalPoint, meshData.positions, meshData.indices))) {
        const subMeshMetadata = meshData.metadata || {};
        const expressID = subMeshMetadata.originalExpressID || `${i}`;

        // 如果找到更近的子网格，更新结果
        if (!closestSubMesh || distance < closestSubMesh.distance) {
          closestSubMesh = {
            expressID: expressID,
            distance: distance
          };
        }
      }
    }
  }

  // 如果精确查找失败，使用包围盒中心距离作为回退
  if (!closestSubMesh) {
    console.log('精确查找失败，使用包围盒中心距离回退');
    for (let i = 0; i < originalMeshData.length; i++) {
      const meshData = originalMeshData[i];

      // 跳过隐藏的子网格
      if (meshData.isVisible === false) {
        continue;
      }

      if (!meshData.positions || meshData.positions.length === 0) continue;

      const subMeshTransform = meshData.transformMatrix;
      const inverseSubMeshTransform = subMeshTransform.clone().invert();
      const subMeshLocalPoint = BABYLON.Vector3.TransformCoordinates(localPoint, inverseSubMeshTransform);

      // 计算包围盒中心距离
      const bounds = calculateMeshBounds(meshData.positions);
      const center = new BABYLON.Vector3(
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
        (bounds.minZ + bounds.maxZ) / 2
      );
      const distance = BABYLON.Vector3.Distance(subMeshLocalPoint, center);

      // 使用较大的阈值
      if (distance < 10.0) {
        const subMeshMetadata = meshData.metadata || {};
        const expressID = subMeshMetadata.originalExpressID || `${i}`;

        if (!closestSubMesh || distance < closestSubMesh.distance) {
          closestSubMesh = {
            expressID: expressID,
            distance: distance
          };
        }
      }
    }
  }

  console.log("找到子网格", closestSubMesh);
  // 返回距离最近的子网格，如果没有找到则返回null
  return closestSubMesh ? { expressID: closestSubMesh.expressID } : null;
}

/**
 * 检查点是否在网格的包围盒内
 * @param point 局部坐标点
 * @param positions 顶点位置数据
 * @param indices 索引数据
 * @returns 是否在包围盒内
 */
function isPointInMeshBounds(point: BABYLON.Vector3, positions: number[], indices: number[]): boolean {
  if (!positions || positions.length === 0 || !indices || indices.length === 0) {
    return false;
  }

  // 计算网格的包围盒
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  // 检查点是否在包围盒内
  return point.x >= minX && point.x <= maxX &&
    point.y >= minY && point.y <= maxY &&
    point.z >= minZ && point.z <= maxZ;
}

/**
 * 计算点到网格表面的距离
 * @param point 局部坐标点
 * @param positions 顶点位置数据
 * @param indices 索引数据
 * @returns 到网格表面的距离
 */
function calculateDistanceToMeshSurface(point: BABYLON.Vector3, positions: number[], indices: number[]): number {
  if (!positions || positions.length === 0 || !indices || indices.length === 0) {
    return Infinity;
  }

  let minDistance = Infinity;

  // 遍历所有三角形面片
  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i] * 3;
    const i2 = indices[i + 1] * 3;
    const i3 = indices[i + 2] * 3;

    // 获取三角形的三个顶点
    const v1 = new BABYLON.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
    const v2 = new BABYLON.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);
    const v3 = new BABYLON.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);

    // 计算点到三角形平面的距离
    const distance = distancePointToTriangle(point, v1, v2, v3);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * 计算点到三角形的距离
 * @param point 点
 * @param v1 三角形顶点1
 * @param v2 三角形顶点2
 * @param v3 三角形顶点3
 * @returns 点到三角形的距离
 */
function distancePointToTriangle(point: BABYLON.Vector3, v1: BABYLON.Vector3, v2: BABYLON.Vector3, v3: BABYLON.Vector3): number {
  // 计算三角形法线
  const edge1 = v2.subtract(v1);
  const edge2 = v3.subtract(v1);
  const normal = BABYLON.Vector3.Cross(edge1, edge2);

  // 计算点到平面的距离
  const planeDistance = Math.abs(BABYLON.Vector3.Dot(point.subtract(v1), normal)) / normal.length();

  // 检查点是否在三角形内部
  if (isPointInTriangle(point, v1, v2, v3)) {
    return planeDistance;
  }

  // 如果不在三角形内部，计算到三条边的距离
  const distanceToEdge1 = distancePointToLineSegment(point, v1, v2);
  const distanceToEdge2 = distancePointToLineSegment(point, v2, v3);
  const distanceToEdge3 = distancePointToLineSegment(point, v3, v1);

  return Math.min(planeDistance, distanceToEdge1, distanceToEdge2, distanceToEdge3);
}

/**
 * 检查点是否在三角形内部
 */
function isPointInTriangle(point: BABYLON.Vector3, v1: BABYLON.Vector3, v2: BABYLON.Vector3, v3: BABYLON.Vector3): boolean {
  const d1 = sign(point, v1, v2);
  const d2 = sign(point, v2, v3);
  const d3 = sign(point, v3, v1);

  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(hasNeg && hasPos);
}

/**
 * 计算点到线段的距离
 */
function distancePointToLineSegment(point: BABYLON.Vector3, lineStart: BABYLON.Vector3, lineEnd: BABYLON.Vector3): number {
  const lineVec = lineEnd.subtract(lineStart);
  const lineLength = lineVec.length();
  const lineDir = lineVec.normalize();

  const pointVec = point.subtract(lineStart);
  const projection = BABYLON.Vector3.Dot(pointVec, lineDir);

  if (projection <= 0) {
    return pointVec.length();
  } else if (projection >= lineLength) {
    return point.subtract(lineEnd).length();
  } else {
    const closestPoint = lineStart.add(lineDir.scale(projection));
    return point.subtract(closestPoint).length();
  }
}

/**
 * 计算点的符号（用于三角形内部检测）
 */
function sign(p1: BABYLON.Vector3, p2: BABYLON.Vector3, p3: BABYLON.Vector3): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

/**
 * 计算网格的包围盒边界
 * @param positions 顶点位置数据
 * @returns 包围盒边界对象
 */
function calculateMeshBounds(positions: number[]): { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number } {
  if (!positions || positions.length === 0) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  // 如果所有值都是无穷大，返回默认值
  if (minX === Infinity) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

export function findClosestSubMeshWithFallback(
  mergedMesh: BABYLON.AbstractMesh,
  clickedPoint: BABYLON.Vector3,
  originalMeshData: any[]
): any {
  if (!originalMeshData.length) {
    throw new Error('没有可用的子网格信息');
  }

  const worldMatrix = mergedMesh.getWorldMatrix();
  const inverseWorldMatrix = worldMatrix.clone().invert();
  const localPoint = BABYLON.Vector3.TransformCoordinates(clickedPoint, inverseWorldMatrix);

  // 存储所有可见子网格的距离信息
  const subMeshDistances: Array<{ subMesh: any; distance: number }> = [];

  // 遍历所有子网格，计算距离（只考虑可见的子网格）
  for (const subMesh of originalMeshData) {
    // 跳过隐藏的子网格
    if (subMesh.isVisible === false) {
      continue;
    }

    if (!subMesh.metadata.originalExpressID) continue;

    // 计算子网格的包围盒中心
    if (subMesh.transformMatrix && subMesh.positions && subMesh.positions.length > 0) {
      const inverseSubMeshTransform = subMesh.transformMatrix.clone().invert();
      const subMeshLocalPoint = BABYLON.Vector3.TransformCoordinates(localPoint, inverseSubMeshTransform);

      const bounds = calculateMeshBounds(subMesh.positions);
      const center = new BABYLON.Vector3(
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
        (bounds.minZ + bounds.maxZ) / 2
      );
      const distance = BABYLON.Vector3.Distance(subMeshLocalPoint, center);

      subMeshDistances.push({ subMesh, distance });
    }
  }

  // 按距离排序，从近到远
  subMeshDistances.sort((a, b) => a.distance - b.distance);

  // 总能返回一个可见的子网格
  if (subMeshDistances.length > 0) {
    console.log(`找到 ${subMeshDistances.length} 个候选子网格，距离范围: ${subMeshDistances[0].distance.toFixed(2)} - ${subMeshDistances[subMeshDistances.length - 1].distance.toFixed(2)}`);
    return subMeshDistances[0].subMesh;
  }

  // 如果没有找到可见的子网格，尝试查找第一个可见的有效子网格
  for (const subMesh of originalMeshData) {
    if (subMesh.isVisible !== false && subMesh.originalExpressID) {
      console.log('使用第一个可见的有效子网格作为回退');
      return subMesh;
    }
  }

  // 如果连一个可见的子网格都没有，返回null
  console.log('没有找到可见的子网格');
  return null;
}

export function collectTransparentMeshData(selectedMeshIds: Set<number>, scene: BABYLON.Scene): Map<string, any[]> {
  const materialGroups = new Map<string, any[]>();

  // 第一步：收集选中子网格的数据，不隐藏原始子网格
  scene!.meshes.forEach(mesh => {
    if (mesh.metadata?.isMergedMesh) {
      const originalMeshData = mesh.metadata.originalMeshData || [];

      originalMeshData.forEach((subMeshInfo: any) => {
        const expressID = subMeshInfo.metadata.originalExpressID;
        if (selectedMeshIds.has(expressID)) {
          // 检查是否已经存在相同expressID的透明网格
          const existingTransparentMesh = scene!.meshes.find(m =>
            m.name === `transparentMesh${expressID}`
          );

          if (!existingTransparentMesh) {
            // 按材质分组收集数据
            const materialKey = subMeshInfo.material?.id || 'default';
            if (!materialGroups.has(materialKey)) {
              materialGroups.set(materialKey, []);
            }
            materialGroups.get(materialKey)!.push({
              expressID,
              subMeshInfo
            });
          }
        }
      });
    }
  });

  return materialGroups;
}

/**
 * 创建合并的半透明网格
 */
export function createMergedTransparentMesh(groupDataList: any[], materialKey: string, scene: BABYLON.Scene): BABYLON.Mesh {
  // 预计算总大小
  let totalPositions = 0;
  let totalIndices = 0;
  let totalNormals = 0;

  groupDataList.forEach(({ subMeshInfo }) => {
    if (subMeshInfo.positions && subMeshInfo.indices) {
      totalPositions += subMeshInfo.positions.length;
      totalIndices += subMeshInfo.indices.length;
      if (subMeshInfo.normals) {
        totalNormals += subMeshInfo.normals.length;
      }
    }
  });

  // 预分配数组
  const allPositions: number[] = new Array(totalPositions);
  const allIndices: number[] = new Array(totalIndices);
  const allNormals: number[] = new Array(totalNormals);

  let positionIndex = 0;
  let indexIndex = 0;
  let normalIndex = 0;
  let vertexOffset = 0;

  groupDataList.forEach(({ subMeshInfo }) => {
    if (subMeshInfo.positions && subMeshInfo.indices) {
      // 添加顶点位置数据
      for (let i = 0; i < subMeshInfo.positions.length; i++) {
        allPositions[positionIndex++] = subMeshInfo.positions[i];
      }

      // 添加索引数据（需要偏移）
      for (let i = 0; i < subMeshInfo.indices.length; i++) {
        allIndices[indexIndex++] = subMeshInfo.indices[i] + vertexOffset;
      }

      // 添加法线数据
      if (subMeshInfo.normals) {
        for (let i = 0; i < subMeshInfo.normals.length; i++) {
          allNormals[normalIndex++] = subMeshInfo.normals[i];
        }
      }

      // 更新顶点偏移量
      vertexOffset += subMeshInfo.positions.length / 3;
    }
  });

  // 创建合并的半透明网格
  const transparentMesh = new BABYLON.Mesh(`transparentMesh_${materialKey}`, scene!);
  const vertexData = new BABYLON.VertexData();
  vertexData.positions = allPositions;
  vertexData.indices = allIndices;

  if (allNormals.length > 0) {
    vertexData.normals = allNormals;
  }

  vertexData.applyToMesh(transparentMesh);

  // 创建半透明材质
  const firstSubMesh = groupDataList[0].subMeshInfo;
  const transparentMaterial = firstSubMesh.material.clone('transparentMaterial');
  transparentMaterial.alpha = 0.5;
  transparentMesh.material = transparentMaterial;

  // 设置网格属性
  transparentMesh.isVisible = true;
  transparentMesh.isPickable = false;
  transparentMesh.metadata = {
    isTransparentMesh: true,
    materialGroup: materialKey,
    expressIDs: groupDataList.map(item => item.expressID)
  };

  console.log(`按材质 ${materialKey} 合并创建了包含 ${groupDataList.length} 个网格的半透明网格`);
  return transparentMesh;
}

export function cleanupTransparentResources(scene: BABYLON.Scene) {
  // 清除所有半透明覆盖网格
  const transparentMeshes = scene!.meshes.filter(mesh =>
    mesh.name.includes('transparentMesh') || mesh.metadata?.isTransparentMesh
  );
  transparentMeshes.forEach(mesh => mesh.dispose());

  // 清除半透明覆盖材质
  const transparentMaterials = scene!.materials.filter(material =>
    material.name.includes('transparentMaterial') || (material as any)._isClonedForTransparent
  );
  transparentMaterials.forEach(material => material.dispose());

  // 清除共享的高亮半透明覆盖材质
  const highlightTransparentMaterials = scene!.materials.filter(material =>
    material.name.includes('highlight') && material.name.includes('transparent')
  );
  highlightTransparentMaterials.forEach(material => material.dispose());
}

