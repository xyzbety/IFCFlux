import * as BABYLON from '@babylonjs/core';

export class EffectManager {
  private static instance: EffectManager | null = null;
  private highlightMaterial: BABYLON.StandardMaterial | null = null;
  private highlightAnimation: BABYLON.Animatable | null = null;

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
      keys.push({ frame: 0, value: new BABYLON.Color3(0.0, 0.3, 0.3) });
      keys.push({ frame: totalFrames / 2, value: new BABYLON.Color3(0.0, 0.6, 0.6) });
      keys.push({ frame: totalFrames, value: new BABYLON.Color3(0.0, 0.3, 0.3) });

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

      // 保存原始状态
      mesh.metadata.originalMaterial = mesh.material;
      mesh.metadata.originalVisibility = mesh.isVisible;

      // 应用高亮效果
      mesh.material = this.highlightMaterial;
      mesh.isVisible = true;
      mesh.renderingGroupId = 1;

      // 启用边缘渲染
      mesh.enableEdgesRendering();
      mesh.edgesWidth = 4.0;
      mesh.edgesColor = new BABYLON.Color4(0, 1, 1, 1);
    });
  }

  public clearAll(): void {
    if (this.highlightAnimation) {
      this.highlightAnimation.stop();
      this.highlightAnimation = null;
    }

    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.originalMaterial !== undefined) {
        mesh.material = mesh.metadata.originalMaterial;
        mesh.isVisible = mesh.metadata.originalVisibility !== false;
        mesh.renderingGroupId = 0;
        mesh.disableEdgesRendering();

        delete mesh.metadata.originalMaterial;
        delete mesh.metadata.originalVisibility;
      }
    });
  }
}