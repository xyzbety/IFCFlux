import { ref, Ref } from "vue";
import * as BABYLON from '@babylonjs/core/index.js';


export interface RibbonEventsOptions {
    modelStore: any;
    emit: any;
}

export class RibbonEventManager {
    private options: RibbonEventsOptions;
    private scene: BABYLON.Scene | null = null;
    private eventMap: Map<string, { type: string; param: string }> = new Map();
    private singleEvents: Map<string, () => void> = new Map();

    // 在内部初始化爆炸参数
    public explosionX = ref(0);
    public explosionY = ref(0);
    public explosionZ = ref(0);

    constructor(options: RibbonEventsOptions) {
        this.options = options;
        this.initializeEventMap();
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

            // 空间生成事件
            {
                labels: ["生成空间", "导出"],
                type: "space-generate",
                params: ["generate", "export"]
            },

            // 动画事件
            {
                labels: ["开始", "暂停", "停止", "脚本库"],
                type: "animation-event",
                params: ["start", "pause", "stop", "toolbox"]
            },

            // 爆炸图事件
            {
                labels: ["清除效果"],
                type: "explosion-event",
                params: ["clear"]
            },

            // 检查事件
            {
                labels: ["规划构建", "基础数据", "施工审查", "智慧工地监管", "竣工验收"],
                type: "inspect-click",
                params: [1, 2, 3, 4, 5]
            }
        ];

        eventDefinitions.forEach(({ labels, type, params }) => {
            labels.forEach((label, index) => {
                this.eventMap.set(label, { type, param: params[index] });
            });
        });
    }

    private initializeSingleEvents() {
        this.singleEvents.set("构件树", () => this.options.emit("build-tree"));
        this.singleEvents.set("属性表", () => this.options.emit("properties-table"));
        this.singleEvents.set("重置", () => this.options.emit("light-settings-reset"));
    }

    /**
     * 处理按钮点击
     * @param label - 按钮标签
     * @returns 是否成功处理
     */
    public handleClick(label: string): boolean {
        console.log("按钮被点击:", label);

        // 检查单独事件
        const singleEvent = this.singleEvents.get(label);
        if (singleEvent) {
            singleEvent();
            return true;
        }

        // 检查映射事件
        const eventInfo = this.eventMap.get(label);
        if (eventInfo) {
            this.options.emit(eventInfo.type, eventInfo.param);
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
    public addButtonMapping(label: string, eventType: string, eventParam?: string) {
        if (eventParam) {
            this.eventMap.set(label, { type: eventType, param: eventParam });
        } else {
            this.singleEvents.set(label, () => this.options.emit(eventType));
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

    public initScene(value: BABYLON.Scene | null) {
        this.scene = value;
    }

    public bindRibbonEvents() {
        const ribbon = document.getElementById('ribbon');
        if (ribbon) {
            ribbon.addEventListener('click', (event) => {
                this.handleRibbonClick(event);
            });

            ribbon.addEventListener('select', (event) => {
                this.handleRibbonSelect(event);
            });
        }

        // 绑定爆炸滑块事件
        this.bindExplosionSliderEvents();
        console.log("绑定成功");
    }

    private handleRibbonClick(event: Event) {
        const fileMenuButton = event.target && (event.target as Element).closest ?
            (event.target as Element).closest('.smart-ribbon-file-container smart-drop-down-button') : null;
        const fileMenuDropdown = document.querySelector('.smart-drop-down') as HTMLElement | null;

        if (fileMenuButton && fileMenuDropdown) {
            event.preventDefault();
            event.stopPropagation();
            this.options.emit('toggle-file-menu');
            fileMenuDropdown.style.display = 'none'
            return;
        }

        const button = event.target && (event.target as Element).closest ?
            (event.target as Element).closest('smart-button') : null;
        if (button) {
            const parentLabel = (button.parentNode && (button.parentNode as HTMLElement).getAttribute?.('label')) || '';
            console.log("按钮被点击:", parentLabel);
            this.handleClick(parentLabel);
        }
    }

    private handleRibbonSelect(event: any) {
        if (event.detail) {
            console.log("选中了:", event.detail.index);
            this.options.emit('ribbon-tab-change', event.detail.index);
            if (event.detail.index === 3) {
                this.handleSettingsTabSelect();
            }
        }
    }

    private handleSettingsTabSelect() {
        try {
            const scene = this.scene;
            console.log("场景:", scene);

            if (!scene) return;
            const handleSliderX = document.getElementById("horizontalSliderX") as HTMLInputElement;
            const handleSliderY = document.getElementById("horizontalSliderY");
            const handleSliderZ = document.getElementById("horizontalSliderZ");
            const inputIndensity = document.getElementById("inputIndensity");
            const checkboxShadow = document.getElementById("checkboxShadow");
            const handleSliderSpeed = document.getElementById("horizontalSliderSpeed") as HTMLInputElement;
            const handleCheckboxFocus = document.getElementById("checkboxFocus") as HTMLInputElement;
            const light = scene.getLightByName("fillLight") as BABYLON.DirectionalLight

            if (handleSliderX && light) handleSliderX.val(light.direction.x)
            if (handleSliderY && light) handleSliderY.val(light.direction.y)
            if (handleSliderZ && light) handleSliderZ.val(light.direction.z)
            if (inputIndensity && light) inputIndensity.value = String(light.intensity)
            if (checkboxShadow && light) checkboxShadow.checked = light.shadowEnabled

            if (handleSliderX) {
                handleSliderX.addEventListener('change', (event: any) => {
                    this.options.emit('light-settings', { lightX: event.detail.value })
                })
            }

            if (handleSliderY) {
                handleSliderY.addEventListener('change', (event: any) => {
                    this.options.emit('light-settings', { lightY: event.detail.value })
                })
            }

            if (handleSliderZ) {
                handleSliderZ.addEventListener('change', (event: any) => {
                    this.options.emit('light-settings', { lightZ: event.detail.value })
                })
            }

            if (inputIndensity) {
                inputIndensity.addEventListener('change', (event: any) => {
                    this.options.emit('light-settings', { lightIndensity: event.detail.value })
                })
            }

            if (checkboxShadow) {
                checkboxShadow.addEventListener('change', (event: any) => {
                    this.options.emit('light-settings', { lightShadowEnabled: event.detail.value })
                })
            }

            if (handleSliderSpeed) {
                handleSliderSpeed.addEventListener('change', (event: any) => {
                    if (scene) {
                        const speed = event.detail.value;
                        console.log("拖动速度:", speed);
                        this.options.emit('scene-settings', { dragSpeed: speed });
                    }
                });
            }

            if (handleCheckboxFocus) {
                handleCheckboxFocus.addEventListener('change', (event: any) => {
                    if (scene) {
                        const isChecked = event.detail.value;
                        console.log("Focus mode:", isChecked);
                        this.options.emit('scene-settings', { focusMode: isChecked });
                    }
                });
            }

            const handleColorPicker = document.getElementById("colorPicker")
            const khanonjs = document.getElementById("khanonjs") as HTMLCanvasElement;
            if (handleColorPicker && khanonjs) {
                const bgColor = window.getComputedStyle(khanonjs).backgroundColor;
                handleColorPicker.value = bgColor;
                handleColorPicker.addEventListener('change', (event: any) => {
                    const color = event.detail.value;
                    console.log("背景颜色改变:", color);
                    this.options.emit('scene-settings', { backgroundColor: color });
                })
            }
        }
        catch (error) {
            console.log("error", error)
        }
    }

    private bindExplosionSliderEvents() {
        const explosionSliderX = document.getElementById("explosionSliderX");
        const explosionSliderY = document.getElementById("explosionSliderY");
        const explosionSliderZ = document.getElementById("explosionSliderZ");

        if (explosionSliderX) {
            explosionSliderX.addEventListener('change', (event: any) => {
                this.explosionX.value = event.detail.value;
                this.emitExplosion();
            })
        }

        if (explosionSliderY) {
            explosionSliderY.addEventListener('change', (event: any) => {
                this.explosionY.value = event.detail.value;
                this.emitExplosion();
            })
        }

        if (explosionSliderZ) {
            explosionSliderZ.addEventListener('change', (event: any) => {
                this.explosionZ.value = event.detail.value;
                this.emitExplosion();
            })
        }
    }

    private emitExplosion() {
        this.options.emit('explosion-event', {
            X: this.explosionX.value,
            Y: this.explosionY.value,
            Z: this.explosionZ.value
        });
    }

}