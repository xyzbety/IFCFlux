import * as BABYLON from '@babylonjs/core';

export class EffectManager {
  public highlightColor = new BABYLON.Color4(0.5, 1.0, 1.0, 1.0);
  public isHighlightRender = true;
  public isEdegeRender = false;
  public edgeColor = new BABYLON.Color4(0.6, 1, 1, 1);
  public edgeWidth = 10.0;
  private static instance: EffectManager | null = null;
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
        mainTextureRatio: 3,
        // mainTextureFixedSize: 4096,  // 增加纹理分辨率
        isStroke: true,
        // blurHorizontalSize: 1.2,
        // blurVerticalSize: 1.2
      });

      this.highlightLayer.outerGlow = true;
      this.highlightLayer.innerGlow = true;
      console.log("创建高亮层", this.highlightLayer);
    }

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
        mesh.renderOverlay = true;
        mesh.overlayAlpha = 0.25;
        mesh.overlayColor = new BABYLON.Color3(this.highlightColor.r, this.highlightColor.g, this.highlightColor.b);
        mesh.isVisible = true;
        mesh.renderingGroupId = 1;
        //  高亮实现边框渲染
        // this.highlightLayer!.addMesh(mesh as BABYLON.Mesh, this.highlightColor);
        // 直接使用边框渲染
        mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
        mesh.edgesWidth = this.edgeWidth;
        mesh.edgesColor = this.highlightColor;
        mesh.edgesRenderer.lineShader.options.useClipPlane = true; // 允许边缘渲染使用裁剪平面
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

    this.scene.meshes.forEach(mesh => {
      if (mesh.metadata?.originalMaterial !== undefined) {
        mesh.material = mesh.metadata.originalMaterial;
        mesh.isVisible = mesh.metadata.originalVisibility !== false;
        mesh.renderingGroupId = 0;
        mesh.renderOverlay = false;
        mesh.disableEdgesRendering();
        delete mesh.metadata.originalMaterial;
        delete mesh.metadata.originalVisibility;
      }
    });
  }
  public edgeRender(expressID?: string) {
    this.clearEdgeRender();
    if (this.isEdegeRender) {
      this.scene.meshes.forEach(mesh => {
        // 启用边缘渲染
        mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
        mesh.edgesWidth = this.edgeWidth;
        mesh.edgesColor = this.edgeColor;
      });

    } else if (expressID) {
      this.scene.meshes.forEach(mesh => {
        if (mesh.id === expressID) {
          mesh.enableEdgesRendering(0.999, true, { useAlternateEdgeFinder: false, applyTessellation: false, useFastVertexMerger: false });
          mesh.edgesWidth = this.edgeWidth;
          mesh.edgesColor = this.edgeColor;
        }
      })
    }
  }
  private clearEdgeRender() {
    this.scene.meshes.forEach(mesh => {
      // 禁用边缘渲染
      mesh.disableEdgesRendering();
    });
  }
}