// scripts/deploy.js
// Automated CI/CD deployment script for MistWalker on Render (Dual-Domain: Stable vs Enterprise)

import { execSync } from 'child_process';

const API_KEY = process.env.RENDER_API_KEY || 'rnd_M6nAOrAtFKciTjyntqu8Q9ZsNxXz';

// Render Service Targets
const SERVICES = {
  prod: {
    id: 'srv-db93bu3bc2fs73cn795g',
    name: 'Production (Stable v1.0.0)',
    url: 'https://mistwalker.onrender.com',
    branch: 'v1-stable'
  },
  beta: {
    id: 'srv-dbhqc7afngtc73cau1i0',
    name: 'Enterprise Multi-DM (Beta)',
    url: 'https://mistwalker-beta.onrender.com',
    branch: 'enterprise-multi-dm'
  }
};

function getGitCommit() {
  try {
    const gitPath = 'set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%" && git';
    const hash = execSync(`${gitPath} rev-parse HEAD`, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    const message = execSync(`${gitPath} log -1 --pretty=%B`, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    const branch = execSync(`${gitPath} rev-parse --abbrev-ref HEAD`, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    return { hash, message, branch };
  } catch (err) {
    return { hash: 'unknown', message: '', branch: 'main' };
  }
}

function resolveTargetService(branch) {
  const args = process.argv.slice(2);
  if (args.includes('--prod')) return SERVICES.prod;
  if (args.includes('--beta')) return SERVICES.beta;
  if (branch === 'v1-stable') return SERVICES.prod;
  return SERVICES.beta; // default enterprise development
}

async function triggerDeploy(target) {
  const commit = getGitCommit();
  console.log(`🚀 Deploying to ${target.name} [${target.url}]`);
  console.log('📝 Commit:', commit.hash.slice(0, 7), '-', commit.message.slice(0, 60));

  const res = await fetch(`https://api.render.com/v1/services/${target.id}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clearCache: 'do_not_clear' })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to trigger deploy on ${target.name}: HTTP ${res.status} ${text}`);
  }

  let deployId;
  let status = 'initiated';
  const text = await res.text();
  if (text && text.trim()) {
    try {
      const data = JSON.parse(text);
      deployId = data.id || data.deploy?.id;
      status = data.status || status;
    } catch {
      // Body was not JSON
    }
  }

  if (!deployId) {
    const listRes = await fetch(`https://api.render.com/v1/services/${target.id}/deploys?limit=1`, {
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      deployId = listData[0]?.deploy?.id || listData[0]?.id;
      status = listData[0]?.deploy?.status || listData[0]?.status || status;
    }
  }

  if (!deployId) {
    throw new Error('Failed to retrieve deploy ID from Render');
  }

  console.log(`📦 Deploy initiated on ${target.name}: ${deployId} (Status: ${status})`);
  return deployId;
}

async function waitForLive(target, deployId) {
  console.log(`⏳ Monitoring deploy progress on ${target.name}...`);
  const startTime = Date.now();
  let lastStatus = '';

  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://api.render.com/v1/services/${target.id}/deploys/${deployId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    if (!res.ok) {
      console.warn(`Warning: Failed to fetch deploy status (HTTP ${res.status}), retrying...`);
      continue;
    }

    const data = await res.json();
    const status = data.status;

    if (status !== lastStatus) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`⏱️ [${elapsed}s] Deploy status (${target.name}): ${status}`);
      lastStatus = status;
    }

    if (status === 'live') {
      const totalElapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ ${target.name} LIVE in ${totalElapsed}s!`);
      break;
    }

    if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') {
      throw new Error(`❌ Deployment on ${target.name} failed with status: ${status}`);
    }
  }
}

async function verifyLiveHealth(target) {
  console.log(`🔍 Verifying live health on ${target.url}...`);
  try {
    const res = await fetch(`${target.url}/api/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`🎉 Health check passed on ${target.name}: HTTP 200`, data);
      return true;
    }
  } catch (e) {
    // try root endpoint
  }

  const rootRes = await fetch(target.url);
  if (rootRes.ok) {
    console.log(`🎉 Root check passed on ${target.name}: HTTP ${rootRes.status}`);
    return true;
  }
  throw new Error(`Health check returned HTTP ${rootRes.status}`);
}

async function main() {
  const commit = getGitCommit();
  const target = resolveTargetService(commit.branch);

  try {
    const deployId = await triggerDeploy(target);
    await waitForLive(target, deployId);
    await verifyLiveHealth(target);
    console.log(`\n🌟 ${target.name} is successfully updated and running live at: ${target.url}`);
  } catch (err) {
    console.error(`\n💥 Deployment on ${target.name} failed:`, err.message);
    process.exit(1);
  }
}

main();
