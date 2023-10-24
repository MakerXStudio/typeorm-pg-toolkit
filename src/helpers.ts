import colors from 'colors'
import { sync } from 'cross-spawn'
import prompt from 'prompt-sync'

export function runChildProc(command: string, args: string[]) {
  const proc = sync(command, args, {
    // forward all stdin/stdout/stderr to current handlers, with correct interleaving
    stdio: 'inherit',
  })

  if (proc.error) {
    // only happens during invocation error, not error return status
    throw proc.error
  }
  console.info(`child process  exited with code ${proc.status}`)
}

const prompter = prompt()
export const writeText = (text: string) => console.log(colors.cyan(text))
export const writeWarning = (text: string) => console.log(colors.yellow(text))
export const writeError = (text: string) => console.log(colors.red(text))
export const requestText = (text: string) => prompter(colors.cyan(text))
export const yeahNah = (question: string) => prompter(colors.cyan(`${question} (y/n): `))?.toLowerCase() === 'y'
