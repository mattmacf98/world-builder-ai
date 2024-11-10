import {
    AssetContainer,
    IFileRequest, ISceneLoaderAsyncResult, ISceneLoaderPlugin,
    ISceneLoaderPluginAsync,
    ISceneLoaderPluginExtensions,
    ISceneLoaderPluginFactory, ISceneLoaderProgressEvent, LoadFileError,
    Nullable, Quaternion,
    Scene, SceneLoader, TransformNode, Vector3, WebRequest
} from "@babylonjs/core";
import {IGLTFX, INode, IProperty, IReferencedAsset} from "./IGLTFX";

export interface IGLTFXLoaderExtension {
    /**
     * The name of this extension.
     */
    readonly name: string;

    /**
     * Defines whether this extension is enabled.
     */
    enabled: boolean;

    loadAssetAsync?(asset: IReferencedAsset): Nullable<Promise<AssetContainer>>;
}

interface IRegisteredExtension {
    factory: (loader: GLTFXLoader) => IGLTFXLoaderExtension;
}

export class GLTFXLoader implements ISceneLoaderPluginAsync, ISceneLoaderPluginFactory {

    public name ="gltfx";

    public extensions: ISceneLoaderPluginExtensions = {
        ".gltfx": {isBinary: false}
    }

    private readonly _extensions = new Array<IGLTFXLoaderExtension>();
    private _gltfx: Nullable<IGLTFX> = null;
    private _babylonScene: Nullable<Scene> = null;
    private static _RegisteredExtensions: { [name: string]: IRegisteredExtension } = {};

    public static RegisterExtension(name: string, factory: (loader: GLTFXLoader) => IGLTFXLoaderExtension): void {
        GLTFXLoader._RegisteredExtensions[name] = {
            factory: factory,
        };
    }

    private _loadExtensions(): void {
        for (const name in GLTFXLoader._RegisteredExtensions) {
            const extension = GLTFXLoader._RegisteredExtensions[name].factory(this);
            this._extensions.push(extension);
        }
    }

    public get babylonScene(): Scene {
        if (!this._babylonScene) {
            throw new Error("Scene is not available");
        }

        return this._babylonScene;
    }

    public isExtensionUsed(name: string): boolean {
        return !!this._gltfx?.extensionsUsed && this._gltfx.extensionsUsed.indexOf(name) !== -1;
    }


    createPlugin(): ISceneLoaderPlugin | ISceneLoaderPluginAsync {
        return new GLTFXLoader();
    }


    importMeshAsync(meshesNames: any, scene: Scene, data: any, rootUrl: string, onProgress?: (event: ISceneLoaderProgressEvent) => void, fileName?: string): Promise<ISceneLoaderAsyncResult> {
        throw new Error("importMeshAsync not implemented for gltfx Splatting loading");
    }

    loadAssetContainerAsync(scene: Scene, data: any, rootUrl: string, onProgress?: (event: ISceneLoaderProgressEvent) => void, fileName?: string): Promise<AssetContainer> {
        throw new Error("loadAssetContainerAsync not implemented for gltfx Splatting loading");
    }

    loadAsync(scene: Scene, data: any, rootUrl: string, onProgress?: (event: ISceneLoaderProgressEvent) => void, fileName?: string): Promise<void> {
        this._babylonScene = scene;
        this._gltfx = data as IGLTFX;
        this._setupData();

        return this._loadAsync();
    }

    loadFile(scene: Scene, fileOrUrl: File | string | ArrayBufferView, rootUrl: string, onSuccess: (data: any, responseURL?: string) => void, onProgress?: (ev: ISceneLoaderProgressEvent) => void, useArrayBuffer?: boolean, onError?: (request?: WebRequest, exception?: LoadFileError) => void, name?: string): Nullable<IFileRequest> {
        this._babylonScene = scene;

        return null;
    }

    public GLTFXFromUrl = async (url: string): Promise<IGLTFX> => {
        const response = await fetch(url);
        const json = JSON.parse(await response.text());
        const gltfx = json as IGLTFX;
        for (let i = 0; i < gltfx.nodes.length; i++) {
            gltfx.nodes[i].loaded = false;
            gltfx.nodes[i].index = i;
        }
        return gltfx;
    }

    private _loadAsync(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (this._gltfx?.nodes) {
                try {
                    const rootNode: TransformNode = new TransformNode('__root__', this._babylonScene);
                    this._loadExtensions();
                    for (const node of this._gltfx.nodes) {
                        if (node.loaded) continue;

                        let startLoadNodeIndex = node.index!;
                        if (node.parent) {
                            startLoadNodeIndex = this._getTopLevelNodeIndex(node.index!);
                        }

                        await this._loadNodeAsync(startLoadNodeIndex, rootNode);
                    }
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                resolve();
            }
        });
    }

    private _getTopLevelNodeIndex(startIndex: number): number {
        let curNode = this._gltfx!.nodes[startIndex];
        while (curNode.parent) {
            curNode = this._gltfx!.nodes[curNode.parent];
        }

        return curNode.index!;
    }

    private _loadNodeAsync(index: number, parentNode: Nullable<TransformNode>): Promise<void> {
        const nodeToLoad = this._gltfx!.nodes[index];
        nodeToLoad.loaded = true;

        return new Promise<void>(async (resolve, reject) => {
            try {
                if (nodeToLoad.children) {
                    // load transform node
                    const transformNode: TransformNode = new TransformNode(nodeToLoad.name ?? `transform-${index}`, this._babylonScene);
                    if (parentNode) {
                        transformNode.parent = parentNode;
                    }

                    if (nodeToLoad.translation) {
                        transformNode.position = new Vector3(nodeToLoad.translation[0], nodeToLoad.translation[1], nodeToLoad.translation[2])
                    }
                    if (nodeToLoad.scale) {
                        transformNode.scaling = new Vector3(nodeToLoad.scale[0], nodeToLoad.scale[1], nodeToLoad.scale[2])
                    }
                    if (nodeToLoad.rotation) {
                        transformNode.rotationQuaternion = new Quaternion(nodeToLoad.rotation[0], nodeToLoad.rotation[1], nodeToLoad.rotation[2], nodeToLoad.rotation[3])
                    }

                    // load all children
                    const childNodeLoadedPromises: Promise<void>[] = [];
                    for (const child of nodeToLoad.children) {
                        childNodeLoadedPromises.push(this._loadNodeAsync(child, transformNode));
                    }
                    await Promise.all(childNodeLoadedPromises);
                    resolve();
                } else {
                    await this._loadLeafNodeAsync(index, parentNode);
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    private _loadAssetAsync(asset: IReferencedAsset): Promise<AssetContainer> {
        const extensionPromise = this._extensionsLoadAssetAsync(asset);
        if (extensionPromise) {
            return extensionPromise;
        }
        return SceneLoader.LoadAssetContainerAsync(asset.uri!, '', this._babylonScene, undefined, asset.extension ?? ".glb");
    }

    private async _loadLeafNodeAsync(index: number, parentNode: Nullable<TransformNode>): Promise<void> {
        const nodeToLoad: INode = this._gltfx!.nodes[index];
        const assetToLoad: IReferencedAsset = this._gltfx!.assets[nodeToLoad.asset!];
        const assetContainerPromise = this._loadAssetAsync(assetToLoad);

        return new Promise<void>((resolve, reject) => {
            assetContainerPromise.then((assetContainer) => {
                const meshes = assetContainer.meshes;
                const root = meshes[0];

                if (parentNode) {
                    root.parent = parentNode;
                }

                meshes.forEach(mesh => this._babylonScene!.addMesh(mesh));

                if (nodeToLoad.translation) {
                    root.position = new Vector3(nodeToLoad.translation[0], nodeToLoad.translation[1], nodeToLoad.translation[2])
                }
                if (nodeToLoad.scale) {
                    root.scaling = new Vector3(nodeToLoad.scale[0], nodeToLoad.scale[1], nodeToLoad.scale[2])
                }
                if (nodeToLoad.rotation) {
                    root.rotationQuaternion = new Quaternion(nodeToLoad.rotation[0], nodeToLoad.rotation[1], nodeToLoad.rotation[2], nodeToLoad.rotation[3])
                }

                resolve();
            }).catch((error) => {
                reject(error);
            })
        });
    }

    private _setupData(): void {
        for (let i = 0; i < this._gltfx!.nodes.length; i++) {
            this._gltfx!.nodes[i].index = i;
            this._gltfx!.nodes[i].loaded = false;
        }

        if (this._gltfx?.nodes) {
            for (const node of this._gltfx.nodes) {
                if (node.children) {
                    for (const index of node.children) {
                        this._gltfx.nodes[index].parent = node.index;
                    }
                }
            }
        }
    }

    private _applyExtensions<T>(property: IProperty, functionName: string, actionAsync: (extension: IGLTFXLoaderExtension) => Nullable<T> | undefined): Nullable<T> {
        for (const extension of this._extensions) {
            if (extension.enabled) {
                const result = actionAsync(extension);
                if (result) {
                    return result;
                }
            }
        }

        return null;
    }

    private _extensionsLoadAssetAsync(asset: IReferencedAsset): Nullable<Promise<AssetContainer>> {
        return this._applyExtensions(asset, "loadAsset", (extension) => {
           return extension.loadAssetAsync && extension.loadAssetAsync(asset);
        })
    }
}

if (SceneLoader) {
    SceneLoader.RegisterPlugin(new GLTFXLoader());
}