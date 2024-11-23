import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Modal, Form, ListGroup, FormControl } from 'react-bootstrap';
import ReactFlow, { 
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MacroNodeType, ValueType, NODE_TYPE_MAP, IValueSocket } from '../macroEngine/MacroNodes';
import { CustomNode } from '../macroEngine/CustomNode';
import { api } from '../../convex/_generated/api';
import { useMutation } from 'convex/react';

const nodeTypes = {
  custom: CustomNode,
};

export default function Macros() {
  const connectedInSockets = useRef(new Set<string>());
  const connectedFlowOutSockets = useRef(new Set<string>());
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [inputs, setInputs] = useState<{id: string, type: string}[]>([]);
  const [showMacroUploadModal, setShowMacroUploadModal] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [activationPhrase, setActivationPhrase] = useState('');
  const [activationPhrases, setActivationPhrases] = useState<string[]>([]);
  const [inputValues, setInputValues] = useState<{[key: string]: {[key: string]: string}}>({});
  const [contextClick, setContextClick] = useState<{x: number, y: number} | null>(null);

  const createMacro = useMutation(api.macro.createMacro);
  const generateUploadUrl = useMutation(api.world.generateUploadUrl);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setContextClick({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    setInputs(nodes.filter((node) => node.data.type === MacroNodeType.INPUT).map((node) => node.data.inputParameter!));
  }, [nodes]);

  const isValidConnection = (connection: Connection): boolean => {
    const sourceSocket = connection.sourceHandle;
    const targetSocket = connection.targetHandle;
    if (!sourceSocket || !targetSocket) return false;
    const sourceSocketData = sourceSocket.split('--');
    const targetSocketData = targetSocket.split('--');
    return sourceSocketData && targetSocketData && (sourceSocketData[1] === targetSocketData[1] || sourceSocketData[1] === 'dynamic');
  }

  const onConnect = useCallback((params: any) => {
    const toConnectTarget = `${params.target}--${params.targetHandle}`;
    if (connectedInSockets.current.has(toConnectTarget)) {
      return;
    }
    if (params.sourceHandle === 'flow-out') {
      const flowOutSourceToConnect = `${params.source}--${params.sourceHandle}`;
      if (connectedFlowOutSockets.current.has(flowOutSourceToConnect)) {
        return;
      }
      connectedFlowOutSockets.current.add(flowOutSourceToConnect);
    }
    connectedInSockets.current.add(toConnectTarget);
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onEdgesDelete = (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      if (edge.sourceHandle === 'flow-out') {
        connectedFlowOutSockets.current.delete(`${edge.source}--${edge.sourceHandle}`);
      }
      connectedInSockets.current.delete(`${edge.target}--${edge.targetHandle}`);
    }
  }

  const addNode = (nodeType: string) => {

    setNodes((nds) => [...nds, {
      id: `${nds.length + 1}`,
      type: 'custom',
      position: { x: contextClick?.x || 0, y: contextClick?.y || 0 },
      data: JSON.parse(JSON.stringify(NODE_TYPE_MAP[nodeType]))
    }]);
  }

  const getFlowOut = (nodeId: string, nodeIdToNodeIdIndex: Map<string, number>): number | undefined => {
    const edge = edges.find((edge) => edge.source == nodeId && edge.sourceHandle === 'flow-out');
    return edge?.target ? nodeIdToNodeIdIndex.get(edge.target) : undefined;
  }

  const getValueIn = (nodeId: string, valueId: string, valueType: ValueType, nodeIdToNodeIndex: Map<string, number>, nodeIdToInputIndex: Map<string, number>): IValueSocket => {
    const edge = edges.find((edge) => edge.target == nodeId && edge.targetHandle?.startsWith(valueId));
    if (!edge) {
      throw new Error(`Value ${valueId} not found for node ${nodeId}`);
    }

    if (nodeIdToInputIndex.has(edge.source)) {
      return {
        id: valueId,
        inputIndex: nodeIdToInputIndex.get(edge.source),
        type: valueType,
      }
    } else {
      return {
        id: valueId,
        referencedNodeId: nodeIdToNodeIndex.get(edge.source),
        referencedValueId: edge.sourceHandle!.split('--')[0],
        type: valueType,
      }
    }
  }

  const loadInputNode = (parameter: string, parameterType: string, position: {x: number, y:number}) => {
    setNodes((nds) => [...nds, {
      id: `${nds.length + 1}`,
      type: 'custom',
      position: { x: position.x, y:  position.y },
      data: {...JSON.parse(JSON.stringify(NODE_TYPE_MAP["Input"])), inputParameter: {id: parameter, type: parameterType}}
    }]);
  }

  const loadEngineNode = (nodeType: string, inlineInputValues: IValueSocket[], position: {x: number, y:number}) => {
    setNodes((nds) => [...nds, {
      id: `${nds.length + 1}`,
      type: 'custom',
      position: { x: position.x, y:  position.y },
      data: {...JSON.parse(JSON.stringify(NODE_TYPE_MAP[nodeType])), inlineInputValues: inlineInputValues}
    }]);
  }

  const loadFromJson = (json: any) => { 
    const inputNodes = json["inputs"];
    const engineNodes = json["nodes"];

    for (const inputNode of inputNodes) {
      loadInputNode(inputNode.parameter, inputNode.parameterType, inputNode.position);
    }

    for (const engineNode of engineNodes) {
      const inlineInputValues = engineNode.inputValues.filter((value: IValueSocket) => value.inputIndex === undefined && value.referencedNodeId === undefined);
      loadEngineNode(engineNode.type, inlineInputValues, engineNode.position);
    }

    for (let i = 0; i < engineNodes.length; i++) {
      const engineNode = engineNodes[i];
      if (engineNode.outFlow !== undefined) {
        onConnect({ source: `${inputNodes.length + i + 1}`, target: `${inputNodes.length + 1 + engineNode.outFlow}`, sourceHandle: 'flow-out', targetHandle: 'flow-in' });
      }
      for (const engineInputValue of engineNode.inputValues) {
          if (engineInputValue.inputIndex !== undefined) {
            onConnect({ source: `${engineInputValue.inputIndex + 1}`, target: `${inputNodes.length + i + 1}`, sourceHandle: 'value--dynamic', targetHandle: `${engineInputValue.id}--${engineInputValue.type}` });
          }
          if (engineInputValue.referencedNodeId !== undefined) {
            onConnect({ source: `${inputNodes.length + engineInputValue.referencedNodeId + 1}`, target: `${inputNodes.length + i + 1}`, sourceHandle: `${engineInputValue.referencedValueId}--${engineInputValue.type}`, targetHandle: `${engineInputValue.id}--${engineInputValue.type}` });
          }
      }
    }
  }

  const createExecutionJson = () => {
    const inputNodes = nodes.filter((node) => node.data.type === MacroNodeType.INPUT);
    const inputNodeIdToIndex = new Map(
      inputNodes.map((node, index) => [node.id, index])
    );

    const nonInputNodes = nodes.filter((node) => node.data.type !== MacroNodeType.INPUT);
    const nonInputNodeIdToIndex = new Map(
      nonInputNodes.map((node, index) => [node.id, index])
    );

    const inputsJson = inputNodes.map((node) => ({
      position: node.position,
      parameter: node.data.inputParameter!.id,
      parameterType: node.data.inputParameter!.type,
    }));

    const engineNodes = nonInputNodes.map((node) => {
      if (node.data.type === MacroNodeType.ACTION) {
        return {
          position: node.position,
          type: node.data.label,
          inputValues: node.data.inputValues.map((value: IValueSocket) => getValueIn(node.id, value.id, value.type, nonInputNodeIdToIndex, inputNodeIdToIndex)),
          outFlow: getFlowOut(node.id, nonInputNodeIdToIndex),
        }
      } else {
        return {
          position: node.position,
          type: node.data.label,
          inputValues: [...node.data.inlineInputValues, ...node.data.inputValues.map((value: IValueSocket) => getValueIn(node.id, value.id, value.type, nonInputNodeIdToIndex, inputNodeIdToIndex))],
        }
      }
    });

    const executionJson = {
      inputs: inputsJson,
      nodes: engineNodes,
    }

    return JSON.stringify(executionJson, null, 2);
  }

  const handleSaveMacro = async () => {
    const actions: string[] = Object.keys(inputValues).map((phrase) => JSON.stringify(inputValues[phrase]));

    const executionJson = createExecutionJson();

    const uploadUrl = await generateUploadUrl();

    const blob = new Blob([executionJson], { type: 'application/json' });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
    });

    const response = await result.json();
    const macroStorageId = response.storageId;

    await createMacro({ name: macroName, macroStorageId, activationPhrases: activationPhrases, actions: actions });

    setShowMacroUploadModal(false);
  }
  
    return (
      <div style={{ width: '100vw', height: '95vh', display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
          >
            <Background />
            <Controls />
            <Button style={{position: "absolute", right: 32, bottom: 32, cursor: "pointer", zIndex: 999}} onClick={() => setShowMacroUploadModal(true)}>
              Create
            </Button>
          </ReactFlow>
        </div>

        {
          contextClick && <AddMacroOverlay x={contextClick.x} y={contextClick.y} close={() => setContextClick(null)} addNode={addNode} />
        }

        <Modal show={showMacroUploadModal} onHide={() => setShowMacroUploadModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Save Macro</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Macro Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter macro name"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Activation Phrase (press enter to add)</Form.Label>
                <Form.Control
                  type="text"
                  value={activationPhrase}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActivationPhrases([...activationPhrases, activationPhrase]);
                      setActivationPhrase('');
                    }
                  }}
                  onChange={(e) => {
                    setActivationPhrase(e.target.value);
                  }}
                  placeholder="Enter activation phrases"
                />
              </Form.Group>
            </Form>
            <ListGroup>
              {activationPhrases.map((phrase) => (
                <ListGroup.Item key={phrase}>
                  "{phrase}"
                  <div style={{marginLeft: '16px'}}></div>
                  <p>
                    <span style={{fontWeight: 'bold'}}>{macroName}</span>:
                    {inputs.map((value) => (
                      <span key={value.id}>
                        <span>{value.id}</span>:
                        <input style={{width: '50px'}} type="text" value={inputValues[phrase]?.[value.id] || ''} onChange={(e) => setInputValues({...inputValues, [phrase]: {...inputValues[phrase], [value.id]: e.target.value}  })} />
                      </span>
                    ))}
                  </p>
                  <Button 
                    variant="link" 
                    className="float-end" 
                    onClick={() => setActivationPhrases(activationPhrases.filter(p => p !== phrase))}
                    style={{padding: '0', color: '#666', textDecoration: 'none'}}
                  >
                    x
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleSaveMacro} disabled={macroName.length === 0 || activationPhrases.length === 0}>
              Save Macro
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }



interface IAddMacroOverlayProps {
  x: number;
  y: number;
  close(): void;
  addNode(nodeType: string): void;
}
const AddMacroOverlay = (props: IAddMacroOverlayProps) => {
  const [searchText, setSearchText] = useState('');

  return (
    <div style={{ position: 'absolute', left: props.x, top: props.y, padding:'16px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', maxHeight: '400px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5>Add Macro</h5>
        <Button variant="link" onClick={props.close} style={{ padding: '0', color: '#666', textDecoration: 'none' }}>
          <h4>X</h4>
        </Button>
      </div>
      <FormControl
        type="text"
        placeholder="Search..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: '16px' }}
      />
      {Object.keys(NODE_TYPE_MAP)
        .filter((nodeType) => nodeType.toLowerCase().includes(searchText.toLowerCase()))
        .map((nodeType) => (
          <div key={nodeType} style={{ padding: '8px 0', borderBottom: '1px solid #ccc' }} onClick={() => {
            props.addNode(nodeType);
            props.close();
          }}>
            {nodeType}
          </div>
        ))}
    </div>
  );
};