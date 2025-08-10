import { javascriptGenerator } from "blockly/javascript";
import * as Blockly from "blockly";
export function defineBlocklyCode() {
    javascriptGenerator.forBlock["set_bg_color"] = function (block) {
        const color = block.getFieldValue("BG_COLOUR");
        return `await setBgColor("${color}");\n`;
    };
    // generator.js
    javascriptGenerator.forBlock["show"] = function (block) {
        const meshName = block.getFieldValue("MODEL_VAR");
        return `await showModel(scene, "${meshName}");\n`;
    };
    // generator.js
    javascriptGenerator.forBlock["hide"] = function (block) {
        const meshName = block.getFieldValue("MODEL_VAR");
        return `await hideModel(scene, "${meshName}");\n`;
    };
    javascriptGenerator.forBlock["dispose"] = function (block) {
        const meshName = block.getFieldValue("MODEL_VAR");
        return `await disposeModel(scene, "${meshName}");\n`;
    };
    javascriptGenerator.forBlock["light_intensity"] = function (block) {
        const intensityValue = block.getInputTargetBlock("INTENSITY")?.getFieldValue("NUM");
        const intensity = intensityValue ?? 1; // 0 是有效值
        return `await lightIntensity(scene, ${Number(intensity)});\n`;
    };

    javascriptGenerator.forBlock["set_fog"] = function (block) {
        const color = block.getFieldValue("FOG_COLOUR");
        const FOG_MODE = block.getFieldValue("FOG_MODE");
        const densityValue = block.getInputTargetBlock("DENSITY")?.getFieldValue("NUM");
        const fogDensity = densityValue ?? 0.1; // 0 可能是有效的雾密度值
        return `await setFog(scene, "${color}","${FOG_MODE}",${Number(fogDensity)});\n`;
    };

    javascriptGenerator.forBlock["set_camera_alpha"] = function (block) {
        const alphaValue = block.getInputTargetBlock("ALPHA")?.getFieldValue("NUM");
        const alpha = alphaValue ?? 0; // 0 是有效的角度值
        return `await setCameraAlpha(scene, ${Number(alpha)});\n`;
    };

    javascriptGenerator.forBlock["set_camera_beta"] = function (block) {
        const betaValue = block.getInputTargetBlock("BETA")?.getFieldValue("NUM");
        const beta = betaValue ?? Math.PI / 3; // 0 是有效的角度值
        return `await setCameraBeta(scene, ${Number(beta)});\n`;
    };
    javascriptGenerator.forBlock["set_camera_inertia"] = function (block) {
        const inertiaValue = block.getInputTargetBlock("INERTIA")?.getFieldValue("NUM");
        // 使用 ?? 来处理 null/undefined，但保留 0 值
        const inertia = inertiaValue ?? 0.1;
        return `await setCameraInertia(scene, ${inertia});\n`;
    };
    javascriptGenerator.forBlock["camera_follow"] = function (block) {
        const meshName = block.getFieldValue("MODEL_VAR");
        const radius = Number(block.getInputTargetBlock("RADIUS")?.getFieldValue("NUM") || 5);
        return `await cameraFollow(scene, "${meshName}",${radius});\n`;
    };
    javascriptGenerator.forBlock["move_by_xyz"] = function (block) {
        const meshName = block.getFieldValue("BLOCK_NAME");
        const x = Number(block.getInputTargetBlock("X")?.getFieldValue("NUM") || 0);
        const y = Number(block.getInputTargetBlock("Y")?.getFieldValue("NUM") || 0);
        const z = Number(block.getInputTargetBlock("Z")?.getFieldValue("NUM") || 0);
        return `await moveByXYZ(scene, "${meshName}", { x: ${x}, y: ${y}, z: ${z} });\n`;
    };
    javascriptGenerator.forBlock["move_to_xyz"] = function (block) {
        const meshName = block.getFieldValue("MODEL");
        const x = Number(block.getInputTargetBlock("X")?.getFieldValue("NUM") || 0);
        const y = Number(block.getInputTargetBlock("Y")?.getFieldValue("NUM") || 0);
        const z = Number(block.getInputTargetBlock("Z")?.getFieldValue("NUM") || 0);
        const useY = block.getFieldValue("USE_Y") === "TRUE";
        return `await moveToXYZ(scene,"${meshName}", { x: ${x}, y: ${y}, z: ${z} },${useY});\n`;
    };
    javascriptGenerator.forBlock["rotate_anim_seconds"] = function (block) {
        const meshName = block.getFieldValue("MESH_VAR");
        const rotX = Number(block.getInputTargetBlock("ROT_X")?.getFieldValue("NUM") || 0);
        const rotY = Number(block.getInputTargetBlock("ROT_Y")?.getFieldValue("NUM") || 0);
        const rotZ = Number(block.getInputTargetBlock("ROT_Z")?.getFieldValue("NUM") || 0);
        const duration = Number(block.getInputTargetBlock("DURATION")?.getFieldValue("NUM") || 1);
        const reverse = block.getFieldValue("REVERSE") === "TRUE";
        const loop = block.getFieldValue("LOOP") === "TRUE";
        const easing = block.getFieldValue("EASING") || "Linear";
        return `await rotateAnim(scene, "${meshName}", { rotX: ${rotX}, rotY: ${rotY}, rotZ: ${rotZ}, duration: ${duration}, reverse: ${reverse}, loop: ${loop}, easing: "${easing}" });\n`;
    };
    javascriptGenerator.forBlock["move_anim_seconds"] = function (block) {
        const meshName = block.getFieldValue("MESH_VAR");
        const x = Number(block.getInputTargetBlock("ROT_X")?.getFieldValue("NUM") || 0);
        const y = Number(block.getInputTargetBlock("ROT_Y")?.getFieldValue("NUM") || 0);
        const z = Number(block.getInputTargetBlock("ROT_Z")?.getFieldValue("NUM") || 0);
        const duration = Number(block.getInputTargetBlock("DURATION")?.getFieldValue("NUM") || 1);
        const reverse = block.getFieldValue("REVERSE") === "TRUE";
        const loop = block.getFieldValue("LOOP") === "TRUE";
        const easing = block.getFieldValue("EASING") || "Linear";
        return `await moveAnim(scene, "${meshName}", { rotX: ${x}, rotY: ${y}, rotZ: ${z}, duration: ${duration}, reverse: ${reverse}, loop: ${loop}, easing: "${easing}" });\n`;
    };
    javascriptGenerator.forBlock["move_to"] = function (block) {
        const model1 = block.getFieldValue("MODEL1");
        const model2 = block.getFieldValue("MODEL2");
        const useY = block.getFieldValue("USE_Y") === "TRUE";
        return `await moveToModel(scene, "${model1}", "${model2}", ${useY});\n`;
    };
    javascriptGenerator.forBlock["rotate_model_xyz"] = function (block) {
        const meshName = block.getFieldValue("MODEL");
        const x = Number(block.getInputTargetBlock("X")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        const y = Number(block.getInputTargetBlock("Y")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        const z = Number(block.getInputTargetBlock("Z")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        return `await rotateModelXYZ(scene, "${meshName}", ${x}, ${y}, ${z});\n`;
    };
    javascriptGenerator.forBlock["rotate_to"] = function (block) {
        const meshName = block.getFieldValue("MODEL");
        const x = Number(block.getInputTargetBlock("X")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        const y = Number(block.getInputTargetBlock("Y")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        const z = Number(block.getInputTargetBlock("Z")?.getFieldValue("NUM") || 0) * Math.PI / 180;
        return `await rotateTo(scene, "${meshName}", ${x}, ${y}, ${z});\n`;
    };
    javascriptGenerator.forBlock["look_at"] = function (block) {
        const model1 = block.getFieldValue("MODEL1");
        const model2 = block.getFieldValue("MODEL2");
        const useY = block.getFieldValue("USE_Y") === "TRUE";
        return `await lookAtModel(scene, "${model1}", "${model2}", ${useY});\n`;
    };
    javascriptGenerator.forBlock["scale"] = function (block) {
        const meshName = block.getFieldValue("BLOCK_NAME");
        const x = Number(block.getInputTargetBlock("X")?.getFieldValue("NUM") ?? 1);
        const y = Number(block.getInputTargetBlock("Y")?.getFieldValue("NUM") ?? 1);
        const z = Number(block.getInputTargetBlock("Z")?.getFieldValue("NUM") ?? 1);
        return `await scaleModel(scene, "${meshName}", ${x}, ${y}, ${z});\n`;
    };
    javascriptGenerator.forBlock["move_forward"] = function (block) {
        const meshName = block.getFieldValue("MODEL");
        const direction = block.getFieldValue("DIRECTION");
        const speed = Number(block.getInputTargetBlock("SPEED")?.getFieldValue("NUM") || 0);
        return `await moveForward(scene, "${meshName}", "${direction}", ${speed});\n`;
    };
    javascriptGenerator.forBlock["set_pivot"] = function (block) {
        const meshName = block.getFieldValue("MESH");
        const x = Number(block.getInputTargetBlock("X_PIVOT")?.getFieldValue("NUM") || 0);
        const y = Number(block.getInputTargetBlock("Y_PIVOT")?.getFieldValue("NUM") || 0);
        const z = Number(block.getInputTargetBlock("Z_PIVOT")?.getFieldValue("NUM") || 0);
        return `await setPivot(scene, "${meshName}", ${x}, ${y}, ${z});\n`;
    };
    javascriptGenerator.forBlock["wait_seconds"] = function (block) {
        const time = Number(block.getInputTargetBlock("TIME")?.getFieldValue("NUM") || 1)
        return `await waitSeconds(${time});\n`;
    };
    javascriptGenerator.forBlock["wait_until"] = function (block) {
        const condition =
            javascriptGenerator.valueToCode(
                block,
                "CONDITION",
                javascriptGenerator.ORDER_ATOMIC,
            ) || "false"; // Default to false if no condition is connected

        return `await waitUntil(() => ${condition});\n`;
    };
    javascriptGenerator.forBlock['controls_for'] = function (block) {
        // 获取循环变量
        const variable = javascriptGenerator.nameDB_.getName(
            block.getFieldValue('VAR'),
            Blockly.VARIABLE_CATEGORY_NAME
        );

        // 获取循环参数
        const fromValue = javascriptGenerator.valueToCode(
            block, 'FROM', javascriptGenerator.ORDER_ASSIGNMENT
        ) || '0';

        const toValue = javascriptGenerator.valueToCode(
            block, 'TO', javascriptGenerator.ORDER_ASSIGNMENT
        ) || '0';

        const byValue = javascriptGenerator.valueToCode(
            block, 'BY', javascriptGenerator.ORDER_ASSIGNMENT
        ) || '1';

        // 获取循环体代码
        const branch = javascriptGenerator.statementToCode(block, 'DO');

        // 生成顺序执行的异步循环代码
        const code = `
            for (let ${variable} = ${fromValue}; ${variable} <= ${toValue}; ${variable} += ${byValue}) {
                if(window.isAnimationStopped) break; 
                await (async () => {
                    ${branch}
                    })();
                }`;

        return code;
    };
    javascriptGenerator.forBlock['controls_whileUntil'] = function (block) {
        // 判断类型：WHILE 或 UNTIL
        const until = block.getFieldValue('MODE') === 'UNTIL';
        let condition = javascriptGenerator.valueToCode(block, 'BOOL', javascriptGenerator.ORDER_NONE) || 'false';
        // UNTIL 逻辑需要取反
        if (until) {
            condition = `!(${condition})`;
        }
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        // 支持动画中断
        const code = `
            while (${condition}) {
                if(window.isAnimationStopped) break;
                await (async () => {
                    ${branch}
                })();
            }
        `;
        return code;
    };
    javascriptGenerator.forBlock['controls_repeat_ext'] = function (block) {
        const timesValue = javascriptGenerator.valueToCode(
            block, 'TIMES', javascriptGenerator.ORDER_ASSIGNMENT
        ) || '0';

        const branch = javascriptGenerator.statementToCode(block, 'DO');

        const code = `
            for (let count = 0; count < ${timesValue}; count++) {
                if(window.isAnimationStopped) break; 
                await (async () => {
                    ${branch}
                    })();
                }`;

        return code;
    };
    javascriptGenerator.forBlock['controls_forEach'] = function (block) {
        const variable = javascriptGenerator.nameDB_.getName(
            block.getFieldValue('VAR'),
            Blockly.VARIABLE_CATEGORY_NAME
        );
        const list = javascriptGenerator.valueToCode(
            block, 'LIST', javascriptGenerator.ORDER_ASSIGNMENT
        ) || '[]';
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        // 支持动画中断
        const code = `
            for (const ${variable} of ${list}) {
                if(window.isAnimationStopped) break;
                await (async () => {
                    ${branch}
                })();
            }
        `;
        return code;
    };
    javascriptGenerator.forBlock["to_number"] = function (block) {
        const string = javascriptGenerator.valueToCode(
            block,
            "STRING",
            javascriptGenerator.ORDER_ATOMIC,
        );
        const conversionType = block.getFieldValue("TYPE");

        let code;
        if (conversionType === "INT") {
            code = `parseInt(${string})`;
        } else {
            code = `parseFloat(${string})`;
        }

        return [code, javascriptGenerator.ORDER_NONE];
    };

    javascriptGenerator.forBlock['math_string'] = function (block) {
        const text = block.getFieldValue('TEXT') || '';
        const code = `"${text}"`;
        return [code, javascriptGenerator.ORDER_ATOMIC];
    };
    javascriptGenerator.forBlock["set_alpha"] = function (block) {
        const meshName = block.getFieldValue("MESH_VAR");
        const alpha = block.getInputTargetBlock("ALPHA")?.getFieldValue("NUM");
        return `await setAlpha(scene, "${meshName}","${alpha}");\n`;
    };
}
