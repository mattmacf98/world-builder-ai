import { WorldBuilder } from "../WorldBuilder";

export interface IEngineActionDecorator {
    setObjectPosition(objectIndex: number, position: [number, number, number]): void;
    setObjectScale(objectIndex: number, scale: [number, number, number]): void;
    setObjectRotation(objectIndex: number, rotation: [number, number, number, number]): void;
    getObjectPosition(objectIndex: number): [number, number, number];
    getObjectScale(objectIndex: number): [number, number, number];
    getObjectRotation(objectIndex: number): [number, number, number, number];
    getObjectBoundingBox(objectIndex: number): { max: [number, number, number], min: [number, number, number] };
}

export class BabylonDecorator implements IEngineActionDecorator {
    private _worldBuilder: WorldBuilder;

    constructor(worldBuilder: WorldBuilder) {
        this._worldBuilder = worldBuilder;
    }

    setObjectPosition(objectIndex: number, position: [number, number, number]): void {
        console.log(`Set object ${objectIndex} position to ${position}`);
        this._worldBuilder.selectMesh(objectIndex);
        this._worldBuilder.setTranslateX(position[0]);
        this._worldBuilder.setTranslateY(position[1]);
        this._worldBuilder.setTranslateZ(position[2]);
    }

    setObjectRotation(objectIndex: number, rotation: [number, number, number, number]): void {
        console.log(`Set object ${objectIndex} rotation to ${rotation}`);
        this._worldBuilder.selectMesh(objectIndex);
        this._worldBuilder.setRotation(rotation);
    }

    setObjectScale(objectIndex: number, scale: [number, number, number]): void {
        console.log(`Set object ${objectIndex} scale to ${scale}`);
        this._worldBuilder.selectMesh(objectIndex);
        this._worldBuilder.setScaleX(scale[0]);
        this._worldBuilder.setScaleY(scale[1]);
        this._worldBuilder.setScaleZ(scale[2]);
    }

    getObjectPosition(objectIndex: number): [number, number, number] {
        const mesh = this._worldBuilder.getMesh(objectIndex);
        return [mesh.position.x, mesh.position.y, mesh.position.z];
    }

    getObjectRotation(objectIndex: number): [number, number, number, number] {
        const mesh = this._worldBuilder.getMesh(objectIndex);
        return [mesh.rotationQuaternion?.w ?? 1, mesh.rotationQuaternion?.x ?? 0 , mesh.rotationQuaternion?.y ?? 0, mesh.rotationQuaternion?.z ?? 0];
    }

    getObjectScale(objectIndex: number): [number, number, number] {
        const mesh = this._worldBuilder.getMesh(objectIndex);
        return [mesh.scaling.x, mesh.scaling.y, mesh.scaling.z];
    }

    getObjectBoundingBox(objectIndex: number): { max: [number, number, number], min: [number, number, number] } {
        const mesh = this._worldBuilder.getMesh(objectIndex);
        const boundingBox = mesh.getBoundingInfo().boundingBox;

        return {
            max: [boundingBox.maximum.x, boundingBox.maximum.y, boundingBox.maximum.z],
            min: [boundingBox.minimum.x, boundingBox.minimum.y, boundingBox.minimum.z]
        };
    }
}