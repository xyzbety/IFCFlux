import * as WEBIFC from "web-ifc";
import * as turf from "@turf/turf";
import { primitives, extrusions, geometries } from "@jscad/modeling"
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export class IfcSpaceGen {
    private ifcPath: string | File;
    private ifcAPI: any;
    private modelID: number;
    constructor(ifcPath: string | File) {
        this.ifcPath = ifcPath;
        this.ifcAPI = new WEBIFC.IfcAPI();
    }

    async generateSpaces() {
        console.log("Start Generating Spaces...")
        const startTime = Date.now();
        let spaceMeshs = [];
        await this.ifcAPI.Init();
        let buffer = null;
        if (this.ifcPath instanceof File) {
            // 如果是File对象，读取为ArrayBuffer
            buffer = await this.ifcPath.arrayBuffer();
        }
        if (buffer)
            this.modelID = await this.ifcAPI.OpenModel(new Uint8Array(buffer), {
                COORDINATE_TO_ORIGIN: false
            });;
        console.log("IFC Model Opened, Model ID:", this.modelID);
        const spaceIds = this.ifcAPI.GetLineIDsWithType(this.modelID, WEBIFC.IFCSPACE);
        if (spaceIds.size() > 0) {
            console.log("This IFC File Already Exist IfcSpace Element");
            return spaceMeshs;
        }
        const storeyIds = this.ifcAPI.GetLineIDsWithType(this.modelID, WEBIFC.IFCBUILDINGSTOREY);
        const storeyIds_: number[] = [];
        for (const storeyId of storeyIds) {
            storeyIds_.push(storeyId);
        }
        let subContext = null;
        const subContextIds = this.ifcAPI.GetLineIDsWithType(this.modelID, WEBIFC.IFCGEOMETRICREPRESENTATIONSUBCONTEXT);
        for (const subContextId of subContextIds) {
            const subCtx = this.ifcAPI.GetLine(this.modelID, subContextId);
            if (subCtx.ContextIdentifier.value == "Body") {
                subContext = subCtx;
                break;
            }
        }
        const cartPoint = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCCARTESIANPOINT, [0, 0, 0]);
        const axis2p3d = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCAXIS2PLACEMENT3D, cartPoint, null, null);
        const localPlacement = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCLOCALPLACEMENT, null, axis2p3d);
        const unitScale = this.getUnitScale();
        const relIds = this.ifcAPI.GetLineIDsWithType(this.modelID, WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
        for (const relId of relIds) {
            const rel = this.ifcAPI.GetLine(this.modelID, relId);
            const storeyId = rel["RelatingStructure"].value;
            if (!storeyIds_.includes(storeyId)) {
                continue;
            }
            const storey = this.ifcAPI.GetLine(this.modelID, storeyId);
            const spaces = []
            const wallPolygons = [];
            const roofs = [];
            let minz = Infinity;
            let maxz = -Infinity;
            for (const related of rel["RelatedElements"]) {
                const eleId = related.value;
                const element = this.ifcAPI.GetLine(this.modelID, eleId);
                if (element.type == WEBIFC.IFCWALL || element.type == WEBIFC.IFCWALLSTANDARDCASE || element.type == WEBIFC.IFCSLAB
                    || element.type == WEBIFC.IFCCOLUMN || element.type == WEBIFC.IFCROOF) {
                    const mesh = this.ifcAPI.GetFlatMesh(this.modelID, eleId);
                    const placedGeometries = mesh.geometries;
                    let vertices = [];
                    let indices = [];
                    for (let i = 0; i < placedGeometries.size(); i++) {
                        const placedGeometry = placedGeometries.get(i)
                        const geometry = this.ifcAPI.GetGeometry(this.modelID, placedGeometry.geometryExpressID)
                        const vertexArray = [
                            ...this.ifcAPI.GetVertexArray(
                                geometry.GetVertexData(),
                                geometry.GetVertexDataSize()
                            )
                        ]
                        const indexArray = [
                            ...this.ifcAPI.GetIndexArray(
                                geometry.GetIndexData(),
                                geometry.GetIndexDataSize()
                            )
                        ]
                        for (const index of indexArray) {
                            indices.push(index + vertices.length);
                        }
                        vertices.push(...this.transformVertexData(vertexArray, placedGeometry.flatTransformation))

                    }

                    const coordinates = [];
                    for (let i = 0; i < vertices.length; i += 3) {
                        coordinates.push([vertices[i], vertices[i + 1]]);
                    }
                    const multiPt = turf.multiPoint(coordinates);
                    const bbox = turf.bbox(multiPt);
                    const bboxPolygon = turf.toWgs84(turf.bboxPolygon(bbox));
                    if (element.type == WEBIFC.IFCWALL || element.type == WEBIFC.IFCWALLSTANDARDCASE) {
                        wallPolygons.push(bboxPolygon);
                        for (let i = 2; i < vertices.length; i += 3) {
                            minz = Math.min(minz, vertices[i]);
                            maxz = Math.max(maxz, vertices[i]);
                        }

                    } else if (element.type == WEBIFC.IFCCOLUMN) {
                        wallPolygons.push(bboxPolygon);
                    } else if (element.type == WEBIFC.IFCSLAB || element.type == WEBIFC.IFCROOF) {
                        roofs.push(vertices)
                    }

                }
            }

            for (const vertices of roofs) {
                let roofMinZ = Infinity;
                for (let i = 2; i < vertices.length; i += 3) {
                    roofMinZ = Math.min(roofMinZ, vertices[i]);
                }
                if (roofMinZ > minz && roofMinZ < maxz) {
                    maxz = roofMinZ;
                }
            }

            if (wallPolygons.length == 0)
                continue;

            const closeRegions = this.calculateCloseRegion(wallPolygons);
            for (const region of closeRegions) {
                const points = [];
                const polygonPoints = [];
                for (const coord of region.geometry.coordinates[0]) {
                    const cartPoint = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCCARTESIANPOINT,
                        [coord[0] / unitScale, coord[1] / unitScale, minz / unitScale]);
                    points.push(cartPoint);
                    polygonPoints.push([coord[0], coord[1], minz])
                }
                const polyline = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCPOLYLINE, points);
                const closedProfile = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCARBITRARYCLOSEDPROFILEDEF, "AREA", null, polyline);
                const direction = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCDIRECTION, [0, 0, 1]);
                const solid = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCEXTRUDEDAREASOLID, closedProfile, null, direction, (maxz - minz) / unitScale);
                const shapeRep = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCSHAPEREPRESENTATION, subContext, null, null, [solid]);
                const productDefinitionShape = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCPRODUCTDEFINITIONSHAPE, null, null, [shapeRep]);
                const space = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCSPACE,
                    generateGUID(), null, null, null, null, localPlacement, productDefinitionShape, null, null);
                spaces.push(space);
                this.ifcAPI.WriteLine(this.modelID, space);

                //构造返回数据
                const spacePolygon = primitives.polygon({ points: polygonPoints });
                const spaceGeom = extrusions.extrudeLinear({ height: maxz - minz }, spacePolygon);
                const polygons = geometries.geom3.toPolygons(spaceGeom);
                const meshVertices = [];
                const meshFaces = [];
                let i = 0;
                for (const polygon of polygons) {
                    meshVertices.push(...geometries.poly3.toPoints(polygon));
                    meshFaces.push([i++, i++, i++]);
                }
                const spaceMesh = new IfcSpaceMesh(meshVertices, meshFaces);
                spaceMeshs.push(spaceMesh);
            }
            const containedRel = this.ifcAPI.CreateIfcEntity(this.modelID, WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
                generateGUID(), null, null, null, spaces, storey);
            this.ifcAPI.WriteLine(this.modelID, containedRel);

        }
        const endTime = Date.now();
        console.log("Spaces Generated Done, Cost:", (endTime - startTime) / 1000, "s");
        console.log("模型空间生成成功", spaceMeshs);
        return spaceMeshs;
    }

    async save() {
        // 弹出保存对话框，获取用户选择的路径
        const path = await save({
            filters: [
                {
                    name: '',
                    extensions: ['ifc'],
                },
            ],
        });
        if (!path) {
            console.log("用户取消保存");
            return;
        }
        // 获取要保存的二进制数据
        const data = this.ifcAPI.SaveModel(this.modelID);
        // 写入文件
        await writeFile(path, data);
        console.log("文件已保存到:", path);
        this.ifcAPI.CloseModel(this.modelID);
    }
    private transformVertexData(vertexData: number[], matrix: number[]) {
        const vertices = []
        const normals = []
        let isNormalData = false
        for (let i = 0; i < vertexData.length; i++) {
            isNormalData ? normals.push(vertexData[i]) : vertices.push(vertexData[i])
            if ((i + 1) % 3 === 0) isNormalData = !isNormalData
        }

        // apply the transform
        for (let k = 0; k < vertices.length; k += 3) {
            const x: number = vertices[k],
                y: number = vertices[k + 1],
                z: number = vertices[k + 2]
            vertices[k] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
            vertices[k + 1] = (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) * -1
            vertices[k + 2] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]
        }

        return vertices
    }

    private calculateCloseRegion(wallPolygons: any[]) {
        let result = [];
        const collection = turf.featureCollection(wallPolygons);
        const bbox = turf.bbox(collection);
        const bboxPolygon = turf.bboxPolygon(bbox);
        let unionPolygon = turf.buffer(wallPolygons[0], 0.03, { units: 'meters' });
        for (let i = 1; i < wallPolygons.length; i++) {
            const polygon = turf.buffer(wallPolygons[i], 0.03, { units: 'meters' });
            try {
                unionPolygon = turf.union(turf.featureCollection([unionPolygon, polygon]));
            } catch (e) { }
        }
        const difference = turf.difference(turf.featureCollection([bboxPolygon, unionPolygon]));
        if (difference == null)
            return result;

        let geoms = [];
        if (difference.geometry.type == "Polygon") {
            geoms.push(turf.polygon(difference.geometry.coordinates));
        } else if (difference.geometry.type == "MultiPolygon") {
            for (const coords of difference.geometry.coordinates) {
                geoms.push(turf.polygon(coords));
            }
        }

        const outLine = turf.polygonToLine(bboxPolygon);
        for (const geom of geoms) {
            if (outLine.type == "Feature" && turf.booleanDisjoint(outLine, geom))
                result.push(turf.toMercator(geom));
        }
        return result;
    }

    private getUnitScale(): number {
        const unitAssigns = this.ifcAPI.GetLineIDsWithType(this.modelID, WEBIFC.IFCUNITASSIGNMENT);
        if (unitAssigns == null || unitAssigns.length == 0) return 1;
        const unitAssign = this.ifcAPI.GetLine(this.modelID, unitAssigns.get(0));
        for (const unitId of unitAssign.Units) {
            const unit = this.ifcAPI.GetLine(this.modelID, unitId.value);
            if (unit.UnitType.value == "LENGTHUNIT") {
                if (unit.Prefix != null && unit.Prefix.value == "MILLI") {
                    return 0.001;
                } else if (unit.Prefix != null && unit.Prefix.value == "CENTI") {
                    return 0.01;
                } else if (unit.Prefix != null && unit.Prefix.value == "DECI") {
                    return 0.1;
                } else {
                    return 1;
                }
            }
        }
        return 1;
    }

}


function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
function UUID2GUID(uuid: string): string {
    const g = uuid.replace(/-/g, '');
    const bs = Array.from({ length: g.length / 2 }, (_, i) => parseInt(g.slice(i * 2, i * 2 + 2), 16));

    function b64(v: number, l: number = 4): string {
        return Array.from({ length: l }, (_, i) => chars[Math.floor(v / Math.pow(64, i)) % 64]).reverse().join('');
    }

    return b64(bs[0], 2) + bs.slice(1).reduce((acc, _, i, arr) =>
        i % 3 === 0 ? acc + b64((arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2]) : acc, '');
}

function generateGUID(): string {
    return UUID2GUID(generateUUID());
}

export class IfcSpaceMesh {
    private vertexData: number[];
    private faceData: number[];

    constructor(vertexData: number[], faceData: number[]) {
        this.vertexData = vertexData;
        this.faceData = faceData;
    }
}
