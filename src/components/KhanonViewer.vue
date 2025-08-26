<template>
</template>

<script lang="ts">
import 'reflect-metadata';
import {
    App,
    AppInterface,
    KJS,
    Logger
} from '@khanonjs/engine'

import { onMounted } from 'vue';
import { SceneMonsters } from '../utils/scene'


@App({
    name: 'ifc load example'
})
export class MyApp extends AppInterface {
    onStart() {
        console.log('App onStart')
        // 开始加载场景资源
        KJS.Scene.load(SceneMonsters)
            // 注册加载完成回调
            .onComplete.add(() => {
                // 正式启动场景
                KJS.Scene.start(SceneMonsters) // 在资源加载完成后启动场景
                
            })
    }
    onError(error?: string) {
        Logger.error('App onError:', error)
    }
}
export default {
    name: 'KhanonViewer',
    setup() {
        onMounted(() => {
            // 确保DOM已经加载
            console.log('DOM loaded');

        });


    }

};
</script>

<style scoped>
.khanon-container {
    width: 100%;
    height: 100%;
    position: relative;
}

#khanonjs {
    width: 100%;
    height: 100%;
}

#loading-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.initial-loading {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>