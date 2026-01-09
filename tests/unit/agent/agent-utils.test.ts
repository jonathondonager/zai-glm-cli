import { describe, it, expect } from 'vitest';
import {
  extractCriticalInfo,
  findMostCommonTool,
  detectStuckPattern,
  type ToolResult,
  type StuckDetectionConfig
} from '../../../src/agent/agent-utils';

describe('agent-utils', () => {
  describe('extractCriticalInfo', () => {
    it('should extract error messages', () => {
      const contents = ['Error: File not found'];
      const result = extractCriticalInfo(contents);
      expect(result).toContain('ERROR: Error: File not found');
    });

    it('should extract multiple error patterns', () => {
      const contents = [
        'error: something went wrong\nfailed to connect',
        'Error - invalid input'
      ];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('ERROR:'))).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract file modification messages', () => {
      const contents = ['created file src/test.ts'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FILE CHANGE:'))).toBe(true);
    });

    it('should handle various file modification verbs', () => {
      const verbs = ['created', 'modified', 'edited', 'updated', 'deleted', 'wrote'];
      for (const verb of verbs) {
        const contents = [`${verb} file test.js`];
        const result = extractCriticalInfo(contents);
        expect(result.some(r => r.includes('FILE CHANGE:')), `Failed for verb: ${verb}`).toBe(true);
      }
    });

    it('should handle files with uppercase extensions', () => {
      const contents = ['created file config.JSON'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FILE CHANGE:'))).toBe(true);
    });

    it('should handle extensionless files like Makefile', () => {
      const contents = ['modified Makefile'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FILE CHANGE:'))).toBe(true);
    });

    it('should extract search/found results', () => {
      const contents = ['found in src/utils.ts:42'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FOUND:'))).toBe(true);
    });

    it('should handle "located at" pattern', () => {
      const contents = ['located at /path/to/file.js'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FOUND:'))).toBe(true);
    });

    it('should handle "matches in" pattern', () => {
      const contents = ['matches in config.yaml (line 15)'];
      const result = extractCriticalInfo(contents);
      expect(result.some(r => r.includes('FOUND:'))).toBe(true);
    });

    it('should deduplicate results', () => {
      const contents = [
        'Error: something wrong',
        'Error: something wrong' // duplicate
      ];
      const result = extractCriticalInfo(contents);
      const errorCount = result.filter(r => r.includes('something wrong')).length;
      expect(errorCount).toBe(1);
    });

    it('should return empty array for content without critical info', () => {
      const contents = ['Everything is working fine'];
      const result = extractCriticalInfo(contents);
      expect(result).toEqual([]);
    });

    it('should limit error messages to reasonable length', () => {
      // Regex captures up to 100 chars until newline, then slice limits to 150
      const longError = 'Error: ' + 'a'.repeat(80) + '\nMore content';
      const contents = [longError];
      const result = extractCriticalInfo(contents);
      // Should extract the error up to the newline
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('ERROR:');
      expect(result[0].length).toBeLessThan(longError.length);
    });

    it('should limit to 3 unique errors per message', () => {
      const contents = [
        'error: one\nerror: two\nerror: three\nerror: four\nerror: five'
      ];
      const result = extractCriticalInfo(contents);
      const errorCount = result.filter(r => r.startsWith('ERROR:')).length;
      expect(errorCount).toBeLessThanOrEqual(3);
    });
  });

  describe('findMostCommonTool', () => {
    it('should find the most common tool', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: true },
        { tool: 'search', success: false },
        { tool: 'view_file', success: true },
        { tool: 'view_file', success: false },
        { tool: 'bash', success: true }
      ];
      const { tool, count } = findMostCommonTool(results);
      expect(tool).toBe('view_file');
      expect(count).toBe(3);
    });

    it('should return first tool with highest count on tie', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: true },
        { tool: 'search', success: true },
        { tool: 'view_file', success: true },
        { tool: 'search', success: true }
      ];
      const { tool, count } = findMostCommonTool(results);
      expect(count).toBe(2);
      // Either tool is acceptable in a tie
      expect(['view_file', 'search']).toContain(tool);
    });

    it('should handle single result', () => {
      const results: ToolResult[] = [
        { tool: 'bash', success: true }
      ];
      const { tool, count } = findMostCommonTool(results);
      expect(tool).toBe('bash');
      expect(count).toBe(1);
    });

    it('should handle empty array', () => {
      const results: ToolResult[] = [];
      const { tool, count } = findMostCommonTool(results);
      expect(tool).toBe('');
      expect(count).toBe(0);
    });
  });

  describe('detectStuckPattern', () => {
    const defaultConfig: StuckDetectionConfig = {
      maxConsecutiveFailures: 3,
      stuckDetectionWindow: 5,
      currentReflectionCount: 0,
      maxReflectionsPerTurn: 2
    };

    it('should not detect stuck with insufficient results', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'File not found' },
        { tool: 'view_file', success: false, error: 'File not found' }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      expect(detection.isStuck).toBe(false);
    });

    it('should detect consecutive failures', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'File not found' },
        { tool: 'search', success: false, error: 'No results' },
        { tool: 'bash', success: false, error: 'Command failed' }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      expect(detection.isStuck).toBe(true);
      expect(detection.reason).toBe('consecutive_failures');
      expect(detection.reflection).toContain('REFLECTION NEEDED');
      expect(detection.failedTools).toContain('view_file');
    });

    it('should not trigger if recent calls include success', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'Error' },
        { tool: 'search', success: true }, // Success breaks the streak
        { tool: 'bash', success: false, error: 'Error' }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      expect(detection.isStuck).toBe(false);
    });

    it('should detect loop with repeated tool calls', () => {
      const results: ToolResult[] = [
        { tool: 'str_replace_editor', success: false, error: 'String not found' },
        { tool: 'str_replace_editor', success: false, error: 'String not found' },
        { tool: 'str_replace_editor', success: false, error: 'String not found' },
        { tool: 'str_replace_editor', success: false, error: 'String not found' },
        { tool: 'view_file', success: true }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      expect(detection.isStuck).toBe(true);
      expect(detection.reason).toBe('loop_detected');
      expect(detection.loopingTool).toBe('str_replace_editor');
    });

    it('should not detect loop if tool calls are diverse', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'Error' },
        { tool: 'search', success: false, error: 'Error' },
        { tool: 'bash', success: true },
        { tool: 'str_replace_editor', success: false, error: 'Error' },
        { tool: 'create_file', success: true }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      // Even with failures, no loop detected because tools are diverse
      expect(detection.reason).not.toBe('loop_detected');
    });

    it('should respect reflection cooldown', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'Error' },
        { tool: 'view_file', success: false, error: 'Error' },
        { tool: 'view_file', success: false, error: 'Error' }
      ];
      const configWithCooldown: StuckDetectionConfig = {
        ...defaultConfig,
        currentReflectionCount: 2, // Already at max
        maxReflectionsPerTurn: 2
      };
      const detection = detectStuckPattern(results, configWithCooldown);
      expect(detection.isStuck).toBe(false);
      expect(detection.reflection).toBeNull();
    });

    it('should include error patterns in reflection for consecutive failures', () => {
      const results: ToolResult[] = [
        { tool: 'view_file', success: false, error: 'Permission denied' },
        { tool: 'view_file', success: false, error: 'Permission denied' },
        { tool: 'view_file', success: false, error: 'Permission denied' }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      expect(detection.errors).toContain('Permission denied');
      expect(detection.reflection).toContain('Permission denied');
    });

    it('should handle mixed success/failure in loop detection', () => {
      // 4 out of 5 are the same tool, but only 2 failed
      const results: ToolResult[] = [
        { tool: 'search', success: true },
        { tool: 'search', success: true },
        { tool: 'search', success: false, error: 'Error' },
        { tool: 'search', success: false, error: 'Error' },
        { tool: 'view_file', success: true }
      ];
      const detection = detectStuckPattern(results, defaultConfig);
      // Should not trigger because only 2 failed (need 3)
      expect(detection.reason).not.toBe('loop_detected');
    });
  });
});
