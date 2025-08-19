import * as BABYLON from '@babylonjs/core';

/**
 * 相机状态接口
 */
export interface CameraState {
  alpha: number;
  beta: number;
  radius: number;
  target: BABYLON.Vector3;
}

/**
 * 相机历史管理器
 */
export class CameraHistoryManager {
  private cameraStates: CameraState[] = [];
  private currentIndex: number = -1;
  private camera: BABYLON.ArcRotateCamera | null = null;

  constructor(camera?: BABYLON.ArcRotateCamera) {
    if (camera) {
      this.camera = camera;
    }
  }

  /**
   * 设置相机实例
   * @param camera - Babylon.js 弧形旋转相机
   */
  setCamera(camera: BABYLON.ArcRotateCamera): void {
    this.camera = camera;
  }

  /**
   * 比较两个相机状态是否相等
   * @param state1 - 第一个相机状态
   * @param state2 - 第二个相机状态
   * @returns 是否相等
   */
  private isCameraStateEqual(state1: CameraState, state2: CameraState): boolean {
    const tolerance = 0.001; // 容差值，避免浮点数精度问题
    
    return (
      Math.abs(state1.alpha - state2.alpha) < tolerance &&
      Math.abs(state1.beta - state2.beta) < tolerance &&
      Math.abs(state1.radius - state2.radius) < tolerance &&
      Math.abs(state1.target.x - state2.target.x) < tolerance &&
      Math.abs(state1.target.y - state2.target.y) < tolerance &&
      Math.abs(state1.target.z - state2.target.z) < tolerance
    );
  }

  /**
   * 创建相机状态对象
   * @param event - 包含相机状态的事件对象
   * @returns 相机状态对象
   */
  private createCameraState(event: any): CameraState {
    return {
      alpha: event.detail.alpha,
      beta: event.detail.beta,
      radius: event.detail.radius,
      target: event.detail.target.clone ? event.detail.target.clone() : { ...event.detail.target }
    };
  }

  /**
   * 从相机实例创建状态对象
   * @param camera - 相机实例
   * @returns 相机状态对象
   */
  private createStateFromCamera(camera: BABYLON.ArcRotateCamera): CameraState {
    return {
      alpha: camera.alpha,
      beta: camera.beta,
      radius: camera.radius,
      target: camera.target.clone ? camera.target.clone() : new BABYLON.Vector3(camera.target.x, camera.target.y, camera.target.z)
    };
  }

  /**
   * 应用相机状态到相机实例
   * @param state - 要应用的相机状态
   * @param camera - 目标相机实例
   */
  private applyCameraState(state: CameraState, camera: BABYLON.ArcRotateCamera): void {
    camera.alpha = state.alpha;
    camera.beta = state.beta;
    camera.radius = state.radius;
    
    if (state.target.clone) {
      camera.setTarget(state.target.clone());
    } else {
      camera.setTarget(new BABYLON.Vector3(state.target.x, state.target.y, state.target.z));
    }
  }

  /**
   * 记录相机状态到历史
   * @param event - 包含相机状态的事件对象
   */
  recordState(event: any): void {
    if (!event.detail) return;

    const newState = this.createCameraState(event);

    // 如果数组为空或状态发生变化
    if (this.currentIndex === -1 || !this.isCameraStateEqual(this.cameraStates[this.currentIndex], newState)) {
      // 如果在历史中间有新操作，丢弃后面的历史
      if (this.currentIndex < this.cameraStates.length - 1) {
        this.cameraStates = this.cameraStates.slice(0, this.currentIndex + 1);
      }

      this.cameraStates.push(newState);
      this.currentIndex = this.cameraStates.length - 1;
      
      // 限制历史记录数量，避免内存占用过多
      const maxHistorySize = 50;
      if (this.cameraStates.length > maxHistorySize) {
        this.cameraStates.shift();
        this.currentIndex--;
      }

      console.log('相机状态已添加到历史', newState);
    }
  }

  /**
   * 记录当前相机状态
   * @param camera - 相机实例（可选，如果未提供则使用内部相机）
   */
  recordCurrentState(camera?: BABYLON.ArcRotateCamera): void {
    const targetCamera = camera || this.camera;
    if (!targetCamera) {
      console.warn('CameraHistoryManager: 未设置相机实例');
      return;
    }

    const currentState = this.createStateFromCamera(targetCamera);
    
    // 模拟事件对象结构
    const mockEvent = {
      detail: {
        alpha: currentState.alpha,
        beta: currentState.beta,
        radius: currentState.radius,
        target: currentState.target
      }
    };

    this.recordState(mockEvent);
  }

  /**
   * 撤销到上一个状态
   * @param camera - 目标相机实例（可选，如果未提供则使用内部相机）
   * @returns 是否成功撤销
   */
  undo(camera?: BABYLON.ArcRotateCamera): boolean {
    const targetCamera = camera || this.camera;
    if (!targetCamera) {
      console.warn('CameraHistoryManager: 未设置相机实例');
      return false;
    }

    if (this.currentIndex <= 0) {
      console.log('CameraHistoryManager: 没有可撤销的状态');
      return false;
    }

    this.currentIndex--;
    const prevState = this.cameraStates[this.currentIndex];
    this.applyCameraState(prevState, targetCamera);
    
    console.log('CameraHistoryManager: 撤销到状态', this.currentIndex);
    return true;
  }

  /**
   * 重做到下一个状态
   * @param camera - 目标相机实例（可选，如果未提供则使用内部相机）
   * @returns 是否成功重做
   */
  redo(camera?: BABYLON.ArcRotateCamera): boolean {
    const targetCamera = camera || this.camera;
    if (!targetCamera) {
      console.warn('CameraHistoryManager: 未设置相机实例');
      return false;
    }

    if (this.currentIndex >= this.cameraStates.length - 1) {
      console.log('CameraHistoryManager: 没有可重做的状态');
      return false;
    }

    this.currentIndex++;
    const nextState = this.cameraStates[this.currentIndex];
    this.applyCameraState(nextState, targetCamera);
    
    console.log('CameraHistoryManager: 重做到状态', this.currentIndex);
    return true;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.cameraStates = [];
    this.currentIndex = -1;
  }

  /**
   * 获取当前可撤销的状态数量
   * @returns 可撤销的状态数量
   */
  getUndoCount(): number {
    return this.currentIndex;
  }

  /**
   * 获取当前可重做的状态数量
   * @returns 可重做的状态数量
   */
  getRedoCount(): number {
    return this.cameraStates.length - 1 - this.currentIndex;
  }

  /**
   * 检查是否可以撤销
   * @returns 是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   * @returns 是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.cameraStates.length - 1;
  }

  /**
   * 获取当前状态索引
   * @returns 当前状态索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 获取历史记录总数
   * @returns 历史记录总数
   */
  getHistoryLength(): number {
    return this.cameraStates.length;
  }

  /**
   * 设置初始相机状态
   * @param initialState - 初始相机状态
   */
  setInitialState(initialState: CameraState): void {
    this.clear();
    this.cameraStates.push(initialState);
    this.currentIndex = 0;
    console.log('CameraHistoryManager: 已设置初始状态');
  }

  /**
   * 从相机实例设置初始状态
   * @param camera - 相机实例
   */
  setInitialStateFromCamera(camera: BABYLON.ArcRotateCamera): void {
    const initialState = this.createStateFromCamera(camera);
    this.setInitialState(initialState);
  }
}

// 创建单例实例（可选）
export const cameraHistoryManager = new CameraHistoryManager();

// 导出工具函数（保持向后兼容）
export const isCameraStateEqual = (state1: CameraState, state2: CameraState): boolean => {
  const manager = new CameraHistoryManager();
  return (manager as any).isCameraStateEqual(state1, state2);
};

export const applyCameraState = (state: CameraState, camera: BABYLON.ArcRotateCamera): void => {
  const manager = new CameraHistoryManager();
  (manager as any).applyCameraState(state, camera);
};