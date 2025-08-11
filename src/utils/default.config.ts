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
    // {
    //   label: '层间滑动',
    //   icon: 'object material-icons',
    //   ribbonItems: [{
    //     type: 'group',
    //     direction: 'horizontal',
    //     ribbonItems: [{
    //       type: 'group',
    //       direction: 'vertical',
    //       ribbonItems: [{
    //         label: 'X',
    //         itemTemplate: '<smart-slider value="0.0" id="explosionSliderX" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
    //       },
    //       {
    //         label: 'Y',
    //         itemTemplate: '<smart-slider value="0" id="explosionSliderY" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
    //       },
    //       {
    //         label: 'Z',
    //         itemTemplate: '<smart-slider value="0" id="explosionSliderZ" show-tooltip orientation="horizontal" min="-5" max="5"  scale-position="none"></smart-slider>',

    //       }]
    //     }]
    //   },
    //   {
    //     label: '清除效果',
    //     icon: 'measure_clear material-icons',
    //     type: 'button',
    //     cssClass: 'flat',
    //     size: 'normal',
    //     allowedSizes: ['normal']
    //   },]
    // },
    ]
  },
  {
    label: '检查',
    ribbonGroups:  [{
      label: '控制',
      icon: 'select material-icons',
      ribbonItems: [
        {
          label: '开始检查',
          icon: 'pan_tool material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        }]
    },
    ]
  },
  {
    label: '转换',
    ribbonGroups: []
  },
  {
    label: '分析',
    ribbonGroups: [{
      label: '分析',
      icon: 'select material-icons',
      ribbonItems: [
        {
          label: '生成空间',
          icon: 'pan_tool material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '导出',
          icon: 'zoom_out_map material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        }]
    }]
  },
  {
    label: '动画',
    ribbonGroups: [{
      label: '动画控制',
      icon: 'select material-icons',
      ribbonItems: [
        {
          label: '开始',
          icon: 'pan_tool material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '暂停',
          icon: 'rotate material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },

        {
          label: '停止',
          icon: 'zoom_out_map material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '脚本库',
          icon: 'zoom_in_map material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },
        {
          label: '编辑器',
          icon: 'rotate_right material-icons',
          type: 'button',
          cssClass: 'flat',
          size: 'normal',
          allowedSizes: ['normal']
        },]
    }]
  },
  {
    label: '设置',
    wrapSize: 'small',
    ribbonGroups: [{
      label: '灯光设置',
      ribbonItems: [{
        type: 'group',
        direction: 'horizontal',
        ribbonItems: [{
          type: 'group',
          direction: 'vertical',
          ribbonItems: [{
            label: 'X',
            itemTemplate: '<smart-slider value="1" id="horizontalSliderX" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
          },
          {
            label: 'Y',
            itemTemplate: '<smart-slider value="-0.5" id="horizontalSliderY" show-tooltip tooltip-position="far" orientation="horizontal" min="-5" max="5" scale-position="none"></smart-slider>',
          },
          {
            label: 'Z',
            itemTemplate: '<smart-slider value="0.5" id="horizontalSliderZ" show-tooltip orientation="horizontal" min="-5" max="5"  scale-position="none"></smart-slider>',

          }]
        }]
      },
      {
        label: '重置',
        icon: 'measure_clear material-icons',
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
          cssClass: 'small'
        },
        {
          type: 'group',
          direction: 'horizontal',
          ribbonItems: [
            {
              label: '阴影开关',
              itemTemplate: '<smart-check-box id="checkboxShadow" checked></smart-check-box>',
              cssClass: 'verySmall'
            }
          ]
        }
        ]
      }]
    },
    {
      label: '场景设置',
      icon: 'format_bold material-icons',
      ribbonItems: [
        {
          type: 'group',
          direction: 'vertical',
          ribbonItems: [{
            label: '拖动速度',
            itemTemplate: '<smart-slider id="horizontalSliderSpeed" show-tooltip tooltip-position="far" orientation="horizontal" min="1" max="10" scale-position="none"></smart-slider>',
          },
          {
            type: 'group',
            direction: 'horizontal',
            ribbonItems: [
              {
                label: '',
                tooltip: '背景颜色',
                itemTemplate: '<smart-color-picker edit-alpha-channel display-mode="palette" id="colorPicker"></smart-color-picker>',
                settings: {
                  valueDisplayMode: 'colorBox',
                  dropDownAppendTo: 'body',
                },
              },
              {
                label: '地面网格',
                itemTemplate: '<smart-check-box id="checkboxFocus"></smart-check-box>'
              },
            ]
          }
          ]
        }]
    }
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