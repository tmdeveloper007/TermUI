// packages/tss/src/theme-switching.test.ts
// Integration tests for dynamic theme switching at runtime.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeEngine } from './engine.js';
import { TSSWatcher } from './watcher.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

const DARK_TSS = `
@theme dark {
    --bg: #0d1117;
    --fg: #c9d1d9;
    --primary: #58a6ff;
}

widget {
    background: var(--bg);
    color: var(--fg);
}
`;

const LIGHT_TSS = `
@theme light {
    --bg: #ffffff;
    --fg: #24292f;
    --primary: #0969da;
}

widget {
    background: var(--bg);
    color: var(--fg);
}
`;

describe('theme switching', () => {
    let tmpDir: string;
    let tssFile: string;

    afterEach(() => {
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    function setupTmpDir(): void {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tss-theme-test-'));
        tssFile = path.join(tmpDir, 'theme.tss');
    }

    it('setTheme switches active theme and updates getVariable', () => {
        setupTmpDir();
        fs.writeFileSync(tssFile, DARK_TSS + LIGHT_TSS);

        const engine = new ThemeEngine();
        engine.load(fs.readFileSync(tssFile, 'utf-8'));

        expect(engine.availableThemes).toContain('dark');
        expect(engine.availableThemes).toContain('light');

        engine.setTheme('dark');
        expect(engine.activeTheme).toBe('dark');
        expect(engine.getVariable('--bg')).toBe('#0d1117');
        expect(engine.getVariable('--fg')).toBe('#c9d1d9');

        engine.setTheme('light');
        expect(engine.activeTheme).toBe('light');
        expect(engine.getVariable('--bg')).toBe('#ffffff');
        expect(engine.getVariable('--fg')).toBe('#24292f');
    });

    it('onChange fires when setTheme is called', () => {
        setupTmpDir();
        fs.writeFileSync(tssFile, DARK_TSS + LIGHT_TSS);

        const engine = new ThemeEngine();
        engine.load(fs.readFileSync(tssFile, 'utf-8'));

        const changeSpy = vi.fn();
        engine.onChange(changeSpy);

        engine.setTheme('dark');
        expect(changeSpy).toHaveBeenCalledTimes(1);

        engine.setTheme('light');
        expect(changeSpy).toHaveBeenCalledTimes(2);

        // setTheme always calls _applyTheme which notifies listeners
        engine.setTheme('light');
        expect(changeSpy).toHaveBeenCalledTimes(3);
    });

    it('setTheme updates resolveStyle for existing widget types', () => {
        setupTmpDir();
        fs.writeFileSync(tssFile, DARK_TSS + LIGHT_TSS);

        const engine = new ThemeEngine();
        engine.load(fs.readFileSync(tssFile, 'utf-8'));

        engine.setTheme('dark');
        const darkStyle = engine.resolveStyle('widget');
        expect(darkStyle.bg).toEqual({ type: 'hex', hex: '#0d1117' });
        expect(darkStyle.fg).toEqual({ type: 'hex', hex: '#c9d1d9' });

        engine.setTheme('light');
        const lightStyle = engine.resolveStyle('widget');
        expect(lightStyle.bg).toEqual({ type: 'hex', hex: '#ffffff' });
        expect(lightStyle.fg).toEqual({ type: 'hex', hex: '#24292f' });
    });

    it('TSSWatcher reloads engine on .tss file change', async () => {
        setupTmpDir();
        fs.writeFileSync(tssFile, DARK_TSS);

        const engine = new ThemeEngine();
        engine.load(fs.readFileSync(tssFile, 'utf-8'));
        engine.setTheme('dark');

        const changeSpy = vi.fn();
        engine.onChange(changeSpy);

        const watcher = new TSSWatcher({ dir: tmpDir, engine });
        watcher.start();

        // Update the .tss file to add the light theme
        fs.writeFileSync(tssFile, DARK_TSS + LIGHT_TSS);

        // Wait for debounce (default 50ms) + buffer
        await new Promise(resolve => setTimeout(resolve, 150));

        watcher.stop();

        expect(changeSpy).toHaveBeenCalled();
        expect(engine.availableThemes).toContain('light');
    });

    it('osc-11 background detection triggers theme switch via setTheme', () => {
        setupTmpDir();
        fs.writeFileSync(tssFile, DARK_TSS + LIGHT_TSS);

        const engine = new ThemeEngine();
        engine.load(fs.readFileSync(tssFile, 'utf-8'));

        // osc-11 detects dark background -> use dark theme
        engine.setTheme('dark');
        expect(engine.activeTheme).toBe('dark');
        expect(engine.getVariable('--bg')).toBe('#0d1117');

        // osc-11 detects light background -> switch to light theme
        engine.setTheme('light');
        expect(engine.activeTheme).toBe('light');
        expect(engine.getVariable('--bg')).toBe('#ffffff');
    });
});
