import { copyFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { spawn } from 'child_process';
import type { WorktreeConfig, TemplateVariables } from '../types/index.js';
import { matchFiles, shouldIgnoreFile, isDirectory, fileExists } from '../utils/file-patterns.js';
import { resolveTemplate } from '../utils/path-utils.js';

export class FileService {
  async copyFiles(
    sourceDir: string,
    targetDir: string,
    config: WorktreeConfig
  ): Promise<{ copied: string[], skipped: string[], errors: string[] }> {
    const result = {
      copied: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };

    try {
      const filesToCopy = await matchFiles(
        sourceDir,
        config.worktreeCopyPatterns,
        config.worktreeCopyIgnores
      );

      for (const filePath of filesToCopy) {
        try {
          const sourcePath = join(sourceDir, filePath);
          const targetPath = join(targetDir, filePath);

          if (shouldIgnoreFile(filePath, config.worktreeCopyIgnores)) {
            result.skipped.push(filePath);
            continue;
          }

          if (!(await fileExists(sourcePath))) {
            result.skipped.push(filePath);
            continue;
          }

          if (await isDirectory(sourcePath)) {
            await this.copyDirectory(sourcePath, targetPath, result);
          } else {
            await mkdir(dirname(targetPath), { recursive: true });
            await copyFile(sourcePath, targetPath);
            result.copied.push(filePath);
          }
        } catch (error) {
          result.errors.push(`${filePath}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to match files: ${error}`);
    }

    return result;
  }

  private async copyDirectory(
    sourceDir: string,
    targetDir: string,
    result: { copied: string[], skipped: string[], errors: string[] }
  ): Promise<void> {
    try {
      await mkdir(targetDir, { recursive: true });
      const entries = await readdir(sourceDir);

      for (const entry of entries) {
        const sourcePath = join(sourceDir, entry);
        const targetPath = join(targetDir, entry);
        const stats = await stat(sourcePath);

        if (stats.isDirectory()) {
          await this.copyDirectory(sourcePath, targetPath, result);
        } else {
          await copyFile(sourcePath, targetPath);
          result.copied.push(relative(process.cwd(), targetPath));
        }
      }
    } catch (error) {
      result.errors.push(`Directory ${sourceDir}: ${error}`);
    }
  }

  async executePostCreateCommand(
    command: string,
    variables: TemplateVariables
  ): Promise<{ success: boolean, output: string, error?: string }> {
    if (!command.trim()) {
      return { success: true, output: '' };
    }

    const resolvedCommand = resolveTemplate(command, variables);
    
    return new Promise((resolve) => {
      const child = spawn(resolvedCommand, {
        cwd: variables.WORKTREE_PATH,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: code !== 0 ? stderr : undefined
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message
        });
      });
    });
  }

  async openTerminal(
    terminalCommand: string,
    worktreePath: string
  ): Promise<{ success: boolean, error?: string }> {
    if (!terminalCommand.trim()) {
      return { success: true };
    }

    const variables: TemplateVariables = {
      BASE_PATH: '',
      WORKTREE_PATH: worktreePath,
      BRANCH_NAME: '',
      SOURCE_BRANCH: ''
    };

    const resolvedCommand = resolveTemplate(terminalCommand, variables);
    
    return new Promise((resolve) => {
      const child = spawn(resolvedCommand, {
        cwd: worktreePath,
        stdio: 'ignore',
        shell: true,
        detached: true
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      child.unref();
      resolve({ success: true });
    });
  }

  async validatePath(path: string): Promise<{ exists: boolean, isWritable: boolean }> {
    try {
      const exists = await fileExists(path);
      
      if (!exists) {
        return { exists: false, isWritable: false };
      }

      const stats = await stat(path);
      const isWritable = !!(stats.mode & parseInt('200', 8));
      
      return { exists: true, isWritable };
    } catch {
      return { exists: false, isWritable: false };
    }
  }
}