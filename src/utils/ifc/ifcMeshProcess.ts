import * as BABYLON from '@babylonjs/core';

export interface EdgeData {
  lines: BABYLON.Vector3[][];
}


/**
 * 简化结果缓存
 * 避免对相同几何体重复执行简化算法
 */
const simplificationCache = new Map<string, { positions: Float32Array; normals: Float32Array; indices: Uint32Array }>();

/**
 * 生成几何数据的缓存键
 * @param positions 顶点位置
 * @param indices 索引
 * @returns 缓存键字符串
 */
function getGeometryCacheKey(positions: Float32Array, indices: Uint32Array): string {
  // 使用前100个顶点和前50个索引的哈希作为键
  // 这能在保证唯一性的同时避免计算整个数组的哈希
  const sampleSize = Math.min(100, positions.length / 3);
  const indexSampleSize = Math.min(50, indices.length);

  let hash = 0;

  // 采样顶点位置计算哈希
  for (let i = 0; i < sampleSize * 3; i++) {
    hash = ((hash << 5) - hash + positions[i]) | 0;
  }

  // 采样索引计算哈希
  for (let i = 0; i < indexSampleSize; i++) {
    hash = ((hash << 5) - hash + indices[i]) | 0;
  }

  // 包含总数量信息避免冲突
  return `${hash}_${positions.length}_${indices.length}`;
}

/* 几何简化算法（基于顶点合并）
     * @param positions 原始顶点位置
     * @param normals 原始法线
     * @param indices 原始索引
     */
export function simplifyGeometry(
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array
): { positions: Float32Array; normals: Float32Array; indices: Uint32Array } {
  const originalVertexCount = positions.length / 3;

  // 设置简化阈值：只有当顶点数量超过1000时才进行简化
  const SIMPLIFY_THRESHOLD = 1000;

  if (originalVertexCount <= SIMPLIFY_THRESHOLD) {
    // 顶点数量较少，直接返回原始数据，保持平面的光滑性
    return {
      positions: positions,
      normals: normals,
      indices: indices
    };
  }

  // 检查缓存
  const cacheKey = getGeometryCacheKey(positions, indices);
  const cachedResult = simplificationCache.get(cacheKey);
  if (cachedResult) {
    // console.log(`使用缓存的简化结果：顶点 ${originalVertexCount} -> ${cachedResult.positions.length / 3}`);
    return cachedResult;
  }

  // 使用更小的容差，避免过度合并导致平面不光滑
  const tolerance = 0.001;
  const normalThreshold = 0.98; // 法线点积阈值，确保法线方向相近

  // 创建顶点映射表，key包含位置和法线信息
  const vertexMap = new Map<string, number>();
  const newPositions: number[] = [];
  const newNormals: number[] = [];

  // 合并相近顶点（考虑位置和法线）
  for (let i = 0; i < originalVertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const nx = normals[i * 3];
    const ny = normals[i * 3 + 1];
    const nz = normals[i * 3 + 2];

    // 量化顶点坐标
    const quantizedX = Math.round(x / tolerance) * tolerance;
    const quantizedY = Math.round(y / tolerance) * tolerance;
    const quantizedZ = Math.round(z / tolerance) * tolerance;

    // 量化法线坐标
    const quantizedNX = Math.round(nx / tolerance) * tolerance;
    const quantizedNY = Math.round(ny / tolerance) * tolerance;
    const quantizedNZ = Math.round(nz / tolerance) * tolerance;

    // 包含位置和法线的复合键
    const positionKey = `${quantizedX},${quantizedY},${quantizedZ}`;

    // 首先检查是否有相同位置的顶点
    if (!vertexMap.has(positionKey)) {
      // 没有相同位置，直接添加新顶点
      const newIndex = newPositions.length / 3;
      vertexMap.set(positionKey, newIndex);
      newPositions.push(x, y, z);
      newNormals.push(nx, ny, nz);
    } else {
      // 有相同位置的顶点，检查法线是否相近
      const existingIndex = vertexMap.get(positionKey)!;
      const existingNormalStart = existingIndex * 3;
      const existingNX = newNormals[existingNormalStart];
      const existingNY = newNormals[existingNormalStart + 1];
      const existingNZ = newNormals[existingNormalStart + 2];

      // 计算法线点积
      const dotProduct = nx * existingNX + ny * existingNY + nz * existingNZ;

      // 如果法线差异较大，创建新的顶点（使用不同键）
      if (dotProduct < normalThreshold) {
        const newIndex = newPositions.length / 3;
        const detailedKey = `${positionKey}_${quantizedNX},${quantizedNY},${quantizedNZ}`;
        vertexMap.set(detailedKey, newIndex);
        newPositions.push(x, y, z);
        newNormals.push(nx, ny, nz);
      }
      // 如果法线相近，使用现有顶点（不添加新顶点）
    }
  }

  // 重新映射索引
  const newIndices: number[] = [];
  for (let i = 0; i < indices.length; i++) {
    const vertexIndex = indices[i];
    const x = positions[vertexIndex * 3];
    const y = positions[vertexIndex * 3 + 1];
    const z = positions[vertexIndex * 3 + 2];
    const nx = normals[vertexIndex * 3];
    const ny = normals[vertexIndex * 3 + 1];
    const nz = normals[vertexIndex * 3 + 2];

    // 量化坐标
    const quantizedX = Math.round(x / tolerance) * tolerance;
    const quantizedY = Math.round(y / tolerance) * tolerance;
    const quantizedZ = Math.round(z / tolerance) * tolerance;
    const quantizedNX = Math.round(nx / tolerance) * tolerance;
    const quantizedNY = Math.round(ny / tolerance) * tolerance;
    const quantizedNZ = Math.round(nz / tolerance) * tolerance;

    // 构建查找键
    const positionKey = `${quantizedX},${quantizedY},${quantizedZ}`;
    const detailedKey = `${positionKey}_${quantizedNX},${quantizedNY},${quantizedNZ}`;

    // 优先查找精确匹配（位置+法线）
    let newIndex = vertexMap.get(detailedKey);

    // 如果没找到，查找位置匹配
    if (newIndex === undefined) {
      newIndex = vertexMap.get(positionKey);
    }

    if (newIndex !== undefined) {
      newIndices.push(newIndex);
    }
  }

  const simplifiedVertexCount = newPositions.length / 3;
  const vertexReduction = ((originalVertexCount - simplifiedVertexCount) / originalVertexCount * 100).toFixed(2);

  const result = {
    positions: new Float32Array(newPositions),
    normals: new Float32Array(newNormals),
    indices: new Uint32Array(newIndices)
  };

  // 缓存结果
  simplificationCache.set(cacheKey, result);
  // console.log(`几何简化结果：顶点 ${originalVertexCount} → ${simplifiedVertexCount} (减少${vertexReduction}%)，已缓存`);

  return result;
}

export function calculateEdges(indexAttr: number[], indexCount: number, positionAttr: number[], thresholdAngle = 15): BABYLON.Vector3[][] {
  // 预计算阈值和精度
  const thresholdDot = Math.cos(BABYLON.Angle.FromDegrees(thresholdAngle).radians());
  const precision = 10000; // 减少精度位数，提高性能

  // 使用 Map 替代 Object，提高查找性能
  const edgeMap = new Map<string, { normal: number[]; triangleIndex: number }>();
  const edges: BABYLON.Vector3[][] = [];

  // 重用临时变量，减少对象创建
  const tempVectors = {
    a: new BABYLON.Vector3(),
    b: new BABYLON.Vector3(),
    c: new BABYLON.Vector3(),
    edge1: new BABYLON.Vector3(),
    edge2: new BABYLON.Vector3(),
    normal: new BABYLON.Vector3()
  };

  // 顶点坐标缓存，避免重复计算
  const vertexCache = new Map<number, number[]>();

  // 计算顶点坐标的哈希值
  const getVertexHash = (vertexIndex: number): string => {
    if (vertexCache.has(vertexIndex)) {
      const coords = vertexCache.get(vertexIndex)!;
      return `${Math.round(coords[0] * precision)},${Math.round(coords[1] * precision)},${Math.round(coords[2] * precision)}`;
    }

    const posIndex = vertexIndex * 3;
    const coords = [
      positionAttr[posIndex],
      positionAttr[posIndex + 1],
      positionAttr[posIndex + 2]
    ];
    vertexCache.set(vertexIndex, coords);

    return `${Math.round(coords[0] * precision)},${Math.round(coords[1] * precision)},${Math.round(coords[2] * precision)}`;
  };

  // 计算三角形法线
  const computeTriangleNormal = (v1: BABYLON.Vector3, v2: BABYLON.Vector3, v3: BABYLON.Vector3, normal: BABYLON.Vector3) => {
    tempVectors.edge1.copyFrom(v2).subtractInPlace(v1);
    tempVectors.edge2.copyFrom(v3).subtractInPlace(v1);
    BABYLON.Vector3.CrossToRef(tempVectors.edge1, tempVectors.edge2, normal);
    normal.normalize();
  };

  // 处理每个三角形
  for (let i = 0; i < indexCount; i += 3) {
    const vertexIndices = [indexAttr[i], indexAttr[i + 1], indexAttr[i + 2]];

    // 获取顶点位置
    for (let j = 0; j < 3; j++) {
      const posIndex = vertexIndices[j] * 3;
      const coords = [positionAttr[posIndex], positionAttr[posIndex + 1], positionAttr[posIndex + 2]];

      switch (j) {
        case 0: tempVectors.a.copyFromFloats(coords[0], coords[1], coords[2]); break;
        case 1: tempVectors.b.copyFromFloats(coords[0], coords[1], coords[2]); break;
        case 2: tempVectors.c.copyFromFloats(coords[0], coords[1], coords[2]); break;
      }
    }

    // 计算法线
    computeTriangleNormal(tempVectors.a, tempVectors.b, tempVectors.c, tempVectors.normal);

    // 获取顶点哈希
    const hashes = vertexIndices.map(getVertexHash);

    // 跳过退化三角形
    if (hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[2] === hashes[0]) {
      continue;
    }

    // 处理每条边
    for (let j = 0; j < 3; j++) {
      const jNext = (j + 1) % 3;
      const vecHash0 = hashes[j];
      const vecHash1 = hashes[jNext];

      const hash = `${vecHash0}_${vecHash1}`;
      const reverseHash = `${vecHash1}_${vecHash0}`;

      // 检查是否存在反向边
      if (edgeMap.has(reverseHash)) {
        const existingEdge = edgeMap.get(reverseHash)!;

        // 计算法线点积
        const dot = tempVectors.normal.x * existingEdge.normal[0] +
          tempVectors.normal.y * existingEdge.normal[1] +
          tempVectors.normal.z * existingEdge.normal[2];

        // 如果夹角大于阈值，创建边
        if (dot <= thresholdDot) {
          const v0 = j === 0 ? tempVectors.a : j === 1 ? tempVectors.b : tempVectors.c;
          const v1 = jNext === 0 ? tempVectors.a : jNext === 1 ? tempVectors.b : tempVectors.c;

          edges.push([
            new BABYLON.Vector3(v0.x, v0.y, v0.z),
            new BABYLON.Vector3(v1.x, v1.y, v1.z)
          ]);
        }

        // 移除已处理的边
        edgeMap.delete(reverseHash);
      } else if (!edgeMap.has(hash)) {
        // 存储新边
        edgeMap.set(hash, {
          normal: [tempVectors.normal.x, tempVectors.normal.y, tempVectors.normal.z],
          triangleIndex: i
        });
      }
    }
  }

  // 处理剩余的边界边
  for (const [hash, edgeInfo] of edgeMap) {
    const [hash0, hash1] = hash.split('_');

    // 解析顶点坐标
    const coords0 = hash0.split(',').map(Number).map(v => v / precision);
    const coords1 = hash1.split(',').map(Number).map(v => v / precision);

    edges.push([
      new BABYLON.Vector3(coords0[0], coords0[1], coords0[2]),
      new BABYLON.Vector3(coords1[0], coords1[1], coords1[2])
    ]);
  }

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
  onProgress?: (percent: number, message: string, loaded: number, total: number) => void
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
      const collectProgress = 70 + (processedMaterials / totalMaterials) * 5; // 70%-75%
      onProgress(collectProgress, "正在合并网格...", Math.floor(collectProgress), 100);
      // console.log(`合并网格阶段 - 收集进度: ${processedMaterials}/${totalMaterials} -> ${collectProgress}%`);

      // 添加微小延迟，让进度条有足够时间显示
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // 第二步：对每个材质组的几何体进行合并
  const mergedMeshes: BABYLON.Mesh[] = [];
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

        // 使用简化后的几何体进行合并，确保渲染和子网格操作的一致性
        const simplifiedGeometries: any[] = [];
        const simplificationResults: Map<any, any> = new Map(); // 缓存每个几何体的简化结果

        for (const geometryData of geometries) {
          // 应用几何简化算法
          const simplified = simplifyGeometry(
            geometryData.positions,
            geometryData.normals || new Float32Array(geometryData.positions.length),
            geometryData.indices
          );
          simplifiedGeometries.push(simplified);
          simplificationResults.set(geometryData, simplified); // 缓存简化结果

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
        for (const simplifiedGeometry of simplifiedGeometries) {
          // 使用set方法批量复制数组数据，比循环更快
          if (simplifiedGeometry.positions) {
            positions.set(simplifiedGeometry.positions, positionIndex);
            positionIndex += simplifiedGeometry.positions.length;
          }

          if (simplifiedGeometry.normals) {
            normals.set(simplifiedGeometry.normals, normalIndex);
            normalIndex += simplifiedGeometry.normals.length;
          }

          // 索引需要偏移，使用循环处理
          if (simplifiedGeometry.indices) {
            const indicesArray = simplifiedGeometry.indices;
            for (let i = 0; i < indicesArray.length; i++) {
              indices[indexIndex++] = indicesArray[i] + vertexOffset;
            }
          }

          // 更新顶点偏移量
          if (simplifiedGeometry.positions) {
            vertexOffset += simplifiedGeometry.positions.length / 3;
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

        // 保存合并信息到元数据，保留所有原始网格的expressID、GUID等数据
        // const originalMeshes = originalMeshesByMaterial.get(colorID) || [];

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
            // 使用缓存中的简化结果，避免重复计算
            let simplified = simplificationResults.get(meshData.geometryData);

            if (!simplified) {
              // 如果缓存中没有，执行简化（这通常是代码逻辑错误，但作为保险）
              simplified = simplifyGeometry(
                meshData.geometryData.positions,
                meshData.geometryData.normals || new Float32Array(meshData.geometryData.positions.length),
                meshData.geometryData.indices
              );
              console.warn(`缓存未命中，为材质 ${colorID} 的几何体重新计算简化结果`);
            }

            const positions = simplified.positions;
            const normals = simplified.normals;
            const indices = simplified.indices;

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

        mergedMeshes.push(mergedMesh);

        // console.log(`合并了材质 ${colorID} 的 ${geometries.length} 个几何体，保留了 ${originalMeshes.length} 个原始子网格数据，合并后的网格数量为 ${mergedMeshes.length} 个`);

      } catch (error) {
        console.error(`合并材质 ${colorID} 的几何体时发生错误:`, error);
        // 如果合并失败，保持原始网格不变
        const originalMeshes = originalMeshesByMaterial.get(colorID) || [];
        for (const mesh of originalMeshes) {
          if (mesh && !mesh.isDisposed()) {
            mesh.isVisible = true;
            mergedMeshes.push(mesh);
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
          // 应用几何简化算法（单个几何体也需要缓存）
          const simplified = simplifyGeometry(
            geometryData.positions,
            geometryData.normals || new Float32Array(geometryData.positions.length),
            geometryData.indices
          );

          // 创建顶点数据并应用到网格 - 优化：直接使用TypedArray
          const vertexData = new BABYLON.VertexData();
          vertexData.positions = simplified.positions;
          vertexData.normals = simplified.normals;
          vertexData.indices = simplified.indices;

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

            // 保存几何数据用于子网格操作（使用简化后的数据）
            const originalMeshData = [{
              positions: simplified.positions,
              normals: simplified.normals,
              indices: simplified.indices,
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

          mergedMeshes.push(mesh);
        }
      }
    }

    // 更新合并阶段的进度（合并阶段占总进度的16%）
    processedMergeGroups++;
    if (onProgress) {
      const mergeProgress = 75 + (processedMergeGroups / totalMergeGroups) * 15; // 75%-90%
      onProgress(mergeProgress, "正在合并网格...", Math.floor(mergeProgress), 100);
      // console.log(`合并网格阶段 - 合并进度: ${processedMergeGroups}/${totalMergeGroups} -> ${mergeProgress}%`);

      // 添加微小延迟，让进度条有足够时间显示
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // 第三步：清空原始材质映射表，用合并后的网格替换
  materialsMap.clear();

  // 将合并后的网格按材质重新分组
  mergedMeshes.forEach(mesh => {
    const metadata = mesh.metadata || {};
    const colorID = metadata.originalMaterialId || calculateColorIDFromMesh(mesh);

    if (!materialsMap.has(colorID)) {
      materialsMap.set(colorID, []);
    }
    materialsMap.get(colorID)!.push(mesh);
  });

  console.log(`网格合并完成，共创建了 ${mergedMeshes.length} 个合并后的网格，保留了所有原始子网格`);

  clearSimplificationCache()

}

/**
   * 从网格计算颜色ID（用于回退机制）
   */
function calculateColorIDFromMesh(mesh: BABYLON.Mesh): number {
  if (mesh.material && mesh.material instanceof BABYLON.StandardMaterial) {
    const material = mesh.material as BABYLON.StandardMaterial;
    const color = material.diffuseColor;
    if (color) {
      return Math.floor(color.r * 255) + Math.floor(color.g * 255) + Math.floor(color.b * 255);
    }
  }
  return 0;
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
export function clearSimplificationCache() {
  const cacheSize = simplificationCache.size;
  simplificationCache.clear();
  console.log(`清理了几何简化缓存，释放了 ${cacheSize} 个缓存项`);
}
