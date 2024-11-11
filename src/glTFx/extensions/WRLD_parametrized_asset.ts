import {GLTFXLoader, IGLTFXLoaderExtension} from "../glTFXLoader";
import {IReferencedAsset} from "../IGLTFX";
import {AssetContainer, Nullable, MeshBuilder} from "@babylonjs/core";

const NAME = "WRLD_parametrized_asset";

interface IWRLDParametrizedAsset extends IReferencedAsset {
    type: string
}

export class WRLD_parametrized_asset implements IGLTFXLoaderExtension {
    public readonly name = NAME;
    public enabled: boolean;

    private _loader: GLTFXLoader;
    private _parametrizedAsset?: IWRLDParametrizedAsset;

    constructor(loader: GLTFXLoader) {
        this._loader = loader;
        this.enabled = this._loader.isExtensionUsed(NAME);
    }

    loadAssetAsync(asset: IReferencedAsset): Nullable<Promise<AssetContainer>> {
        this._parametrizedAsset = asset as IWRLDParametrizedAsset;
        if (!this._parametrizedAsset.extensions || !this._parametrizedAsset.extensions.WRLD_parametrized_asset) {
            return null;
        }
        
        const parametrizedType = this._parametrizedAsset.extensions.WRLD_parametrized_asset.type;
        if (parametrizedType === "sphere") {
            const sphere = MeshBuilder.CreateSphere("sphere", {diameter: 1});
            const container = new AssetContainer();
            container.meshes.push(sphere);
            return Promise.resolve(container);
        } else if (parametrizedType === "box") {
            const box = MeshBuilder.CreateBox("box", {size: 1});
            const container = new AssetContainer();
            container.meshes.push(box);
            return Promise.resolve(container);
        }

        return null;
    }
}