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
  SceneLoader
} from '@babylonjs/core';
import "@babylonjs/loaders/glTF";
import { useEffect, useRef } from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import './App.css'

enum ObjectType {
  Sphere = 'sphere',
  Box = 'box',
}

class WorldBuilder {
  private _scene: Scene;
  private _gizmoManager: GizmoManager;
  private _selectedMesh: AbstractMesh | null;

  constructor(scene: Scene) {
    this._scene = scene;
    this._gizmoManager = new GizmoManager(scene);
    this._selectedMesh = null;
    this._gizmoManager.positionGizmoEnabled = true;
    this._gizmoManager.rotationGizmoEnabled = false;
    this._gizmoManager.scaleGizmoEnabled = false;
    this._gizmoManager.attachableMeshes = [];

    this._scene.onPointerObservable.add((event) => {
      if (event.type !== PointerEventTypes.POINTERDOWN) { return }

      const mesh = event.pickInfo?.pickedMesh;
      if (!mesh) return;

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

  async loadGLBModel(file: File) {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync("file:", file, this._scene);
      container.addAllToScene();
      if (container.meshes[0]) {
        this._gizmoManager.attachableMeshes?.push(container.meshes[0]);
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

  deleteSelectedObject() {
    if (this._selectedMesh) {
      this._gizmoManager.attachToMesh(null);
      this._selectedMesh.dispose();
      this._selectedMesh = null;
    }
  }

  addObject(type: ObjectType) {
    switch (type) {
      case ObjectType.Box:
        const box = MeshBuilder.CreateBox('box', { size: 2 }, this._scene);
        this._gizmoManager.attachableMeshes?.push(box);
        break;
      case ObjectType.Sphere:
        const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this._scene);
        this._gizmoManager.attachableMeshes?.push(sphere);
        break;
    }
  }
}

const App = () => {
  const canvasRef = useRef(null);
  const worldBuilder = useRef<WorldBuilder | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const engine = new Engine(canvasRef.current, true);
      const scene = new Scene(engine);

      // Create a camera
      const camera = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
      camera.setTarget(Vector3.Zero());
      camera.attachControl(canvasRef.current, true);

      // Create a light
      const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

      worldBuilder.current = new WorldBuilder(scene);
      

      const handleKeyboard = (eventData: KeyboardInfo) => {
        if (eventData.event.key === 'Backspace') { 
          worldBuilder.current?.deleteSelectedObject();
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
            <Form.Select onChange={(e) => worldBuilder.current?.addObject(e.target.value as ObjectType)}>
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
                }
              }}
            />
          </Form.Group>

        </Col>
      </Row>
    </Container>
  )
}

export default App