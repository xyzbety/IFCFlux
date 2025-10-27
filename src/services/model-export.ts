import { MessagePlugin } from 'tdesign-vue-next';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import * as BABYLON from '@babylonjs/core';
import { GLTF2Export } from "@babylonjs/serializers";
import { IFCParser2DB } from '../utils/ifc/IfcParserToDb';

export async function exportGLB(scene: any, fileNameWithoutExtension: string, isTauriEnv: boolean, saveDialogConfig: any) {
    let savePath: string | null = '';
    if (isTauriEnv) {
        savePath = await save(saveDialogConfig);
        if (!savePath) {
            MessagePlugin.info({ content: '用户取消导出', duration: 1000 });
            return;
        }
        MessagePlugin.loading({
            content: '正在导出glb文件，请稍候...',
            duration: 0,
            closeBtn: true
        });
    }

    const options = {
        shouldExportNode: (node: any) => {
            if (node instanceof BABYLON.Mesh) {
                return node.isEnabled() && node.getTotalVertices() > 0;
            }
            return true;
        }
    };

    const exportResult = await GLTF2Export.GLBAsync(scene, fileNameWithoutExtension, options);
    const exportFile = exportResult.files[`${fileNameWithoutExtension}.glb`];
    if (!(exportFile instanceof Blob)) {
        throw new Error("导出的 GLB 文件格式无效");
    }

    if (!isTauriEnv) {
        exportResult.downloadFiles();
    } else {
        const arrayBuffer = await exportFile.arrayBuffer();
        await writeFile(savePath, new Uint8Array(arrayBuffer));
        MessagePlugin.closeAll();
        MessagePlugin.success({ content: '导出成功！', duration: 2000 });
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

    const exportDataScene = BABYLON.SceneSerializer.Serialize(scene);
    const seenObjects = new WeakSet();
    // 自定义 replacer 函数
    const replacer = (key: string, value: any): any => {
        if (typeof value === 'object' && value !== null) {
            if (seenObjects.has(value)) {
                return '[Circular]';
            }
            seenObjects.add(value);
        }
        return value;
    };

    if (!isTauriEnv) {
        // 浏览器环境：分块处理超大对象
        try {
            let exportFile = '';
            const keys = Object.keys(exportDataScene);
            let isFirstField = true;

            exportFile += '{' + '\n';
            for (const key of keys) {
                const value = exportDataScene[key];
                if (value === undefined) continue;

                try {
                    const valueString = JSON.stringify(value, replacer, 2);
                    const fieldLine = `  "${key}": ${valueString}`;
                    exportFile += isFirstField ? fieldLine : `,${'\n'}${fieldLine}`;
                    isFirstField = false;
                } catch (error) {
                    console.error(`字段 ${key} 序列化失败:`, error);
                    MessagePlugin.error({ content: `导出字段 ${key} 时出错`, duration: 3000 });
                }
            }
            exportFile += '\n}';

            // 使用 Blob 下载
            const blob = new Blob([exportFile], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileNameWithoutExtension}.json`;
            document.body.appendChild(a);
            a.click();

            // 清理资源
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            MessagePlugin.success({ content: '导出成功！', duration: 2000 });
        } catch (error) {
            console.error('浏览器导出失败:', error);
            MessagePlugin.error({ content: '导出失败', duration: 3000 });
        }
    } else {
        // Tauri 环境：分块写入文件
        try {
            await writeTextFile(savePath, "{\n", { append: false });
            const keys = Object.keys(exportDataScene);
            let isFirstField = true;

            for (const key of keys) {
                try {
                    const value = exportDataScene[key];
                    if (value === undefined) continue;

                    const valueString = JSON.stringify(value, replacer, 2);
                    const fieldLine = `  "${key}": ${valueString}`;
                    const formattedLine = isFirstField ? fieldLine : `,\n${fieldLine}`;

                    await writeTextFile(savePath, formattedLine, { append: true });
                    isFirstField = false;
                } catch (error) {
                    console.error(`字段 ${key} 序列化失败:`, error);
                    MessagePlugin.error({ content: `导出字段 ${key} 时出错`, duration: 3000 });
                }
            }

            await writeTextFile(savePath, "\n}", { append: true });
            MessagePlugin.closeAll();
            MessagePlugin.success({ content: '导出成功！', duration: 2000 });
        } catch (error) {
            console.error('Tauri 导出失败:', error);
            MessagePlugin.error({ content: '导出失败', duration: 3000 });
        }
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