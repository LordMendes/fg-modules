declare module "@3d-dice/dice-box" {
  type DiceBoxConfig = Record<string, unknown>;

  export default class DiceBox {
    constructor(config?: DiceBoxConfig);
    init(): Promise<this>;
    roll(notation: string | object | string[]): Promise<unknown>;
    add(notation: string | object | string[]): Promise<unknown>;
    clear(): void;
    hide(className?: string): this;
    show(): this;
    updateConfig(config: DiceBoxConfig): Promise<unknown>;
    onRollComplete: ((results: unknown) => void) | null;
    onDieComplete: ((die: unknown) => void) | null;
    onBeforeRoll: ((notation: unknown) => void) | null;
  }
}

declare module "@3d-dice/dice-box-threejs" {
  type DiceBoxThreejsConfig = Record<string, unknown>;

  export default class DiceBox {
    constructor(selector: string, config?: DiceBoxThreejsConfig);
    initialize(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    add(notation: string): Promise<unknown>;
    clearDice(): void;
    getDiceResults(): unknown;
    updateConfig(config: DiceBoxThreejsConfig): Promise<void>;
    DiceFactory: {
      create: (type: string) => unknown;
      applyColorSet: (set: unknown) => void;
    };
    DiceColors: {
      makeColorSet: (config: Record<string, unknown>) => Promise<unknown>;
    };
    colorData: unknown;
    theme_customColorset?: Record<string, unknown> | null;
    desk?: { visible: boolean; material?: { opacity: number; transparent?: boolean } };
    renderer?: { domElement: HTMLCanvasElement };
    onRollComplete: ((results: unknown) => void) | (() => void);
  }
}
