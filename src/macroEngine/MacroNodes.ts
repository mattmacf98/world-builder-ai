export enum ValueType {
    INT = 'int',
    FLOAT = 'float',
    FLOAT_3 = 'float3',
    FLOAT_4 = 'float4',
}

export enum MacroNodeType {
    ACTION = 'action',
    GETTER = 'getter',
    INPUT = 'input',
}

export interface IValueSocket {
    id: string;
    value?: any,
    referencedNodeId?: number,
    referencedValueId?: string,
    inputIndex?: number,
    type: ValueType;
}

export interface IMacroNodeData {
    label: string;
    type: MacroNodeType;
    outputValues: IValueSocket[];
    inputValues: IValueSocket[];
    inlineInputValues: IValueSocket[];
    inputParameter?: IValueSocket;
  }
  
export const InputNode: IMacroNodeData = {
    label: 'Input',
    type: MacroNodeType.INPUT,
    outputValues: [],
    inputValues: [],
    inlineInputValues: [],
    inputParameter: {id: 'value', type: ValueType.INT},
  }
  
export const StartNode: IMacroNodeData = {
    label: 'Start',
    type: MacroNodeType.ACTION,
    outputValues: [],
    inputValues: [],
    inlineInputValues: [],
  }
  
export const IntNode: IMacroNodeData = {
    label: 'Int',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.INT }],
    inputValues: [],
    inlineInputValues: [{id: 'value', type: ValueType.INT}],
  }
  
export const Float3Node: IMacroNodeData = {
    label: 'Float3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [],
    inlineInputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
  }
  
export const DivideFloat3Node: IMacroNodeData = {
    label: 'DivideFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'a', type: ValueType.FLOAT_3}, {id: 'b', type: ValueType.FLOAT_3}],
    inlineInputValues: [],
  }
  
export const MultiplyFloat3Node: IMacroNodeData = {
    label: 'MultiplyFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'a', type: ValueType.FLOAT_3}, {id: 'b', type: ValueType.FLOAT_3}],
    inlineInputValues: [],
  }
  
export const Float4Node: IMacroNodeData = {
    label: 'Float4',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_4 }],
    inputValues: [],
    inlineInputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}, {id: 'w', type: ValueType.FLOAT}],
  }
  
export const FloatNode: IMacroNodeData = {
    label: 'Float',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT }],
    inputValues: [],
    inlineInputValues: [{id: 'value', type: ValueType.FLOAT}],
  }
  
export const ConstructFloat3Node: IMacroNodeData = {
    label: 'ConstructFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
    inlineInputValues: [],
  }
  
export const DestructFloat3Node: IMacroNodeData = {
    label: 'DestructFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{id: 'x', type: ValueType.FLOAT}, {id: 'y', type: ValueType.FLOAT}, {id: 'z', type: ValueType.FLOAT}],
    inputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inlineInputValues: [],
  }
  
export const AddIntNode: IMacroNodeData = {
    label: 'AddInt',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.INT }],
    inputValues: [{ id: 'a', type: ValueType.INT }, { id: 'b', type: ValueType.INT }],
    inlineInputValues: [],
  }
  
export const SubIntNode: IMacroNodeData = {
    label: 'SubInt',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.INT }],
    inputValues: [{ id: 'a', type: ValueType.INT }, { id: 'b', type: ValueType.INT }],
    inlineInputValues: [],
  }
  
export const AddFloat3Node: IMacroNodeData = {
    label: 'AddFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{ id: 'a', type: ValueType.FLOAT_3 }, { id: 'b', type: ValueType.FLOAT_3 }],
    inlineInputValues: [],
  }
  
export const SubFloat3Node: IMacroNodeData = {
    label: 'SubFloat3',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{ id: 'a', type: ValueType.FLOAT_3 }, { id: 'b', type: ValueType.FLOAT_3 }],
    inlineInputValues: [],
  }
  
export const GetPositionNode: IMacroNodeData = {
    label: 'GetPosition',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}],
    inlineInputValues: [],
  }
  
export const SetPositionNode: IMacroNodeData = {
    label: 'SetPosition',
    type: MacroNodeType.ACTION,
    outputValues: [],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'position', type: ValueType.FLOAT_3}],
    inlineInputValues: [],
  }
  
export const GetRotationNode: IMacroNodeData = {
    label: 'GetRotation',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_4 }],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}],
    inlineInputValues: [],
  }
  
export const SetRotationNode: IMacroNodeData = {
    label: 'SetRotation',
    type: MacroNodeType.ACTION,
    outputValues: [],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'rotation', type: ValueType.FLOAT_4}],
    inlineInputValues: [],
  }
  
export const GetScaleNode: IMacroNodeData = {
    label: 'GetScale',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'value', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}],
    inlineInputValues: [],
  }
  
export const SetScaleNode: IMacroNodeData = {
    label: 'SetScale',
    type: MacroNodeType.ACTION,
    outputValues: [],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}, {id: 'scale', type: ValueType.FLOAT_3}],
    inlineInputValues: [],
  }
  
export const GetBoundingBoxNode: IMacroNodeData = {
    label: 'GetBoundingBox',
    type: MacroNodeType.GETTER,
    outputValues: [{ id: 'max', type: ValueType.FLOAT_3 }, { id: 'min', type: ValueType.FLOAT_3 }],
    inputValues: [{id: 'objectIndex', type: ValueType.INT}],
    inlineInputValues: [],
  }

export const AddBoxNode: IMacroNodeData = {
    label: 'AddBox',
    type: MacroNodeType.ACTION,
    outputValues: [{ id: 'objectIndex', type: ValueType.INT }],
    inputValues: [],
    inlineInputValues: [],
}

export const AddSphereNode: IMacroNodeData = {
    label: 'AddSphere',
    type: MacroNodeType.ACTION,
    outputValues: [{ id: 'objectIndex', type: ValueType.INT }],
    inputValues: [],
    inlineInputValues: [],
}
  
export const NODE_TYPE_MAP: Record<string, IMacroNodeData> = {
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
    'AddBox': AddBoxNode,
    'AddSphere': AddSphereNode,
  };