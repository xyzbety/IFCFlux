import * as BABYLON from '@babylonjs/core';

export class EffectManager {
  public highlightColor = new BABYLON.Color4(0.5, 1.0, 1.0, 1.0);
  public isHighlightRender = true;
  public isEdegeRender = false;
  public edgeColor = new BABYLON.Color4(0.6, 1, 1, 1);
  public edgeWidth = 10.0;
  private static instance: EffectManager | null = null;
  private highlightLayer: BABYLON.HighlightLayer | null = null;
  private materialmask: BABYLON.StandardMaterial | null = null;
  public simpleTarget: BABYLON.RenderTargetTexture | null = null;
  private maskTarget: BABYLON.RenderTargetTexture | null = null;

  private constructor(private scene: BABYLON.Scene) {
  }

  public static getInstance(scene: BABYLON.Scene): EffectManager {
    if (!EffectManager.instance || EffectManager.instance.scene !== scene) {
      EffectManager.instance = new EffectManager(scene);
    }
    return EffectManager.instance;
  }

  public applyHighlight(meshes: BABYLON.AbstractMesh[]): void {
    this.clearAll();

    // // 创建高亮层（只创建一次）
    // if (!this.highlightLayer) {
    //   this.highlightLayer = new BABYLON.HighlightLayer("highlightLayer", this.scene, {
    //     // mainTextureRatio: 2,
    //     // mainTextureFixedSize: 4096,  // 增加纹理分辨率
    //     isStroke: true,
    //     // blurHorizontalSize: 1.2,
    //     // blurVerticalSize: 1.2
    //   });

    //   this.highlightLayer.outerGlow = true;
    //   this.highlightLayer.innerGlow = true;
    //   console.log("创建高亮层", this.highlightLayer);
    // }



    meshes.forEach(mesh => {
      if (!mesh.metadata) mesh.metadata = {};
      if (mesh.name === 'slicePlane' ||
        mesh.name === "measureLine" ||
        mesh.name === "tempLine" ||
        mesh.name === "measureRectangle" ||
        mesh.name === "tempRectangle" ||
        mesh.name === "rectangleMesh" ||
        mesh.name === "pointMarker") return;

      // 保存原始状态
      mesh.metadata.originalMaterial = mesh.material;
      mesh.metadata.originalVisibility = mesh.isVisible;

      if (this.isHighlightRender) {
        // mesh.renderOverlay = true;
        // mesh.overlayAlpha = 0.25;
        // mesh.overlayColor = new BABYLON.Color3(this.highlightColor.r, this.highlightColor.g, this.highlightColor.b);
        mesh.isVisible = true;
        mesh.renderingGroupId = 1;
        //  高亮实现边框渲染
        // this.highlightLayer!.addMesh(mesh as BABYLON.Mesh, new BABYLON.Color3(this.highlightColor.r, this.highlightColor.g, this.highlightColor.b));
        // 直接使用边框渲染
        // mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
        // mesh.edgesWidth = this.edgeWidth;
        // mesh.edgesColor = this.highlightColor;
        // mesh.edgesRenderer.lineShader.options.useClipPlane = true; // 允许边缘渲染使用裁剪平面
        // // 使用自定义后处理实现边框渲染
        this.maskTarget.renderList.push(mesh);
        this.maskTarget.setMaterialForRendering(mesh, this.materialmask);
      }

    });
  }

  public clearAll(): void {
    if (this.highlightLayer) {
      console.log("清除高亮层", this.highlightLayer);
      this.highlightLayer.removeAllMeshes();
      this.highlightLayer.dispose();
      this.highlightLayer = null;
    }
    if (this.maskTarget?.renderList) {
      this.maskTarget.renderList = [];
    }

    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.originalMaterial !== undefined) {
        mesh.material = mesh.metadata.originalMaterial;
        mesh.isVisible = mesh.metadata.originalVisibility !== false;
        mesh.renderingGroupId = 0;
        // mesh.renderOverlay = false;
        // mesh.disableEdgesRendering();
        delete mesh.metadata.originalMaterial;
        delete mesh.metadata.originalVisibility;
        // this.edgeRender()
      }
    });
  }
  public edgeRender(expressID?: string) {
    console.log("edgeRender", expressID, this.isEdegeRender, this.isHighlightRender);
    this.clearEdgeRender();

    if (this.isEdegeRender) {
      this.scene.meshes.forEach(mesh => {
        // 启用边缘渲染
        mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
        mesh.edgesWidth = this.edgeWidth;
        mesh.edgesRenderer.lineShader.options.useClipPlane = true;

        // if (this.isHighlightRender)
        //   mesh.edgesColor = mesh.id === expressID ? this.highlightColor : this.edgeColor;
        // else
        mesh.edgesColor = this.edgeColor;
      });
    }
    // else if (expressID && this.isHighlightRender) {
    //   this.scene.meshes.forEach(mesh => {
    //     if (mesh.id === expressID) {
    //       mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
    //       mesh.edgesWidth = this.edgeWidth;
    //       mesh.edgesColor = this.highlightColor;
    //       mesh.edgesRenderer.lineShader.options.useClipPlane = true;
    //     }
    //   })
    // }
  }

  public resetResources(): void {
    console.log("重置资源");
    // 释放现有资源
    this.disposeResources();

    // 重新初始化资源
    this.createMaterials();
    this.createRenderTargetTextures();
    this.createObjectOutlinePasses();
  }

  private clearEdgeRender() {
    this.scene.meshes.forEach(mesh => {
      // 禁用边缘渲染
      mesh.disableEdgesRendering();
    });
  }
  /**
 * 清空所有线框模型
 */


  private createMaterials() {
    if (!this._materialmask) {
      this.materialmask = new BABYLON.ShaderMaterial(
        "shaderMask",
        this.scene,
        "./shaders/MASK",
        {
          attributes: ["position"],
          uniforms: ["worldViewProjection"],
        },
      );
    }
  }

  private createRenderTargetTextures() {
    const samplesWhenStopped = this.scene.getEngine().getCaps().maxMSAASamples;
    this.scene.getEngine().setHardwareScalingLevel(0.5)  // 场景在下采样之前将以两倍的分辨率渲染,实现抗锯齿
    this.simpleTarget = new BABYLON.RenderTargetTexture("simpleTarget", { width: this.scene.getEngine().getRenderWidth(), height: this.scene.getEngine().getRenderHeight() }, this.scene);

    this.simpleTarget.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    this.simpleTarget.activeCamera = this.scene.activeCamera;
    this.simpleTarget.samples = 4;
    this.scene.customRenderTargets.push(this.simpleTarget);

    this.maskTarget = new BABYLON.RenderTargetTexture("maskTarget", { width: this.scene.getEngine().getRenderWidth(), height: this.scene.getEngine().getRenderHeight() }, this.scene);

    this.maskTarget.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    this.maskTarget.activeCamera = this.scene.activeCamera;;
    this.maskTarget.samples = 4;
    this.scene.customRenderTargets.push(this.maskTarget);

  }

  private createObjectOutlinePasses() {
    var horizontalBlurrPass = new BABYLON.PostProcess(
      'Blurr Shader',
      './shaders/BLURR_MASK',  // shader
      ['HorizontalBlurr', 'VerticalBlurr', 'screenSizeX', 'screenSizeY'], // attributes
      ['textureMaskSampler'], // textures
      1.0,  // options
      this.scene.activeCamera, // camera
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // sampling
      this.scene.getEngine() // engine
    );
    horizontalBlurrPass.samples = 8;

    horizontalBlurrPass.onApply = (effect) => {
      // update the caustic texture with what we just rendered. 
      effect.setTexture('textureMaskSampler', this.maskTarget);
      effect.setInt('HorizontalBlurr', 0);
      effect.setInt('VerticalBlurr', 1);
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
    };

    var postProcessCopyHorizontal = new BABYLON.PassPostProcess("HorizontalBlurr copy", 1.0, this.scene.activeCamera);
    postProcessCopyHorizontal.samples = 8;

    var verticalBlurrPass = new BABYLON.PostProcess(
      'Blurr Shader',
      './shaders/BLURR_MASK',  // shader
      ['HorizontalBlurr', 'VerticalBlurr', 'screenSizeX', 'screenSizeY'], // attributes
      ['textureMaskSampler'], // textures
      1.0,  // options
      this.scene.activeCamera, // camera
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // sampling
      this.scene.getEngine() // engine
    );
    verticalBlurrPass.samples = 8;

    verticalBlurrPass.onApply = (effect) => {
      effect.setTextureFromPostProcess('textureMaskSampler', postProcessCopyHorizontal);
      effect.setInt('HorizontalBlurr', 1);
      effect.setInt('VerticalBlurr', 0);
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
    };

    var postProcessCopyVertical = new BABYLON.PassPostProcess("VerticalBlurr copy", 1.0, this.scene.activeCamera);
    postProcessCopyVertical.samples = 8;

    var outlinePass = new BABYLON.PostProcess(
      'Outline Shader',
      './shaders/OUTLINE',  // shader
      ['outline_pixel_width', 'outline_color', 'screenSizeX', 'screenSizeY'], // attributes
      ['textureMaskSampler', 'textureSimpleSampler'], // textures
      1.0,  // options
      this.scene.activeCamera, // camera
      BABYLON.Texture.BILINEAR_SAMPLINGMODE, // sampling
      this.scene.getEngine() // engine
    );
    outlinePass.samples = 8;

    outlinePass.onApply = (effect) => {
      effect.setTextureFromPostProcess('textureMaskSampler', postProcessCopyVertical);
      effect.setTexture('textureSimpleSampler', this.simpleTarget);
      effect.setInt('outline_pixel_width', 10);
      effect.setVector4("outline_color", new BABYLON.Vector4(this.highlightColor.r, this.highlightColor.g, this.highlightColor.b, 1.0));
      effect.setFloat("screenSizeX", this.scene.getEngine().getRenderWidth());
      effect.setFloat("screenSizeY", this.scene.getEngine().getRenderHeight());
    };
  }

  /**
 * 释放现有资源
 */
  private disposeResources(): void {
    // 释放 materialmask
    if (this.materialmask) {
      this.materialmask.dispose();
      this.materialmask = null;
    }

    // 释放 simpleTarget
    if (this.simpleTarget) {
      this.simpleTarget.dispose();
      this.scene.customRenderTargets = this.scene.customRenderTargets.filter(rt => rt !== this.simpleTarget);
      this.simpleTarget = null;
    }

    // 释放 maskTarget
    if (this.maskTarget) {
      this.maskTarget.dispose();
      this.scene.customRenderTargets = this.scene.customRenderTargets.filter(rt => rt !== this.maskTarget);
      this.maskTarget = null;
    }
  }

}