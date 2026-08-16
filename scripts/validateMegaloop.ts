// Automated Megaloop Ledger Integrity & 4,000-Pass Validator

import * as fs from 'fs';
import * as path from 'path';

export interface MegaloopPassRecord {
  id: string; // e.g. S01-C001-FEATURE
  superCycle: number;
  macroCycle: number;
  lane: 'FEATURE' | 'ENGINE' | 'ASSET' | 'UX';
  problem: string;
  improvement: string;
  files: string[];
  validation: string;
  result: string;
}

export function validateMegaloopLedger(filePath: string): {
  isValid: boolean;
  totalPasses: number;
  superCyclesCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  if (!fs.existsSync(filePath)) {
    return { isValid: false, totalPasses: 0, superCyclesCount: 0, errors: [`File not found: ${filePath}`] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const seenIds = new Set<string>();
  const superCycles = new Set<number>();
  const cyclesBySuper = new Map<number, Set<number>>();
  const lanesByCycle = new Map<string, Set<string>>();

  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    try {
      const record: MegaloopPassRecord = JSON.parse(line);
      count++;

      // Check ID Uniqueness
      if (seenIds.has(record.id)) {
        errors.push(`Duplicate pass ID detected: ${record.id} at line ${i + 1}`);
      }
      seenIds.add(record.id);

      // Track Super-cycles
      superCycles.add(record.superCycle);

      if (!cyclesBySuper.has(record.superCycle)) {
        cyclesBySuper.set(record.superCycle, new Set());
      }
      cyclesBySuper.get(record.superCycle)!.add(record.macroCycle);

      const cycleKey = `S${record.superCycle}-C${record.macroCycle}`;
      if (!lanesByCycle.has(cycleKey)) {
        lanesByCycle.set(cycleKey, new Set());
      }
      lanesByCycle.get(cycleKey)!.add(record.lane);

      // Verify required fields
      if (!record.problem || !record.improvement || !record.validation || !record.result) {
        errors.push(`Incomplete pass record fields at ID: ${record.id}`);
      }
    } catch (err: any) {
      errors.push(`Malformed JSON at line ${i + 1}: ${err.message}`);
    }
  }

  // Validate 10 Super-Cycles exist
  if (superCycles.size !== 10) {
    errors.push(`Expected exactly 10 super-cycles, found ${superCycles.size}`);
  }

  // Validate 100 Macro-cycles per super-cycle
  for (let s = 1; s <= 10; s++) {
    const cycles = cyclesBySuper.get(s);
    if (!cycles || cycles.size !== 100) {
      errors.push(`Super-cycle ${s} has ${cycles?.size || 0} cycles (expected 100)`);
    }
  }

  // Validate 4 lanes per cycle
  for (let s = 1; s <= 10; s++) {
    for (let c = 1; c <= 100; c++) {
      const cycleKey = `S${s}-C${c}`;
      const lanes = lanesByCycle.get(cycleKey);
      if (!lanes || lanes.size !== 4) {
        errors.push(`Cycle ${cycleKey} has ${lanes?.size || 0} lanes (expected 4)`);
      }
    }
  }

  // Validate exactly 4,000 passes
  if (count !== 4000) {
    errors.push(`Expected exactly 4,000 pass records, found ${count}`);
  }

  return {
    isValid: errors.length === 0,
    totalPasses: count,
    superCyclesCount: superCycles.size,
    errors
  };
}

// CLI Execution if executed directly
if (process.argv[1] && process.argv[1].includes('validateMegaloop')) {
  const ledgerPath = path.resolve(__dirname, '../docs/MEGALOOP_PASSES.jsonl');
  const res = validateMegaloopLedger(ledgerPath);
  console.log(`MEGALOOP VALIDATOR RESULT:`, res);
  if (!res.isValid) {
    console.error('Errors:', res.errors.slice(0, 10));
    process.exit(1);
  } else {
    console.log(`PASS: All 4,000 Megaloop records verified with 0 errors!`);
  }
}
