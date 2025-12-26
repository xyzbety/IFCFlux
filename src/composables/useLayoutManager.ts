import { ref, computed } from 'vue';

export interface LayoutState {
  showStructureTree: boolean;
  showPropertyTable: boolean;
  showInspectResult: boolean;
  structureTreeWidth: number;
  propertyTableWidth: number;
  inspectResultWidth: number;
}

// 定义布局模式枚举
export enum LayoutMode {
  VIEW = 0,        // 查看模式：构件树 + 画布 + 属性表
  INSPECT = 1,     // 检查模式：检查结果 + 画布
  CANVAS_ONLY = 5  // 画布模式：只显示画布
}

// 单例实例存储
let layoutManagerInstance: ReturnType<typeof createLayoutManager> | null = null;

// 创建布局管理器实例的内部函数
function createLayoutManager() {
  // 当前布局模式
  const currentMode = ref<LayoutMode>(LayoutMode.VIEW);

  // 独立控制各组件的显隐状态
  const structureTreeVisible = ref(true);
  const propertyTableVisible = ref(true);

  // 动态宽度状态
  const dynamicWidths = ref({
    structureTree: 300,
    propertyTable: 300,
    inspectResult: 800,
  });

  // 默认宽度配置
  const DEFAULT_WIDTHS = {
    structureTree: 300,
    propertyTable: 300,
    inspectResult: 800,
  };

  // 更新按钮选中状态的辅助函数
  const updateButtonSelectedState = (buttonLabel: string, isSelected: boolean) => {
    // 使用 setTimeout 确保 DOM 已更新
    setTimeout(() => {
      const ribbonItems = document.querySelectorAll('.smart-ribbon-item');
      ribbonItems.forEach(item => {
        if ((item as any).label === buttonLabel) {
          const smartButton = item.querySelector('smart-button');
          if (smartButton) {
            if (isSelected) {
              smartButton.classList.add("selected");
            } else {
              smartButton.classList.remove("selected");
            }
          }
        }
      });
    }, 0);
  };

  // 同步所有按钮状态
  const syncAllButtonStates = () => {
    updateButtonSelectedState("构件树", structureTreeVisible.value);
    updateButtonSelectedState("属性表", propertyTableVisible.value);
  };

  // 计算当前布局状态
  const layoutState = computed<LayoutState>(() => {
    switch (currentMode.value) {
      case LayoutMode.VIEW:
        return {
          showStructureTree: structureTreeVisible.value,
          showPropertyTable: propertyTableVisible.value,
          showInspectResult: false,
          structureTreeWidth: structureTreeVisible.value ? dynamicWidths.value.structureTree : 0,
          propertyTableWidth: propertyTableVisible.value ? dynamicWidths.value.propertyTable : 0,
          inspectResultWidth: 0,
        };

      case LayoutMode.INSPECT:
        return {
          showStructureTree: false,
          showPropertyTable: false,
          showInspectResult: true,
          structureTreeWidth: 0,
          propertyTableWidth: 0,
          inspectResultWidth: dynamicWidths.value.inspectResult,
        };

      case LayoutMode.CANVAS_ONLY:
        return {
          showStructureTree: false,
          showPropertyTable: false,
          showInspectResult: false,
          structureTreeWidth: 0,
          propertyTableWidth: 0,
          inspectResultWidth: 0,
        };

      default:
        return {
          showStructureTree: structureTreeVisible.value,
          showPropertyTable: propertyTableVisible.value,
          showInspectResult: false,
          structureTreeWidth: structureTreeVisible.value ? dynamicWidths.value.structureTree : 0,
          propertyTableWidth: propertyTableVisible.value ? dynamicWidths.value.propertyTable : 0,
          inspectResultWidth: 0,
        };
    }
  });

  // 切换布局模式
  const switchToMode = (mode: LayoutMode) => {
    console.log(`切换到布局模式: ${LayoutMode[mode]}`);
    const previousMode = currentMode.value;
    currentMode.value = mode;

    // 切换到查看模式时的处理
    if (mode === LayoutMode.VIEW) {
      // 如果从其他模式切换回查看模式，恢复默认显示状态
      if (previousMode !== LayoutMode.VIEW) {
        structureTreeVisible.value = true;
        propertyTableVisible.value = true;
      }

      // 同步按钮选中状态
      syncAllButtonStates();
    } else if (mode !== LayoutMode.CANVAS_ONLY) { // 排除CANVAS_ONLY模式
      // 切换到非查看模式时，清除构件树和属性表的选中状态
      updateButtonSelectedState("构件树", false);
      updateButtonSelectedState("属性表", false);
    }
  };

  // 切换构件树显隐
  const toggleStructureTree = () => {
    // 只在查看模式下允许切换
    if (currentMode.value === LayoutMode.VIEW) {
      structureTreeVisible.value = !structureTreeVisible.value;
      console.log(`构件树显隐切换: ${structureTreeVisible.value ? '显示' : '隐藏'}`);
      updateButtonSelectedState("构件树", structureTreeVisible.value);
    }
  };

  // 切换属性表显隐
  const togglePropertyTable = () => {
    // 只在查看模式下允许切换
    if (currentMode.value === LayoutMode.VIEW) {
      propertyTableVisible.value = !propertyTableVisible.value;
      console.log(`属性表显隐切换: ${propertyTableVisible.value ? '显示' : '隐藏'}`);
      updateButtonSelectedState("属性表", propertyTableVisible.value);
    }
  };

  // 设置构件树显示状态
  const setStructureTreeVisible = (visible: boolean) => {
    if (currentMode.value === LayoutMode.VIEW) {
      structureTreeVisible.value = visible;
      updateButtonSelectedState("构件树", visible);
    }
  };

  // 设置属性表显示状态
  const setPropertyTableVisible = (visible: boolean) => {
    if (currentMode.value === LayoutMode.VIEW) {
      propertyTableVisible.value = visible;
      updateButtonSelectedState("属性表", visible);
    }
  };

  // 动态调整宽度的方法
  const setStructureTreeWidth = (width: number) => {
    dynamicWidths.value.structureTree = Math.max(300, width);
  };

  const setPropertyTableWidth = (width: number) => {
    dynamicWidths.value.propertyTable = Math.max(300, width);
  };

  const setInspectResultWidth = (width: number) => {
    dynamicWidths.value.inspectResult = Math.max(300, width);
  };

  // 获取当前模式名称
  const getCurrentModeName = () => {
    return LayoutMode[currentMode.value];
  };

  // 检查是否为指定模式
  const isMode = (mode: LayoutMode) => {
    return currentMode.value === mode;
  };

  // 检查是否在查看模式（允许手动控制组件显隐）
  const canToggleComponents = computed(() => {
    return currentMode.value === LayoutMode.VIEW;
  });

  // 手动同步按钮状态（用于组件初始化后调用）
  const syncButtonStates = () => {
    if (currentMode.value === LayoutMode.VIEW) {
      syncAllButtonStates();
    }
  };

  // 销毁实例的方法（用于清理）
  const destroy = () => {
    console.log('布局管理器实例已销毁');
    // 这里可以添加清理逻辑
  };

  return {
    currentMode: computed(() => currentMode.value),
    layoutState,
    switchToMode,
    toggleStructureTree,
    togglePropertyTable,
    setStructureTreeVisible,
    setPropertyTableVisible,
    setStructureTreeWidth,
    setPropertyTableWidth,
    setInspectResultWidth,
    getCurrentModeName,
    isMode,
    canToggleComponents,
    syncButtonStates,
    destroy,
    LayoutMode
  };
}

// 原有的导出函数保持不变
export function useLayoutManager() {
  if (!layoutManagerInstance) {
    layoutManagerInstance = createLayoutManager();
    console.log('创建新的布局管理器单例实例');
  }
  
  return layoutManagerInstance;
}
