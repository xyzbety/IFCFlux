import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';

export const useModelStore = defineStore('model', {
    state: () => ({
        file: null as File | null,
        modelData: null as any,
        psetLines: shallowRef<any>(null),
        modelInspectData: null as any,
        loading: false,
        progress: {
            text: 'Loading...',
            current: 0,
            total: 0,
            percent: 0,
        }
    }),
    actions: {
        setModel(file: File, modelData: any, psetLines: any) {
            this.file = file
            this.modelData = modelData
            this.psetLines = psetLines
        },
        setModelInspectData(modelInspectData: any) {
            this.modelInspectData = modelInspectData
        },
        clearModel() {
            this.file = null
            this.modelData = null
        },
        clearModelInspectData() {
            this.modelInspectData = null
        },
        setLoading(loading: boolean) {
            this.loading = loading;
        },
        setProgress(progress: any) {
            this.progress = { ...this.progress, ...progress };
        }
    }
})

export const useSceneStore = defineStore('scene', () => {
  // 场景设置数据
  const sceneSettings = ref<{ backgroundColor?: string }>({})
  // 相机状态
  const cameraState = ref({
    position: null as { x: number; y: number; z: number } | null,
    target: null as { x: number; y: number; z: number } | null,
  })

  // 修改场景设置的方法
  function setSceneSettings(settings: { backgroundColor?: string }) {
    sceneSettings.value = { ...sceneSettings.value, ...settings }
  }

  // 修改相机状态
  function setCameraState(state: { position?: any; target?: any }) {
    if (state.position) {
      cameraState.value.position = { x: state.position.x, y: state.position.y, z: state.position.z };
    }
    if (state.target) {
      cameraState.value.target = { x: state.target.x, y: state.target.y, z: state.target.z };
    }
  }

  return { sceneSettings, setSceneSettings, cameraState, setCameraState }
})

// store.ts
export const useSelectedStore = defineStore('inspectTable', () => {
  const selectedRowKey = ref<string | null>(null);
  
  const updateSelectedRowKey = (newValue: string | null) => {
    selectedRowKey.value = newValue;
  };
  
  return { selectedRowKey, updateSelectedRowKey };
});