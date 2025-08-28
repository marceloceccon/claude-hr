import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import fsExtra from 'fs-extra';
import { glob } from 'glob';

export async function ensureDir(dirPath) {
  return await fsExtra.ensureDir(dirPath);
}

export async function pathExists(filePath) {
  return await fsExtra.pathExists(filePath);
}

export async function readJsonFile(filePath) {
  if (!(await pathExists(filePath))) {
    throw new Error(`File not found: ${filePath}`);
  }
  return await fsExtra.readJson(filePath);
}

export async function writeJsonFile(filePath, data, options = {}) {
  const defaultOptions = { spaces: 2, ...options };
  await ensureDir(path.dirname(filePath));
  return await fsExtra.writeJson(filePath, data, defaultOptions);
}

export async function readTextFile(filePath) {
  if (!(await pathExists(filePath))) {
    throw new Error(`File not found: ${filePath}`);
  }
  return await fs.readFile(filePath, 'utf8');
}

export async function writeTextFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  return await fs.writeFile(filePath, content, 'utf8');
}

export async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  return await fsExtra.copy(src, dest);
}

export async function deleteFile(filePath) {
  if (await pathExists(filePath)) {
    return await fsExtra.remove(filePath);
  }
}

export async function listFiles(dirPath, pattern = '*') {
  if (!(await pathExists(dirPath))) {
    return [];
  }
  
  const searchPattern = path.join(dirPath, pattern);
  return await glob(searchPattern, { nodir: true });
}

export async function listDirs(dirPath) {
  if (!(await pathExists(dirPath))) {
    return [];
  }
  
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  return items
    .filter(item => item.isDirectory())
    .map(item => item.name);
}

export function resolvePath(filePath, basePath = process.cwd()) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  
  return path.resolve(basePath, filePath);
}

export function relativePath(from, to) {
  return path.relative(from, to);
}

export function joinPaths(...paths) {
  return path.join(...paths);
}

export function getExtension(filePath) {
  return path.extname(filePath);
}

export function getBasename(filePath, ext) {
  return path.basename(filePath, ext);
}

export function getDirname(filePath) {
  return path.dirname(filePath);
}

export async function createBackup(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }
  
  const timestamp = Date.now();
  const backupPath = `${filePath}.backup.${timestamp}`;
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function isDirectory(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}
