<template>
  <smart-ribbon id="ribbon"></smart-ribbon>
  <input id="fileInput" type="file" style="display: none;" accept=".ifc, .ifcXML, .ifcZIP" />
  <ProgressBar :loading="loading" :progress="progress" />
</template>

<script lang="ts" setup>
import { onMounted, nextTick } from "vue";
import ProgressBar from "./ProgressBar.vue";
import { useModelStore } from "../store/index.ts";
import "smart-webcomponents/source/styles/smart.default.css";
import "smart-webcomponents/source/modules/smart.ribbon.js";
import "smart-webcomponents/source/modules/smart.slider.js"
import "smart-webcomponents/source/modules/smart.numberinput.js"
import "smart-webcomponents/source/modules/smart.switchbutton.js"
import "smart-webcomponents/source/modules/smart.checkbox.js"
import "smart-webcomponents/source/modules/smart.colorpicker.js"
import "smart-webcomponents/source/modules/smart.progressbar.js"
import config from '../utils/default.config.ts';
import '../styles/ribbon.css';
import { RibbonEventManager } from "../composables/useRibbonEvent.ts";
import { ModelManager } from "../services/model-manager.ts";

declare global {
  interface Window {
    Smart: any;
  }
}
// 替换原有的加载逻辑
const modelManager = new ModelManager();
const loading = modelManager.isLoading;
const progress = modelManager.loadProgress;
const modelStore = useModelStore();
const emit = defineEmits([
  'navigate-event', 'change-view', 'visible-control', 'explosion-event', 'inspect-click',
  'measure-event', 'slice-event', 'build-tree', 'properties-table', 'file-uploaded', 'space-generate',
  'light-settings', 'light-settings-reset', 'scene-settings', 'animation-event', 'animation-click',
  'toggle-file-menu', 'ribbon-tab-change'
]);

let eventManager = new RibbonEventManager({
  modelStore,
  emit
});

onMounted(() => {
  window.Smart('#ribbon', class {
    get properties() {
      return config
    }
  });

  setTimeout(async () => {
    await nextTick();
    // 禁用按钮动画
    const buttons = document.querySelectorAll('smart-button');
    buttons.forEach((button: Element) => {
      button.animation = 'none'
    });
    eventManager.bindRibbonEvents();
  }, 500);

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener("change", async (event: Event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        loading.value = false;
        return;
      } 
      try {
        await modelManager.loadModel(files[0], emit);
        eventManager.initScene(modelManager.currentScene);
      } catch (error) {
        console.error("加载失败:", error);
      }
    });
  }
});

</script>
