import { 
  Engine, 
  Scene, 
  FreeCamera, 
  Vector3, 
  HemisphericLight, 
  MeshBuilder,
  GizmoManager,
  PointerEventTypes,
  AbstractMesh,
  KeyboardInfo,
  SceneLoader,
  SpotLight,
  PointLight,
  DirectionalLight,
} from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import { useEffect, useRef, useState } from 'react';
import { Container, Row, Col, Form, Spinner, Button } from 'react-bootstrap';
import './App.css'
import { AISession } from './window';
import { IGLTFX, INode, IReferencedAsset } from './glTFx/IGLTFX';
import { GLTFXLoader } from './glTFx/glTFXLoader';
import { WRLD_parametrized_asset } from './glTFx/extensions/WRLD_parametrized_asset';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

enum ObjectType {
  Sphere = 'sphere',
  Box = 'box',
}

enum LightType {
  Hemispheric = 'hemispheric',
  Directional = 'directional',
  Point = 'point',
  Spot = 'spot',
}

GLTFXLoader.RegisterExtension("WRLD_parametrized_asset", (loader) => {
  return new WRLD_parametrized_asset(loader);
});

class WorldBuilder {
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

  addLight(type: LightType) {
    let light;
    switch (type) {
      case LightType.Hemispheric:
        light = new HemisphericLight('hemiLight', new Vector3(0, 0, 0), this._scene);
        break;
      case LightType.Point:
        light = new PointLight('pointLight', new Vector3(0, 0, 0), this._scene);
        break;
      case LightType.Directional:
        light = new DirectionalLight('dirLight', new Vector3(0, -1, 0), this._scene);
        break;
      case LightType.Spot:
        light = new SpotLight('spotLight', new Vector3(0, 0, 0), new Vector3(0, 0, 1), Math.PI/3, 2, this._scene);
        break;
    }

    const lightSphere = MeshBuilder.CreateSphere('lightBulb', { diameter: 0.5 }, this._scene);
    this._worldAssets.push({ name: lightSphere.name, mesh: lightSphere });
    this._worldNodes.push({ name: lightSphere.name, asset: this._worldAssets.length - 1, translation: [0, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] });
    lightSphere.position = new Vector3(0, 1, 0);
    lightSphere.isPickable = true;
    lightSphere.visibility = 0.5;
    
    lightSphere.receiveShadows = false;
    lightSphere.applyFog = false;
    
    lightSphere.renderingGroupId = 1;
    
    if (light) {
      lightSphere.metadata = { light };
      light.parent = lightSphere;
      this._gizmoManager.attachableMeshes?.push(lightSphere);
    }
  }
}

const prompt = `
you have the ability to create json objects correpsonding to user requets but always start with the phrase alrighty here you go

here are some examples
User: select the first object
AI: alrighty here you go {"actions":[{"select":{"index": "0"}}]}

User: move the selected object 1 unit to the right
AI: alrighty here you go {"actions":[{"translateX":{"amount": "1"}}]}

User: move the selected object 20 units up
AI: alrighty here you go {"actions":[{"translateY":{"amount": "20"}}]}

User: move the selected object 1 unit forward
AI: alrighty here you go {"actions":[{"translateZ":{"amount": "1"}}]}

User: rotate the selected object 90 degrees on the x axis
AI: alrighty here you go {"actions":[{"rotateX":{"amount": "90"}}]}

User: scale the selected object to be 2 times smaller in the x direction
AI: alrighty here you go {"actions":[{"scaleX":{"amount": "0.5"}}]}

User: move the object to the origin
AI: alrighty here you go {"actions":[{"setTranslateX":{"amount": "0"}}, {"setTranslateY":{"amount": "0"}}, {"setTranslateZ":{"amount": "0"}}]}

User: delete the selected object
AI: alrighty here you go {"actions":[{"delete": {}}]}

Now respond to the following user request
`

const App = () => {
  const canvasRef = useRef(null);
  const worldBuilder = useRef<WorldBuilder | null>(null);
  const glbFiles = useRef<File[]>([]);
  const aiSession = useRef<AISession | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [textValue, setTextValue] = useState<string | null>(null);

  const createWorld = useMutation(api.world.createWorld);
  const generateUploadUrl = useMutation(api.world.generateUploadUrl);
  const loadedWorld = useQuery(api.world.getWorld, textValue ? { id: textValue as Id<'worlds'> } : "skip");

  useEffect(() => {
    setUpAI();
  }, []);

  useEffect(() => {
    loadWorld();
  }, [loadedWorld]);

  const loadWorld = async () => {
    if (loadedWorld) {
      const gltfx = await fetch(loadedWorld.glTFXUrl!);
      const gltfxText = await gltfx.text();

      const glTFXJson = JSON.parse(gltfxText);
      glTFXJson["assets"].forEach((asset: IReferencedAsset) => {
        if (asset.uri && loadedWorld.assetUriToUrls && loadedWorld.assetUriToUrls) {
          const url = loadedWorld.assetUriToUrls.find(item => item.uri === asset.uri)?.url;
          if (url) {
            asset.uri = url;
          }
        }
      });
      worldBuilder.current?.loadGLTFX(glTFXJson);
    }
  }

  const triggerRerender = () => {
    setForceUpdate(prev => prev + 1);
  };

  const setUpAI = async () => {
    if (!window.ai || !window.ai.languageModel) { 
      console.log("AI not supported");
      return;
    }

    const {available, defaultTemperature, defaultTopK, maxTopK } = await window.ai.languageModel.capabilities();
    console.log(available, defaultTemperature, defaultTopK, maxTopK);

    const session = await window.ai.languageModel.create();
    aiSession.current = session;
    console.log("ready");
  }

  const parseAIResponse = async(response: string) => {
    const jsonStart = response.indexOf("{");
    response = response.substring(jsonStart);
    console.log(response);
    try {
      const json = JSON.parse(response);
      console.log(json);
      if (json["actions"]) {
        for (const action of json["actions"]) {
          takeAction(action);
          await wait(500);
        };
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
    }
  }

  const takeAction = (action: any) => {
    if (action["select"]) {
      worldBuilder.current?.selectMesh(action["select"]["index"] as number);
    } else if (action["setTranslateX"]) {
      worldBuilder.current?.setTranslateX(action["setTranslateX"]["amount"] as number);
    } else if (action["setTranslateY"]) {
      worldBuilder.current?.setTranslateY(action["setTranslateY"]["amount"] as number);
    } else if (action["setTranslateZ"]) {
      worldBuilder.current?.setTranslateZ(action["setTranslateZ"]["amount"] as number);
    } else if (action["translateX"]) {
      worldBuilder.current?.translateX(action["translateX"]["amount"] as number);
    } else if (action["translateY"]) {
      worldBuilder.current?.translateY(action["translateY"]["amount"] as number);
    } else if (action["translateZ"]) {
      worldBuilder.current?.translateZ(action["translateZ"]["amount"] as number);
    } else if (action["rotateX"]) {
      worldBuilder.current?.rotateX(action["rotateX"]["amount"] as number);
    } else if (action["rotateY"]) {
      worldBuilder.current?.rotateY(action["rotateY"]["amount"] as number);
    } else if (action["rotateZ"]) {
      worldBuilder.current?.rotateZ(action["rotateZ"]["amount"] as number);
    } else if (action["scaleX"]) {
      worldBuilder.current?.scaleX(action["scaleX"]["amount"] as number);
    } else if (action["scaleY"]) {
      worldBuilder.current?.scaleY(action["scaleY"]["amount"] as number);
    } else if (action["scaleZ"]) {
      worldBuilder.current?.scaleZ(action["scaleZ"]["amount"] as number);
    } else if (action["delete"]) {
      worldBuilder.current?.deleteSelectedObject();
    }
  }

  useEffect(() => {
    if (canvasRef.current) {
      const engine = new Engine(canvasRef.current, true);
      const scene = new Scene(engine);

      // Create a camera
      const camera = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
      camera.setTarget(Vector3.Zero());
      camera.attachControl(canvasRef.current, true);

      worldBuilder.current = new WorldBuilder(scene);

      const handleKeyboard = (eventData: KeyboardInfo) => {
        if (eventData.event.key === 'Backspace') { 
          worldBuilder.current?.deleteSelectedObject();
          triggerRerender();
        } else {
          worldBuilder.current?.setGizmoMode(eventData.event.key);
        }
      };
      scene.onKeyboardObservable.add(handleKeyboard);


      // Render loop
      engine.runRenderLoop(() => {
        scene.render();
      });

      // Handle window resize
      window.addEventListener('resize', () => {
        engine.resize();
      });

      // Cleanup
      return () => {
        scene.dispose();
        engine.dispose();
      };
    }
  }, []);

  return (
    <Container fluid className="p-0">
      <Row className="g-0">
      <Col md={10}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100vh' }}
          />
        </Col>
        <Col md={2} className="bg-light p-3" style={{ height: '100vh', overflowY: 'auto' }}>
          <h4>Control Panel</h4>

          <Form.Group className="mb-3">
            <Form.Label>Add Object</Form.Label>
            <Form.Select onChange={(e) => {
              worldBuilder.current?.addObject(e.target.value as ObjectType);
              triggerRerender();
            }}>
              <option value="">Select object...</option>
              <option value={ObjectType.Sphere}>Sphere</option>
              <option value={ObjectType.Box}>Box</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Upload GLB Model</Form.Label>
            <Form.Control 
              type="file" 
              accept=".glb"
              onChange={async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file && worldBuilder.current) {
                  glbFiles.current.push(file);
                  await worldBuilder.current.loadGLBModel(file)
                  triggerRerender();
                }
              }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Add Light</Form.Label>
            <Form.Select onChange={(e) => {
              worldBuilder.current?.addLight(e.target.value as LightType);
              triggerRerender();
            }}>
              <option value="">Select light type...</option>
              <option value={LightType.Hemispheric}>Hemispheric Light</option>
              <option value={LightType.Point}>Point Light</option>
              <option value={LightType.Directional}>Directional Light</option>
              <option value={LightType.Spot}>Spot Light</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" >
            <Form.Label>Chat</Form.Label>
            <Form.Control 
              as="textarea" 
              disabled={aiLoading}
              rows={3} 
              placeholder="Chat with the AI here..."
              style={{ resize: 'vertical' }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  setAiLoading(true);
                  e.preventDefault();
                  const userPrompt = e.currentTarget.value;
                  e.currentTarget.value = '';

                  const result = await aiSession.current?.prompt(prompt + "\n\nUser: " + userPrompt);
                  if (result) {
                    parseAIResponse(result);
                  }
                  setAiLoading(false);
                }
              }}
            />
          </Form.Group>

          {aiLoading && <Spinner animation="border" className="mt-3" />}

          <Form.Group className="mb-3">
            <Form.Label>World Objects</Form.Label>
            <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {worldBuilder.current?.worldNodes.map((node, index) => (
                <div 
                  key={`${index}-${node.name}`} 
                  className="p-1 cursor-pointer" 
                  onClick={() => worldBuilder.current?.selectMesh(index)}
                  style={{ cursor: 'pointer' }}
                >
                  {index}: {node.name}
                </div>
              ))}
            </div>
          </Form.Group>

          <Button onClick={() => {
            const gltfx = worldBuilder.current?.getGlTFX();
            if (gltfx) {
              const blob = new Blob([JSON.stringify(gltfx, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'world.gltfx';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }}>Export GLTFX</Button>
          
          <input
            type="file"
            accept=".gltfx"
            style={{ display: 'none' }}
            id="gltfx-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const gltfx = JSON.parse(event.target?.result as string);
                    console.log(gltfx);
                    worldBuilder.current?.loadGLTFX(gltfx);
                  } catch (error) {
                    console.error("Error parsing GLTFX file:", error);
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
          <Button onClick={() => {
            document.getElementById('gltfx-file-input')?.click();
          }}>Load GLTFX</Button>
          <Button onClick={async () => {
            const uploadUrl = await generateUploadUrl();
            console.log(uploadUrl);
            const gltfx = worldBuilder.current?.getGlTFX();
            console.log(gltfx);
            const blob = new Blob([JSON.stringify(gltfx, null, 2)], { type: 'application/json' });
            const result = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": blob.type },
              body: blob,
            });

            const response = await result.json();
            const glTFXStorageId = response.storageId;

            const assetUriToStorageIds = [];
            for (const asset of gltfx?.assets ?? []) {
              if (asset.uri) {
                const file = glbFiles.current.find(file => file.name === asset.uri);
                if (file) {
                  const uploadUrl = await generateUploadUrl();
                  const blob = new Blob([file], { type: "model/gltf-binary" });
                  const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": "model/gltf-binary" },
                    body: blob,
                  });
                  const response = await result.json();
                  const assetStorageId = response.storageId;
                  assetUriToStorageIds.push({ uri: asset.uri, storageId: assetStorageId });
                }
              }
            }

            console.log(assetUriToStorageIds);

            await createWorld({ name: "test", glTFXStorageId, assetUriToStorageIds });
          }}>Upload GLTFX</Button>

          <Form.Group className="mb-3">
            <Form.Label>World ID</Form.Label>
            <Form.Control 
              type="text"
              id='world-id-input'
              placeholder="Enter world ID..."
            />
            <Button 
              className="mt-2"
              onClick={() => setTextValue((document.getElementById('world-id-input') as HTMLInputElement).value)}
            >
              Load World
            </Button>
          </Form.Group>
        </Col>
      </Row>
    </Container>
  )
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default App