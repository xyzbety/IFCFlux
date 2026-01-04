import { MessagePlugin } from 'tdesign-vue-next';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import * as BABYLON from '@babylonjs/core';
import { GLTF2Export } from "@babylonjs/serializers";
import { IFCParser2DB } from '../utils/ifc/IfcParserToDb';
export async function exportGLB(scene: any, fileNameWithoutExtension: string, isTauriEnv: boolean, saveDialogConfig: any) {
    let savePath: string | null = '';

    if (isTauriEnv) {
        // 先让用户选择保存路径
        savePath = await save(saveDialogConfig);
        if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
        }

        // 更新为导出进行中的消息
        MessagePlugin.closeAll();
        MessagePlugin.loading({
            content: `正在导出glb文件，请稍候...`,
            duration: 0,
            closeBtn: true
        });
    }

    try {

        const options = {
            shouldExportNode: (node: any) => {
                if (node instanceof BABYLON.Mesh) {
                    return node.isEnabled() && node.getTotalVertices() > 0;
                }
                return true;
            }
        };

        // 分批处理导出，避免一次性处理所有数据
        const exportPromise = GLTF2Export.GLBAsync(scene, fileNameWithoutExtension, options);

        const exportResult = await exportPromise;

        const exportFile = exportResult.files[`${fileNameWithoutExtension}.glb`];
        if (!(exportFile instanceof Blob)) {
            throw new Error("导出的 GLB 文件格式无效");
        }

        if (!isTauriEnv) {
            exportResult.downloadFiles();
        } else {
            // 分块写入大文件，避免内存问题
            const arrayBuffer = await exportFile.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // 如果文件很大，使用分块写入
            if (uint8Array.length > 100 * 1024 * 1024) { // 大于100MB
                const chunkSize = 10 * 1024 * 1024; // 10MB chunks

                // 先清空文件
                await writeFile(savePath, new Uint8Array(0));

                // 分块写入
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.subarray(i, i + chunkSize);
                    await writeFile(savePath, chunk, { append: i > 0 });
                }
            } else {
                // 小文件直接写入
                await writeFile(savePath, uint8Array);
            }
        }

        // 关闭加载提示
        MessagePlugin.closeAll();

        MessagePlugin.success({
            content: `导出成功！`,
            duration: 3000
        });
    } catch (error) {
        console.error('导出GLB失败:', error);

        // 关闭加载提示
        MessagePlugin.closeAll();
        MessagePlugin.error({ content: error.message, duration: 5000 });
    }
}

export async function exportJSON(scene: any, fileNameWithoutExtension: string, isTauriEnv: boolean, saveDialogConfig: any) {
    let savePath: string | null = '';
    if (isTauriEnv) {
        savePath = await save(saveDialogConfig);
        if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
        }
        MessagePlugin.loading({
            content: '正在导出json文件，请稍候...',
            duration: 0,
            closeBtn: true
        });
    }

    try {
        // 定义要导出的字段
        const exportFields = [
            { key: 'autoClear', value: scene.autoClear },
            { key: 'clearColor', value: scene.clearColor },
            { key: 'ambientColor', value: scene.ambientColor },
            { key: 'gravity', value: scene.gravity },
            { key: 'collisionsEnabled', value: scene.collisionsEnabled },
            { key: 'useRightHandedSystem', value: scene.useRightHandedSystem },
            { key: 'fogMode', value: scene.fogMode },
            { key: 'fogColor', value: scene.fogColor },
            { key: 'fogStart', value: scene.fogStart },
            { key: 'fogEnd', value: scene.fogEnd },
            { key: 'fogDensity', value: scene.fogDensity },
            { key: 'multiplyMaterial', value: scene.multiplyMaterial ? scene.multiplyMaterial : [] },
            { key: 'morphTargetManagers', value: scene.morphTargetManagers },
            { key: 'activeCameraID', value: scene.activeCamera ? scene.activeCamera.id : null },
            { key: 'animations', value: scene.animations },
            { key: 'environmentIntensity', value: scene.environmentIntensity },
            { key: 'iblIntensity', value: scene.iblIntensity },
            { key: 'skeletons', value: scene.skeletons },
            { key: 'transformNodes', value: scene.transformNodes },
            { key: 'particleSystems', value: scene.particleSystems }
        ];

        // 统一收集所有集合数据
        const collections = {
            lights: scene.lights.map((light: any) => light.serialize().lights?.[0]).filter(Boolean),
            cameras: scene.cameras.map((camera: any) => camera.serialize().cameras?.[0]).filter(Boolean),
            materials: scene.materials.map((material: any) => material.serialize()).filter(Boolean),
            postProcesses: scene.postProcesses.map((postProcesses: any) => postProcesses.serialize()).filter(Boolean),
            shadowGenerators: scene.lights.flatMap((light: any) => {
                const generators = light._shadowGenerators;
                if (!generators) return [];
                const list = generators instanceof Map ? Array.from(generators.values()) : Object.values(generators);
                return list.map((generators: any) => generators.serialize());
            })
        };

        // 序列化函数：将 Babylon 对象转换为可序列化的纯数据
        const cleanValue = (value: any, depth: number = 0, maxDepth: number = 100): any => {
            if (depth > maxDepth) {
                return '[深度限制]';
            }
            if (value === null || value === undefined) return null;
            if (typeof value === 'string') return value;
            if (typeof value === 'number') return value;
            if (typeof value === 'boolean') return value;
            if (Array.isArray(value)) return value.map((item: any) => cleanValue(item, depth + 1, maxDepth));
            if (typeof value === 'object') {
                // 处理 Babylon 的 Color3/Color4
                if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
                    if (value.a !== undefined) {
                        return [value.r, value.g, value.b, value.a];
                    }
                    return [value.r, value.g, value.b];
                }
                // 处理 Babylon 的 Vector3
                if (value.x !== undefined && value.y !== undefined && value.z !== undefined && value.w === undefined) {
                    return [value.x, value.y, value.z];
                }
                // 处理普通对象
                const result: any = {};
                for (const key in value) {
                    if (value.hasOwnProperty(key) && typeof value[key] !== 'function') {
                        result[key] = cleanValue(value[key], depth + 1, maxDepth);
                    }
                }
                return result;
            }
            return null;
        };

        const formatValue = (value: any, indent: string = ''): string => {
            const cleaned = cleanValue(value);
            return JSON.stringify(cleaned, null, 2).split('\n').map((line, i, arr) => {
                if (i === 0) return line;
                if (i === arr.length - 1) return indent + line;
                return indent + line;
            }).join('\n');
        };

        // 辅助函数：让出 UI 线程
        const yieldUI = async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        };

        if (!isTauriEnv) {
            // 浏览器环境：不进行写入，只提供示例
            const blob = new Blob(['{}'], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileNameWithoutExtension}.json`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            MessagePlugin.success({ content: '导出成功！', duration: 2000 });
        } else {
            // 开始流式写入
            await writeTextFile(savePath, '{\n', { append: false });

            //  写入简单字段
            for (let i = 0; i < exportFields.length; i++) {
                const field = exportFields[i];
                const valueStr = formatValue(field.value, '  ');
                await writeTextFile(savePath, `  "${field.key}": ${valueStr},\n`, { append: true });
                if (i % 5 === 4) await yieldUI();
            }

            //  写入集合数据
            for (const key of Object.keys(collections)) {
                const data = collections[key as keyof typeof collections];
                if (data.length > 0) {
                    const valueStr = formatValue(data, '  ');
                    await writeTextFile(savePath, `  "${key}": ${valueStr},\n`, { append: true });
                    await yieldUI();
                }
            }

            //  写入 meshes
            let hasMeshes = false;
            let meshCount = 0;
            for (const mesh of scene.meshes) {
                if (mesh.name.includes('highlight')) continue; // 跳过高亮网格
                const meshInfo = mesh.serialize({});
                if (meshInfo) {
                    // 创建副本用于导出，不修改原始数据
                    const meshInfoForExport = { ...meshInfo };
                    if (meshInfoForExport.metadata && meshInfoForExport.metadata.originalMeshData) {
                        meshInfoForExport.metadata = {
                            ...meshInfoForExport.metadata,
                            originalMeshData: meshInfoForExport.metadata.originalMeshData.map((data: any) => data?.metadata)
                        };
                    }
                    if (!hasMeshes) {
                        await writeTextFile(savePath, '  "meshes": [\n', { append: true });
                        hasMeshes = true;
                    }
                    const valueStr = formatValue(meshInfoForExport, '    ');
                    await writeTextFile(savePath, `    ${valueStr},\n`, { append: true });
                    if (meshCount++ % 5 === 4) await yieldUI();
                }
            }

            // 关闭 meshes 数组
            if (hasMeshes) {
                await writeTextFile(savePath, '  ],\n', { append: true });
            }

            //  写入 geometries
            await writeTextFile(savePath, '  "geometries": {\n', { append: true });

            const geometriesData: any = { boxes: [], spheres: [], cylinders: [], toruses: [], grounds: [], planes: [], torusKnots: [], geometryData: [] };
            for (const geometry of scene.geometries) {
                const geometryInfo = geometry.serialize();
                if (geometryInfo && geometryInfo.id) {
                    geometriesData.geometryData.push(geometryInfo);
                }
            }

            const geometryKeys = Object.keys(geometriesData);
            for (let i = 0; i < geometryKeys.length; i++) {
                const key = geometryKeys[i];
                const valueStr = formatValue(geometriesData[key], '    ');
                const separator = i < geometryKeys.length - 1 ? ',\n' : '\n';
                await writeTextFile(savePath, `    "${key}": ${valueStr}${separator}`, { append: true });
                await yieldUI();
            }

            // 关闭文件
            await writeTextFile(savePath, '  },\n', { append: true });
            await writeTextFile(savePath, '}', { append: true });

            MessagePlugin.closeAll();
            MessagePlugin.success({ content: '导出成功！', duration: 2000 });
        }
    } catch (error) {
        console.error('Tauri 导出失败:', error);
        MessagePlugin.error({ content: '导出失败', duration: 3000 });
    }
}

export async function exportDB(modelStore: any, fileNameWithoutExtension: string, isTauriEnv: boolean, saveDialogConfig: any) {
    if (!modelStore.file) return;
    let savePath: string | null = '';
    if (isTauriEnv) {
        savePath = await save(saveDialogConfig);
        if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
        }
        MessagePlugin.loading({
            content: '正在导出数据库文件，请稍候...',
            duration: 0,
            closeBtn: true
        });
    }

    const envConfig = {
        x: 0,
        y: 0,
        z: 0,
        a: 0,
        detail_level: 12
    };
    const parser = new IFCParser2DB();
    const result = await parser.start(modelStore.file, fileNameWithoutExtension, envConfig);

    if (!isTauriEnv) {
        const url = URL.createObjectURL(result || new Blob([]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileNameWithoutExtension}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        if (!result) {
            MessagePlugin.error({ content: '导出失败: 参数错误！', duration: 1000 });
            return;
        }
        const arrayBuffer = await result.arrayBuffer();
        await writeFile(savePath, new Uint8Array(arrayBuffer));
    }
    MessagePlugin.closeAll();
    MessagePlugin.success({ content: '导出成功！', duration: 1000 });
}

export const saveAsGLB = async (scene: BABYLON.Scene, outputPath: string): Promise<void> => {
    try {
        const exportResult = await GLTF2Export.GLBAsync(scene, 'temp');
        const glbFile = exportResult.files['temp.glb'];
        if (!(glbFile instanceof Blob)) {
            throw new Error("导出的文件格式无效");
        }
        const arrayBuffer = await glbFile.arrayBuffer();
        await writeFile(outputPath, new Uint8Array(arrayBuffer));
    } catch (error) {
        throw new Error(`GLB 导出失败: ${error}`);
    }
};

export const saveAsJSON = async (scene: BABYLON.Scene, outputPath: string): Promise<void> => {
    try {
        const serializedScene = BABYLON.SceneSerializer.Serialize(scene);
        const seenObjects = new WeakSet();
        const replacer = (key: string, value: any): any => {
            if (typeof value === 'object' && value !== null) {
                if (seenObjects.has(value)) {
                    return '[Circular]';
                }
                seenObjects.add(value);
            }
            return value;
        };

        await writeTextFile(outputPath, "{\n", { append: false });
        const keys = Object.keys(serializedScene);
        let isFirstField = true;

        for (const key of keys) {
            try {
                const value = serializedScene[key];
                if (value === undefined) continue;
                const valueString = JSON.stringify(value, replacer, 2);
                const fieldLine = `  "${key}": ${valueString}`;
                const formattedLine = isFirstField ? fieldLine : `,\n${fieldLine}`;
                await writeTextFile(outputPath, formattedLine, { append: true });
                isFirstField = false;
            } catch (error) {
                console.error(`字段 ${key} 序列化失败:`, error);
            }
        }
        await writeTextFile(outputPath, "\n}", { append: true });
    } catch (error) {
        throw new Error(`JSON 导出失败: ${error}`);
    }
};

export const saveAsDB = async (file: File, inputPath: string, outputPath: string): Promise<void> => {
    try {
        const fileNameWithExt = inputPath.split('\\').pop() || inputPath;
        const lastDotIndex = fileNameWithExt.lastIndexOf('.');
        const fileName = lastDotIndex === -1
            ? fileNameWithExt
            : fileNameWithExt.substring(0, lastDotIndex);
        const envConfig = {
            x: 0, // 经度
            y: 0, // 纬度
            z: 0,
            a: 0,
            detail_level: 12
        };
        const parser = new IFCParser2DB();
        const result = await parser.start(file, fileName, envConfig);
        if (!result) {
            throw new Error('无法获取数据库文件');
        }
        const arrayBuffer = await result.arrayBuffer();
        await writeFile(outputPath, new Uint8Array(arrayBuffer));
    } catch (error) {
        throw new Error(`数据库导出失败: ${error}`);
    }
};


