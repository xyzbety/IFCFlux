import XeUtils from 'xe-utils'
import { IfcCategoryMap } from './ifcCategoryMap'


// const XeUtils = require('xe-utils')
// const { IfcCategoryMap } = require('./ifc-category-map')

interface Props {
  expandedIds: string[]  //树展开的节点
  properties: any
  entities: any
}
export interface TreeNode {
  name: string
  typeZH: string
  description: string
  parentId: null | string
  expressId: string
  type: string
  children?: TreeNode[]
}
interface DataReturn {
  tree: TreeNode[],
  ifcExpressIds: string[]
  sites: string[]
}

// 获取场景目录
export const getSpatialTree = (props: Props): null | DataReturn => {
  const { expandedIds, properties, entities } = props
  const startTime = new Date().getTime()
  // 用于构建场景目录的expressId  "IFCRELCONTAINEDINSPATIALSTRUCTURE","IFCRELAGGREGATES","IFCRELREFERENCEDINSPATIALSTRUCTURE"
  const relationID = [3242617779, 160246688, 1245217292]
  // 用于存在关联关系
  const relations: { [parentId: string]: string[] } = {}
  const sites: string[] = []
  //IFCPROJECT(typeID: 103090709) --> ifcSite(typeId:4097777520) --> IFCBUILDING(typeID: 4031249490) --> IFCBUILDSTOREY(typeID: 3124254112)  -->
  const ifcTypeID = [103090709, 4031249490, 4097777520, 3124254112]
  let tempTreeData = [] as any
  const dataMap = {} as any
  // 获取关联关系
  for (let key in properties) {
    const property = properties[key]
    const index = relationID.indexOf(property.type)
    // "IFCRELCONTAINEDINSPATIALSTRUCTURE":0 ,"IFCRELAGGREGATES": 1，"IfcRelReferencedInSpatialStructure": 2
    if (index === 1) {
      if (property.RelatingObject.value !== undefined) {
        const parentId = property.RelatingObject.value
        property.RelatedObjects.forEach((RelatedObject: { value: number, type: number }) => {
          // 关联的对象
          if (relations[parentId]) {
            relations[parentId].push(String(RelatedObject.value))
          } else {
            relations[parentId] = [String(RelatedObject.value)]
          }
        })
      }
    } else if (index === 0 || index === 2) {
      if (property.RelatingStructure.value !== undefined) {
        const parentId = property.RelatingStructure.value
        property.RelatedElements.forEach((RelatedElement: { value: number, type: number }) => {
          // 关联的对象
          if (relations[parentId]) {
            relations[parentId].push(String(RelatedElement.value))
          } else {
            relations[parentId] = [String(RelatedElement.value)]
          }
        })
      }
    }
  }

  // 当不存在关联关系时，结束
  if (Object.keys(relations).length === 0) {
    return {
      tree: [],
      ifcExpressIds: Object.keys(dataMap),
      sites,
    }
  }

  // 自定义category节点的code
  const categoryNodeCode: string[] = []

  Object.keys(relations).forEach((id: string) => {
    const property = properties[id]
    const guid = property.GlobalId.value
    //  ifc project  顶级节点
    if (property.type === 103090709) {
      const item = {
        name: property.Name?.value,
        typeZH: '',
        description: property.Description !== null && property.Description !== undefined ? property.Description : '',
        parentId: null,
        expressId: id,
        guid: guid,
        objectType: property.ObjectType,
        type: IfcCategoryMap[property.type].en,
        typeShow: IfcCategoryMap[property.type].cn,
      } as TreeNode
      dataMap[id] = item
      tempTreeData.push(item)
    }
    let isc = false
    // 当不存在ifcTypeID中表示构件
    if (properties[relations[id][0]]) {
      if (!ifcTypeID.includes(properties[relations[id][0]].type)) {
        isc = true
      }
    }

    relations[id].forEach((expressId: string) => {
      const property = properties[expressId]
      if (!property) {
        return
      }
      if (!entities.includes(IfcCategoryMap[property.type].en) && property.type === 'IfcSite') {
        return
      }
      const guid = property.GlobalId.value
      const item = {
        name: property.Name?.value,
        typeZH: '',
        description: property.Description !== null && property.Description !== undefined ? property.Description : '',
        parentId: id,
        expressId: expressId,
        guid: guid,
        objectType: property.ObjectType,
        type: IfcCategoryMap[property.type].en,
        typeShow: IfcCategoryMap[property.type].cn || IfcCategoryMap[property.type].en,
      }
      
      // 检查是否已存在相同expressId的节点，避免重复
      if (!dataMap[expressId]) {
        dataMap[expressId] = item
        //当时构件时，把ifc element type 相同的放在一起
        if (isc) {
          // TODO  这个层级是人为创建的,所以ExpressID是人为创建的
          const categoryEid = `Category_${IfcCategoryMap[property.type].en}_${id}`
          if (!categoryNodeCode.includes(categoryEid)) {
            tempTreeData.push({
              name: '',
              typeZH: '',
              description: '',
              parentId: id,
              // TODO  这个层级是人为创建的,所以ExpressID是人为创建的
              expressId: categoryEid,
              guid: guid,
              objectType: property.ObjectType,
              type: 'category',
              typeShow: IfcCategoryMap[property.type].cn,

            })
            categoryNodeCode.push(categoryEid)
          }
          dataMap[expressId].parentId = categoryEid
        }
        tempTreeData.push(item)
      }
    })
    // 默认展开的节点
    if (properties[id].type && [103090709, 4031249490, 4097777520].includes(properties[id].type)) {
      expandedIds.push(id)
    }
  })
  const treeLength = tempTreeData.length;
  const tree = XeUtils.toArrayTree(tempTreeData, { key: 'expressId' })
  tree[0]['treeLength'] = treeLength;
  // 处理 ifcproject 下的ifc site
  if (tree[0].type === 'IFCPROJECT') {
    tree[0].children = tree[0].children?.map((item) => {
      if (item.type === 'IFCSITE') {
        sites.push(item.expressId)
        const siteNode = Object.assign({}, item)
        siteNode.name = ''
        siteNode.type = 'IFCSITENODE'
        item.parentId = siteNode.expressId = `IFCSITE_NODE_${item.expressId}`
        // 当存在构件时
        if (entities.includes(item.type)) {
          if (siteNode.children) {
            siteNode.children = siteNode.children.map((i) => {
              i.parentId = siteNode.expressId
              return i
            })
            item.children = []
            siteNode.children.unshift(item)

          } else {
            siteNode.children = [item]
          }
        }
        expandedIds.push(siteNode.expressId)
        dataMap[siteNode.expressId] = siteNode
        return siteNode
      }
      return item
    })
  }
  console.log('用时', new Date().getTime() - startTime, 'ms')
  return {
    tree,
    ifcExpressIds: Object.keys(dataMap),
    sites,
  }

}