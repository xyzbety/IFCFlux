<template>
  <canvas ref="bjsCanvas" id="viewer-canvas"></canvas>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as BABYLON from '@babylonjs/core';
import { SceneManager } from '../services/scene-manager';
import { ModelManager } from '../services/model-manager';

const bjsCanvas = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (bjsCanvas.value) {
    const engine = new BABYLON.Engine(bjsCanvas.value, true);
    const scene = new BABYLON.Scene(engine);

    // Get singleton instances of managers
    const sceneManager = SceneManager.getInstance();
    const modelManager = ModelManager.getInstance();

    // Initialize managers with the created scene
    // This step is crucial as it sets up the camera and lights
    sceneManager.initializeScene(scene);
    modelManager.initialize(scene);

    // Now that the scene is initialized with a camera, run the render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      engine.resize();
    });
  }
});
</script>

<style scoped>
#viewer-canvas {
  width: 100%;
  height: 100%;
  outline: none;
}
</style>