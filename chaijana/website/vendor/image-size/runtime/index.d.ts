export interface ISizeCalculationResult {
  height: number;
  width: number;
  type?: string;
  images?: ISizeCalculationResult[];
}

export declare const types: string[];
export declare function disableTypes(disabledTypes: string[]): void;
export declare function imageSize(input: Uint8Array): ISizeCalculationResult;
export default imageSize;
