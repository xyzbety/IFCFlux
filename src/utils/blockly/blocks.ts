import * as Blockly from "blockly";
import * as zh from "blockly/msg/zh-hans";
import * as BABYLON from "@babylonjs/core";
import { registerFieldColour } from "@blockly/field-colour";
import { toolbox } from "./toolbox.ts";
import { rgbToHex } from "../index.ts";
import { defineBlocklyCode } from "./generator.ts"

registerFieldColour();
let workspace = Blockly.getMainWorkspace();

export function defineBlocks(colour: string, scene?: BABYLON.Scene) {

  Blockly.Blocks["set_bg_color"] = {
    init: function () {
      this.jsonInit({
        type: "set_bg_color",
        message0: "设置背景颜色为 %1 %2",
        args0: [
          {
            type: "field_colour",
            name: "BG_COLOUR",
            colour: colour
          },
          {
            type: "input_dummy",
            name: "NAME"
          }
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "设置场景的背景颜色。",
      });
    },
  };
  Blockly.Blocks["show"] = {
    init: function () {
      this.jsonInit({
        type: "show",
        message0: "展示 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "展示选中的模型。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["hide"] = {
    init: function () {
      this.jsonInit({
        type: "hide",
        message0: "隐藏 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "隐藏选中的模型。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["dispose"] = {
    init: function () {
      this.jsonInit({
        type: "dispose",
        message0: "销毁 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "销毁选中的模型。",
        helpUrl: "",
      });
    },
  };
    Blockly.Blocks["set_alpha"] = {
    init: function () {
      this.jsonInit({
        type: "set_mesh_material_alpha",
        message0: "设置 %1 的透明度为 %2",
        args0: [
          {
            type: "field_dropdown",
            name: "MESH_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "ALPHA",
            check: "Number",
          },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "设置模型的透明度。",
      });
    },
  };
  Blockly.Blocks["light_intensity"] = {
    init: function () {
      this.jsonInit({
        type: "light_intensity",
        message0: "设置光源强度为 %1",
        args0: [
          {
            type: "input_value",
            name: "INTENSITY",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        inputsInline: true,
        tooltip: "设置场景中主光源的强度。",
      });
    },
  };
  Blockly.Blocks["set_fog"] = {
    init: function () {
      this.jsonInit({
        type: "set_fog",
        message0: "设置雾效颜色为 %1 模式为 %2 密度 %3",
        args0: [
          {
            type: "field_colour",
            name: "FOG_COLOUR",
            colour: "#25479e"
          },
          {
            type: "field_dropdown",
            name: "FOG_MODE",
            options: [
              ["线性", "LINEAR"],
              ["无雾效", "NONE"],
              ["指数", "EXP"],
              ["指数平方", "EXP2"],
            ],
          },
          {
            type: "input_value",
            name: "DENSITY",
            check: "Number",
          },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: 60,
        tooltip: "配置场景的雾效，包括颜色、模式和密度。",
      });
    },
  };
  Blockly.Blocks["camera_follow"] = {
    init: function () {
      this.jsonInit({
        type: "camera_follow",
        message0: '使相机以 %1 为中心，半径为 %2 ',
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "RADIUS",
            check: "Number",
            align: "RIGHT",
          }
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 15,
        inputsInline: true,
        tooltip: '使相机以自定义的距离跟随模型。',
      });
    },
  };
  Blockly.Blocks["set_camera_alpha"] = {
    init: function () {
      this.jsonInit({
        type: "set_camera_alpha",
        message0: "设置相机的alpha为 %1",
        args0: [
          {
            type: "input_value",
            name: "ALPHA",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 15,
        inputsInline: true,
        tooltip: "设置场景中相机的alpha。",
      });
    },
  };
  Blockly.Blocks["set_camera_beta"] = {
    init: function () {
      this.jsonInit({
        type: "set_camera_beta",
        message0: "设置相机的beta为 %1",
        args0: [
          {
            type: "input_value",
            name: "BETA",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 15,
        inputsInline: true,
        tooltip: "设置场景中相机的beta。",
      });
    },
  };
  Blockly.Blocks["set_camera_inertia"] = {
    init: function () {
      this.jsonInit({
        type: "set_camera_inertia",
        message0: "设置相机的惯性系数为 %1",
        args0: [
          {
            type: "input_value",
            name: "INERTIA",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 15,
        inputsInline: true,
        tooltip: "设置场景中相机的惯性系数（0-0.99）。",
      });
    },
  };
  // 为 math_number 字段添加验证器
  Blockly.FieldNumber.prototype.doClassValidation_ = function (newValue) {
    if (newValue === null) {
      return null;
    }

    // 限制相机惯性在 0-0.99 范围内
    if (this.sourceBlock_ && this.sourceBlock_.type === 'math_number') {
      const parentBlock = this.sourceBlock_.getParent();
      if (parentBlock && parentBlock.type === 'set_camera_inertia') {
        newValue = Math.max(0, Math.min(newValue, 0.99));
      }
    }

    return newValue;
  };
  Blockly.Blocks["move_by_xyz"] = {
    init: function () {
      this.jsonInit({
        type: "move_by_xyz",
        message0: "将 %1 原位置上增加移动 x: %2 y: %3 z: %4",
        args0: [
          {
            type: "field_dropdown",
            name: "BLOCK_NAME",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "X",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Y",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Z",
            check: "Number",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "将模型在 x、y、z 方向上移动指定的距离。",
      });
    },
  };
  Blockly.Blocks["move_to_xyz"] = {
    init: function () {
      this.jsonInit({
        type: "move_to_xyz",
        message0: "将 %1 移动到 x: %2 y: %3 z: %4 y 启用 %5",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "X",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Y",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Z",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "field_checkbox",
            name: "USE_Y",
            checked: true,
            text: "Use Y axis",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "将模型移动到指定坐标，可选择是否启用 Y 轴。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["move_to"] = {
    init: function () {
      this.jsonInit({
        type: "move_to",
        message0: "将 %1 移动到 %2 y 启用 %3",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL1",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "field_dropdown",
            name: "MODEL2",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "field_checkbox",
            name: "USE_Y",
            checked: false,
            text: "Use Y axis",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "将第一个模型移动到第二个模型的位置。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["rotate_model_xyz"] = {
    init: function () {
      this.jsonInit({
        type: "rotate_model_xyz",
        message0: "将 %1 在原位置上增加旋转 x: %2 y: %3 z: %4",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "X",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Y",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Z",
            check: "Number",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "在模型当前旋转的基础上，增加指定的 x、y、z 旋转值。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["rotate_to"] = {
    init: function () {
      this.jsonInit({
        type: "rotate_to",
        message0: "将 %1 直接旋转到 x: %2 y: %3 z: %4",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "X",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Y",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "Z",
            check: "Number",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip: "将模型旋转到面向指定的坐标。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["look_at"] = {
    init: function () {
      this.jsonInit({
        type: "look_at",
        message0: "让 %1 看向 %2 y 启用 %3",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL1",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "field_dropdown",
            name: "MODEL2",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "field_checkbox",
            name: "USE_Y",
            checked: false,
            text: "Use Y axis",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "让第一个模型朝向第二个模型的位置旋转。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["scale"] = {
    init: function () {
      this.jsonInit({
        type: "scale",
        message0: "缩放 %1 比例为 x: %2 y: %3 z: %4",
        args0: [
          {
            type: "field_dropdown",
            name: "BLOCK_NAME",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "X",
            check: "Number",
          },
          {
            type: "input_value",
            name: "Y",
            check: "Number",
          },
          {
            type: "input_value",
            name: "Z",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        inputsInline: true,
        tooltip:
          "按指定比例缩放模型，并控制缩放原点。",
      });
    },
  };
  Blockly.Blocks["move_forward"] = {
    init: function () {
      this.jsonInit({
        type: "move",
        message0: "%2 移动 %1 速度为 %3",
        args0: [
          {
            type: "field_dropdown",
            name: "MODEL",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "field_dropdown",
            name: "DIRECTION",
            options: [
              ["前进", "forward"],
              ["侧移", "sideways"],
              ["平移", "strafe"],
            ],
          },
          {
            type: "input_value",
            name: "SPEED",
            check: "Number",
          },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        tooltip:
          "按指定方向移动模型。“前进”表示沿模型朝向移动，“侧移”表示相对于相机方向移动，“平移”表示沿相机侧向移动。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["set_pivot"] = {
    init: function () {
      this.jsonInit({
        type: "set_pivot",
        message0: "设置 %1 的旋转中心为 x: %2 y: %3 z: %4",
        args0: [
          {
            type: "field_dropdown",
            name: "MESH",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]], // Assuming the mesh is stored here
          },
          {
            type: "input_value",
            name: "X_PIVOT",
            check: ["Number", "String"],
          },
          {
            type: "input_value",
            name: "Y_PIVOT",
            check: ["Number", "String"],
          },
          {
            type: "input_value",
            name: "Z_PIVOT",
            check: ["Number", "String"],
          },
        ],
        inputsInline: true,
        previousStatement: null,
        nextStatement: null,
        colour: 165,
        tooltip: "设置网格的旋转中心（x、y、z 轴）。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["min_centre_max"] = {
    init: function () {
      this.jsonInit({
        type: "min_centre_max",
        message0: "%1",
        args0: [
          {
            type: "field_dropdown",
            name: "PIVOT_OPTION",
            options: [
              ["最小值", "MIN"],
              ["中心值", "CENTER"],
              ["最大值", "MAX"],
            ],
          },
        ],
        output: "String", // Now returns a symbolic string
        colour: 165,
        tooltip: "选择最小值、中心或最大值作为旋转中心。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["rotate_anim_seconds"] = {
    init: function () {
      this.jsonInit({
        type: "rotate_anim_seconds",
        message0:
          "旋转 %1 到 x %2 y %3 z %4 \n在 %5 秒内 \n 反转 %6 循环 %7 缓动函数  %8",
        args0: [
          {
            type: "field_dropdown",
            name: "MESH_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "ROT_X",
            check: "Number",
          },
          {
            type: "input_value",
            name: "ROT_Y",
            check: "Number",
          },
          {
            type: "input_value",
            name: "ROT_Z",
            check: "Number",
          },
          {
            type: "input_value",
            name: "DURATION",
            check: "Number",
          },
          {
            type: "field_checkbox",
            name: "REVERSE",
            checked: false,
            text: "reverse",
          },
          {
            type: "field_checkbox",
            name: "LOOP",
            checked: false,
            text: "loop",
          },
          {
            type: "field_dropdown",
            name: "EASING",
            options: [
              ["线性缓动", "Linear"],
              ["正弦缓动", "SineEase"],
              ["三次缓动", "CubicEase"],
              ["二次缓动", "QuadraticEase"],
              ["指数缓动", "ExponentialEase"],
              ["弹跳缓动", "BounceEase"],
              ["弹性缓动", "ElasticEase"],
              ["回退缓动", "BackEase"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 330,
        tooltip:
          "在指定时间内将模型旋转到目标角度，可选择反转、循环和缓动函数。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["move_anim_seconds"] = {
    init: function () {
      this.jsonInit({
        type: "move_anim_seconds",
        message0:
          "移动 %1 到 x %2 y %3 z %4 \n在 %5 秒内 \n反转 %6 循环 %7 缓动函数 %8",
        args0: [
          {
            type: "field_dropdown",
            name: "MESH_VAR",
            options: scene
              ? Array.from(
                new Set(scene.meshes.map(mesh => mesh.name))
              ).map(name => [name, name])
              : [["Mesh", "Mesh"]],
          },
          {
            type: "input_value",
            name: "ROT_X",
            check: "Number",
          },
          {
            type: "input_value",
            name: "ROT_Y",
            check: "Number",
          },
          {
            type: "input_value",
            name: "ROT_Z",
            check: "Number",
          },
          {
            type: "input_value",
            name: "DURATION",
            check: "Number",
          },
          {
            type: "field_checkbox",
            name: "REVERSE",
            checked: false,
            text: "reverse",
          },
          {
            type: "field_checkbox",
            name: "LOOP",
            checked: false,
            text: "loop",
          },
          {
            type: "field_dropdown",
            name: "EASING",
            options: [
              ["线性缓动", "Linear"],
              ["正弦缓动", "SineEase"],
              ["三次缓动", "CubicEase"],
              ["二次缓动", "QuadraticEase"],
              ["指数缓动", "ExponentialEase"],
              ["弹跳缓动", "BounceEase"],
              ["弹性缓动", "ElasticEase"],
              ["回退缓动", "BackEase"],
            ],
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 330,
        tooltip:
          "在指定时间内将模型移动到目标位置，可选择反转、循环和缓动函数。",
        helpUrl: "",
      });
    },
  };
  Blockly.Blocks["wait_seconds"] = {
    init: function () {
      this.jsonInit({
        type: "wait_seconds",
        message0: "等待 %1 秒",
        args0: [
          {
            type: "input_value",
            name: "TIME",
            check: "Number",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        inputsInline: true,
        tooltip: "等待指定时间。",
      });
    },
  };
  Blockly.Blocks["wait_until"] = {
    init: function () {
      this.jsonInit({
        type: "wait_until",
        message0: "等待直到 %1",
        args0: [
          {
            type: "input_value",
            name: "CONDITION",
            check: "Boolean",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 120,
        tooltip: "",
      });
    },
  };

  Blockly.Blocks["math_string"] = {
    init: function () {
      this.jsonInit({
        type: "math_string",
        message0: "%1",
        args0: [
          {
            type: "field_input", // 使用 field_input 允许输入字符串
            name: "TEXT",
            text: "123"
          }
        ],
        output: "String",
        colour: 230,
        tooltip: "字符串。",
        helpUrl: ""
      });
    }
  };

  Blockly.Blocks["to_number"] = {
    init: function () {
      this.jsonInit({
        type: "to_number",
        message0: "转换 %1 为 %2",
        args0: [
          {
            type: "input_value",
            name: "STRING",
            check: "String",
          },
          {
            type: "field_dropdown",
            name: "TYPE",
            options: [
              ["integer", "INT"],
              ["float", "FLOAT"],
            ],
          },
        ],
        inputsInline: true,
        output: "Number",
        colour: 230,
        tooltip: "将字符串转换为数字或者浮点数。",
      });
    },
  };
};

export function initBlocks(scene?: BABYLON.Scene) {
  Blockly.setLocale(zh);
  const khanonjs = document.getElementById("khanonjs") as HTMLCanvasElement;
  const bgColor = window.getComputedStyle(khanonjs).backgroundColor;
  // 如果已存在 workspace，先销毁
  if (workspace) {
    workspace.dispose();
  }
  const theme = Blockly.Theme.defineTheme('my-theme', {
    base: Blockly.Themes.Classic,
    categoryStyles: {
      scene_category: {
        colour: "#a2a564"
      },
      camera_category: {
        colour: "#a46f5d"
      },
      transforms_category: {
        colour: "#5ca494"
      },
      animation_category: {
        colour: "#a55b80"
      },
      control_category: {
        colour: "#2c8d39"
      },
      math_category: {
        colour: "#5f64a0"
      }
    },
    fontStyle: { size: 8 },
    name: "my-theme"
  });
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: toolbox,
    sounds: false,
    theme: theme,
    zoom: {
      controls: false,
      wheel: false,
      // startScale: 0.7,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2,
    },
    // renderer: 'zelos'
  });
  defineBlocks(rgbToHex(bgColor), scene)
  defineBlocklyCode()

  // 监听 blocklyFlyout 的 style.display 变化，并同步 blocklyScrollbarVertical 的显示状态
  const blocklyFlyout = document.getElementsByClassName("blocklyFlyout")[1];
  const blocklyScrollbarVertical = document.getElementsByClassName("blocklyScrollbarVertical")[2];
  if (blocklyFlyout && blocklyScrollbarVertical) {
    // 创建一个 MutationObserver 监听 style 属性变化
    const observer = new MutationObserver(() => {
      const flyoutDisplay = window.getComputedStyle(blocklyFlyout).display;
      if (flyoutDisplay === "none") {
        blocklyScrollbarVertical.style.display = "none";
      } else {
        blocklyScrollbarVertical.style.display = "";
      }
    });

    observer.observe(blocklyFlyout, { attributes: true, attributeFilter: ["style"] });
  }
}

export { workspace };
