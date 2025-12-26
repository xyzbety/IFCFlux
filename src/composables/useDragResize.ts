import { ref, type Ref } from 'vue';
import { eventManager } from '../services/scene-event';

export interface DragConfig {
  minWidth: number;
  maxWidthRatio: number; // 相对于容器宽度的比例
  containerSelector: string;
}

export interface DragState {
  isDragging: boolean;
  dragSide: string;
  startX: number;
  startWidth: number;
}

export interface DragCallbacks {
  onWidthChange: (side: string, newWidth: number) => void;
  onDragStart?: (side: string) => void;
  onDragEnd?: (side: string) => void;
}

export const useDragResize = (config: DragConfig, callbacks: DragCallbacks) => {
  const dragState = ref<DragState>({
    isDragging: false,
    dragSide: '',
    startX: 0,
    startWidth: 0
  });

  const startDrag = (side: string, event: MouseEvent, currentWidth: number) => {
    event.preventDefault();
    
    dragState.value = {
      isDragging: true,
      dragSide: side,
      startX: event.clientX,
      startWidth: currentWidth
    };

    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    // 调用开始拖拽回调
    callbacks.onDragStart?.(side);
    
    // 添加全局事件监听器
    eventManager.add('mousemove', onDrag);
    eventManager.add('mouseup', stopDrag);
    eventManager.add('mouseleave', stopDrag); // 鼠标离开文档时也停止拖拽
  };

  const onDrag = (event: MouseEvent) => {
    if (!dragState.value.isDragging) return;
    
    const container = document.querySelector(config.containerSelector) as HTMLElement;
    if (!container) return;
    
    const totalWidth = container.clientWidth;
    const { dragSide, startX, startWidth } = dragState.value;
    
    // 计算新宽度，根据拖拽方向调整计算方式
    let deltaX = event.clientX - startX;
    
    // 对于右侧面板，需要反向计算
    if (dragSide === 'right') {
      deltaX = -deltaX;
    }
    
    let newWidth = startWidth + deltaX;
    
    // 应用宽度限制
    const minWidth = config.minWidth;
    const maxWidth = totalWidth * config.maxWidthRatio;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // 调用宽度变化回调
    callbacks.onWidthChange(dragSide, newWidth);
  };

  const stopDrag = () => {
    if (!dragState.value.isDragging) return;
    
    const side = dragState.value.dragSide;
    
    // 重置状态
    dragState.value = {
      isDragging: false,
      dragSide: '',
      startX: 0,
      startWidth: 0
    };
    
    // 恢复样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // 移除事件监听器
    eventManager.remove('mousemove');
    eventManager.remove('mouseup');
    eventManager.remove('mouseleave');

        
    // 调用拖拽结束回调
    callbacks.onDragEnd?.(side);
  };

  // 清理函数，用于组件卸载时清理事件监听器
  const cleanup = () => {
    if (dragState.value.isDragging) {
      stopDrag();
    }
  };

  return {
    dragState,
    startDrag,
    stopDrag,
    cleanup
  };
};