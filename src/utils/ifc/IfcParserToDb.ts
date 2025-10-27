import { IFCParser, formatGuid } from './IfcParser'
import { RelationElementInfo } from './ifcUtils'
import * as duckdb from '@duckdb/duckdb-wasm';

let graphicMaxId = 0;
let geometryMaxId = 0;
let materialMaxId = 0;

export class IFCParser2DB {
    private parser: IFCParser;
    private dbName: string;
    // private filePath: string;
    private db: any;
    private cnn: any;
    private data: any;
    private result: any;
    private projectGuid: any;
    private modelName: any;
    private siteCoord: any;
    private modelType: any;
    private locationEPSG: any;
    private createTime: any;
    private createVersion: any;
    private allBuildingElements: any;
    private allElementsProperties: any;
    private allExportMeshes: any;
    private exportMeshesMap: any;
    private dummyExportMeshesMap: any;
    private locationX: any;
    private locationY: any;
    private locationZ: any;
    private locationA: any;
    private detail_level: number;
    private defaultOption: any;
    private fileNames: any

    private uuid: any;
    private elementPsets:{ [key: number]: Set<string> } = {};

    // 构造函数，初始化一些配置项
    constructor() {
        this.defaultOption = {
            "access_mode": 'READ_WRITE',
            "max_memory": "8192MB",
            "threads": "4"
        };
        this.parser = new IFCParser({
            fileId: 'test'
        });
        this.dbName = generateUUID();
        this.projectGuid = generateUUID();
        this.modelName = generateUUID();
        this.modelType = '建筑';
        this.locationEPSG = 3857;
        this.createTime = Date.now();
        this.createVersion = '2.0.17';
        this.detail_level = 12;
        this.fileNames = []
    }

    // 创建或打开DuckDB数据库
    private async initDb(dbName:string) {
        const baseUrl = window.location.origin
        const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
            mainModule: `${baseUrl}/duckdb/duckdb_mvp.wasm`,
            mainWorker: `${baseUrl}/duckdb/duckdb-browser-mvp.worker.js`,
        },
        eh: {
            mainModule: `${baseUrl}/duckdb/duckdb-eh.wasm`,
            mainWorker: `${baseUrl}/duckdb/duckdb-browser-eh.worker.js`,
            },
        };
        // Select a bundle based on browser checks
        const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
        // Instantiate the asynchronous version of DuckDB-wasm
        const worker = new Worker(bundle.mainWorker!);
        const logger = new duckdb.ConsoleLogger();
        this.db = new duckdb.AsyncDuckDB(logger, worker);
        await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        await this.db.open({
            path: `opfs://${dbName}.db`,
            accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        });
        this.cnn = await this.db.connect();
    }
    // 初始Result数据
    private async initResult(detail_level: number) {
        await this.parser.parse(this.data, detail_level)
    }
    // 初始siteCoord数据
    private async initSiteCoord() {
        this.siteCoord = await this.parser.getSiteCoord() // 获取IFCSITE的坐标值
        this.locationX = this.siteCoord[0]
        this.locationY = this.siteCoord[1]
        this.locationZ = this.siteCoord[2]
        this.locationA = 0
        // console.log('ifcsite:', this.siteCoord)
    }
    // 初始所有构件元素数据，传入dummyElementsSet作为过滤虚拟元素的依据
    private async initAllBuildingElements() {
        this.allBuildingElements = await this.parser.getAllElements(this.projectGuid)
    }
    // 初始所有构件属性数据
    private async initAllElementsProperties() {
        this.allElementsProperties = await this.parser.getAllElementsProps()
    }
    // 初始所有构件几何数据
    // private async initAllExportMeshes() {
    //     this.allExportMeshes = await this.parser.getAllExportMeshes();
    // }
    // 初始所有构件与实体几何关联映射关系数据
    // private async initExportMeshesMap() {
    //     this.exportMeshesMap = await this.parser.getExportMeshesMap();
    // }
    // 初始所有构件与虚拟几何关联映射关系数据
    // private async initDummyExportMeshesMap() {
    //     this.dummyExportMeshesMap = await this.parser.getDummyExportMeshesMap();
    // }

    // 处理ifc文件数据并导出到duckdb数据库入口
    async start(data: File, dbName: string, envConfig?: { x: number; y: number; z: number; a: number, detail_level: number }) {
        const tableChunks: { [key: string]: string[] } = {};
        const memoryDbName = `${dbName}_${(new Date).getTime()}`;
        await this.initDb(memoryDbName);
        this.data = data;

        if (envConfig && 'detail_level' in envConfig) {
            this.detail_level = envConfig.detail_level!;
        } else {
            this.detail_level = 12;
        }

        await this.initResult(this.detail_level);

        if (envConfig) {
            this.locationX = envConfig.x ?? 0;
            this.locationY = envConfig.y ?? 0;
            this.locationZ = envConfig.z ?? 0;
            this.locationA = envConfig.a ?? 0;
            console.log(`坐标参数为经度long: ${this.locationX}, 纬度lati: ${this.locationY}, 海拔eleva: ${this.locationZ}, 初始角度: ${this.locationA}, 细节度: ${this.detail_level}`);
            const coordResult = await this.parser.convertCoordinates(envConfig.y, envConfig.x);
            this.locationX = coordResult.refLongitude;
            this.locationY = coordResult.refLatitude;
            console.log(`计算后坐标参数值x：${this.locationX}, y：${this.locationY}`)
        } else {
            console.log('未提供坐标参数，尝试通过IFCSITE设置坐标参数');
            await this.initSiteCoord();
            console.log(`计算后坐标参数值x: ${this.locationX}, y: ${this.locationY}, z: ${this.locationZ}, a: ${this.locationA}, detail_level: ${this.detail_level}`);
        }

        await this.initAllBuildingElements();
        await this.initAllElementsProperties();
        // await this.initAllExportMeshes();
        // await this.initExportMeshesMap();
        // await this.initDummyExportMeshesMap();
        try {
            // 读取.sql文件内容
            // const sqlCommands = fs.readFileSync(dbPath, 'utf8');
            const sqlCommands = `
        -- noinspection SqlNoDataSourceInspectionForFile
        
        -- noinspection SqlDialectInspectionForFile
        
        CREATE SEQUENCE seq_scene_base_id START 1;
        CREATE SEQUENCE seq_scene_physical_id START 1;
        CREATE SEQUENCE seq_scene_dummy_id START 1;
        CREATE SEQUENCE seq_scene_relation_id START 1;
        CREATE SEQUENCE seq_scene_attribute_id START 1;
        
        CREATE TYPE MODEL_TYPE AS ENUM ('建筑', '人工', '倾斜', '点', '点云', '体素');
        CREATE TYPE ATTRIBUTE_VALUE_TYPE AS ENUM ('INT', 'VARCHAR', 'REAL', 'DOUBLE', 'BOOLEAN', 'DATE', 'TIME', 'ARRAY', 'LIST');
        
        CREATE TABLE scene_base (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('seq_scene_base_id'),
            guid UUID,
            model_name VARCHAR,
            model_type MODEL_TYPE,
            location_epsg INTEGER DEFAULT 3857,
            location_x DOUBLE,
            location_y DOUBLE,
            location_z DOUBLE,
            location_angle DOUBLE,
            create_time BIGINT,
            create_version VARCHAR,
        );
        
        CREATE TABLE scene_physical (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('seq_scene_physical_id'),
            guid UUID,
            extid TEXT,
            name TEXT,
            description TEXT,
            tag TEXT,
            in_model UUID,
            in_project UUID,
            in_site UUID,
            in_building UUID,
            in_storey UUID,
            of_category TEXT,
            of_family TEXT,
            of_type TEXT,
            of_level TEXT,
            of_discipline TEXT
        );
        
        CREATE TABLE scene_dummy (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('seq_scene_dummy_id'),
            guid UUID,
            extid TEXT,
            name TEXT,
            description TEXT,
            tag TEXT,
            in_model UUID,
            in_project UUID,
            in_site UUID,
            in_building UUID,
            in_storey UUID,
            of_category TEXT,
            of_family TEXT,
            of_type TEXT,
            of_level TEXT,
            of_discipline TEXT
        );
        
        CREATE TABLE scene_relation (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('seq_scene_relation_id'),
            guid UUID,
            extid TEXT,
            name TEXT,
            description TEXT,
            in_model UUID,
            rel_type TEXT,
            relating_object TEXT,
            related_objects TEXT[]
        );
        
        CREATE TABLE scene_attribute (
            id INTEGER PRIMARY KEY DEFAULT NEXTVAL('seq_scene_attribute_id'),
            guid UUID,
            attribute_code TEXT,
            attribute_kind TEXT,
            attribute_group TEXT,
            attribute_key TEXT,
            attribute_name TEXT,
            attribute_value TEXT,
            value_type ATTRIBUTE_VALUE_TYPE,
            value_unit TEXT
        );
        
        
        CREATE TABLE scene_view (
            id INTEGER PRIMARY KEY,
            code INTEGER,
            name TEXT,
            camera_x REAL,
            camera_y REAL,
            camera_z REAL,
            camera_pitch REAL,
            camera_yaw REAL
        );`

            // 执行.sql文件中的SQL命令
            // console.log(this.db);
            await this.cnn.query(sqlCommands);
            console.log('数据库已成功通过.sql文件创建。');

            /* 插入数据到scene_base表中 */
            await insertIntoSceneBase(
                this.cnn,
                this.projectGuid,
                this.modelName,
                this.modelType,
                this.locationEPSG,
                this.locationX,
                this.locationY,
                this.locationZ,
                this.locationA,
                this.createTime,
                this.createVersion
            );


            /* 插入到scene_physical物理元素表中
            // TODO: 1. 根据 空间关系和聚合关系，去判定某个构件属于上层的构件是谁
            // TODO: 2. 解析 level，针对 IfcBuildingStorey的字符串属性进行解析
            // 对被筛选出的IfcElements构件们进行属性的读取和处理 */
            // let count = 0; // TEMP: 初始化计数器，用作限制数据产生内容
            tableChunks['physical'] = chunkJson(Object.values(this.parser.physicalElements));


            /* 插入到scene_attribute元素属性表中 */
            const attrResults = await insertElementsProps(this.parser, this.allElementsProperties, this.elementPsets);

            await appendDefindsByTypeProps(this.parser, attrResults, this.elementPsets);
            /* 将关系元素信息作为属性追加到attribute */
            await appendRelProps(this.parser, attrResults);
            /* 追加分类信息属性 */
            // await appendClassficationProps(this.parser, attrResults);

            tableChunks['attribute'] = chunkJson(attrResults);

            // 插入 实体构件 相关数据 到scene_geometry元素几何表中，插入到scene_material共享材质表中，插入到scene_graphic元素图形表中
            // const result = await insertGraphicGeometryMaterial(this.parser, this.db, this.exportMeshesMap);

            /* 插入 实体构件相关数据到scene_graphic元素属性表中 */
            // tableChunks['graphic'] = chunkJson(result.graphic);

            /* 插入 实体构件 相关数据到scene_geometry元素属性表中 */
            // tableChunks['geometry'] = chunkJson(result.geometry);

            /* 插入 实体构件 相关数据到scene_material元素属性表中 */
            // tableChunks['material'] = chunkJson(result.material);



            //===================  虚拟构件部分处理 ===================
            tableChunks['dummy'] = chunkJson(Object.values(this.parser.dummyElements));
            // 插入 虚拟构件 相关数据到scene_geometry元素几何表中，插入到scene_material共享材质表中，插入到scene_dummy元素图形表中
            // const dummyResult = await insertGraphicGeometryMaterial(this.parser, this.db, this.dummyExportMeshesMap);

            /* 插入 虚拟构件 相关数据到scene_graphic元素属性表中 */
            // tableChunks['graphic'] = chunkJson(dummyResult.graphic);

            /* 插入 虚拟构件 相关数据到scene_geometry元素属性表中 */
            // tableChunks['geometry'] = chunkJson(dummyResult.geometry);

            /* 插入 虚拟构件 相关数据到scene_material元素属性表中 */
            // tableChunks['material'] = chunkJson(dummyResult.material);


            //===================  关系元素部分处理 ===================
            // tableChunks['relation'] = chunkJson(Object.values(this.parser.relationElements));


            // 集中数据导入到db：
            await insertFromJsonChunks('physical', tableChunks['physical'], this.db, this.cnn, this.fileNames);
            await insertFromJsonChunks('attribute', tableChunks['attribute'], this.db, this.cnn, this.fileNames);
            await insertFromJsonChunks('dummy', tableChunks['dummy'], this.db, this.cnn, this.fileNames);
            // await insertFromJsonChunks('relation', tableChunks['relation'], this.db, this.cnn, this.fileNames);
            // await insertFromJsonChunks('graphic', tableChunks['graphic'], this.db);
            // await insertFromJsonChunks('geometry', tableChunks['geometry'], this.db);
            // await insertFromJsonChunks('material', tableChunks['material'], this.db);

            // 插入到scene_texture共享纹理表
            // TBD: 暂时无数据


            // 插入到scene_dummy虚拟元素表
            // TODO: 需要做，但暂时无

            // 关闭数据库连接
            // this.db.close(); // ?????????????????????????????????? 切换到空数据库以解锁
            // console.log('siteInfo', this.siteCoord)
            // 使用时间戳命名临时数据库，防止可能的连接冲突
            await this.cnn.query(`CHECKPOINT "${memoryDbName}"`)
            // await this.cnn.query(`ATTACH ':memory:' as ${memoryDbName}`);
            // await this.cnn.query(`USE ${memoryDbName}`);
            if (this.cnn) await this.cnn.close();
            const opfsRoot = await navigator.storage.getDirectory();
            // Get handle to the .db file
            const fileHandle =  await opfsRoot.getFileHandle(`${memoryDbName}.db`, {create: false});
            return await fileHandle.getFile();
        } catch (error) {
            console.error('创建数据库时出错：', error);
        } finally {
            this.fileNames.forEach((item:string) => {
                this.db.dropFile(item)
            });
            if (this.db) await this.db.terminate();
        }
        return false
    }

}


// 将原有的函数拆分为两个，一个writeToJson专门写数据到json文件，一个insertJsonDataToTable专门对数据进行导入
function chunkJson<T>(objects: T[], maxSize: number = 31457280): string[] {
    let chunks: string[] = [];
    let tempList: T[] = [];
    let currentSize: number = 0;
    const encoder = new TextEncoder();

    // 自定义 replacer 函数来处理 BigInt
    const replacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    };

    for (const obj of objects) {
        const tempStr = JSON.stringify(obj, replacer);
        const tempBytes = encoder.encode(tempStr).length;
        if (currentSize + tempBytes > maxSize && tempList.length > 0) {
            chunks.push(JSON.stringify(tempList, replacer));
            tempList = [];
            currentSize = 0;
        }
        tempList.push(obj);
        currentSize += tempBytes;
    }
    if (tempList.length > 0) {
        chunks.push(JSON.stringify(tempList, replacer));
    }
    return chunks;
}

async function insertFromJsonChunks(tableName: string, chunks: string[], db: any, cnn:any, fileNames: any): Promise<number> {
    for (let i = 0; i < chunks.length; i++) {
        console.log('chunks[i]', chunks[i]);
        const fileName = `temp_${tableName}_${i}.json`;
        fileNames.push(fileName);
        await db.registerFileText(fileName, chunks[i]);
        const query = `INSERT INTO scene_${tableName} FROM (SELECT * FROM read_json_auto('${fileName}', maximum_object_size = 167772160));`
        console.log('DB1:', db, query);
        try {
            const prepared = await cnn.prepare(query);
            await prepared.send();
            // await cnn.query(query);
            console.log('Inserted data from json chunk to table Successfully!');
        } catch (error) {
            console.error('Failed to insert data from json chunk to table!', error, fileName, tableName);
        // } finally {
        //     await db.dropFile(fileName);
        }
    
    }
    return 1;
}


// 产生随机uuid
const _lut = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff'];
function generateUUID() {

    const d0 = Math.random() * 0xffffffff | 0;
    const d1 = Math.random() * 0xffffffff | 0;
    const d2 = Math.random() * 0xffffffff | 0;
    const d3 = Math.random() * 0xffffffff | 0;
    const uuid = _lut[d0 & 0xff] + _lut[d0 >> 8 & 0xff] + _lut[d0 >> 16 & 0xff] + _lut[d0 >> 24 & 0xff] + '-' +
        _lut[d1 & 0xff] + _lut[d1 >> 8 & 0xff] + '-' + _lut[d1 >> 16 & 0x0f | 0x40] + _lut[d1 >> 24 & 0xff] + '-' +
        _lut[d2 & 0x3f | 0x80] + _lut[d2 >> 8 & 0xff] + '-' + _lut[d2 >> 16 & 0xff] + _lut[d2 >> 24 & 0xff] +
        _lut[d3 & 0xff] + _lut[d3 >> 8 & 0xff] + _lut[d3 >> 16 & 0xff] + _lut[d3 >> 24 & 0xff];

    // .toLowerCase() here flattens concatenated strings to save heap memory space.
    return uuid.toLowerCase();
}




// 将数据插入到scene_base表中
async function insertIntoSceneBase(
    cnn: any,
    guid: string,
    modelName: string,
    modelType: string,
    locationEPSG: number,
    locationX: number,
    locationY: number,
    locationZ: number,
    locationAngle: number | null,
    createTime: number,
    createVersion: string
): Promise<void> {
    const insertQuery = `
        INSERT INTO scene_base (guid, model_name, model_type, location_epsg, location_x, location_y, location_z, location_angle, create_time, create_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    // console.log(guid, modelName, modelType, locationEPSG, locationX, locationY, locationZ, createTime, createVersion);
    try {
        // Using prepared statement for safety and performance
        const prepared = await cnn.prepare(insertQuery);
        await prepared.send(guid, modelName, modelType, locationEPSG, locationX, locationY, locationZ, locationAngle, createTime, createVersion);
        console.log("scene_base表数据写入成功。");
    } catch (error) {
        console.error("scene_base表数据写入失败！", error);
    }
}

const typeMapping: { [key: string]: string } = {
    IfcText: 'VARCHAR',
    IFCTEXT: 'VARCHAR',
    IfcLabel: 'VARCHAR',
    IFCLABEL: 'VARCHAR',
    IfcIdentifier: 'VARCHAR',
    IFCIDENTIFIER: 'VARCHAR',
    IfcURIReference: 'VARCHAR',
    IFCURIREFERENCE: 'VARCHAR',
    IfcReal: 'REAL',
    IFCREAL: 'REAL',
    IfcLogical: 'VARCHAR',
    IFCLOGICAL: 'VARCHAR',
    IfcInteger: 'INT',
    IFCINTEGER: 'INT',
    IfcDate: 'DATE',
    IFCDATE: 'DATE',
    IfcTimeStamp: 'INT',
    IFCTIMESTAMP: 'INT',
    IfcBoolean: 'BOOLEAN',
    IFCBOOLEAN: 'BOOLEAN',
    IfcDateTime: 'TIME',
    IFCDATETIME: 'TIME',
    IfcComplexNumber: 'ARRAY',
    IFCCOMPLEXNUMBER: 'ARRAY',
    IfcDuration: 'REAL',
    IFCDURATION: 'REAL',
    // Ifc.+Measure: 'REAL', // 这个将在下面的函数中处理
};
function updateAttValueType(attValueType: string): string {
    // 检查是否直接匹配映射关系
    if (typeMapping[attValueType]) {
        return typeMapping[attValueType];
    }
    // 检查是否符合 Ifc.+Measure 的正则表达式
    else if (/Ifc.+Measure/.test(attValueType) || /IFC.+MEASURE/.test(attValueType)) {
        return 'REAL';
    }
    // 如果都不匹配，返回原值
    return attValueType;
}

async function insertElementsProps(parser: any, allElementsPropsIdMap: { [key: string]: number[] }, elementPsets: { [key: number]: Set<string> }): Promise<any[]> {
    const results: any[] = [];
    let index = 1;

    // allElementsPropsIdMap主要包含了属性集和构件的关系
    for (const [psetId, entityIds] of Object.entries(allElementsPropsIdMap)) {
        // console.log(`PropertySetId: ${psetId}, EntityId: ${entityIds}`);
        const psetsId = Number(psetId);
        const propertySet = await parser.getLineById(psetsId);
        // const propertySet = ifcapi.GetLine(modelId, keyAsNumber);
        // console.log('PropertySet:', propertySet.Name.value, propertySet.HasProperties, entityIds);
        if(propertySet.HasProperties == undefined){
            continue;
        }
        for ( const propertyId of propertySet.HasProperties) {
            const psetSingleValue = await parser.getLineById(propertyId.value);

            // 对每个属性集合中的元素ID进行进一步处理
            for (const entityId of entityIds) {
                if(elementPsets[entityId]){
                    elementPsets[entityId].add(propertySet.Name.value);
                }else{
                    elementPsets[entityId] = new Set([propertySet.Name.value]);
                }
                const entity = await parser.getLineById(entityId);
                if (entity.GlobalId && entity.GlobalId.value) {
                    let attValue = psetSingleValue.NominalValue?.value ?? null;
                    // TODO 先注释掉，后续再处理
                    // if (attValue === 'F') {
                    //     attValue = '否';
                    // } else if (attValue === 'T') {
                    //     attValue = '是';
                    // }



                    // 默认类型为IFCTEXT
                    let attValueType = psetSingleValue.NominalValue?.name ?? 'IFCTEXT';
                    // IFCLOGICAL(.T.)得到的 psetSingleValue.NominalValue?.value 为 1  ，IFCLOGICAL(.F.)得到的 psetSingleValue.NominalValue?.value 为 0 ，IFCLOGICAL(*（其他任意值）)得到的 psetSingleValue.NominalValue?.value 为 2
                    if (attValueType.toUpperCase() === 'IFCLOGICAL') {
                        if (attValue === 0) {
                            attValue = '否';
                        } else if (attValue === 1) {
                            attValue = '是';
                        } else {
                            attValue = '未知';
                        }
                    }
                    const updatedAttValueType = updateAttValueType(attValueType);

                    results.push({
                        "id": index,
                        "guid": formatGuid(entity.GlobalId.value),
                        "attribute_code": null,
                        "attribute_kind": '通用',
                        "attribute_group": propertySet.Name?.value ?? null,
                        "attribute_key": psetSingleValue.Name?.value ?? null,
                        "attribute_name": psetSingleValue.Name?.value ?? null,
                        // 统一转为字符串（避免sql方法read_json_auto遇到非字符串类型时对值类型进行转换时原字符串类型会多次一对""），实际类型通过 value_type 字段来区分
                        "attribute_value": attValue !== null ? String(attValue) : attValue,
                        "value_type": updatedAttValueType,
                        // TODO psetSingleValue.Unit 这个地方不一定标识实际计量单位，先默认为null
                        // "value_unit": psetSingleValue.Unit ?? null
                        "value_unit": null
                    });
                    index++;

                }
            }
        }
    }
    return results;
}

async function appendDefindsByTypeProps(parser: any, existProprs: any[], elementPsets: { [key: number]: Set<string> }): Promise<void> {

    let index = existProprs.length + 1;
    // allElementsPropsIdMap主要包含了属性集和构件的关系
    for (const [psetId, entityIds] of Object.entries(parser.defindsByTypePropsIdMap)) {
        const psetsId = Number(psetId);
        const propertySet = await parser.getLineById(psetsId);

        if(propertySet.HasProperties == undefined){
            continue;
        }
        for (const entityId of entityIds) {
            const entity = await parser.getLineById(entityId);
            if (entity.GlobalId && entity.GlobalId.value) {

                // 去重
                if (elementPsets[entityId] && elementPsets[entityId].has(propertySet.Name.value)) {
                    continue;
                }

                for (const propertyId of propertySet.HasProperties) {
                    const psetSingleValue = await parser.getLineById(propertyId.value);

                    let attValue = psetSingleValue.NominalValue?.value ?? null;
                    let attValueType = psetSingleValue.NominalValue?.name ?? 'IFCTEXT';
                    if (attValueType.toUpperCase() === 'IFCLOGICAL') {
                        if (attValue === 0) {
                            attValue = '否';
                        } else if (attValue === 1) {
                            attValue = '是';
                        } else {
                            attValue = '未知';
                        }
                    }
                    const updatedAttValueType = updateAttValueType(attValueType);

                    existProprs.push({
                        "id": index,
                        "guid": formatGuid(entity.GlobalId.value),
                        "attribute_code": null,
                        "attribute_kind": '通用',
                        "attribute_group": propertySet.Name?.value ?? null,
                        "attribute_key": psetSingleValue.Name?.value ?? null,
                        "attribute_name": psetSingleValue.Name?.value ?? null,
                        // 统一转为字符串（避免sql方法read_json_auto遇到非字符串类型时对值类型进行转换时原字符串类型会多次一对""），实际类型通过 value_type 字段来区分
                        "attribute_value": attValue !== null ? String(attValue) : attValue,
                        "value_type": updatedAttValueType,
                        "value_unit": null
                    });
                    index++;
                }
            }
        }

    }
    return ;
}

async function appendRelProps(parser: any, existProprs: any[]): Promise<void> {
    let index = existProprs.length + 1;
    const merged: {[key:string]: any[]} = {}
    for (const item of Object.values(parser.relationElements)){
        const key = item.relating_object + "|" + item.rel_type;
        if (merged[key]){
            merged[key] = merged[key].concat(item.related_objects);
        } else {
            merged[key] = item.related_objects;
        }
    }
    for (const [key, value] of Object.entries(merged)){
        const [relating_object, rel_type] = key.split("|");
        existProprs.push({
            "id": index,
            "guid": relating_object,
            "attribute_code": null,
            "attribute_kind": '关系',
            "attribute_group": RelationElementInfo[rel_type]?.parentName ?? null,
            "attribute_key": rel_type,
            "attribute_name": RelationElementInfo[rel_type]?.name ?? rel_type,
            "attribute_value": value.join(','),
            "value_type": value.length > 1? 'LIST' : 'VARCHAR',
            "value_unit": null
        });
        index++;
    }
    return ;
}

async function appendClassficationProps(parser: any, existProprs: any[]): Promise<void>{
    let index = existProprs.length + 1;
    for(const lineId of parser.classficationLines){
        const line = await parser.getLineById(lineId);
        const entityIds = line.RelatedObjects;
        const classification = await parser.getLineById(line.RelatingClassification.value);
        if(classification.Identification){
            for(const entityId of entityIds){
                const entity = await parser.getLineById(entityId.value);
                if(entity.GlobalId){
                    existProprs.push({
                        "id": index,
                        "guid": formatGuid(entity.GlobalId.value),
                        "attribute_code": null,
                        "attribute_kind": '分类',
                        "attribute_group": 'Pset_RelAssociatesClassification',
                        "attribute_key": 'ClassificationReferenceIdentification',
                        "attribute_name": '分类编码',
                        "attribute_value": classification.Identification.value ?? null,
                        "value_type": 'VARCHAR',
                        "value_unit": null
                    })
                    index++;
                    existProprs.push({
                        "id": index,
                        "guid": formatGuid(entity.GlobalId.value),
                        "attribute_code": null,
                        "attribute_kind": '分类',
                        "attribute_group": 'Pset_RelAssociatesClassification',
                        "attribute_key": 'ClassificationReferenceName',
                        "attribute_name": '分类名称',
                        "attribute_value": classification.Name? classification.Name.value : null,
                        "value_type": 'VARCHAR',
                        "value_unit": null
                    })
                    index++;
                }
            }
        }

    }
    return ;
}


// 插入数据到scene_graphic、scene_geometry和scene_material表中
async function insertGraphicGeometryMaterial(parser: any, db: any, exportMeshesMap: { [key: number]: any[] }): Promise<{ graphic: any[], geometry: any[], material: any[] }> {
    console.log(`包含几何的构件个数: ${Object.keys(exportMeshesMap).length}`);
    const graphicData: any[] = [];
    const geometryData: any[] = [];
    const materialData: any[] = [];

    // expressID是构件的实体id值，meshes是该构件下的所有几何mesh数据
    for (const [expressID, meshes] of Object.entries(exportMeshesMap)) {
        // console.log(`Processing express ID ${expressID} with ${meshes.length} meshes`);
        const entity = await parser.getLineById(parseInt(expressID, 10));
        const entityGuid = formatGuid(entity.GlobalId.value); // 获取构件的ISOGUID
        // const meshesIds = [];
        for (const [index, mesh] of meshes.entries()) {
            try {

                const material: any = {
                    "id": materialMaxId + 1,
                    "material_code": materialMaxId,
                    "material_name": `ID${materialMaxId + 1}-material for expressID ${expressID}`,
                    "material_color": [Math.round(mesh.renderMaterial.red * 255),
                    Math.round(mesh.renderMaterial.green * 255),
                    Math.round(mesh.renderMaterial.blue * 255),
                    Math.round(mesh.renderMaterial.opacity * 255)],
                    "material_opacity": mesh.renderMaterial.opacity,
                    "material_gain": null,
                    "with_texture": null
                }
                materialData.push(material);


                const geometry: any = {
                    "id": materialMaxId + 1,
                    "polygon_vertex": mesh.vertices.map((x: number) => isNaN(x) ? 0 : x),
                    "polygon_normal": mesh.normals.map((x: number) => isNaN(x) ? 0 : x),
                    "polygon_facet": mesh.faces,
                    "polygon_uv": null,
                    "brep_param": null,
                    "csg_param": null,
                    "with_material": Array.from({ length: Math.floor(mesh.faces.length / 3) }, () => (materialMaxId + 1))
                }
                geometryData.push(geometry);

                materialMaxId++;

            } catch (error) {
                console.error(`Error processing mesh ${index + 1} for expressID ${expressID}:`, error);
            }
        }

        const geometryIndexList = Array.from({ length: meshes.length }, (_, i) => geometryMaxId + i + 1);
        const lastIndex = geometryIndexList.at(-1) ?? 0;
        geometryMaxId = lastIndex;
        const graphic: any = {
            "id": graphicMaxId + 1,
            "guid": entityGuid,
            "obb_center": null,
            "obb_halfsize": null,
            "obb_quaternion": null,
            "with_geometry": geometryIndexList,
            "geometry_transform": null

        }
        graphicMaxId++;
        graphicData.push(graphic);

    }
    return { graphic: graphicData, geometry: geometryData, material: materialData };
}