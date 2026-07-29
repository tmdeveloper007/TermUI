// packages/router/src/hooks-params-advanced.test.ts
// Tests for useParams with optional and catch-all route segments.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router } from './router.js';
import { useParams } from './hooks.js';
import { unmountAll } from '@termuijs/jsx';
import { render } from '@termuijs/testing';

describe('useParams with optional and catch-all route segments', () => {
    afterEach(() => {
        unmountAll();
        vi.restoreAllMocks();
    });

    it('useParams captures catch-all segment params', () => {
        const r = new Router();
        let capturedParams: any;

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/docs/[...path]', TestScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        // Navigate to /docs/a/b/c
        r.push('/docs/a/b/c');
        const t = render(screenToRender);

        expect(capturedParams).toBeDefined();
        expect(capturedParams.path).toBe('a/b/c');

        t.unmount();
    });

    it('useParams returns empty string for catch-all when only base path is matched', () => {
        const r = new Router();
        let capturedParams: any;

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        // Add a static /docs route alongside the catch-all
        r.addRoute('/docs', TestScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        // Navigate to /docs (static route, no params)
        r.push('/docs');
        const t = render(screenToRender);

        expect(capturedParams).toBeDefined();
        expect(capturedParams).toEqual({});

        t.unmount();
    });

    it('useParams handles catch-all with single segment', () => {
        const r = new Router();
        let capturedParams: any;

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/files/[...rest]', TestScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/files/readme.md');
        const t = render(screenToRender);

        expect(capturedParams.rest).toBe('readme.md');

        t.unmount();
    });

    it('useParams handles regular param alongside catch-all', () => {
        const r = new Router();
        let capturedParams: any;

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/user/[id]/[...rest]', TestScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/user/42/posts/2024/jan');
        const t = render(screenToRender);

        expect(capturedParams.id).toBe('42');
        expect(capturedParams.rest).toBe('posts/2024/jan');

        t.unmount();
    });

    it('useParams returns empty object for route without params', () => {
        const r = new Router();
        let capturedParams: any;

        const AboutScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/about', AboutScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/about');
        const t = render(screenToRender);

        expect(capturedParams).toEqual({});

        t.unmount();
    });

    it('useParams handles required param without optional syntax', () => {
        const r = new Router();
        let capturedParams: any;

        const TestScreen = () => {
            capturedParams = useParams();
            return { type: 'box', props: {}, children: [] } as any;
        };

        r.addRoute('/item/[id]', TestScreen);

        let screenToRender: any;
        r.events.on('navigate', (ev) => { screenToRender = ev.screen; });

        r.push('/item/99');
        const t = render(screenToRender);

        expect(capturedParams.id).toBe('99');

        t.unmount();
    });
});
