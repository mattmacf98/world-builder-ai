import { useCallback } from 'react';
import ReactFlow, { 
  Node, 
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
}

interface IValueSocket {
  id: string;
  type: ValueType;
}

interface IMacroNodeData {
  label: string;
  outputValues: IValueSocket[];
  inputValues: IValueSocket[];
  inlineInputValues: IValueSocket[];
}

const IntNode: IMacroNodeData = {
  label: 'Int',
  outputValues: [{ id: 'value', type: ValueType.INT }],
  inputValues: [],
  inlineInputValues: [{id: 'value', type: ValueType.INT}],
}

const Float3Node: IMacroNodeData = {
  label: 'Float3',
  outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
  inputValues: [],
  inlineInputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
}

const AddIntNode: IMacroNodeData = {
  label: 'AddInt',
  outputValues: [{ id: 'value', type: ValueType.INT }],
  inputValues: [{ id: 'a', type: ValueType.INT }, { id: 'b', type: ValueType.INT }],
  inlineInputValues: [],
}

const NODE_TYPE_MAP: Record<string, IMacroNodeData> = {
  'Int': IntNode,
  'Float3': Float3Node,
  'AddInt': AddIntNode,
};


const CustomNode = ({ data }: { data: IMacroNodeData }) => {
  return (
    <div style={{ 
      border: '1px solid #ccc',
      borderRadius: '8px',
      background: 'white',
      minWidth: '150px',
    }}>
      <div style={{
        background: '#2196f3',
        color: 'white',
        padding: '8px',
        borderTopLeftRadius: '7px',
        borderTopRightRadius: '7px',
        fontWeight: 'bold',
        textAlign: 'center'
      }}>
        {data.label}
      </div>
      
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

interface IMacroNode extends Node<IMacroNodeData> {}

const initialNodes: IMacroNode[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 100, y: 100 },
    data: IntNode
  },
  {
    id: '2',
    type: 'custom',
    position: { x: 300, y: 200 },
    data: AddIntNode
  },
];

export default function Macros() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const isValidConnection = (connection: Connection): boolean => {
    const sourceSocket = connection.sourceHandle;
    const targetSocket = connection.targetHandle;
    if (!sourceSocket || !targetSocket) return false;
    const sourceSocketData = sourceSocket.split('--');
    const targetSocketData = targetSocket.split('--');
    return sourceSocketData && targetSocketData && sourceSocketData[1] === targetSocketData[1];
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
            <option value="">Add a node...</option>
            <option value="Int">Int</option>
            <option value="Float3">Float3</option>
            <option value="AddInt">AddInt</option>
          </select>
        </div>
    </div>
    );
  }