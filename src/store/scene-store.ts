import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModelStore = defineStore('model', {
    state: () => ({
        file: null as File | null,
        modelData: null as any,
        modelInspectData: null as any
    }),
    actions: {
        setModel(file: File, modelData: any) {
            this.file = file
            this.modelData = modelData
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