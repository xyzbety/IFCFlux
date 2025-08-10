<template>
  <smart-ribbon id="ribbon"></smart-ribbon>
  <input id="fileInput" type="file" style="display: none;" />
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
  'light-settings', 'light-settings-reset', 'scene-settings', 'animation-event', 'animation-click'
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
    ribbon.addEventListener('fileMenuItemClick', async function (event) {
      const dropDown = document.querySelector('smart-drop-down-button');

      const detail = event.detail
      const item = detail.item;

      if (item.label === '打开') {
        fileInput.click();
      }
      dropDown.opened = false
    })
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
        const files = event.target.files;
        if (!files || files.length === 0) {
          loading.value = false;
          return;
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
<style>
@font-face {
  font-family: 'SarasaUiSC';
  /* 所有字重都使用相同的字体家族名称 */
  src: url('/fonts/SarasaUiSC-Regular.woff2') format('woff2');
  /* 请确保路径正确 */
  font-weight: normal;
  /* 或 400 */
  font-style: normal;
  font-display: swap;
  /* 优化字体加载体验 */
}

@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('/fonts/SarasaUiSC-Regular.woff2') format('woff2');
}

.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: inherit;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}

.material-icons::after {
  font-size: 20px;
}

/* 页面加载的loading样式 */
.loader-container {
  width: 100%;
  height: calc(100% - 130px);
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  top: 130px;
  left: 0;
  background: rgba(255, 255, 255, 0.5);
  z-index: 999;
  text-align: center;
}

.label {
  margin-top: 5px;
  display: inline-block;
  font-size: 12.5px;
  width: 356px;
  text-align: left;
}

/* 进度条样式 */
:root {
  --smart-border-radius: 0px;
  --smart-font-family: 'SarasaUiSC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans CJK SC', 'WenQuanYi Zen Hei', sans-serif !important;
}

smart-progress-bar>.smart-container {
  border-color: rgb(227, 222, 222);
}

smart-progress-bar {
  height: 16px;
  width: 360px;
}

smart-progress-bar .smart-value {
  background: rgb(105, 137, 218);
}

smart-progress-bar .smart-label {
  color: var(--td-text-color-secondary);
  font-size: 13px;
}


#watermark {
  /* 隐藏水印 */
  display: none !important;
}

/* 灯光控制滑块样式 */
.smart-slider .smart-thumb:before {
  background-color: transparent;
}

smart-slider {
  position: relative;
  padding-left: 15px;
  margin-right: 10px;
  width: 120px;
}

smart-slider span {
  position: absolute;
  top: -10px;
  left: 0;
}

.smart-tooltip .smart-tooltip-content {
  overflow: visible;
}

.smart-slider .smart-thumb {
  width: 10px;
  height: 10px;
  margin-top: -5px;
}

.smart-ribbon-group-item-control {
  height: 25px;
}

/* 光照强度控制输入框样式 */
#inputIndensity {
  width: 55px;
}

smart-number-input {
  position: relative;
  margin-left: 60px;
  width: 60%;
}

.smart-input[drop-down-button-position=right] .smart-input {
  width: 40px;
}

.smart-number-input .nav {
  width: 15px;
}

smart-number-input,
smart-number-input.smart-element,
.smart-toggle-box.smart-element {
  margin-top: 0;
}

smart-number-input span {
  position: absolute;
  top: 0;
  left: -60px;
  margin-top: 5px;
}

/* 阴影开关复选框样式 */
#checkboxShadow {
  width: 120px;
}

smart-check-box {
  position: relative;
  padding-left: 75px;
  margin-top: 0px;
}

smart-check-box span {
  position: absolute;
  top: 5px;
  left: 0px;
}

smart-check-box .smart-container {
  height: 25px;
  width: 35px;
}

/* 阴影大小输入框样式 */
smart-input,
smart-input.smart-element {
  width: 150px;
  height: 20px;
  margin-top: 20px;
  margin-left: 25px;
}

.smart-toggle-box .smart-overlay {
  background-color: transparent;
}

/* 拖动速度滑块样式 */
#horizontalSliderSpeed {
  margin-left: 65px;
  position: relative;
}

#horizontalSliderSpeed span {
  position: absolute;
  top: -10px;
  left: -60px
}

#checkboxFocus {
  margin-top: -8px !important;
  margin-left: -20px;
  position: relative;
}

#checkboxFocus .smart-input {
  margin-left: -60px;
}

#checkboxFocus .smart-ribbon-group-item-label {
  position: absolute;
  top: 5px;
  left: 40px;
}

smart-color-picker {
  width: 65px;
  height: 25px !important;
  margin-top: -3px !important;
  margin-left: -5px;
}

.smart-color-picker .smart-color-box {
  width: 18px;
  height: 18px;
}

/* ribbon组件header整体样式 */
#ribbon .smart-ribbon-header {
  --smart-surface: #185abd;
  --smart-primary-rgb: rgb(255, 255, 255);
  --smart-primary: white;
  --smart-surface-color: white;
  --smart-ui-state-active: #185abd;
  --smart-ui-state-color-active: var(--smart-primary);
  --smart-ui-state-selected: var(--smart-primary);
  --smart-ui-state-border-active: var(--smart-surface);
  --smart-ui-state-color-selected: var(--smart-surface);
  --smart-ui-state-hover: #185abd;
  --smart-ui-state-color-hover: var(--smart-primary);
  --smart-border-width: 0px;

}

/* header,文件下拉框样式 */
.smart-ribbon .smart-ribbon-header,
.smart-ribbon-file-container .smart-drop-down-button {
  height: 25px;
  border: none;
}

.smart-ribbon-file-container smart-drop-down-button {
  min-width: 60px
}

.smart-ribbon-header-tabs .smart-ribbon-header-tab {
  max-width: 60px;
}

.smart-drop-down {
  --smart-ribbon-border-color: #e7eaed;
}

.smart-drop-down-box .smart-action-button {
  display: flex;
  align-items: center;
  /* 垂直居中 */
  justify-content: center;
  /* 水平居中 */
  height: 100%;
  /* 占满父容器高度 */
  font-size: 15px;
}

/* ribbon中间每个tab样式（主操作栏） */
.smart-ribbon-tabs .smart-ribbon-tab {
  height: 105px;
}

smart-ribbon-tab smart-ribbon-group[root] {
  padding-top: 0;
}

smart-ribbon-group[root]>.smart-ribbon-group-items {
  padding-top: 5px;
}

/* 隐藏ribbon折叠按钮 */
.smart-ribbon-group-dialog-launcher-icon,
.smart-ribbon-tab-collapse-button,
.smart-ribbon-tab-side-container .smart-ribbon-tab-collapse-icon {
  display: none !important;
}

/* ribbpn顶部菜单栏文字样式 */
.smart-ribbon-header .smart-ribbon-header-tabs .smart-ribbon-header-tab {
  font-size: 15px;
}

/* ribbon主操作栏文字样式 */
.smart-ribbon-group-item-label {
  padding: 0 2px;
  font-size: 11.5px;
  letter-spacing: 0px;
}

/* ribbon主操作栏每个item组样式 */
smart-ribbon-tab smart-ribbon-group[root] {
  padding-top: 5px;
}

smart-ribbon-group[root]>.smart-ribbon-group-items {
  padding-left: 3px;
  padding-right: 3px;
}

/* ribbon底部分类文字样式 */
.smart-ribbon-tab-groups .smart-ribbon-group .smart-ribbon-group-header-label {
  padding: 0;
  padding-top: 0;
  font-size: 12px;
}

.smart-drop-down-box {
  background-color: transparent;
}

.smart-drop-down-box:focus {
  background-color: transparent;
}

.smart-drop-down-box:not([drop-down-open-mode=dropDownButton]) .smart-action-button,
.smart-drop-down-box .smart-drop-down-button {
  background-color: transparent;
}

.smart-drop-down-box[opened]>.smart-container>.smart-content>.smart-buttons-container:not([drop-down-open-mode=dropDownButton]):not(.outlined):not(.underlined) .smart-action-button,
.smart-drop-down-box[opened]>.smart-container>.smart-content>.smart-buttons-container:not(.outlined):not(.underlined) .smart-drop-down-button {
  background-color: #ebebeb;
  color: black;
}

.smart-ribbon-group-drop-down[role=dialog] .smart-ribbon-group-drop-down-element {
  border-radius: 6px;
  border: 1px solid black;
}


/* 按钮 */
button.smart-button {
  padding: 0 0px;
  text-transform: none;
  min-width: 50px;
  max-width: 60px;
  border-radius: 4px;
}

smart-drop-down-button.smart-ribbon-group-drop-down[drop-down-button-position=bottom],
.smart-ribbon-group-drop-down-container {
  height: 77px;
  margin-top: 5px;
}

.smart-button:focus,
.smart-button:focus-visible {
  background-color: transparent !important;
}

.smart-button:active {
  background-color: #e0e0e0 !important;
  color: #5a5a5a !important;
}

smart-button span {
  transition: none !important;
}

smart-button.selected {
  background-color: #f5f5f5 !important;
}


.smart-button:hover,
.smart-button:hover-visible {
  background-color: #f5f5f5 !important;
}

/* Ribbon分组和下拉按钮去除边框 */
.smart-drop-down-button,
.smart-action-button {
  border: none !important;
  box-shadow: none !important;
}

smart-button.flat[focus],
.smart-drop-down-box {
  border-color: transparent;
}

smart-drop-down-button.smart-ribbon-group-drop-down .smart-buttons-container>.smart-action-button {
  padding-top: 15px;
  height: 80%;
}

smart-drop-down-button.smart-ribbon-group-drop-down .smart-buttons-container>.smart-drop-down-button {
  height: 20%;
}

/* 所有size为normal的按钮样式 */
.normal {
  margin-top: 0px;
}

.tree {
  margin-right: 2px;
}

/* 所有size为verySmall的按钮样式  */
.smart-button-element.very-small button,
smart-button.very-small button,
smart-repeat-button.very-small button,
smart-toggle-button.very-small button {
  padding: 0 5px;
  height: 20px;
  font-size: 0;
}

.smart-button.very-small.hide {
  width: 85px;
}

/* ribbon主操作栏按钮图标与按钮文字中间div样式 */
.smart-ribbon-group-drop-down .smart-ribbon-group-item-flex-break,
smart-ribbon-item[size=normal] .smart-ribbon-group-item-flex-break,
smart-ribbon-item[size=large] .smart-ribbon-group-item-flex-break {
  height: 0px;
}

smart-ribbon-group[grouped] smart-drop-down-button {
  min-width: 60px;
  max-width: 60px;
}

.select:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/选择.svg);
  background-size: cover;
  background-position: center;
}

.pan_tool:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/平移.svg);
  background-size: cover;
  background-position: center;
}

.rotate:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/旋转.svg);
  background-size: cover;
  background-position: center;
}

.rotate_left:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/向左旋转.svg);
  background-size: cover;
  background-position: center;
}

.rotate_right:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/向右旋转.svg);
  background-size: cover;
  background-position: center;
}

.zoom_out_map:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/放大.svg);
  background-size: cover;
  background-position: center;
}

.zoom_in_map:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/缩小.svg);
  background-size: cover;
  background-position: center;
}

.view:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/视图.svg);
  background-size: cover;
  background-position: center;
}

.default_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/默认视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(2.0);
}

.top_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/顶视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.front_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/前视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.left_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/左视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.bottom_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/底视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.back_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/后视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.right_view:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/右视图.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.hide_selected:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/隐藏选中.svg);
  background-size: cover;
  background-position: center;
}

.isolate-selected:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/隔离选中.svg);
  background-size: cover;
  background-position: center;
}

.transprent_other:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/半透明选中.svg);
  background-size: cover;
  background-position: center;
}

.visible:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/可见性.svg);
  background-size: cover;
  background-position: center;
}

.show_all:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/显示全部.svg);
  background-size: cover;
  background-position: center;
}

.measure:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/测量.svg);
  background-size: cover;
  background-position: center;
}

.measure_distance:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/距离.svg);
  background-size: cover;
  background-position: center;
}

.measure_angle:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/角度.svg);
  background-size: cover;
  background-position: center;
}

.measure_area:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/面积.svg);
  background-size: cover;
  background-position: center;
}

.measure_coordinate:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/坐标.svg);
  background-size: cover;
  background-position: center;
}

.measure_clear:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/清除测量.svg);
  background-size: cover;
  background-position: center;
}


.x_axis:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/yz剖面.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.y_axis:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/xz剖面.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.z_axis:after {
  width: 15px;
  height: 15px;
  content: "";
  display: block;
  background-image: url(/icons/xy剖面.svg);
  background-size: cover;
  background-position: center;
  transform: scale(1.15);
}

.slice_display:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/剖面显隐.svg);
  background-size: cover;
  background-position: center;
}

.slice_reset:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/结束剖切.svg);
  background-size: cover;
  background-position: center;
}

.slice:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/剖切.svg);
  background-size: cover;
  background-position: center;
}

.object:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/对象.svg);
  background-size: cover;
  background-position: center;
}

.build_tree:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/结构.svg);
  background-size: cover;
  background-position: center;
}

.properties_table:after {
  width: 32px;
  height: 32px;
  content: "";
  display: block;
  background-image: url(/icons/属性.svg);
  background-size: cover;
  background-position: center;
}
</style>