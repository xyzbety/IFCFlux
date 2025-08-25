<template>
  <div id="codePanel" v-show="isVisible">
    <div id="blocklyDiv"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as Blockly from 'blockly';
import { workspace, initBlocks } from "../utils/blockly/blocks";
import { javascriptGenerator } from 'blockly/javascript';
import { animatables } from '../utils/blockly/animation.ts';
import * as animationFns from '../utils/blockly/animation.ts';
import { resetModelToInitialState } from '../utils/index.ts';

// Props
interface Props {
  isVisible: boolean;
  scene: any;
  initialCameraState: any;
  camera: any;
  originalMaterialProperties: Map<string, { alpha: number }>;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  'animation-event': [action: 'start' | 'pause' | 'stop' | 'reset' | 'toolbox'];
}>();

// 状态管理
let toolboxVisible = ref(true);
let isToggling = ref(false);

// 初始化动画函数到全局
const initAnimationFunctions = () => {
  // 批量挂载所有导出函数到 window
  Object.keys(animationFns).forEach((key: keyof typeof animationFns) => {
    // 只挂载函数
    if (typeof (animationFns as any)[key] === 'function') {
      window[key] = (animationFns as any)[key];
    }
  });
  window.isAnimationStopped = false;
};

// 将必要的变量暴露到全局环境
const exposeGlobalVariables = () => {
  // 暴露 scene 和其他必要变量到全局
  window.scene = props.scene;
  window.camera = props.camera;
  window.initialCameraState = props.initialCameraState;
  window.originalMaterialProperties = props.originalMaterialProperties;
};

// 动画控制方法
const handleAnimationEvent = async (action: 'start' | 'pause' | 'stop' | 'reset' | 'toolbox') => {
  if (action === 'toolbox') {
    // 防抖处理
    if (isToggling.value) return;
    isToggling.value = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const blocklyToolbox = document.getElementsByClassName("blocklyToolbox")[0];

      if (blocklyToolbox) {
        (blocklyToolbox as HTMLElement).style.display = toolboxVisible.value ? 'none' : 'block';
        toolboxVisible.value = !toolboxVisible.value;
      }
    } finally {
      // 延迟重置，防止快速点击
      setTimeout(() => { isToggling.value = false; }, 300);
      return;
    }
  }

  if (action === 'pause') {
    animatables.forEach(anim => anim.pause());
    return;
  }

  if (action === 'stop') {
    window.isAnimationStopped = true; // 标记停止
    animatables.forEach(anim => anim.stop());
    animatables.length = 0;
    // 重置模型到初始状态
    resetModelToInitialState(
      props.scene, 
      props.initialCameraState, 
      props.camera, 
      props.originalMaterialProperties
    );
    return;
  }

  if (action === 'reset') {
    // 可选：重置模型状态
    return;
  }

  // start
  // 检查是否有暂停的动画，有则恢复，无则重新生成代码
  let hasPaused = false;
  animatables.forEach(anim => {
    if (anim.paused) {
      anim.restart();
      hasPaused = true;
    }
  });
  if (hasPaused) return; // 有暂停动画则只恢复，不重新生成代码

  // 没有暂停动画，才重新生成和执行
  animatables.forEach(anim => anim.stop());
  animatables.length = 0;
  window.isAnimationStopped = false; // 重置标志
  
  // 重置模型到初始状态
  resetModelToInitialState(
    props.scene, 
    props.initialCameraState, 
    props.camera, 
    props.originalMaterialProperties
  );
  
  // 等待一帧确保重置完成
  await new Promise(resolve => requestAnimationFrame(resolve));

  // 确保全局变量是最新的
  exposeGlobalVariables();

  javascriptGenerator.addReservedWords('code');
  var code = javascriptGenerator.workspaceToCode(workspace);
  
  // 在每个 await 前自动插入停止检查
  const enhancedCode = code.replace(
    /(\s*)(await\s+)/g,
    '$1if(window.isAnimationStopped) return;\n$1$2'
  );

  console.log("生成的代码", code);
  console.log("增强后的代码", enhancedCode);
  
  try {
    eval(`(async () => { ${enhancedCode} })()`);
  } catch (error) {
    console.error('动画代码执行错误:', error);
  }
};

// 初始化 Blockly
const initializeBlockly = () => {
  if (!props.scene) {
    console.warn('Scene not available for Blockly initialization');
    return;
  }

  if (!workspace || (workspace as any).getAllBlocks().length === 0) {
    initBlocks(props.scene);
  }
  
  // 确保全局变量暴露
  exposeGlobalVariables();
  
  setTimeout(() => {
    if (workspace) {
      (workspace as any).getToolbox()?.refreshSelection();
      Blockly.svgResize(workspace as any);
    }
  }, 100);
};

// 重置动画状态
const resetAnimationState = () => {
  // 重置动画状态
  animatables.forEach(anim => anim.stop());
  animatables.length = 0;
  window.isAnimationStopped = false;
  
  toolboxVisible.value = true;
  isToggling.value = false;
  
  if (workspace) {
    workspace.clear();
  }
  
  // 清理全局变量
  if (window.scene) delete window.scene;
  if (window.camera) delete window.camera;
  if (window.initialCameraState) delete window.initialCameraState;
  if (window.originalMaterialProperties) delete window.originalMaterialProperties;
};

// 监听 props 变化，更新全局变量
watch(() => [props.scene, props.camera, props.initialCameraState, props.originalMaterialProperties], () => {
  if (props.scene) {
    exposeGlobalVariables();
  }
}, { deep: true });

// 监听可见性变化
watch(() => props.isVisible, (newVisible) => {
  if (newVisible && props.scene) {
    nextTick(() => {
      initializeBlockly();
    });
  }
});

// 暴露方法给父组件
defineExpose({
  handleAnimationEvent,
  resetAnimationState,
  initializeBlockly
});

onMounted(() => {
  initAnimationFunctions();
  if (props.isVisible && props.scene) {
    initializeBlockly();
  }
});

onUnmounted(() => {
  resetAnimationState();
});
</script>

<style scoped>
#codePanel {
  flex: 0 1 0;
  height: 100%;
  box-sizing: border-box;
}

#blocklyDiv {
  width: 100%;
  height: 100%;
}

:deep(.blocklyMainBackground) {
  stroke-width: 0;
}
</style>