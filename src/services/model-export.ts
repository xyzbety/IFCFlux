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
    // 流式处理：逐字段序列化并写入文件
    try {
        // 定义要导出的字段获取函数，按需序列化
        const exportFieldGetters = [
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

        // 同步构建 JSON 字符串到缓冲区，然后批量写入
        let writeBuffer = '';
        const flushBuffer = async (): Promise<void> => {
            if (isTauriEnv && writeBuffer.length > 0) {
                await writeTextFile(savePath, writeBuffer, { append: true });
                await new Promise(resolve => setTimeout(resolve, 0));
                writeBuffer = '';
            }
        };
        const stringifyBabylonValue = (value: any): string | null => {
            if (value && typeof value === 'object') {
                if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
                    if (value.a !== undefined) {
                        return `[${value.r},${value.g},${value.b},${value.a}]`;
                    }
                    return `[${value.r},${value.g},${value.b}]`;
                }
                if (value.x !== undefined && value.y !== undefined && value.z !== undefined && value.w === undefined) {
                    return `[${value.x},${value.y},${value.z}]`;
                }
            }
            return null;
        };
        // 异步分块序列化到缓冲区
        const stringifyToBufferAsync = async (value: any, indent: string = '', depth: number = 0): Promise<void> => {
            const babylonStr = stringifyBabylonValue(value);
            if (babylonStr) {
                writeBuffer += babylonStr;
                return;
            }

            if (value === null || value === undefined) {
                writeBuffer += 'null';
                return;
            }
            if (typeof value === 'string') {
                writeBuffer += `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
                return;
            }
            if (typeof value === 'number') {
                writeBuffer += String(value);
                return;
            }
            if (typeof value === 'boolean') {
                writeBuffer += String(value);
                return;
            }
            if (Array.isArray(value)) {
                if (value.length === 0) {
                    writeBuffer += '[]';
                    return;
                }
                const nextIndent = indent + '  ';
                writeBuffer += '[\n' + nextIndent;
                for (let i = 0; i < value.length; i++) {
                    await stringifyToBufferAsync(value[i], nextIndent, depth + 1);
                    if (i < value.length - 1) writeBuffer += ',\n' + nextIndent;
                }
                writeBuffer += '\n' + indent + ']';
                return;
            }
            if (typeof value === 'object') {
                const keys = Object.keys(value);
                if (keys.length === 0) {
                    writeBuffer += '{}';
                    return;
                }
                const nextIndent = indent + '  ';
                writeBuffer += '{\n' + nextIndent;
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    writeBuffer += `"${key}": `;
                    await stringifyToBufferAsync(value[key], nextIndent, depth + 1);
                    if (i < keys.length - 1) writeBuffer += ',\n' + nextIndent;
                }
                writeBuffer += '\n' + indent + '}';
                return;
            }
            writeBuffer += 'null';
        };

        // 统一收集所有集合数据
        const collections = {
            lights: scene.lights.map((light: any) => {
                const lightInfo = light.serialize();
                return lightInfo.lights?.[0];
            }).filter(Boolean),
            cameras: scene.cameras.map((camera: any) => {
                const cameraInfo = camera.serialize();
                return cameraInfo.cameras?.[0];
            }).filter(Boolean),
            materials: scene.materials.map((mat: any) => {
                const materialInfo = mat.serialize();
                return materialInfo;
            }).filter(Boolean),
            postProcesses: (() => {
                const postProcessesKeys = ['tags', 'name', 'width', 'height', 'renderTargetSamplingMode', 'autoClear', 'forceAutoClearInAlphaMode', 'alphaMode', 'enablePixelPerfectMode',
                    'forceFullscreenViewport', 'scaleMode', 'alwaysForcePOT', 'samples', 'adaptScaleToCurrentViewport', 'customType', 'cameraId', '_reusable', '_textureType',
                    '_fragmentUrl', '_parameters', '_samplers', '_uniformBuffers', '_options', 'defines', '_textureFormat', '_vertexUrl', '_indexParameters'];
                const result: any[] = [];
                scene.postProcesses.forEach((postProcess: any) => {
                    const filteredPostProcess: any = {};
                    for (const key of postProcessesKeys) {
                        let saveKey = key.startsWith('_') ? key.substring(1) : key;
                        filteredPostProcess[saveKey] = postProcess[key];
                        if (key === 'cameraId' && postProcess['_camera']) {
                            filteredPostProcess[saveKey] = postProcess['_camera'].id;
                        }
                        if (key === 'customType' && !postProcess['customType']) {
                            filteredPostProcess[saveKey] = 'BABYLON.PostProcess';
                        }
                    }
                    result.push(filteredPostProcess);
                });
                return result;
            })(),
            shadowGenerators: (() => {
                const shadowGeneratorsKeys = ['className', 'lightId', 'cameraId', 'id', 'mapSize', 'forceBackFacesOnly', 'darkness', 'transparencyShadow', 'frustumEdgeFalloff',
                    'bias', 'normalBias', 'usePercentageCloserFiltering', 'useContactHardeningShadow', 'contactHardeningLightSizeUVRatio', 'filteringQuality', 'useExponentialShadowMap',
                    'useCloseExponentialShadowMap', 'useBlurCloseExponentialShadowMap', 'usePoissonSampling', 'depthScale', 'blurBoxOffset', 'blurKernel', 'blurScale', 'useKernelBlur', 'renderList'];
                const result: any[] = [];
                scene.lights.forEach((light: any) => {
                    const lightShadowGenerators = light._shadowGenerators;
                    if (!lightShadowGenerators) return;
                    const processGenerator = (generator: any) => {
                        const filteredGenerator: any = {};
                        for (const key of shadowGeneratorsKeys) {
                            if (key === 'className') {
                                filteredGenerator.className = generator.getClassName();
                            } else if (key === 'lightId') {
                                filteredGenerator.lightId = generator.getLight()?.id;
                            } else if (key === 'renderList') {
                                const shadowMap = generator.getShadowMap?.();
                                filteredGenerator.renderList = shadowMap?.renderList ? shadowMap.renderList.map((mesh: any) => mesh.name) : [];
                            } else {
                                filteredGenerator[key] = generator[key];
                            }
                        }
                        result.push(filteredGenerator);
                    };
                    if (lightShadowGenerators instanceof Map) {
                        lightShadowGenerators.forEach(processGenerator);
                    } else {
                        Object.values(lightShadowGenerators).forEach(processGenerator);
                    }
                });
                return result;
            })()
        };

        // 开始流式写入
        if (!isTauriEnv) {
            // 浏览器环境：不进行写入，只提供示例
            let fullJson = '{}';

            const blob = new Blob([fullJson], { type: "application/json" });
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
            // Tauri 环境：流式写入，逐个处理每个字段
            await writeTextFile(savePath, '{\n', { append: false });
            writeBuffer = '';

            // 写入简单字段
            for (let i = 0; i < exportFieldGetters.length; i++) {
                const field = exportFieldGetters[i];
                writeBuffer += `  "${field.key}": `;
                await stringifyToBufferAsync(field.value, '  ', 0);
                writeBuffer += ',\n';
                await flushBuffer();
            }

            // 统一写入集合数据
            for (const key of Object.keys(collections)) {
                const data = collections[key as keyof typeof collections];
                if (data.length > 0) {
                    writeBuffer += `  "${key}": `;
                    await stringifyToBufferAsync(data, '  ', 0);
                    writeBuffer += ',\n';
                    await flushBuffer();
                }
            }

            // 流式写入 meshes（逐个处理，序列化后立即写入）
            let hasMeshes = false;

            for (const mesh of scene.meshes) {
                // 逐个序列化 mesh
                const meshInfo = mesh.serialize({});
                if (meshInfo) {
                    if (meshInfo.metadata && meshInfo.metadata.originalMeshData) {
                        // 将 originalMeshData 中的每个元素替换为其 metadata
                        meshInfo.metadata.originalMeshData = meshInfo.metadata.originalMeshData.map((data: any) => data?.metadata);
                    }
                    if (!hasMeshes) {
                        await writeTextFile(savePath, '  "meshes": [\n', { append: true });
                        hasMeshes = true;
                    }
                    // 写入单个 mesh
                    writeBuffer += '    ';
                    await stringifyToBufferAsync(meshInfo, '    ', 0);
                    writeBuffer += ',\n';
                    await flushBuffer();
                }
            }

            // 关闭 meshes 数组
            if (hasMeshes) {
                writeBuffer = writeBuffer.replace(/,\n$/, '\n');
                await writeTextFile(savePath, '  ],\n', { append: true });
                await flushBuffer();
            }

            // 流式写入 geometries（对象格式，包含多个数组）
            await writeTextFile(savePath, '  "geometries": {\n', { append: true });

            // 初始化各个类型的数组
            const geometriesData: any = { boxes: [], spheres: [], cylinders: [], toruses: [], grounds: [], planes: [], torusKnots: [], geometryData: [] };

            for (const mesh of scene.meshes) {
                const meshGeometries = mesh.geometry?.serialize();
                if (meshGeometries && meshGeometries.id) {
                    geometriesData.geometryData.push(meshGeometries);
                }
            }

            // 统一写入 geometries 字段
            const geometryKeys = Object.keys(geometriesData);
            for (let i = 0; i < geometryKeys.length; i++) {
                const key = geometryKeys[i];
                writeBuffer += `    "${key}": `;
                await stringifyToBufferAsync(geometriesData[key], '    ', 0);
                writeBuffer += i < geometryKeys.length - 1 ? ',\n' : '\n';
                await flushBuffer();
            }

            // 写入 geometryData
            writeBuffer += '    "geometryData": ';
            await stringifyToBufferAsync(geometriesData.geometryData, '    ', 0);
            writeBuffer += '\n';
            await flushBuffer();

            // 关闭 geometries 对象
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


