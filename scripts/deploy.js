// scripts/deploy.js
// Automated CI/CD deployment script for MistWalker 3.0 on Render

import { execSync } from 'child_process';

const SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-db93bu3bc2fs73cn795g';
const API_KEY = process.env.RENDER_API_KEY || 'rnd_M6nAOrAtFKciTjyntqu8Q9ZsNxXz';
const APP_URL = 'https://mistwalker.onrender.com';

function getGitCommit() {
  try {
    const gitPath = 'set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%" && git';
    const hash = execSync(`${gitPath} rev-parse HEAD`, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    const message = execSync(`${gitPath} log -1 --pretty=%B`, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
    return { hash, message };
  } catch (err) {
    return { hash: 'unknown', message: '' };
  }
}

async function triggerDeploy() {
  const commit = getGitCommit();
  console.log('🚀 Triggering Render deployment for commit:', commit.hash.slice(0, 7), '-', commit.message.slice(0, 60));

  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ clearCache: 'do_not_clear' })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to trigger deploy: HTTP ${res.status} ${text}`);
  }

  const data = await res.json();
  const deployId = data.id;
  console.log(`📦 Deploy initiated: ${deployId} (Status: ${data.status})`);
  return deployId;
}

async function waitForLive(deployId) {
  console.log('⏳ Monitoring deploy progress...');
  const startTime = Date.now();
  let lastStatus = '';

  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys/${deployId}`, {
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
      console.log(`⏱️ [${elapsed}s] Deploy status: ${status}`);
      lastStatus = status;
    }

    if (status === 'live') {
      const totalElapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ Deployment LIVE in ${totalElapsed}s!`);
      break;
    }

    if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') {
      throw new Error(`❌ Deployment failed with status: ${status}`);
    }
  }
}

async function verifyLiveHealth() {
  console.log(`🔍 Verifying live health on ${APP_URL}...`);
  try {
    const res = await fetch(`${APP_URL}/api/health`);
    if (res.ok) {
      const data = await res.json();
      console.log(`🎉 Health check passed: HTTP 200`, data);
      return true;
    }
  } catch (e) {
    // try root endpoint
  }

  const rootRes = await fetch(APP_URL);
  if (rootRes.ok) {
    console.log(`🎉 Root check passed: HTTP ${rootRes.status}`);
    return true;
  }
  throw new Error(`Health check returned HTTP ${rootRes.status}`);
}

async function main() {
  try {
    const deployId = await triggerDeploy();
    await waitForLive(deployId);
    await verifyLiveHealth();
    console.log(`\n🌟 MistWalker is successfully updated and running live at: ${APP_URL}`);
  } catch (err) {
    console.error('\n💥 Deployment failed:', err.message);
    process.exit(1);
  }
}

main();
