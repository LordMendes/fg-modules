/**
 * Registers tsx ESM loader for .ts imports (campaign live modules).
 * Keep Next loaded via createRequire in server.ts to avoid ALS breakage.
 */
import "tsx/esm";
