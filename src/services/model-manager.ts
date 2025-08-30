import { ref, Ref } from 'vue';
import * as BABYLON from '@babylonjs/core/index.js';
import { IfcLoader } from '../utils/loader/IfcLoader.js';
import { addFileHistory } from '../utils/indexedDB.ts';
import { useModelStore } from '../store/index.ts';
import { useLayoutManager } from '../composables/useLayoutManager.ts';
import { SceneManager } from './scene-manager.ts';
import { IfcInspect } from '../utils/ifc/IfcInspect.js';

const { switchToMode, LayoutMode: LM } = useLayoutManager();

export class ModelManager {
  private static instance: ModelManager | null = null;
  private scene: BABYLON.Scene | null = null;
  private loading: Ref<boolean>;
  private progress: Ref<{
    percent: number;
    current: number;
    total: number;
    text: string;
  }>;
  private modelStore = useModelStore();

  private constructor() {
    this.loading = ref(false);
    this.progress = ref({
      percent: 0,
      current: 0,
      total: 100,
      text: "准备就绪"
    });
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  public get isLoading() {
    return this.loading;
  }

  public get loadProgress() {
    return this.progress;
  }

  public async loadModel(file: File, onModelLoaded: () => void): Promise<void> {
    if (!this.scene) {
      console.error("ModelManager not initialized with a scene.");
      return;
    }

    try {
      this.loading.value = true;
      switchToMode(LM.CANVAS_ONLY);
      await this.addToFileHistory(file);

      this.clearExistingScene();
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'ifc') {
        this.updateProgress(0, 100, "打开文件");
        const ifcLoader = new IfcLoader(file, this.scene);
        
        const onProgressCallback = (loaded: number, total: number) => {
            this.updateProgress(loaded, total, "加载模型");
        };

        await ifcLoader.load(0, 0, 0, onProgressCallback);

        this.modelStore.setModel(file, {
            tree: ifcLoader.ifcTree,
            properties: ifcLoader.properties,
            ifcExpressIds: ifcLoader.ifcExpressIds,
            ifcManager: ifcLoader.ifcApi,
            modelID: ifcLoader.modelID
        });
        
        this.updateProgress(100, 100, "完成");

      } else {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      if (onModelLoaded) {
        onModelLoaded();
      }

    } catch (error) {
      console.error("加载失败:", error);
      this.updateProgress(100, 100, "加载失败");
      throw error;
    } finally {
      // Give the UI a moment to show the 100% "完成" status before hiding the progress bar.
      setTimeout(() => {
        this.loading.value = false;
      }, 500);
    }
  }

  private async addToFileHistory(file: File): Promise<void> {
    try {
      await addFileHistory({
        name: file.name,
        path: file.name,
        file: file,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to add file to history:", error);
    }
  }

  private clearExistingScene(): void {
    if (this.scene) {
      const sceneManager = SceneManager.getInstance();
      // Dispose only meshes that are not the camera or lights managed by SceneManager
      this.scene.meshes.slice().forEach(mesh => {
          if (mesh.name !== 'camera' && !mesh.name.toLowerCase().includes('light')) {
              mesh.dispose();
          }
      });
      this.scene.materials.slice().forEach(mat => mat.dispose());
      this.scene.textures.slice().forEach(tex => tex.dispose());
      this.modelStore.clearModel();
      this.modelStore.clearModelInspectData();
    }
  }

  private updateProgress(percent: number, total: number, text: string): void {
    this.progress.value = {
      percent: Math.floor((percent / total) * 100),
      current: percent,
      total,
      text
    };
  }

  public setupInspectDataListener(file: File, type: number): void {
    const ifcInspect = new IfcInspect(file, type);
    console.log("开始监听模型检查数据...", file);
    const checkInterval = setInterval(() => {
      if (ifcInspect.ifcData) {
        clearInterval(checkInterval);
        this.modelStore.clearModelInspectData();
        this.modelStore.setModelInspectData(ifcInspect.ifcData);
        console.log("模型检查数据已更新", ifcInspect.ifcData, this.modelStore.modelInspectData);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 100000);
  }
}