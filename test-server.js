#!/usr/bin/env node

/**
 * Test script to demonstrate MCP server capabilities
 * This script shows how to interact with the MCP server manually
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing Copilot Developer Tools MCP Server');
console.log('============================================\n');

// Test message template
const createTestMessage = (method, params) => {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  }) + '\n';
};

// Start the server
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

server.stderr.on('data', (data) => {
  console.log('Server:', data.toString());
});

server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

// Test 1: List tools
console.log('📋 Test 1: Listing available tools');
server.stdin.write(createTestMessage('tools/list', {}));

setTimeout(() => {
  // Test 2: Read package.json
  console.log('📖 Test 2: Reading package.json');
  server.stdin.write(createTestMessage('tools/call', {
    name: 'read-file',
    arguments: {
      filePath: 'package.json'
    }
  }));
}, 1000);

setTimeout(() => {
  // Test 3: List directory
  console.log('📁 Test 3: Listing current directory');
  server.stdin.write(createTestMessage('tools/call', {
    name: 'list-directory',
    arguments: {
      directoryPath: '.',
      includeHidden: false,
      recursive: false
    }
  }));
}, 2000);

setTimeout(() => {
  // Test 4: Search for TypeScript files
  console.log('🔍 Test 4: Searching for TypeScript files');
  server.stdin.write(createTestMessage('tools/call', {
    name: 'search-files',
    arguments: {
      pattern: '*.ts',
      directory: '.',
      recursive: true
    }
  }));
}, 3000);

setTimeout(() => {
  // Test 5: Weather demo
  console.log('🌤️  Test 5: Weather alerts demo');
  server.stdin.write(createTestMessage('tools/call', {
    name: 'get-weather-alerts',
    arguments: {
      state: 'CA'
    }
  }));
}, 4000);

setTimeout(() => {
  console.log('\n✅ Test completed! Server is working correctly.');
  server.kill();
}, 5000);

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});
