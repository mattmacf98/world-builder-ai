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
  Tools,
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
import { ObjectType, WorldBuilder } from '../WorldBuilder';
import { MacroNodeEngine } from '../macroEngine/Engine';
import { BabylonDecorator } from '../macroEngine/Decorator';
import { FaMicrophone } from "react-icons/fa";
import { base64StringToBlob } from 'blob-util';
import { FeatureExtractionPipeline, pipeline } from '@huggingface/transformers';
  
  GLTFXLoader.RegisterExtension("WRLD_parametrized_asset", (loader) => {
    return new WRLD_parametrized_asset(loader);
  });

  interface IBuiltInAction {
    name: string;
    phrase: string;
    action: string;
  }

  const builtInActions: IBuiltInAction[] = [
    {
      name: "select",
      phrase: "select object 0",
      action: `{"select": {"index": 0}}`
    },
    {
      name: "setTranslateX",
      phrase: "set the selected object's x position to 1",
      action: `{"setTranslateX": {"amount": 1}}`
    },
    {
      name: "setTranslateY",
      phrase: "set the selected object's y position to -1",
      action: `{"setTranslateY": {"amount": -1}}`
    },
    {
      name: "setTranslateZ",
      phrase: "set the selected object's z position to 5",
      action: `{"setTranslateZ": {"amount": 5}}`
    },
    {
      name: "translateX",
      phrase: "move the selected object 1 unit to the right",
      action: `{"translateX": {"amount": 1}}`
    },
    {
      name: "translateY",
      phrase: "move the selected object 1 unit up",
      action: `{"translateY": {"amount": 1}}`
    },
    {
      name: "translateZ",
      phrase: "move the selected object 1 unit forward",
      action: `{"translateZ": {"amount": 1}}`
    },
    {
      name: "rotateX",
      phrase: "rotate the selected object 90 degrees on the x axis",
      action: `{"rotateX": {"amount": 90}}`
    },
    {
      name: "rotateY",
      phrase: "rotate the selected object 90 degrees on the y axis",
      action: `{"rotateY": {"amount": 90}}`
    },
    {
      name: "rotateZ",
      phrase: "rotate the selected object 90 degrees on the z axis",
      action: `{"rotateZ": {"amount": 90}}`
    },
    {
      name: "scaleX",
      phrase: "scale the selected object to be 2 times smaller in the x direction",
      action: `{"scaleX": {"amount": 0.5}}`
    },
    {
      name: "scaleY",
      phrase: "scale the selected object to be 2 times larger in the y direction",
      action: `{"scaleY": {"amount": 2}}`
    },
    {
      name: "scaleZ",
      phrase: "scale the selected object to be 3 times smaller in the z direction",
      action: `{"scaleZ": {"amount": 0.33}}`
    },
    {
      name: "setScaleX",
      phrase: "set the selected object's x scale to 2",
      action: `{"setScaleX": {"amount": 2}}`
    },
    {
      name: "setScaleY",
      phrase: "set the selected object's y scale to 0.5",
      action: `{"setScaleY": {"amount": 0.5}}`
    },
    {
      name: "setScaleZ",
      phrase: "set the selected object's z scale to -3",
      action: `{"setScaleZ": {"amount": -3}}`
    },
    {
      name: "delete",
      phrase: "delete the selected object",
      action: `{"delete": {}}`
    }
  ]
  
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const cosineSimilarity = (a: number[], b: number[]) => {
    const dotProduct = a.reduce((acc, curr, i) => acc + curr * b[i], 0);
    const normA = Math.sqrt(a.reduce((acc, curr) => acc + curr * curr, 0));
    const normB = Math.sqrt(b.reduce((acc, curr) => acc + curr * curr, 0));
    return dotProduct / (normA * normB);
  }

  interface IVectorStoreEntry {
    vector: number[];
    macroId?: Id<"macros">;
    builtInId?: number
  }
  
  const WorldBuilderPage = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef<FreeCamera | null>(null);
    const engineRef = useRef<Engine | null>(null);
    const worldBuilder = useRef<WorldBuilder | null>(null);
    const glbFiles = useRef<File[]>([]);
    const extractorPipelieneRef = useRef<FeatureExtractionPipeline | null>(null);
    const actionVectorStore = useRef<IVectorStoreEntry[]>([]);
    const [_forceUpdate, setForceUpdate] = useState(0);
    const [searchParams] = useSearchParams();
    const worldId = searchParams.get('worldId');
    const [macroScreen, setMacroScreen] = useState(false);
    const [uploadScreen, setUploadScreen] = useState(false);
    const [controlPanelOpen, setControlPanelOpen] = useState(false);
    const macros = useQuery(api.macro.getMacros);
    const aiChatRef = useRef<HTMLTextAreaElement | null>(null);

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

    const loadedWorld = useQuery(api.world.getWorld, worldId ? { id: worldId as Id<'worlds'> } : "skip");

    const constructPrompt = (vectors: IVectorStoreEntry[]) => {
      const contextInstructions: string[] = [];
      for (const vector of vectors) {
        if (vector.macroId !== undefined) {
          const relevantMacro = macros!.find(macro => macro._id === vector.macroId);
          const userPart = relevantMacro!.activationPhrases[0];
          const aiPart = `{"${relevantMacro!.name}":${relevantMacro!.actions[0]}}`;
          contextInstructions.push(`User: ${userPart}\nAI: ${aiPart}`);
        } else if (vector.builtInId !== undefined) {
          const action = builtInActions[vector.builtInId];
          contextInstructions.push(`User: ${action.phrase}\nAI: ${action.action}`);
        }
      }

      let prompt = `
        you have the ability to create json objects correpsonding to user requets
  
        here are some examples
      `

      for (const instruction of contextInstructions) {
        prompt += `\n${instruction}\n`;
      }
  
      prompt += `\nNow respond to the following user request\n`;
      return prompt;
    }

    const generateMacroVectorEntries = async () => { 
      if (extractorPipelieneRef.current === null) { 
        extractorPipelieneRef.current = await pipeline('feature-extraction', 'Xenova/bert-base-uncased', { revision: 'default' });
      }

      for (const macro of macros!) {
        const activationPhrases = macro.activationPhrases;
        const macroId = macro._id;

        for (const phrase of activationPhrases) {
          const vector = (await extractorPipelieneRef.current(phrase, { pooling: 'mean', normalize: true })).tolist()[0];
          actionVectorStore.current.push({ vector, macroId });
        }
      }
    }

    useEffect(() => {
      if (macros) {
        generateMacroVectorEntries();
      }
    }, [macros]);

    const generateBuiltinVectorEntries = async () => {
        if (extractorPipelieneRef.current === null) { 
          extractorPipelieneRef.current = await pipeline('feature-extraction', 'Xenova/bert-base-uncased', { revision: 'default' });
        }

        for (const action of builtInActions) {
          const vector = (await extractorPipelieneRef.current(action.phrase, { pooling: 'mean', normalize: true })).tolist()[0];
          actionVectorStore.current.push({ vector, builtInId: builtInActions.indexOf(action) });
      }
    }

    useEffect(() => {
      generateBuiltinVectorEntries();
    }, []);
  
    useEffect(() => {
      if (canvasRef.current) {
        engineRef.current = new Engine(canvasRef.current, true);
        const scene = new Scene(engineRef.current);
  
        // Create a camera
        cameraRef.current = new FreeCamera('camera1', new Vector3(0, 5, -10), scene);
        cameraRef.current.setTarget(new Vector3(0, 2, 0));
        cameraRef.current.attachControl(canvasRef.current, true);


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
        engineRef.current.runRenderLoop(() => {
          scene.render();
        });
  
        // Handle window resize
        window.addEventListener('resize', () => {
          engineRef.current?.resize();
        });
  
        initializeAI();
        initializeSpeech();
  
        // Cleanup
        return () => {
          scene.dispose();
          engineRef.current?.dispose();
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
      const jsonEnd = response.lastIndexOf("}");
      response = response.substring(jsonStart, jsonEnd + 1);
  
      try {
        const json = JSON.parse(response);
        takeAction(json);
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
      } else if (action["setScaleX"]) {
        worldBuilder.current?.setScaleX(action["setScaleX"]["amount"] as number);
      } else if (action["setScaleY"]) {
        worldBuilder.current?.setScaleY(action["setScaleY"]["amount"] as number);
      }  else if (action["setScaleZ"]) {
        worldBuilder.current?.setScaleY(action["setScaleZ"]["amount"] as number);
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


      const macro = macros?.find(macro => macro.name === name);
      if (!macro) {
        console.log("macro not found", name);
        return;
      }

      const response = await fetch(macro.macroUrl!);
      const macroText = await response.text();
      const macroJson = JSON.parse(macroText);

      const macroEngine = MacroNodeEngine.build(macroJson.nodes, macroJson.inputs, input, new BabylonDecorator(worldBuilder.current!));
      macroEngine.execute();
    }
  
    const handleLoadGLBModel = async (file: File) => {
      if (worldBuilder.current) {
        glbFiles.current.push(file);
        await worldBuilder.current.loadGLBModel(file)
        triggerRerender();
      }
    };
  
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

                    const query = (await extractorPipelieneRef.current!(aiChatText ?? "", { pooling: 'mean', normalize: true })).tolist()[0];

                    // get top three most similar docs
                    const similarities = actionVectorStore.current.map(doc => ({
                      ...doc,
                      similarity: cosineSimilarity(query, doc.vector)
                    }));
                    similarities.sort((a, b) => b.similarity - a.similarity);
                    const topThreeDocs = similarities.slice(0, 3);
                    const contextInformedPropmpt = constructPrompt(topThreeDocs);

                    executeAIChat(aiChatText ?? "", contextInformedPropmpt, parseAIResponse);
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
            <Button onClick={() => setUploadScreen(true)} style={{width: 256, margin: 8}}>
              Upload World
            </Button>
            <Button onClick={() => setMacroScreen(true)} style={{width: 256, margin: 8}}>Macro</Button>
          </div>
        </div>

        <MacroScreen worldBuilder={worldBuilder} close={() => setMacroScreen(false)} shouldShow={macroScreen} />

        <UploadScreen shouldShow={uploadScreen} close={() => setUploadScreen(false)} glbFiles={glbFiles} 
          cameraRef={cameraRef} engineRef={engineRef} worldBuilder={worldBuilder} />
        
      </Container>
    )
  }

  interface IUploadScreenProps {
    shouldShow: boolean;
    close: () => void;
    glbFiles: MutableRefObject<File[]>;
    cameraRef: MutableRefObject<FreeCamera | null>;
    engineRef: MutableRefObject<Engine | null>;
    worldBuilder: MutableRefObject<WorldBuilder | null>;
  }
  const UploadScreen = (props: IUploadScreenProps) => {
    const [name, setName] = useState("");
    const [uploading, setUploading] = useState(false);

    const createWorld = useMutation(api.world.createWorld);
    const generateUploadUrl = useMutation(api.world.generateUploadUrl);

    const handleUploadGLTFX = async () => {
      setUploading(true);

      const screenshotData = await Tools.CreateScreenshotAsync(props.engineRef.current!, props.cameraRef.current!, 1024);

      const imageUploadUrl = await generateUploadUrl();
      const imageBlob = base64StringToBlob(screenshotData.replace("data:image/png;base64,", ""), "image/png");
      const imageResponse = await fetch(imageUploadUrl, {
        method: "POST",
        headers: { "Content-Type": imageBlob.type },
        body: imageBlob,
      });
  
      const imageResult = await imageResponse.json();
      const thumbnailStorageId = imageResult.storageId;

      const uploadUrl = await generateUploadUrl();
      const gltfx = props.worldBuilder.current?.getGlTFX();
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
          const file = props.glbFiles.current.find(file => file.name === asset.uri);
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
      await createWorld({ name: name, glTFXStorageId, thumbnailStorageId, assetUriToStorageIds });
      setUploading(false);
    };

    return (
      <Modal show={props.shouldShow} onHide={props.close}>
        <Modal.Header closeButton>
          <Modal.Title>Upload</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </Form.Group>
          <Button onClick={handleUploadGLTFX} disabled={uploading}>Upload {uploading && <Spinner animation="border" size="sm" />}</Button>
        </Modal.Body>
      </Modal>
    );
  }

  interface IMacroScreenProps {
    worldBuilder: MutableRefObject<WorldBuilder | null>;
    close: () => void;
    shouldShow: boolean;
  }
  const MacroScreen = (props: IMacroScreenProps) => {
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
      <Modal show={props.shouldShow} onHide={props.close}>
        <Modal.Header closeButton>
          <Modal.Title>Macro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
            const macroEngine = MacroNodeEngine.build(macroJson.nodes, macroJson.inputs, inputValues, new BabylonDecorator(props.worldBuilder.current!));
            macroEngine.execute();
          }}>Run</Button>
        </Modal.Body>
      </Modal>
    )
  }
  
  export default WorldBuilderPage;