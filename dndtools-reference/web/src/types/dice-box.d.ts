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
