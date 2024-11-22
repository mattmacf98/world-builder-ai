import { WorldBuilder } from "../WorldBuilder";

export interface IEngineActionDecorator {
    setObjectPosition(objectIndex: number, position: [number, number, number]): void;
    setObjectScale(objectIndex: number, scale: [number, number, number]): void;
}

export class LogDecorator implements IEngineActionDecorator {
    setObjectPosition(objectIndex: number, position: [number, number, number]): void {
        console.log(`Set object ${objectIndex} position to ${position}`);
    }

    setObjectScale(objectIndex: number, scale: [number, number, number]): void {
        console.log(`Set object ${objectIndex} scale to ${scale}`);
    }
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

    setObjectScale(objectIndex: number, scale: [number, number, number]): void {
        console.log(`Set object ${objectIndex} scale to ${scale}`);
        this._worldBuilder.selectMesh(objectIndex);
        this._worldBuilder.setScaleX(scale[0]);
        this._worldBuilder.setScaleY(scale[1]);
        this._worldBuilder.setScaleZ(scale[2]);
    }
}