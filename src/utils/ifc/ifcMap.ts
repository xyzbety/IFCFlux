/**
 * IFC实体类型映射表
 * 包含原始名称、标准驼峰命名格式和中文名称
 */
import { IfcCategoryMap as IfcCategoryNumberMap } from './ifc-category-map'
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
  },
  '950732822': {
    original: 'IFCURIREFERENCE',
    standard: 'IfcUrireference',
    chinese: ''
  },
  '4075327185': {
    original: 'IFCTIME',
    standard: 'IfcTime',
    chinese: ''
  },
  '1209108979': {
    original: 'IFCTEMPERATURERATEOFCHANGEMEASURE',
    standard: 'IfcTemperaturerateofchangemeasure',
    chinese: ''
  },
  '3457685358': {
    original: 'IFCSOUNDPRESSURELEVELMEASURE',
    standard: 'IfcSoundpressurelevelmeasure',
    chinese: ''
  },
  '4157543285': {
    original: 'IFCSOUNDPOWERLEVELMEASURE',
    standard: 'IfcSoundpowerlevelmeasure',
    chinese: ''
  },
  '2798247006': {
    original: 'IFCPROPERTYSETDEFINITIONSET',
    standard: 'IfcPropertysetdefinitionset',
    chinese: ''
  },
  '1790229001': {
    original: 'IFCPOSITIVEINTEGER',
    standard: 'IfcPositiveinteger',
    chinese: ''
  },
  '525895558': {
    original: 'IFCNONNEGATIVELENGTHMEASURE',
    standard: 'IfcNonnegativelengthmeasure',
    chinese: ''
  },
  '1774176899': {
    original: 'IFCLINEINDEX',
    standard: 'IfcLineindex',
    chinese: ''
  },
  '1275358634': {
    original: 'IFCLANGUAGEID',
    standard: 'IfcLanguageid',
    chinese: ''
  },
  '2541165894': {
    original: 'IFCDURATION',
    standard: 'IfcDuration',
    chinese: ''
  },
  '3701338814': {
    original: 'IFCDAYINWEEKNUMBER',
    standard: 'IfcDayinweeknumber',
    chinese: ''
  },
  '2195413836': {
    original: 'IFCDATETIME',
    standard: 'IfcDatetime',
    chinese: ''
  },
  '937566702': {
    original: 'IFCDATE',
    standard: 'IfcDate',
    chinese: ''
  },
  '1683019596': {
    original: 'IFCCARDINALPOINTREFERENCE',
    standard: 'IfcCardinalpointreference',
    chinese: ''
  },
  '2314439260': {
    original: 'IFCBINARY',
    standard: 'IfcBinary',
    chinese: ''
  },
  '1500781891': {
    original: 'IFCAREADENSITYMEASURE',
    standard: 'IfcAreadensitymeasure',
    chinese: ''
  },
  '3683503648': {
    original: 'IFCARCINDEX',
    standard: 'IfcArcindex',
    chinese: ''
  },
  '4065007721': {
    original: 'IFCYEARNUMBER',
    standard: 'IfcYearnumber',
    chinese: ''
  },
  '1718600412': {
    original: 'IFCWARPINGMOMENTMEASURE',
    standard: 'IfcWarpingmomentmeasure',
    chinese: ''
  },
  '51269191': {
    original: 'IFCWARPINGCONSTANTMEASURE',
    standard: 'IfcWarpingconstantmeasure',
    chinese: ''
  },
  '2593997549': {
    original: 'IFCVOLUMETRICFLOWRATEMEASURE',
    standard: 'IfcVolumetricflowratemeasure',
    chinese: ''
  },
  '3458127941': {
    original: 'IFCVOLUMEMEASURE',
    standard: 'IfcVolumemeasure',
    chinese: ''
  },
  '3345633955': {
    original: 'IFCVAPORPERMEABILITYMEASURE',
    standard: 'IfcVaporpermeabilitymeasure',
    chinese: ''
  },
  '1278329552': {
    original: 'IFCTORQUEMEASURE',
    standard: 'IfcTorquemeasure',
    chinese: ''
  },
  '2591213694': {
    original: 'IFCTIMESTAMP',
    standard: 'IfcTimestamp',
    chinese: ''
  },
  '2726807636': {
    original: 'IFCTIMEMEASURE',
    standard: 'IfcTimemeasure',
    chinese: ''
  },
  '743184107': {
    original: 'IFCTHERMODYNAMICTEMPERATUREMEASURE',
    standard: 'IfcThermodynamictemperaturemeasure',
    chinese: ''
  },
  '2016195849': {
    original: 'IFCTHERMALTRANSMITTANCEMEASURE',
    standard: 'IfcThermaltransmittancemeasure',
    chinese: ''
  },
  '857959152': {
    original: 'IFCTHERMALRESISTANCEMEASURE',
    standard: 'IfcThermalresistancemeasure',
    chinese: ''
  },
  '2281867870': {
    original: 'IFCTHERMALEXPANSIONCOEFFICIENTMEASURE',
    standard: 'IfcThermalexpansioncoefficientmeasure',
    chinese: ''
  },
  '2645777649': {
    original: 'IFCTHERMALCONDUCTIVITYMEASURE',
    standard: 'IfcThermalconductivitymeasure',
    chinese: ''
  },
  '232962298': {
    original: 'IFCTHERMALADMITTANCEMEASURE',
    standard: 'IfcThermaladmittancemeasure',
    chinese: ''
  },
  '296282323': {
    original: 'IFCTEXTTRANSFORMATION',
    standard: 'IfcTexttransformation',
    chinese: ''
  },
  '603696268': {
    original: 'IFCTEXTFONTNAME',
    standard: 'IfcTextfontname',
    chinese: ''
  },
  '3490877962': {
    original: 'IFCTEXTDECORATION',
    standard: 'IfcTextdecoration',
    chinese: ''
  },
  '1460886941': {
    original: 'IFCTEXTALIGNMENT',
    standard: 'IfcTextalignment',
    chinese: ''
  },
  '2801250643': {
    original: 'IFCTEXT',
    standard: 'IfcText',
    chinese: ''
  },
  '58845555': {
    original: 'IFCTEMPERATUREGRADIENTMEASURE',
    standard: 'IfcTemperaturegradientmeasure',
    chinese: ''
  },
  '361837227': {
    original: 'IFCSPECULARROUGHNESS',
    standard: 'IfcSpecularroughness',
    chinese: ''
  },
  '2757832317': {
    original: 'IFCSPECULAREXPONENT',
    standard: 'IfcSpecularexponent',
    chinese: ''
  },
  '3477203348': {
    original: 'IFCSPECIFICHEATCAPACITYMEASURE',
    standard: 'IfcSpecificheatcapacitymeasure',
    chinese: ''
  },
  '993287707': {
    original: 'IFCSOUNDPRESSUREMEASURE',
    standard: 'IfcSoundpressuremeasure',
    chinese: ''
  },
  '846465480': {
    original: 'IFCSOUNDPOWERMEASURE',
    standard: 'IfcSoundpowermeasure',
    chinese: ''
  },
  '3471399674': {
    original: 'IFCSOLIDANGLEMEASURE',
    standard: 'IfcSolidanglemeasure',
    chinese: ''
  },
  '408310005': {
    original: 'IFCSHEARMODULUSMEASURE',
    standard: 'IfcShearmodulusmeasure',
    chinese: ''
  },
  '2190458107': {
    original: 'IFCSECTIONALAREAINTEGRALMEASURE',
    standard: 'IfcSectionalareaintegralmeasure',
    chinese: ''
  },
  '3467162246': {
    original: 'IFCSECTIONMODULUSMEASURE',
    standard: 'IfcSectionmodulusmeasure',
    chinese: ''
  },
  '2766185779': {
    original: 'IFCSECONDINMINUTE',
    standard: 'IfcSecondinminute',
    chinese: ''
  },
  '3211557302': {
    original: 'IFCROTATIONALSTIFFNESSMEASURE',
    standard: 'IfcRotationalstiffnessmeasure',
    chinese: ''
  },
  '1755127002': {
    original: 'IFCROTATIONALMASSMEASURE',
    standard: 'IfcRotationalmassmeasure',
    chinese: ''
  },
  '2133746277': {
    original: 'IFCROTATIONALFREQUENCYMEASURE',
    standard: 'IfcRotationalfrequencymeasure',
    chinese: ''
  },
  '200335297': {
    original: 'IFCREAL',
    standard: 'IfcReal',
    chinese: ''
  },
  '96294661': {
    original: 'IFCRATIOMEASURE',
    standard: 'IfcRatiomeasure',
    chinese: ''
  },
  '3972513137': {
    original: 'IFCRADIOACTIVITYMEASURE',
    standard: 'IfcRadioactivitymeasure',
    chinese: ''
  },
  '3665567075': {
    original: 'IFCPRESSUREMEASURE',
    standard: 'IfcPressuremeasure',
    chinese: ''
  },
  '2169031380': {
    original: 'IFCPRESENTABLETEXT',
    standard: 'IfcPresentabletext',
    chinese: ''
  },
  '1364037233': {
    original: 'IFCPOWERMEASURE',
    standard: 'IfcPowermeasure',
    chinese: ''
  },
  '1245737093': {
    original: 'IFCPOSITIVERATIOMEASURE',
    standard: 'IfcPositiveratiomeasure',
    chinese: ''
  },
  '3054510233': {
    original: 'IFCPOSITIVEPLANEANGLEMEASURE',
    standard: 'IfcPositiveplaneanglemeasure',
    chinese: ''
  },
  '2815919920': {
    original: 'IFCPOSITIVELENGTHMEASURE',
    standard: 'IfcPositivelengthmeasure',
    chinese: ''
  },
  '4042175685': {
    original: 'IFCPLANEANGLEMEASURE',
    standard: 'IfcPlaneanglemeasure',
    chinese: ''
  },
  '2642773653': {
    original: 'IFCPLANARFORCEMEASURE',
    standard: 'IfcPlanarforcemeasure',
    chinese: ''
  },
  '2260317790': {
    original: 'IFCPARAMETERVALUE',
    standard: 'IfcParametervalue',
    chinese: ''
  },
  '929793134': {
    original: 'IFCPHMEASURE',
    standard: 'IfcPhmeasure',
    chinese: ''
  },
  '2395907400': {
    original: 'IFCNUMERICMEASURE',
    standard: 'IfcNumericmeasure',
    chinese: ''
  },
  '2095195183': {
    original: 'IFCNORMALISEDRATIOMEASURE',
    standard: 'IfcNormalisedratiomeasure',
    chinese: ''
  },
  '765770214': {
    original: 'IFCMONTHINYEARNUMBER',
    standard: 'IfcMonthinyearnumber',
    chinese: ''
  },
  '2615040989': {
    original: 'IFCMONETARYMEASURE',
    standard: 'IfcMonetarymeasure',
    chinese: ''
  },
  '3114022597': {
    original: 'IFCMOMENTOFINERTIAMEASURE',
    standard: 'IfcMomentofinertiameasure',
    chinese: ''
  },
  '1648970520': {
    original: 'IFCMOLECULARWEIGHTMEASURE',
    standard: 'IfcMolecularweightmeasure',
    chinese: ''
  },
  '3177669450': {
    original: 'IFCMOISTUREDIFFUSIVITYMEASURE',
    standard: 'IfcMoisturediffusivitymeasure',
    chinese: ''
  },
  '1753493141': {
    original: 'IFCMODULUSOFSUBGRADEREACTIONMEASURE',
    standard: 'IfcModulusofsubgradereactionmeasure',
    chinese: ''
  },
  '1052454078': {
    original: 'IFCMODULUSOFROTATIONALSUBGRADEREACTIONMEASURE',
    standard: 'IfcModulusofrotationalsubgradereactionmeasure',
    chinese: ''
  },
  '2173214787': {
    original: 'IFCMODULUSOFLINEARSUBGRADEREACTIONMEASURE',
    standard: 'IfcModulusoflinearsubgradereactionmeasure',
    chinese: ''
  },
  '3341486342': {
    original: 'IFCMODULUSOFELASTICITYMEASURE',
    standard: 'IfcModulusofelasticitymeasure',
    chinese: ''
  },
  '102610177': {
    original: 'IFCMINUTEINHOUR',
    standard: 'IfcMinuteinhour',
    chinese: ''
  },
  '3531705166': {
    original: 'IFCMASSPERLENGTHMEASURE',
    standard: 'IfcMassperlengthmeasure',
    chinese: ''
  },
  '3124614049': {
    original: 'IFCMASSMEASURE',
    standard: 'IfcMassmeasure',
    chinese: ''
  },
  '4017473158': {
    original: 'IFCMASSFLOWRATEMEASURE',
    standard: 'IfcMassflowratemeasure',
    chinese: ''
  },
  '1477762836': {
    original: 'IFCMASSDENSITYMEASURE',
    standard: 'IfcMassdensitymeasure',
    chinese: ''
  },
  '2486716878': {
    original: 'IFCMAGNETICFLUXMEASURE',
    standard: 'IfcMagneticfluxmeasure',
    chinese: ''
  },
  '286949696': {
    original: 'IFCMAGNETICFLUXDENSITYMEASURE',
    standard: 'IfcMagneticfluxdensitymeasure',
    chinese: ''
  },
  '151039812': {
    original: 'IFCLUMINOUSINTENSITYMEASURE',
    standard: 'IfcLuminousintensitymeasure',
    chinese: ''
  },
  '2755797622': {
    original: 'IFCLUMINOUSINTENSITYDISTRIBUTIONMEASURE',
    standard: 'IfcLuminousintensitydistributionmeasure',
    chinese: ''
  },
  '2095003142': {
    original: 'IFCLUMINOUSFLUXMEASURE',
    standard: 'IfcLuminousfluxmeasure',
    chinese: ''
  },
  '503418787': {
    original: 'IFCLOGICAL',
    standard: 'IfcLogical',
    chinese: ''
  },
  '3086160713': {
    original: 'IFCLINEARVELOCITYMEASURE',
    standard: 'IfcLinearvelocitymeasure',
    chinese: ''
  },
  '1307019551': {
    original: 'IFCLINEARSTIFFNESSMEASURE',
    standard: 'IfcLinearstiffnessmeasure',
    chinese: ''
  },
  '2128979029': {
    original: 'IFCLINEARMOMENTMEASURE',
    standard: 'IfcLinearmomentmeasure',
    chinese: ''
  },
  '191860431': {
    original: 'IFCLINEARFORCEMEASURE',
    standard: 'IfcLinearforcemeasure',
    chinese: ''
  },
  '1243674935': {
    original: 'IFCLENGTHMEASURE',
    standard: 'IfcLengthmeasure',
    chinese: ''
  },
  '3258342251': {
    original: 'IFCLABEL',
    standard: 'IfcLabel',
    chinese: ''
  },
  '2054016361': {
    original: 'IFCKINEMATICVISCOSITYMEASURE',
    standard: 'IfcKinematicviscositymeasure',
    chinese: ''
  },
  '3192672207': {
    original: 'IFCISOTHERMALMOISTURECAPACITYMEASURE',
    standard: 'IfcIsothermalmoisturecapacitymeasure',
    chinese: ''
  },
  '3686016028': {
    original: 'IFCIONCONCENTRATIONMEASURE',
    standard: 'IfcIonconcentrationmeasure',
    chinese: ''
  },
  '3809634241': {
    original: 'IFCINTEGERCOUNTRATEMEASURE',
    standard: 'IfcIntegercountratemeasure',
    chinese: ''
  },
  '1939436016': {
    original: 'IFCINTEGER',
    standard: 'IfcInteger',
    chinese: ''
  },
  '2679005408': {
    original: 'IFCINDUCTANCEMEASURE',
    standard: 'IfcInductancemeasure',
    chinese: ''
  },
  '3358199106': {
    original: 'IFCILLUMINANCEMEASURE',
    standard: 'IfcIlluminancemeasure',
    chinese: ''
  },
  '983778844': {
    original: 'IFCIDENTIFIER',
    standard: 'IfcIdentifier',
    chinese: ''
  },
  '2589826445': {
    original: 'IFCHOURINDAY',
    standard: 'IfcHourinday',
    chinese: ''
  },
  '1158859006': {
    original: 'IFCHEATINGVALUEMEASURE',
    standard: 'IfcHeatingvaluemeasure',
    chinese: ''
  },
  '3113092358': {
    original: 'IFCHEATFLUXDENSITYMEASURE',
    standard: 'IfcHeatfluxdensitymeasure',
    chinese: ''
  },
  '3064340077': {
    original: 'IFCGLOBALLYUNIQUEID',
    standard: 'IfcGloballyuniqueid',
    chinese: ''
  },
  '3044325142': {
    original: 'IFCFREQUENCYMEASURE',
    standard: 'IfcFrequencymeasure',
    chinese: ''
  },
  '1361398929': {
    original: 'IFCFORCEMEASURE',
    standard: 'IfcForcemeasure',
    chinese: ''
  },
  '2590844177': {
    original: 'IFCFONTWEIGHT',
    standard: 'IfcFontweight',
    chinese: ''
  },
  '2715512545': {
    original: 'IFCFONTVARIANT',
    standard: 'IfcFontvariant',
    chinese: ''
  },
  '1102727119': {
    original: 'IFCFONTSTYLE',
    standard: 'IfcFontstyle',
    chinese: ''
  },
  '2078135608': {
    original: 'IFCENERGYMEASURE',
    standard: 'IfcEnergymeasure',
    chinese: ''
  },
  '2506197118': {
    original: 'IFCELECTRICVOLTAGEMEASURE',
    standard: 'IfcElectricvoltagemeasure',
    chinese: ''
  },
  '2951915441': {
    original: 'IFCELECTRICRESISTANCEMEASURE',
    standard: 'IfcElectricresistancemeasure',
    chinese: ''
  },
  '3790457270': {
    original: 'IFCELECTRICCURRENTMEASURE',
    standard: 'IfcElectriccurrentmeasure',
    chinese: ''
  },
  '2093906313': {
    original: 'IFCELECTRICCONDUCTANCEMEASURE',
    standard: 'IfcElectricconductancemeasure',
    chinese: ''
  },
  '3818826038': {
    original: 'IFCELECTRICCHARGEMEASURE',
    standard: 'IfcElectricchargemeasure',
    chinese: ''
  },
  '1827137117': {
    original: 'IFCELECTRICCAPACITANCEMEASURE',
    standard: 'IfcElectriccapacitancemeasure',
    chinese: ''
  },
  '69416015': {
    original: 'IFCDYNAMICVISCOSITYMEASURE',
    standard: 'IfcDynamicviscositymeasure',
    chinese: ''
  },
  '524656162': {
    original: 'IFCDOSEEQUIVALENTMEASURE',
    standard: 'IfcDoseequivalentmeasure',
    chinese: ''
  },
  '4134073009': {
    original: 'IFCDIMENSIONCOUNT',
    standard: 'IfcDimensioncount',
    chinese: ''
  },
  '1514641115': {
    original: 'IFCDESCRIPTIVEMEASURE',
    standard: 'IfcDescriptivemeasure',
    chinese: ''
  },
  '300323983': {
    original: 'IFCDAYLIGHTSAVINGHOUR',
    standard: 'IfcDaylightsavinghour',
    chinese: ''
  },
  '86635668': {
    original: 'IFCDAYINMONTHNUMBER',
    standard: 'IfcDayinmonthnumber',
    chinese: ''
  },
  '94842927': {
    original: 'IFCCURVATUREMEASURE',
    standard: 'IfcCurvaturemeasure',
    chinese: ''
  },
  '1778710042': {
    original: 'IFCCOUNTMEASURE',
    standard: 'IfcCountmeasure',
    chinese: ''
  },
  '3238673880': {
    original: 'IFCCONTEXTDEPENDENTMEASURE',
    standard: 'IfcContextdependentmeasure',
    chinese: ''
  },
  '3812528620': {
    original: 'IFCCOMPOUNDPLANEANGLEMEASURE',
    standard: 'IfcCompoundplaneanglemeasure',
    chinese: ''
  },
  '2991860651': {
    original: 'IFCCOMPLEXNUMBER',
    standard: 'IfcComplexnumber',
    chinese: ''
  },
  '1867003952': {
    original: 'IFCBOXALIGNMENT',
    standard: 'IfcBoxalignment',
    chinese: ''
  },
  '2735952531': {
    original: 'IFCBOOLEAN',
    standard: 'IfcBoolean',
    chinese: ''
  },
  '2650437152': {
    original: 'IFCAREAMEASURE',
    standard: 'IfcAreameasure',
    chinese: ''
  },
  '632304761': {
    original: 'IFCANGULARVELOCITYMEASURE',
    standard: 'IfcAngularvelocitymeasure',
    chinese: ''
  },
  '360377573': {
    original: 'IFCAMOUNTOFSUBSTANCEMEASURE',
    standard: 'IfcAmountofsubstancemeasure',
    chinese: ''
  },
  '4182062534': {
    original: 'IFCACCELERATIONMEASURE',
    standard: 'IfcAccelerationmeasure',
    chinese: ''
  },
  '3699917729': {
    original: 'IFCABSORBEDDOSEMEASURE',
    standard: 'IfcAbsorbeddosemeasure',
    chinese: ''
  },
  '1971632696': {
    original: 'IFCGEOSLICE',
    standard: 'IfcGeoslice',
    chinese: ''
  },
  '2680139844': {
    original: 'IFCGEOMODEL',
    standard: 'IfcGeomodel',
    chinese: ''
  },
  '24726584': {
    original: 'IFCELECTRICFLOWTREATMENTDEVICE',
    standard: 'IfcElectricflowtreatmentdevice',
    chinese: ''
  },
  '3693000487': {
    original: 'IFCDISTRIBUTIONBOARD',
    standard: 'IfcDistributionboard',
    chinese: ''
  },
  '3460952963': {
    original: 'IFCCONVEYORSEGMENT',
    standard: 'IfcConveyorsegment',
    chinese: ''
  },
  '3999819293': {
    original: 'IFCCAISSONFOUNDATION',
    standard: 'IfcCaissonfoundation',
    chinese: ''
  },
  '3314249567': {
    original: 'IFCBOREHOLE',
    standard: 'IfcBorehole',
    chinese: ''
  },
  '4196446775': {
    original: 'IFCBEARING',
    standard: 'IfcBearing',
    chinese: ''
  },
  '325726236': {
    original: 'IFCALIGNMENT',
    standard: 'IfcAlignment',
    chinese: ''
  },
  '3425753595': {
    original: 'IFCTRACKELEMENT',
    standard: 'IfcTrackelement',
    chinese: ''
  },
  '991950508': {
    original: 'IFCSIGNAL',
    standard: 'IfcSignal',
    chinese: ''
  },
  '3798194928': {
    original: 'IFCREINFORCEDSOIL',
    standard: 'IfcReinforcedsoil',
    chinese: ''
  },
  '3290496277': {
    original: 'IFCRAIL',
    standard: 'IfcRail',
    chinese: ''
  },
  '1383356374': {
    original: 'IFCPAVEMENT',
    standard: 'IfcPavement',
    chinese: ''
  },
  '2182337498': {
    original: 'IFCNAVIGATIONELEMENT',
    standard: 'IfcNavigationelement',
    chinese: ''
  },
  '234836483': {
    original: 'IFCMOORINGDEVICE',
    standard: 'IfcMooringdevice',
    chinese: ''
  },
  '2078563270': {
    original: 'IFCMOBILETELECOMMUNICATIONSAPPLIANCE',
    standard: 'IfcMobiletelecommunicationsappliance',
    chinese: ''
  },
  '1638804497': {
    original: 'IFCLIQUIDTERMINAL',
    standard: 'IfcLiquidterminal',
    chinese: ''
  },
  '1154579445': {
    original: 'IFCLINEARPOSITIONINGELEMENT',
    standard: 'IfcLinearpositioningelement',
    chinese: ''
  },
  '2696325953': {
    original: 'IFCKERB',
    standard: 'IfcKerb',
    chinese: ''
  },
  '2713699986': {
    original: 'IFCGEOTECHNICALASSEMBLY',
    standard: 'IfcGeotechnicalassembly',
    chinese: ''
  },
  '2142170206': {
    original: 'IFCELECTRICFLOWTREATMENTDEVICETYPE',
    standard: 'IfcElectricflowtreatmentdevicetype',
    chinese: ''
  },
  '3376911765': {
    original: 'IFCEARTHWORKSFILL',
    standard: 'IfcEarthworksfill',
    chinese: ''
  },
  '1077100507': {
    original: 'IFCEARTHWORKSELEMENT',
    standard: 'IfcEarthworkselement',
    chinese: ''
  },
  '3071239417': {
    original: 'IFCEARTHWORKSCUT',
    standard: 'IfcEarthworkscut',
    chinese: ''
  },
  '479945903': {
    original: 'IFCDISTRIBUTIONBOARDTYPE',
    standard: 'IfcDistributionboardtype',
    chinese: ''
  },
  '3426335179': {
    original: 'IFCDEEPFOUNDATION',
    standard: 'IfcDeepfoundation',
    chinese: ''
  },
  '1502416096': {
    original: 'IFCCOURSE',
    standard: 'IfcCourse',
    chinese: ''
  },
  '2940368186': {
    original: 'IFCCONVEYORSEGMENTTYPE',
    standard: 'IfcConveyorsegmenttype',
    chinese: ''
  },
  '3203706013': {
    original: 'IFCCAISSONFOUNDATIONTYPE',
    standard: 'IfcCaissonfoundationtype',
    chinese: ''
  },
  '3862327254': {
    original: 'IFCBUILTSYSTEM',
    standard: 'IfcBuiltsystem',
    chinese: ''
  },
  '1876633798': {
    original: 'IFCBUILTELEMENT',
    standard: 'IfcBuiltelement',
    chinese: ''
  },
  '963979645': {
    original: 'IFCBRIDGEPART',
    standard: 'IfcBridgepart',
    chinese: ''
  },
  '644574406': {
    original: 'IFCBRIDGE',
    standard: 'IfcBridge',
    chinese: ''
  },
  '3649138523': {
    original: 'IFCBEARINGTYPE',
    standard: 'IfcBearingtype',
    chinese: ''
  },
  '1662888072': {
    original: 'IFCALIGNMENTVERTICAL',
    standard: 'IfcAlignmentvertical',
    chinese: ''
  },
  '317615605': {
    original: 'IFCALIGNMENTSEGMENT',
    standard: 'IfcAlignmentsegment',
    chinese: ''
  },
  '1545765605': {
    original: 'IFCALIGNMENTHORIZONTAL',
    standard: 'IfcAlignmenthorizontal',
    chinese: ''
  },
  '4266260250': {
    original: 'IFCALIGNMENTCANT',
    standard: 'IfcAlignmentcant',
    chinese: ''
  },
  '3956297820': {
    original: 'IFCVIBRATIONDAMPERTYPE',
    standard: 'IfcVibrationdampertype',
    chinese: ''
  },
  '1530820697': {
    original: 'IFCVIBRATIONDAMPER',
    standard: 'IfcVibrationdamper',
    chinese: ''
  },
  '840318589': {
    original: 'IFCVEHICLE',
    standard: 'IfcVehicle',
    chinese: ''
  },
  '1953115116': {
    original: 'IFCTRANSPORTATIONDEVICE',
    standard: 'IfcTransportationdevice',
    chinese: ''
  },
  '618700268': {
    original: 'IFCTRACKELEMENTTYPE',
    standard: 'IfcTrackelementtype',
    chinese: ''
  },
  '2281632017': {
    original: 'IFCTENDONCONDUITTYPE',
    standard: 'IfcTendonconduittype',
    chinese: ''
  },
  '3663046924': {
    original: 'IFCTENDONCONDUIT',
    standard: 'IfcTendonconduit',
    chinese: ''
  },
  '42703149': {
    original: 'IFCSINESPIRAL',
    standard: 'IfcSinespiral',
    chinese: ''
  },
  '1894708472': {
    original: 'IFCSIGNALTYPE',
    standard: 'IfcSignaltype',
    chinese: ''
  },
  '3599934289': {
    original: 'IFCSIGNTYPE',
    standard: 'IfcSigntype',
    chinese: ''
  },
  '33720170': {
    original: 'IFCSIGN',
    standard: 'IfcSign',
    chinese: ''
  },
  '1027922057': {
    original: 'IFCSEVENTHORDERPOLYNOMIALSPIRAL',
    standard: 'IfcSeventhorderpolynomialspiral',
    chinese: ''
  },
  '544395925': {
    original: 'IFCSEGMENTEDREFERENCECURVE',
    standard: 'IfcSegmentedreferencecurve',
    chinese: ''
  },
  '3649235739': {
    original: 'IFCSECONDORDERPOLYNOMIALSPIRAL',
    standard: 'IfcSecondorderpolynomialspiral',
    chinese: ''
  },
  '550521510': {
    original: 'IFCROADPART',
    standard: 'IfcRoadpart',
    chinese: ''
  },
  '146592293': {
    original: 'IFCROAD',
    standard: 'IfcRoad',
    chinese: ''
  },
  '3818125796': {
    original: 'IFCRELADHERESTOELEMENT',
    standard: 'IfcReladherestoelement',
    chinese: ''
  },
  '4021432810': {
    original: 'IFCREFERENT',
    standard: 'IfcReferent',
    chinese: ''
  },
  '1891881377': {
    original: 'IFCRAILWAYPART',
    standard: 'IfcRailwaypart',
    chinese: ''
  },
  '3992365140': {
    original: 'IFCRAILWAY',
    standard: 'IfcRailway',
    chinese: ''
  },
  '1763565496': {
    original: 'IFCRAILTYPE',
    standard: 'IfcRailtype',
    chinese: ''
  },
  '1946335990': {
    original: 'IFCPOSITIONINGELEMENT',
    standard: 'IfcPositioningelement',
    chinese: ''
  },
  '514975943': {
    original: 'IFCPAVEMENTTYPE',
    standard: 'IfcPavementtype',
    chinese: ''
  },
  '506776471': {
    original: 'IFCNAVIGATIONELEMENTTYPE',
    standard: 'IfcNavigationelementtype',
    chinese: ''
  },
  '710110818': {
    original: 'IFCMOORINGDEVICETYPE',
    standard: 'IfcMooringdevicetype',
    chinese: ''
  },
  '1950438474': {
    original: 'IFCMOBILETELECOMMUNICATIONSAPPLIANCETYPE',
    standard: 'IfcMobiletelecommunicationsappliancetype',
    chinese: ''
  },
  '976884017': {
    original: 'IFCMARINEPART',
    standard: 'IfcMarinepart',
    chinese: ''
  },
  '525669439': {
    original: 'IFCMARINEFACILITY',
    standard: 'IfcMarinefacility',
    chinese: ''
  },
  '1770583370': {
    original: 'IFCLIQUIDTERMINALTYPE',
    standard: 'IfcLiquidterminaltype',
    chinese: ''
  },
  '2176059722': {
    original: 'IFCLINEARELEMENT',
    standard: 'IfcLinearelement',
    chinese: ''
  },
  '679976338': {
    original: 'IFCKERBTYPE',
    standard: 'IfcKerbtype',
    chinese: ''
  },
  '3948183225': {
    original: 'IFCIMPACTPROTECTIONDEVICETYPE',
    standard: 'IfcImpactprotectiondevicetype',
    chinese: ''
  },
  '2568555532': {
    original: 'IFCIMPACTPROTECTIONDEVICE',
    standard: 'IfcImpactprotectiondevice',
    chinese: ''
  },
  '2898700619': {
    original: 'IFCGRADIENTCURVE',
    standard: 'IfcGradientcurve',
    chinese: ''
  },
  '1594536857': {
    original: 'IFCGEOTECHNICALSTRATUM',
    standard: 'IfcGeotechnicalstratum',
    chinese: ''
  },
  '4230923436': {
    original: 'IFCGEOTECHNICALELEMENT',
    standard: 'IfcGeotechnicalelement',
    chinese: ''
  },
  '4228831410': {
    original: 'IFCFACILITYPARTCOMMON',
    standard: 'IfcFacilitypartcommon',
    chinese: ''
  },
  '1310830890': {
    original: 'IFCFACILITYPART',
    standard: 'IfcFacilitypart',
    chinese: ''
  },
  '24185140': {
    original: 'IFCFACILITY',
    standard: 'IfcFacility',
    chinese: ''
  },
  '4234616927': {
    original: 'IFCDIRECTRIXDERIVEDREFERENCESWEPTAREASOLID',
    standard: 'IfcDirectrixderivedreferencesweptareasolid',
    chinese: ''
  },
  '1306400036': {
    original: 'IFCDEEPFOUNDATIONTYPE',
    standard: 'IfcDeepfoundationtype',
    chinese: ''
  },
  '4189326743': {
    original: 'IFCCOURSETYPE',
    standard: 'IfcCoursetype',
    chinese: ''
  },
  '2000195564': {
    original: 'IFCCOSINESPIRAL',
    standard: 'IfcCosinespiral',
    chinese: ''
  },
  '3497074424': {
    original: 'IFCCLOTHOID',
    standard: 'IfcClothoid',
    chinese: ''
  },
  '1626504194': {
    original: 'IFCBUILTELEMENTTYPE',
    standard: 'IfcBuiltelementtype',
    chinese: ''
  },
  '3651464721': {
    original: 'IFCVEHICLETYPE',
    standard: 'IfcVehicletype',
    chinese: ''
  },
  '1229763772': {
    original: 'IFCTRIANGULATEDIRREGULARNETWORK',
    standard: 'IfcTriangulatedirregularnetwork',
    chinese: ''
  },
  '3665877780': {
    original: 'IFCTRANSPORTATIONDEVICETYPE',
    standard: 'IfcTransportationdevicetype',
    chinese: ''
  },
  '782932809': {
    original: 'IFCTHIRDORDERPOLYNOMIALSPIRAL',
    standard: 'IfcThirdorderpolynomialspiral',
    chinese: ''
  },
  '2735484536': {
    original: 'IFCSPIRAL',
    standard: 'IfcSpiral',
    chinese: ''
  },
  '1356537516': {
    original: 'IFCSECTIONEDSURFACE',
    standard: 'IfcSectionedsurface',
    chinese: ''
  },
  '1290935644': {
    original: 'IFCSECTIONEDSOLIDHORIZONTAL',
    standard: 'IfcSectionedsolidhorizontal',
    chinese: ''
  },
  '1862484736': {
    original: 'IFCSECTIONEDSOLID',
    standard: 'IfcSectionedsolid',
    chinese: ''
  },
  '1441486842': {
    original: 'IFCRELPOSITIONS',
    standard: 'IfcRelpositions',
    chinese: ''
  },
  '1033248425': {
    original: 'IFCRELASSOCIATESPROFILEDEF',
    standard: 'IfcRelassociatesprofiledef',
    chinese: ''
  },
  '3381221214': {
    original: 'IFCPOLYNOMIALCURVE',
    standard: 'IfcPolynomialcurve',
    chinese: ''
  },
  '2485787929': {
    original: 'IFCOFFSETCURVEBYDISTANCES',
    standard: 'IfcOffsetcurvebydistances',
    chinese: ''
  },
  '590820931': {
    original: 'IFCOFFSETCURVE',
    standard: 'IfcOffsetcurve',
    chinese: ''
  },
  '3465909080': {
    original: 'IFCINDEXEDPOLYGONALTEXTUREMAP',
    standard: 'IfcIndexedpolygonaltexturemap',
    chinese: ''
  },
  '593015953': {
    original: 'IFCDIRECTRIXCURVESWEPTAREASOLID',
    standard: 'IfcDirectrixcurvesweptareasolid',
    chinese: ''
  },
  '4212018352': {
    original: 'IFCCURVESEGMENT',
    standard: 'IfcCurvesegment',
    chinese: ''
  },
  '3425423356': {
    original: 'IFCAXIS2PLACEMENTLINEAR',
    standard: 'IfcAxis2placementlinear',
    chinese: ''
  },
  '823603102': {
    original: 'IFCSEGMENT',
    standard: 'IfcSegment',
    chinese: ''
  },
  '2165702409': {
    original: 'IFCPOINTBYDISTANCEEXPRESSION',
    standard: 'IfcPointbydistanceexpression',
    chinese: ''
  },
  '182550632': {
    original: 'IFCOPENCROSSPROFILEDEF',
    standard: 'IfcOpencrossprofiledef',
    chinese: ''
  },
  '388784114': {
    original: 'IFCLINEARPLACEMENT',
    standard: 'IfcLinearplacement',
    chinese: ''
  },
  '536804194': {
    original: 'IFCALIGNMENTHORIZONTALSEGMENT',
    standard: 'IfcAlignmenthorizontalsegment',
    chinese: ''
  },
  '3752311538': {
    original: 'IFCALIGNMENTCANTSEGMENT',
    standard: 'IfcAlignmentcantsegment',
    chinese: ''
  },
  '1010789467': {
    original: 'IFCTEXTURECOORDINATEINDICESWITHVOIDS',
    standard: 'IfcTexturecoordinateindiceswithvoids',
    chinese: ''
  },
  '222769930': {
    original: 'IFCTEXTURECOORDINATEINDICES',
    standard: 'IfcTexturecoordinateindices',
    chinese: ''
  },
  '2691318326': {
    original: 'IFCQUANTITYNUMBER',
    standard: 'IfcQuantitynumber',
    chinese: ''
  },
  '3633395639': {
    original: 'IFCALIGNMENTVERTICALSEGMENT',
    standard: 'IfcAlignmentverticalsegment',
    chinese: ''
  },
  '2879124712': {
    original: 'IFCALIGNMENTPARAMETERSEGMENT',
    standard: 'IfcAlignmentparametersegment',
    chinese: ''
  },
  '25142252': {
    original: 'IFCCONTROLLER',
    standard: 'IfcController',
    chinese: ''
  },
  '3087945054': {
    original: 'IFCALARM',
    standard: 'IfcAlarm',
    chinese: ''
  },
  '4288193352': {
    original: 'IFCACTUATOR',
    standard: 'IfcActuator',
    chinese: ''
  },
  '630975310': {
    original: 'IFCUNITARYCONTROLELEMENT',
    standard: 'IfcUnitarycontrolelement',
    chinese: ''
  },
  '4086658281': {
    original: 'IFCSENSOR',
    standard: 'IfcSensor',
    chinese: ''
  },
  '2295281155': {
    original: 'IFCPROTECTIVEDEVICETRIPPINGUNIT',
    standard: 'IfcProtectivedevicetrippingunit',
    chinese: ''
  },
  '182646315': {
    original: 'IFCFLOWINSTRUMENT',
    standard: 'IfcFlowinstrument',
    chinese: ''
  },
  '1426591983': {
    original: 'IFCFIRESUPPRESSIONTERMINAL',
    standard: 'IfcFiresuppressionterminal',
    chinese: ''
  },
  '819412036': {
    original: 'IFCFILTER',
    standard: 'IfcFilter',
    chinese: ''
  },
  '3415622556': {
    original: 'IFCFAN',
    standard: 'IfcFan',
    chinese: ''
  },
  '1003880860': {
    original: 'IFCELECTRICTIMECONTROL',
    standard: 'IfcElectrictimecontrol',
    chinese: ''
  },
  '402227799': {
    original: 'IFCELECTRICMOTOR',
    standard: 'IfcElectricmotor',
    chinese: ''
  },
  '264262732': {
    original: 'IFCELECTRICGENERATOR',
    standard: 'IfcElectricgenerator',
    chinese: ''
  },
  '3310460725': {
    original: 'IFCELECTRICFLOWSTORAGEDEVICE',
    standard: 'IfcElectricflowstoragedevice',
    chinese: ''
  },
  '862014818': {
    original: 'IFCELECTRICDISTRIBUTIONBOARD',
    standard: 'IfcElectricdistributionboard',
    chinese: ''
  },
  '1904799276': {
    original: 'IFCELECTRICAPPLIANCE',
    standard: 'IfcElectricappliance',
    chinese: ''
  },
  '1360408905': {
    original: 'IFCDUCTSILENCER',
    standard: 'IfcDuctsilencer',
    chinese: ''
  },
  '3518393246': {
    original: 'IFCDUCTSEGMENT',
    standard: 'IfcDuctsegment',
    chinese: ''
  },
  '342316401': {
    original: 'IFCDUCTFITTING',
    standard: 'IfcDuctfitting',
    chinese: ''
  },
  '562808652': {
    original: 'IFCDISTRIBUTIONCIRCUIT',
    standard: 'IfcDistributioncircuit',
    chinese: ''
  },
  '4074379575': {
    original: 'IFCDAMPER',
    standard: 'IfcDamper',
    chinese: ''
  },
  '3640358203': {
    original: 'IFCCOOLINGTOWER',
    standard: 'IfcCoolingtower',
    chinese: ''
  },
  '4136498852': {
    original: 'IFCCOOLEDBEAM',
    standard: 'IfcCooledbeam',
    chinese: ''
  },
  '2272882330': {
    original: 'IFCCONDENSER',
    standard: 'IfcCondenser',
    chinese: ''
  },
  '3571504051': {
    original: 'IFCCOMPRESSOR',
    standard: 'IfcCompressor',
    chinese: ''
  },
  '3221913625': {
    original: 'IFCCOMMUNICATIONSAPPLIANCE',
    standard: 'IfcCommunicationsappliance',
    chinese: ''
  },
  '639361253': {
    original: 'IFCCOIL',
    standard: 'IfcCoil',
    chinese: ''
  },
  '3902619387': {
    original: 'IFCCHILLER',
    standard: 'IfcChiller',
    chinese: ''
  },
  '4217484030': {
    original: 'IFCCABLESEGMENT',
    standard: 'IfcCablesegment',
    chinese: ''
  },
  '1051757585': {
    original: 'IFCCABLEFITTING',
    standard: 'IfcCablefitting',
    chinese: ''
  },
  '3758799889': {
    original: 'IFCCABLECARRIERSEGMENT',
    standard: 'IfcCablecarriersegment',
    chinese: ''
  },
  '635142910': {
    original: 'IFCCABLECARRIERFITTING',
    standard: 'IfcCablecarrierfitting',
    chinese: ''
  },
  '2938176219': {
    original: 'IFCBURNER',
    standard: 'IfcBurner',
    chinese: ''
  },
  '32344328': {
    original: 'IFCBOILER',
    standard: 'IfcBoiler',
    chinese: ''
  },
  '2906023776': {
    original: 'IFCBEAMSTANDARDCASE',
    standard: 'IfcBeamstandardcase',
    chinese: ''
  },
  '277319702': {
    original: 'IFCAUDIOVISUALAPPLIANCE',
    standard: 'IfcAudiovisualappliance',
    chinese: ''
  },
  '2056796094': {
    original: 'IFCAIRTOAIRHEATRECOVERY',
    standard: 'IfcAirtoairheatrecovery',
    chinese: ''
  },
  '177149247': {
    original: 'IFCAIRTERMINALBOX',
    standard: 'IfcAirterminalbox',
    chinese: ''
  },
  '1634111441': {
    original: 'IFCAIRTERMINAL',
    standard: 'IfcAirterminal',
    chinese: ''
  },
  '486154966': {
    original: 'IFCWINDOWSTANDARDCASE',
    standard: 'IfcWindowstandardcase',
    chinese: ''
  },
  '4237592921': {
    original: 'IFCWASTETERMINAL',
    standard: 'IfcWasteterminal',
    chinese: ''
  },
  '4156078855': {
    original: 'IFCWALLELEMENTEDCASE',
    standard: 'IfcWallelementedcase',
    chinese: ''
  },
  '4207607924': {
    original: 'IFCVALVE',
    standard: 'IfcValve',
    chinese: ''
  },
  '4292641817': {
    original: 'IFCUNITARYEQUIPMENT',
    standard: 'IfcUnitaryequipment',
    chinese: ''
  },
  '3179687236': {
    original: 'IFCUNITARYCONTROLELEMENTTYPE',
    standard: 'IfcUnitarycontrolelementtype',
    chinese: ''
  },
  '3026737570': {
    original: 'IFCTUBEBUNDLE',
    standard: 'IfcTubebundle',
    chinese: ''
  },
  '3825984169': {
    original: 'IFCTRANSFORMER',
    standard: 'IfcTransformer',
    chinese: ''
  },
  '812556717': {
    original: 'IFCTANK',
    standard: 'IfcTank',
    chinese: ''
  },
  '1162798199': {
    original: 'IFCSWITCHINGDEVICE',
    standard: 'IfcSwitchingdevice',
    chinese: ''
  },
  '385403989': {
    original: 'IFCSTRUCTURALLOADCASE',
    standard: 'IfcStructuralloadcase',
    chinese: ''
  },
  '1404847402': {
    original: 'IFCSTACKTERMINAL',
    standard: 'IfcStackterminal',
    chinese: ''
  },
  '1999602285': {
    original: 'IFCSPACEHEATER',
    standard: 'IfcSpaceheater',
    chinese: ''
  },
  '3420628829': {
    original: 'IFCSOLARDEVICE',
    standard: 'IfcSolardevice',
    chinese: ''
  },
  '3027962421': {
    original: 'IFCSLABSTANDARDCASE',
    standard: 'IfcSlabstandardcase',
    chinese: ''
  },
  '3127900445': {
    original: 'IFCSLABELEMENTEDCASE',
    standard: 'IfcSlabelementedcase',
    chinese: ''
  },
  '1329646415': {
    original: 'IFCSHADINGDEVICE',
    standard: 'IfcShadingdevice',
    chinese: ''
  },
  '3053780830': {
    original: 'IFCSANITARYTERMINAL',
    standard: 'IfcSanitaryterminal',
    chinese: ''
  },
  '2572171363': {
    original: 'IFCREINFORCINGBARTYPE',
    standard: 'IfcReinforcingbartype',
    chinese: ''
  },
  '1232101972': {
    original: 'IFCRATIONALBSPLINECURVEWITHKNOTS',
    standard: 'IfcRationalbsplinecurvewithknots',
    chinese: ''
  },
  '90941305': {
    original: 'IFCPUMP',
    standard: 'IfcPump',
    chinese: ''
  },
  '655969474': {
    original: 'IFCPROTECTIVEDEVICETRIPPINGUNITTYPE',
    standard: 'IfcProtectivedevicetrippingunittype',
    chinese: ''
  },
  '738039164': {
    original: 'IFCPROTECTIVEDEVICE',
    standard: 'IfcProtectivedevice',
    chinese: ''
  },
  '1156407060': {
    original: 'IFCPLATESTANDARDCASE',
    standard: 'IfcPlatestandardcase',
    chinese: ''
  },
  '3612865200': {
    original: 'IFCPIPESEGMENT',
    standard: 'IfcPipesegment',
    chinese: ''
  },
  '310824031': {
    original: 'IFCPIPEFITTING',
    standard: 'IfcPipefitting',
    chinese: ''
  },
  '3694346114': {
    original: 'IFCOUTLET',
    standard: 'IfcOutlet',
    chinese: ''
  },
  '144952367': {
    original: 'IFCOUTERBOUNDARYCURVE',
    standard: 'IfcOuterboundarycurve',
    chinese: ''
  },
  '2474470126': {
    original: 'IFCMOTORCONNECTION',
    standard: 'IfcMotorconnection',
    chinese: ''
  },
  '1911478936': {
    original: 'IFCMEMBERSTANDARDCASE',
    standard: 'IfcMemberstandardcase',
    chinese: ''
  },
  '1437502449': {
    original: 'IFCMEDICALDEVICE',
    standard: 'IfcMedicaldevice',
    chinese: ''
  },
  '629592764': {
    original: 'IFCLIGHTFIXTURE',
    standard: 'IfcLightfixture',
    chinese: ''
  },
  '76236018': {
    original: 'IFCLAMP',
    standard: 'IfcLamp',
    chinese: ''
  },
  '2176052936': {
    original: 'IFCJUNCTIONBOX',
    standard: 'IfcJunctionbox',
    chinese: ''
  },
  '4175244083': {
    original: 'IFCINTERCEPTOR',
    standard: 'IfcInterceptor',
    chinese: ''
  },
  '2068733104': {
    original: 'IFCHUMIDIFIER',
    standard: 'IfcHumidifier',
    chinese: ''
  },
  '3319311131': {
    original: 'IFCHEATEXCHANGER',
    standard: 'IfcHeatexchanger',
    chinese: ''
  },
  '2188021234': {
    original: 'IFCFLOWMETER',
    standard: 'IfcFlowmeter',
    chinese: ''
  },
  '1209101575': {
    original: 'IFCEXTERNALSPATIALELEMENT',
    standard: 'IfcExternalspatialelement',
    chinese: ''
  },
  '484807127': {
    original: 'IFCEVAPORATOR',
    standard: 'IfcEvaporator',
    chinese: ''
  },
  '3747195512': {
    original: 'IFCEVAPORATIVECOOLER',
    standard: 'IfcEvaporativecooler',
    chinese: ''
  },
  '2814081492': {
    original: 'IFCENGINE',
    standard: 'IfcEngine',
    chinese: ''
  },
  '2417008758': {
    original: 'IFCELECTRICDISTRIBUTIONBOARDTYPE',
    standard: 'IfcElectricdistributionboardtype',
    chinese: ''
  },
  '3242481149': {
    original: 'IFCDOORSTANDARDCASE',
    standard: 'IfcDoorstandardcase',
    chinese: ''
  },
  '3205830791': {
    original: 'IFCDISTRIBUTIONSYSTEM',
    standard: 'IfcDistributionsystem',
    chinese: ''
  },
  '400855858': {
    original: 'IFCCOMMUNICATIONSAPPLIANCETYPE',
    standard: 'IfcCommunicationsappliancetype',
    chinese: ''
  },
  '905975707': {
    original: 'IFCCOLUMNSTANDARDCASE',
    standard: 'IfcColumnstandardcase',
    chinese: ''
  },
  '1677625105': {
    original: 'IFCCIVILELEMENT',
    standard: 'IfcCivilelement',
    chinese: ''
  },
  '3296154744': {
    original: 'IFCCHIMNEY',
    standard: 'IfcChimney',
    chinese: ''
  },
  '2674252688': {
    original: 'IFCCABLEFITTINGTYPE',
    standard: 'IfcCablefittingtype',
    chinese: ''
  },
  '2188180465': {
    original: 'IFCBURNERTYPE',
    standard: 'IfcBurnertype',
    chinese: ''
  },
  '1177604601': {
    original: 'IFCBUILDINGSYSTEM',
    standard: 'IfcBuildingsystem',
    chinese: ''
  },
  '39481116': {
    original: 'IFCBUILDINGELEMENTPARTTYPE',
    standard: 'IfcBuildingelementparttype',
    chinese: ''
  },
  '1136057603': {
    original: 'IFCBOUNDARYCURVE',
    standard: 'IfcBoundarycurve',
    chinese: ''
  },
  '2461110595': {
    original: 'IFCBSPLINECURVEWITHKNOTS',
    standard: 'IfcBsplinecurvewithknots',
    chinese: ''
  },
  '1532957894': {
    original: 'IFCAUDIOVISUALAPPLIANCETYPE',
    standard: 'IfcAudiovisualappliancetype',
    chinese: ''
  },
  '4088093105': {
    original: 'IFCWORKCALENDAR',
    standard: 'IfcWorkcalendar',
    chinese: ''
  },
  '4009809668': {
    original: 'IFCWINDOWTYPE',
    standard: 'IfcWindowtype',
    chinese: ''
  },
  '926996030': {
    original: 'IFCVOIDINGFEATURE',
    standard: 'IfcVoidingfeature',
    chinese: ''
  },
  '2391383451': {
    original: 'IFCVIBRATIONISOLATOR',
    standard: 'IfcVibrationisolator',
    chinese: ''
  },
  '2415094496': {
    original: 'IFCTENDONTYPE',
    standard: 'IfcTendontype',
    chinese: ''
  },
  '3081323446': {
    original: 'IFCTENDONANCHORTYPE',
    standard: 'IfcTendonanchortype',
    chinese: ''
  },
  '413509423': {
    original: 'IFCSYSTEMFURNITUREELEMENT',
    standard: 'IfcSystemfurnitureelement',
    chinese: ''
  },
  '3101698114': {
    original: 'IFCSURFACEFEATURE',
    standard: 'IfcSurfacefeature',
    chinese: ''
  },
  '3657597509': {
    original: 'IFCSTRUCTURALSURFACEACTION',
    standard: 'IfcStructuralsurfaceaction',
    chinese: ''
  },
  '2757150158': {
    original: 'IFCSTRUCTURALCURVEREACTION',
    standard: 'IfcStructuralcurvereaction',
    chinese: ''
  },
  '1004757350': {
    original: 'IFCSTRUCTURALCURVEACTION',
    standard: 'IfcStructuralcurveaction',
    chinese: ''
  },
  '338393293': {
    original: 'IFCSTAIRTYPE',
    standard: 'IfcStairtype',
    chinese: ''
  },
  '1072016465': {
    original: 'IFCSOLARDEVICETYPE',
    standard: 'IfcSolardevicetype',
    chinese: ''
  },
  '4074543187': {
    original: 'IFCSHADINGDEVICETYPE',
    standard: 'IfcShadingdevicetype',
    chinese: ''
  },
  '2157484638': {
    original: 'IFCSEAMCURVE',
    standard: 'IfcSeamcurve',
    chinese: ''
  },
  '2781568857': {
    original: 'IFCROOFTYPE',
    standard: 'IfcRooftype',
    chinese: ''
  },
  '2310774935': {
    original: 'IFCREINFORCINGMESHTYPE',
    standard: 'IfcReinforcingmeshtype',
    chinese: ''
  },
  '964333572': {
    original: 'IFCREINFORCINGELEMENTTYPE',
    standard: 'IfcReinforcingelementtype',
    chinese: ''
  },
  '683857671': {
    original: 'IFCRATIONALBSPLINESURFACEWITHKNOTS',
    standard: 'IfcRationalbsplinesurfacewithknots',
    chinese: ''
  },
  '1469900589': {
    original: 'IFCRAMPTYPE',
    standard: 'IfcRamptype',
    chinese: ''
  },
  '2839578677': {
    original: 'IFCPOLYGONALFACESET',
    standard: 'IfcPolygonalfaceset',
    chinese: ''
  },
  '1158309216': {
    original: 'IFCPILETYPE',
    standard: 'IfcPiletype',
    chinese: ''
  },
  '3079942009': {
    original: 'IFCOPENINGSTANDARDCASE',
    standard: 'IfcOpeningstandardcase',
    chinese: ''
  },
  '1114901282': {
    original: 'IFCMEDICALDEVICETYPE',
    standard: 'IfcMedicaldevicetype',
    chinese: ''
  },
  '3113134337': {
    original: 'IFCINTERSECTIONCURVE',
    standard: 'IfcIntersectioncurve',
    chinese: ''
  },
  '3946677679': {
    original: 'IFCINTERCEPTORTYPE',
    standard: 'IfcInterceptortype',
    chinese: ''
  },
  '2571569899': {
    original: 'IFCINDEXEDPOLYCURVE',
    standard: 'IfcIndexedpolycurve',
    chinese: ''
  },
  '3493046030': {
    original: 'IFCGEOGRAPHICELEMENT',
    standard: 'IfcGeographicelement',
    chinese: ''
  },
  '1509553395': {
    original: 'IFCFURNITURE',
    standard: 'IfcFurniture',
    chinese: ''
  },
  '1893162501': {
    original: 'IFCFOOTINGTYPE',
    standard: 'IfcFootingtype',
    chinese: ''
  },
  '2853485674': {
    original: 'IFCEXTERNALSPATIALSTRUCTUREELEMENT',
    standard: 'IfcExternalspatialstructureelement',
    chinese: ''
  },
  '4148101412': {
    original: 'IFCEVENT',
    standard: 'IfcEvent',
    chinese: ''
  },
  '132023988': {
    original: 'IFCENGINETYPE',
    standard: 'IfcEnginetype',
    chinese: ''
  },
  '2397081782': {
    original: 'IFCELEMENTASSEMBLYTYPE',
    standard: 'IfcElementassemblytype',
    chinese: ''
  },
  '2323601079': {
    original: 'IFCDOORTYPE',
    standard: 'IfcDoortype',
    chinese: ''
  },
  '1213902940': {
    original: 'IFCCYLINDRICALSURFACE',
    standard: 'IfcCylindricalsurface',
    chinese: ''
  },
  '1525564444': {
    original: 'IFCCONSTRUCTIONPRODUCTRESOURCETYPE',
    standard: 'IfcConstructionproductresourcetype',
    chinese: ''
  },
  '4105962743': {
    original: 'IFCCONSTRUCTIONMATERIALRESOURCETYPE',
    standard: 'IfcConstructionmaterialresourcetype',
    chinese: ''
  },
  '2185764099': {
    original: 'IFCCONSTRUCTIONEQUIPMENTRESOURCETYPE',
    standard: 'IfcConstructionequipmentresourcetype',
    chinese: ''
  },
  '15328376': {
    original: 'IFCCOMPOSITECURVEONSURFACE',
    standard: 'IfcCompositecurveonsurface',
    chinese: ''
  },
  '3875453745': {
    original: 'IFCCOMPLEXPROPERTYTEMPLATE',
    standard: 'IfcComplexpropertytemplate',
    chinese: ''
  },
  '3893394355': {
    original: 'IFCCIVILELEMENTTYPE',
    standard: 'IfcCivilelementtype',
    chinese: ''
  },
  '2197970202': {
    original: 'IFCCHIMNEYTYPE',
    standard: 'IfcChimneytype',
    chinese: ''
  },
  '167062518': {
    original: 'IFCBSPLINESURFACEWITHKNOTS',
    standard: 'IfcBsplinesurfacewithknots',
    chinese: ''
  },
  '2887950389': {
    original: 'IFCBSPLINESURFACE',
    standard: 'IfcBsplinesurface',
    chinese: ''
  },
  '2603310189': {
    original: 'IFCADVANCEDBREPWITHVOIDS',
    standard: 'IfcAdvancedbrepwithvoids',
    chinese: ''
  },
  '1635779807': {
    original: 'IFCADVANCEDBREP',
    standard: 'IfcAdvancedbrep',
    chinese: ''
  },
  '2916149573': {
    original: 'IFCTRIANGULATEDFACESET',
    standard: 'IfcTriangulatedfaceset',
    chinese: ''
  },
  '1935646853': {
    original: 'IFCTOROIDALSURFACE',
    standard: 'IfcToroidalsurface',
    chinese: ''
  },
  '2387106220': {
    original: 'IFCTESSELLATEDFACESET',
    standard: 'IfcTessellatedfaceset',
    chinese: ''
  },
  '3206491090': {
    original: 'IFCTASKTYPE',
    standard: 'IfcTasktype',
    chinese: ''
  },
  '699246055': {
    original: 'IFCSURFACECURVE',
    standard: 'IfcSurfacecurve',
    chinese: ''
  },
  '4095615324': {
    original: 'IFCSUBCONTRACTRESOURCETYPE',
    standard: 'IfcSubcontractresourcetype',
    chinese: ''
  },
  '603775116': {
    original: 'IFCSTRUCTURALSURFACEREACTION',
    standard: 'IfcStructuralsurfacereaction',
    chinese: ''
  },
  '4015995234': {
    original: 'IFCSPHERICALSURFACE',
    standard: 'IfcSphericalsurface',
    chinese: ''
  },
  '2481509218': {
    original: 'IFCSPATIALZONETYPE',
    standard: 'IfcSpatialzonetype',
    chinese: ''
  },
  '463610769': {
    original: 'IFCSPATIALZONE',
    standard: 'IfcSpatialzone',
    chinese: ''
  },
  '710998568': {
    original: 'IFCSPATIALELEMENTTYPE',
    standard: 'IfcSpatialelementtype',
    chinese: ''
  },
  '1412071761': {
    original: 'IFCSPATIALELEMENT',
    standard: 'IfcSpatialelement',
    chinese: ''
  },
  '3663146110': {
    original: 'IFCSIMPLEPROPERTYTEMPLATE',
    standard: 'IfcSimplepropertytemplate',
    chinese: ''
  },
  '3243963512': {
    original: 'IFCREVOLVEDAREASOLIDTAPERED',
    standard: 'IfcRevolvedareasolidtapered',
    chinese: ''
  },
  '816062949': {
    original: 'IFCREPARAMETRISEDCOMPOSITECURVESEGMENT',
    standard: 'IfcReparametrisedcompositecurvesegment',
    chinese: ''
  },
  '1521410863': {
    original: 'IFCRELSPACEBOUNDARY2NDLEVEL',
    standard: 'IfcRelspaceboundary2ndlevel',
    chinese: ''
  },
  '3523091289': {
    original: 'IFCRELSPACEBOUNDARY1STLEVEL',
    standard: 'IfcRelspaceboundary1stlevel',
    chinese: ''
  },
  '427948657': {
    original: 'IFCRELINTERFERESELEMENTS',
    standard: 'IfcRelinterfereselements',
    chinese: ''
  },
  '307848117': {
    original: 'IFCRELDEFINESBYTEMPLATE',
    standard: 'IfcReldefinesbytemplate',
    chinese: ''
  },
  '1462361463': {
    original: 'IFCRELDEFINESBYOBJECT',
    standard: 'IfcReldefinesbyobject',
    chinese: ''
  },
  '2565941209': {
    original: 'IFCRELDECLARES',
    standard: 'IfcReldeclares',
    chinese: ''
  },
  '1027710054': {
    original: 'IFCRELASSIGNSTOGROUPBYFACTOR',
    standard: 'IfcRelassignstogroupbyfactor',
    chinese: ''
  },
  '3521284610': {
    original: 'IFCPROPERTYTEMPLATE',
    standard: 'IfcPropertytemplate',
    chinese: ''
  },
  '492091185': {
    original: 'IFCPROPERTYSETTEMPLATE',
    standard: 'IfcPropertysettemplate',
    chinese: ''
  },
  '653396225': {
    original: 'IFCPROJECTLIBRARY',
    standard: 'IfcProjectlibrary',
    chinese: ''
  },
  '569719735': {
    original: 'IFCPROCEDURETYPE',
    standard: 'IfcProceduretype',
    chinese: ''
  },
  '3967405729': {
    original: 'IFCPREDEFINEDPROPERTYSET',
    standard: 'IfcPredefinedpropertyset',
    chinese: ''
  },
  '1682466193': {
    original: 'IFCPCURVE',
    standard: 'IfcPcurve',
    chinese: ''
  },
  '428585644': {
    original: 'IFCLABORRESOURCETYPE',
    standard: 'IfcLaborresourcetype',
    chinese: ''
  },
  '2294589976': {
    original: 'IFCINDEXEDPOLYGONALFACEWITHVOIDS',
    standard: 'IfcIndexedpolygonalfacewithvoids',
    chinese: ''
  },
  '178912537': {
    original: 'IFCINDEXEDPOLYGONALFACE',
    standard: 'IfcIndexedpolygonalface',
    chinese: ''
  },
  '4095422895': {
    original: 'IFCGEOGRAPHICELEMENTTYPE',
    standard: 'IfcGeographicelementtype',
    chinese: ''
  },
  '2652556860': {
    original: 'IFCFIXEDREFERENCESWEPTAREASOLID',
    standard: 'IfcFixedreferencesweptareasolid',
    chinese: ''
  },
  '2804161546': {
    original: 'IFCEXTRUDEDAREASOLIDTAPERED',
    standard: 'IfcExtrudedareasolidtapered',
    chinese: ''
  },
  '4024345920': {
    original: 'IFCEVENTTYPE',
    standard: 'IfcEventtype',
    chinese: ''
  },
  '2629017746': {
    original: 'IFCCURVEBOUNDEDSURFACE',
    standard: 'IfcCurveboundedsurface',
    chinese: ''
  },
  '1815067380': {
    original: 'IFCCREWRESOURCETYPE',
    standard: 'IfcCrewresourcetype',
    chinese: ''
  },
  '3419103109': {
    original: 'IFCCONTEXT',
    standard: 'IfcContext',
    chinese: ''
  },
  '2574617495': {
    original: 'IFCCONSTRUCTIONRESOURCETYPE',
    standard: 'IfcConstructionresourcetype',
    chinese: ''
  },
  '2059837836': {
    original: 'IFCCARTESIANPOINTLIST3D',
    standard: 'IfcCartesianpointlist3d',
    chinese: ''
  },
  '1675464909': {
    original: 'IFCCARTESIANPOINTLIST2D',
    standard: 'IfcCartesianpointlist2d',
    chinese: ''
  },
  '574549367': {
    original: 'IFCCARTESIANPOINTLIST',
    standard: 'IfcCartesianpointlist',
    chinese: ''
  },
  '3406155212': {
    original: 'IFCADVANCEDFACE',
    standard: 'IfcAdvancedface',
    chinese: ''
  },
  '3698973494': {
    original: 'IFCTYPERESOURCE',
    standard: 'IfcTyperesource',
    chinese: ''
  },
  '3736923433': {
    original: 'IFCTYPEPROCESS',
    standard: 'IfcTypeprocess',
    chinese: ''
  },
  '901063453': {
    original: 'IFCTESSELLATEDITEM',
    standard: 'IfcTessellateditem',
    chinese: ''
  },
  '1096409881': {
    original: 'IFCSWEPTDISKSOLIDPOLYGONAL',
    standard: 'IfcSweptdisksolidpolygonal',
    chinese: ''
  },
  '1042787934': {
    original: 'IFCRESOURCETIME',
    standard: 'IfcResourcetime',
    chinese: ''
  },
  '1608871552': {
    original: 'IFCRESOURCECONSTRAINTRELATIONSHIP',
    standard: 'IfcResourceconstraintrelationship',
    chinese: ''
  },
  '2943643501': {
    original: 'IFCRESOURCEAPPROVALRELATIONSHIP',
    standard: 'IfcResourceapprovalrelationship',
    chinese: ''
  },
  '2090586900': {
    original: 'IFCQUANTITYSET',
    standard: 'IfcQuantityset',
    chinese: ''
  },
  '1482703590': {
    original: 'IFCPROPERTYTEMPLATEDEFINITION',
    standard: 'IfcPropertytemplatedefinition',
    chinese: ''
  },
  '3778827333': {
    original: 'IFCPREDEFINEDPROPERTIES',
    standard: 'IfcPredefinedproperties',
    chinese: ''
  },
  '2998442950': {
    original: 'IFCMIRROREDPROFILEDEF',
    standard: 'IfcMirroredprofiledef',
    chinese: ''
  },
  '853536259': {
    original: 'IFCMATERIALRELATIONSHIP',
    standard: 'IfcMaterialrelationship',
    chinese: ''
  },
  '3404854881': {
    original: 'IFCMATERIALPROFILESETUSAGETAPERING',
    standard: 'IfcMaterialprofilesetusagetapering',
    chinese: ''
  },
  '3079605661': {
    original: 'IFCMATERIALPROFILESETUSAGE',
    standard: 'IfcMaterialprofilesetusage',
    chinese: ''
  },
  '2852063980': {
    original: 'IFCMATERIALCONSTITUENTSET',
    standard: 'IfcMaterialconstituentset',
    chinese: ''
  },
  '3708119000': {
    original: 'IFCMATERIALCONSTITUENT',
    standard: 'IfcMaterialconstituent',
    chinese: ''
  },
  '1585845231': {
    original: 'IFCLAGTIME',
    standard: 'IfcLagtime',
    chinese: ''
  },
  '2133299955': {
    original: 'IFCINDEXEDTRIANGLETEXTUREMAP',
    standard: 'IfcIndexedtriangletexturemap',
    chinese: ''
  },
  '1437953363': {
    original: 'IFCINDEXEDTEXTUREMAP',
    standard: 'IfcIndexedtexturemap',
    chinese: ''
  },
  '3570813810': {
    original: 'IFCINDEXEDCOLOURMAP',
    standard: 'IfcIndexedcolourmap',
    chinese: ''
  },
  '1437805879': {
    original: 'IFCEXTERNALREFERENCERELATIONSHIP',
    standard: 'IfcExternalreferencerelationship',
    chinese: ''
  },
  '297599258': {
    original: 'IFCEXTENDEDPROPERTIES',
    standard: 'IfcExtendedproperties',
    chinese: ''
  },
  '211053100': {
    original: 'IFCEVENTTIME',
    standard: 'IfcEventtime',
    chinese: ''
  },
  '2713554722': {
    original: 'IFCCONVERSIONBASEDUNITWITHOFFSET',
    standard: 'IfcConversionbasedunitwithoffset',
    chinese: ''
  },
  '3285139300': {
    original: 'IFCCOLOURRGBLIST',
    standard: 'IfcColourrgblist',
    chinese: ''
  },
  '1236880293': {
    original: 'IFCWORKTIME',
    standard: 'IfcWorktime',
    chinese: ''
  },
  '1199560280': {
    original: 'IFCTIMEPERIOD',
    standard: 'IfcTimeperiod',
    chinese: ''
  },
  '3611470254': {
    original: 'IFCTEXTUREVERTEXLIST',
    standard: 'IfcTexturevertexlist',
    chinese: ''
  },
  '2771591690': {
    original: 'IFCTASKTIMERECURRING',
    standard: 'IfcTasktimerecurring',
    chinese: ''
  },
  '1549132990': {
    original: 'IFCTASKTIME',
    standard: 'IfcTasktime',
    chinese: ''
  },
  '2043862942': {
    original: 'IFCTABLECOLUMN',
    standard: 'IfcTablecolumn',
    chinese: ''
  },
  '2934153892': {
    original: 'IFCSURFACEREINFORCEMENTAREA',
    standard: 'IfcSurfacereinforcementarea',
    chinese: ''
  },
  '609421318': {
    original: 'IFCSTRUCTURALLOADORRESULT',
    standard: 'IfcStructuralloadorresult',
    chinese: ''
  },
  '3478079324': {
    original: 'IFCSTRUCTURALLOADCONFIGURATION',
    standard: 'IfcStructuralloadconfiguration',
    chinese: ''
  },
  '1054537805': {
    original: 'IFCSCHEDULINGTIME',
    standard: 'IfcSchedulingtime',
    chinese: ''
  },
  '2439245199': {
    original: 'IFCRESOURCELEVELRELATIONSHIP',
    standard: 'IfcResourcelevelrelationship',
    chinese: ''
  },
  '2433181523': {
    original: 'IFCREFERENCE',
    standard: 'IfcReference',
    chinese: ''
  },
  '3915482550': {
    original: 'IFCRECURRENCEPATTERN',
    standard: 'IfcRecurrencepattern',
    chinese: ''
  },
  '986844984': {
    original: 'IFCPROPERTYABSTRACTION',
    standard: 'IfcPropertyabstraction',
    chinese: ''
  },
  '3843373140': {
    original: 'IFCPROJECTEDCRS',
    standard: 'IfcProjectedcrs',
    chinese: ''
  },
  '677532197': {
    original: 'IFCPRESENTATIONITEM',
    standard: 'IfcPresentationitem',
    chinese: ''
  },
  '1507914824': {
    original: 'IFCMATERIALUSAGEDEFINITION',
    standard: 'IfcMaterialusagedefinition',
    chinese: ''
  },
  '552965576': {
    original: 'IFCMATERIALPROFILEWITHOFFSETS',
    standard: 'IfcMaterialprofilewithoffsets',
    chinese: ''
  },
  '164193824': {
    original: 'IFCMATERIALPROFILESET',
    standard: 'IfcMaterialprofileset',
    chinese: ''
  },
  '2235152071': {
    original: 'IFCMATERIALPROFILE',
    standard: 'IfcMaterialprofile',
    chinese: ''
  },
  '1847252529': {
    original: 'IFCMATERIALLAYERWITHOFFSETS',
    standard: 'IfcMateriallayerwithoffsets',
    chinese: ''
  },
  '760658860': {
    original: 'IFCMATERIALDEFINITION',
    standard: 'IfcMaterialdefinition',
    chinese: ''
  },
  '3057273783': {
    original: 'IFCMAPCONVERSION',
    standard: 'IfcMapconversion',
    chinese: ''
  },
  '4294318154': {
    original: 'IFCEXTERNALINFORMATION',
    standard: 'IfcExternalinformation',
    chinese: ''
  },
  '1466758467': {
    original: 'IFCCOORDINATEREFERENCESYSTEM',
    standard: 'IfcCoordinatereferencesystem',
    chinese: ''
  },
  '1785450214': {
    original: 'IFCCOORDINATEOPERATION',
    standard: 'IfcCoordinateoperation',
    chinese: ''
  },
  '775493141': {
    original: 'IFCCONNECTIONVOLUMEGEOMETRY',
    standard: 'IfcConnectionvolumegeometry',
    chinese: ''
  },
  '979691226': {
    original: 'IFCREINFORCINGBAR',
    standard: 'IfcReinforcingbar',
    chinese: ''
  },
  '3700593921': {
    original: 'IFCELECTRICDISTRIBUTIONPOINT',
    standard: 'IfcElectricdistributionpoint',
    chinese: ''
  },
  '1062813311': {
    original: 'IFCDISTRIBUTIONCONTROLELEMENT',
    standard: 'IfcDistributioncontrolelement',
    chinese: ''
  },
  '1052013943': {
    original: 'IFCDISTRIBUTIONCHAMBERELEMENT',
    standard: 'IfcDistributionchamberelement',
    chinese: ''
  },
  '578613899': {
    original: 'IFCCONTROLLERTYPE',
    standard: 'IfcControllertype',
    chinese: ''
  },
  '2454782716': {
    original: 'IFCCHAMFEREDGEFEATURE',
    standard: 'IfcChamferedgefeature',
    chinese: ''
  },
  '753842376': {
    original: 'IFCBEAM',
    standard: 'IfcBeam',
    chinese: ''
  },
  '3001207471': {
    original: 'IFCALARMTYPE',
    standard: 'IfcAlarmtype',
    chinese: ''
  },
  '2874132201': {
    original: 'IFCACTUATORTYPE',
    standard: 'IfcActuatortype',
    chinese: ''
  },
  '3304561284': {
    original: 'IFCWINDOW',
    standard: 'IfcWindow',
    chinese: ''
  },
  '3512223829': {
    original: 'IFCWALLSTANDARDCASE',
    standard: 'IfcWallstandardcase',
    chinese: ''
  },
  '2391406946': {
    original: 'IFCWALL',
    standard: 'IfcWall',
    chinese: ''
  },
  '3313531582': {
    original: 'IFCVIBRATIONISOLATORTYPE',
    standard: 'IfcVibrationisolatortype',
    chinese: ''
  },
  '2347447852': {
    original: 'IFCTENDONANCHOR',
    standard: 'IfcTendonanchor',
    chinese: ''
  },
  '3824725483': {
    original: 'IFCTENDON',
    standard: 'IfcTendon',
    chinese: ''
  },
  '2515109513': {
    original: 'IFCSTRUCTURALANALYSISMODEL',
    standard: 'IfcStructuralanalysismodel',
    chinese: ''
  },
  '4252922144': {
    original: 'IFCSTAIRFLIGHT',
    standard: 'IfcStairflight',
    chinese: ''
  },
  '331165859': {
    original: 'IFCSTAIR',
    standard: 'IfcStair',
    chinese: ''
  },
  '1529196076': {
    original: 'IFCSLAB',
    standard: 'IfcSlab',
    chinese: ''
  },
  '1783015770': {
    original: 'IFCSENSORTYPE',
    standard: 'IfcSensortype',
    chinese: ''
  },
  '1376911519': {
    original: 'IFCROUNDEDEDGEFEATURE',
    standard: 'IfcRoundededgefeature',
    chinese: ''
  },
  '2016517767': {
    original: 'IFCROOF',
    standard: 'IfcRoof',
    chinese: ''
  },
  '2320036040': {
    original: 'IFCREINFORCINGMESH',
    standard: 'IfcReinforcingmesh',
    chinese: ''
  },
  '3027567501': {
    original: 'IFCREINFORCINGELEMENT',
    standard: 'IfcReinforcingelement',
    chinese: ''
  },
  '3055160366': {
    original: 'IFCRATIONALBEZIERCURVE',
    standard: 'IfcRationalbeziercurve',
    chinese: ''
  },
  '3283111854': {
    original: 'IFCRAMPFLIGHT',
    standard: 'IfcRampflight',
    chinese: ''
  },
  '3024970846': {
    original: 'IFCRAMP',
    standard: 'IfcRamp',
    chinese: ''
  },
  '2262370178': {
    original: 'IFCRAILING',
    standard: 'IfcRailing',
    chinese: ''
  },
  '3171933400': {
    original: 'IFCPLATE',
    standard: 'IfcPlate',
    chinese: ''
  },
  '1687234759': {
    original: 'IFCPILE',
    standard: 'IfcPile',
    chinese: ''
  },
  '1073191201': {
    original: 'IFCMEMBER',
    standard: 'IfcMember',
    chinese: ''
  },
  '900683007': {
    original: 'IFCFOOTING',
    standard: 'IfcFooting',
    chinese: ''
  },
  '3508470533': {
    original: 'IFCFLOWTREATMENTDEVICE',
    standard: 'IfcFlowtreatmentdevice',
    chinese: ''
  },
  '2223149337': {
    original: 'IFCFLOWTERMINAL',
    standard: 'IfcFlowterminal',
    chinese: ''
  },
  '707683696': {
    original: 'IFCFLOWSTORAGEDEVICE',
    standard: 'IfcFlowstoragedevice',
    chinese: ''
  },
  '987401354': {
    original: 'IFCFLOWSEGMENT',
    standard: 'IfcFlowsegment',
    chinese: ''
  },
  '3132237377': {
    original: 'IFCFLOWMOVINGDEVICE',
    standard: 'IfcFlowmovingdevice',
    chinese: ''
  },
  '4037862832': {
    original: 'IFCFLOWINSTRUMENTTYPE',
    standard: 'IfcFlowinstrumenttype',
    chinese: ''
  },
  '4278956645': {
    original: 'IFCFLOWFITTING',
    standard: 'IfcFlowfitting',
    chinese: ''
  },
  '2058353004': {
    original: 'IFCFLOWCONTROLLER',
    standard: 'IfcFlowcontroller',
    chinese: ''
  },
  '4222183408': {
    original: 'IFCFIRESUPPRESSIONTERMINALTYPE',
    standard: 'IfcFiresuppressionterminaltype',
    chinese: ''
  },
  '1810631287': {
    original: 'IFCFILTERTYPE',
    standard: 'IfcFiltertype',
    chinese: ''
  },
  '346874300': {
    original: 'IFCFANTYPE',
    standard: 'IfcFantype',
    chinese: ''
  },
  '1658829314': {
    original: 'IFCENERGYCONVERSIONDEVICE',
    standard: 'IfcEnergyconversiondevice',
    chinese: ''
  },
  '857184966': {
    original: 'IFCELECTRICALELEMENT',
    standard: 'IfcElectricalelement',
    chinese: ''
  },
  '1634875225': {
    original: 'IFCELECTRICALCIRCUIT',
    standard: 'IfcElectricalcircuit',
    chinese: ''
  },
  '712377611': {
    original: 'IFCELECTRICTIMECONTROLTYPE',
    standard: 'IfcElectrictimecontroltype',
    chinese: ''
  },
  '1217240411': {
    original: 'IFCELECTRICMOTORTYPE',
    standard: 'IfcElectricmotortype',
    chinese: ''
  },
  '1365060375': {
    original: 'IFCELECTRICHEATERTYPE',
    standard: 'IfcElectricheatertype',
    chinese: ''
  },
  '1534661035': {
    original: 'IFCELECTRICGENERATORTYPE',
    standard: 'IfcElectricgeneratortype',
    chinese: ''
  },
  '3277789161': {
    original: 'IFCELECTRICFLOWSTORAGEDEVICETYPE',
    standard: 'IfcElectricflowstoragedevicetype',
    chinese: ''
  },
  '663422040': {
    original: 'IFCELECTRICAPPLIANCETYPE',
    standard: 'IfcElectricappliancetype',
    chinese: ''
  },
  '855621170': {
    original: 'IFCEDGEFEATURE',
    standard: 'IfcEdgefeature',
    chinese: ''
  },
  '2030761528': {
    original: 'IFCDUCTSILENCERTYPE',
    standard: 'IfcDuctsilencertype',
    chinese: ''
  },
  '3760055223': {
    original: 'IFCDUCTSEGMENTTYPE',
    standard: 'IfcDuctsegmenttype',
    chinese: ''
  },
  '869906466': {
    original: 'IFCDUCTFITTINGTYPE',
    standard: 'IfcDuctfittingtype',
    chinese: ''
  },
  '395920057': {
    original: 'IFCDOOR',
    standard: 'IfcDoor',
    chinese: ''
  },
  '3041715199': {
    original: 'IFCDISTRIBUTIONPORT',
    standard: 'IfcDistributionport',
    chinese: ''
  },
  '3040386961': {
    original: 'IFCDISTRIBUTIONFLOWELEMENT',
    standard: 'IfcDistributionflowelement',
    chinese: ''
  },
  '1945004755': {
    original: 'IFCDISTRIBUTIONELEMENT',
    standard: 'IfcDistributionelement',
    chinese: ''
  },
  '2063403501': {
    original: 'IFCDISTRIBUTIONCONTROLELEMENTTYPE',
    standard: 'IfcDistributioncontrolelementtype',
    chinese: ''
  },
  '1599208980': {
    original: 'IFCDISTRIBUTIONCHAMBERELEMENTTYPE',
    standard: 'IfcDistributionchamberelementtype',
    chinese: ''
  },
  '2635815018': {
    original: 'IFCDISCRETEACCESSORYTYPE',
    standard: 'IfcDiscreteaccessorytype',
    chinese: ''
  },
  '1335981549': {
    original: 'IFCDISCRETEACCESSORY',
    standard: 'IfcDiscreteaccessory',
    chinese: ''
  },
  '4147604152': {
    original: 'IFCDIAMETERDIMENSION',
    standard: 'IfcDiameterdimension',
    chinese: ''
  },
  '3961806047': {
    original: 'IFCDAMPERTYPE',
    standard: 'IfcDampertype',
    chinese: ''
  },
  '3495092785': {
    original: 'IFCCURTAINWALL',
    standard: 'IfcCurtainwall',
    chinese: ''
  },
  '1973544240': {
    original: 'IFCCOVERING',
    standard: 'IfcCovering',
    chinese: ''
  },
  '2954562838': {
    original: 'IFCCOOLINGTOWERTYPE',
    standard: 'IfcCoolingtowertype',
    chinese: ''
  },
  '335055490': {
    original: 'IFCCOOLEDBEAMTYPE',
    standard: 'IfcCooledbeamtype',
    chinese: ''
  },
  '488727124': {
    original: 'IFCCONSTRUCTIONPRODUCTRESOURCE',
    standard: 'IfcConstructionproductresource',
    chinese: ''
  },
  '1060000209': {
    original: 'IFCCONSTRUCTIONMATERIALRESOURCE',
    standard: 'IfcConstructionmaterialresource',
    chinese: ''
  },
  '3898045240': {
    original: 'IFCCONSTRUCTIONEQUIPMENTRESOURCE',
    standard: 'IfcConstructionequipmentresource',
    chinese: ''
  },
  '1163958913': {
    original: 'IFCCONDITIONCRITERION',
    standard: 'IfcConditioncriterion',
    chinese: ''
  },
  '2188551683': {
    original: 'IFCCONDITION',
    standard: 'IfcCondition',
    chinese: ''
  },
  '2816379211': {
    original: 'IFCCONDENSERTYPE',
    standard: 'IfcCondensertype',
    chinese: ''
  },
  '3850581409': {
    original: 'IFCCOMPRESSORTYPE',
    standard: 'IfcCompressortype',
    chinese: ''
  },
  '843113511': {
    original: 'IFCCOLUMN',
    standard: 'IfcColumn',
    chinese: ''
  },
  '2301859152': {
    original: 'IFCCOILTYPE',
    standard: 'IfcCoiltype',
    chinese: ''
  },
  '2611217952': {
    original: 'IFCCIRCLE',
    standard: 'IfcCircle',
    chinese: ''
  },
  '2951183804': {
    original: 'IFCCHILLERTYPE',
    standard: 'IfcChillertype',
    chinese: ''
  },
  '1285652485': {
    original: 'IFCCABLESEGMENTTYPE',
    standard: 'IfcCablesegmenttype',
    chinese: ''
  },
  '3293546465': {
    original: 'IFCCABLECARRIERSEGMENTTYPE',
    standard: 'IfcCablecarriersegmenttype',
    chinese: ''
  },
  '395041908': {
    original: 'IFCCABLECARRIERFITTINGTYPE',
    standard: 'IfcCablecarrierfittingtype',
    chinese: ''
  },
  '1909888760': {
    original: 'IFCBUILDINGELEMENTPROXYTYPE',
    standard: 'IfcBuildingelementproxytype',
    chinese: ''
  },
  '1095909175': {
    original: 'IFCBUILDINGELEMENTPROXY',
    standard: 'IfcBuildingelementproxy',
    chinese: ''
  },
  '2979338954': {
    original: 'IFCBUILDINGELEMENTPART',
    standard: 'IfcBuildingelementpart',
    chinese: ''
  },
  '52481810': {
    original: 'IFCBUILDINGELEMENTCOMPONENT',
    standard: 'IfcBuildingelementcomponent',
    chinese: ''
  },
  '3299480353': {
    original: 'IFCBUILDINGELEMENT',
    standard: 'IfcBuildingelement',
    chinese: ''
  },
  '231477066': {
    original: 'IFCBOILERTYPE',
    standard: 'IfcBoilertype',
    chinese: ''
  },
  '1916977116': {
    original: 'IFCBEZIERCURVE',
    standard: 'IfcBeziercurve',
    chinese: ''
  },
  '819618141': {
    original: 'IFCBEAMTYPE',
    standard: 'IfcBeamtype',
    chinese: ''
  },
  '1967976161': {
    original: 'IFCBSPLINECURVE',
    standard: 'IfcBsplinecurve',
    chinese: ''
  },
  '3460190687': {
    original: 'IFCASSET',
    standard: 'IfcAsset',
    chinese: ''
  },
  '2470393545': {
    original: 'IFCANGULARDIMENSION',
    standard: 'IfcAngulardimension',
    chinese: ''
  },
  '1871374353': {
    original: 'IFCAIRTOAIRHEATRECOVERYTYPE',
    standard: 'IfcAirtoairheatrecoverytype',
    chinese: ''
  },
  '3352864051': {
    original: 'IFCAIRTERMINALTYPE',
    standard: 'IfcAirterminaltype',
    chinese: ''
  },
  '1411407467': {
    original: 'IFCAIRTERMINALBOXTYPE',
    standard: 'IfcAirterminalboxtype',
    chinese: ''
  },
  '3821786052': {
    original: 'IFCACTIONREQUEST',
    standard: 'IfcActionrequest',
    chinese: ''
  },
  '1213861670': {
    original: 'IFC2DCOMPOSITECURVE',
    standard: 'Ifc2dcompositecurve',
    chinese: ''
  },
  '1033361043': {
    original: 'IFCZONE',
    standard: 'IfcZone',
    chinese: ''
  },
  '3342526732': {
    original: 'IFCWORKSCHEDULE',
    standard: 'IfcWorkschedule',
    chinese: ''
  },
  '4218914973': {
    original: 'IFCWORKPLAN',
    standard: 'IfcWorkplan',
    chinese: ''
  },
  '1028945134': {
    original: 'IFCWORKCONTROL',
    standard: 'IfcWorkcontrol',
    chinese: ''
  },
  '1133259667': {
    original: 'IFCWASTETERMINALTYPE',
    standard: 'IfcWasteterminaltype',
    chinese: ''
  },
  '1898987631': {
    original: 'IFCWALLTYPE',
    standard: 'IfcWalltype',
    chinese: ''
  },
  '2769231204': {
    original: 'IFCVIRTUALELEMENT',
    standard: 'IfcVirtualelement',
    chinese: ''
  },
  '728799441': {
    original: 'IFCVALVETYPE',
    standard: 'IfcValvetype',
    chinese: ''
  },
  '1911125066': {
    original: 'IFCUNITARYEQUIPMENTTYPE',
    standard: 'IfcUnitaryequipmenttype',
    chinese: ''
  },
  '1600972822': {
    original: 'IFCTUBEBUNDLETYPE',
    standard: 'IfcTubebundletype',
    chinese: ''
  },
  '3593883385': {
    original: 'IFCTRIMMEDCURVE',
    standard: 'IfcTrimmedcurve',
    chinese: ''
  },
  '1620046519': {
    original: 'IFCTRANSPORTELEMENT',
    standard: 'IfcTransportelement',
    chinese: ''
  },
  '1692211062': {
    original: 'IFCTRANSFORMERTYPE',
    standard: 'IfcTransformertype',
    chinese: ''
  },
  '1637806684': {
    original: 'IFCTIMESERIESSCHEDULE',
    standard: 'IfcTimeseriesschedule',
    chinese: ''
  },
  '5716631': {
    original: 'IFCTANKTYPE',
    standard: 'IfcTanktype',
    chinese: ''
  },
  '2254336722': {
    original: 'IFCSYSTEM',
    standard: 'IfcSystem',
    chinese: ''
  },
  '2315554128': {
    original: 'IFCSWITCHINGDEVICETYPE',
    standard: 'IfcSwitchingdevicetype',
    chinese: ''
  },
  '148013059': {
    original: 'IFCSUBCONTRACTRESOURCE',
    standard: 'IfcSubcontractresource',
    chinese: ''
  },
  '1975003073': {
    original: 'IFCSTRUCTURALSURFACECONNECTION',
    standard: 'IfcStructuralsurfaceconnection',
    chinese: ''
  },
  '2986769608': {
    original: 'IFCSTRUCTURALRESULTGROUP',
    standard: 'IfcStructuralresultgroup',
    chinese: ''
  },
  '1235345126': {
    original: 'IFCSTRUCTURALPOINTREACTION',
    standard: 'IfcStructuralpointreaction',
    chinese: ''
  },
  '734778138': {
    original: 'IFCSTRUCTURALPOINTCONNECTION',
    standard: 'IfcStructuralpointconnection',
    chinese: ''
  },
  '2082059205': {
    original: 'IFCSTRUCTURALPOINTACTION',
    standard: 'IfcStructuralpointaction',
    chinese: ''
  },
  '3987759626': {
    original: 'IFCSTRUCTURALPLANARACTIONVARYING',
    standard: 'IfcStructuralplanaractionvarying',
    chinese: ''
  },
  '1621171031': {
    original: 'IFCSTRUCTURALPLANARACTION',
    standard: 'IfcStructuralplanaraction',
    chinese: ''
  },
  '1252848954': {
    original: 'IFCSTRUCTURALLOADGROUP',
    standard: 'IfcStructuralloadgroup',
    chinese: ''
  },
  '1721250024': {
    original: 'IFCSTRUCTURALLINEARACTIONVARYING',
    standard: 'IfcStructurallinearactionvarying',
    chinese: ''
  },
  '1807405624': {
    original: 'IFCSTRUCTURALLINEARACTION',
    standard: 'IfcStructurallinearaction',
    chinese: ''
  },
  '2445595289': {
    original: 'IFCSTRUCTURALCURVEMEMBERVARYING',
    standard: 'IfcStructuralcurvemembervarying',
    chinese: ''
  },
  '214636428': {
    original: 'IFCSTRUCTURALCURVEMEMBER',
    standard: 'IfcStructuralcurvemember',
    chinese: ''
  },
  '4243806635': {
    original: 'IFCSTRUCTURALCURVECONNECTION',
    standard: 'IfcStructuralcurveconnection',
    chinese: ''
  },
  '1179482911': {
    original: 'IFCSTRUCTURALCONNECTION',
    standard: 'IfcStructuralconnection',
    chinese: ''
  },
  '682877961': {
    original: 'IFCSTRUCTURALACTION',
    standard: 'IfcStructuralaction',
    chinese: ''
  },
  '1039846685': {
    original: 'IFCSTAIRFLIGHTTYPE',
    standard: 'IfcStairflighttype',
    chinese: ''
  },
  '3112655638': {
    original: 'IFCSTACKTERMINALTYPE',
    standard: 'IfcStackterminaltype',
    chinese: ''
  },
  '3812236995': {
    original: 'IFCSPACETYPE',
    standard: 'IfcSpacetype',
    chinese: ''
  },
  '652456506': {
    original: 'IFCSPACEPROGRAM',
    standard: 'IfcSpaceprogram',
    chinese: ''
  },
  '1305183839': {
    original: 'IFCSPACEHEATERTYPE',
    standard: 'IfcSpaceheatertype',
    chinese: ''
  },
  '3856911033': {
    original: 'IFCSPACE',
    standard: 'IfcSpace',
    chinese: ''
  },
  '2533589738': {
    original: 'IFCSLABTYPE',
    standard: 'IfcSlabtype',
    chinese: ''
  },
  '4097777520': {
    original: 'IFCSITE',
    standard: 'IfcSite',
    chinese: ''
  },
  '4105383287': {
    original: 'IFCSERVICELIFE',
    standard: 'IfcServicelife',
    chinese: ''
  },
  '3517283431': {
    original: 'IFCSCHEDULETIMECONTROL',
    standard: 'IfcScheduletimecontrol',
    chinese: ''
  },
  '1768891740': {
    original: 'IFCSANITARYTERMINALTYPE',
    standard: 'IfcSanitaryterminaltype',
    chinese: ''
  },
  '2863920197': {
    original: 'IFCRELASSIGNSTASKS',
    standard: 'IfcRelassignstasks',
    chinese: ''
  },
  '160246688': {
    original: 'IFCRELAGGREGATES',
    standard: 'IfcRelaggregates',
    chinese: ''
  },
  '2324767716': {
    original: 'IFCRAMPFLIGHTTYPE',
    standard: 'IfcRampflighttype',
    chinese: ''
  },
  '2893384427': {
    original: 'IFCRAILINGTYPE',
    standard: 'IfcRailingtype',
    chinese: ''
  },
  '3248260540': {
    original: 'IFCRADIUSDIMENSION',
    standard: 'IfcRadiusdimension',
    chinese: ''
  },
  '2250791053': {
    original: 'IFCPUMPTYPE',
    standard: 'IfcPumptype',
    chinese: ''
  },
  '1842657554': {
    original: 'IFCPROTECTIVEDEVICETYPE',
    standard: 'IfcProtectivedevicetype',
    chinese: ''
  },
  '3651124850': {
    original: 'IFCPROJECTIONELEMENT',
    standard: 'IfcProjectionelement',
    chinese: ''
  },
  '3642467123': {
    original: 'IFCPROJECTORDERRECORD',
    standard: 'IfcProjectorderrecord',
    chinese: ''
  },
  '2904328755': {
    original: 'IFCPROJECTORDER',
    standard: 'IfcProjectorder',
    chinese: ''
  },
  '2744685151': {
    original: 'IFCPROCEDURE',
    standard: 'IfcProcedure',
    chinese: ''
  },
  '3740093272': {
    original: 'IFCPORT',
    standard: 'IfcPort',
    chinese: ''
  },
  '3724593414': {
    original: 'IFCPOLYLINE',
    standard: 'IfcPolyline',
    chinese: ''
  },
  '4017108033': {
    original: 'IFCPLATETYPE',
    standard: 'IfcPlatetype',
    chinese: ''
  },
  '4231323485': {
    original: 'IFCPIPESEGMENTTYPE',
    standard: 'IfcPipesegmenttype',
    chinese: ''
  },
  '804291784': {
    original: 'IFCPIPEFITTINGTYPE',
    standard: 'IfcPipefittingtype',
    chinese: ''
  },
  '3327091369': {
    original: 'IFCPERMIT',
    standard: 'IfcPermit',
    chinese: ''
  },
  '2382730787': {
    original: 'IFCPERFORMANCEHISTORY',
    standard: 'IfcPerformancehistory',
    chinese: ''
  },
  '2837617999': {
    original: 'IFCOUTLETTYPE',
    standard: 'IfcOutlettype',
    chinese: ''
  },
  '3425660407': {
    original: 'IFCORDERACTION',
    standard: 'IfcOrderaction',
    chinese: ''
  },
  '3588315303': {
    original: 'IFCOPENINGELEMENT',
    standard: 'IfcOpeningelement',
    chinese: ''
  },
  '4143007308': {
    original: 'IFCOCCUPANT',
    standard: 'IfcOccupant',
    chinese: ''
  },
  '1916936684': {
    original: 'IFCMOVE',
    standard: 'IfcMove',
    chinese: ''
  },
  '977012517': {
    original: 'IFCMOTORCONNECTIONTYPE',
    standard: 'IfcMotorconnectiontype',
    chinese: ''
  },
  '3181161470': {
    original: 'IFCMEMBERTYPE',
    standard: 'IfcMembertype',
    chinese: ''
  },
  '2108223431': {
    original: 'IFCMECHANICALFASTENERTYPE',
    standard: 'IfcMechanicalfastenertype',
    chinese: ''
  },
  '377706215': {
    original: 'IFCMECHANICALFASTENER',
    standard: 'IfcMechanicalfastener',
    chinese: ''
  },
  '2506943328': {
    original: 'IFCLINEARDIMENSION',
    standard: 'IfcLineardimension',
    chinese: ''
  },
  '1161773419': {
    original: 'IFCLIGHTFIXTURETYPE',
    standard: 'IfcLightfixturetype',
    chinese: ''
  },
  '1051575348': {
    original: 'IFCLAMPTYPE',
    standard: 'IfcLamptype',
    chinese: ''
  },
  '3827777499': {
    original: 'IFCLABORRESOURCE',
    standard: 'IfcLaborresource',
    chinese: ''
  },
  '4288270099': {
    original: 'IFCJUNCTIONBOXTYPE',
    standard: 'IfcJunctionboxtype',
    chinese: ''
  },
  '2391368822': {
    original: 'IFCINVENTORY',
    standard: 'IfcInventory',
    chinese: ''
  },
  '1806887404': {
    original: 'IFCHUMIDIFIERTYPE',
    standard: 'IfcHumidifiertype',
    chinese: ''
  },
  '1251058090': {
    original: 'IFCHEATEXCHANGERTYPE',
    standard: 'IfcHeatexchangertype',
    chinese: ''
  },
  '2706460486': {
    original: 'IFCGROUP',
    standard: 'IfcGroup',
    chinese: ''
  },
  '3009204131': {
    original: 'IFCGRID',
    standard: 'IfcGrid',
    chinese: ''
  },
  '200128114': {
    original: 'IFCGASTERMINALTYPE',
    standard: 'IfcGasterminaltype',
    chinese: ''
  },
  '814719939': {
    original: 'IFCFURNITURESTANDARD',
    standard: 'IfcFurniturestandard',
    chinese: ''
  },
  '263784265': {
    original: 'IFCFURNISHINGELEMENT',
    standard: 'IfcFurnishingelement',
    chinese: ''
  },
  '3009222698': {
    original: 'IFCFLOWTREATMENTDEVICETYPE',
    standard: 'IfcFlowtreatmentdevicetype',
    chinese: ''
  },
  '2297155007': {
    original: 'IFCFLOWTERMINALTYPE',
    standard: 'IfcFlowterminaltype',
    chinese: ''
  },
  '1339347760': {
    original: 'IFCFLOWSTORAGEDEVICETYPE',
    standard: 'IfcFlowstoragedevicetype',
    chinese: ''
  },
  '1834744321': {
    original: 'IFCFLOWSEGMENTTYPE',
    standard: 'IfcFlowsegmenttype',
    chinese: ''
  },
  '1482959167': {
    original: 'IFCFLOWMOVINGDEVICETYPE',
    standard: 'IfcFlowmovingdevicetype',
    chinese: ''
  },
  '3815607619': {
    original: 'IFCFLOWMETERTYPE',
    standard: 'IfcFlowmetertype',
    chinese: ''
  },
  '3198132628': {
    original: 'IFCFLOWFITTINGTYPE',
    standard: 'IfcFlowfittingtype',
    chinese: ''
  },
  '3907093117': {
    original: 'IFCFLOWCONTROLLERTYPE',
    standard: 'IfcFlowcontrollertype',
    chinese: ''
  },
  '1287392070': {
    original: 'IFCFEATUREELEMENTSUBTRACTION',
    standard: 'IfcFeatureelementsubtraction',
    chinese: ''
  },
  '2143335405': {
    original: 'IFCFEATUREELEMENTADDITION',
    standard: 'IfcFeatureelementaddition',
    chinese: ''
  },
  '2827207264': {
    original: 'IFCFEATUREELEMENT',
    standard: 'IfcFeatureelement',
    chinese: ''
  },
  '2489546625': {
    original: 'IFCFASTENERTYPE',
    standard: 'IfcFastenertype',
    chinese: ''
  },
  '647756555': {
    original: 'IFCFASTENER',
    standard: 'IfcFastener',
    chinese: ''
  },
  '3737207727': {
    original: 'IFCFACETEDBREPWITHVOIDS',
    standard: 'IfcFacetedbrepwithvoids',
    chinese: ''
  },
  '807026263': {
    original: 'IFCFACETEDBREP',
    standard: 'IfcFacetedbrep',
    chinese: ''
  },
  '3390157468': {
    original: 'IFCEVAPORATORTYPE',
    standard: 'IfcEvaporatortype',
    chinese: ''
  },
  '3174744832': {
    original: 'IFCEVAPORATIVECOOLERTYPE',
    standard: 'IfcEvaporativecoolertype',
    chinese: ''
  },
  '3272907226': {
    original: 'IFCEQUIPMENTSTANDARD',
    standard: 'IfcEquipmentstandard',
    chinese: ''
  },
  '1962604670': {
    original: 'IFCEQUIPMENTELEMENT',
    standard: 'IfcEquipmentelement',
    chinese: ''
  },
  '2107101300': {
    original: 'IFCENERGYCONVERSIONDEVICETYPE',
    standard: 'IfcEnergyconversiondevicetype',
    chinese: ''
  },
  '1704287377': {
    original: 'IFCELLIPSE',
    standard: 'IfcEllipse',
    chinese: ''
  },
  '2590856083': {
    original: 'IFCELEMENTCOMPONENTTYPE',
    standard: 'IfcElementcomponenttype',
    chinese: ''
  },
  '1623761950': {
    original: 'IFCELEMENTCOMPONENT',
    standard: 'IfcElementcomponent',
    chinese: ''
  },
  '4123344466': {
    original: 'IFCELEMENTASSEMBLY',
    standard: 'IfcElementassembly',
    chinese: ''
  },
  '1758889154': {
    original: 'IFCELEMENT',
    standard: 'IfcElement',
    chinese: ''
  },
  '360485395': {
    original: 'IFCELECTRICALBASEPROPERTIES',
    standard: 'IfcElectricalbaseproperties',
    chinese: ''
  },
  '3849074793': {
    original: 'IFCDISTRIBUTIONFLOWELEMENTTYPE',
    standard: 'IfcDistributionflowelementtype',
    chinese: ''
  },
  '3256556792': {
    original: 'IFCDISTRIBUTIONELEMENTTYPE',
    standard: 'IfcDistributionelementtype',
    chinese: ''
  },
  '681481545': {
    original: 'IFCDIMENSIONCURVEDIRECTEDCALLOUT',
    standard: 'IfcDimensioncurvedirectedcallout',
    chinese: ''
  },
  '1457835157': {
    original: 'IFCCURTAINWALLTYPE',
    standard: 'IfcCurtainwalltype',
    chinese: ''
  },
  '3295246426': {
    original: 'IFCCREWRESOURCE',
    standard: 'IfcCrewresource',
    chinese: ''
  },
  '1916426348': {
    original: 'IFCCOVERINGTYPE',
    standard: 'IfcCoveringtype',
    chinese: ''
  },
  '1419761937': {
    original: 'IFCCOSTSCHEDULE',
    standard: 'IfcCostschedule',
    chinese: ''
  },
  '3895139033': {
    original: 'IFCCOSTITEM',
    standard: 'IfcCostitem',
    chinese: ''
  },
  '3293443760': {
    original: 'IFCCONTROL',
    standard: 'IfcControl',
    chinese: ''
  },
  '2559216714': {
    original: 'IFCCONSTRUCTIONRESOURCE',
    standard: 'IfcConstructionresource',
    chinese: ''
  },
  '2510884976': {
    original: 'IFCCONIC',
    standard: 'IfcConic',
    chinese: ''
  },
  '3732776249': {
    original: 'IFCCOMPOSITECURVE',
    standard: 'IfcCompositecurve',
    chinese: ''
  },
  '300633059': {
    original: 'IFCCOLUMNTYPE',
    standard: 'IfcColumntype',
    chinese: ''
  },
  '2937912522': {
    original: 'IFCCIRCLEHOLLOWPROFILEDEF',
    standard: 'IfcCirclehollowprofiledef',
    chinese: ''
  },
  '3124254112': {
    original: 'IFCBUILDINGSTOREY',
    standard: 'IfcBuildingstorey',
    chinese: ''
  },
  '1950629157': {
    original: 'IFCBUILDINGELEMENTTYPE',
    standard: 'IfcBuildingelementtype',
    chinese: ''
  },
  '4031249490': {
    original: 'IFCBUILDING',
    standard: 'IfcBuilding',
    chinese: ''
  },
  '1260505505': {
    original: 'IFCBOUNDEDCURVE',
    standard: 'IfcBoundedcurve',
    chinese: ''
  },
  '3649129432': {
    original: 'IFCBOOLEANCLIPPINGRESULT',
    standard: 'IfcBooleanclippingresult',
    chinese: ''
  },
  '1334484129': {
    original: 'IFCBLOCK',
    standard: 'IfcBlock',
    chinese: ''
  },
  '3207858831': {
    original: 'IFCASYMMETRICISHAPEPROFILEDEF',
    standard: 'IfcAsymmetricishapeprofiledef',
    chinese: ''
  },
  '1674181508': {
    original: 'IFCANNOTATION',
    standard: 'IfcAnnotation',
    chinese: ''
  },
  '2296667514': {
    original: 'IFCACTOR',
    standard: 'IfcActor',
    chinese: ''
  },
  '2097647324': {
    original: 'IFCTRANSPORTELEMENTTYPE',
    standard: 'IfcTransportelementtype',
    chinese: ''
  },
  '3473067441': {
    original: 'IFCTASK',
    standard: 'IfcTask',
    chinese: ''
  },
  '1580310250': {
    original: 'IFCSYSTEMFURNITUREELEMENTTYPE',
    standard: 'IfcSystemfurnitureelementtype',
    chinese: ''
  },
  '4124788165': {
    original: 'IFCSURFACEOFREVOLUTION',
    standard: 'IfcSurfaceofrevolution',
    chinese: ''
  },
  '2809605785': {
    original: 'IFCSURFACEOFLINEAREXTRUSION',
    standard: 'IfcSurfaceoflinearextrusion',
    chinese: ''
  },
  '2028607225': {
    original: 'IFCSURFACECURVESWEPTAREASOLID',
    standard: 'IfcSurfacecurvesweptareasolid',
    chinese: ''
  },
  '4070609034': {
    original: 'IFCSTRUCTUREDDIMENSIONCALLOUT',
    standard: 'IfcStructureddimensioncallout',
    chinese: ''
  },
  '2218152070': {
    original: 'IFCSTRUCTURALSURFACEMEMBERVARYING',
    standard: 'IfcStructuralsurfacemembervarying',
    chinese: ''
  },
  '3979015343': {
    original: 'IFCSTRUCTURALSURFACEMEMBER',
    standard: 'IfcStructuralsurfacemember',
    chinese: ''
  },
  '3689010777': {
    original: 'IFCSTRUCTURALREACTION',
    standard: 'IfcStructuralreaction',
    chinese: ''
  },
  '530289379': {
    original: 'IFCSTRUCTURALMEMBER',
    standard: 'IfcStructuralmember',
    chinese: ''
  },
  '3136571912': {
    original: 'IFCSTRUCTURALITEM',
    standard: 'IfcStructuralitem',
    chinese: ''
  },
  '3544373492': {
    original: 'IFCSTRUCTURALACTIVITY',
    standard: 'IfcStructuralactivity',
    chinese: ''
  },
  '451544542': {
    original: 'IFCSPHERE',
    standard: 'IfcSphere',
    chinese: ''
  },
  '3893378262': {
    original: 'IFCSPATIALSTRUCTUREELEMENTTYPE',
    standard: 'IfcSpatialstructureelementtype',
    chinese: ''
  },
  '2706606064': {
    original: 'IFCSPATIALSTRUCTUREELEMENT',
    standard: 'IfcSpatialstructureelement',
    chinese: ''
  },
  '3626867408': {
    original: 'IFCRIGHTCIRCULARCYLINDER',
    standard: 'IfcRightcircularcylinder',
    chinese: ''
  },
  '4158566097': {
    original: 'IFCRIGHTCIRCULARCONE',
    standard: 'IfcRightcircularcone',
    chinese: ''
  },
  '1856042241': {
    original: 'IFCREVOLVEDAREASOLID',
    standard: 'IfcRevolvedareasolid',
    chinese: ''
  },
  '2914609552': {
    original: 'IFCRESOURCE',
    standard: 'IfcResource',
    chinese: ''
  },
  '1401173127': {
    original: 'IFCRELVOIDSELEMENT',
    standard: 'IfcRelvoidselement',
    chinese: ''
  },
  '3451746338': {
    original: 'IFCRELSPACEBOUNDARY',
    standard: 'IfcRelspaceboundary',
    chinese: ''
  },
  '366585022': {
    original: 'IFCRELSERVICESBUILDINGS',
    standard: 'IfcRelservicesbuildings',
    chinese: ''
  },
  '4122056220': {
    original: 'IFCRELSEQUENCE',
    standard: 'IfcRelsequence',
    chinese: ''
  },
  '1058617721': {
    original: 'IFCRELSCHEDULESCOSTITEMS',
    standard: 'IfcRelschedulescostitems',
    chinese: ''
  },
  '1245217292': {
    original: 'IFCRELREFERENCEDINSPATIALSTRUCTURE',
    standard: 'IfcRelreferencedinspatialstructure',
    chinese: ''
  },
  '750771296': {
    original: 'IFCRELPROJECTSELEMENT',
    standard: 'IfcRelprojectselement',
    chinese: ''
  },
  '202636808': {
    original: 'IFCRELOVERRIDESPROPERTIES',
    standard: 'IfcReloverridesproperties',
    chinese: ''
  },
  '2051452291': {
    original: 'IFCRELOCCUPIESSPACES',
    standard: 'IfcReloccupiesspaces',
    chinese: ''
  },
  '3268803585': {
    original: 'IFCRELNESTS',
    standard: 'IfcRelnests',
    chinese: ''
  },
  '4189434867': {
    original: 'IFCRELINTERACTIONREQUIREMENTS',
    standard: 'IfcRelinteractionrequirements',
    chinese: ''
  },
  '279856033': {
    original: 'IFCRELFLOWCONTROLELEMENTS',
    standard: 'IfcRelflowcontrolelements',
    chinese: ''
  },
  '3940055652': {
    original: 'IFCRELFILLSELEMENT',
    standard: 'IfcRelfillselement',
    chinese: ''
  },
  '781010003': {
    original: 'IFCRELDEFINESBYTYPE',
    standard: 'IfcReldefinesbytype',
    chinese: ''
  },
  '4186316022': {
    original: 'IFCRELDEFINESBYPROPERTIES',
    standard: 'IfcReldefinesbyproperties',
    chinese: ''
  },
  '693640335': {
    original: 'IFCRELDEFINES',
    standard: 'IfcReldefines',
    chinese: ''
  },
  '2551354335': {
    original: 'IFCRELDECOMPOSES',
    standard: 'IfcReldecomposes',
    chinese: ''
  },
  '2802773753': {
    original: 'IFCRELCOVERSSPACES',
    standard: 'IfcRelcoversspaces',
    chinese: ''
  },
  '886880790': {
    original: 'IFCRELCOVERSBLDGELEMENTS',
    standard: 'IfcRelcoversbldgelements',
    chinese: ''
  },
  '3242617779': {
    original: 'IFCRELCONTAINEDINSPATIALSTRUCTURE',
    standard: 'IfcRelcontainedinspatialstructure',
    chinese: ''
  },
  '3678494232': {
    original: 'IFCRELCONNECTSWITHREALIZINGELEMENTS',
    standard: 'IfcRelconnectswithrealizingelements',
    chinese: ''
  },
  '504942748': {
    original: 'IFCRELCONNECTSWITHECCENTRICITY',
    standard: 'IfcRelconnectswitheccentricity',
    chinese: ''
  },
  '1638771189': {
    original: 'IFCRELCONNECTSSTRUCTURALMEMBER',
    standard: 'IfcRelconnectsstructuralmember',
    chinese: ''
  },
  '3912681535': {
    original: 'IFCRELCONNECTSSTRUCTURALELEMENT',
    standard: 'IfcRelconnectsstructuralelement',
    chinese: ''
  },
  '2127690289': {
    original: 'IFCRELCONNECTSSTRUCTURALACTIVITY',
    standard: 'IfcRelconnectsstructuralactivity',
    chinese: ''
  },
  '3190031847': {
    original: 'IFCRELCONNECTSPORTS',
    standard: 'IfcRelconnectsports',
    chinese: ''
  },
  '4201705270': {
    original: 'IFCRELCONNECTSPORTTOELEMENT',
    standard: 'IfcRelconnectsporttoelement',
    chinese: ''
  },
  '3945020480': {
    original: 'IFCRELCONNECTSPATHELEMENTS',
    standard: 'IfcRelconnectspathelements',
    chinese: ''
  },
  '1204542856': {
    original: 'IFCRELCONNECTSELEMENTS',
    standard: 'IfcRelconnectselements',
    chinese: ''
  },
  '826625072': {
    original: 'IFCRELCONNECTS',
    standard: 'IfcRelconnects',
    chinese: ''
  },
  '2851387026': {
    original: 'IFCRELASSOCIATESPROFILEPROPERTIES',
    standard: 'IfcRelassociatesprofileproperties',
    chinese: ''
  },
  '2655215786': {
    original: 'IFCRELASSOCIATESMATERIAL',
    standard: 'IfcRelassociatesmaterial',
    chinese: ''
  },
  '3840914261': {
    original: 'IFCRELASSOCIATESLIBRARY',
    standard: 'IfcRelassociateslibrary',
    chinese: ''
  },
  '982818633': {
    original: 'IFCRELASSOCIATESDOCUMENT',
    standard: 'IfcRelassociatesdocument',
    chinese: ''
  },
  '2728634034': {
    original: 'IFCRELASSOCIATESCONSTRAINT',
    standard: 'IfcRelassociatesconstraint',
    chinese: ''
  },
  '919958153': {
    original: 'IFCRELASSOCIATESCLASSIFICATION',
    standard: 'IfcRelassociatesclassification',
    chinese: ''
  },
  '4095574036': {
    original: 'IFCRELASSOCIATESAPPROVAL',
    standard: 'IfcRelassociatesapproval',
    chinese: ''
  },
  '1327628568': {
    original: 'IFCRELASSOCIATESAPPLIEDVALUE',
    standard: 'IfcRelassociatesappliedvalue',
    chinese: ''
  },
  '1865459582': {
    original: 'IFCRELASSOCIATES',
    standard: 'IfcRelassociates',
    chinese: ''
  },
  '205026976': {
    original: 'IFCRELASSIGNSTORESOURCE',
    standard: 'IfcRelassignstoresource',
    chinese: ''
  },
  '3372526763': {
    original: 'IFCRELASSIGNSTOPROJECTORDER',
    standard: 'IfcRelassignstoprojectorder',
    chinese: ''
  },
  '2857406711': {
    original: 'IFCRELASSIGNSTOPRODUCT',
    standard: 'IfcRelassignstoproduct',
    chinese: ''
  },
  '4278684876': {
    original: 'IFCRELASSIGNSTOPROCESS',
    standard: 'IfcRelassignstoprocess',
    chinese: ''
  },
  '1307041759': {
    original: 'IFCRELASSIGNSTOGROUP',
    standard: 'IfcRelassignstogroup',
    chinese: ''
  },
  '2495723537': {
    original: 'IFCRELASSIGNSTOCONTROL',
    standard: 'IfcRelassignstocontrol',
    chinese: ''
  },
  '1683148259': {
    original: 'IFCRELASSIGNSTOACTOR',
    standard: 'IfcRelassignstoactor',
    chinese: ''
  },
  '3939117080': {
    original: 'IFCRELASSIGNS',
    standard: 'IfcRelassigns',
    chinese: ''
  },
  '3454111270': {
    original: 'IFCRECTANGULARTRIMMEDSURFACE',
    standard: 'IfcRectangulartrimmedsurface',
    chinese: ''
  },
  '2798486643': {
    original: 'IFCRECTANGULARPYRAMID',
    standard: 'IfcRectangularpyramid',
    chinese: ''
  },
  '2770003689': {
    original: 'IFCRECTANGLEHOLLOWPROFILEDEF',
    standard: 'IfcRectanglehollowprofiledef',
    chinese: ''
  },
  '3219374653': {
    original: 'IFCPROXY',
    standard: 'IfcProxy',
    chinese: ''
  },
  '1451395588': {
    original: 'IFCPROPERTYSET',
    standard: 'IfcPropertyset',
    chinese: ''
  },
  '4194566429': {
    original: 'IFCPROJECTIONCURVE',
    standard: 'IfcProjectioncurve',
    chinese: ''
  },
  '103090709': {
    original: 'IFCPROJECT',
    standard: 'IfcProject',
    chinese: ''
  },
  '4208778838': {
    original: 'IFCPRODUCT',
    standard: 'IfcProduct',
    chinese: ''
  },
  '2945172077': {
    original: 'IFCPROCESS',
    standard: 'IfcProcess',
    chinese: ''
  },
  '220341763': {
    original: 'IFCPLANE',
    standard: 'IfcPlane',
    chinese: ''
  },
  '603570806': {
    original: 'IFCPLANARBOX',
    standard: 'IfcPlanarbox',
    chinese: ''
  },
  '3566463478': {
    original: 'IFCPERMEABLECOVERINGPROPERTIES',
    standard: 'IfcPermeablecoveringproperties',
    chinese: ''
  },
  '3505215534': {
    original: 'IFCOFFSETCURVE3D',
    standard: 'IfcOffsetcurve3d',
    chinese: ''
  },
  '3388369263': {
    original: 'IFCOFFSETCURVE2D',
    standard: 'IfcOffsetcurve2d',
    chinese: ''
  },
  '3888040117': {
    original: 'IFCOBJECT',
    standard: 'IfcObject',
    chinese: ''
  },
  '1425443689': {
    original: 'IFCMANIFOLDSOLIDBREP',
    standard: 'IfcManifoldsolidbrep',
    chinese: ''
  },
  '1281925730': {
    original: 'IFCLINE',
    standard: 'IfcLine',
    chinese: ''
  },
  '572779678': {
    original: 'IFCLSHAPEPROFILEDEF',
    standard: 'IfcLshapeprofiledef',
    chinese: ''
  },
  '1484403080': {
    original: 'IFCISHAPEPROFILEDEF',
    standard: 'IfcIshapeprofiledef',
    chinese: ''
  },
  '987898635': {
    original: 'IFCGEOMETRICCURVESET',
    standard: 'IfcGeometriccurveset',
    chinese: ''
  },
  '1268542332': {
    original: 'IFCFURNITURETYPE',
    standard: 'IfcFurnituretype',
    chinese: ''
  },
  '4238390223': {
    original: 'IFCFURNISHINGELEMENTTYPE',
    standard: 'IfcFurnishingelementtype',
    chinese: ''
  },
  '3455213021': {
    original: 'IFCFLUIDFLOWPROPERTIES',
    standard: 'IfcFluidflowproperties',
    chinese: ''
  },
  '315944413': {
    original: 'IFCFILLAREASTYLETILES',
    standard: 'IfcFillareastyletiles',
    chinese: ''
  },
  '4203026998': {
    original: 'IFCFILLAREASTYLETILESYMBOLWITHSTYLE',
    standard: 'IfcFillareastyletilesymbolwithstyle',
    chinese: ''
  },
  '374418227': {
    original: 'IFCFILLAREASTYLEHATCHING',
    standard: 'IfcFillareastylehatching',
    chinese: ''
  },
  '2047409740': {
    original: 'IFCFACEBASEDSURFACEMODEL',
    standard: 'IfcFacebasedsurfacemodel',
    chinese: ''
  },
  '477187591': {
    original: 'IFCEXTRUDEDAREASOLID',
    standard: 'IfcExtrudedareasolid',
    chinese: ''
  },
  '80994333': {
    original: 'IFCENERGYPROPERTIES',
    standard: 'IfcEnergyproperties',
    chinese: ''
  },
  '2835456948': {
    original: 'IFCELLIPSEPROFILEDEF',
    standard: 'IfcEllipseprofiledef',
    chinese: ''
  },
  '2777663545': {
    original: 'IFCELEMENTARYSURFACE',
    standard: 'IfcElementarysurface',
    chinese: ''
  },
  '339256511': {
    original: 'IFCELEMENTTYPE',
    standard: 'IfcElementtype',
    chinese: ''
  },
  '1883228015': {
    original: 'IFCELEMENTQUANTITY',
    standard: 'IfcElementquantity',
    chinese: ''
  },
  '1472233963': {
    original: 'IFCEDGELOOP',
    standard: 'IfcEdgeloop',
    chinese: ''
  },
  '4006246654': {
    original: 'IFCDRAUGHTINGPREDEFINEDCURVEFONT',
    standard: 'IfcDraughtingpredefinedcurvefont',
    chinese: ''
  },
  '445594917': {
    original: 'IFCDRAUGHTINGPREDEFINEDCOLOUR',
    standard: 'IfcDraughtingpredefinedcolour',
    chinese: ''
  },
  '3073041342': {
    original: 'IFCDRAUGHTINGCALLOUT',
    standard: 'IfcDraughtingcallout',
    chinese: ''
  },
  '526551008': {
    original: 'IFCDOORSTYLE',
    standard: 'IfcDoorstyle',
    chinese: ''
  },
  '1714330368': {
    original: 'IFCDOORPANELPROPERTIES',
    standard: 'IfcDoorpanelproperties',
    chinese: ''
  },
  '2963535650': {
    original: 'IFCDOORLININGPROPERTIES',
    standard: 'IfcDoorliningproperties',
    chinese: ''
  },
  '32440307': {
    original: 'IFCDIRECTION',
    standard: 'IfcDirection',
    chinese: ''
  },
  '4054601972': {
    original: 'IFCDIMENSIONCURVETERMINATOR',
    standard: 'IfcDimensioncurveterminator',
    chinese: ''
  },
  '606661476': {
    original: 'IFCDIMENSIONCURVE',
    standard: 'IfcDimensioncurve',
    chinese: ''
  },
  '693772133': {
    original: 'IFCDEFINEDSYMBOL',
    standard: 'IfcDefinedsymbol',
    chinese: ''
  },
  '2827736869': {
    original: 'IFCCURVEBOUNDEDPLANE',
    standard: 'IfcCurveboundedplane',
    chinese: ''
  },
  '2601014836': {
    original: 'IFCCURVE',
    standard: 'IfcCurve',
    chinese: ''
  },
  '2147822146': {
    original: 'IFCCSGSOLID',
    standard: 'IfcCsgsolid',
    chinese: ''
  },
  '2506170314': {
    original: 'IFCCSGPRIMITIVE3D',
    standard: 'IfcCsgprimitive3d',
    chinese: ''
  },
  '194851669': {
    original: 'IFCCRANERAILFSHAPEPROFILEDEF',
    standard: 'IfcCranerailfshapeprofiledef',
    chinese: ''
  },
  '4133800736': {
    original: 'IFCCRANERAILASHAPEPROFILEDEF',
    standard: 'IfcCranerailashapeprofiledef',
    chinese: ''
  },
  '2485617015': {
    original: 'IFCCOMPOSITECURVESEGMENT',
    standard: 'IfcCompositecurvesegment',
    chinese: ''
  },
  '2205249479': {
    original: 'IFCCLOSEDSHELL',
    standard: 'IfcClosedshell',
    chinese: ''
  },
  '1383045692': {
    original: 'IFCCIRCLEPROFILEDEF',
    standard: 'IfcCircleprofiledef',
    chinese: ''
  },
  '1416205885': {
    original: 'IFCCARTESIANTRANSFORMATIONOPERATOR3DNONUNIFORM',
    standard: 'IfcCartesiantransformationoperator3dnonuniform',
    chinese: ''
  },
  '3331915920': {
    original: 'IFCCARTESIANTRANSFORMATIONOPERATOR3D',
    standard: 'IfcCartesiantransformationoperator3d',
    chinese: ''
  },
  '3486308946': {
    original: 'IFCCARTESIANTRANSFORMATIONOPERATOR2DNONUNIFORM',
    standard: 'IfcCartesiantransformationoperator2dnonuniform',
    chinese: ''
  },
  '3749851601': {
    original: 'IFCCARTESIANTRANSFORMATIONOPERATOR2D',
    standard: 'IfcCartesiantransformationoperator2d',
    chinese: ''
  },
  '59481748': {
    original: 'IFCCARTESIANTRANSFORMATIONOPERATOR',
    standard: 'IfcCartesiantransformationoperator',
    chinese: ''
  },
  '1123145078': {
    original: 'IFCCARTESIANPOINT',
    standard: 'IfcCartesianpoint',
    chinese: ''
  },
  '2898889636': {
    original: 'IFCCSHAPEPROFILEDEF',
    standard: 'IfcCshapeprofiledef',
    chinese: ''
  },
  '2713105998': {
    original: 'IFCBOXEDHALFSPACE',
    standard: 'IfcBoxedhalfspace',
    chinese: ''
  },
  '2581212453': {
    original: 'IFCBOUNDINGBOX',
    standard: 'IfcBoundingbox',
    chinese: ''
  },
  '4182860854': {
    original: 'IFCBOUNDEDSURFACE',
    standard: 'IfcBoundedsurface',
    chinese: ''
  },
  '2736907675': {
    original: 'IFCBOOLEANRESULT',
    standard: 'IfcBooleanresult',
    chinese: ''
  },
  '2740243338': {
    original: 'IFCAXIS2PLACEMENT3D',
    standard: 'IfcAxis2placement3d',
    chinese: ''
  },
  '3125803723': {
    original: 'IFCAXIS2PLACEMENT2D',
    standard: 'IfcAxis2placement2d',
    chinese: ''
  },
  '4261334040': {
    original: 'IFCAXIS1PLACEMENT',
    standard: 'IfcAxis1placement',
    chinese: ''
  },
  '1302238472': {
    original: 'IFCANNOTATIONSURFACE',
    standard: 'IfcAnnotationsurface',
    chinese: ''
  },
  '2265737646': {
    original: 'IFCANNOTATIONFILLAREAOCCURRENCE',
    standard: 'IfcAnnotationfillareaoccurrence',
    chinese: ''
  },
  '669184980': {
    original: 'IFCANNOTATIONFILLAREA',
    standard: 'IfcAnnotationfillarea',
    chinese: ''
  },
  '3288037868': {
    original: 'IFCANNOTATIONCURVEOCCURRENCE',
    standard: 'IfcAnnotationcurveoccurrence',
    chinese: ''
  },
  '2543172580': {
    original: 'IFCZSHAPEPROFILEDEF',
    standard: 'IfcZshapeprofiledef',
    chinese: ''
  },
  '1299126871': {
    original: 'IFCWINDOWSTYLE',
    standard: 'IfcWindowstyle',
    chinese: ''
  },
  '512836454': {
    original: 'IFCWINDOWPANELPROPERTIES',
    standard: 'IfcWindowpanelproperties',
    chinese: ''
  },
  '336235671': {
    original: 'IFCWINDOWLININGPROPERTIES',
    standard: 'IfcWindowliningproperties',
    chinese: ''
  },
  '2759199220': {
    original: 'IFCVERTEXLOOP',
    standard: 'IfcVertexloop',
    chinese: ''
  },
  '1417489154': {
    original: 'IFCVECTOR',
    standard: 'IfcVector',
    chinese: ''
  },
  '427810014': {
    original: 'IFCUSHAPEPROFILEDEF',
    standard: 'IfcUshapeprofiledef',
    chinese: ''
  },
  '2347495698': {
    original: 'IFCTYPEPRODUCT',
    standard: 'IfcTypeproduct',
    chinese: ''
  },
  '1628702193': {
    original: 'IFCTYPEOBJECT',
    standard: 'IfcTypeobject',
    chinese: ''
  },
  '1345879162': {
    original: 'IFCTWODIRECTIONREPEATFACTOR',
    standard: 'IfcTwodirectionrepeatfactor',
    chinese: ''
  },
  '2715220739': {
    original: 'IFCTRAPEZIUMPROFILEDEF',
    standard: 'IfcTrapeziumprofiledef',
    chinese: ''
  },
  '3124975700': {
    original: 'IFCTEXTLITERALWITHEXTENT',
    standard: 'IfcTextliteralwithextent',
    chinese: ''
  },
  '4282788508': {
    original: 'IFCTEXTLITERAL',
    standard: 'IfcTextliteral',
    chinese: ''
  },
  '3028897424': {
    original: 'IFCTERMINATORSYMBOL',
    standard: 'IfcTerminatorsymbol',
    chinese: ''
  },
  '3071757647': {
    original: 'IFCTSHAPEPROFILEDEF',
    standard: 'IfcTshapeprofiledef',
    chinese: ''
  },
  '230924584': {
    original: 'IFCSWEPTSURFACE',
    standard: 'IfcSweptsurface',
    chinese: ''
  },
  '1260650574': {
    original: 'IFCSWEPTDISKSOLID',
    standard: 'IfcSweptdisksolid',
    chinese: ''
  },
  '2247615214': {
    original: 'IFCSWEPTAREASOLID',
    standard: 'IfcSweptareasolid',
    chinese: ''
  },
  '1878645084': {
    original: 'IFCSURFACESTYLERENDERING',
    standard: 'IfcSurfacestylerendering',
    chinese: ''
  },
  '2513912981': {
    original: 'IFCSURFACE',
    standard: 'IfcSurface',
    chinese: ''
  },
  '2233826070': {
    original: 'IFCSUBEDGE',
    standard: 'IfcSubedge',
    chinese: ''
  },
  '3653947884': {
    original: 'IFCSTRUCTURALSTEELPROFILEPROPERTIES',
    standard: 'IfcStructuralsteelprofileproperties',
    chinese: ''
  },
  '3843319758': {
    original: 'IFCSTRUCTURALPROFILEPROPERTIES',
    standard: 'IfcStructuralprofileproperties',
    chinese: ''
  },
  '1190533807': {
    original: 'IFCSTRUCTURALLOADSINGLEFORCEWARPING',
    standard: 'IfcStructuralloadsingleforcewarping',
    chinese: ''
  },
  '1597423693': {
    original: 'IFCSTRUCTURALLOADSINGLEFORCE',
    standard: 'IfcStructuralloadsingleforce',
    chinese: ''
  },
  '1973038258': {
    original: 'IFCSTRUCTURALLOADSINGLEDISPLACEMENTDISTORTION',
    standard: 'IfcStructuralloadsingledisplacementdistortion',
    chinese: ''
  },
  '2473145415': {
    original: 'IFCSTRUCTURALLOADSINGLEDISPLACEMENT',
    standard: 'IfcStructuralloadsingledisplacement',
    chinese: ''
  },
  '2668620305': {
    original: 'IFCSTRUCTURALLOADPLANARFORCE',
    standard: 'IfcStructuralloadplanarforce',
    chinese: ''
  },
  '1595516126': {
    original: 'IFCSTRUCTURALLOADLINEARFORCE',
    standard: 'IfcStructuralloadlinearforce',
    chinese: ''
  },
  '390701378': {
    original: 'IFCSPACETHERMALLOADPROPERTIES',
    standard: 'IfcSpacethermalloadproperties',
    chinese: ''
  },
  '1202362311': {
    original: 'IFCSOUNDVALUE',
    standard: 'IfcSoundvalue',
    chinese: ''
  },
  '2485662743': {
    original: 'IFCSOUNDPROPERTIES',
    standard: 'IfcSoundproperties',
    chinese: ''
  },
  '723233188': {
    original: 'IFCSOLIDMODEL',
    standard: 'IfcSolidmodel',
    chinese: ''
  },
  '2609359061': {
    original: 'IFCSLIPPAGECONNECTIONCONDITION',
    standard: 'IfcSlippageconnectioncondition',
    chinese: ''
  },
  '4124623270': {
    original: 'IFCSHELLBASEDSURFACEMODEL',
    standard: 'IfcShellbasedsurfacemodel',
    chinese: ''
  },
  '2411513650': {
    original: 'IFCSERVICELIFEFACTOR',
    standard: 'IfcServicelifefactor',
    chinese: ''
  },
  '1509187699': {
    original: 'IFCSECTIONEDSPINE',
    standard: 'IfcSectionedspine',
    chinese: ''
  },
  '2778083089': {
    original: 'IFCROUNDEDRECTANGLEPROFILEDEF',
    standard: 'IfcRoundedrectangleprofiledef',
    chinese: ''
  },
  '478536968': {
    original: 'IFCRELATIONSHIP',
    standard: 'IfcRelationship',
    chinese: ''
  },
  '3765753017': {
    original: 'IFCREINFORCEMENTDEFINITIONPROPERTIES',
    standard: 'IfcReinforcementdefinitionproperties',
    chinese: ''
  },
  '3413951693': {
    original: 'IFCREGULARTIMESERIES',
    standard: 'IfcRegulartimeseries',
    chinese: ''
  },
  '3615266464': {
    original: 'IFCRECTANGLEPROFILEDEF',
    standard: 'IfcRectangleprofiledef',
    chinese: ''
  },
  '110355661': {
    original: 'IFCPROPERTYTABLEVALUE',
    standard: 'IfcPropertytablevalue',
    chinese: ''
  },
  '3650150729': {
    original: 'IFCPROPERTYSINGLEVALUE',
    standard: 'IfcPropertysinglevalue',
    chinese: ''
  },
  '3357820518': {
    original: 'IFCPROPERTYSETDEFINITION',
    standard: 'IfcPropertysetdefinition',
    chinese: ''
  },
  '941946838': {
    original: 'IFCPROPERTYREFERENCEVALUE',
    standard: 'IfcPropertyreferencevalue',
    chinese: ''
  },
  '2752243245': {
    original: 'IFCPROPERTYLISTVALUE',
    standard: 'IfcPropertylistvalue',
    chinese: ''
  },
  '4166981789': {
    original: 'IFCPROPERTYENUMERATEDVALUE',
    standard: 'IfcPropertyenumeratedvalue',
    chinese: ''
  },
  '1680319473': {
    original: 'IFCPROPERTYDEFINITION',
    standard: 'IfcPropertydefinition',
    chinese: ''
  },
  '871118103': {
    original: 'IFCPROPERTYBOUNDEDVALUE',
    standard: 'IfcPropertyboundedvalue',
    chinese: ''
  },
  '673634403': {
    original: 'IFCPRODUCTDEFINITIONSHAPE',
    standard: 'IfcProductdefinitionshape',
    chinese: ''
  },
  '179317114': {
    original: 'IFCPREDEFINEDPOINTMARKERSYMBOL',
    standard: 'IfcPredefinedpointmarkersymbol',
    chinese: ''
  },
  '433424934': {
    original: 'IFCPREDEFINEDDIMENSIONSYMBOL',
    standard: 'IfcPredefineddimensionsymbol',
    chinese: ''
  },
  '2559016684': {
    original: 'IFCPREDEFINEDCURVEFONT',
    standard: 'IfcPredefinedcurvefont',
    chinese: ''
  },
  '759155922': {
    original: 'IFCPREDEFINEDCOLOUR',
    standard: 'IfcPredefinedcolour',
    chinese: ''
  },
  '2775532180': {
    original: 'IFCPOLYGONALBOUNDEDHALFSPACE',
    standard: 'IfcPolygonalboundedhalfspace',
    chinese: ''
  },
  '2924175390': {
    original: 'IFCPOLYLOOP',
    standard: 'IfcPolyloop',
    chinese: ''
  },
  '1423911732': {
    original: 'IFCPOINTONSURFACE',
    standard: 'IfcPointonsurface',
    chinese: ''
  },
  '4022376103': {
    original: 'IFCPOINTONCURVE',
    standard: 'IfcPointoncurve',
    chinese: ''
  },
  '2067069095': {
    original: 'IFCPOINT',
    standard: 'IfcPoint',
    chinese: ''
  },
  '1663979128': {
    original: 'IFCPLANAREXTENT',
    standard: 'IfcPlanarextent',
    chinese: ''
  },
  '2004835150': {
    original: 'IFCPLACEMENT',
    standard: 'IfcPlacement',
    chinese: ''
  },
  '597895409': {
    original: 'IFCPIXELTEXTURE',
    standard: 'IfcPixeltexture',
    chinese: ''
  },
  '3021840470': {
    original: 'IFCPHYSICALCOMPLEXQUANTITY',
    standard: 'IfcPhysicalcomplexquantity',
    chinese: ''
  },
  '2519244187': {
    original: 'IFCPATH',
    standard: 'IfcPath',
    chinese: ''
  },
  '2529465313': {
    original: 'IFCPARAMETERIZEDPROFILEDEF',
    standard: 'IfcParameterizedprofiledef',
    chinese: ''
  },
  '1029017970': {
    original: 'IFCORIENTEDEDGE',
    standard: 'IfcOrientededge',
    chinese: ''
  },
  '2665983363': {
    original: 'IFCOPENSHELL',
    standard: 'IfcOpenshell',
    chinese: ''
  },
  '2833995503': {
    original: 'IFCONEDIRECTIONREPEATFACTOR',
    standard: 'IfcOnedirectionrepeatfactor',
    chinese: ''
  },
  '219451334': {
    original: 'IFCOBJECTDEFINITION',
    standard: 'IfcObjectdefinition',
    chinese: ''
  },
  '1430189142': {
    original: 'IFCMECHANICALCONCRETEMATERIALPROPERTIES',
    standard: 'IfcMechanicalconcretematerialproperties',
    chinese: ''
  },
  '2022407955': {
    original: 'IFCMATERIALDEFINITIONREPRESENTATION',
    standard: 'IfcMaterialdefinitionrepresentation',
    chinese: ''
  },
  '2347385850': {
    original: 'IFCMAPPEDITEM',
    standard: 'IfcMappeditem',
    chinese: ''
  },
  '1008929658': {
    original: 'IFCLOOP',
    standard: 'IfcLoop',
    chinese: ''
  },
  '2624227202': {
    original: 'IFCLOCALPLACEMENT',
    standard: 'IfcLocalplacement',
    chinese: ''
  },
  '3422422726': {
    original: 'IFCLIGHTSOURCESPOT',
    standard: 'IfcLightsourcespot',
    chinese: ''
  },
  '1520743889': {
    original: 'IFCLIGHTSOURCEPOSITIONAL',
    standard: 'IfcLightsourcepositional',
    chinese: ''
  },
  '4266656042': {
    original: 'IFCLIGHTSOURCEGONIOMETRIC',
    standard: 'IfcLightsourcegoniometric',
    chinese: ''
  },
  '2604431987': {
    original: 'IFCLIGHTSOURCEDIRECTIONAL',
    standard: 'IfcLightsourcedirectional',
    chinese: ''
  },
  '125510826': {
    original: 'IFCLIGHTSOURCEAMBIENT',
    standard: 'IfcLightsourceambient',
    chinese: ''
  },
  '1402838566': {
    original: 'IFCLIGHTSOURCE',
    standard: 'IfcLightsource',
    chinese: ''
  },
  '3741457305': {
    original: 'IFCIRREGULARTIMESERIES',
    standard: 'IfcIrregulartimeseries',
    chinese: ''
  },
  '3905492369': {
    original: 'IFCIMAGETEXTURE',
    standard: 'IfcImagetexture',
    chinese: ''
  },
  '2445078500': {
    original: 'IFCHYGROSCOPICMATERIALPROPERTIES',
    standard: 'IfcHygroscopicmaterialproperties',
    chinese: ''
  },
  '812098782': {
    original: 'IFCHALFSPACESOLID',
    standard: 'IfcHalfspacesolid',
    chinese: ''
  },
  '178086475': {
    original: 'IFCGRIDPLACEMENT',
    standard: 'IfcGridplacement',
    chinese: ''
  },
  '3590301190': {
    original: 'IFCGEOMETRICSET',
    standard: 'IfcGeometricset',
    chinese: ''
  },
  '4142052618': {
    original: 'IFCGEOMETRICREPRESENTATIONSUBCONTEXT',
    standard: 'IfcGeometricrepresentationsubcontext',
    chinese: ''
  },
  '2453401579': {
    original: 'IFCGEOMETRICREPRESENTATIONITEM',
    standard: 'IfcGeometricrepresentationitem',
    chinese: ''
  },
  '3448662350': {
    original: 'IFCGEOMETRICREPRESENTATIONCONTEXT',
    standard: 'IfcGeometricrepresentationcontext',
    chinese: ''
  },
  '1446786286': {
    original: 'IFCGENERALPROFILEPROPERTIES',
    standard: 'IfcGeneralprofileproperties',
    chinese: ''
  },
  '803998398': {
    original: 'IFCGENERALMATERIALPROPERTIES',
    standard: 'IfcGeneralmaterialproperties',
    chinese: ''
  },
  '3857492461': {
    original: 'IFCFUELPROPERTIES',
    standard: 'IfcFuelproperties',
    chinese: ''
  },
  '738692330': {
    original: 'IFCFILLAREASTYLE',
    standard: 'IfcFillareastyle',
    chinese: ''
  },
  '4219587988': {
    original: 'IFCFAILURECONNECTIONCONDITION',
    standard: 'IfcFailureconnectioncondition',
    chinese: ''
  },
  '3008276851': {
    original: 'IFCFACESURFACE',
    standard: 'IfcFacesurface',
    chinese: ''
  },
  '803316827': {
    original: 'IFCFACEOUTERBOUND',
    standard: 'IfcFaceouterbound',
    chinese: ''
  },
  '1809719519': {
    original: 'IFCFACEBOUND',
    standard: 'IfcFacebound',
    chinese: ''
  },
  '2556980723': {
    original: 'IFCFACE',
    standard: 'IfcFace',
    chinese: ''
  },
  '1860660968': {
    original: 'IFCEXTENDEDMATERIALPROPERTIES',
    standard: 'IfcExtendedmaterialproperties',
    chinese: ''
  },
  '476780140': {
    original: 'IFCEDGECURVE',
    standard: 'IfcEdgecurve',
    chinese: ''
  },
  '3900360178': {
    original: 'IFCEDGE',
    standard: 'IfcEdge',
    chinese: ''
  },
  '4170525392': {
    original: 'IFCDRAUGHTINGPREDEFINEDTEXTFONT',
    standard: 'IfcDraughtingpredefinedtextfont',
    chinese: ''
  },
  '3732053477': {
    original: 'IFCDOCUMENTREFERENCE',
    standard: 'IfcDocumentreference',
    chinese: ''
  },
  '1694125774': {
    original: 'IFCDIMENSIONPAIR',
    standard: 'IfcDimensionpair',
    chinese: ''
  },
  '2273265877': {
    original: 'IFCDIMENSIONCALLOUTRELATIONSHIP',
    standard: 'IfcDimensioncalloutrelationship',
    chinese: ''
  },
  '3632507154': {
    original: 'IFCDERIVEDPROFILEDEF',
    standard: 'IfcDerivedprofiledef',
    chinese: ''
  },
  '3800577675': {
    original: 'IFCCURVESTYLE',
    standard: 'IfcCurvestyle',
    chinese: ''
  },
  '2889183280': {
    original: 'IFCCONVERSIONBASEDUNIT',
    standard: 'IfcConversionbasedunit',
    chinese: ''
  },
  '3050246964': {
    original: 'IFCCONTEXTDEPENDENTUNIT',
    standard: 'IfcContextdependentunit',
    chinese: ''
  },
  '45288368': {
    original: 'IFCCONNECTIONPOINTECCENTRICITY',
    standard: 'IfcConnectionpointeccentricity',
    chinese: ''
  },
  '1981873012': {
    original: 'IFCCONNECTIONCURVEGEOMETRY',
    standard: 'IfcConnectioncurvegeometry',
    chinese: ''
  },
  '370225590': {
    original: 'IFCCONNECTEDFACESET',
    standard: 'IfcConnectedfaceset',
    chinese: ''
  },
  '1485152156': {
    original: 'IFCCOMPOSITEPROFILEDEF',
    standard: 'IfcCompositeprofiledef',
    chinese: ''
  },
  '2542286263': {
    original: 'IFCCOMPLEXPROPERTY',
    standard: 'IfcComplexproperty',
    chinese: ''
  },
  '776857604': {
    original: 'IFCCOLOURRGB',
    standard: 'IfcColourrgb',
    chinese: ''
  },
  '647927063': {
    original: 'IFCCLASSIFICATIONREFERENCE',
    standard: 'IfcClassificationreference',
    chinese: ''
  },
  '3150382593': {
    original: 'IFCCENTERLINEPROFILEDEF',
    standard: 'IfcCenterlineprofiledef',
    chinese: ''
  },
  '616511568': {
    original: 'IFCBLOBTEXTURE',
    standard: 'IfcBlobtexture',
    chinese: ''
  },
  '2705031697': {
    original: 'IFCARBITRARYPROFILEDEFWITHVOIDS',
    standard: 'IfcArbitraryprofiledefwithvoids',
    chinese: ''
  },
  '1310608509': {
    original: 'IFCARBITRARYOPENPROFILEDEF',
    standard: 'IfcArbitraryopenprofiledef',
    chinese: ''
  },
  '3798115385': {
    original: 'IFCARBITRARYCLOSEDPROFILEDEF',
    standard: 'IfcArbitraryclosedprofiledef',
    chinese: ''
  },
  '2297822566': {
    original: 'IFCANNOTATIONTEXTOCCURRENCE',
    standard: 'IfcAnnotationtextoccurrence',
    chinese: ''
  },
  '3612888222': {
    original: 'IFCANNOTATIONSYMBOLOCCURRENCE',
    standard: 'IfcAnnotationsymboloccurrence',
    chinese: ''
  },
  '962685235': {
    original: 'IFCANNOTATIONSURFACEOCCURRENCE',
    standard: 'IfcAnnotationsurfaceoccurrence',
    chinese: ''
  },
  '2442683028': {
    original: 'IFCANNOTATIONOCCURRENCE',
    standard: 'IfcAnnotationoccurrence',
    chinese: ''
  },
  '1065908215': {
    original: 'IFCWATERPROPERTIES',
    standard: 'IfcWaterproperties',
    chinese: ''
  },
  '891718957': {
    original: 'IFCVIRTUALGRIDINTERSECTION',
    standard: 'IfcVirtualgridintersection',
    chinese: ''
  },
  '1907098498': {
    original: 'IFCVERTEXPOINT',
    standard: 'IfcVertexpoint',
    chinese: ''
  },
  '3304826586': {
    original: 'IFCVERTEXBASEDTEXTUREMAP',
    standard: 'IfcVertexbasedtexturemap',
    chinese: ''
  },
  '2799835756': {
    original: 'IFCVERTEX',
    standard: 'IfcVertex',
    chinese: ''
  },
  '180925521': {
    original: 'IFCUNITASSIGNMENT',
    standard: 'IfcUnitassignment',
    chinese: ''
  },
  '1735638870': {
    original: 'IFCTOPOLOGYREPRESENTATION',
    standard: 'IfcTopologyrepresentation',
    chinese: ''
  },
  '1377556343': {
    original: 'IFCTOPOLOGICALREPRESENTATIONITEM',
    standard: 'IfcTopologicalrepresentationitem',
    chinese: ''
  },
  '581633288': {
    original: 'IFCTIMESERIESVALUE',
    standard: 'IfcTimeseriesvalue',
    chinese: ''
  },
  '1718945513': {
    original: 'IFCTIMESERIESREFERENCERELATIONSHIP',
    standard: 'IfcTimeseriesreferencerelationship',
    chinese: ''
  },
  '3101149627': {
    original: 'IFCTIMESERIES',
    standard: 'IfcTimeseries',
    chinese: ''
  },
  '3317419933': {
    original: 'IFCTHERMALMATERIALPROPERTIES',
    standard: 'IfcThermalmaterialproperties',
    chinese: ''
  },
  '1210645708': {
    original: 'IFCTEXTUREVERTEX',
    standard: 'IfcTexturevertex',
    chinese: ''
  },
  '2552916305': {
    original: 'IFCTEXTUREMAP',
    standard: 'IfcTexturemap',
    chinese: ''
  },
  '1742049831': {
    original: 'IFCTEXTURECOORDINATEGENERATOR',
    standard: 'IfcTexturecoordinategenerator',
    chinese: ''
  },
  '280115917': {
    original: 'IFCTEXTURECOORDINATE',
    standard: 'IfcTexturecoordinate',
    chinese: ''
  },
  '1484833681': {
    original: 'IFCTEXTSTYLEWITHBOXCHARACTERISTICS',
    standard: 'IfcTextstylewithboxcharacteristics',
    chinese: ''
  },
  '1640371178': {
    original: 'IFCTEXTSTYLETEXTMODEL',
    standard: 'IfcTextstyletextmodel',
    chinese: ''
  },
  '2636378356': {
    original: 'IFCTEXTSTYLEFORDEFINEDFONT',
    standard: 'IfcTextstylefordefinedfont',
    chinese: ''
  },
  '1983826977': {
    original: 'IFCTEXTSTYLEFONTMODEL',
    standard: 'IfcTextstylefontmodel',
    chinese: ''
  },
  '1447204868': {
    original: 'IFCTEXTSTYLE',
    standard: 'IfcTextstyle',
    chinese: ''
  },
  '912023232': {
    original: 'IFCTELECOMADDRESS',
    standard: 'IfcTelecomaddress',
    chinese: ''
  },
  '531007025': {
    original: 'IFCTABLEROW',
    standard: 'IfcTablerow',
    chinese: ''
  },
  '985171141': {
    original: 'IFCTABLE',
    standard: 'IfcTable',
    chinese: ''
  },
  '1290481447': {
    original: 'IFCSYMBOLSTYLE',
    standard: 'IfcSymbolstyle',
    chinese: ''
  },
  '626085974': {
    original: 'IFCSURFACETEXTURE',
    standard: 'IfcSurfacetexture',
    chinese: ''
  },
  '1351298697': {
    original: 'IFCSURFACESTYLEWITHTEXTURES',
    standard: 'IfcSurfacestylewithtextures',
    chinese: ''
  },
  '846575682': {
    original: 'IFCSURFACESTYLESHADING',
    standard: 'IfcSurfacestyleshading',
    chinese: ''
  },
  '1607154358': {
    original: 'IFCSURFACESTYLEREFRACTION',
    standard: 'IfcSurfacestylerefraction',
    chinese: ''
  },
  '3303107099': {
    original: 'IFCSURFACESTYLELIGHTING',
    standard: 'IfcSurfacestylelighting',
    chinese: ''
  },
  '1300840506': {
    original: 'IFCSURFACESTYLE',
    standard: 'IfcSurfacestyle',
    chinese: ''
  },
  '3049322572': {
    original: 'IFCSTYLEDREPRESENTATION',
    standard: 'IfcStyledrepresentation',
    chinese: ''
  },
  '3958052878': {
    original: 'IFCSTYLEDITEM',
    standard: 'IfcStyleditem',
    chinese: ''
  },
  '2830218821': {
    original: 'IFCSTYLEMODEL',
    standard: 'IfcStylemodel',
    chinese: ''
  },
  '3408363356': {
    original: 'IFCSTRUCTURALLOADTEMPERATURE',
    standard: 'IfcStructuralloadtemperature',
    chinese: ''
  },
  '2525727697': {
    original: 'IFCSTRUCTURALLOADSTATIC',
    standard: 'IfcStructuralloadstatic',
    chinese: ''
  },
  '2162789131': {
    original: 'IFCSTRUCTURALLOAD',
    standard: 'IfcStructuralload',
    chinese: ''
  },
  '2273995522': {
    original: 'IFCSTRUCTURALCONNECTIONCONDITION',
    standard: 'IfcStructuralconnectioncondition',
    chinese: ''
  },
  '3692461612': {
    original: 'IFCSIMPLEPROPERTY',
    standard: 'IfcSimpleproperty',
    chinese: ''
  },
  '4240577450': {
    original: 'IFCSHAPEREPRESENTATION',
    standard: 'IfcShaperepresentation',
    chinese: ''
  },
  '3982875396': {
    original: 'IFCSHAPEMODEL',
    standard: 'IfcShapemodel',
    chinese: ''
  },
  '867548509': {
    original: 'IFCSHAPEASPECT',
    standard: 'IfcShapeaspect',
    chinese: ''
  },
  '4165799628': {
    original: 'IFCSECTIONREINFORCEMENTPROPERTIES',
    standard: 'IfcSectionreinforcementproperties',
    chinese: ''
  },
  '2042790032': {
    original: 'IFCSECTIONPROPERTIES',
    standard: 'IfcSectionproperties',
    chinese: ''
  },
  '448429030': {
    original: 'IFCSIUNIT',
    standard: 'IfcSiunit',
    chinese: ''
  },
  '2341007311': {
    original: 'IFCROOT',
    standard: 'IfcRoot',
    chinese: ''
  },
  '3679540991': {
    original: 'IFCRIBPLATEPROFILEPROPERTIES',
    standard: 'IfcRibplateprofileproperties',
    chinese: ''
  },
  '1660063152': {
    original: 'IFCREPRESENTATIONMAP',
    standard: 'IfcRepresentationmap',
    chinese: ''
  },
  '3008791417': {
    original: 'IFCREPRESENTATIONITEM',
    standard: 'IfcRepresentationitem',
    chinese: ''
  },
  '3377609919': {
    original: 'IFCREPRESENTATIONCONTEXT',
    standard: 'IfcRepresentationcontext',
    chinese: ''
  },
  '1076942058': {
    original: 'IFCREPRESENTATION',
    standard: 'IfcRepresentation',
    chinese: ''
  },
  '1222501353': {
    original: 'IFCRELAXATION',
    standard: 'IfcRelaxation',
    chinese: ''
  },
  '1580146022': {
    original: 'IFCREINFORCEMENTBARPROPERTIES',
    standard: 'IfcReinforcementbarproperties',
    chinese: ''
  },
  '2692823254': {
    original: 'IFCREFERENCESVALUEDOCUMENT',
    standard: 'IfcReferencesvaluedocument',
    chinese: ''
  },
  '825690147': {
    original: 'IFCQUANTITYWEIGHT',
    standard: 'IfcQuantityweight',
    chinese: ''
  },
  '2405470396': {
    original: 'IFCQUANTITYVOLUME',
    standard: 'IfcQuantityvolume',
    chinese: ''
  },
  '3252649465': {
    original: 'IFCQUANTITYTIME',
    standard: 'IfcQuantitytime',
    chinese: ''
  },
  '931644368': {
    original: 'IFCQUANTITYLENGTH',
    standard: 'IfcQuantitylength',
    chinese: ''
  },
  '2093928680': {
    original: 'IFCQUANTITYCOUNT',
    standard: 'IfcQuantitycount',
    chinese: ''
  },
  '2044713172': {
    original: 'IFCQUANTITYAREA',
    standard: 'IfcQuantityarea',
    chinese: ''
  },
  '3710013099': {
    original: 'IFCPROPERTYENUMERATION',
    standard: 'IfcPropertyenumeration',
    chinese: ''
  },
  '148025276': {
    original: 'IFCPROPERTYDEPENDENCYRELATIONSHIP',
    standard: 'IfcPropertydependencyrelationship',
    chinese: ''
  },
  '3896028662': {
    original: 'IFCPROPERTYCONSTRAINTRELATIONSHIP',
    standard: 'IfcPropertyconstraintrelationship',
    chinese: ''
  },
  '2598011224': {
    original: 'IFCPROPERTY',
    standard: 'IfcProperty',
    chinese: ''
  },
  '2802850158': {
    original: 'IFCPROFILEPROPERTIES',
    standard: 'IfcProfileproperties',
    chinese: ''
  },
  '3958567839': {
    original: 'IFCPROFILEDEF',
    standard: 'IfcProfiledef',
    chinese: ''
  },
  '2267347899': {
    original: 'IFCPRODUCTSOFCOMBUSTIONPROPERTIES',
    standard: 'IfcProductsofcombustionproperties',
    chinese: ''
  },
  '2095639259': {
    original: 'IFCPRODUCTREPRESENTATION',
    standard: 'IfcProductrepresentation',
    chinese: ''
  },
  '2417041796': {
    original: 'IFCPRESENTATIONSTYLEASSIGNMENT',
    standard: 'IfcPresentationstyleassignment',
    chinese: ''
  },
  '3119450353': {
    original: 'IFCPRESENTATIONSTYLE',
    standard: 'IfcPresentationstyle',
    chinese: ''
  },
  '1304840413': {
    original: 'IFCPRESENTATIONLAYERWITHSTYLE',
    standard: 'IfcPresentationlayerwithstyle',
    chinese: ''
  },
  '2022622350': {
    original: 'IFCPRESENTATIONLAYERASSIGNMENT',
    standard: 'IfcPresentationlayerassignment',
    chinese: ''
  },
  '1775413392': {
    original: 'IFCPREDEFINEDTEXTFONT',
    standard: 'IfcPredefinedtextfont',
    chinese: ''
  },
  '3213052703': {
    original: 'IFCPREDEFINEDTERMINATORSYMBOL',
    standard: 'IfcPredefinedterminatorsymbol',
    chinese: ''
  },
  '990879717': {
    original: 'IFCPREDEFINEDSYMBOL',
    standard: 'IfcPredefinedsymbol',
    chinese: ''
  },
  '3727388367': {
    original: 'IFCPREDEFINEDITEM',
    standard: 'IfcPredefineditem',
    chinese: ''
  },
  '3355820592': {
    original: 'IFCPOSTALADDRESS',
    standard: 'IfcPostaladdress',
    chinese: ''
  },
  '2226359599': {
    original: 'IFCPHYSICALSIMPLEQUANTITY',
    standard: 'IfcPhysicalsimplequantity',
    chinese: ''
  },
  '2483315170': {
    original: 'IFCPHYSICALQUANTITY',
    standard: 'IfcPhysicalquantity',
    chinese: ''
  },
  '101040310': {
    original: 'IFCPERSONANDORGANIZATION',
    standard: 'IfcPersonandorganization',
    chinese: ''
  },
  '2077209135': {
    original: 'IFCPERSON',
    standard: 'IfcPerson',
    chinese: ''
  },
  '1207048766': {
    original: 'IFCOWNERHISTORY',
    standard: 'IfcOwnerhistory',
    chinese: ''
  },
  '1411181986': {
    original: 'IFCORGANIZATIONRELATIONSHIP',
    standard: 'IfcOrganizationrelationship',
    chinese: ''
  },
  '4251960020': {
    original: 'IFCORGANIZATION',
    standard: 'IfcOrganization',
    chinese: ''
  },
  '1227763645': {
    original: 'IFCOPTICALMATERIALPROPERTIES',
    standard: 'IfcOpticalmaterialproperties',
    chinese: ''
  },
  '2251480897': {
    original: 'IFCOBJECTIVE',
    standard: 'IfcObjective',
    chinese: ''
  },
  '3701648758': {
    original: 'IFCOBJECTPLACEMENT',
    standard: 'IfcObjectplacement',
    chinese: ''
  },
  '1918398963': {
    original: 'IFCNAMEDUNIT',
    standard: 'IfcNamedunit',
    chinese: ''
  },
  '2706619895': {
    original: 'IFCMONETARYUNIT',
    standard: 'IfcMonetaryunit',
    chinese: ''
  },
  '3368373690': {
    original: 'IFCMETRIC',
    standard: 'IfcMetric',
    chinese: ''
  },
  '677618848': {
    original: 'IFCMECHANICALSTEELMATERIALPROPERTIES',
    standard: 'IfcMechanicalsteelmaterialproperties',
    chinese: ''
  },
  '4256014907': {
    original: 'IFCMECHANICALMATERIALPROPERTIES',
    standard: 'IfcMechanicalmaterialproperties',
    chinese: ''
  },
  '2597039031': {
    original: 'IFCMEASUREWITHUNIT',
    standard: 'IfcMeasurewithunit',
    chinese: ''
  },
  '3265635763': {
    original: 'IFCMATERIALPROPERTIES',
    standard: 'IfcMaterialproperties',
    chinese: ''
  },
  '2199411900': {
    original: 'IFCMATERIALLIST',
    standard: 'IfcMateriallist',
    chinese: ''
  },
  '1303795690': {
    original: 'IFCMATERIALLAYERSETUSAGE',
    standard: 'IfcMateriallayersetusage',
    chinese: ''
  },
  '3303938423': {
    original: 'IFCMATERIALLAYERSET',
    standard: 'IfcMateriallayerset',
    chinese: ''
  },
  '248100487': {
    original: 'IFCMATERIALLAYER',
    standard: 'IfcMateriallayer',
    chinese: ''
  },
  '1847130766': {
    original: 'IFCMATERIALCLASSIFICATIONRELATIONSHIP',
    standard: 'IfcMaterialclassificationrelationship',
    chinese: ''
  },
  '1838606355': {
    original: 'IFCMATERIAL',
    standard: 'IfcMaterial',
    chinese: ''
  },
  '30780891': {
    original: 'IFCLOCALTIME',
    standard: 'IfcLocaltime',
    chinese: ''
  },
  '1566485204': {
    original: 'IFCLIGHTINTENSITYDISTRIBUTION',
    standard: 'IfcLightintensitydistribution',
    chinese: ''
  },
  '4162380809': {
    original: 'IFCLIGHTDISTRIBUTIONDATA',
    standard: 'IfcLightdistributiondata',
    chinese: ''
  },
  '3452421091': {
    original: 'IFCLIBRARYREFERENCE',
    standard: 'IfcLibraryreference',
    chinese: ''
  },
  '2655187982': {
    original: 'IFCLIBRARYINFORMATION',
    standard: 'IfcLibraryinformation',
    chinese: ''
  },
  '3020489413': {
    original: 'IFCIRREGULARTIMESERIESVALUE',
    standard: 'IfcIrregulartimeseriesvalue',
    chinese: ''
  },
  '852622518': {
    original: 'IFCGRIDAXIS',
    standard: 'IfcGridaxis',
    chinese: ''
  },
  '3548104201': {
    original: 'IFCEXTERNALLYDEFINEDTEXTFONT',
    standard: 'IfcExternallydefinedtextfont',
    chinese: ''
  },
  '3207319532': {
    original: 'IFCEXTERNALLYDEFINEDSYMBOL',
    standard: 'IfcExternallydefinedsymbol',
    chinese: ''
  },
  '1040185647': {
    original: 'IFCEXTERNALLYDEFINEDSURFACESTYLE',
    standard: 'IfcExternallydefinedsurfacestyle',
    chinese: ''
  },
  '2242383968': {
    original: 'IFCEXTERNALLYDEFINEDHATCHSTYLE',
    standard: 'IfcExternallydefinedhatchstyle',
    chinese: ''
  },
  '3200245327': {
    original: 'IFCEXTERNALREFERENCE',
    standard: 'IfcExternalreference',
    chinese: ''
  },
  '1648886627': {
    original: 'IFCENVIRONMENTALIMPACTVALUE',
    standard: 'IfcEnvironmentalimpactvalue',
    chinese: ''
  },
  '3796139169': {
    original: 'IFCDRAUGHTINGCALLOUTRELATIONSHIP',
    standard: 'IfcDraughtingcalloutrelationship',
    chinese: ''
  },
  '770865208': {
    original: 'IFCDOCUMENTINFORMATIONRELATIONSHIP',
    standard: 'IfcDocumentinformationrelationship',
    chinese: ''
  },
  '1154170062': {
    original: 'IFCDOCUMENTINFORMATION',
    standard: 'IfcDocumentinformation',
    chinese: ''
  },
  '1376555844': {
    original: 'IFCDOCUMENTELECTRONICFORMAT',
    standard: 'IfcDocumentelectronicformat',
    chinese: ''
  },
  '2949456006': {
    original: 'IFCDIMENSIONALEXPONENTS',
    standard: 'IfcDimensionalexponents',
    chinese: ''
  },
  '1045800335': {
    original: 'IFCDERIVEDUNITELEMENT',
    standard: 'IfcDerivedunitelement',
    chinese: ''
  },
  '1765591967': {
    original: 'IFCDERIVEDUNIT',
    standard: 'IfcDerivedunit',
    chinese: ''
  },
  '1072939445': {
    original: 'IFCDATEANDTIME',
    standard: 'IfcDateandtime',
    chinese: ''
  },
  '3510044353': {
    original: 'IFCCURVESTYLEFONTPATTERN',
    standard: 'IfcCurvestylefontpattern',
    chinese: ''
  },
  '2367409068': {
    original: 'IFCCURVESTYLEFONTANDSCALING',
    standard: 'IfcCurvestylefontandscaling',
    chinese: ''
  },
  '1105321065': {
    original: 'IFCCURVESTYLEFONT',
    standard: 'IfcCurvestylefont',
    chinese: ''
  },
  '539742890': {
    original: 'IFCCURRENCYRELATIONSHIP',
    standard: 'IfcCurrencyrelationship',
    chinese: ''
  },
  '602808272': {
    original: 'IFCCOSTVALUE',
    standard: 'IfcCostvalue',
    chinese: ''
  },
  '1065062679': {
    original: 'IFCCOORDINATEDUNIVERSALTIMEOFFSET',
    standard: 'IfcCoordinateduniversaltimeoffset',
    chinese: ''
  },
  '347226245': {
    original: 'IFCCONSTRAINTRELATIONSHIP',
    standard: 'IfcConstraintrelationship',
    chinese: ''
  },
  '613356794': {
    original: 'IFCCONSTRAINTCLASSIFICATIONRELATIONSHIP',
    standard: 'IfcConstraintclassificationrelationship',
    chinese: ''
  },
  '1658513725': {
    original: 'IFCCONSTRAINTAGGREGATIONRELATIONSHIP',
    standard: 'IfcConstraintaggregationrelationship',
    chinese: ''
  },
  '1959218052': {
    original: 'IFCCONSTRAINT',
    standard: 'IfcConstraint',
    chinese: ''
  },
  '2732653382': {
    original: 'IFCCONNECTIONSURFACEGEOMETRY',
    standard: 'IfcConnectionsurfacegeometry',
    chinese: ''
  },
  '4257277454': {
    original: 'IFCCONNECTIONPORTGEOMETRY',
    standard: 'IfcConnectionportgeometry',
    chinese: ''
  },
  '2614616156': {
    original: 'IFCCONNECTIONPOINTGEOMETRY',
    standard: 'IfcConnectionpointgeometry',
    chinese: ''
  },
  '2859738748': {
    original: 'IFCCONNECTIONGEOMETRY',
    standard: 'IfcConnectiongeometry',
    chinese: ''
  },
  '3264961684': {
    original: 'IFCCOLOURSPECIFICATION',
    standard: 'IfcColourspecification',
    chinese: ''
  },
  '3639012971': {
    original: 'IFCCLASSIFICATIONNOTATIONFACET',
    standard: 'IfcClassificationnotationfacet',
    chinese: ''
  },
  '938368621': {
    original: 'IFCCLASSIFICATIONNOTATION',
    standard: 'IfcClassificationnotation',
    chinese: ''
  },
  '1098599126': {
    original: 'IFCCLASSIFICATIONITEMRELATIONSHIP',
    standard: 'IfcClassificationitemrelationship',
    chinese: ''
  },
  '1767535486': {
    original: 'IFCCLASSIFICATIONITEM',
    standard: 'IfcClassificationitem',
    chinese: ''
  },
  '747523909': {
    original: 'IFCCLASSIFICATION',
    standard: 'IfcClassification',
    chinese: ''
  },
  '622194075': {
    original: 'IFCCALENDARDATE',
    standard: 'IfcCalendardate',
    chinese: ''
  },
  '2069777674': {
    original: 'IFCBOUNDARYNODECONDITIONWARPING',
    standard: 'IfcBoundarynodeconditionwarping',
    chinese: ''
  },
  '1387855156': {
    original: 'IFCBOUNDARYNODECONDITION',
    standard: 'IfcBoundarynodecondition',
    chinese: ''
  },
  '3367102660': {
    original: 'IFCBOUNDARYFACECONDITION',
    standard: 'IfcBoundaryfacecondition',
    chinese: ''
  },
  '1560379544': {
    original: 'IFCBOUNDARYEDGECONDITION',
    standard: 'IfcBoundaryedgecondition',
    chinese: ''
  },
  '4037036970': {
    original: 'IFCBOUNDARYCONDITION',
    standard: 'IfcBoundarycondition',
    chinese: ''
  },
  '3869604511': {
    original: 'IFCAPPROVALRELATIONSHIP',
    standard: 'IfcApprovalrelationship',
    chinese: ''
  },
  '390851274': {
    original: 'IFCAPPROVALPROPERTYRELATIONSHIP',
    standard: 'IfcApprovalpropertyrelationship',
    chinese: ''
  },
  '2080292479': {
    original: 'IFCAPPROVALACTORRELATIONSHIP',
    standard: 'IfcApprovalactorrelationship',
    chinese: ''
  },
  '130549933': {
    original: 'IFCAPPROVAL',
    standard: 'IfcApproval',
    chinese: ''
  },
  '1110488051': {
    original: 'IFCAPPLIEDVALUERELATIONSHIP',
    standard: 'IfcAppliedvaluerelationship',
    chinese: ''
  },
  '411424972': {
    original: 'IFCAPPLIEDVALUE',
    standard: 'IfcAppliedvalue',
    chinese: ''
  },
  '639542469': {
    original: 'IFCAPPLICATION',
    standard: 'IfcApplication',
    chinese: ''
  },
  '618182010': {
    original: 'IFCADDRESS',
    standard: 'IfcAddress',
    chinese: ''
  },
  '3630933823': {
    original: 'IFCACTORROLE',
    standard: 'IfcActorrole',
    chinese: ''
  },
  '599546466': {
    original: 'FILE_DESCRIPTION',
    standard: 'File_Description',
    chinese: ''
  },
  '1390159747': {
    original: 'FILE_NAME',
    standard: 'File_Name',
    chinese: ''
  },
  '1109904537': {
    original: 'FILE_SCHEMA',
    standard: 'File_Schema',
    chinese: ''
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


export function getIfcChineseNumberName(originalType: number): string | number {
  if (!originalType || typeof originalType !== 'number') {
    return originalType
  }
  const typeString = originalType.toString();
  const typeInfo = IFC_TYPE_MAP[typeString];
  if (typeInfo) {
    return typeInfo.standard;
  }
  return originalType;
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