import { debounce } from "../utils/index";
export interface RibbonEventsOptions {
    modelStore: any;
    emit: any;
}

export class RibbonEventManager {
    private static instance: RibbonEventManager | null = null;

    private options: RibbonEventsOptions | null = null;
    private eventMap: Map<string, { type: string; param: string | number }> = new Map();
    private singleEvents: Map<string, () => void> = new Map();
    private settingsEventHandlers = new Map<string, (event: any) => void>();

    private constructor() {
        // 私有构造函数，防止外部实例化
        this.initializeEventMap();
    }

    // 获取单例实例
    public static getInstance(): RibbonEventManager {
        if (!RibbonEventManager.instance) {
            RibbonEventManager.instance = new RibbonEventManager();
        }
        return RibbonEventManager.instance;
    }

    // 重置单例（如果需要）
    public static resetInstance(): void {
        if (RibbonEventManager.instance) {
            RibbonEventManager.instance.cleanupSettingsEvents();
        }
        RibbonEventManager.instance = null;
    }

    // 初始化配置（替代原来的构造函数参数）
    public initialize(options: RibbonEventsOptions): void {
        this.options = options;
        this.initializeSingleEvents();
    }

    private initializeEventMap() {
        const eventDefinitions = [
            // 导航事件
            {
                labels: ["平移", "旋转", "放大", "缩小", "向右旋转", "向左旋转"],
                type: "navigate-event",
                params: ["pan", "rotate", "zoomIn", "zoomOut", "rotateRight", "rotateLeft"]
            },

            // 视图事件  
            {
                labels: ["默认视图", "顶视图", "底视图", "前视图", "后视图", "左视图", "右视图"],
                type: "change-view",
                params: ["default", "top", "bottom", "front", "back", "left", "right"]
            },

            // 可见性事件
            {
                labels: ["隐藏选中", "隔离选中", "半透明选中", "显示全部"],
                type: "visible-control",
                params: ["hideSelected", "isolateSelected", "transparentSelected", "showAll"]
            },

            // 测量事件
            {
                labels: ["距离", "面积", "角度", "坐标", "清除测量"],
                type: "measure-event",
                params: ["distance", "area", "angle", "coordinate", "clear"]
            },

            // 剖切事件
            {
                labels: ["剖面显隐", "沿x轴", "沿y轴", "沿z轴", "剖切还原"],
                type: "slice-event",
                params: ["visible", "x", "y", "z", "reset"]
            },

            // 检查事件
            {
                labels: ["基础数据", "规划报建", "施工图审查", "智慧工地监管", "竣工验收"],
                type: "inspect-click",
                params: [1, 2, 3, 4, 5]
            },

            // 数据导出事件
            {
                labels: ["导出GLB", "导出DB", "导出JSON"],
                type: "export-settings",
                params: ['glb', 'db', 'json']
            },
        ];

        eventDefinitions.forEach(({ labels, type, params }) => {
            labels.forEach((label, index) => {
                this.eventMap.set(label, { type, param: params[index] });
            });
        });
    }

    private initializeSingleEvents() {
        if (!this.options) {
            console.warn("Options not initialized. Call initialize() first.");
            return;
        }

        this.singleEvents.clear(); // 清空之前的事件
        this.singleEvents.set("构件树", debounce(() => this.options!.emit("build-tree")));
        this.singleEvents.set("属性表", debounce(() => this.options!.emit("properties-table")));
        this.singleEvents.set("重置光照", debounce(() => this.options?.emit('light-settings', { type: 'reset' })));
        this.singleEvents.set("爆炸还原", debounce(() => this.options?.emit('explosion-event', { type: 'explosion-clear' })));
    }
    /**
     * 处理按钮点击
     * @param label - 按钮标签
     * @returns 是否成功处理
     */
    public handleClick(label: string): boolean {
        if (!this.options) {
            console.warn("RibbonEventManager not initialized. Call initialize() first.");
            return false;
        }

        // 检查单独事件
        const singleEvent = this.singleEvents.get(label);
        if (singleEvent) {
            singleEvent();
            return true;
        }

        // 检查映射事件
        const eventInfo = this.eventMap.get(label);
        if (eventInfo) {
            debounce(() => this.options?.emit(eventInfo.type, eventInfo.param))();
            return true;
        }

        console.warn(`未找到按钮映射: ${label}`);
        return false;
    }

    /**
     * 添加新的按钮映射
     * @param label - 按钮标签
     * @param eventType - 事件类型
     * @param eventParam - 事件参数
     */
    public addButtonMapping(label: string, eventType: string, eventParam?: string | number) {
        if (!this.options) {
            console.warn("RibbonEventManager not initialized. Call initialize() first.");
            return;
        }

        if (eventParam !== undefined) {
            this.eventMap.set(label, { type: eventType, param: eventParam });
        } else {
            this.singleEvents.set(label, () => this.options!.emit(eventType));
        }
    }

    /**
     * 移除按钮映射
     * @param label - 按钮标签
     */
    public removeButtonMapping(label: string) {
        this.eventMap.delete(label);
        this.singleEvents.delete(label);
    }

    public bindRibbonEvents() {
        const ribbon = document.getElementById('ribbon');
        if (ribbon) {
            // 移除之前的监听器（如果存在）
            ribbon.removeEventListener('click', this.handleRibbonClick);
            ribbon.removeEventListener('select', this.handleRibbonSelect);

            // 添加新的监听器
            ribbon.addEventListener('click', this.handleRibbonClick);
            ribbon.addEventListener('select', this.handleRibbonSelect);
        }

        console.log("绑定成功");
    }

    private handleRibbonClick = (event: Event) => {
        const fileButtonContainer = (event.target as Element).closest('.smart-ribbon-file-container');
        const fileMenuDropdown = document.querySelector('.smart-drop-down') as HTMLElement | null;

        if (fileButtonContainer && fileMenuDropdown) {
            event.preventDefault();
            event.stopPropagation();
            this.options?.emit('toggle-file-menu');
            fileMenuDropdown.style.display = 'none'
            return;
        }

        const button = event.target && (event.target as Element).closest ?
            (event.target as Element).closest('smart-button') : null;
        if (button) {
            const parentLabel = (button.parentNode && (button.parentNode as HTMLElement).getAttribute?.('label')) || '';
            console.log("按钮被点击:", parentLabel);
            const handled = this.handleClick(parentLabel);
            if (handled) {
                event.stopPropagation();
            }
        }
    }

    private handleRibbonSelect = (event: any) => {
        if (event.detail && this.options) {
            console.log("选中了:", event.detail.index);
            this.options.emit('ribbon-tab-change', event.detail.index);
            if (event.detail.index === 3) {
                this.handleSettingsTabSelect();
            } else if (event.detail.index === 0) {
                this.createEventHandler("horizontalSliderExplosionX", (event: any) => {
                    this.options?.emit('explosion-event', { type: 'explosion-x', value: event.detail.value });
                });

                this.createEventHandler("horizontalSliderExplosionY", (event: any) => {
                    this.options?.emit('explosion-event', { type: 'explosion-y', value: event.detail.value });
                });

                this.createEventHandler("horizontalSliderExplosionZ", (event: any) => {
                    this.options?.emit('explosion-event', { type: 'explosion-z', value: event.detail.value });
                });
            }
        }
    }

    private cleanupSettingsEvents() {
        this.settingsEventHandlers.forEach((handler, elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.removeEventListener('change', handler);
            }
        });
        this.settingsEventHandlers.clear();
    }

    private createEventHandler(elementId: string, callback: (event: any) => void) {
        const element = document.getElementById(elementId);
        if (element) {
            // 移除之前的监听器（如果存在）
            const existingHandler = this.settingsEventHandlers.get(elementId);
            if (existingHandler) {
                element.removeEventListener('change', existingHandler);
            }

            // 添加新的监听器
            element.addEventListener('change', callback);
            this.settingsEventHandlers.set(elementId, callback);
        }
    }

    private handleSettingsTabSelect() {
        try {
            if (!this.options) return;

            // 清理之前的事件监听器
            this.cleanupSettingsEvents();

            // 绑定光照设置 X 轴滑块
            this.createEventHandler("horizontalSliderX", (event: any) => {
                this.options?.emit('light-settings', { type: 'direction-x', value: event.detail.value });
            });

            // 绑定光照设置 Y 轴滑块
            this.createEventHandler("horizontalSliderY", (event: any) => {
                this.options?.emit('light-settings', { type: 'direction-y', value: event.detail.value });
            });

            // 绑定光照设置 Z 轴滑块
            this.createEventHandler("horizontalSliderZ", (event: any) => {
                this.options?.emit('light-settings', { type: 'direction-z', value: event.detail.value });
            });


            // 绑定光照强度输入框
            this.createEventHandler("inputIndensity", (event: any) => {
                this.options?.emit('light-settings', { type: 'indensity', value: event.detail.value });
            });

            // 绑定阴影复选框
            this.createEventHandler("checkboxShadow", (event: any) => {
                this.options?.emit('light-settings', { type: 'shadow', value: event.detail.value });
            });

            // 绑定拖动速度滑块
            this.createEventHandler("horizontalSliderSpeed", (event: any) => {
                this.options?.emit('interaction-settings', { type: 'dragSpeed', value: event.detail.value });
            });

            // 绑定焦点模式复选框
            this.createEventHandler("focusCheckbox", (event: any) => {
                this.options?.emit('interaction-settings', { type: 'focusMode', value: event.detail.value });
            });

            // 绑定网格模式复选框
            this.createEventHandler("gridCheckbox", (event: any) => {
                this.options?.emit('scene-settings', { type: 'gridMode', value: event.detail.value });
            });

            // 绑定颜色选择器
            const handleColorPicker = document.getElementById("colorPicker") as HTMLInputElement;
            const viewerCanvas = document.getElementById("viewer-canvas") as HTMLCanvasElement;
            if (handleColorPicker && viewerCanvas) {
                const bgColor = window.getComputedStyle(viewerCanvas).backgroundColor;
                handleColorPicker.value = bgColor;

                this.createEventHandler("colorPicker", (event: any) => {
                    this.options?.emit('scene-settings', { type: 'backgroundColor', value: event.detail.value });
                });
            }
            this.createEventHandler("highlightCheckbox", (event: any) => {
                this.options?.emit('scene-settings', { type: 'highlightMode', value: event.detail.value });
            });

            this.createEventHandler("highlightColorPicker", (event: any) => {
                this.options?.emit('scene-settings', { type: 'highlightColor', value: event.detail.value });
            });
            this.createEventHandler("edgeCheckbox", (event: any) => {
                this.options?.emit('scene-settings', { type: 'edgeMode', value: event.detail.value });
            });

            this.createEventHandler("edgeColorPicker", (event: any) => {
                this.options?.emit('scene-settings', { type: 'edgeColor', value: event.detail.value });
            });
        }
        catch (error) {
            console.log("error", error)
        }
    }
}