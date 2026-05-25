#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { parseArgs } from 'util';
import * as esbuild from 'esbuild';

function readUserConfig(
  inputDir: string
): { path: string | null, config: ts.ParsedCommandLine | null }
{
  const configPath = ts.findConfigFile(
    inputDir,
    ts.sys.fileExists,
    'tsconfig.json'
  );
  if (!configPath) return { path: null, config: null };
  
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    console.warn('Error while reading tsconfig.json:');
    console.warn(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
    return { path: configPath, config: null };
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
  if (parsedConfig.errors.length > 0) {
    console.warn('Error parsing tsconfig.json:');
    parsedConfig.errors.forEach(err => console.warn(err.messageText));
    return { path: configPath, config: null };
  }

  return { path: configPath, config: parsedConfig };
}

async function main()
{
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i', default: './src' },
      output: { type: 'string', short: 'o', default: './dist' },
    },
  });

  const inputDir = path.resolve(process.cwd(), values.input);
  const outputDir = path.resolve(process.cwd(), values.output);
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  let fileNames = ts.sys.readDirectory(
    inputDir,
    ['.js', '.jsx', '.ts', '.tsx'],
    ['node_modules', '**/*.d.ts'],
    ['**/*']
  );
  if (fileNames.length == 0) {
    console.log(`No TypeScript files found in ${inputDir}`);
    process.exit(0);
  }

  const { path: configPath, config: userConfig } = readUserConfig(inputDir);
  if (userConfig != null && userConfig.fileNames.length > 0) {
    fileNames = userConfig.fileNames; // Use tsconfig 'include' paths if present
  }

  console.log(`Type checking ${fileNames.length} file(s)...`);

  const compilerOptions: ts.CompilerOptions = {
    ...userConfig?.options,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.Preserve,
    jsx: ts.JsxEmit.ReactJSX,
    jsxImportSource: 'scriptable-jsx',
    rootDir: userConfig?.options.rootDir || inputDir,
    outDir: userConfig?.options.outDir || outputDir,
    declaration: false
  };
  const program = ts.createProgram(fileNames, compilerOptions);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  for (const diagnostic of diagnostics) {
    let errorStr = '';

    if (diagnostic.file != null) {
      errorStr += `${diagnostic.file.fileName}`;
      if (diagnostic.start != null) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
        errorStr += ` (${line + 1},${character + 1})`;
      }
      errorStr += `: `;
    }
    
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    errorStr += message;

    console.error(errorStr);
  }

  console.log(`Bundling contents of ${values.input} to ${values.output}...`);
  
  await esbuild.build({
    entryPoints: fileNames,
    outdir: outputDir,
    bundle: true,
    format: 'cjs',
    target: 'es2020',
    jsx: 'automatic',
    jsxImportSource: 'scriptable-jsx',
    tsconfig: configPath ?? undefined,
    external: [],
  });

  console.log('Done!');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});