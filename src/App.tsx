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
import { Container, Row, Col, Form, Spinner } from 'react-bootstrap';
import './App.css'
import { AISession } from './window';

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

interface IWorldNode {
  mesh: AbstractMesh;
  name: string;
}

class WorldBuilder {
  private _scene: Scene;
  private _worldNodes: IWorldNode[];
  private _gizmoManager: GizmoManager;
  private _selectedMesh: AbstractMesh | null;

  constructor(scene: Scene) {
    this._scene = scene;
    this._worldNodes = [];
    this._gizmoManager = new GizmoManager(scene);
    this._selectedMesh = null;
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

  get worldNodes() {
    return this._worldNodes;
  }

  async loadGLBModel(file: File) {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync("file:", file, this._scene);
      container.addAllToScene();
      if (container.meshes[0]) {
        this._gizmoManager.attachableMeshes?.push(container.meshes[0]);
        this._worldNodes.push({ mesh: container.meshes[0], name: container.meshes[0].name });
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
    this._selectedMesh = this._worldNodes[index].mesh;
    this._gizmoManager.attachToMesh(this._worldNodes[index].mesh);
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
      this._worldNodes = this._worldNodes.filter(node => node.mesh !== this._selectedMesh);
      this._selectedMesh.dispose();
      this._selectedMesh = null;
    }
  }

  addObject(type: ObjectType) {
    switch (type) {
      case ObjectType.Box:
        const box = MeshBuilder.CreateBox('box', { size: 2 }, this._scene);
        this._gizmoManager.attachableMeshes?.push(box);
        this._worldNodes.push({ mesh: box, name: box.name });
        break;
      case ObjectType.Sphere:
        const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this._scene);
        this._gizmoManager.attachableMeshes?.push(sphere);
        this._worldNodes.push({ mesh: sphere, name: sphere.name });
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
    this._worldNodes.push({ mesh: lightSphere, name: lightSphere.name });
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
  const aiSession = useRef<AISession | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    setUpAI();
  }, []);

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
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file && worldBuilder.current) {
                  worldBuilder.current.loadGLBModel(file);
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

          {aiLoading && <Spinner animation="border" className="mt-3" />}
        </Col>
      </Row>
    </Container>
  )
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default App