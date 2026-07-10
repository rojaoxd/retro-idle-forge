declare module "lzma" {
  type Callback = (result: number[] | Uint8Array | string, error?: Error | null) => void;
  const LZMA: {
    decompress(bytes: Uint8Array | number[], cb: Callback, progress?: (p: number) => void): void;
    compress(bytes: Uint8Array | number[] | string, mode: number, cb: Callback, progress?: (p: number) => void): void;
  };
  export default LZMA;
}
