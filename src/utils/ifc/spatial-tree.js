import XeUtils from 'xe-utils';
import { IfcCategoryMap } from './ifc-category-map';
// 获取场景目录
export const getSpatialTree = (props) => {
    const { expandedIds, properties, entities } = props;
    const startTime = new Date().getTime();
    // 用于构建场景目录的expressId  "IFCRELCONTAINEDINSPATIALSTRUCTURE","IFCRELAGGREGATES","IFCRELREFERENCEDINSPATIALSTRUCTURE"
    const relationID = [3242617779, 160246688, 1245217292];
    // 用于存在关联关系
    const relations = {};
    const sites = [];
    //IFCPROJECT(typeID: 103090709) --> ifcSite(typeId:4097777520) --> IFCBUILDING(typeID: 4031249490) --> IFCBUILDSTOREY(typeID: 3124254112)  -->
    const ifcTypeID = [103090709, 4031249490, 4097777520, 3124254112];
    let tempTreeData = [];
    const dataMap = {};
    // 获取关联关系
    for (let key in properties) {
        const property = properties[key];
        const index = relationID.indexOf(property.type);
        // "IFCRELCONTAINEDINSPATIALSTRUCTURE":0 ,"IFCRELAGGREGATES": 1，"IfcRelReferencedInSpatialStructure": 2
        if (index === 1) {
            if (property.RelatingObject.value !== undefined) {
                const parentId = property.RelatingObject.value;
                property.RelatedObjects.forEach((RelatedObject) => {
                    // 关联的对象
                    if (relations[parentId]) {
                        relations[parentId].push(String(RelatedObject.value));
                    }
                    else {
                        relations[parentId] = [String(RelatedObject.value)];
                    }
                });
            }
        }
        else if (index === 0 || index === 2) {
            if (property.RelatingStructure.value !== undefined) {
                const parentId = property.RelatingStructure.value;
                property.RelatedElements.forEach((RelatedElement) => {
                    // 关联的对象
                    if (relations[parentId]) {
                        relations[parentId].push(String(RelatedElement.value));
                    }
                    else {
                        relations[parentId] = [String(RelatedElement.value)];
                    }
                });
            }
        }
    }
    // 当不存在关联关系时，结束
    if (Object.keys(relations).length === 0) {
        return {
            tree: [],
            ifcExpressIds: Object.keys(dataMap),
            sites,
        };
    }
    // 自定义category节点的code
    const categoryNodeCode = [];
    Object.keys(relations).forEach((id) => {
        const property = properties[id];
        //  ifc project  顶级节点
        if (property.type === 103090709) {
            const item = {
                name: property.Name?.value,
                typeZH: '',
                description: property.Description !== null && property.Description !== undefined ? property.Description : '',
                parentId: null,
                expressId: id,
                type: IfcCategoryMap[property.type],
                typeShow: IfcCategoryMap[property.type],
            };
            dataMap[id] = item;
            tempTreeData.push(item);
        }
        let isc = false;
        // 当不存在ifcTypeID中表示构件
        if (!ifcTypeID.includes(properties[relations[id][0]].type)) {
            isc = true;
        }
        relations[id].forEach((expressId) => {
            const property = properties[expressId];
            if (!entities.includes(IfcCategoryMap[property.type]) && property.type === 'IFCSITE') {
                return;
            }
            const item = {
                name: property.Name?.value,
                typeZH: '',
                description: property.Description !== null && property.Description !== undefined ? property.Description : '',
                parentId: id,
                expressId: expressId,
                type: IfcCategoryMap[property.type],
                typeShow: IfcCategoryMap[property.type],
            };
            dataMap[expressId] = item;
            //当时构件时，把ifc element type 相同的放在一起
            if (isc) {
                // TODO  这个层级是人为创建的,所以ExpressID是人为创建的
                const categoryEid = `Category_${IfcCategoryMap[property.type]}_${id}`;
                if (!categoryNodeCode.includes(categoryEid)) {
                    tempTreeData.push({
                        name: '',
                        typeZH: '',
                        description: '',
                        parentId: id,
                        // TODO  这个层级是人为创建的,所以ExpressID是人为创建的
                        expressId: categoryEid,
                        type: 'category',
                        typeShow: IfcCategoryMap[property.type],
                    });
                    categoryNodeCode.push(categoryEid);
                }
                dataMap[expressId].parentId = categoryEid;
            }
            tempTreeData.push(item);
        });
        // 默认展开的节点
        if (properties[id].type && [103090709, 4031249490, 4097777520].includes(properties[id].type)) {
            expandedIds.push(id);
        }
    });
    const tree = XeUtils.toArrayTree(tempTreeData, { key: 'expressId' });
    // 处理 ifcproject 下的ifc site
    if (tree[0].type === 'IFCPROJECT') {
        tree[0].children = tree[0].children?.map((item) => {
            if (item.type === 'IFCSITE') {
                sites.push(item.expressId);
                const siteNode = Object.assign({}, item);
                siteNode.name = '';
                siteNode.type = 'IFCSITENODE';
                item.parentId = siteNode.expressId = `IFCSITE_NODE_${item.expressId}`;
                // 当存在构件时
                if (entities.includes(item.type)) {
                    if (siteNode.children) {
                        siteNode.children = siteNode.children.map((i) => {
                            i.parentId = siteNode.expressId;
                            return i;
                        });
                        item.children = [];
                        siteNode.children.unshift(item);
                    }
                    else {
                        siteNode.children = [item];
                    }
                }
                expandedIds.push(siteNode.expressId);
                dataMap[siteNode.expressId] = siteNode;
                return siteNode;
            }
            return item;
        });
    }
    console.log('用时', new Date().getTime() - startTime, 'ms');
    return {
        tree,
        ifcExpressIds: Object.keys(dataMap),
        sites,
    };
};
