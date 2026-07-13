import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

const BIN = resolve(process.cwd(), 'dist/index.js');

async function runCli(args: string[]) {
  return await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolveResult) => {
    const proc = spawn('node', [BIN, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout.on('data', (c) => out.push(c));
    proc.stderr.on('data', (c) => err.push(c));
    proc.on('close', (code) => resolveResult({
      stdout: Buffer.concat(out).toString(),
      stderr: Buffer.concat(err).toString(),
      code,
    }));
  });
}

describe('variadic -m metrics flags', () => {
  it('accepts multiple -m flags without comma separation', async () => {
    const { stderr } = await runCli([
      'report', 'run',
      '-m', 'activeUsers',
      '-m', 'sessions',
      '-p', '0',
      '-f', 'json',
    ]);
    expect(stderr).not.toMatch(/INVALID_ARGUMENT.*comma/);
    expect(stderr).not.toMatch(/comma-separated/);
  });

  it('fails cleanly when no metrics provided', async () => {
    const { stderr } = await runCli(['report', 'run', '-p', '0']);
    expect(stderr).toMatch(/required option.*--metrics/);
  });

  it('handles single -m flag', async () => {
    const { stderr } = await runCli([
      'report', 'run',
      '-m', 'activeUsers',
      '-p', '0',
      '-f', 'json',
    ]);
    expect(stderr).not.toMatch(/INVALID_ARGUMENT/);
  });
});
