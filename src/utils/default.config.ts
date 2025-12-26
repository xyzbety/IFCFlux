export default {
  dataSource: [{
    label: '查看',
    ribbonGroups: [{
      label: '导航控制',
      icon: 'select material-icons',
      ribbonItems: [
        {
          label: '平移',
          icon: 'pan_tool material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '旋转',
          icon: 'rotate material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },

        {
          label: '放大',
          icon: 'zoom_out_map material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '缩小',
          icon: 'zoom_in_map material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '向左旋转',
          icon: 'rotate_left material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '向右旋转',
          icon: 'rotate_right material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },]
    },
    {
      label: '视图',
      icon: 'view material-icons',
      ribbonItems: [{
        label: '默认视图',
        icon: 'default_view material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        type: 'group',
        direction: 'vertical',
        ribbonItems: [
          {
            label: '顶视图',
            icon: 'top_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
          {
            label: '前视图',
            icon: 'front_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
          {
            label: '左视图',
            icon: 'left_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
        ]
      },
      {
        type: 'group',
        direction: 'vertical',
        ribbonItems: [
          {
            label: '底视图',
            icon: 'bottom_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
          {
            label: '后视图',
            icon: 'back_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
          {
            label: '右视图',
            icon: 'right_view material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['verySmall']
          },
        ]
      }]
    },
    {
      label: '可见性',
      icon: 'visible material-icons',
      ribbonItems: [
        {
          label: '隐藏选中',
          icon: 'hide_selected material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '隔离选中',
          icon: 'isolate-selected material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        }, {
          label: '半透明选中',
          icon: 'transprent_other material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '显示全部',
          icon: 'show_all material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        }],
    },
    {
      label: '测量',
      icon: 'measure material-icons',
      ribbonItems: [{
        label: '距离',
        icon: 'measure_distance material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '角度',
        icon: 'measure_angle material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '面积',
        icon: 'measure_area material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '坐标',
        icon: 'measure_coordinate material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '清除测量',
        icon: 'measure_clear material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      }]
    },
    {
      label: '剖切',
      icon: 'slice material-icons',
      ribbonItems: [{
        type: 'group',
        direction: 'vertical',
        ribbonItems: [
          {
            label: '沿x轴',
            icon: 'x_axis material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['iconOnly', 'verySmall']
          },
          {
            label: '沿y轴',
            icon: 'y_axis material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['iconOnly', 'verySmall']
          },
          {
            label: '沿z轴',
            icon: 'z_axis material-icons',
            type: 'button',
            cssClass: 'flat',
            size: 'verySmall',
            allowedSizes: ['iconOnly', 'verySmall']
          },
        ]
      },
      {
        label: '剖面显隐',
        icon: 'slice_display material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '剖切还原',
        icon: 'slice_reset material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      }]
    },
    {
      label: '爆炸',
      icon: 'floor_explosion material-icons',
      ribbonItems: [
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [{
            type: 'group',
            direction: 'vertical',
            ribbonItems: [{
              label: 'X',
              itemTemplate: '<smart-slider value="0" id="horizontalSliderExplosionX" show-tooltip tooltip-position="far" orientation="horizontal" min="-3" max="3" scale-position="none"></smart-slider>',
              cssClass: 'normal',
              allowedSizes: ['normal']
            },
            {
              label: 'Y',
              itemTemplate: '<smart-slider value="0" id="horizontalSliderExplosionY" show-tooltip tooltip-position="far" orientation="horizontal" min="0" max="3" scale-position="none"></smart-slider>',
              cssClass: 'normal',
              allowedSizes: ['normal']
            },
            {
              label: 'Z',
              itemTemplate: '<smart-slider value="0" id="horizontalSliderExplosionZ" show-tooltip orientation="horizontal" min="-3" max="3"  scale-position="none"></smart-slider>',
              cssClass: 'normal',
              allowedSizes: ['normal']
            }]
          }]
        },
        {
          label: '爆炸还原',
          icon: 'measure_clear material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },]
    },
    {
      label: '对象',
      icon: 'object material-icons',
      ribbonItems: [{
        label: '构件树',
        icon: 'build_tree material-icons',
        type: 'button',
        cssClass: 'flat tree',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        label: '属性表',
        icon: 'properties_table material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      }]
    },
    ]
  },
  {
    label: '检查',
    ribbonGroups: [{
      label: '合标性检查',
      icon: 'compliance_inspection material-icons',
      ribbonItems: [

        {
          label: '基础数据',
          icon: 'base_data material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '规划报建',
          icon: 'planning_construction material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '施工图审查',
          icon: 'construction_review material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '智慧工地监管',
          icon: 'smart_site_supervision material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '竣工验收',
          icon: 'completion_acceptance material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
      ]
    },
    ]
  },
  {
    label: '转换',
    ribbonGroups: [{
      label: '数据导出',
      icon: 'data_export material-icons',
      ribbonItems: [
        {
          label: '导出GLB',
          icon: 'export_glb material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '导出DB',
          icon: 'export_db material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '导出JSON',
          icon: 'export_json material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        }
      ]
    },
    ]
  },
  {
    label: '设置',
    wrapSize: 'small',
    ribbonGroups: [{
      label: '灯光设置',
      icon: 'light_setting material-icons',
      ribbonItems: [{
        type: 'group',
        direction: 'horizontal',
        ribbonItems: [{
          type: 'group',
          direction: 'vertical',
          ribbonItems: [{
            label: 'X',
            itemTemplate: '<smart-slider value="1" id="horizontalSliderX" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
            cssClass: 'normal',
            allowedSizes: ['normal']
          },
          {
            label: 'Y',
            itemTemplate: '<smart-slider value="-0.5" id="horizontalSliderY" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
            cssClass: 'normal',
            allowedSizes: ['normal']
          },
          {
            label: 'Z',
            itemTemplate: '<smart-slider value="0.5" id="horizontalSliderZ" show-tooltip orientation="horizontal" min="-5" max="5"  scale-position="none"></smart-slider>',
            cssClass: 'normal',
            allowedSizes: ['normal']
          }]
        }]
      },
      {
        label: '重置光照',
        icon: 'reset_light material-icons',
        type: 'button',
        cssClass: 'flat',
        size: 'normal',
        allowedSizes: ['normal']
      },
      {
        type: 'separator'
      },
      {
        type: 'group',
        direction: 'vertical',
        ribbonItems: [{
          label: '光照强度',
          itemTemplate: '<smart-number-input id="inputIndensity"  step="0.05" min="0.0" value="0.75"></smart-number-input>',
          cssClass: 'small',
          allowedSizes: ['small']
        },
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [
            {
              label: '',
              itemTemplate: '<smart-check-box id="checkboxShadow" right-to-left checked>阴影开关</smart-check-box>',
              cssClass: 'verySmall',
              allowedSizes: ['verySmall']
            }
          ]
        }
        ],
      }]
    },
    {
      label: '交互设置',
      icon: 'interaction_setting material-icons',
      type: 'group',
      direction: 'vertical',
      ribbonItems: [
        {
          label: '拖动速度',
          itemTemplate: '<smart-slider id="horizontalSliderSpeed" show-tooltip tooltip-position="far" orientation="horizontal" min="1" max="10" scale-position="none"></smart-slider>',
          cssClass: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '',
          itemTemplate: '<smart-check-box id="focusCheckbox" right-to-left>点击聚焦</smart-check-box>',
          cssClass: 'normal',
          allowedSizes: ['normal']
        }]
    },
    {
      label: '场景设置',
      icon: 'scene_setting material-icons',
      ribbonItems: [
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [{
            type: 'group',
            direction: 'vertical',
            ribbonItems: [
              {
                type: 'group',
                direction: 'vertical',
                ribbonItems: [
                  {
                    label: '',
                    itemTemplate: '<smart-check-box id="gridCheckbox" right-to-left>地面网格</smart-check-box>'
                  },
                  {
                    label: '',
                    tooltip: '背景颜色',
                    itemTemplate: '<smart-color-picker edit-alpha-channel display-mode="palette" id="colorPicker" ></smart-color-picker>',
                    settings: {
                      valueDisplayMode: 'colorBox',
                      dropDownAppendTo: 'body',
                    },
                  },

                ]
              }
            ]
          }]
        },
        {
          type: 'separator'
        },
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [{
            type: 'group',
            direction: 'vertical',
            ribbonItems: [
              {
                type: 'group',
                direction: 'vertical',
                ribbonItems: [
                  {
                    label: '',
                    itemTemplate: '<smart-check-box id="highlightCheckbox" right-to-left checked>选中高亮</smart-check-box>'
                  },
                  {
                    label: '',
                    tooltip: '高亮颜色',
                    itemTemplate: '<smart-color-picker edit-alpha-channel display-mode="palette" id="highlightColorPicker" ></smart-color-picker>',
                    settings: {
                      value: '#99ffffff',
                      valueDisplayMode: 'colorBox',
                      dropDownAppendTo: 'body',
                    },
                  },

                ]
              }
            ]
          }]
        },
        {
          type: 'separator'
        },
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [{
            type: 'group',
            direction: 'vertical',
            ribbonItems: [
              {
                type: 'group',
                direction: 'vertical',
                ribbonItems: [
                  {
                    label: '',
                    itemTemplate: '<smart-check-box id="edgeCheckbox" right-to-left >模型轮廓</smart-check-box>'
                  },
                  {
                    label: '',
                    tooltip: '轮廓颜色',
                    itemTemplate: '<smart-color-picker edit-alpha-channel display-mode="palette" id="edgeColorPicker" ></smart-color-picker>',
                    settings: {
                      value: '#000000ff',
                      valueDisplayMode: 'colorBox',
                      dropDownAppendTo: 'body',
                    },
                  },

                ]
              }
            ]
          }]
        },]
    },

    ]
  }],
  fileMenu: {
    label: '文件',
    type: 'dropDown',
    items: [
      // {
      //   label: '打开',
      // },
      // {
      //   label: '附加',
      // }
    ]
  }
}