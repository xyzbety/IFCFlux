<template>
  <canvas ref="bjsCanvas" id="viewer-canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as BABYLON from '@babylonjs/core';
import { SceneManager } from '../services/scene-manager';
import { ModelManager } from '../services/model-manager';
import { eventManager } from '../services/scene-event';

const bjsCanvas = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (bjsCanvas.value) {
    const engine = new BABYLON.Engine(bjsCanvas.value, true, { powerPreference: 'default' });
    engine.enableOfflineSupport = false;
    engine.doNotHandleContextLost = true;
    const scene = new BABYLON.Scene(engine, { useGeometryUniqueIdsMap: true, useMaterialMeshMap: true, useClonedMeshMap: true, });

    // 初始化场景管理器
    const sceneManager = SceneManager.getInstance();
    const modelManager = ModelManager.getInstance();
    sceneManager.initializeScene(scene);
    modelManager.initialize(scene);

    // 运行渲染循环
    engine.runRenderLoop(() => {
      scene.render();
    });

    // 处理窗口大小变化
    eventManager.add("resize", () => {
      engine.resize();
    });
  }
});


</script>

<style scoped>
#viewer-canvas {
  width: 100%;
  height: 100%;
  background-color: rgb(236, 241, 245);
  outline: none;
}
</style>