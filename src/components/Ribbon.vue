<template>
  <smart-ribbon id="ribbon"></smart-ribbon>
  <input id="fileInput" type="file" style="display: none;" accept=".ifc, .ifcXML, .ifcZIP" />
  <div class="loader-container" v-if="loading">
    <span class="label">
      {{ progress.text }}
      <span v-if="progress.current > 0">({{ progress.current }}/{{ progress.total }})</span>
    </span>
    <smart-progress-bar :value="progress.percent" show-progress-value></smart-progress-bar>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, nextTick, watch } from "vue";
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
import { Core } from '@myfront/bimflux/dist/base/core/core'
import { IfcInspect } from "@myfront/bimflux/dist/main";
// import { IfcLoader } from "@myfront/bimflux/dist/main";
import { IfcLoader } from "../utils/ifcLoader/IfcLoader.js";
import * as BABYLON from '@babylonjs/core/index.js';
import { restoreMaterials } from "../utils/ifc-api.ts";
import { addFileHistory } from '../utils/indexedDB';
import '../styles/ribbon.css';

declare global {
  interface Window {
    Smart: any;
  }
}


let loading = ref(false)
// 使用单一响应式对象
const progress = ref({
  percent: 0,
  current: 0,
  total: 100,
  text: "打开文件"
})
// 监听progress的变化
watch(
  () => progress.value,
  (newVal) => {
    //  console.log("进度更新:", newVal);
  },
  { deep: true }
);

let scene: BABYLON.Scene;
const modelStore = useModelStore();

const emit = defineEmits([
  'navigate-event', 'change-view', 'visible-control', 'explosion-event', 'inspect-click',
  'measure-event', 'slice-event', 'build-tree', 'properties-table', 'file-uploaded', 'space-generate',
  'light-settings', 'light-settings-reset', 'scene-settings', 'animation-event', 'animation-click',
  'toggle-file-menu'
]);
const explosionX = ref(0);
const explosionY = ref(0);
const explosionZ = ref(0);

const emitExplosion = () => {
  emit('explosion-event', {
    X: explosionX.value,
    Y: explosionY.value,
    Z: explosionZ.value
  });
};

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
    const explosionSliderX = document.getElementById("explosionSliderX");
    const explosionSliderY = document.getElementById("explosionSliderY");
    const explosionSliderZ = document.getElementById("explosionSliderZ");

    if (explosionSliderX) {
      explosionSliderX.addEventListener('change', function (event) {
        explosionX.value = event.detail.value;
        emitExplosion();
      })
    }

    if (explosionSliderY) {
      explosionSliderY.addEventListener('change', function (event) {
        explosionY.value = event.detail.value;
        emitExplosion();
      })
    }

    if (explosionSliderZ) {
      explosionSliderZ.addEventListener('change', function (event) {
        explosionZ.value = event.detail.value;
        emitExplosion();
      })
    }
  }, 500);
  const ribbon = document.getElementById('ribbon');
  if (ribbon) {
    ribbon.addEventListener('click', function (event) {
      const fileMenuButton = event.target && (event.target as Element).closest ? (event.target as Element).closest('.smart-ribbon-file-container smart-drop-down-button') : null;
      const fileMenuDropdown = document.querySelector('.smart-drop-down') as HTMLElement | null;
      if (fileMenuButton && fileMenuDropdown) {
        event.preventDefault();
        event.stopPropagation();
        emit('toggle-file-menu');
        fileMenuDropdown.style.display = 'none'
        return; // 阻止后续事件处理
      }

      const button = event.target && (event.target as Element).closest ? (event.target as Element).closest('smart-button') : null;
      if (button) {
        const parentLabel = (button.parentNode && (button.parentNode as HTMLElement).getAttribute?.('label')) || '';
        console.log("按钮被点击:", parentLabel);
        switch (parentLabel) {
          case "平移":
            emit("navigate-event", "pan");
            break;
          case "旋转":
            emit("navigate-event", "rotate");
            break;
          case "放大":
            emit("navigate-event", "zoomIn");
            break;
          case "缩小":
            emit("navigate-event", "zoomOut");
            break;
          case "向右旋转":
            emit("navigate-event", "rotateRight");
            break;
          case "向左旋转":
            emit("navigate-event", "rotateLeft");
            break;
          case "默认视图":
            emit("change-view", 'default');
            break;
          case "顶视图":
            emit("change-view", 'top');
            break;
          case "底视图":
            emit("change-view", 'bottom');
            break;
          case "前视图":
            emit("change-view", 'front');
            break;
          case "后视图":
            emit("change-view", 'back');
            break;
          case "左视图":
            emit("change-view", 'left');
            break;
          case "右视图":
            emit("change-view", 'right');
            break;
          case "隐藏选中":
            emit("visible-control", "hideSelected");
            break;
          case "隔离选中":
            emit("visible-control", "isolateSelected");
            break;
          case "半透明选中":
            emit("visible-control", "transparentSelected");
            break;
          case "显示全部":
            emit("visible-control", "showAll");
            break;
          case "距离":
            emit("measure-event", "distance");
            break;
          case "面积":
            emit("measure-event", "area");
            break;
          case "角度":
            emit("measure-event", "angle");
            break;
          case "坐标":
            emit("measure-event", "coordinate");
            break;
          case "清除测量":
            emit("measure-event", "clear");
            break;
          case "剖面显隐":
            emit("slice-event", "visible");
            break;
          case "沿x轴":
            emit("slice-event", "x");
            break;
          case "沿y轴":
            emit("slice-event", "y");
            break;
          case "沿z轴":
            emit("slice-event", "z");
            break;
          case "剖切还原":
            emit("slice-event", "reset");
            break;
          case "构件树":
            emit("build-tree");
            break;
          case "属性表":
            emit("properties-table");
            break;
          case "重置":
            emit("light-settings-reset");
            break;
          case "生成空间":
            emit("space-generate", "generate");
            break;
          case "导出":
            emit('space-generate', 'export');
            break;
          case "开始":
            emit('animation-event', 'start');
            break;
          case "暂停":
            emit('animation-event', 'pause');
            break;
          case "停止":
            emit('animation-event', 'stop');
            break;
          case "脚本库":
            emit('animation-event', 'toolbox');
            break;
          case "清除效果":
            emit('explosion-event', 'clear');
            break;
          case "开始检查":
            emit('inspect-click', 'inspect');
            break;
        }
      }
    });
    ribbon.addEventListener('select', function (event) {
      if (event.detail) {
        console.log("选中了:", event.detail.index);
        if (event.detail.index === 4) {
          emit('animation-click', 'click');
        } else if (event.detail.index === 1) {
          emit('animation-click', 'unclick-inspect');
          emit('inspect-click', 'show');
        } else {
          emit('animation-click', 'unclick');
        }
        if (event.detail.index === 5) {
          try {

            const handleSliderX = document.getElementById("horizontalSliderX") as HTMLInputElement;
            const handleSliderY = document.getElementById("horizontalSliderY");
            const handleSliderZ = document.getElementById("horizontalSliderZ");
            const inputIndensity = document.getElementById("inputIndensity");
            const checkboxShadow = document.getElementById("checkboxShadow");
            const handleSliderSpeed = document.getElementById("horizontalSliderSpeed") as HTMLInputElement;

            const handleCheckboxFocus = document.getElementById("checkboxFocus") as HTMLInputElement;
            const light = scene.getLightByName("fillLight") as BABYLON.DirectionalLight

            handleSliderX.val(light.direction.x)
            handleSliderY.val(light.direction.y)
            handleSliderZ.val(light.direction.z)
            inputIndensity.value = light.intensity
            checkboxShadow.checked = light.shadowEnabled

            handleSliderX.addEventListener('change', function (event) {
              emit('light-settings', { lightX: event.detail.value })
            })
            handleSliderY.addEventListener('change', function (event) {
              emit('light-settings', { lightY: event.detail.value })
            })
            handleSliderZ.addEventListener('change', function (event) {
              emit('light-settings', { lightZ: event.detail.value })
            })
            inputIndensity.addEventListener('change', function (event) {
              emit('light-settings', { lightIndensity: event.detail.value })
            })
            checkboxShadow.addEventListener('change', function (event) {
              emit('light-settings', { lightShadowEnabled: event.detail.value })
            })

            handleSliderSpeed.addEventListener('change', function (event) {
              if (scene) {
                const speed = event.detail.value;
                console.log("拖动速度:", speed);
                emit('scene-settings', { dragSpeed: speed });
              }
            });

            handleCheckboxFocus.addEventListener('change', function (event) {
              if (scene) {
                const isChecked = event.detail.value;
                console.log("Focus mode:", isChecked);
                emit('scene-settings', { focusMode: isChecked });
              }
            });
          }
          catch (error) {
            console.log("error", error)
          }
          const handleColorPicker = document.getElementById("colorPicker")
          const khanonjs = document.getElementById("khanonjs") as HTMLCanvasElement;
          const bgColor = window.getComputedStyle(khanonjs).backgroundColor;
          handleColorPicker.value = bgColor;
          handleColorPicker.addEventListener('change', function (event) {
            const color = event.detail.value;
            console.log("背景颜色改变:", color);
            emit('scene-settings', { backgroundColor: color });
          })

        }
      }
    })
  }

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener("change", async function (event: Event) {
      try {
        loading.value = true;
        const files = (event.target as HTMLInputElement).files;
        if (!files || files.length === 0) {
          loading.value = false;
          return;
        }

        const file = files[0];
        try {
          await addFileHistory({
            name: file.name,
            path: file.name, // Using name as path due to browser security
            timestamp: Date.now()
          });
        } catch (error) {
          console.error("Failed to add file to history:", error);
        }

        // 清空原有场景
        if (scene) {
          restoreMaterials(scene);
          // 清除所有 mesh
          scene.meshes.slice().forEach(mesh => {
            if (mesh && mesh.dispose)
              mesh.dispose();
          });
          // 清除所有材质
          scene.materials.slice().forEach(mat => {
            if (mat && mat.dispose) mat.dispose();
          });
          // 清除所有纹理
          scene.textures.slice().forEach(tex => {
            if (tex && tex.dispose) tex.dispose();
          });
          modelStore.clearModel();
          modelStore.clearModelInspectData();
        }
        console.log("开始加载模型...");
        progress.value = {
          percent: 0,
          current: 0,
          total: files.length,
          text: "打开文件"
        };

        let arr = Array.from(Core.getActiveScenes());
        if (!arr || arr.length === 0) {
          throw new Error("没有活动的场景");
        }
        scene = arr[0].babylon.scene;
        const ifcLoader = new IfcLoader(files[0], scene);
        const ifcInspect = new IfcInspect(files[0])
        // 添加数据监听器
        const checkInterval = setInterval(() => {
          if (ifcInspect.ifcData) {
            clearInterval(checkInterval);
            const inspectData = ifcInspect.ifcData;
            console.log('inspectData loaded:', inspectData);
            // 先清空
            modelStore.clearModelInspectData();
            // 再赋新值
            modelStore.setModelInspectData(inspectData);
          }
        }, 100); // 每100ms检查一次

        // 安全超时（10秒后自动停止）
        setTimeout(() => clearInterval(checkInterval), 100000);

        const proxyLoader = new Proxy(ifcLoader, {
          set(target, prop, value) {
            const result = Reflect.set(target, prop, value);

            if (prop === "loadedCount") {
              // 创建全新对象确保响应式更新
              const newValue = {
                percent: Math.floor((value / target.totalCount) * 100),
                current: value,
                total: target.totalCount,
                text: value === 0 ? "打开文件"
                  : value === target.totalCount ? `完成`
                    : "创建图元"
              };
              progress.value = newValue;
            }
            return result;
          }
        });
        // 使用代理对象加载
        await proxyLoader.load();
        const modelData = ifcLoader.ifcTree
        // console.log("模型加载完成", ifcLoader.ifcTree);
        modelStore.setModel(files[0], modelData)
        emit('file-uploaded');
        console.log("模型加载完成");
      } catch (error) {
        console.error("加载失败:", error);
        // 可以在这里添加错误提示
      } finally {
        scene.onReadyObservable.add(async () => {
          await nextTick()
          console.log('场景已就绪', scene);
          loading.value = false;
        });
      }
    });
  }
});




</script>
