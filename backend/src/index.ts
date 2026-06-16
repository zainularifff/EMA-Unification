// This project backend source of truth is ../server.js.
// Keep this compatibility entry so old npm scripts that still call src/index.ts
// run the same Express API instead of a separate lightweight server.
require('../server.js');

export {};
