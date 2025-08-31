/**
 * 功能区元素尺寸枚举
 * - 'verySmall': 超小尺寸
 * - 'iconOnly': 仅显示图标
 * - 'normal': 正常尺寸
 * - 'small': 小尺寸
 */
export type Size = 'verySmall' | 'iconOnly' | 'normal' | 'small'

/**
 * 功能区项基础类型
 * @property {string} label - 显示文本
 * @property {string} [icon] - 图标类名或URL
 * @property {'button'|'input'|'group'|'separator'|'dropDown'} [type='button'] - 项类型
 * @property {string} [cssClass] - 自定义CSS类
 * @property {'vertical'|'horizontal'} [direction='horizontal'] - 排列方向
 * @property {Size} [wrapSize] - 包裹尺寸
 * @property {Size} [size] - 显示尺寸
 * @property {Object} [settings] - 自定义设置项
 * @property {RibbonItem[]} [ribbonItems] - 子项集合(当type为group/dropDown时使用)
 * @property {Size[]} [allowedSizes] - 允许的尺寸集合
 */
export type RibbonItem = {
  label: string,
  icon?: string,
  type?: 'button' | 'input' | 'group' | 'separator' | 'dropDown',
  cssClass?: string,
  direction?: 'vertical' | 'horizontal',
  wrapSize?: Size,
  size?: Size,
  settings?: {[key:　string]: any},
  ribbonItems?: RibbonItem[],
  allowedSizes?: Size[]
}

/**
 * 文件菜单配置
 * @property {'dropdown'} type - 固定为下拉菜单类型
 * @property {SidebarItem[]} items - 菜单项集合
 */
export type RibbonFileMenu = {
  type: 'dropdown',
  items: SidebarItem[]
}

/**
 * 文件菜单项
 * @property {string} label - 菜单项文本
 * @property {string} shortcut - 快捷键显示文本
 * @property {SidebarItem[]} [items] - 子菜单项
 */
export type SidebarItem = {
  label: 'Open Containing Folder',
  shortcut: string,
  items?: SidebarItem[],
}

/**
 * 功能区整体配置
 * @property {RibbonItem[]} dataSource - 功能区项数据源
 * @property {RibbonFileMenu} fileMenu - 文件菜单配置
 */
export type RibbonConfig = {
  dataSource: RibbonItem[],
  fileMenu: RibbonFileMenu,
}