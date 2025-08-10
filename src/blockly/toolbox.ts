

export const toolbox = {
    kind: "categoryToolbox",
    contents: [
        {
            kind: "category",
            name: "场景",
            categorystyle: "scene_category",
            contents: [
                {
                    kind: "block",
                    type: "set_bg_color",
                },
                {
                    kind: "block",
                    type: "show",
                },
                {
                    kind: "block",
                    type: "hide",
                },
                {
                    kind: "block",
                    type: "dispose",
                },
                {
                    kind: "block",
                    type: "set_alpha",
                    keyword: "alpha",
                    inputs: {
                        ALPHA: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0.5,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "light_intensity",
                    keyword: "intensity",
                    inputs: {
                        INTENSITY: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "set_fog",
                    keyword: "fog",
                    inputs: {
                        DENSITY: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0.1,
                                },
                            },
                        },
                    },
                },
            ]
        },
        {
            kind: "category",
            name: "相机",
            categorystyle: "camera_category",
            contents: [
                {
                    kind: "block",
                    type: "set_camera_alpha",
                    keyword: "alpha",
                    inputs: {
                        ALPHA: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "set_camera_beta",
                    keyword: "beta",
                    inputs: {
                        BETA: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "set_camera_inertia",
                    keyword: "INERTIA",
                    inputs: {
                        INERTIA: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0.5,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "camera_follow",
                    keyword: "follow",
                    inputs: {
                        RADIUS: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 100,
                                },
                            },
                        },
                    },
                },
            ]
        },
        {
            kind: "category",
            name: "变换",
            categorystyle: "transforms_category",
            contents: [
                {
                    kind: "block",
                    type: "move_by_xyz",
                    keyword: "move",
                    inputs: {
                        X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "move_to_xyz",
                    keyword: "pos",
                    inputs: {
                        X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "move_to",
                    keyword: "goto",
                },
                {
                    kind: "block",
                    type: "rotate_model_xyz",
                    keyword: "rotate",
                    inputs: {
                        X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 45,
                                },
                            },
                        },
                        Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "rotate_to",
                    keyword: "rxyz",
                    inputs: {
                        X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "look_at",
                    keyword: "look",
                },
                {
                    kind: "block",
                    type: "scale",
                    keyword: "scale",
                    inputs: {
                        X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "move_forward",
                    keyword: "forward",
                    inputs: {
                        SPEED: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 3,
                                },
                            },
                        },
                    },
                },
            ],
        },
        {
            kind: "category",
            name: "动画",
            categorystyle: "animation_category",
            contents: [
                {
                    kind: "block",
                    type: "rotate_anim_seconds",
                    keyword: "rotate",
                    inputs: {
                        ROT_X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for X-axis
                                },
                            },
                        },
                        ROT_Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for Y-axis
                                },
                            },
                        },
                        ROT_Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for Z-axis
                                },
                            },
                        },
                        DURATION: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 3,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "move_anim_seconds",
                    keyword: "move",
                    inputs: {
                        ROT_X: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for X-axis
                                },
                            },
                        },
                        ROT_Y: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for Y-axis
                                },
                            },
                        },
                        ROT_Z: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1, // Default rotation for Z-axis
                                },
                            },
                        },
                        DURATION: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 3,
                                },
                            },
                        },
                    },
                },
            ]
        },
        {
            kind: "category",
            name: "循环",
            categorystyle: "loop_category",
            contents: [
                {
                    kind: "block",
                    type: "wait_seconds",
                    keyword: "TIME",
                    inputs: {
                        TIME: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0.5,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "wait_until",
                    keyword: "until",
                },
                {
                    kind: "block",
                    type: "controls_repeat_ext",
                    keyword: "repeat",
                    inputs: {
                        TIMES: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 10,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "controls_whileUntil",
                    keyword: "while",
                },
                {
                    kind: "block",
                    type: "controls_for",
                    keyword: "for",
                    inputs: {
                        FROM: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 0,
                                },
                            },
                        },
                        TO: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 9,
                                },
                            },
                        },
                        BY: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "controls_forEach",
                    keyword: "each",
                },
                {
                    kind: "block",
                    type: "controls_flow_statements",
                    keyword: "break",
                },
            ],
        },
        {
            kind: "category",
            name: "数学",
            categorystyle: "math_category",
            contents: [
                {
                    kind: "block",
                    type: "math_arithmetic",
                    keyword: "math",
                    fields: {
                        OP: "ADD",
                    },
                    inputs: {
                        A: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        B: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_random_int",
                    keyword: "randint",
                    inputs: {
                        FROM: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        TO: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 100,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_string",
                    keyword: "string",
                },
                {
                    kind: "block",
                    type: "math_number",
                    keyword: "num",
                    fields: {
                        NUM: 0,
                    },
                },
                {
                    kind: "block",
                    type: "to_number",
                    keyword: "ton",
                },
                {
                    kind: "block",
                    type: "math_constant",
                    keyword: "pi",
                },
                {
                    kind: "block",
                    type: "math_number_property",
                    keyword: "even",
                },
                {
                    kind: "block",
                    type: "math_round",
                    keyword: "round",
                },
                {
                    kind: "block",
                    type: "math_single",
                    keyword: "abs",
                    fields: {
                        OP: "ABS",
                    },
                },
                {
                    kind: "block",
                    type: "math_trig",
                    keyword: "trig",
                },
                {
                    kind: "block",
                    type: "math_on_list",
                    keyword: "lmath",
                },
                {
                    kind: "block",
                    type: "math_modulo",
                    keyword: "mod",
                },
                {
                    kind: "block",
                    type: "math_constrain",
                    keyword: "constrain",
                    inputs: {
                        LOW: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 1,
                                },
                            },
                        },
                        HIGH: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: 100,
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "math_random_float",
                    keyword: "randf",
                },
            ],
        },
        {
            kind: "category",
            name: "列表",
            categorystyle: "list_category",
            contents: [
                {
                    kind: "block",
                    type: "lists_create_empty",
                    keyword: "list",
                },
                {
                    kind: "block",
                    type: "lists_create_with",
                    inline: true,
                    inputs: {},
                    keyword: "these",
                },
                {
                    kind: "block",
                    type: "lists_repeat",
                    keyword: "item*",
                },
                {
                    kind: "block",
                    type: "lists_length",
                    keyword: "items",
                },
                {
                    kind: "block",
                    type: "lists_isEmpty",
                    keyword: "noitems",
                },
                {
                    kind: "block",
                    type: "lists_indexOf",
                    keyword: "find",
                },
                {
                    kind: "block",
                    type: "lists_getIndex",
                    keyword: "lget",
                },
                {
                    kind: "block",
                    type: "lists_setIndex",
                    keyword: "lset",
                },
                {
                    kind: "block",
                    type: "lists_getSublist",
                    keyword: "sublist",
                },
                {
                    kind: "block",
                    type: "lists_split",
                    keyword: "split",
                },
                {
                    kind: "block",
                    type: "lists_sort",
                    keyword: "sort",
                },
            ],
        },
        {
            kind: "category",
            name: "逻辑",
            categorystyle: "logic_category",
            contents: [
                {
                    kind: "block",
                    type: "controls_if",
                    keyword: "if",
                },
                {
                    kind: "block",
                    type: "logic_compare",
                    keyword: "compare",
                    inputs: {
                        B: {
                            shadow: {
                                type: "math_number",
                                fields: {
                                    NUM: "0",
                                },
                            },
                        },
                    },
                },
                {
                    kind: "block",
                    type: "logic_operation",
                    keyword: "op",
                },
                {
                    kind: "block",
                    type: "logic_negate",
                    keyword: "not",
                },
                {
                    kind: "block",
                    type: "logic_boolean",
                    keyword: "bool",
                },
                {
                    kind: "block",
                    type: "logic_null",
                    keyword: "null",
                },
                {
                    kind: "block",
                    type: "logic_ternary",
                    keyword: "ternary",
                },
            ],
        },
    ]
};
