import 'reflect-metadata';
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import TDesign from 'tdesign-vue-next';
import './styles/index.less';


function loadUiNext() {
    return new Promise((resolve) => {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.dtbim.cn/ui-next/latest/theme.css?v=0.0.8'
        document.head.appendChild(link)

        const script = document.createElement('script')
        script.type = 'module'
        script.src = 'https://cdn.dtbim.cn/ui-next/latest/index.js'
        script.onload = resolve
        document.body.appendChild(script)
    })
}
loadUiNext().then(() => {
    const app = createApp(App)

    app.use(createPinia());
    app.use(TDesign);

    app.mount('#app');
})
