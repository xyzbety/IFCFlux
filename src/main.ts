import 'reflect-metadata';
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import TDesign from 'tdesign-vue-next';

import 'tdesign-vue-next/es/style/index.css';
import './style/index.less'
const app = createApp(App)

app.use(createPinia());
app.use(TDesign);

app.mount('#app');
