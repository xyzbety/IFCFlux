<template>
  <smart-ribbon id="ribbon"></smart-ribbon>
  <input id="fileInput" type="file" style="display: none;" accept=".ifc" />
  <ProgressBar :loading="loading" :progress="progress" />
</template>

<script lang="ts" setup>
import { onMounted, nextTick } from "vue";
import ProgressBar from "../ProgressBar.vue";
import { useModelStore } from "../../store/index.ts";
import "smart-webcomponents/source/styles/smart.default.css";
import "smart-webcomponents/source/modules/smart.ribbon.js";
import "smart-webcomponents/source/modules/smart.slider.js"
import "smart-webcomponents/source/modules/smart.numberinput.js"
import "smart-webcomponents/source/modules/smart.checkbox.js"
import "smart-webcomponents/source/modules/smart.colorpicker.js"
import config from '../../utils/default.config.ts';
import { RibbonEventManager } from "../../composables/useRibbonEvent.ts";
import { ModelManager } from "../../services/model-manager.ts";

declare global {
  interface Window {
    Smart: any;
  }
}
// 替换原有的加载逻辑
const modelManager = ModelManager.getInstance();;
const loading = modelManager.isLoading;
const progress = modelManager.loadProgress;
const modelStore = useModelStore();
const emit = defineEmits([
  'navigate-event', 'change-view', 'visible-control', 'explosion-event', 'inspect-click',
  'measure-event', 'slice-event', 'build-tree', 'properties-table', 'file-uploaded',
  'light-settings', 'scene-settings', 'toggle-file-menu', 'ribbon-tab-change'
]);

let eventManager = RibbonEventManager.getInstance();
eventManager.initialize({ modelStore, emit });

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
    buttons.forEach((button: any) => { // Use any to bypass TypeScript error
      button.animation = 'none'
    });
    eventManager.bindRibbonEvents();
  }, 500);

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener("change", async (event: Event) => {
      console.log("fileInput", event);
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        loading.value = false;
        return;
      }
      // Emit the file to the parent component (App.vue) which will handle the loading
      emit('file-uploaded', files[0]);
    });
  }
});

</script>
