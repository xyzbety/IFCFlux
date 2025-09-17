import * as BABYLON from '@babylonjs/core';

export class EffectManager {
  private static instance: EffectManager | null = null;
  private highlightMaterial: BABYLON.StandardMaterial | null = null;
  private highlightAnimation: BABYLON.Animatable | null = null;
  private highlightLayer: BABYLON.HighlightLayer | null = null;

  private constructor(private scene: BABYLON.Scene) {
    // 私有构造函数
  }

  public static getInstance(scene: BABYLON.Scene): EffectManager {
    if (!EffectManager.instance || EffectManager.instance.scene !== scene) {
      EffectManager.instance = new EffectManager(scene);
    }
    return EffectManager.instance;
  }

  public applyHighlight(meshes: BABYLON.AbstractMesh[]): void {
    this.clearAll();

    // 创建高亮层（只创建一次）
    if (!this.highlightLayer) {
      this.highlightLayer = new BABYLON.HighlightLayer("highlightLayer", this.scene, {
        mainTextureFixedSize: 4096,  // 增加纹理分辨率
        blurHorizontalSize: 1,       // 减小水平模糊
        blurVerticalSize: 1,         // 减小垂直模糊
        alphaBlendingMode: BABYLON.Engine.ALPHA_COMBINE
      });

      this.highlightLayer.outerGlow = true;
      this.highlightLayer.innerGlow = true;
      console.log("创建高亮层", this.highlightLayer);
    }
    // 创建一个共享的高亮材质（如果还不存在）
    if (!this.highlightMaterial) {
      const highlightMaterial = new BABYLON.StandardMaterial("highlightMat", this.scene);
      highlightMaterial.alpha = 0.5; // 半透明
      highlightMaterial.disableLighting = true; // 不受灯光影响，保持纯色
      highlightMaterial.backFaceCulling = false; // 渲染背面，避免部分面不显示
      this.highlightMaterial = highlightMaterial;

      // 创建呼吸效果动画
      const frameRate = 30;
      const animationDurationInSeconds = 3;
      const totalFrames = frameRate * animationDurationInSeconds;

      const breathingAnimation = new BABYLON.Animation(
        "breathingAnimation",
        "emissiveColor",
        frameRate,
        BABYLON.Animation.ANIMATIONTYPE_COLOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
      );

      const keys = [];
      keys.push({ frame: 0, value: new BABYLON.Color3(0.0, 0.6, 0.6) });
      keys.push({ frame: totalFrames / 2, value: new BABYLON.Color3(0.0, 0.8, 0.8) });
      keys.push({ frame: totalFrames, value: new BABYLON.Color3(0.0, 0.6, 0.6) });

      breathingAnimation.setKeys(keys);
      if (!this.highlightMaterial.animations) {
        this.highlightMaterial.animations = [];
      }
      this.highlightMaterial.animations.push(breathingAnimation);
    }

    // 启动呼吸动画
    const totalFrames = 30 * 3;
    this.highlightAnimation = this.scene.beginAnimation(this.highlightMaterial, 0, totalFrames, true);

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

      // 应用高亮效果
      mesh.material = this.highlightMaterial;
      mesh.isVisible = true;
      mesh.renderingGroupId = 1;
      this.highlightLayer!.addMesh(mesh as BABYLON.Mesh, new BABYLON.Color3(0.0, 1.0, 1.0)); // 浅蓝色高亮
      // mesh.renderOutline = true;
      // mesh.outlineWidth = 0.25;
      // mesh.outlineColor = new BABYLON.Color4(0, 0, 1, 1);

      // // 启用边缘渲染
      // mesh.enableEdgesRendering();
      // mesh.edgesWidth = 5.0;
      // mesh.edgesRenderer?.render()
      // console.log("启用边缘渲染", mesh.edgesRenderer?.isReady(),mesh.edgesRenderer?.isEnabled);
      // mesh.edgesShareWithInstances = true;
      // mesh.edgesRenderer.lineShader.options.useClipPlane = true;
      // mesh.edgesColor = new BABYLON.Color4(0, 1, 1, 1);
    });
  }

  public clearAll(): void {
    if (this.highlightLayer) {
      this.highlightLayer.removeAllMeshes();
      this.highlightLayer.dispose();
      this.highlightLayer = null;
    }
    if (this.highlightAnimation) {
      this.highlightAnimation.stop();
      this.highlightAnimation = null;
    }

    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.originalMaterial !== undefined) {
        mesh.material = mesh.metadata.originalMaterial;
        mesh.isVisible = mesh.metadata.originalVisibility !== false;
        mesh.renderingGroupId = 0;
        // mesh.disableEdgesRendering();
        // mesh.renderOutline = false;
        // mesh.outlineWidth = 0;
        // mesh.outlineColor = new BABYLON.Color4(0, 0, 0, 0);

        delete mesh.metadata.originalMaterial;
        delete mesh.metadata.originalVisibility;
      }
    });
  }
}