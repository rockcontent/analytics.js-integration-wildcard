export type Callback = (...args: any[]) => void;

export interface IWildcardOptions {
  endpoint: string;
  maxPayloadSize?: number;
}
