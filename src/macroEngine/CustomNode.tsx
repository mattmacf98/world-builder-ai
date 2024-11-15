import { Handle, Position } from "reactflow"
import { MacroNodeType, IMacroNodeData, ValueType } from "./MacroNodes";

const MacroNodeTypeToColor: Record<MacroNodeType, string> = {
    [MacroNodeType.ACTION]: '#f2a90a',
    [MacroNodeType.GETTER]: '#2196f3',
    [MacroNodeType.INPUT]: '#4CAF50',
  }
  
export const CustomNode = ({ data, id }: { data: IMacroNodeData, id: string }) => {
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