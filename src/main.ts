import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import TDesign from 'tdesign-vue-next';
import './styles/index.less';

const app = createApp(App)

app.use(createPinia());
app.use(TDesign);
app.mount('#app');
