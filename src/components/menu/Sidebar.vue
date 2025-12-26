<template>
  <div v-if="visible" class="sidebar-overlay" @click.self="close">
    <div class="sidebar-container">
      <TLayout style="height: 100%">
        <TAside style="width: 220px; background-color: #f0f0f0; border-right: 1px solid #e0e0e0;">
          <TMenu v-model="activeMenu" style="height: 100%; background-color: #f0f0f0;" theme="light">
            <TMenuItem value="open">
              <template #icon>
                <TIconFolderOpen />
              </template>
              打开
            </TMenuItem>
            <TMenuItem value="language">
              <template #icon>
                <TIconLanguage />
              </template>
              语言
            </TMenuItem>
            <TMenuItem value="theme">
              <template #icon>
                <TIconPalette />
              </template>
              配色方案
            </TMenuItem>
            <TMenuItem value="about">
              <template #icon>
                <TIconHelpCircle />
              </template>
              关于
            </TMenuItem>
          </TMenu>
        </TAside>
        <TContent style="padding: 40px; background-color: #ffffff; overflow-y: auto;">
          <!-- Open Panel -->
          <div v-if="activeMenu === 'open'">
            <h4 class="t-typography__title">打开</h4>
            <div style="margin-top: 24px; display: flex; gap: 16px; margin-bottom: 32px;">
              <div style="text-align: center;">
                <p style="margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #2c2c2c;">打开文件</p>
                <TTooltip content="打开IFC文件">
                  <TButton shape="square" variant="outline" @click="handleOpenFileClick"
                    style="width: 96px; height: 96px; display: flex; justify-content: center; align-items: center;">
                    <img src="/icons/ifc.svg" alt="打开IFC文件" style="width: 64px; height: 64px;" />
                  </TButton>
                </TTooltip>
              </div>
              <!-- Reserved for more file types -->
            </div>
            <h5 class="t-typography__title" style="margin-top: 32px; margin-bottom: 16px;">最近打开的文件</h5>
            <TList :split="true" v-if="fileHistory.length > 0">
              <TListItem v-for="item in fileHistory" :key="item.id">
                <TListItemMeta :title="item.name" :description="`打开于: ${formatTimestamp(item.timestamp)}`"
                  @click="handleFileClick(item)" style="cursor: pointer;">
                  <template #image>
                    <div
                      style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; margin-right: 12px;">
                      <img :src="getFileIcon(item.name)" style="width: 45px; height: 45px;" />
                    </div>
                  </template>
                </TListItemMeta>
              </TListItem>
            </TList>
            <div v-else class="empty-history">
              <p>暂无最近打开的文件</p>
            </div>
          </div>
          <!-- Language Panel -->
          <div v-if="activeMenu === 'language'">
            <h4 class="t-typography__title">语言 (Language)</h4>
            <div class="setting-cards-container">
              <div class="setting-card" :class="{ active: settingsStore.language === 'zh-CN' }"
                @click="handleLanguageChange('zh-CN')">
                <div class="card-content">
                  <TIconLanguage class="card-icon" />
                  <div class="card-text">
                    <p class="title">简体中文</p>
                    <p class="description">界面语言将设置为简体中文</p>
                  </div>
                </div>
              </div>
              <div class="setting-card" :class="{ active: settingsStore.language === 'en-US' }"
                @click="handleLanguageChange('en-US')">
                <div class="card-content">
                  <TIconLanguage class="card-icon" />
                  <div class="card-text">
                    <p class="title">English</p>
                    <p class="description">The interface language will be set to English</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Theme Panel -->
          <div v-if="activeMenu === 'theme'">
            <h4 class="t-typography__title">配色方案</h4>
            <div class="setting-cards-container">
              <div v-for="color in themeColors" :key="color.value" class="setting-card theme-card"
                :class="{ active: settingsStore.theme.value === color.value }" @click="handleThemeChange(color)">
                <div class="card-content">
                  <div class="color-swatch-large" :style="{ backgroundColor: color.value }"></div>
                  <div class="card-text">
                    <p class="title">{{ color.name }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- About Panel -->
          <div v-if="activeMenu === 'about'">
            <h4 class="t-typography__title">关于</h4>
            <div
              style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 40px;">
              <TImage src="/logo.png" style="width: 48px; height: 48px; margin-bottom: 20px;" />
              <p style="font-weight: bold;">国家数字建造技术创新中心</p>
              <p>版权所有</p>
              <p style="color: #8b8b8b; font-size: 12px; margin-top: 8px;">版本 1.0.0</p>
            </div>
          </div>
        </TContent>
      </TLayout>
    </div>
  </div>
  <ProgressBar :loading="loading" :progress="progress" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Theme } from '../../store/settings';
import { ModelManager } from '../../services/model-manager';
import { useSettingsStore } from '../../store/settings';
import { useModelStore } from "../../store/index.ts";
import { getFileHistory } from '../../services/file-history';
import { RibbonEventManager } from "../../composables/useRibbonEvent.ts";
import { themeColors } from '../../utils/themeColors';
import ProgressBar from "../ProgressBar.vue";
import {
  Layout as TLayout,
  Aside as TAside,
  Content as TContent,
  Menu as TMenu,
  MenuItem as TMenuItem,
  List as TList,
  ListItem as TListItem,
  ListItemMeta as TListItemMeta,
  Button as TButton,
  Image as TImage,
  Tooltip as TTooltip,
} from 'tdesign-vue-next';
import {
  FolderOpenIcon as TIconFolderOpen,
  TranslateIcon as TIconLanguage,
  PaletteIcon as TIconPalette,
  HelpCircleIcon as TIconHelpCircle,
} from 'tdesign-icons-vue-next';


const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:visible', 'request-open-file', 'file-uploaded']);
const activeMenu = ref('open');
const settingsStore = useSettingsStore();
const modelStore = useModelStore();
const fileHistory = ref<any[]>([]);
const modelManager = ModelManager.getInstance();;
const loading = modelManager.isLoading;
const progress = modelManager.loadProgress;
let eventManager = RibbonEventManager.getInstance();
eventManager.initialize({ modelStore, emit });



watch(() => props.visible, async (newValue) => {
  if (newValue) {
    // Reset to open panel every time it opens
    activeMenu.value = 'open';
    try {
      const history = await getFileHistory();
      fileHistory.value = history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
    } catch (error) {
      console.error("Failed to get file history:", error);
      fileHistory.value = [];
    }
  }
});

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};

const getFileIcon = (fileName: string) => {
  const lowerCaseName = fileName.toLowerCase();
  if (lowerCaseName.endsWith('.ifc') || lowerCaseName.endsWith('.ifcxml') || lowerCaseName.endsWith('.ifczip')) {
    return '/icons/file-ifc.svg';
  }
  // Fallback for other file types, assuming a default icon exists
  return '/icons/file-default.svg';
};


const close = () => {
  emit('update:visible', false);
};

const handleOpenFileClick = () => {
  emit('request-open-file');
  close();
};

const handleLanguageChange = (value: any) => {
  settingsStore.setLanguage(value);
  close();
};

const handleThemeChange = (theme: Theme) => {
  settingsStore.setTheme(theme);
  close();
};
const handleFileClick = (item: any) => {
  close();
  emit('file-uploaded', item.file);
};
</script>
