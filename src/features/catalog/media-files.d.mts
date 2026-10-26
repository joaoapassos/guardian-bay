import type { Buffer } from "node:buffer";
export function mediaDirectory(): Promise<string>;
export function storeMedia(key: string, bytes: Buffer): Promise<void>;
export function loadMedia(key: string): Promise<Buffer>;
export function removeMedia(key: string): Promise<void>;
export function removeTemporaryMedia(key: string): Promise<void>;
