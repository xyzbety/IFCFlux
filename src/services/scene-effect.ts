import * as BABYLON from '@babylonjs/core';

/**
 * 特效管理器类
 * 负责管理场景中的高亮效果、轮廓渲染和剖切面感知的边框效果
 * 使用单例模式确保每个场景只有一个特效管理器实例
 */
export class EffectManager {
  // 公共配置属性
  public highlightColor = new BABYLON.Color4(0.5, 1.0, 1.0, 1.0); // 高亮颜色
  public isHighlightRender = true; // 是否启用高亮渲染
  public isEdegeRender = false; // 是否启用边缘渲染
  public edgeColor = new BABYLON.Color4(0.6, 1, 1, 1); // 边缘颜色
  public edgeWidth = 10.0; // 边缘宽度

  // 单例实例
  private static instance: EffectManager | null = null;

  // 渲染资源
  private materialmask: BABYLON.ShaderMaterial | null = null; // 遮罩材质
  public simpleTarget: BABYLON.RenderTargetTexture | null = null; // 简单渲染目标
  private maskTarget: BABYLON.RenderTargetTexture | null = null; // 遮罩渲染目标

  private edgeMeshes: BABYLON.AbstractMesh[] = [];

  /**
   * 私有构造函数，确保单例模式
   */
  private constructor(private scene: BABYLON.Scene) {
  }

  /**
   * 获取特效管理器实例（单例模式）
   */
  public static getInstance(scene: BABYLON.Scene): EffectManager {
    if (!EffectManager.instance || EffectManager.instance.scene !== scene) {
      EffectManager.instance = new EffectManager(scene);
    }
    return EffectManager.instance;
  }

  /**
   * 应用高亮效果到指定网格
   * @param meshes 需要高亮的网格数组
   */
  public applyHighlight(meshes: BABYLON.AbstractMesh[]): void {
    this.clearAll();
    console.log("applyHighlight", meshes.length);

    // 性能优化：缓存高亮材质，避免重复克隆
    if (!this.scene.metadata) this.scene.metadata = {};
    if (!this.scene.metadata.highlightMaterialCache) {
      this.scene.metadata.highlightMaterialCache = new Map();
    }
    const highlightMaterialCache = this.scene.metadata.highlightMaterialCache;

    // 按材质分组网格
    const materialGroups = new Map<BABYLON.Material, BABYLON.AbstractMesh[]>();

    meshes.forEach(mesh => {
      if (!mesh.metadata) mesh.metadata = {};

      // 跳过不需要高亮的特殊网格类型
      if (this.shouldSkipMesh(mesh)) return;

      // 按材质分组
      if (mesh.material) {
        if (!materialGroups.has(mesh.material)) {
          materialGroups.set(mesh.material, []);
        }
        materialGroups.get(mesh.material)!.push(mesh);
      }
    });

    // 为每个材质组应用高亮效果
    materialGroups.forEach((groupMeshes, material) => {
      // 性能优化：使用材质缓存，每个材质只克隆一次
      let highlightMaterial = highlightMaterialCache.get(material);

      if (!highlightMaterial) {
        // 如果缓存中没有，创建新的高亮材质
        highlightMaterial = material.clone(`shared_highlight_${material.name}`);
        highlightMaterialCache.set(material, highlightMaterial);
        console.log(`创建共享高亮材质: ${material.name}`);
      }

      groupMeshes.forEach(mesh => {
        // 保存原始状态以便后续恢复
        mesh.metadata.originalMaterial = mesh.material;

        if (this.isHighlightRender && this.maskTarget && this.materialmask) {
          // 使用共享的高亮材质
          this.simpleTarget?.setMaterialForRendering(mesh, highlightMaterial!);
          mesh.metadata.hightMaterial = highlightMaterial;

          // 使用自定义后处理实现边框渲染
          this.maskTarget.renderList?.push(mesh);
          this.maskTarget.setMaterialForRendering(mesh, this.materialmask);
        }
      });
    });

    console.log(`高亮完成: ${meshes.length} 个网格, 使用 ${materialGroups.size} 个共享材质`);
  }

  /**
   * 判断网格是否需要跳过处理
   */
  private shouldSkipMesh(mesh: BABYLON.AbstractMesh): boolean {
    const skipMeshNames = [
      'slicePlane', 'measureLine', 'tempLine',
      'measureRectangle', 'tempRectangle', 'rectangleMesh', 'pointMarker'
    ];
    return skipMeshNames.includes(mesh.name);
  }

  /**
 * 更新高亮颜色，不销毁和重建高亮效果
 * @param newColor 新的高亮颜色
 */
  public updateHighlightColor(newColor: BABYLON.Color4): void {
    // 更新当前高亮颜色
    this.highlightColor = newColor;

    // 检查高亮材质缓存
    if (!this.scene.metadata?.highlightMaterialCache) {
      console.warn("高亮材质缓存不存在，无法更新颜色");
      return;
    }

    const highlightMaterialCache = this.scene.metadata.highlightMaterialCache;

    // 更新所有高亮材质的颜色
    highlightMaterialCache.forEach((material, originalMaterial) => {
      if (material instanceof BABYLON.StandardMaterial) {
        material.diffuseColor = new BABYLON.Color3(newColor.r, newColor.g, newColor.b);
        material.alpha = newColor.a;
      } else if (material instanceof BABYLON.PBRMaterial) {
        material.albedoColor = new BABYLON.Color3(newColor.r, newColor.g, newColor.b);
        material.alpha = newColor.a;
      } else if (material && 'diffuseColor' in material) {
        // 其他类型材质尝试更新diffuseColor
        (material as any).diffuseColor = new BABYLON.Color3(newColor.r, newColor.g, newColor.b);
        if ('alpha' in material) {
          (material as any).alpha = newColor.a;
        }
      }
    });

    console.log(`高亮颜色已更新为: (${newColor.r}, ${newColor.g}, ${newColor.b}, ${newColor.a})`);
  }

  /**
   * 清除所有高亮效果，恢复网格原始状态
   */
  public clearAll(): void {
    // 清空遮罩渲染目标列表
    if (this.maskTarget?.renderList) {
      this.maskTarget.renderList = [];
    }

    // 性能优化：批量处理网格，避免同步阻塞
    const meshesToClear = this.scene.meshes.filter(mesh =>
      mesh.metadata?.originalMaterial !== undefined
    );

    if (meshesToClear.length === 0) return;

    console.log(`开始清除高亮效果，需要处理 ${meshesToClear.length} 个网格`);

    // 第一步：收集需要处理的网格和材质
    meshesToClear.forEach(mesh => {
      console.log(`处理网格: ${mesh.name}`);
      if (mesh.name.includes('highlight'))
        mesh.dispose()
    });

    console.log(`高亮效果清除完成，处理了 ${meshesToClear.length} 个网格`, meshesToClear);
  }


  /**
   * 启用或禁用边缘渲染
   * @param expressID 可选的网格ID（当前未使用）
   */
  public edgeRender(expressID?: string) {
    console.log("edgeRender", expressID, this.isEdegeRender, this.edgeMeshes);
    if (this.edgeMeshes.length === 0) {
      console.log("创建新边框");

      // 收集所有网格的边缘数据
      const allEdgeData: BABYLON.Vector3[][] = [];

      this.scene.meshes.forEach((mesh, index) => {
        if (index > 0) {
          const edgeData = this.calculateEdges(mesh)
          for (let i = 0; i < edgeData.length; i++) {
            allEdgeData.push(edgeData[i]);
          }
        }
      });

      // 创建一个合并的边框mesh
      if (allEdgeData.length > 0) {
        let edges = BABYLON.MeshBuilder.CreateLineSystem("lines", {
          lines: allEdgeData,
          updatable: true,
        }, this.scene);

        this.edgeMeshes.push(edges)
      }

    }

    else {
      this.updateEdgeColor()
    }
    this.edgeMeshes.forEach(edges => {
      edges.setEnabled(this.isEdegeRender)
    })

  }

  private calculateEdges(mesh: BABYLON.AbstractMesh, thresholdAngle = 15): BABYLON.Vector3[][] {
    console.time('calculateEdges')

    const indexAttr = mesh.getIndices()!;
    const indexCount = mesh.getTotalIndices();
    const positionAttr = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)!;

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

    console.timeEnd('calculateEdges');
    console.log(`计算得到 ${edges.length} 条边`);

    return edges;
  }



  /**
   * 仅更新边框颜色，不重新渲染边框
   * @param newColor 新的边框颜色
   */
  public updateEdgeColor(newColor?: BABYLON.Color4): void {
    console.log("更新边框颜色");
    // 如果有传入新颜色，更新当前颜色
    if (newColor) {
      this.edgeColor = newColor;
    }

    // 遍历所有网格，仅更新边缘颜色
    this.edgeMeshes.forEach(mesh => {
      if (this.isEdegeRender) {
        mesh.color = this.edgeColor;
      }
    });
  }

  /**
   * 重置所有渲染资源
   * 用于场景大小变化或渲染设置变更时重新创建资源
   */
  public resetResources(): void {
    console.log("重置资源");
    // 释放现有资源
    this.disposeResources();
    this.clearEdgeRender();

    // 重新初始化资源
    this.createMaterials();
    this.createRenderTargetTextures();
    this.createObjectOutlinePasses();
  }

  /**
   * 清除边缘渲染效果
   */
  private clearEdgeRender() {
    this.edgeMeshes.forEach(mesh => {
      mesh.dispose();
    });
    this.edgeMeshes = [];
  }


  /**
   * 创建遮罩材质，支持剖切面效果
   */
  private createMaterials() {
    if (!this.materialmask) {
      this.materialmask = new BABYLON.ShaderMaterial(
        "shaderMask",
        this.scene,
        "./shaders/MASK",
        {
          attributes: ["position"],
          uniforms: ["worldViewProjection", "world", "vClipPlane"],
        },
      );

      // 启用剖切面支持
      this.materialmask.setDefine("CLIPPLANE", true);

      // 设置剖切面参数更新回调
      this.materialmask.onBindObservable.add(() => {
        this.updateClipPlaneParameters(this.materialmask!);
      });
    }
  }

  /**
   * 更新剖切面参数
   * @param material 需要更新参数的材质
   */
  private updateClipPlaneParameters(material: BABYLON.ShaderMaterial): void {
    let hasClipPlane = false;

    // 检查场景中的剖切面并设置参数
    const clipPlanes = [
      this.scene.clipPlane,
      this.scene.clipPlane2,
      this.scene.clipPlane3,
      this.scene.clipPlane4,
      this.scene.clipPlane5,
      this.scene.clipPlane6
    ];

    for (const plane of clipPlanes) {
      if (plane) {
        material.setVector4("vClipPlane", new BABYLON.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.d));
        hasClipPlane = true;
        break; // 只使用第一个有效的剖切面
      }
    }

    // 如果没有剖切面，设置一个不会裁剪任何像素的剖切面参数
    if (!hasClipPlane) {
      material.setVector4("vClipPlane", new BABYLON.Vector4(0, 0, 0, -1)); // 设置一个不会裁剪任何像素的平面
    }
  }

  /**
   * 创建渲染目标纹理
   * 用于多通道渲染和后期处理效果
   */
  private createRenderTargetTextures() {
    // 设置硬件缩放级别，实现抗锯齿效果
    this.scene.getEngine().setHardwareScalingLevel(0.5);

    // 创建简单渲染目标
    this.simpleTarget = new BABYLON.RenderTargetTexture(
      "simpleTarget",
      {
        width: this.scene.getEngine().getRenderWidth(),
        height: this.scene.getEngine().getRenderHeight()
      },
      this.scene
    );

    this.simpleTarget.activeCamera = this.scene.activeCamera;
    this.simpleTarget.samples = 4; // 多重采样抗锯齿
    this.scene.customRenderTargets.push(this.simpleTarget);

    // 创建遮罩渲染目标
    this.maskTarget = new BABYLON.RenderTargetTexture(
      "maskTarget",
      {
        width: this.scene.getEngine().getRenderWidth(),
        height: this.scene.getEngine().getRenderHeight()
      },
      this.scene
    );

    this.maskTarget.activeCamera = this.scene.activeCamera;
    this.maskTarget.samples = 4; // 多重采样抗锯齿
    this.scene.customRenderTargets.push(this.maskTarget);
  }

  /**
   * 创建对象轮廓后处理通道
   * 包括模糊处理和轮廓检测
   */
  private createObjectOutlinePasses() {
    // 水平模糊通道
    const horizontalBlurrPass = new BABYLON.PostProcess(
      'horizontalBlurrPass',
      './shaders/BLURR_MASK',  // 模糊着色器
      ['HorizontalBlurr', 'VerticalBlurr', 'screenSizeX', 'screenSizeY'], // 属性
      ['textureMaskSampler'], // 纹理采样器
      1.0,  // 选项
      this.scene.activeCamera, // 相机
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // 采样模式
      this.scene.getEngine() // 引擎
    );

    // 水平模糊应用回调
    horizontalBlurrPass.onApply = (effect) => {
      effect.setTexture('textureMaskSampler', this.maskTarget!);
      effect.setInt('HorizontalBlurr', 0); // 水平模糊
      effect.setInt('VerticalBlurr', 1);   // 垂直模糊
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
    };

    // 水平模糊副本
    const postProcessCopyHorizontal = new BABYLON.PassPostProcess("HorizontalBlurr copy", 1.0, this.scene.activeCamera);
    // 垂直模糊通道
    const verticalBlurrPass = new BABYLON.PostProcess(
      'verticalBlurrPass',
      './shaders/BLURR_MASK',  // 模糊着色器
      ['HorizontalBlurr', 'VerticalBlurr', 'screenSizeX', 'screenSizeY'], // 属性
      ['textureMaskSampler'], // 纹理采样器
      1.0,  // 选项
      this.scene.activeCamera, // 相机
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // 采样模式
      this.scene.getEngine(),// 引擎
    );
    // 垂直模糊应用回调
    verticalBlurrPass.onApply = (effect) => {
      effect.setTextureFromPostProcess('textureMaskSampler', postProcessCopyHorizontal);
      effect.setInt('HorizontalBlurr', 1); // 水平模糊
      effect.setInt('VerticalBlurr', 0);   // 垂直模糊
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
    };

    // 垂直模糊副本
    const postProcessCopyVertical = new BABYLON.PassPostProcess("VerticalBlurr copy", 1.0, this.scene.activeCamera);

    // 轮廓检测通道（使用自定义的剖切面感知轮廓后处理）
    const outlinePass = new BABYLON.PostProcess(
      'Outline Shader',
      "./shaders/OUTLINE",
      ['outline_pixel_width', 'outline_color', 'screenSizeX', 'screenSizeY', 'viewProjection'], // 属性
      ['textureMaskSampler', 'textureSimpleSampler'], // 纹理采样器
      1.0,  // 选项
      this.scene.activeCamera, // 相机
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // 采样模式
      this.scene.getEngine() // 引擎
    );

    // 轮廓检测应用回调
    outlinePass.onApply = (effect) => {
      // 设置纹理采样器
      effect.setTextureFromPostProcess('textureMaskSampler', postProcessCopyVertical);
      effect.setTexture('textureSimpleSampler', this.simpleTarget!);

      // 设置轮廓参数
      effect.setInt('outline_pixel_width', 20); // 轮廓像素宽度
      effect.setVector4("outline_color", new BABYLON.Vector4(
        this.highlightColor.r,
        this.highlightColor.g,
        this.highlightColor.b,
        1.0
      ));
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
      effect.setMatrix("viewProjection", this.scene.getTransformMatrix());

      // 设置剖切面参数
      this.updateClipPlaneEffectParameters(effect);
    };
  }

  /**
   * 更新后处理效果的剖切面参数
   * @param effect 后处理效果实例
   */
  private updateClipPlaneEffectParameters(effect: BABYLON.Effect): void {
    let hasClipPlane = false;

    // 检查场景中的剖切面并设置参数
    const clipPlanes = [
      this.scene.clipPlane,
      this.scene.clipPlane2,
      this.scene.clipPlane3,
      this.scene.clipPlane4,
      this.scene.clipPlane5,
      this.scene.clipPlane6
    ];

    for (const plane of clipPlanes) {
      if (plane) {
        effect.setVector4("vClipPlane", new BABYLON.Vector4(
          plane.normal.x,
          plane.normal.y,
          plane.normal.z,
          plane.d
        ));
        hasClipPlane = true;
        break; // 只使用第一个有效的剖切面
      }
    }

    // 如果没有剖切面，设置一个不会裁剪任何像素的剖切面参数
    if (!hasClipPlane) {
      effect.setVector4("vClipPlane", new BABYLON.Vector4(0, 0, 0, -1));
    }
  }

  /**
   * 释放现有资源
   * 用于清理渲染目标、材质等资源，防止内存泄漏
   */
  private disposeResources(): void {
    // 释放遮罩材质
    if (this.materialmask) {
      this.materialmask.dispose();
      this.materialmask = null;
    }

    // 释放简单渲染目标
    if (this.simpleTarget) {
      this.simpleTarget.dispose();
      // 从场景的自定义渲染目标列表中移除
      this.scene.customRenderTargets = this.scene.customRenderTargets.filter(
        rt => rt !== this.simpleTarget
      );
      this.simpleTarget = null;
    }

    // 释放遮罩渲染目标
    if (this.maskTarget) {
      this.maskTarget.dispose();
      // 从场景的自定义渲染目标列表中移除
      this.scene.customRenderTargets = this.scene.customRenderTargets.filter(
        rt => rt !== this.maskTarget
      );
      this.maskTarget = null;
    }
  }

}