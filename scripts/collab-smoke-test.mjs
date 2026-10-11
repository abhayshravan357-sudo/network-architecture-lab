#!/usr/bin/env node
/**
 * Collaboration Smoke Test - Simple Version
 * Tests basic Yjs WebSocket connection
 */

import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { spawn } from 'child_process';

// Polyfill WebSocket for y-websocket
global.WebSocket = WebSocket;

const SERVER_URL = process.env.WS_URL || 'ws://localhost:1234';
const TEST_ROOM = `test-${Date.now()}`;

async function runTest() {
  console.log('Starting collaboration smoke test...');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Room: ${TEST_ROOM}`);
  console.log('');

  // Start server
  const serverProcess = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let serverReady = false;
  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    console.log('SERVER:', msg);
    if (msg.includes('Yjs WebSocket server running')) {
      serverReady = true;
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error('SERVER ERR:', data.toString());
  });

  // Wait for server
  await wait(2000);
  console.log('Server should be ready now');
  console.log('');

  try {
    // Create Client A
    console.log('Creating Client A...');
    const clientA = await createClient('Client A', TEST_ROOM);
    console.log('✅ Client A connected and synced');
    console.log('');

    // Create Client B
    console.log('Creating Client B...');
    const clientB = await createClient('Client B', TEST_ROOM);
    console.log('✅ Client B connected and synced');
    console.log('');

    // Test 1: Client A updates, Client B receives
    console.log('Test 1: Client A updates map...');
    clientA.map.set('key1', 'value-from-A');
    await wait(1000);
    console.log('Client B map:', clientB.map.toJSON());
    
    // Test 2: Client B updates, Client A receives
    console.log('Test 2: Client B updates map...');
    clientB.map.set('key2', 'value-from-B');
    await wait(1000);
    console.log('Client A map:', clientA.map.toJSON());

    console.log('');
    console.log('✅ All tests passed!');
    
    // Cleanup
    clientA.provider.destroy();
    clientB.provider.destroy();
    serverProcess.kill();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
}

function createClient(name, room) {
  return new Promise((resolve, reject) => {
    console.log(`[${name}] Creating Yjs doc and provider...`);
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      room,
      ydoc,
      { connect: true }
    );

    const map = ydoc.getMap('test');
    let connected = false;
    let synced = false;
    let receivedUpdate = false;

    provider.on('status', (event) => {
      console.log(`[${name}] Status: ${event.status}`);
      if (event.status === 'connected') {
        connected = true;
        checkDone();
      }
    });

    provider.on('sync', (isSynced) => {
      console.log(`[${name}] Sync: ${isSynced}`);
      if (isSynced) {
        synced = true;
        checkDone();
      }
    });

    map.observe(() => {
      receivedUpdate = true;
      console.log(`[${name}] Received update:`, map.toJSON());
      checkDone();
    });

    function checkDone() {
      if (connected && synced && receivedUpdate) {
        resolve({ provider, ydoc, map });
      }
    }

    // Timeout after 20 seconds
    setTimeout(() => {
      if (!connected || !synced || !receivedUpdate) {
        reject(new Error(`${name} timed out - connected: ${connected}, synced: ${synced}, receivedUpdate: ${receivedUpdate}`));
      }
    }, 20000);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTest();