import WebIFC from 'web-ifc'

export interface IFCParserProps {
  // serverApi: WebIFC.IfcAPI
  fileId: string
}

export interface IGeometryReference {
  speckle_type: 'reference',
  referencedId: string
}

export type IGeometryReferences = { [key: number]: IGeometryReference[] }

export interface IMaterial {
  id?: string
  red: number,
  green: number,
  blue: number,
  diffuse: number,
  opacity: number
  metalness: number,
  roughness: number,
  speckle_type: 'Objects.Other.RenderMaterial'
}

export type SpeckleMeshes = Array<ISpeckleMesh>

export interface ISpeckleMesh {
  id?: string,
  speckle_type: 'Objects.Geometry.Mesh',
  units: 'm',
  volume: 0,
  area: 0,
  vertices: any[],
  normals: any[],
  faces: any[],
  renderMaterial: WebIFC.Color | null
}

export interface INode {
  id?: string
  fileId?: string
  speckle_type: string
  expressID: number
  type: string
  elements: any[]
  properties?: any[] | null
  closure: string[]
  "@displayValue"?: IGeometryReference[]
  closureLen?: number
  __closure?: any
}

export type IChunk = { [key: string]: Array<number> }