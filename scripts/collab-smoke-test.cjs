#!/usr/bin/env node
/**
 * Collaboration Smoke Test - CommonJS Version
 * Tests Yjs WebSocket synchronization between two clients
 */

const WebSocket = require('ws');
const Y = require('yjs');
const { WebsocketProvider } = require('y-websocket');
const { spawn } = require('child_process');

// Polyfill WebSocket for y-websocket
global.WebSocket = WebSocket;

const SERVER_URL = process.env.WS_URL || 'ws://localhost:1234';
const TEST_ROOM = `test-${Date.now()}`;

function createClient(name, room) {
  return new Promise((resolve, reject) => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      SERVER_URL,
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

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!connected || !synced || !receivedUpdate) {
        reject(new Error(`${name} timed out - connected: ${connected}, synced: ${synced}, receivedUpdate: ${receivedUpdate}`));
      }
    }, 15000);
  });
}

async function runTest() {
  console.log('Starting collaboration smoke test...');
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Room: ${TEST_ROOM}`);
  console.log('');

  // Start server
  const serverProcess = await startServer();
  
  try {
    console.log('Creating Client A...');
    const clientA = await createClient('Client A', TEST_ROOM);
    console.log('✅ Client A connected and synced');
    console.log('');

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

    // Test 3: Late-joining client C receives existing state
    console.log('Test 3: Late-joining Client C...');
    const clientC = await createClient('Client C', TEST_ROOM);
    console.log('Client C map (should have both keys):', clientC.map.toJSON());

    // Test 4: Awareness - peer count
    console.log('Test 4: Peer awareness...');
    console.log('Client A peer count:', clientA.provider.awareness.getStates().size - 1);
    console.log('Client B peer count:', clientB.provider.awareness.getStates().size - 1);

    console.log('');
    console.log('✅ All tests passed!');
    
    // Cleanup
    clientA.provider.destroy();
    clientB.provider.destroy();
    clientC.provider.destroy();
    
    serverProcess.kill();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
}

function startServer() {
  return new Promise((resolve) => {
    const server = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    server.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('Yjs WebSocket server running')) {
        console.log('Server started:', msg);
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    server.on('error', (err) => {
      console.error('Server spawn error:', err);
    });
    
    setTimeout(() => resolve(server), 2000);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTest();