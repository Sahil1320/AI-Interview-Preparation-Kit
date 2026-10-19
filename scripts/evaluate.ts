#!/usr/bin/env node

/**
 * Batch evaluation CLI script (Section 9)
 * Usage:
 *   npx tsx scripts/evaluate.ts --input <cases.json> --output <kits.json>
 * Or:
 *   npm run evaluate -- --input <cases.json> --output <kits.json>
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateKit, validateKit } from '../src/lib/pipeline';
import { BatchInputCase, BatchOutput, BatchOutputKit } from '../src/types/kit';

// Parse command line arguments
function parseArgs(): { inputPath: string; outputPath: string } {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  return {
    inputPath: path.resolve(process.cwd(), inputPath),
    outputPath: path.resolve(process.cwd(), outputPath),
  };
}

async function runBatch() {
  const { inputPath, outputPath } = parseArgs();

  console.log(`\n======================================================`);
  console.log(`🤖 InterviewKit AI — Batch Evaluation Runner`);
  console.log(`======================================================`);
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file does not exist at ${inputPath}`);
    process.exit(1);
  }

  let cases: BatchInputCase[] = [];
  try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    cases = JSON.parse(raw);
    if (!Array.isArray(cases)) {
      throw new Error('Input file must contain a JSON array of test cases.');
    }
  } catch (err: any) {
    console.error(`Failed to read/parse input file: ${err.message}`);
    process.exit(1);
  }

  console.log(`Loaded ${cases.length} case(s) to process.\n`);

  const outputKits: BatchOutputKit[] = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];
    const prefix = `[${i + 1}/${cases.length}]`;
    console.log(`${prefix} Starting case ID: "${testCase.id}" (${testCase.company_url})...`);

    try {
      const kit = await generateKit(
        testCase.jd,
        testCase.company_url,
        testCase.days || 7,
        (progress) => {
          process.stdout.write(`\r${prefix} [${progress.percentage}%] ${progress.message.padEnd(60)}`);
        }
      );

      console.log(`\n${prefix} ✓ Successfully generated kit for ${testCase.id}`);

      // Validate
      const validationWarnings = validateKit(kit);
      if (validationWarnings.length > 0) {
        console.warn(`${prefix} ⚠ Validation warnings:`, validationWarnings);
      }

      outputKits.push({
        id: testCase.id,
        status: 'ok',
        kit,
        error: null,
      });
    } catch (err: any) {
      console.error(`\n${prefix} ✗ Failed case ${testCase.id}: ${err.message}`);
      outputKits.push({
        id: testCase.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'GENERATION_ERROR',
          message: err.message || 'Unknown pipeline failure',
        },
      });
      // Continue to next case without stopping
    }
  }

  const batchOutput: BatchOutput = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    kits: outputKits,
  };

  try {
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(batchOutput, null, 2), 'utf8');
    console.log(`\n======================================================`);
    console.log(`✓ Batch evaluation completed!`);
    console.log(`Total: ${cases.length} | Succeeded: ${outputKits.filter(k => k.status === 'ok').length} | Failed: ${outputKits.filter(k => k.status === 'failed').length}`);
    console.log(`Output written to: ${outputPath}`);
    console.log(`======================================================\n`);
  } catch (err: any) {
    console.error(`Failed to write output file: ${err.message}`);
    process.exit(1);
  }
}

runBatch().catch((err) => {
  console.error('Fatal batch evaluation error:', err);
  process.exit(1);
});
