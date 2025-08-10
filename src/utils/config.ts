export const menuBarConfig: any = [
  { label: '文件', value: 'file' },
  { label: '查看', value: 'view' },
  { label: '检查', value: 'examine' },
  { label: '转换', value: 'transform' },
  { label: '账户', value: 'account' },
  { label: '帮助', value: 'help' },
]

// 场景目录表头配置
export const ifcStructureColumns: any = [
  { colKey: 'row-select', type: 'multiple' },
  { colKey: 'typeShow', title: '类型', ellipsis: 'true' },
  { colKey: 'name', title: '名称', ellipsis: 'true' },
  { colKey: 'description', title: '描述', ellipsis: 'true' },
] 

// 属性表表头配置
export const ifcPropertyColumns: any = [
  [{
    colKey: 'name',
    title: '名称',
    width: '45%',
    ellipsis: 'true',
  },
  {
    colKey: 'value',
    title: '值',
    with: "35%",
    ellipsis: 'true',
  },
  {
    colKey: 'description',
    title: '单位',
    width: '20%',
    ellipsis: 'true',
  }],
  [{
    colKey: 'name',
    title: '名称',
    width: '45%',
    ellipsis: 'true',
  },
  {
    colKey: 'value',
    title: '值',
    with: "35%",
    ellipsis: 'true',
  },
  {
    colKey: 'description',
    title: '单位',
    width: '20%',
    ellipsis: 'true',
  }],
  [{
    colKey: 'name',
    title: '名称',
    width: '60%',
    ellipsis: 'true',
  },
  {
    colKey: 'value',
    title: '值',
    with: "40%",
    ellipsis: 'true',
  }],
  [{
    colKey: 'name',
    title: '形式',
    width: '60%',
    ellipsis: 'true',
  },
  {
    colKey: 'value',
    title: '名称',
    with: "40%",
    ellipsis: 'true',
  }]]

//  条纹规则表头配置
export const examineRuleColumns: any = [
  {
    colKey: 'row-select',
    type: 'multiple',
    width: '30px',
    resizable: false
  },
  {
    colKey: 'content',
    title: '条纹内容',
    ellipsis: 'true',
    resize: { minWidth: 120, maxWidth: 300 }
  },
  {
    colKey: 'OYX',
    title: '通过性',
    width: '54px',
    ellipsis: 'true',
  },
]

// 检查结果表头配置
export const examineResultColumns: any = [
  {
    colKey: 'type',
    title: '类型',
    width: '40%',
    ellipsis: 'true',
  },
  {
    colKey: 'name',
    title: '名称',
    width: '40%',
    ellipsis: 'true',
  },
  {
    colKey: 'value',
    title: '实际值',
    width: '20%',
    ellipsis: 'true',
  },
]
// 检查结果配置
export const examineResultConfig: any = {
  '0': '合格',
  '1': '缺参数<无>',
  '2': '值为空<无>',
  '3': '值类型不对',
  '4': '值域不对'
}
