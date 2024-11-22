import { AbstractMesh, Color3, PBRMaterial, PointerEventTypes, SceneLoader } from "@babylonjs/core";
import { GizmoManager, Scene, MeshBuilder } from "@babylonjs/core";
import { IGLTFX, IReferencedAsset, INode } from "./glTFx/IGLTFX";
import { GLTFXLoader } from "./glTFx/glTFXLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

export enum ObjectType { 
    Sphere = 'sphere',
    Box = 'box',
}

export class WorldBuilder {
    private _scene: Scene;
    private _worldAssets: IReferencedAsset[];
    private _worldNodes: INode[];
    private _worldExtensionsUsed: Set<string>;
    private _worldExtensionsRequired: Set<string>;
    private _gizmoManager: GizmoManager;
    private _selectedMesh: AbstractMesh | null;
    private _selectedNodeIndex: number;
  
    constructor(scene: Scene) {
      this._scene = scene;
      this._worldAssets = [];
      this._worldNodes = [];
      this._worldExtensionsUsed = new Set<string>();
      this._worldExtensionsRequired = new Set<string>();
      this._gizmoManager = new GizmoManager(scene);
      this._selectedMesh = null;
      this._selectedNodeIndex = -1;
      this._gizmoManager.positionGizmoEnabled = true;
      this._gizmoManager.rotationGizmoEnabled = false;
      this._gizmoManager.scaleGizmoEnabled = false;
      this._gizmoManager.attachableMeshes = [];
  
      this._scene.onPointerObservable.add((event) => {
        if (event.type !== PointerEventTypes.POINTERDOWN) { return }
  
        const mesh = event.pickInfo?.pickedMesh;
        if (!mesh) {
          this._gizmoManager.attachToMesh(null);
          this._selectedMesh = null;
          return;
        } 
  
        let currentMesh: AbstractMesh | null = mesh;
        let attachableMesh: AbstractMesh | null = null;
  
        while (currentMesh) {
          if (this._gizmoManager.attachableMeshes?.includes(currentMesh)) {
            attachableMesh = currentMesh;
            break;
          }
          currentMesh = currentMesh.parent as AbstractMesh;
        }
  
        if (attachableMesh) {
          this._gizmoManager.attachToMesh(attachableMesh);
          this._selectedMesh = attachableMesh;
        } else {
          this._gizmoManager.attachToMesh(null);
          this._selectedMesh = null;
        }
      });
    }
  
    async loadGLTFX(gltfx: IGLTFX) {
      this._worldAssets.forEach(asset => asset.mesh?.dispose());
      const glTFxLoader = new GLTFXLoader();
      await glTFxLoader.loadAsync(this._scene, gltfx, "", undefined, undefined);
  
      const worldAssets = [];
      const loadedMeshes = this._scene.transformNodes[0]!.getChildren();
      for (let i = 0; i < loadedMeshes.length; i++) {
        const mesh = loadedMeshes[i] as AbstractMesh;
        const asset = gltfx.assets[i];
        worldAssets.push({ name: asset.name, uri: asset.uri, mesh: mesh, extensions: asset.extensions });
      }
      this._worldAssets = worldAssets;
      this._worldNodes = gltfx.nodes;
      this._worldExtensionsUsed = new Set(gltfx.extensionsUsed);
      this._worldExtensionsRequired = new Set(gltfx.extensionsRequired);
  
      this._gizmoManager.attachableMeshes = this._worldAssets.map(asset => asset.mesh!);
    }
  
    getGlTFX() {
      const gltfx: IGLTFX = {
        assets: [],
        nodes: [],
        extensionsUsed: Array.from(this._worldExtensionsUsed),
        extensionsRequired: Array.from(this._worldExtensionsRequired),
      };
  
      const assetToAssetMap = new Map<String, number>();
      let numAssets = 0;
      for (let i = 0; i < this._worldAssets.length; i++) {
        const asset = this._worldAssets[i];
        const assetHash = JSON.stringify({
          name: asset.name,
          uri: asset.uri,
          extensions: asset.extensions
        });
        if (!assetToAssetMap.has(assetHash)) {
          assetToAssetMap.set(assetHash, numAssets);
          numAssets++;
          gltfx.assets.push({name: asset.name, uri: asset.uri, extensions: asset.extensions});
        }
      }
  
      for (const node of this._worldNodes) {
        const asset = this._worldAssets[node.asset!];
        const assetHash = JSON.stringify({
          name: asset.name,
          uri: asset.uri,
          extensions: asset.extensions
        });
        const assetIndex = assetToAssetMap.get(assetHash);
        const quaternion =  asset.mesh!.rotationQuaternion ?? asset.mesh!.rotation.toQuaternion();
        gltfx.nodes.push({
          name: node.name,
          asset: assetIndex,
          translation: [asset.mesh!.position.x, asset.mesh!.position.y, asset.mesh!.position.z],
          rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
          scale: [asset.mesh!.scaling.x, asset.mesh!.scaling.y, asset.mesh!.scaling.z]
        });
      }
  
      return gltfx;
    }
  
    get worldNodes() {
      return this._worldNodes;
    }
  
    async loadGLBModel(file: File) {
      try {
        const container = await SceneLoader.LoadAssetContainerAsync("file:", file, this._scene);
        container.addAllToScene();
        if (container.meshes[0]) {
          this._gizmoManager.attachableMeshes?.push(container.meshes[0]);
          this._worldAssets.push({ name: file.name, uri: file.name, mesh: container.meshes[0]});
          this._worldNodes.push({ name: file.name, asset: this._worldAssets.length - 1, translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
        }
      } catch (error) {
        console.error("Error loading GLB file:", error);
      }
    }
  
    setGizmoMode(key: string) {
      if (!this._selectedMesh) return;
    
      // Disable all gizmos first
      this._gizmoManager.positionGizmoEnabled = false;
      this._gizmoManager.rotationGizmoEnabled = false;
      this._gizmoManager.scaleGizmoEnabled = false;
    
      // Enable the appropriate gizmo based on key
      switch (key.toLowerCase()) {
        case 't':
          this._gizmoManager.positionGizmoEnabled = true;
          break;
        case 'r':
          this._gizmoManager.rotationGizmoEnabled = true;
          break;
        case 's':
          this._gizmoManager.scaleGizmoEnabled = true;
          break;
      }
    }
  
    get selectedMesh() {
      return this._selectedMesh;
    }
  
    selectMesh(index: number) {
      if (index < 0 || index >= this._worldNodes.length) return;
      this._selectedMesh = this._worldAssets[this._worldNodes[index].asset!].mesh!;
      this._gizmoManager.attachToMesh(this._selectedMesh);
    }
  
    setTranslateX(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.x = amount;
    }
  
    setTranslateY(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.y = amount;
    } 
  
    setTranslateZ(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.z = amount;
    }

    setScaleX(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.x = amount;
    }

    setScaleY(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.y = amount;
    }

    setScaleZ(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.z = amount;
    }
  
    translateX(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.x += amount;
    }
  
    translateY(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.y += amount;
    }
  
    translateZ(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.position.z += amount;
    }
  
    rotateX(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.rotation.x += amount * Math.PI / 180;
    }
  
    rotateY(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.rotation.y += amount * Math.PI / 180;
    }
  
    rotateZ(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.rotation.z += amount * Math.PI / 180;
    }
  
    scaleX(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.x *= amount;
    }
  
    scaleY(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.y *= amount;
    }
  
    scaleZ(amount: number) {
      if (!this._selectedMesh) return;
      this._selectedMesh.scaling.z *= amount;
    }
  
    deleteSelectedObject() {
      if (this._selectedMesh) {
        this._gizmoManager.attachToMesh(null);
        this._worldNodes.splice(this._selectedNodeIndex, 1);
        this._selectedMesh.dispose();
        this._selectedMesh = null;
        this._selectedNodeIndex = -1;
      }
    }
  
    addObject(type: ObjectType) {
      switch (type) {
        case ObjectType.Box:
          const box = MeshBuilder.CreateBox('box', { size: 1 }, this._scene);
          this._gizmoManager.attachableMeshes?.push(box);
          this._worldAssets.push({ name: box.name, mesh: box, extensions: { WRLD_parametrized_asset: { type: "box" } } });
          this._worldNodes.push({ name: box.name, asset: this._worldAssets.length - 1, translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
          this._worldExtensionsUsed.add("WRLD_parametrized_asset");
          this._worldExtensionsRequired.add("WRLD_parametrized_asset");
          break;
        case ObjectType.Sphere:
          const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 1 }, this._scene);
          this._gizmoManager.attachableMeshes?.push(sphere);
          this._worldAssets.push({ name: sphere.name, mesh: sphere, extensions: { WRLD_parametrized_asset: { type: "sphere" } } });
          this._worldNodes.push({ name: sphere.name, asset: this._worldAssets.length - 1, translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
          this._worldExtensionsUsed.add("WRLD_parametrized_asset");
          this._worldExtensionsRequired.add("WRLD_parametrized_asset");
          break;
      }
    }
  }