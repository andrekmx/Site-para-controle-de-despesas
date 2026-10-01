import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const processes = [
  spawn(process.execPath, [resolve(root, 'Backend/index.js')], { cwd: root, stdio: 'inherit', windowsHide: true }),
  spawn(process.execPath, [resolve(root, 'Frontend/node_modules/vite/bin/vite.js')], { cwd: resolve(root, 'Frontend'), stdio: 'inherit', windowsHide: true }),
]
let stopping = false
/** Encerra os dois processos quando um falha ou o usuário interrompe o comando. */
function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode
  for (const child of processes) child.kill('SIGTERM')
}
for (const child of processes) {
  child.on('error', () => { console.error('Não foi possível iniciar o ambiente local. Execute npm run setup.'); stop(1) })
  child.on('exit', code => stop(code || 0))
}
process.once('SIGINT', () => stop())
process.once('SIGTERM', () => stop())
