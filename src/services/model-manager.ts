import { ref, Ref, markRaw } from 'vue';
import * as BABYLON from '@babylonjs/core/index.js';
import { IfcLoader } from '../utils/loader/IfcLoader';
import { addFileHistory } from './file-history';
import { useModelStore } from '../store/index.ts';
import { useLayoutManager } from '../composables/useLayoutManager.ts';
import { IfcInspect } from '../utils/inspect/IfcInspect.js';

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
        this.updateProgress(0, "打开文件");
        const ifcLoader = new IfcLoader(file, this.scene);

        const onProgressCallback = (progress: number, text: string) => {
          this.updateProgress(progress, text);
        };

        await ifcLoader.load(onProgressCallback);
        console.log("IFC模型加载完成,模型数据为", ifcLoader);
        this.modelStore.setModel(file, {
          tree: ifcLoader.ifcTree,
          properties: ifcLoader.properties,
          ifcExpressIds: ifcLoader.ifcExpressIds,
          ifcManager: ifcLoader.ifcApi,
          modelID: ifcLoader.modelID,
          psetRelations: ifcLoader.psetRelations
        }, ifcLoader.psetLines);

      } else {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      if (onModelLoaded) {
        onModelLoaded();
      }

      this.updateProgress(100, "加载完成");
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("加载失败:", error);
      this.updateProgress(100, "加载失败");
      throw error;
    } finally {
      this.scene.onAfterRenderObservable.addOnce(() => {
        console.log("模型加载完成，隐藏进度条");
        this.loading.value = false;
      })
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
      // 使用反向循环避免删除元素导致的循环问题
      const meshes = this.scene.meshes.slice(); // 创建副本
      for (let i = meshes.length - 1; i >= 0; i--) {
        const mesh = meshes[i];
        if (mesh.name !== 'camera' && !mesh.name.includes('Light')) {
          mesh.dispose();
        }
      }
      this.scene.materials.slice().forEach(mat => mat.dispose());
      this.scene.textures.slice().forEach(tex => tex.dispose());
      this.modelStore.clearModel();
      this.modelStore.clearModelInspectData();
    }
  }

  private updateProgress(percent: number, text: string, current?: number, total?: number): void {
    this.progress.value = {
      percent: Math.floor(percent),
      current: current ?? 0,
      total: total ?? 0,
      text: text
    };
  }

  public setupInspectDataListener(file: File, type: number): void {
    const ifcInspect = new IfcInspect(file, type);
    console.log("开始监听模型检查数据...", file);
    const checkInterval = setInterval(() => {
      if (ifcInspect.ifcData) {
        clearInterval(checkInterval);
        this.modelStore.clearModelInspectData();
        this.modelStore.setModelInspectData(markRaw(ifcInspect.ifcData));
        console.log("模型检查数据已更新", ifcInspect.ifcData, this.modelStore.modelInspectData);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 100000);
  }
}