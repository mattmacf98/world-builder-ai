import { useCallback, useRef } from 'react';
import { Button } from 'react-bootstrap';
import ReactFlow, { 
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Connection,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

enum ValueType {
  INT = 'int',
  FLOAT = 'float',
  FLOAT_3 = 'float3',
  FLOAT_4 = 'float4',
}

enum MacroNodeType {
  ACTION = 'action',
  GETTER = 'getter',
  INPUT = 'input',
}

interface IValueSocket {
  id: string;
  value?: any,
  referencedNodeId?: number,
  referencedValueId?: string,
  inputIndex?: number,
  type: ValueType;
}

interface IMacroNodeData {
  label: string;
  type: MacroNodeType;
  outputValues: IValueSocket[];
  inputValues: IValueSocket[];
  inlineInputValues: IValueSocket[];
  inputParameter?: IValueSocket;
}

const InputNode: IMacroNodeData = {
  label: 'Input',
  type: MacroNodeType.INPUT,
  outputValues: [],
  inputValues: [],
  inlineInputValues: [],
  inputParameter: {id: 'value', type: ValueType.INT},
}

const StartNode: IMacroNodeData = {
  label: 'Start',
  type: MacroNodeType.ACTION,
  outputValues: [],
  inputValues: [],
  inlineInputValues: [],
}

const IntNode: IMacroNodeData = {
  label: 'Int',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.INT }],
  inputValues: [],
  inlineInputValues: [{id: 'value', type: ValueType.INT}],
}

const Float3Node: IMacroNodeData = {
  label: 'Float3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [],
  inlineInputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
}

const DivideFloat3Node: IMacroNodeData = {
  label: 'DivideFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'a', type: ValueType.FLOAT_3}, {id: 'b', type: ValueType.FLOAT_3}],
  inlineInputValues: [],
}

const MultiplyFloat3Node: IMacroNodeData = {
  label: 'MultiplyFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'a', type: ValueType.FLOAT_3}, {id: 'b', type: ValueType.FLOAT_3}],
  inlineInputValues: [],
}

const Float4Node: IMacroNodeData = {
  label: 'Float4',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_4 }],
  inputValues: [],
  inlineInputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}, {id: 'w', type: ValueType.FLOAT}],
}

const FloatNode: IMacroNodeData = {
  label: 'Float',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT }],
  inputValues: [],
  inlineInputValues: [{id: 'value', type: ValueType.FLOAT}],
}

const ConstructFloat3Node: IMacroNodeData = {
  label: 'ConstructFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
  inlineInputValues: [],
}

const DestructFloat3Node: IMacroNodeData = {
  label: 'DestructFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
  inputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inlineInputValues: [],
}

const AddIntNode: IMacroNodeData = {
  label: 'AddInt',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.INT }],
  inputValues: [{ id: 'a', type: ValueType.INT }, { id: 'b', type: ValueType.INT }],
  inlineInputValues: [],
}

const SubIntNode: IMacroNodeData = {
  label: 'SubInt',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.INT }],
  inputValues: [{ id: 'a', type: ValueType.INT }, { id: 'b', type: ValueType.INT }],
  inlineInputValues: [],
}

const AddFloat3Node: IMacroNodeData = {
  label: 'AddFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{ id: 'a', type: ValueType.FLOAT_3 }, { id: 'b', type: ValueType.FLOAT_3 }],
  inlineInputValues: [],
}

const SubFloat3Node: IMacroNodeData = {
  label: 'SubFloat3',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{ id: 'a', type: ValueType.FLOAT_3 }, { id: 'b', type: ValueType.FLOAT_3 }],
  inlineInputValues: [],
}

const GetPositionNode: IMacroNodeData = {
  label: 'GetPosition',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}],
  inlineInputValues: [],
}

const SetPositionNode: IMacroNodeData = {
  label: 'SetPosition',
  type: MacroNodeType.ACTION,
  outputValues: [],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'position', type: ValueType.FLOAT_3}],
  inlineInputValues: [],
}

const GetRotationNode: IMacroNodeData = {
  label: 'GetRotation',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_4 }],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}],
  inlineInputValues: [],
}

const SetRotationNode: IMacroNodeData = {
  label: 'SetRotation',
  type: MacroNodeType.ACTION,
  outputValues: [],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'rotation', type: ValueType.FLOAT_4}],
  inlineInputValues: [],
}

const GetScaleNode: IMacroNodeData = {
  label: 'GetScale',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}],
  inlineInputValues: [],
}

const SetScaleNode: IMacroNodeData = {
  label: 'SetScale',
  type: MacroNodeType.ACTION,
  outputValues: [],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'scale', type: ValueType.FLOAT_3}],
  inlineInputValues: [],
}

const GetBoundingBoxNode: IMacroNodeData = {
  label: 'GetBoundingBox',
  type: MacroNodeType.GETTER,
  outputValues: [{ id: 'max', type: ValueType.FLOAT_3 }, { id: 'min', type: ValueType.FLOAT_3 }],
  inputValues: [{id: 'objectIndex', type: ValueType.INT}],
  inlineInputValues: [],
}

const NODE_TYPE_MAP: Record<string, IMacroNodeData> = {
  'Start': StartNode,
  'Int': IntNode,
  'Float': FloatNode,
  'Float3': Float3Node,
  'Float4': Float4Node,
  'AddInt': AddIntNode,
  'SubInt': SubIntNode,
  'AddFloat3': AddFloat3Node,
  'SubFloat3': SubFloat3Node,
  'GetPosition': GetPositionNode,
  'ConstructFloat3': ConstructFloat3Node,
  'DestructFloat3': DestructFloat3Node,
  'GetBoundingBox': GetBoundingBoxNode,
  'SetPosition': SetPositionNode,
  'SetRotation': SetRotationNode,
  'SetScale': SetScaleNode,
  'GetRotation': GetRotationNode,
  'GetScale': GetScaleNode,
  'DivideFloat3': DivideFloat3Node,
  'MultiplyFloat3': MultiplyFloat3Node,
  'Input': InputNode,
};


const MacroNodeTypeToColor: Record<MacroNodeType, string> = {
  [MacroNodeType.ACTION]: '#f2a90a',
  [MacroNodeType.GETTER]: '#2196f3',
  [MacroNodeType.INPUT]: '#4CAF50',
}

const CustomNode = ({ data, id }: { data: IMacroNodeData, id: string }) => {
  return (
    <div key={id} style={{ 
      border: '1px solid #ccc',
      borderRadius: '8px',
      background: 'white',
      minWidth: '150px',
    }}>
      <div style={{
        background: MacroNodeTypeToColor[data.type],
        color: 'white',
        padding: '8px',
        borderTopLeftRadius: '7px',
        borderTopRightRadius: '7px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        {data.label}
      </div>

      {data.type === MacroNodeType.ACTION && (
         <div style={{ padding: '8px' }}>
          <div style={{ 
            fontSize: '0.8em', 
            color: '#666',
            borderBottom: '1px solid #eee',
            marginBottom: '8px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {data.label !== 'Start' && <Handle type="target" position={Position.Left} style={{ left: '-8px' }} id="flow-in" />}
            Flow
            <Handle type="source" position={Position.Right} style={{ right: '-8px' }} id="flow-out" />
          </div>
        </div>
      )}

      {data.type === MacroNodeType.INPUT && (
        <div style={{ padding: '8px' }}>
          <div style={{ 
            fontSize: '0.8em', 
            color: '#666',
            borderBottom: '1px solid #eee',
            marginBottom: '8px'
          }}>
            <input type="text" placeholder={"parameter name"} defaultValue={data.inputParameter!.id} style={{
                  marginLeft: '8px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
            }} onChange={(e) => {
              data.inputParameter!.id = e.target.value;
            }}/>
            <select defaultValue={data.inputParameter!.type} onChange={(e) => {
              const valueType = e.target.value as ValueType;
              data.inputParameter!.type = valueType;
            }}>
              <option value={ValueType.INT}>Int</option>
              <option value={ValueType.FLOAT}>Float</option>
              <option value={ValueType.FLOAT_3}>Float3</option>
              <option value={ValueType.FLOAT_4}>Float4</option>
            </select>
          </div>

          <div style={{ 
            fontSize: '0.8em', 
            color: '#666',
            borderBottom: '1px solid #eee',
            marginBottom: '8px'
          }}>
            Outputs
          </div>
          <div key={"value"} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'relative',
            marginBottom: '8px'
          }}>
            <span style={{ marginRight: '8px' }}>value</span>
            <Handle type="source" position={Position.Right} style={{ right: '-8px' }} id={`value--dynamic`} />
          </div>
        </div>
      )}

      {(data.inputValues.length > 0 || data.inlineInputValues.length > 0) && (
        <div style={{ padding: '8px' }}>
          <div style={{ 
            fontSize: '0.8em', 
            color: '#666',
            borderBottom: '1px solid #eee',
            marginBottom: '8px'
          }}>
            Inputs
          </div>
          {data.inlineInputValues.map((value) => (
            <div key={value.id} style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              marginBottom: '8px'
            }}>
              <input type="text" placeholder={value.id} style={{
                  marginLeft: '8px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }} onChange={(e) => {
                  value.value = e.target.value;
                }}/>
            </div>
          ))}
          {data.inputValues.map((value) => (
            <div key={value.id} style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              marginBottom: '8px'
            }}>
              <Handle type="target" position={Position.Left} style={{ left: '-8px' }} id={`${value.id}--${value.type}`} />
              <span style={{ marginLeft: '8px' }}>{value.id}</span>
            </div>
          ))}
        </div>
      )}
      
      {data.outputValues.length > 0 && (
        <div style={{ padding: '8px' }}>
          <div style={{ 
            fontSize: '0.8em', 
            color: '#666',
            borderBottom: '1px solid #eee',
            marginBottom: '8px'
          }}>
            Outputs
          </div>
          {data.outputValues.map((value) => (
            <div key={value.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              position: 'relative',
              marginBottom: '8px'
            }}>
              <span style={{ marginRight: '8px' }}>{value.id}</span>
              <Handle type="source" position={Position.Right} style={{ right: '-8px' }} id={`${value.id}--${value.type}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function Macros() {
  const connectedInSockets = useRef(new Set<string>());
  const connectedFlowOutSockets = useRef(new Set<string>());
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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
      edges: edges,
    }

    const engine = MacroNodeEngine.build(executionJson.nodes, executionJson.inputs, {'index': 4}, new LogDecorator());
    engine.execute();
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

          <Button onClick={createExecutionJson}>
            Save
          </Button>
        </div>
    </div>
    );
  }


  interface IEngineInput {
    parameter: string;
    parameterType: ValueType;
    value?: any;
  }

  interface IEngineNode {
    type: string;
    inputValues: IValueSocket[];
    outFlow?: number;
  }

  abstract class MacroNodeEngineNode {
    private _node: IEngineNode;
    private _engine: MacroNodeEngine;
    protected _decorator: IEngineActionDecorator;
    protected _outputValues: Record<string, any>;
    protected _inputValues: Record<string, any>;

    constructor(node: IEngineNode, engine: MacroNodeEngine, decorator: IEngineActionDecorator) {
      this._node = node;
      this._engine = engine;
      this._decorator = decorator;
      this._outputValues = {};
      this._inputValues = {};
    }
    
    public getOutputValue(id: string) {
      return this._outputValues[id];
    }

    public get type() {
      return this._node.type;
    }

    public execute() {
      this._inputValues = this._engine.evaluateInputValueSockets(this._node.inputValues);
 
      this._execute();

      if (this._node.outFlow !== undefined) {
        this._engine.triggerNextFlow(this._node.outFlow);
      }
    }

    protected abstract _execute(): void;
  }

  class StartNodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      // do nothing
    }
  }

  class Float3NodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      this._outputValues.value = [this._inputValues.x, this._inputValues.y, this._inputValues.z];
    }
  }

  class SetPositionNodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      this._decorator.setObjectPosition(this._inputValues.objectIndex, this._inputValues.position);
    }
  }

  const NODE_ENGINE_MAP: Record<string, new (node: IEngineNode, engine: MacroNodeEngine, decorator: IEngineActionDecorator) => MacroNodeEngineNode> = {
    'Start': StartNodeEngine,
    'Float3': Float3NodeEngine,
    'SetPosition': SetPositionNodeEngine,
  }

  const ACTION_NODE_TYPES = ['SetPosition', 'Start'];
  const GETTER_NODE_TYPES = ['Float3'];

  class MacroNodeEngine {
    private _nodes: IEngineNode[];
    private _inputs: IEngineInput[];
    private _engineNodes: MacroNodeEngineNode[];
    private _decorator: IEngineActionDecorator;

    public static build(nodes: IEngineNode[], inputs: IEngineInput[], inputValues: Record<string, any>, decorator: IEngineActionDecorator): MacroNodeEngine {

      for (const input of inputs) {
        if (inputValues[input.parameter] === undefined) {
          throw new Error(`Input ${input.parameter} not found`);
        }
        input.value = inputValues[input.parameter];
      }

      return new MacroNodeEngine(nodes, inputs, decorator);
    }

    public evaluateInputValueSockets(valueSockets: IValueSocket[]): Record<string, any> {
      const result: Record<string, any> = {};
      for (const valueSocket of valueSockets) {
        result[valueSocket.id] = this._evaluateInputValueSocket(valueSocket);
      }
      return result;
    }

    private _evaluateInputValueSocket(valueSocket: IValueSocket): any {
      //TODO: add caching
      if (valueSocket.value !== undefined) {
        return this._parseValue(valueSocket.value, valueSocket.type);
      } else if (valueSocket.inputIndex !== undefined) {
        return this._parseValue(this._inputs[valueSocket.inputIndex].value, valueSocket.type);
      } else if (valueSocket.referencedNodeId !== undefined) {
        const referencedNode = this._engineNodes[valueSocket.referencedNodeId];
        if (referencedNode.getOutputValue(valueSocket.referencedValueId!) === undefined) {
          this._triggerGetterNode(valueSocket.referencedNodeId);
        }
        return this._parseValue(referencedNode.getOutputValue(valueSocket.referencedValueId!), valueSocket.type);
      }
    }

    private _triggerGetterNode(nodeId: number) {
      const node = this._engineNodes[nodeId];
      if (!GETTER_NODE_TYPES.includes(node.type)) {
        throw new Error(`Node ${nodeId} (${node.type}) is not a getter`);
      }
      node.execute();
    }

    public triggerNextFlow(nodeId: number) {
      const node = this._engineNodes[nodeId];
      if (!ACTION_NODE_TYPES.includes(node.type)) {
        throw new Error(`Node ${nodeId} (${node.type}) is not an action`);
      }
      node.execute();
    }

    private _parseValue(value: any, type: ValueType): any {
      switch (type) {
        case ValueType.INT:
          return parseInt(value);
        case ValueType.FLOAT:
          return parseFloat(value);
        case ValueType.FLOAT_3:
          return value;
      }
    }

    public execute() {
      const startNode = this._nodes.find((node) => node.type === 'Start');
      if (!startNode) {
        throw new Error('Start node not found');
      }

      this._engineNodes = this._nodes.map((node) => new NODE_ENGINE_MAP[node.type](node, this, this._decorator));
      const startEngineNode = this._engineNodes.find((node) => node.type === 'Start');
      startEngineNode?.execute();
    }

    private constructor(nodes: IEngineNode[], inputs: IEngineInput[], decorator: IEngineActionDecorator) {
      this._nodes = nodes;
      this._inputs = inputs;
      this._engineNodes = [];
      this._decorator = decorator;
    }
  }

  interface IEngineActionDecorator {
    setObjectPosition(objectIndex: number, position: [number, number, number]): void;
  }

  class LogDecorator implements IEngineActionDecorator {
    setObjectPosition(objectIndex: number, position: [number, number, number]): void {
      console.log(`Set object ${objectIndex} position to ${position}`);
    }
  }