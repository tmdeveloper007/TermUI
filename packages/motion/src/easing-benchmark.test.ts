// packages/motion/src/easing-benchmark.test.ts
// Performance benchmarks for easing functions at simulated 60fps.

import { describe, it, expect } from 'vitest';
import { stepSpring, springPreset } from './spring.js';
import { easings } from './transitions.js';

const FRAME_DT_MS = 1000 / 60; // ~16.67ms per frame at 60fps
const FRAME_DT_S = FRAME_DT_MS / 1000;
const ITERATIONS = 10_000;

/** Average time in milliseconds for a single easing tick */
function benchmarkEasing(_name: string, fn: () => void): number {
    const start = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        fn();
    }
    const elapsed = performance.now() - start;
    return elapsed / ITERATIONS;
}

describe('easing benchmark at 60fps', () => {
    it('spring tick completes within 1ms per frame', () => {
        const config = springPreset('default');
        let state = { value: 0, velocity: 0, target: 1, done: false };
        let totalMs = 0;

        for (let i = 0; i < ITERATIONS; i++) {
            const frameStart = performance.now();
            state = stepSpring(state, config, FRAME_DT_S);
            totalMs += performance.now() - frameStart;
        }

        const avgMs = totalMs / ITERATIONS;
        expect(avgMs).toBeLessThan(1);
    });

    it('linear easing tick completes within 0.1ms per frame', () => {
        let avgMs = benchmarkEasing('linear', () => {
            easings.linear(0.5);
        });
        expect(avgMs).toBeLessThan(0.1);
    });

    it('easeInOut easing tick completes within 0.1ms per frame', () => {
        let avgMs = benchmarkEasing('easeInOut', () => {
            easings.easeInOut(0.5);
        });
        expect(avgMs).toBeLessThan(0.1);
    });

    it('spring reaches target within 60 frames at 60fps', () => {
        const config = springPreset('default');
        let state = { value: 0, velocity: 0, target: 1, done: false };
        let frames = 0;
        const maxFrames = 60; // 1 second at 60fps

        while (!state.done && frames < maxFrames) {
            state = stepSpring(state, config, FRAME_DT_S);
            frames++;
        }

        expect(state.done).toBe(true);
        expect(frames).toBeLessThanOrEqual(maxFrames);
        expect(state.value).toBeCloseTo(1, 2);
    });

    it('linear interpolation is deterministic across frames', () => {
        const progress: number[] = [];
        for (let f = 0; f <= 10; f++) {
            progress.push(easings.linear(f / 10));
        }
        expect(progress[5]).toBe(0.5);
        expect(progress[10]).toBe(1);
    });

    it('easeInOut produces symmetric curve', () => {
        const midpoint = easings.easeInOut(0.5);
        expect(midpoint).toBeCloseTo(0.5);
        // easeInOut(t) + easeInOut(1-t) should equal 1
        expect(easings.easeInOut(0.25) + easings.easeInOut(0.75)).toBeCloseTo(1);
        expect(easings.easeInOut(0.1) + easings.easeInOut(0.9)).toBeCloseTo(1);
    });
});
