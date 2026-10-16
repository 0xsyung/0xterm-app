declare module "circomlibjs" {
  export function buildPedersenHash(): Promise<{
    hash: (data: Uint8Array) => Uint8Array;
  }>;
  export function buildBabyjub(): Promise<{
    unpackPoint: (buff: Uint8Array) => [unknown, unknown] | null;
    F: { toObject: (x: unknown) => bigint };
  }>;
}
