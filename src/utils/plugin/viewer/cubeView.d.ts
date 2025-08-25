import * as BABYLON from '@babylonjs/core';
export declare class CubeView {
    private scene;
    private cubeElement;
    private camera?;
    private lastAlpha;
    private lastBeta;
    constructor(scene: BABYLON.Scene);
    private rotateCamera;
    private createCubeElement;
}
