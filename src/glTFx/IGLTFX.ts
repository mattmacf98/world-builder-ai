import { AbstractMesh } from "@babylonjs/core";

export interface IProperty {
    /**
     * Dictionary object with extension-specific objects
     */
    extensions?: {
        [key: string]: any;
    };
    /**
     * Application-Specific data
     */
    extras?: any;
    name?: string;
}

export interface IGLTFX extends IProperty {
    assets: IReferencedAsset[],
    nodes: INode[],
    /**
     * Names of glTF extensions used somewhere in this asset
     */
    extensionsUsed?: string[];
    /**
     * Names of glTF extensions required to properly load this asset
     */
    extensionsRequired?: string[];
}

export interface IReferencedAsset extends IProperty {
    uri?: string,
    extension?: string,
    mesh?: AbstractMesh
}

export interface INode extends IProperty {
    /**
     * The index of the referenced Asset in this node
     */
    asset?: number,
    /**
     * The indices of this node's children
     */
    children?: number[],
    /**
     * The node's unit quaternion rotation in the order (x, y, z, w), where w is the scalar
     */
    rotation?: number[];
    /**
     * The node's non-uniform scale, given as the scaling factors along the x, y, and z axes
     */
    scale?: number[];
    /**
     * The node's translation along the x, y, and z axes
     */
    translation?: number[];
    parent?: number;
    index?: number;
    loaded?: boolean;
}