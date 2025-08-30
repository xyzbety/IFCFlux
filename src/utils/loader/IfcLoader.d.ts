import * as BABYLON from '@babylonjs/core';
import * as WEBIFC from 'web-ifc';

declare module '../utils/loader/IfcLoader.js' {
  export class IfcLoader {
    constructor(url: string | File, scene: BABYLON.Scene);
    ifcApi: WEBIFC.IfcAPI;
    modelID: number | null;
    ifcTree: any; // You might want to define a more specific type for the IFC tree
    load(): Promise<void>;
  }
}