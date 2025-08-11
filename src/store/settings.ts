import { defineStore } from 'pinia';

export interface SettingsState {
  language: 'zh-CN' | 'en-US';
  themeColor: string;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    language: 'zh-CN',
    themeColor: '#185ABD', // 默认主题色
  }),
  actions: {
    setLanguage(lang: 'zh-CN' | 'en-US') {
      this.language = lang;
    },
    setThemeColor(color: string) {
      this.themeColor = color;
    },
  },
});