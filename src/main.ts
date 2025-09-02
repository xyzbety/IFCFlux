import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import TDesign from 'tdesign-vue-next';
import './styles/index.less';
import { MCube } from './utils/plugin/viewer/cube/cube';
import { provideFASTDesignSystem } from "@microsoft/fast-components";

provideFASTDesignSystem().withPrefix('m').register(MCube);


const app = createApp(App)

app.use(createPinia());
app.use(TDesign);
app.mount('#app');
