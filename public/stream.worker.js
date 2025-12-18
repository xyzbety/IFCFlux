
import * as WEBIFC from "web-ifc";
import * as BABYLON from '@babylonjs/core';

let webIfc = null
let modelID = null
let ifcExpressIds

const materialCache = new Map()
const materialsMap = new Map()
self.onmessage = async (e) => {
  const command = e.data.command
  const ifcData = e.data.ifcData
  console.log('ifcData', new Uint8Array(ifcData))

  console.log('command', command)
  if (command == 'init') {
    console.log('开始初始化WebIFC')

    try {
      webIfc = new WEBIFC.IfcAPI()
      webIfc.SetWasmPath('/web-ifc/', true);
      await webIfc.Init()
      console.log('WebIFC初始化成功', webIfc)
    } catch (error) {
      console.error('WebIFC初始化失败:', error)
      self.postMessage({
        command: 'error',
        error: 'WebIFC初始化失败: ' + error.message
      })
      return
    }
    const config = {
      COORDINATE_TO_ORIGIN: false, // 不将坐标系移动到原点
      OPTIMIZE_PROFILES: true, // 优化轮廓
      USE_FAST_BOOLS: true, // 启用快速布尔运算
      CIRCLE_SEGMENTS: 8, // 设置圆的线段数，影响几何精细度
    };
    try {
      console.log('开始打开IFC模型，数据大小:', ifcData?.byteLength || ifcData?.length)
      const totalBytes = ifcData.byteLength;
      modelID = webIfc.OpenModelFromCallback(
        (offset, size) => {
          const chunk = new Uint8Array(ifcData).slice(offset, offset + size);
          // 确保进度不超过100%
          const currentOffset = Math.min(offset + size, totalBytes);
          const progressPercent = Math.round(currentOffset / totalBytes * 10);

          // 将进度发送给主线程
          self.postMessage({
            command: 'progress',
            progress: progressPercent,
            message: `正在读取文件...`,
            loaded: currentOffset,
            total: totalBytes
          });

          return chunk; // 必须返回 Uint8Array
        }, config)
      console.log("Web Worker中创建的modelID:", modelID);

      if (modelID === undefined || modelID === null || modelID < 0) {
        console.error("Web Worker中打开IFC模型失败，无效的modelID:", modelID);
        self.postMessage({
          command: 'error',
          error: `打开IFC模型失败，无效的modelID: ${modelID}`,
          modelID
        });
        return;
      }

      self.postMessage({
        command: 'init_complete',
        result: {
          modelID
        }
      });
    } catch (error) {
      console.error("Web Worker中打开IFC模型时发生错误:", error);
      self.postMessage({
        command: 'error',
        error: error.message || '打开IFC模型时发生未知错误'
      });
    }
  }
}
