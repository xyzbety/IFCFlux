import * as BABYLON from '@babylonjs/core'

export class IfcExplosion {

  public scene: BABYLON.Scene;
  public factor: number = 1.3

  private modelDict: Map<string, object> = new Map()

  // private ifcTree: any;

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  public bom(axis: BABYLON.Vector3) {
    const rootMesh = this.scene.meshes[0]
    // 修改遍历子 mesh 的方式
    rootMesh.getChildren().forEach(child => {
      const mesh = child as BABYLON.AbstractMesh;
      let boxCenter: BABYLON.Vector3;
      let boxPosition: BABYLON.Vector3;
      if (!this.modelDict[mesh.id]) {
        const { min, max } = mesh.getHierarchyBoundingVectors();
        boxCenter = min.add(max).scale(0.5);
        this.modelDict[mesh.id] = {
          boxCenter: boxCenter.clone(),
          boxPosition: mesh.position.clone(), // clone!
        };
      }
      boxCenter = this.modelDict[mesh.id]['boxCenter']
      boxPosition = this.modelDict[mesh.id]['boxPosition']
      // 每次都用初始位置和boxCenter重新计算
      mesh.position.x = boxPosition.x + boxCenter.x * axis.x;
      mesh.position.y = boxPosition.y + boxCenter.y * axis.y;
      mesh.position.z = boxPosition.z + boxCenter.z * axis.z;
    });
  }

  // ifc独有按楼层爆炸
  private boming(children: any[], distance: number) {
    children.forEach((item: any) => {
      const mesh = this.getMeshByExpressId(item.expressId)
      if (mesh) {
        mesh.position.y += distance
      }
      if (item.children.length > 0) {
        this.boming(item.children, distance)
      }
    })
  }

  // 查询mesh的expressId
  private getMeshByExpressId(expressId: string) {
    return this.scene.meshes.find((mesh: BABYLON.AbstractMesh) => {
      return mesh.id === expressId
    })
  }

  public destroy() {
    const rootMesh = this.scene.meshes[0]
    rootMesh.getChildren().forEach(child => {
      const mesh = child as BABYLON.AbstractMesh;
      const boxPosition = this.modelDict[mesh.id]
      if (boxPosition) {
        mesh.position = boxPosition['boxPosition']
      }
    })
    this.modelDict = {};
  }

}