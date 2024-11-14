import { useCallback } from 'react';
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
  type: ValueType;
}

interface IMacroNodeData {
  label: string;
  type: MacroNodeType;
  outputValues: IValueSocket[];
  inputValues: IValueSocket[];
  inlineInputValues: IValueSocket[];
}

const InputNode: IMacroNodeData = {
  label: 'Input',
  type: MacroNodeType.INPUT,
  outputValues: [],
  inputValues: [],
  inlineInputValues: [],
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

const CustomNode = ({ data }: { data: IMacroNodeData }) => {
  return (
    <div style={{ 
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
            <input type="text" placeholder={"parameter name"} style={{
                  marginLeft: '8px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}/>
            <select>
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
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const handleNodeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nodeType = e.target.value;

    setNodes((nds) => [...nds, {
      id: `${nds.length + 1}`,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: NODE_TYPE_MAP[nodeType]
    }]);
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
              <option value={nodeType}>{nodeType}</option>
            ))}
          </select>

          <Button onClick={() => {
            console.log(nodes);
            console.log(edges);
          }}>
            Save
          </Button>
        </div>
    </div>
    );
  }