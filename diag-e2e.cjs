// Full-journey E2E — Home → Scenario → Briefing → Quiz → Resources →
// Build → Validate → Learn → SDN → NFV → Orchestration → Simulation → Results.
const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:5173/';

/** Seed a valid College Campus topology as ReactFlow nodes/edges. */
function buildCampusTopology() {
  const rfNodes = [
    { id: 'cloud-1', type: 'deviceNode', position: { x: 400, y: 20 }, data: { type: 'cloud', label: 'Internet', vlans: [] } },
    { id: 'firewall-1', type: 'deviceNode', position: { x: 400, y: 110 }, data: { type: 'firewall', label: 'Firewall', vlans: [] } },
    { id: 'router-1', type: 'deviceNode', position: { x: 400, y: 200 }, data: { type: 'router', label: 'Router', vlans: [] } },
    { id: 'l3sw-1', type: 'deviceNode', position: { x: 250, y: 300 }, data: { type: 'l3Switch', label: 'Core L3 Switch', vlans: [10, 20, 30, 40, 50] } },
    { id: 'l3sw-2', type: 'deviceNode', position: { x: 550, y: 300 }, data: { type: 'l3Switch', label: 'Distribution L3', vlans: [10, 20, 30] } },
    { id: 'sw-admin', type: 'deviceNode', position: { x: 80, y: 420 }, data: { type: 'l2Switch', label: 'Admin Switch', vlans: [10] } },
    { id: 'sw-faculty', type: 'deviceNode', position: { x: 240, y: 420 }, data: { type: 'l2Switch', label: 'Faculty Switch', vlans: [20] } },
    { id: 'sw-student', type: 'deviceNode', position: { x: 400, y: 420 }, data: { type: 'l2Switch', label: 'Student Switch', vlans: [30] } },
    { id: 'sw-lab', type: 'deviceNode', position: { x: 560, y: 420 }, data: { type: 'l2Switch', label: 'Lab Switch', vlans: [30] } },
    { id: 'sw-server', type: 'deviceNode', position: { x: 700, y: 420 }, data: { type: 'l2Switch', label: 'Server Switch', vlans: [40] } },
    { id: 'ap-1', type: 'deviceNode', position: { x: 150, y: 540 }, data: { type: 'accessPoint', label: 'AP Main', vlans: [] } },
    { id: 'ap-2', type: 'deviceNode', position: { x: 400, y: 540 }, data: { type: 'accessPoint', label: 'AP Academic', vlans: [] } },
    { id: 'ap-3', type: 'deviceNode', position: { x: 620, y: 540 }, data: { type: 'accessPoint', label: 'AP Tech', vlans: [] } },
    { id: 'pc-admin-1', type: 'deviceNode', position: { x: 40, y: 640 }, data: { type: 'pc', label: 'Admin PC 1', vlans: [], vlan: 10 } },
    { id: 'pc-admin-2', type: 'deviceNode', position: { x: 120, y: 640 }, data: { type: 'pc', label: 'Admin PC 2', vlans: [], vlan: 10 } },
    { id: 'pc-faculty-1', type: 'deviceNode', position: { x: 200, y: 640 }, data: { type: 'pc', label: 'Faculty PC 1', vlans: [], vlan: 20 } },
    { id: 'pc-faculty-2', type: 'deviceNode', position: { x: 280, y: 640 }, data: { type: 'pc', label: 'Faculty PC 2', vlans: [], vlan: 20 } },
    { id: 'pc-student-1', type: 'deviceNode', position: { x: 360, y: 640 }, data: { type: 'pc', label: 'Student PC 1', vlans: [], vlan: 30 } },
    { id: 'pc-student-2', type: 'deviceNode', position: { x: 440, y: 640 }, data: { type: 'pc', label: 'Student PC 2', vlans: [], vlan: 30 } },
    { id: 'pc-lab-1', type: 'deviceNode', position: { x: 520, y: 640 }, data: { type: 'pc', label: 'Lab PC 1', vlans: [], vlan: 30 } },
    { id: 'pc-lab-2', type: 'deviceNode', position: { x: 600, y: 640 }, data: { type: 'pc', label: 'Lab PC 2', vlans: [], vlan: 30 } },
    { id: 'server-1', type: 'deviceNode', position: { x: 680, y: 640 }, data: { type: 'server', label: 'DHCP/DNS Server', vlans: [40], services: ['dhcp', 'dns'] } },
    { id: 'server-2', type: 'deviceNode', position: { x: 760, y: 640 }, data: { type: 'server', label: 'Web Server', vlans: [40], services: ['http'] } },
  ];

  const link = (id, source, target) => ({ id, source, target, animated: true, style: { stroke: '#334155', strokeWidth: 2 } });
  const rfEdges = [
    link('e-cloud-fw', 'cloud-1', 'firewall-1'),
    link('e-fw-router', 'firewall-1', 'router-1'),
    link('e-router-core', 'router-1', 'l3sw-1'),
    link('e-core-dist', 'l3sw-1', 'l3sw-2'),
    link('e-dist-fw', 'l3sw-2', 'firewall-1'), // redundant path for reroute demo
    link('e-core-admin', 'l3sw-1', 'sw-admin'),
    link('e-core-faculty', 'l3sw-1', 'sw-faculty'),
    link('e-dist-student', 'l3sw-2', 'sw-student'),
    link('e-dist-lab', 'l3sw-2', 'sw-lab'),
    link('e-core-server', 'l3sw-1', 'sw-server'),
    link('e-core-ap1', 'l3sw-1', 'ap-1'),
    link('e-dist-ap2', 'l3sw-2', 'ap-2'),
    link('e-dist-ap3', 'l3sw-2', 'ap-3'),
    link('e-admin-pc1', 'sw-admin', 'pc-admin-1'),
    link('e-admin-pc2', 'sw-admin', 'pc-admin-2'),
    link('e-faculty-pc1', 'sw-faculty', 'pc-faculty-1'),
    link('e-faculty-pc2', 'sw-faculty', 'pc-faculty-2'),
    link('e-student-pc1', 'sw-student', 'pc-student-1'),
    link('e-student-pc2', 'sw-student', 'pc-student-2'),
    link('e-lab-pc1', 'sw-lab', 'pc-lab-1'),
    link('e-lab-pc2', 'sw-lab', 'pc-lab-2'),
    link('e-server-srv1', 'sw-server', 'server-1'),
    link('e-server-srv2', 'sw-server', 'server-2'),
  ];

  const graphNodes = rfNodes.map((n) => ({ id: n.id, type: n.data.type, config: { ...n.data } }));
  const graphEdges = rfEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, connectionType: 'ethernet' }));
  return { rfNodes, rfEdges, graphNodes, graphEdges };
}

async function clickByText(page, selector, text) {
  const isRegex = text instanceof RegExp;
  const handle = await page.evaluateHandle((sel, txt, isRe) => {
    const els = Array.from(document.querySelectorAll(sel));
    return els.find((el) => {
      const t = el.textContent;
      return isRe ? new RegExp(txt).test(t) : t.includes(txt);
    }) || null;
  }, selector, isRegex ? text.source : text, isRegex);
  const el = handle.asElement();
  if (!el) throw new Error(`Element not found: ${selector} containing "${text}"`);
  await el.click();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const issues = [];
  const log = [];
  page.on('pageerror', (err) => issues.push(`[pageerror] ${err.message}\n  ${err.stack?.split('\n').slice(1, 3).join('\n  ')}`));
  page.on('console', (msg) => { if (msg.type() === 'error') issues.push(`[console.error] ${msg.text()}`); });
  page.on('response', (res) => { if (res.status() >= 400) issues.push(`[http ${res.status}] ${res.url()}`); });

  const stage = async (name) => {
    const s = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
    log.push(`${name} (rfNodes=${s})`);
  };

  try {
    // ── 1. HOME ──────────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
    const home = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent,
      modes: document.querySelectorAll('.mode-card').length,
      learnLink: !!Array.from(document.querySelectorAll('.home-learn-link')).find((b) => b.textContent.includes('Learn Concepts')),
      progression: document.querySelectorAll('.home-progression-step').length,
      heroViz: !!document.querySelector('.hero-viz'),
    }));
    log.push(`HOME: "${home.h1}", ${home.modes} mode cards, learn=${home.learnLink}, progression=${home.progression}, heroViz=${home.heroViz}`);
    if (home.modes !== 3) throw new Error('expected 3 mode cards on home');
    if (!home.learnLink) throw new Error('learn concepts link missing');
    if (home.progression !== 6) throw new Error('expected 6 progression steps');

    // ── 2. SCENARIO SELECT ───────────────────────────────
    await clickByText(page, '.mode-card', 'Scenario Mode');
    await page.waitForSelector('.scenario-card', { timeout: 5000 });
    const scenarioCount = await page.evaluate(() => document.querySelectorAll('.scenario-card').length);
    log.push(`SCENARIO_SELECT: ${scenarioCount} scenarios`);
    if (scenarioCount !== 5) throw new Error('expected 5 scenarios');

    // ── 3. BRIEFING ──────────────────────────────────────
    await clickByText(page, '.scenario-card', 'College Campus');
    await page.waitForSelector('.briefing-story', { timeout: 5000 });
    await clickByText(page, '.btn-primary.btn-lg', 'Acknowledge & Begin Planning');
    log.push('BRIEFING: story rendered, continued');

    // ── 4. PLANNING QUIZ ─────────────────────────────────
    await page.waitForSelector('.quiz-option', { timeout: 5000 });
    const correctByQuestion = [
      ['Router', 'L2 Switch', 'L3 Switch', 'Firewall', 'Servers', 'Access Points', 'PCs (computer labs)', 'Laptops', 'Internet / Cloud'],
      ['Hierarchical — access → distribution → core layers'],
      ['VLAN (Virtual LAN)', 'ACL (Access Control List)', 'Firewall rules'],
      ['Access Point (AP)'],
      ['DHCP (automatic IP assignment)', 'DNS (name resolution)', 'ACLs (traffic filtering)', 'Inter-VLAN routing'],
    ];
    for (const labels of correctByQuestion) {
      await page.evaluate((ls) => {
        document.querySelectorAll('.quiz-option').forEach((opt) => {
          const text = opt.querySelector('.quiz-option-text')?.textContent.trim();
          if (ls.includes(text)) opt.click();
        });
      }, labels);
      await clickByText(page, '.quiz-actions .btn-primary', 'Submit Answer');
      await page.waitForSelector('.quiz-actions .btn-success', { timeout: 5000 });
      const feedback = await page.evaluate(() => document.querySelector('.quiz-feedback')?.textContent || '');
      if (!feedback.includes('Correct')) throw new Error(`quiz answer not correct: ${feedback}`);
      await clickByText(page, '.quiz-actions .btn-success', /Next Question|Complete Planning/);
    }
    log.push('PLANNING_QUIZ: 5/5 correct');

    // ── 5. RESOURCE POOL ─────────────────────────────────
    await page.waitForSelector('.resource-card', { timeout: 5000 });
    const poolCount = await page.evaluate(() => document.querySelectorAll('.resource-card').length);
    await clickByText(page, '.btn-primary.btn-lg', 'Enter Network Builder');
    log.push(`RESOURCE_POOL: ${poolCount} resource types`);

    // ── 6. BUILD (seed topology via persisted store) ─────
    await page.waitForSelector('.builder-canvas', { timeout: 5000 });
    const topo = buildCampusTopology();
    const seed = {
      state: {
        currentStage: 'build',
        gameMode: 'scenario',
        activeScenarioId: 'college-campus',
        planningAnswers: {},
        hintsUsed: [],
        quizScore: 100,
        network: {
          rfNodes: topo.rfNodes,
          rfEdges: topo.rfEdges,
          graph: { nodes: topo.graphNodes, edges: topo.graphEdges },
          remainingResources: {},
        },
        validationResult: null,
        scores: { planning: null, architecture: null, connectivity: null, segmentation: null, routing: null, services: null, security: null, scalability: null, sdn: null, nfv: null, orchestration: null, simulation: null, overall: null },
        sdnState: null, nfvState: null, orchestrationState: null, simulationState: null,
      },
      version: 0,
    };
    await page.evaluateOnNewDocument((s) => {
      localStorage.setItem('nal-game-state', JSON.stringify(s));
    }, seed);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    const nodeCount = await page.evaluate(() => document.querySelectorAll('.react-flow__node').length);
    const edgeCount = await page.evaluate(() => document.querySelectorAll('.react-flow__edge').length);
    if (nodeCount !== topo.rfNodes.length) throw new Error(`seeded ${topo.rfNodes.length} nodes but canvas shows ${nodeCount}`);
    log.push(`BUILD: ${nodeCount} nodes, ${edgeCount} edges on canvas`);
    await clickByText(page, '.builder-footer .btn-primary', 'Validate Architecture');

    // ── 7. VALIDATE ──────────────────────────────────────
    await new Promise((r) => setTimeout(r, 1500)); // evaluation delay
    await page.waitForSelector('.check-item', { timeout: 8000 });
    const checks = await page.evaluate(() => ({
      items: document.querySelectorAll('.check-item').length,
      passed: Array.from(document.querySelectorAll('.check-icon')).filter((el) => el.textContent.trim() === '✓').length,
      score: document.querySelector('.overall-score')?.textContent || document.querySelector('.validation-score-hero')?.textContent || '',
    }));
    await clickByText(page, '.btn-primary.btn-lg', 'Understand Why');
    log.push(`VALIDATE: ${checks.passed}/${checks.items} checks passed`);

    // ── 8. LEARN ─────────────────────────────────────────
    await page.waitForSelector('.concept-tab', { timeout: 5000 });
    const conceptCount = await page.evaluate(() => document.querySelectorAll('.concept-tab').length);
    await clickByText(page, '.btn-primary.btn-lg', 'Modernize with SDN');
    log.push(`LEARN: ${conceptCount} concepts, continuing to SDN`);

    // ── 9. SDN ───────────────────────────────────────────
    await page.waitForSelector('.sdn-layout', { timeout: 5000 });
    await clickByText(page, '.btn-primary', 'Place SDN Controller');
    await page.waitForSelector('.sdn-layout', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300));
    const flowCount = await page.evaluate(() => {
      const txt = document.querySelector('.sdn-layout')?.parentElement?.textContent || document.body.textContent;
      return (txt.match(/flow-\d+/g) || []).length;
    });
    // fail a link with redundancy
    const edgeOptions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('select.field option')).map((o) => o.value).filter(Boolean)
    );
    if (edgeOptions.length > 0) {
      await page.select('select.field', edgeOptions[0]);
      await clickByText(page, '.btn-danger', 'Fail Link');
      await new Promise((r) => setTimeout(r, 300));
      const rerouteText = await page.evaluate(() => document.body.textContent);
      if (!rerouteText.includes('Controller detected failure')) throw new Error('reroute result not shown');
      log.push(`SDN: controller placed, ${flowCount} flow rules, link failure + reroute shown`);
    } else {
      log.push(`SDN: controller placed, ${flowCount} flow rules (no edges to fail)`);
    }
    await clickByText(page, '.btn-primary.btn-lg', 'Continue to NFV');

    // ── 10. NFV ──────────────────────────────────────────
    await page.waitForSelector('.nfv-layout', { timeout: 5000 });
    // deploy vFirewall on server-1, then vDHCP on server-2
    // (both are scenario-suggested for college-campus)
    const deployVnf = async (vnfName, hostId) => {
      await page.evaluate((name) => {
        const item = Array.from(document.querySelectorAll('.nfv-layout .palette-item'))
          .find((el) => el.textContent.includes(name));
        item?.click();
      }, vnfName);
      await new Promise((r) => setTimeout(r, 150));
      await page.evaluate((host) => {
        const hosts = Array.from(document.querySelectorAll('.nfv-layout .panel:nth-child(2) > div > div'));
        const server = hosts.find((h) => h.textContent.includes(host));
        server?.click();
      }, hostId);
      await new Promise((r) => setTimeout(r, 150));
    };
    await deployVnf('vFirewall', 'server-1');
    await deployVnf('vDHCP', 'server-2');
    await new Promise((r) => setTimeout(r, 200));
    const nfvState = await page.evaluate(() => {
      const txt = document.querySelector('.nfv-layout')?.textContent || '';
      return { vFirewall: txt.includes('vFirewall'), vDHCP: txt.includes('vDHCP'), chainValid: txt.includes('Chain is valid') };
    });
    log.push(`NFV: vFirewall=${nfvState.vFirewall} vDHCP=${nfvState.vDHCP} chainValid=${nfvState.chainValid}`);
    await clickByText(page, '.btn-primary.btn-lg', 'Continue to Orchestration');

    // ── 11. ORCHESTRATION ────────────────────────────────
    await page.waitForSelector('.orchestration-layout', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 300)); // let lazy chunk finish mounting
    await clickByText(page, '.btn-primary', 'Instantiate');
    await new Promise((r) => setTimeout(r, 200));
    // scale all instances to handle load
    const scaleButtons = await page.$$('.btn-accent');
    for (const btn of scaleButtons) await btn.click();
    await new Promise((r) => setTimeout(r, 100));
    // set load to 1500 via React-compatible input event
    await page.evaluate(() => {
      const slider = document.querySelector('input[type=range]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(slider, '1500');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await new Promise((r) => setTimeout(r, 300));
    const orch = await page.evaluate(() => {
      const txt = document.body.textContent;
      return {
        instances: (txt.match(/vFirewall|vDHCP|vLoadBalancer/g) || []).length,
        overloaded: txt.includes('OVERLOADED'),
        warning: txt.includes('WARNING'),
      };
    });
    log.push(`ORCHESTRATION: instances running, load 1500, overloaded=${orch.overloaded} warning=${orch.warning}`);
    await clickByText(page, '.btn-primary.btn-lg', 'Continue to Simulation');

    // ── 12. SIMULATION ───────────────────────────────────
    await page.waitForSelector('.simulation-layout', { timeout: 5000 });
    // run each event and respond
    const eventLabels = ['Exam Day Traffic Surge', 'Distribution Switch Failure', 'Unauthorized Access Attempt', 'Wi-Fi Congestion'];
    for (const label of eventLabels) {
      const exists = await page.evaluate((l) => {
        const btn = Array.from(document.querySelectorAll('.simulation-layout .btn-ghost')).find((b) => b.textContent.includes(l));
        if (btn) { btn.click(); return true; }
        return false;
      }, label);
      if (!exists) continue;
      await new Promise((r) => setTimeout(r, 250));
      // respond to the newest unresolved event
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.simulation-layout .btn-accent'));
        cards[cards.length - 1]?.click();
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    const simLog = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.simulation-layout .panel')).map((p) => p.textContent);
      const resolved = (document.body.textContent.match(/Handled — response:/g) || []).length;
      return { resolved };
    });
    log.push(`SIMULATION: events run, ${simLog.resolved} handled`);
    await clickByText(page, '.btn-primary.btn-lg', 'View Final Learning Report');

    // ── 13. RESULTS ──────────────────────────────────────
    await page.waitForSelector('.results-screen', { timeout: 5000 });
    const results = await page.evaluate(() => ({
      complete: document.querySelector('.mission-complete-banner')?.textContent || '',
      overall: document.querySelector('.results-screen div[style*="4rem"]')?.textContent || '',
      modernCards: Array.from(document.querySelectorAll('.result-score-card .eyebrow')).map((e) => e.textContent),
      chips: document.querySelectorAll('.concepts-demonstrated .chip').length,
    }));
    log.push(`RESULTS: "${results.complete.trim()}", overall=${results.overall.trim()}, modern=[${results.modernCards.join(', ')}], ${results.chips} concept chips`);
    if (!results.complete.includes('MISSION COMPLETE')) throw new Error('mission complete banner missing');
    if (!/^\d+%$/.test(results.overall.trim())) throw new Error(`overall score missing: "${results.overall}"`);
    for (const expected of ['SDN Transformation', 'VNF Design', 'Orchestration', 'Failure Handling']) {
      if (!results.modernCards.includes(expected)) throw new Error(`missing results card: ${expected}`);
    }
  } catch (err) {
    issues.push(`[e2e-failure] ${err.message}`);
  }

  console.log(JSON.stringify({ journey: log, issues }, null, 2));
  await browser.close();
  process.exit(issues.length > 0 ? 1 : 0);
})();
