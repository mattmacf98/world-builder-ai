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

export class IntNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._inputValues.value;
  }
}

export class Float3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.x, this._inputValues.y, this._inputValues.z];
  }
}

export class DivideFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.a[0] / this._inputValues.b[0], this._inputValues.a[1] / this._inputValues.b[1], this._inputValues.a[2] / this._inputValues.b[2]];
  }
}

export class MultiplyFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.a[0] * this._inputValues.b[0], this._inputValues.a[1] * this._inputValues.b[1], this._inputValues.a[2] * this._inputValues.b[2]];
  }
}

export class Float4NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.w, this._inputValues.x, this._inputValues.y, this._inputValues.z];
  }
}

export class FloatNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._inputValues.value;
  }
}

export class ConstructFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.x, this._inputValues.y, this._inputValues.z];
  }
}

export class DestructFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.x = this._inputValues.value[0];
    this._outputValues.y = this._inputValues.value[1];
    this._outputValues.z = this._inputValues.value[2];
  }
}

export class AddIntNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._inputValues.a + this._inputValues.b;
  }
}

export class SubIntNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._inputValues.a - this._inputValues.b;
  }
}

export class AddFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    console.log(this._inputValues.a, this._inputValues.b);
    this._outputValues.value = [this._inputValues.a[0] + this._inputValues.b[0], this._inputValues.a[1] + this._inputValues.b[1], this._inputValues.a[2] + this._inputValues.b[2]];
  }
}

export class SubFloat3NodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = [this._inputValues.a[0] - this._inputValues.b[0], this._inputValues.a[1] - this._inputValues.b[1], this._inputValues.a[2] - this._inputValues.b[2]];
  }
}

export class GetPositionNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._decorator.getObjectPosition(this._inputValues.objectIndex);
  }
}

export class SetPositionNodeEngine extends MacroNodeEngineNode {
    protected _execute(): void {
      this._decorator.setObjectPosition(this._inputValues.objectIndex, this._inputValues.position);
    }
}

export class GetRotationNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._decorator.getObjectRotation(this._inputValues.objectIndex);
  }
}

export class SetRotationNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._decorator.setObjectRotation(this._inputValues.objectIndex, this._inputValues.rotation);
  }
}

export class GetScaleNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.value = this._decorator.getObjectScale(this._inputValues.objectIndex);
  }
}

export class SetScaleNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._decorator.setObjectScale(this._inputValues.objectIndex, this._inputValues.scale);
  }
}

export class GetBoundingBoxNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    const {max, min} = this._decorator.getObjectBoundingBox(this._inputValues.objectIndex);
    this._outputValues.max = max;
    this._outputValues.min = min;
  }
}

export class AddBoxNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.objectIndex = this._decorator.addBox();
  }
}

export class AddSphereNodeEngine extends MacroNodeEngineNode {
  protected _execute(): void {
    this._outputValues.objectIndex = this._decorator.addSphere();
  }
}