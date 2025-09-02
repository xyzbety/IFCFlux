import { FASTElement, attr, customElement, observable } from '@microsoft/fast-element'
import { styles } from './cube.styles'
import { template } from './cube.template'
export interface CubeItem {
  label?: string
  value: string,
  heading: number,
  tilt: number,
  corners?: CubeItem[]
}

const corners = {
  'front-left-top': {
    heading: 45,
    tilt: 45,
    value: 'front-left-top'
  },
  'front-left-bottom': {
    heading: 45,
    tilt: 135,
    value: 'front-left-bottom'
  },
  'front-right-top': {
    heading: 315,
    tilt: 45,
    value: 'front-right-top'
  },
  'front-right-bottom': {
    heading: 315,
    tilt: 135,
    value: 'front-right-bottom'
  },
  'back-left-top': {
    heading: 135,
    tilt: 45,
    value: 'back-left-top'
  },
  'back-left-bottom': {
    heading: 135,
    tilt: 135,
    value: 'back-left-bottom'
  },
  'back-right-top': {
    heading: 225,
    tilt: 45,
    value: 'back-right-top'
  },
  'back-right-bottom': {
    heading: 225,
    tilt: 135,
    value: 'back-right-bottom'
  },
}
// 方向对应旋转角度,名称
const directions = [
  {
    value: 'front',
    heading: 0,
    tilt: 90,
    label: '前',
    corners: [
      corners['front-left-top'],
      corners['front-right-top'],
      corners['front-right-bottom'],
      corners['front-left-bottom']
    ]
  },
  {
    value: 'top',
    heading: 0,
    tilt: 0,
    label: '上',
    corners: [
      corners['back-left-top'],
      corners['back-right-top'],
      corners['front-right-top'],
      corners['front-left-top']
    ]
  },
  {
    value: 'bottom',
    heading: 0,
    tilt: 180,
    label: '下',
    corners: [
      corners['front-left-bottom'],
      corners['front-right-bottom'],
      corners['back-right-bottom'],
      corners['back-left-bottom']
    ]
  },
  {
    value: 'back',
    heading: 180,
    tilt: 90,
    label: '后',
    corners: [
      corners['back-right-top'],
      corners['back-left-top'],
      corners['back-left-bottom'],
      corners['back-right-bottom']
    ]
  },
  {
    value: 'left',
    heading: 90,
    tilt: 90,
    label: '左',
    corners: [
      corners['back-left-top'],
      corners['front-left-top'],
      corners['front-left-bottom'],
      corners['back-left-bottom']
    ]
  },
  {
    value: 'left',
    heading: 270,
    tilt: 90,
    label: '右',
    corners: [
      corners['front-right-top'],
      corners['back-right-top'],
      corners['back-right-bottom'],
      corners['front-right-bottom']
    ]
  }
]

@customElement({
  name: 'm-cube',
  template,
  styles,
})

export class MCube extends FASTElement {
  /**
   * 选项数据
   */
  @attr() options: CubeItem[] = directions

  @observable size = 0
  /**
   * 当前选中的值
   */
  @attr value = 'front'

  _rotates = [ '', 'rotateX(90deg)', 'rotateX(-90deg)', 'rotateY(180deg)', 'rotateY(-90deg)', 'rotateY(90deg)']

  @observable @attr hoverValue = ''

  @observable rotateX = 0

  @observable rotateY = 0

  cubeBody: HTMLDivElement | undefined

  connectedCallback() {
    super.connectedCallback()
    if (this.cubeBody) {
      this.size = parseInt(getComputedStyle(this.cubeBody).height)
    }
  }
  public updateTransform() {
    if (!this.cubeBody) return;
    this.cubeBody.style.transform = 
        `rotateX(${this.rotateX}deg) rotateY(${this.rotateY}deg)`;
}
  /**
   * 监听选项发生变化时
   * @param item 选中的选项
   * @param _index 选中选项的序号
   */
  onSelect(item: CubeItem) {
    this.rotateX = item.tilt - 90
    this.rotateY = item.heading - this.rotateY > 180 ? item.heading - 360 : item.heading
    this.value = item.value
    this.$emit('select', { item: item })
  }

  /**
   * 鼠标移入
   * @param item 当前选项
   */
  onMouseover(item: CubeItem) {
    this.hoverValue = item.value
  }

  /**
   * 鼠标移出
   * @param _item 当前选项
   */
  onMouseout(_item: CubeItem) {
    this.hoverValue = ""
  }
}
