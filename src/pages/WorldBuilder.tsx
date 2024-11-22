import { 
    Engine, 
    Scene, 
    FreeCamera, 
    Vector3, 
    KeyboardInfo,
    CubeTexture,
    MeshBuilder,
    StandardMaterial,
    Color3,
    HemisphericLight,
  } from '@babylonjs/core';
  import "@babylonjs/loaders/glTF";
  import { MutableRefObject, useEffect, useRef, useState, useCallback } from 'react';
  import { useSearchParams } from 'react-router-dom';
  import { Container, Row, Col, Form, Spinner, Button, Modal } from 'react-bootstrap';
  import { IReferencedAsset } from '../glTFx/IGLTFX';
  import { GLTFXLoader } from '../glTFx/glTFXLoader';
  import { WRLD_parametrized_asset } from '../glTFx/extensions/WRLD_parametrized_asset';
  import { useMutation, useQuery } from 'convex/react';
  import { api } from '../../convex/_generated/api';
  import { Id } from '../../convex/_generated/dataModel';
  import { useAI } from '../hooks/useAI';
  import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
  import { fileService } from '../fileService';
import { ObjectType, WorldBuilder } from '../WorldBuilder';
import { MacroNodeEngine } from '../macroEngine/Engine';
import { BabylonDecorator } from '../macroEngine/Decorator';
import { FaMicrophone } from "react-icons/fa";
  
  GLTFXLoader.RegisterExtension("WRLD_parametrized_asset", (loader) => {
    return new WRLD_parametrized_asset(loader);
  });

  interface IPrompt {
    user: string;
    ai: string;
  }
  const constructMacroPrompt = (userPrompts: IPrompt[]) => {
    let prompt = `
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
    
      User: delete the selected object
      AI: alrighty here you go {"actions":[{"delete": {}}]}
  
    `
    for (const userPrompt of userPrompts) {
      prompt += `\nUser: ${userPrompt.user}`;
      prompt += `\nAI: alrighty here you go ${userPrompt.ai}\n\n`;
    }

    prompt += `\nNow respond to the following user request\n`;
    return prompt;
  }
  
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const WorldBuilderPage = () => {
    const canvasRef = useRef(null);
    const worldBuilder = useRef<WorldBuilder | null>(null);
    const glbFiles = useRef<File[]>([]);
    const [_forceUpdate, setForceUpdate] = useState(0);
    const [searchParams] = useSearchParams();
    const worldId = searchParams.get('worldId');
    const [macroScreen, setMacroScreen] = useState(false);
    const [controlPanelOpen, setControlPanelOpen] = useState(false);
    const macros = useQuery(api.macro.getMacros);
    const aiChatRef = useRef<HTMLTextAreaElement | null>(null);

    const userPrompts: IPrompt[] = [];
    if (macros) {
      for (const macro of macros) {
        for (let i = 0; i < macro.activationPhrases.length; i++) {
          userPrompts.push({ user: macro.activationPhrases[i], ai: `{"actions":[{"${macro.name}":${macro.actions[i]}}]}` });
        }
      }
    }
    const macroPrompt = constructMacroPrompt(userPrompts);

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
      setTimeout(() => {
        if (aiChatRef.current) {
          aiChatRef.current.focus();
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          aiChatRef.current.dispatchEvent(enterEvent);
        }
      }, 100);
    });
  
    const createWorld = useMutation(api.world.createWorld);
    const generateUploadUrl = useMutation(api.world.generateUploadUrl);
    const loadedWorld = useQuery(api.world.getWorld, worldId ? { id: worldId as Id<'worlds'> } : "skip");
  
    useEffect(() => {
      if (canvasRef.current) {
        const engine = new Engine(canvasRef.current, true);
        const scene = new Scene(engine);
        scene.clearColor.set(0.9, 0.9, 0.9, 1);
  
        // Create a camera
        const camera = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
        camera.setTarget(new Vector3(0, 2, 0));
        camera.attachControl(canvasRef.current, true);


        // Load an IBL (Image-Based Lighting) environment texture
        const hdrTexture = CubeTexture.CreateFromPrefilteredData("environmentSpecular.env", scene);
        scene.environmentTexture = hdrTexture;
        scene.clearColor.set(0.9, 0.9, 0.9, 1);

        // Create a ground plane
        const ground = MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, scene);
        const groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.alpha = 0.025;
        groundMaterial.diffuseColor = new Color3(0.95, 0.95, 0.95);
        ground.material = groundMaterial;
        ground.position.y = -1;

        // Create a hemisphere light
        const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.5;
  
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
      } else {
        executeMacro(action);
      }
    }

    const executeMacro = async (action: any) => {
      const actionKeys = Object.keys(action);
      if (actionKeys.length !== 1) { 
        console.log("expected a single actionkey found", actionKeys);
      }
      const name = actionKeys[0];
      const input = action[name];
      console.log(name, input);
      console.log(macros);

      const macro = macros?.find(macro => macro.name === name);
      if (!macro) {
        console.log("macro not found", name);
        return;
      }

      const response = await fetch(macro.macroUrl!);
      const macroText = await response.text();
      const macroJson = JSON.parse(macroText);

      console.log(macroJson);
      console.log(input);
      const macroEngine = MacroNodeEngine.build(macroJson.nodes, macroJson.inputs, input, new BabylonDecorator(worldBuilder.current!));
      macroEngine.execute();
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

    const showMacroScreen = () => {
      setMacroScreen(true);
    }
  
    return (
      <Container fluid className="p-0" style={{ height: '95vh' }}>
        
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }}/>

        <Button 
          onClick={() => setControlPanelOpen(prev => !prev)} 
          style={{ 
            position: 'absolute', 
            top: '7.5vh', 
            right: '3vw', 
            padding: '0px 10px 5px 10px', 
            fontSize: '1.5rem',
            border: 'none' 
          }}
        >
          &#9776;
        </Button>

        <div style={{
          position: "absolute",
          right: controlPanelOpen ? 0: -100, 
          top: 0, 
          bottom: 0, 
          width: controlPanelOpen ? '20vw' : '0', 
          borderLeft: '1px solid black',
          backgroundColor: 'white', 
          overflow: 'hidden', 
          transition: 'width 0.3s ease, border-left 0.3s ease' 
          
        }}>
          <div style={{display:"flex", flexDirection: "row", padding: 16}}>
            <Button 
              onClick={() => setControlPanelOpen(prev => !prev)} 
              style={{ 
                padding: '0px 10px 0px 10px', 
                marginRight: 10,
                fontSize: '1.0rem',
                border: 'none' 
              }}
            >
              &#9664;
            </Button>
            <h3>Control Panel</h3>
          </div>

          <div style={{background: "#F1F1F2", padding: 8}}>
            <h5>Add Object</h5>
          </div>
          <div style={{padding: 8}}>
              <Button style={{margin: 8}} onClick={() => {
                worldBuilder.current?.addObject(ObjectType.Sphere);
                triggerRerender();
              }}>Sphere</Button>
              <Button  style={{margin: 8}} onClick={() => {
                worldBuilder.current?.addObject(ObjectType.Box);
                triggerRerender();
              }}>Box</Button>

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
          </div>

          <div style={{background: "#F1F1F2", padding: 8}}>
            <h5>
              AI  
              <FaMicrophone style={{color: isListening ? "red" : "black", marginLeft: 8}} onClick={() => {
                if (isListening) {
                  recognition.current?.stop();
                } else {
                  recognition.current?.start();
                  setIsListening(true);
                }
              }}/>
            </h5>
          </div>

          <div style={{padding: 8}}>
            <Form.Group className="mb-3" >
              <Form.Label>Chat</Form.Label>
              <Form.Control 
                as="textarea" 
                disabled={aiLoading}
                ref={aiChatRef}
                value={aiChatText ?? ""}
                onChange={(e) => setAiChatText(e.target.value)}
                rows={3} 
                placeholder="Chat with the AI here..."
                style={{ resize: 'vertical' }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    console.log(aiChatText);
                    executeAIChat(aiChatText ?? "", macroPrompt, parseAIResponse);
                  }
                }}
              />
            </Form.Group>

            {aiLoading && <Spinner animation="border" className="mt-3" />}
          </div>
          
          <div style={{background: "#F1F1F2", padding: 8}}>
            <h5>World Objects</h5>
          </div>

          <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto', padding: 8}}>
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

          <div style={{background: "#F1F1F2", padding: 8}}>
            <h5>Options</h5>
          </div>

          <div style={{padding: 8, display: "flex", flexDirection: "column", alignItems: "center"}}>
            <Button onClick={handleUploadGLTFX} style={{width: 256, margin: 8}}>Upload GLTFX</Button>
            <Button onClick={showMacroScreen} style={{width: 256, margin: 8}}>Macro</Button>
          </div>
        </div>


        <Modal show={macroScreen} onHide={() => setMacroScreen(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Macro</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <MacroScreen worldBuilder={worldBuilder} />
          </Modal.Body>
        </Modal>
      </Container>
    )
  }

  const MacroScreen = ({worldBuilder}: {worldBuilder: MutableRefObject<WorldBuilder | null>}) => {
    const [inputValues, setInputValues] = useState<Record<string, any>>({});
    const [macroName, setMacroName] = useState<string | null>("");
    const [macroJson, setMacroJson] = useState<any>(null);

    const macros = useQuery(api.macro.getMacros);
    const selectedMacro = useQuery(api.macro.getMacro, macroName !== "" ? { id: macroName as Id<'macros'> } : "skip");

    const getMacroJson = async () => {
      const macro = await fetch(selectedMacro!.macroUrl!);
      const macroText = await macro.text();
      setMacroJson(JSON.parse(macroText));
    }

    useEffect(() => {
      if (selectedMacro) {
        getMacroJson();
      }
    }, [selectedMacro]);

    return (
      <>
        <Form.Group className="mb-3">
          <Form.Label>Macro Name</Form.Label>
          <Form.Select onChange={(e) => {
            setMacroJson(null);
            setMacroName(e.target.value);
          }}>
            <option value={""}>Select</option>
            {macros?.map((macro: any) => (
              <option key={macro._id} value={macro._id}>{macro.name}</option>
            ))}
          </Form.Select>
          {macroJson && macroJson.inputs.map((input: any) => {
            return (
                <div key={input.parameter}>
                  <Form.Label>{input.parameter} ({input.parameterType})</Form.Label>
                  <Form.Control
                    type="text"
                    value={inputValues[input.parameter] ?? ""}
                    onChange={(e) => setInputValues({...inputValues, [input.parameter]: e.target.value})}
                  />
                </div>
              )
            })}
        </Form.Group>

        <Button disabled={!macroJson} onClick={() => {
          const macroEngine = MacroNodeEngine.build(macroJson.nodes, macroJson.inputs, inputValues, new BabylonDecorator(worldBuilder.current!));
          macroEngine.execute();
        }}>Run</Button>
      </>
    )
  }

  const Spacer = ({ height }: { height: number }) => {
    return <div style={{ height }} />;
  };
  
  export default WorldBuilderPage;