import { randomInt } from "node:crypto";

export const ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const ID_RANDOM_LENGTH = 4;
export const ID_ATTEMPTS = 32;

type RandomIndex = (maximumExclusive: number) => number;

export function encodeTimestamp(timestampSeconds: bigint): string {
  if (timestampSeconds < 0n) throw new RangeError("Timestamp must be nonnegative");
  return timestampSeconds.toString(36).toUpperCase().padStart(6, "0");
}

export function decodeTimestamp(encoded: string): bigint {
  let value = 0n;
  for (const character of encoded) {
    const digit = ID_ALPHABET.indexOf(character);
    if (digit < 0) throw new RangeError("Timestamp is not uppercase Base36");
    value = value * 36n + BigInt(digit);
  }
  return value;
}

export function isValidId(id: unknown): id is string {
  if (typeof id !== "string" || !/^[0-9A-Z]{10,}$/.test(id)) return false;
  const timestamp = id.slice(0, -ID_RANDOM_LENGTH);
  if (timestamp.length < 6 || (timestamp.length > 6 && timestamp.startsWith("0"))) return false;
  decodeTimestamp(timestamp);
  return true;
}

export function generateId(
  timestampSeconds: bigint = BigInt(Math.floor(Date.now() / 1000)),
  chooseIndex: RandomIndex = randomInt,
): string {
  let suffix = "";
  for (let index = 0; index < ID_RANDOM_LENGTH; index += 1) {
    const selected = chooseIndex(ID_ALPHABET.length);
    if (!Number.isInteger(selected) || selected < 0 || selected >= ID_ALPHABET.length) {
      throw new RangeError("Random source returned an invalid Base36 index");
    }
    suffix += ID_ALPHABET[selected];
  }
  return `${encodeTimestamp(timestampSeconds)}${suffix}`;
}

export function generateUniqueId(
  existingIds: ReadonlySet<string>,
  options: {
    timestampSeconds?: bigint;
    chooseIndex?: RandomIndex;
    attempts?: number;
  } = {},
): string {
  const timestampSeconds = options.timestampSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  const chooseIndex = options.chooseIndex ?? randomInt;
  const attempts = options.attempts ?? ID_ATTEMPTS;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = generateId(timestampSeconds, chooseIndex);
    if (!existingIds.has(candidate)) return candidate;
  }
  throw new Error(`Unable to allocate a unique ID after ${attempts} attempts`);
}
