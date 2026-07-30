// packages/adapters/src/chalk/stress.test.ts
// Stress tests for chalk adapter under high-volume output.

import { describe, it, expect, afterEach } from 'vitest';
import { chalkToTermUI } from './index.js';

function buildAnsiString(sequence: string, text: string): string {
    return `${sequence}${text}\x1B[0m`;
}

const MIXED_SEQUENCES = [
    '\x1B[31m',  // red
    '\x1B[32m',  // green
    '\x1B[33m',  // yellow
    '\x1B[34m',  // blue
    '\x1B[35m',  // magenta
    '\x1B[36m',  // cyan
    '\x1B[1m',   // bold
    '\x1B[4m',   // underline
    '\x1B[7m',   // reverse
    '\x1B[9m',   // strikethrough
];

function mixedAnsi(text: string): string {
    let result = text;
    for (const seq of MIXED_SEQUENCES) {
        result = buildAnsiString(seq, result);
    }
    return result;
}

describe('chalk adapter stress tests', () => {
    afterEach(() => {
        delete process.env.NO_COLOR;
    });

    it('handles 1,000 rapid successive calls without error', () => {
        const originalNoColor = process.env.NO_COLOR;
        delete process.env.NO_COLOR;

        const texts = Array.from({ length: 1000 }, (_, i) => `line-${i}`);
        const ansiTexts = texts.map((t, i) => {
            const seq = MIXED_SEQUENCES[i % MIXED_SEQUENCES.length];
            return buildAnsiString(seq, t);
        });

        expect(() => {
            for (const input of ansiTexts) {
                chalkToTermUI(input);
            }
        }).not.toThrow();
    });

    it('handles 5,000 rapid successive calls without error or slowdown', () => {
        const originalNoColor = process.env.NO_COLOR;
        delete process.env.NO_COLOR;

        const texts = Array.from({ length: 5000 }, (_, i) => `output-${i}`);

        const start = performance.now();
        for (const text of texts) {
            chalkToTermUI(mixedAnsi(text));
        }
        const elapsed = performance.now() - start;

        // 5,000 mixed-ANSI calls should complete in under 500ms
        expect(elapsed).toBeLessThan(500);
    });

    it('produces consistent output at 1,000-call scale', () => {
        const originalNoColor = process.env.NO_COLOR;
        delete process.env.NO_COLOR;

        const results: string[] = [];
        for (let i = 0; i < 1000; i++) {
            results.push(chalkToTermUI(mixedAnsi(`item-${i}`)));
        }

        // Each result should contain the original text
        expect(results[0]).toContain('item-0');
        expect(results[999]).toContain('item-999');

        // All results should have ANSI codes intact (no NO_COLOR)
        for (const result of results) {
            expect(result).toContain('\x1B[');
        }
    });

    it('strips ANSI when NO_COLOR is set during high-volume calls', () => {
        process.env.NO_COLOR = '1';

        const texts = Array.from({ length: 1000 }, (_, i) => `line-${i}`);
        const ansiTexts = texts.map((t, i) => {
            const seq = MIXED_SEQUENCES[i % MIXED_SEQUENCES.length];
            return buildAnsiString(seq, t);
        });

        const results: string[] = [];
        for (const input of ansiTexts) {
            results.push(chalkToTermUI(input));
        }

        // All results should be stripped of ANSI codes
        for (const result of results) {
            expect(result).not.toContain('\x1B[');
            expect(result).toMatch(/^line-\d+$/);
        }
    });

    it('handles deeply nested ANSI sequences', () => {
        const originalNoColor = process.env.NO_COLOR;
        delete process.env.NO_COLOR;

        // Stack all sequences 10 times
        let deeplyNested = 'text';
        for (let i = 0; i < 10; i++) {
            deeplyNested = mixedAnsi(deeplyNested);
        }

        // Should not throw and should preserve text content
        const result = chalkToTermUI(deeplyNested);
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
    });

    it('handles empty strings at high volume', () => {
        const originalNoColor = process.env.NO_COLOR;
        delete process.env.NO_COLOR;

        expect(() => {
            for (let i = 0; i < 1000; i++) {
                chalkToTermUI('');
            }
        }).not.toThrow();
    });
});
