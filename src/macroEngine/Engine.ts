import { IEngineActionDecorator } from "./Decorator";
import { IEngineNode, StartNodeEngine, Float3NodeEngine, SetPositionNodeEngine, IEngineInput, MacroNodeEngineNode } from "./EngineNodes";
import { IValueSocket, ValueType } from "./MacroNodes";

const NODE_ENGINE_MAP: Record<string, new (node: IEngineNode, engine: MacroNodeEngine, decorator: IEngineActionDecorator) => MacroNodeEngineNode> = {
    'Start': StartNodeEngine,
    'Float3': Float3NodeEngine,
    'SetPosition': SetPositionNodeEngine,
  }

const ACTION_NODE_TYPES = ['SetPosition', 'Start'];
const GETTER_NODE_TYPES = ['Float3'];

export class MacroNodeEngine {
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