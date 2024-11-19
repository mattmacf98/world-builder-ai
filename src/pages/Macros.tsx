import { useCallback, useRef, useState } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';
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
  const [showMacroUploadModal, setShowMacroUploadModal] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [activationPhrases, setActivationPhrases] = useState('');

  const createMacro = useMutation(api.macro.createMacro);
  const generateUploadUrl = useMutation(api.world.generateUploadUrl);

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

  const handleNodeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeType = e.target.value;

    setNodes((nds) => [...nds, {
      id: `${nds.length + 1}`,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: NODE_TYPE_MAP[nodeType]
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
      parameter: node.data.inputParameter!.id,
      parameterType: node.data.inputParameter!.type,
    }));

    const engineNodes = nonInputNodes.map((node) => {
      if (node.data.type === MacroNodeType.ACTION) {
        return {
          type: node.data.label,
          inputValues: node.data.inputValues.map((value: IValueSocket) => getValueIn(node.id, value.id, value.type, nonInputNodeIdToIndex, inputNodeIdToIndex)),
          outFlow: getFlowOut(node.id, nonInputNodeIdToIndex),
        }
      } else {
        return {
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

    await createMacro({ name: macroName, macroStorageId, activationPhrases: activationPhrases.split('\n') });

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
          </ReactFlow>
        </div>
        <div style={{ 
          width: '300px',
          backgroundColor: 'white',
          borderLeft: '1px solid #ccc',
          borderRadius: '8px 0 0 8px',
          margin: '16px 32px 16px 0',
          boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
        }}>
          <select 
            onChange={(handleNodeSelect)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            {Object.keys(NODE_TYPE_MAP).map((nodeType) => (
              <option key={nodeType} value={nodeType}>{nodeType}</option>
            ))}
          </select>

          <Button onClick={() => setShowMacroUploadModal(true)}>
            Save
          </Button>
        </div>

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
                <Form.Label>Activation Phrases (one per line)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={activationPhrases}
                  onChange={(e) => setActivationPhrases(e.target.value)}
                  placeholder="Enter activation phrases"
                />
              </Form.Group>
            </Form>
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