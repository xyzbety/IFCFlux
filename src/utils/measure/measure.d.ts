import * as BABYLON from "@babylonjs/core";
type IMeasureType = 'distance' | 'triangle' | 'area' | 'angle';
export declare class Measure {
    private markSize;
    private scene;
    private points;
    private line?;
    private tempLine?;
    private pointMarkers;
    private _pointerObservable;
    private startPoint?;
    private rectangleMesh?;
    lineDistance: number;
    lineColor: BABYLON.Color4;
    measureType: IMeasureType;
    area: number;
    angle: number;
    constructor(scene: BABYLON.Scene, type: IMeasureType, markSize?: number);
    setLineColor(color: BABYLON.Color4): void;
    createMeasureLine(point: BABYLON.Vector3): void;
    createMeasureLineToMouse(point: BABYLON.Vector3): void;
    private createMeasureRectangle;
    private getNormalByFace;
    private createMeasureAngleLine;
    addObserver(): void;
    createMarker(point: BABYLON.Vector3): void;
    destroy(): void;
}
export {};
