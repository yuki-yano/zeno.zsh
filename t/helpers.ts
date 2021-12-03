export class Helper {
  _envs: { [index: string]: string } = {};
  _tempDir: string | undefined;

  constructor() {
    this.saveEnvs();
  }

  restoreAll() {
    this.restoreEnvs();
    this.removeTempDir();
  }

  saveEnvs() {
    this._envs = Deno.env.toObject();
  }

  restoreEnvs() {
    for (const [name, value] of Object.entries(this._envs)) {
      Deno.env.set(name, value);
    }
  }

  getTempDir() {
    if (this._tempDir === undefined) {
      this._tempDir = Deno.makeTempDirSync();
    }
    return this._tempDir;
  }

  removeTempDir() {
    if (this._tempDir !== undefined) {
      Deno.removeSync(this._tempDir, { recursive: true });
      this._tempDir = undefined;
    }
  }
}
