export interface ISliceShape {
  shape: any
  style?: ISliceShapeStyle
  isReverse?: boolean
  excludedLayers?: any[]
}
export const DEFAULT_SHAPE_STYLE = {
  border: {
    color: '#cb6b20',
    width: 1
  },
  fill: {
    color: '#cb6b20',
    opacity: 0.1
  }
}

export interface ISliceShapeStyle {
  border?: ISliceShapeBorder
  fill?: ISliceShapeFill
}

export interface ISliceShapeFill {
  color: string
  opacity: number
}

export interface ISliceShapeBorder {
  color: string
  width: number
}

export interface ISlicePlane {
  position: any[]
  width: number
  height: number
  rotation: number[],
}

export interface IBaseSlice {
  // 剖切形状
  shape: ISlicePlane | ISliceBox
  // 剖切边框
  border?: ISliceShapeBorder
  // 剖切填充
  fill: ISliceShapeFill
  // 开始剖切
  start(shape?: ISlicePlane | string): void
  // 清空剖切
  clear(): void
}

export interface ISliceBox {
  position: any
  width: number
  height: number
  depth: number
}

export interface ISliceProps {
  shape: ISliceBox | ISlicePlane
  style: ISliceShapeStyle
}


/**
 * 更新剖切盒的类型
 * x-positive-add，即x负轴方向增加，第一个是轴向，第二个是轴向的正负方向，第三个是加减
 */
export type UpdateSliceBoxType = 'x-positive-add' | 'x-positive-subtract' | 'x-negative-add' | 'x-negative-subtract' | 'y-positive-add' | 'y-positive-subtract' | 'y-negative-add' | 'y-negative-subtract' | 'z-positive-add' | 'z-positive-subtract' | 'z-negative-add' | 'z-negative-subtract'
