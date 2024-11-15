import { IEngineActionDecorator } from "./Decorator";
import { MacroNodeEngine } from "./Engine";
import { ValueType, IValueSocket } from "./MacroNodes";

export interface IEngineInput {
    parameter: string;
    parameterType: ValueType;
    value?: any;
}

export interface IEngineNode {
    type: string;
    inputValues: IValueSocket[];
    outFlow?: number;
}

export abstract class MacroNodeEngineNode {
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

export class StartNodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      // do nothing
    }
  }

export class Float3NodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      this._outputValues.value = [this._inputValues.x, this._inputValues.y, this._inputValues.z];
    }
  }

export class SetPositionNodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      this._decorator.setObjectPosition(this._inputValues.objectIndex, this._inputValues.position);
    }
  }