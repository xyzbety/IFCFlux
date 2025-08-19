/**
 * IFC实体类型映射表
 * 包含原始名称、标准驼峰命名格式和中文名称
 */

export interface IfcTypeInfo {
  /** 原始名称（全大写） */
  original: string;
  /** 标准驼峰命名格式 */
  standard: string;
  /** 中文名称 */
  chinese: string;
}

/**
 * IFC实体类型完整映射表
 * 覆盖 IfcElement、IfcSpatialElement、IfcGroup、IfcProject 下的所有实体
 */
export const IFC_TYPE_MAP: Record<string, IfcTypeInfo> = {
  // IfcProject 项目相关
  'IFCPROJECT': {
    original: 'IFCPROJECT',
    standard: 'IfcProject',
    chinese: '项目'
  },

  // IfcSpatialElement 空间元素
  'IFCSITE': {
    original: 'IFCSITE',
    standard: 'IfcSite',
    chinese: '场地'
  },
  'IFCBUILDING': {
    original: 'IFCBUILDING',
    standard: 'IfcBuilding',
    chinese: '建筑'
  },
  'IFCBUILDINGSTOREY': {
    original: 'IFCBUILDINGSTOREY',
    standard: 'IfcBuildingStorey',
    chinese: '楼层'
  },
  'IFCSPACE': {
    original: 'IFCSPACE',
    standard: 'IfcSpace',
    chinese: '空间'
  },
  'IFCZONE': {
    original: 'IFCZONE',
    standard: 'IfcZone',
    chinese: '区域'
  },
  'IFCSPATIALZONE': {
    original: 'IFCSPATIALZONE',
    standard: 'IfcSpatialZone',
    chinese: '空间区域'
  },
  'IFCEXTERNALSPATIALELEMENT': {
    original: 'IFCEXTERNALSPATIALELEMENT',
    standard: 'IfcExternalSpatialElement',
    chinese: '外部空间元素'
  },

  // IfcBuildingElement 建筑元素
  'IFCWALL': {
    original: 'IFCWALL',
    standard: 'IfcWall',
    chinese: '墙'
  },
  'IFCWALLSTANDARDCASE': {
    original: 'IFCWALLSTANDARDCASE',
    standard: 'IfcWallStandardCase',
    chinese: '标准墙'
  },
  'IFCWALLELEMENTEDCASE': {
    original: 'IFCWALLELEMENTEDCASE',
    standard: 'IfcWallElementedCase',
    chinese: '组合墙'
  },
  'IFCSLAB': {
    original: 'IFCSLAB',
    standard: 'IfcSlab',
    chinese: '板'
  },
  'IFCSLABELEMENTEDCASE': {
    original: 'IFCSLABELEMENTEDCASE',
    standard: 'IfcSlabElementedCase',
    chinese: '组合板'
  },
  'IFCSLABSTANDARDCASE': {
    original: 'IFCSLABSTANDARDCASE',
    standard: 'IfcSlabStandardCase',
    chinese: '标准板'
  },
  'IFCCOLUMN': {
    original: 'IFCCOLUMN',
    standard: 'IfcColumn',
    chinese: '柱'
  },
  'IFCCOLUMNSTANDARDCASE': {
    original: 'IFCCOLUMNSTANDARDCASE',
    standard: 'IfcColumnStandardCase',
    chinese: '标准柱'
  },
  'IFCBEAM': {
    original: 'IFCBEAM',
    standard: 'IfcBeam',
    chinese: '梁'
  },
  'IFCBEAMSTANDARDCASE': {
    original: 'IFCBEAMSTANDARDCASE',
    standard: 'IfcBeamStandardCase',
    chinese: '标准梁'
  },
  'IFCDOOR': {
    original: 'IFCDOOR',
    standard: 'IfcDoor',
    chinese: '门'
  },
  'IFCDOORSTANDARDCASE': {
    original: 'IFCDOORSTANDARDCASE',
    standard: 'IfcDoorStandardCase',
    chinese: '标准门'
  },
  'IFCWINDOW': {
    original: 'IFCWINDOW',
    standard: 'IfcWindow',
    chinese: '窗'
  },
  'IFCWINDOWSTANDARDCASE': {
    original: 'IFCWINDOWSTANDARDCASE',
    standard: 'IfcWindowStandardCase',
    chinese: '标准窗'
  },
  'IFCROOF': {
    original: 'IFCROOF',
    standard: 'IfcRoof',
    chinese: '屋顶'
  },
  'IFCSTAIR': {
    original: 'IFCSTAIR',
    standard: 'IfcStair',
    chinese: '楼梯'
  },
  'IFCSTAIRFLIGHT': {
    original: 'IFCSTAIRFLIGHT',
    standard: 'IfcStairFlight',
    chinese: '楼梯段'
  },
  'IFCRAMP': {
    original: 'IFCRAMP',
    standard: 'IfcRamp',
    chinese: '坡道'
  },
  'IFCRAMPFLIGHT': {
    original: 'IFCRAMPFLIGHT',
    standard: 'IfcRampFlight',
    chinese: '坡道段'
  },
  'IFCRAILING': {
    original: 'IFCRAILING',
    standard: 'IfcRailing',
    chinese: '栏杆'
  },
  'IFCMEMBER': {
    original: 'IFCMEMBER',
    standard: 'IfcMember',
    chinese: '构件'
  },
  'IFCMEMBERSTANDARDCASE': {
    original: 'IFCMEMBERSTANDARDCASE',
    standard: 'IfcMemberStandardCase',
    chinese: '标准构件'
  },
  'IFCPLATE': {
    original: 'IFCPLATE',
    standard: 'IfcPlate',
    chinese: '板件'
  },
  'IFCPLATESTANDARDCASE': {
    original: 'IFCPLATESTANDARDCASE',
    standard: 'IfcPlateStandardCase',
    chinese: '标准板件'
  },
  'IFCCURTAINWALL': {
    original: 'IFCCURTAINWALL',
    standard: 'IfcCurtainWall',
    chinese: '幕墙'
  },
  'IFCFOOTING': {
    original: 'IFCFOOTING',
    standard: 'IfcFooting',
    chinese: '基础'
  },
  'IFCPILE': {
    original: 'IFCPILE',
    standard: 'IfcPile',
    chinese: '桩'
  },
  'IFCSHADINGDEVICE': {
    original: 'IFCSHADINGDEVICE',
    standard: 'IfcShadingDevice',
    chinese: '遮阳设备'
  },
  'IFCBUILDINGELEMENTPROXY': {
    original: 'IFCBUILDINGELEMENTPROXY',
    standard: 'IfcBuildingElementProxy',
    chinese: '建筑元素代理'
  },
  'IFCBUILDINGELEMENTPART': {
    original: 'IFCBUILDINGELEMENTPART',
    standard: 'IfcBuildingElementPart',
    chinese: '建筑元素部件'
  },
  'IFCELEMENTASSEMBLY': {
    original: 'IFCELEMENTASSEMBLY',
    standard: 'IfcElementAssembly',
    chinese: '元素组合'
  },
  'IFCREINFORCINGBAR': {
    original: 'IFCREINFORCINGBAR',
    standard: 'IfcReinforcingBar',
    chinese: '钢筋'
  },
  'IFCREINFORCINGMESH': {
    original: 'IFCREINFORCINGMESH',
    standard: 'IfcReinforcingMesh',
    chinese: '钢筋网'
  },
  'IFCTENDON': {
    original: 'IFCTENDON',
    standard: 'IfcTendon',
    chinese: '预应力筋'
  },
  'IFCTENDONANCHOR': {
    original: 'IFCTENDONANCHOR',
    standard: 'IfcTendonAnchor',
    chinese: '预应力锚具'
  },

  // IfcDistributionElement 分配元素
  'IFCDISTRIBUTIONELEMENT': {
    original: 'IFCDISTRIBUTIONELEMENT',
    standard: 'IfcDistributionElement',
    chinese: '分配元素'
  },
  'IFCDISTRIBUTIONCONTROLELEMENT': {
    original: 'IFCDISTRIBUTIONCONTROLELEMENT',
    standard: 'IfcDistributionControlElement',
    chinese: '分配控制元素'
  },
  'IFCDISTRIBUTIONFLOWELEMENT': {
    original: 'IFCDISTRIBUTIONFLOWELEMENT',
    standard: 'IfcDistributionFlowElement',
    chinese: '分配流动元素'
  },
  'IFCENERGYCONVERSIONDEVICE': {
    original: 'IFCENERGYCONVERSIONDEVICE',
    standard: 'IfcEnergyConversionDevice',
    chinese: '能量转换设备'
  },
  'IFCFLOWCONTROLLER': {
    original: 'IFCFLOWCONTROLLER',
    standard: 'IfcFlowController',
    chinese: '流量控制器'
  },
  'IFCFLOWFITTING': {
    original: 'IFCFLOWFITTING',
    standard: 'IfcFlowFitting',
    chinese: '流动配件'
  },
  'IFCFLOWMOVINGDEVICE': {
    original: 'IFCFLOWMOVINGDEVICE',
    standard: 'IfcFlowMovingDevice',
    chinese: '流动移动设备'
  },
  'IFCFLOWSEGMENT': {
    original: 'IFCFLOWSEGMENT',
    standard: 'IfcFlowSegment',
    chinese: '流动段'
  },
  'IFCFLOWSTORAGEDEVICE': {
    original: 'IFCFLOWSTORAGEDEVICE',
    standard: 'IfcFlowStorageDevice',
    chinese: '流动存储设备'
  },
  'IFCFLOWTERMINAL': {
    original: 'IFCFLOWTERMINAL',
    standard: 'IfcFlowTerminal',
    chinese: '流动终端'
  },
  'IFCFLOWTREATMENTDEVICE': {
    original: 'IFCFLOWTREATMENTDEVICE',
    standard: 'IfcFlowTreatmentDevice',
    chinese: '流动处理设备'
  },

  // IfcFurnishingElement 家具元素
  'IFCFURNISHINGELEMENT': {
    original: 'IFCFURNISHINGELEMENT',
    standard: 'IfcFurnishingElement',
    chinese: '家具元素'
  },
  'IFCFURNITURE': {
    original: 'IFCFURNITURE',
    standard: 'IfcFurniture',
    chinese: '家具'
  },
  'IFCSYSTEMFURNITUREELEMENT': {
    original: 'IFCSYSTEMFURNITUREELEMENT',
    standard: 'IfcSystemFurnitureElement',
    chinese: '系统家具元素'
  },

  // IfcTransportElement 交通元素
  'IFCTRANSPORTELEMENT': {
    original: 'IFCTRANSPORTELEMENT',
    standard: 'IfcTransportElement',
    chinese: '交通元素'
  },

  // IfcVirtualElement 虚拟元素
  'IFCVIRTUALELEMENT': {
    original: 'IFCVIRTUALELEMENT',
    standard: 'IfcVirtualElement',
    chinese: '虚拟元素'
  },

  // IfcGroup 组
  'IFCGROUP': {
    original: 'IFCGROUP',
    standard: 'IfcGroup',
    chinese: '组'
  },
  'IFCSYSTEM': {
    original: 'IFCSYSTEM',
    standard: 'IfcSystem',
    chinese: '系统'
  },
  'IFCSTRUCTURALANALYSISMODEL': {
    original: 'IFCSTRUCTURALANALYSISMODEL',
    standard: 'IfcStructuralAnalysisModel',
    chinese: '结构分析模型'
  },
  'IFCINVENTORY': {
    original: 'IFCINVENTORY',
    standard: 'IfcInventory',
    chinese: '清单'
  },
  'IFCASSET': {
    original: 'IFCASSET',
    standard: 'IfcAsset',
    chinese: '资产'
  },

  // IfcElementComponent 元素组件
  'IFCELEMENTCOMPONENT': {
    original: 'IFCELEMENTCOMPONENT',
    standard: 'IfcElementComponent',
    chinese: '元素组件'
  },
  'IFCFASTENER': {
    original: 'IFCFASTENER',
    standard: 'IfcFastener',
    chinese: '紧固件'
  },
  'IFCMECHANICALFASTENER': {
    original: 'IFCMECHANICALFASTENER',
    standard: 'IfcMechanicalFastener',
    chinese: '机械紧固件'
  },
  'IFCDISCRETEACCESSORY': {
    original: 'IFCDISCRETEACCESSORY',
    standard: 'IfcDiscreteAccessory',
    chinese: '离散配件'
  },
  'IFCVIBRATIONISOLATOR': {
    original: 'IFCVIBRATIONISOLATOR',
    standard: 'IfcVibrationIsolator',
    chinese: '减震器'
  },

  // IfcFeatureElement 特征元素
  'IFCFEATUREELEMENT': {
    original: 'IFCFEATUREELEMENT',
    standard: 'IfcFeatureElement',
    chinese: '特征元素'
  },
  'IFCFEATUREELEMENTSUBTRACTION': {
    original: 'IFCFEATUREELEMENTSUBTRACTION',
    standard: 'IfcFeatureElementSubtraction',
    chinese: '减法特征元素'
  },
  'IFCFEATUREELEMENTADDITION': {
    original: 'IFCFEATUREELEMENTADDITION',
    standard: 'IfcFeatureElementAddition',
    chinese: '加法特征元素'
  },
  'IFCOPENINGELEMENT': {
    original: 'IFCOPENINGELEMENT',
    standard: 'IfcOpeningElement',
    chinese: '开口元素'
  },
  'IFCVOIDINGELEMENT': {
    original: 'IFCVOIDINGELEMENT',
    standard: 'IfcVoidingElement',
    chinese: '空洞元素'
  },
  'IFCSURFACEFEATURE': {
    original: 'IFCSURFACEFEATURE',
    standard: 'IfcSurfaceFeature',
    chinese: '表面特征'
  },
  'IFCPROJECTIONELEMENT': {
    original: 'IFCPROJECTIONELEMENT',
    standard: 'IfcProjectionElement',
    chinese: '投影元素'
  },

  // IfcCivilElement 土木元素
  'IFCCIVILELEMENT': {
    original: 'IFCCIVILELEMENT',
    standard: 'IfcCivilElement',
    chinese: '土木元素'
  },
  'IFCBRIDGE': {
    original: 'IFCBRIDGE',
    standard: 'IfcBridge',
    chinese: '桥梁'
  },
  'IFCBRIDGEPART': {
    original: 'IFCBRIDGEPART',
    standard: 'IfcBridgePart',
    chinese: '桥梁部件'
  },
  'IFCROAD': {
    original: 'IFCROAD',
    standard: 'IfcRoad',
    chinese: '道路'
  },
  'IFCROADPART': {
    original: 'IFCROADPART',
    standard: 'IfcRoadPart',
    chinese: '道路部件'
  },
  'IFCRAILWAY': {
    original: 'IFCRAILWAY',
    standard: 'IfcRailway',
    chinese: '铁路'
  },
  'IFCRAILWAYPART': {
    original: 'IFCRAILWAYPART',
    standard: 'IfcRailwayPart',
    chinese: '铁路部件'
  },
  'IFCPAVEMENT': {
    original: 'IFCPAVEMENT',
    standard: 'IfcPavement',
    chinese: '路面'
  },
  'IFCKERB': {
    original: 'IFCKERB',
    standard: 'IfcKerb',
    chinese: '路缘石'
  },
  'IFCSIGN': {
    original: 'IFCSIGN',
    standard: 'IfcSign',
    chinese: '标志'
  },
  'IFCGEOGRAPHICELEMENT': {
    original: 'IFCGEOGRAPHICELEMENT',
    standard: 'IfcGeographicElement',
    chinese: '地理元素'
  },

  // 其他常用实体
  'IFCANNOTATION': {
    original: 'IFCANNOTATION',
    standard: 'IfcAnnotation',
    chinese: '注释'
  },
  'IFCGRID': {
    original: 'IFCGRID',
    standard: 'IfcGrid',
    chinese: '网格'
  },
  'IFCPROXY': {
    original: 'IFCPROXY',
    standard: 'IfcProxy',
    chinese: '代理'
  },
  'IFCPORT': {
    original: 'IFCPORT',
    standard: 'IfcPort',
    chinese: '端口'
  },
  'IFCDISTRIBUTIONPORT': {
    original: 'IFCDISTRIBUTIONPORT',
    standard: 'IfcDistributionPort',
    chinese: '分配端口'
  }
};

/**
 * 根据原始类型名称获取格式化后的标准名称
 * @param originalType 原始类型名称（通常是全大写）
 * @returns 标准驼峰命名格式的类型名称
 */
export function formatIfcType(originalType: string): string {
  if (!originalType || typeof originalType !== 'string') {
    return originalType;
  }

  const upperType = originalType.toUpperCase();
  const typeInfo = IFC_TYPE_MAP[upperType];
  
  if (typeInfo) {
    return typeInfo.standard;
  }

  // 如果不在映射表中，使用通用转换逻辑
  if (upperType.startsWith('IFC') && upperType === originalType.toUpperCase()) {
    const withoutIfc = upperType.substring(3);
    const camelCase = withoutIfc.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase());
    return 'Ifc' + camelCase;
  }

  return originalType;
}

/**
 * 根据原始类型名称获取中文名称
 * @param originalType 原始类型名称（通常是全大写）
 * @returns 中文名称，如果未找到则返回格式化后的标准名称
 */
export function getIfcChineseName(originalType: string): string {
  if (!originalType || typeof originalType !== 'string') {
    return originalType;
  }

  const upperType = originalType.toUpperCase();
  const typeInfo = IFC_TYPE_MAP[upperType];
  
  if (typeInfo) {
    return typeInfo.chinese;
  }

  // 如果没有中文名称，返回格式化后的标准名称
  return formatIfcType(originalType);
}

/**
 * 获取完整的类型信息
 * @param originalType 原始类型名称
 * @returns 包含原始名称、标准名称和中文名称的对象
 */
export function getIfcTypeInfo(originalType: string): IfcTypeInfo | null {
  if (!originalType || typeof originalType !== 'string') {
    return null;
  }

  const upperType = originalType.toUpperCase();
  return IFC_TYPE_MAP[upperType] || null;
}

/**
 * 兼容旧版本的 IfcCategoryMap 导出
 * @deprecated 请使用 getIfcChineseName 函数
 */
export const IfcCategoryMap: Record<number, string> = {};

// 为了向后兼容，保留数字键的映射（如果需要的话）
// 这部分可能需要根据实际的数字到类型的映射关系来填充