import hifc1 from './rules/HIFC基础数据.json';
import hifc2 from './rules/HIFC规划报建.json';
import hifc3 from './rules/HIFC施工图审查.json';
import hifc4 from './rules/HIFC智慧工地监管.json';
import hifc5 from './rules/HIFC竣工验收.json';
import { IfcTypes } from './ifcTypeMap'

/**
 * IFC 规则映射类型定义
 * - IfcMapping: 实体名 -> (属性集名 -> (属性名 -> 规则/期望值))
 */
type IfcEntityName = string;
type IfcPropertySetName = string;
type IfcPropertyName = string;
type IfcRuleValue = unknown;

export type IfcEntityRule = Record<IfcPropertySetName, Record<IfcPropertyName, IfcRuleValue>>;
export type IfcMapping = Record<IfcEntityName, IfcEntityRule>;

export interface IfcInspectMetadata {
  name: string;
  version: number;
}
export interface IfcInspectData {
  [entity: string]: any[]; // 每个实体对应的检查结果数组）
}
export interface IfcInspectResult {
  metadata: IfcInspectMetadata;
  data: IfcInspectData;
}

/**
 * 规则集映射（按类型编号选择不同的数据表）
 */
const ifcPset2: Record<number, IfcMapping> = {
  1: (hifc1 as any)['data_sheet'] as IfcMapping,
  2: (hifc2 as any)['data_sheet'] as IfcMapping,
  3: (hifc3 as any)['data_sheet'] as IfcMapping,
  4: (hifc4 as any)['data_sheet'] as IfcMapping,
  5: (hifc5 as any)['data_sheet'] as IfcMapping,
};

/**
 * - 接收本地文件或网络 URL
 * - 调用 Web Worker 完成 IFC 提取与规则校验
 * - 完成后让出一帧以便 UI 有机会渲染，再更新 ifcData
 */
export class IfcInspect {
  private processing = false;          // 是否正在处理
  private baseUrl = '';                // 站点根路径（用于加载 worker）
  private file: File | null = null;    // 规范化后的文件对象
  private url: string | File;          // 输入的 URL 或 File
  private ifcPset?: IfcMapping;      // 当前选择的规则映射
  public ifcData?: IfcInspectResult;   // 最终的检查结果

  constructor(url: string | File, type: number = 1) {
    this.url = url;
    this.baseUrl = window.location.origin;
    this.ifcPset = ifcPset2[type];
    this.init();
  }

  /**
   * 初始化：将 URL 规范化为 File，然后启动处理
   */
  private async init(): Promise<void> {
    if (this.url instanceof File) {
      this.file = this.url;
    } else {
      const isWeb = this.isWebUrl(this.url);
      if (isWeb) {
        this.file = await this.urlToFile(this.url);
      }
    }
    this.run();
  }

  /**
   * 判断是否为 http/https URL
   */
  private isWebUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 将远程 URL 拉取为 File 对象
   */
  private async urlToFile(url: string): Promise<File> {
    const filename = url.split('/').pop() || 'downloaded_file';
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, {
      type: blob.type,
      lastModified: Date.now(),
    });
  }

  /**
   * 执行提取：
   * - 启动 worker 进行解析
   * - 记录耗时
   * - 完成后“让出一帧”给 UI 渲染，再写入 ifcData
   */
  private async run(): Promise<void> {
    if (!this.file || !this.ifcPset) return;

    this.processing = true;
    const t0 = performance.now();

    const worker = new Worker(`${this.baseUrl}/extractor.worker.js`);

    const result = await new Promise<IfcInspectResult>((resolve) => {
      worker.postMessage({
        name: 'start',
        file: this.file as File,
        mapping: this.ifcPset as IfcMapping,
        ifcTypes: IfcTypes,
      });

      worker.onmessage = (e: MessageEvent<any>) => {
        if (e.data && e.data.complete) {
          worker.terminate();
          resolve(e.data.result as IfcInspectResult);
        }
      };
    });

    const t1 = performance.now();
    console.log(`解析完成，耗时 ${((t1 - t0) / 1000).toFixed(2)} 秒`);

    // 让出一帧给 UI 渲染
    await this.yieldToNextFrame();

    this.processing = false;
    this.ifcData = result;
  }

  /**
   * 让出一帧：等待下一帧渲染结束再继续（兼容无 rAF 场景）
   */
  private async yieldToNextFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve());
      } else {
        // 退一步的兼容：不保证渲染，但可避免长任务阻塞
        setTimeout(() => resolve(), 0);
      }
    });
  }
}