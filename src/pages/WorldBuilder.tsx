import { 
    Engine, 
    Scene, 
    FreeCamera, 
    Vector3, 
    KeyboardInfo,
  } from '@babylonjs/core';
  import "@babylonjs/loaders/glTF";
  import { useEffect, useRef, useState } from 'react';
  import { useSearchParams } from 'react-router-dom';
  import { Container, Row, Col, Form, Spinner, Button } from 'react-bootstrap';
  import { IReferencedAsset } from '../glTFx/IGLTFX';
  import { GLTFXLoader } from '../glTFx/glTFXLoader';
  import { WRLD_parametrized_asset } from '../glTFx/extensions/WRLD_parametrized_asset';
  import { useMutation, useQuery } from 'convex/react';
  import { api } from '../../convex/_generated/api';
  import { Id } from '../../convex/_generated/dataModel';
  import { useAI } from '../hooks/useAI';
  import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
  import { fileService } from '../fileService';
import { LightType, ObjectType, WorldBuilder } from '../WorldBuilder';
  
  GLTFXLoader.RegisterExtension("WRLD_parametrized_asset", (loader) => {
    return new WRLD_parametrized_asset(loader);
  });
  
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
  
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const WorldBuilderPage = () => {
    const canvasRef = useRef(null);
    const worldBuilder = useRef<WorldBuilder | null>(null);
    const glbFiles = useRef<File[]>([]);
    const [_forceUpdate, setForceUpdate] = useState(0);
    const [searchParams] = useSearchParams();
    const worldId = searchParams.get('worldId');
  
    const { 
      aiLoading, 
      aiChatText, 
      setAiChatText, 
      initializeAI, 
      executeAIChat 
    } = useAI();
  
    const { 
      isListening, 
      setIsListening, 
      recognition, 
      initialize: initializeSpeech 
    } = useSpeechRecognition((transcript) => {
      setAiChatText(transcript);
      executeAIChat(transcript, prompt, parseAIResponse);
    });
  
    const createWorld = useMutation(api.world.createWorld);
    const generateUploadUrl = useMutation(api.world.generateUploadUrl);
    const loadedWorld = useQuery(api.world.getWorld, worldId ? { id: worldId as Id<'worlds'> } : "skip");
  
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
  
        initializeAI();
        initializeSpeech();
  
        // Cleanup
        return () => {
          scene.dispose();
          engine.dispose();
        };
      }
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
  
    const handleUploadGLTFX = async () => {
      const uploadUrl = await generateUploadUrl();
      const gltfx = worldBuilder.current?.getGlTFX();
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
      await createWorld({ name: "test", glTFXStorageId, assetUriToStorageIds });
    };
  
    const handleLoadGLBModel = async (file: File) => {
      if (worldBuilder.current) {
        glbFiles.current.push(file);
        await worldBuilder.current.loadGLBModel(file)
        triggerRerender();
      }
    };
  
    return (
      <Container fluid className="p-0" style={{ height: '95vh' }}>
        <Row className="g-0" style={{ height: '100%' }}>
          <Col md={10}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%' }}
            />
          </Col>
          <Col md={2} className="bg-light p-3" style={{ height: '100%', overflowY: 'auto' }}>
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
                  if (file) handleLoadGLBModel(file);
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
              <div className="d-flex gap-2 mb-2">
                <Button 
                  variant={isListening ? "danger" : "primary"}
                  onClick={() => {
                    if (isListening) {
                      recognition.current?.stop();
                    } else {
                      recognition.current?.start();
                      setIsListening(true);
                    }
                  }}
                >
                  {isListening ? "Stop Listening" : "Start Listening"}
                </Button>
              </div>
              <Form.Control 
                as="textarea" 
                disabled={aiLoading}
                value={aiChatText ?? ""}
                onChange={(e) => setAiChatText(e.target.value)}
                rows={3} 
                placeholder="Chat with the AI here..."
                style={{ resize: 'vertical' }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    executeAIChat(aiChatText ?? "", prompt, parseAIResponse);
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
  
            <Button onClick={() => fileService.exportGLTFX(worldBuilder.current?.getGlTFX())}>Export GLTFX</Button>
            
            <input
              type="file"
              accept=".gltfx"
              style={{ display: 'none' }}
              id="gltfx-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  fileService.loadGLTFX(file).then(gltfx => {
                    worldBuilder.current?.loadGLTFX(gltfx);
                    triggerRerender();
                  });
                }
              }}
            />
            <Button onClick={() => {
              document.getElementById('gltfx-file-input')?.click();
            }}>Load GLTFX</Button>
            <Button onClick={handleUploadGLTFX}>Upload GLTFX</Button>
          </Col>
        </Row>
      </Container>
    )
  }
  
  export default WorldBuilderPage;