// packages/store/src/middleware.test.ts
// Tests for createStore with custom middleware chaining.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Middleware } from './store.js';

describe('createStore with custom middleware', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('single middleware receives prevState and update', () => {
        const receivedPrev: any[] = [];
        const receivedUpdate: any[] = [];

        const loggingMiddleware: Middleware<{ count: number }> = (prevState, update, next) => {
            receivedPrev.push(prevState);
            receivedUpdate.push(update);
            next(update);
        };

        const useStore = createStore(
            (set) => ({ count: 0 }),
            { middleware: [loggingMiddleware] }
        );

        useStore.setState({ count: 5 });

        expect(receivedPrev.length).toBeGreaterThan(0);
        expect(receivedUpdate[0]).toEqual({ count: 5 });
        expect(useStore.getState().count).toBe(5);
    });

    it('middleware can transform the update before passing to next', () => {
        const scalingMiddleware: Middleware<{ value: number }> = (prevState, update, next) => {
            // Scale all numeric values by 2
            const scaled: { value: number } = { value: 0 };
            for (const [k, v] of Object.entries(update)) {
                if (typeof v === 'number') {
                    (scaled as any)[k] = (v as number) * 2;
                } else {
                    (scaled as any)[k] = v;
                }
            }
            next(scaled);
        };

        const useStore = createStore(
            (set) => ({ value: 1 }),
            { middleware: [scalingMiddleware] }
        );

        useStore.setState({ value: 10 });

        // Scaling middleware multiplied 10 by 2
        expect(useStore.getState().value).toBe(20);
    });

    it('middleware chaining: two middleware execute in order', () => {
        const order: string[] = [];

        const firstMw: Middleware<{ x: number }> = (prevState, update, next) => {
            order.push('first-before');
            next(update);
            order.push('first-after');
        };

        const secondMw: Middleware<{ x: number }> = (prevState, update, next) => {
            order.push('second-before');
            next(update);
            order.push('second-after');
        };

        const useStore = createStore(
            (set) => ({ x: 0 }),
            { middleware: [firstMw, secondMw] }
        );

        useStore.setState({ x: 42 });

        // firstMw runs first (index 0), then secondMw (index 1)
        expect(order).toEqual([
            'first-before',
            'second-before',
            'second-after',
            'first-after',
        ]);
        expect(useStore.getState().x).toBe(42);
    });

    it('middleware can access both prevState and nextState', () => {
        const prevStates: any[] = [];
        const nextStates: any[] = [];

        const inspector: Middleware<{ count: number }> = (prevState, update, next) => {
            prevStates.push({ ...prevState });
            const nextState = next(update);
            nextStates.push({ ...nextState });
        };

        const useStore = createStore(
            (set) => ({ count: 0 }),
            { middleware: [inspector] }
        );

        useStore.setState({ count: 3 });
        useStore.setState({ count: 7 });

        expect(prevStates[0].count).toBe(0);
        expect(nextStates[0].count).toBe(3);
        expect(prevStates[1].count).toBe(3);
        expect(nextStates[1].count).toBe(7);
    });

    it('throwing in middleware propagates the error', () => {
        const errorMw: Middleware<{ n: number }> = (_prevState, _update, _next) => {
            throw new Error('Middleware error');
        };

        const useStore = createStore(
            (set) => ({ n: 0 }),
            { middleware: [errorMw] }
        );

        expect(() => {
            useStore.setState({ n: 1 });
        }).toThrow('Middleware error');
    });

    it('middleware with no next call does not update state', () => {
        const blockerMw: Middleware<{ blocked: boolean }> = (_prevState, _update, _next) => {
            // Do not call next() — block the update
        };

        const useStore = createStore(
            (set) => ({ blocked: false }),
            { middleware: [blockerMw] }
        );

        useStore.setState({ blocked: true });

        // State should remain unchanged because next() was not called
        expect(useStore.getState().blocked).toBe(false);
    });

    it('empty middleware array behaves like no middleware', () => {
        const useStore = createStore(
            (set) => ({ a: 1, b: 2 }),
            { middleware: [] }
        );

        useStore.setState({ a: 99 });
        expect(useStore.getState().a).toBe(99);
        expect(useStore.getState().b).toBe(2);
    });

    it('middleware receives correct prevState across multiple updates', () => {
        const prevSnapshots: any[] = [];

        const snapshotMw: Middleware<{ items: string[] }> = (prevState, update, next) => {
            prevSnapshots.push([...prevState.items]);
            next(update);
        };

        const useStore = createStore(
            (set) => ({ items: ['a'] }),
            { middleware: [snapshotMw] }
        );

        useStore.setState({ items: ['a', 'b'] });
        useStore.setState({ items: ['a', 'b', 'c'] });

        expect(prevSnapshots[0]).toEqual(['a']);
        expect(prevSnapshots[1]).toEqual(['a', 'b']);
        expect(useStore.getState().items).toEqual(['a', 'b', 'c']);
    });
});
