"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yeahNah = exports.requestText = exports.writeError = exports.writeWarning = exports.writeText = exports.runChildProc = void 0;
const colors_1 = __importDefault(require("colors"));
const cross_spawn_1 = require("cross-spawn");
const prompt_sync_1 = __importDefault(require("prompt-sync"));
function runChildProc(command, args) {
    const proc = (0, cross_spawn_1.sync)(command, args, {
        // forward all stdin/stdout/stderr to current handlers, with correct interleaving
        stdio: 'inherit',
    });
    if (proc.error) {
        // only happens during invocation error, not error return status
        throw proc.error;
    }
    console.info(`child process  exited with code ${proc.status}`);
}
exports.runChildProc = runChildProc;
const prompter = (0, prompt_sync_1.default)();
const writeText = (text) => console.log(colors_1.default.cyan(text));
exports.writeText = writeText;
const writeWarning = (text) => console.log(colors_1.default.yellow(text));
exports.writeWarning = writeWarning;
const writeError = (text) => console.log(colors_1.default.red(text));
exports.writeError = writeError;
const requestText = (text) => prompter(colors_1.default.cyan(text));
exports.requestText = requestText;
const yeahNah = (question) => prompter(colors_1.default.cyan(`${question} (y/n): `))?.toLowerCase() === 'y';
exports.yeahNah = yeahNah;
