import { defineStore } from 'pinia';

import { themeColors } from '../utils/themeColors';

export interface Theme {
  name: string;
  value: string;
  hover: string;
  active: string;
}

export interface SettingsState {
  language: 'zh-CN' | 'en-US';
  theme: Theme;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    language: 'zh-CN',
    theme: themeColors[0], // 默认主题
  }),
  actions: {
    setLanguage(lang: 'zh-CN' | 'en-US') {
      this.language = lang;
    },
    setTheme(theme: Theme) {
      this.theme = theme;
    },
  },
});