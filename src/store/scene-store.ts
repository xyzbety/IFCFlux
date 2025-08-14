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

  // 修改场景设置的方法
  function setSceneSettings(settings: { backgroundColor?: string }) {
    sceneSettings.value = { ...sceneSettings.value, ...settings }
  }

  return { sceneSettings, setSceneSettings }
})