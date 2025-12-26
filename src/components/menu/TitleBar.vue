<template>
    <div class="container-title" data-tauri-drag-region>
        <div class="title-left">
            <img src="/logo.png" alt="logo" style="padding: 0 5px;margin-left: 0px;" />
            <span>IFCFlux</span>
            <img src="/icons/打开文件.svg" class="icon" @click="handleOpenFile" />
            <img src="/icons/撤销.svg" class="icon" @click="handleReplay" />
            <img src="/icons/重做.svg" class="icon" @click="handleRedo" />
        </div>
        <div class="title-right">
            <img src="/icons/最小化.svg" class="icon" @click="minimize" />
            <img src="/icons/还原.svg" class="icon" v-if="isMaximized" @click="maximize" />
            <img src="/icons/最大化.svg" class="icon" v-if="!isMaximized" @click="maximize" />
            <img src="/icons/关闭.svg" class="icon" @click="close" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettingsStore } from '../../store/settings';

const isTauriEnv = isTauri();
const settingsStore = useSettingsStore();

const props = defineProps<{
    isMaximized: boolean
}>();

const emit = defineEmits<{
    (e: 'open-file'): void
    (e: 'replay'): void
    (e: 'redo'): void
}>();


// 最大化窗口
const maximize = async () => {
  if (isTauriEnv) {
    const maximized = await getCurrentWindow().isMaximized();
    if (maximized) {
      await getCurrentWindow().unmaximize();
    } else {
      await getCurrentWindow().maximize();
    }
  } else {
    console.log("Maximize action is only available in Tauri environment.");
  }
};

// 最小化窗口
const minimize = async () => {
  if (isTauriEnv) {
    await getCurrentWindow().minimize();
  } else {
    console.log("Minimize action is only available in Tauri environment.");
  }
};

// 关闭窗口
const close = async () => {
  if (isTauriEnv) {
    await getCurrentWindow().close();
  } else {
    console.log("Close action is only available in Tauri environment.");
  }
};


const handleOpenFile = () => {
    emit('open-file');
};

const handleReplay = () => {
    emit('replay');
};

const handleRedo = () => {
    emit('redo');
};
</script>

<style>
.container-title {
    height: 40px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--theme-color);
    color: white;
    position: relative;
    z-index: 1000;
}

.title-left,
.title-right {
    display: flex;
    align-items: center;
}

.title-left span {
    font-weight: bold;
    user-select: none;
}

.icon {
    width: 16px;
    height: 16px;
    cursor: pointer;
    user-select: none;
}

.icon:hover {
    background-color: var(--theme-hover-color);
}

.title-right .icon:last-child:hover {
    background-color: #ff5555;
}
</style>