import { nextTick, ref, Ref } from 'vue';
import { Core } from '@myfront/bimflux/dist/base/core/core';
import * as BABYLON from '@babylonjs/core/index.js';
import { IfcLoader } from '../utils/loader/IfcLoader.js';
import { IfcInspect } from "@myfront/bimflux/dist/main";
import { restoreMaterials } from '../utils/ifc-api.ts';
import { addFileHistory } from '../utils/indexedDB.ts';
import { useModelStore } from '../store/index.ts';

export class ModelManager {
  private scene: BABYLON.Scene | null = null;
  private loading: Ref<boolean>;
  private progress: Ref<{
    percent: number;
    current: number;
    total: number;
    text: string;
  }>;
  private modelStore = useModelStore();

  constructor() {
    this.loading = ref(false);
    this.progress = ref({
      percent: 0,
      current: 0,
      total: 100,
      text: "打开文件"
    });
  }

  public get isLoading() {
    return this.loading;
  }

  public get loadProgress() {
    return this.progress;
  }

  public get currentScene() {
    return this.scene;
  }
  public async loadModel(file: File, emit: Function): Promise<void> {
    try {
      this.loading.value = true;
      await this.addToFileHistory(file);
      this.clearExistingScene();
      
      console.log("开始加载模型...");
      this.updateProgress(0, 1, "打开文件");

      this.scene = this.getActiveScene();
      const ifcLoader = new IfcLoader(file, this.scene);
      this.setupInspectDataListener(file);
      
      await this.loadWithProgress(ifcLoader, emit);
      console.log("模型加载完成");
    } catch (error) {
      console.error("加载失败:", error);
      throw error;
    } finally {
      this.handleSceneReady();
    }
  }

  private async addToFileHistory(file: File): Promise<void> {
    try {
      await addFileHistory({
        name: file.name,
        path: file.name,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to add file to history:", error);
    }
  }

  private clearExistingScene(): void {
    if (!this.scene) return;

    restoreMaterials(this.scene);
    this.scene.meshes.slice().forEach(mesh => mesh?.dispose());
    this.scene.materials.slice().forEach(mat => mat?.dispose());
    this.scene.textures.slice().forEach(tex => tex?.dispose());
    this.modelStore.clearModel();
    this.modelStore.clearModelInspectData();
  }

  private getActiveScene(): BABYLON.Scene {
    const scenes = Array.from(Core.getActiveScenes());
    if (!scenes.length) {
      throw new Error("没有活动的场景");
    }
    return scenes[0].babylon.scene;
  }

  private setupInspectDataListener(file: File): void {
    const ifcInspect = new IfcInspect(file);
    const checkInterval = setInterval(() => {
      if (ifcInspect.ifcData) {
        clearInterval(checkInterval);
        this.modelStore.clearModelInspectData();
        this.modelStore.setModelInspectData(ifcInspect.ifcData);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 100000);
  }

  private async loadWithProgress(ifcLoader: IfcLoader, emit: Function): Promise<void> {
    const proxyLoader = new Proxy(ifcLoader, {
      set: (target, prop, value) => {
        const result = Reflect.set(target, prop, value);
        if (prop === "loadedCount") {
          this.updateProgress(
            value,
            target.totalCount,
            value === 0 ? "打开文件" : 
            value === target.totalCount ? "完成" : "创建图元"
          );
        }
        return result;
      }
    });

    await proxyLoader.load();
    this.modelStore.setModel(ifcLoader.file, ifcLoader.ifcTree);
    emit('file-uploaded');
  }

  private updateProgress(current: number, total: number, text: string): void {
    this.progress.value = {
      percent: Math.floor((current / total) * 100),
      current,
      total,
      text
    };
  }

  private handleSceneReady(): void {
    if (!this.scene) return;
    
    this.scene.onReadyObservable.add(async () => {
      await nextTick();
      console.log('场景已就绪', this.scene);
      this.loading.value = false;
    });
  }
}
