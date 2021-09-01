import { spawn } from 'child_process';

// Run a child process and return a promise with the return code and stdout
export async function run(
  command: string,
  args: readonly string[],
  opts = {}
): Promise<{ stdout: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      stdio: ['pipe', 'pipe', process.stderr],
      ...opts,
    });
    let stdout = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.on('error', reject);
    child.on('exit', (code, _signal) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), code });
      } else {
        const e = new Error('Process exited with error code ' + code) as Error & {
          code: number | null;
        };
        e.code = code;
        reject(e);
      }
    });
  });
}
