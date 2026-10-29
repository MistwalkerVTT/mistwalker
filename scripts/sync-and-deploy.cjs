// scripts/sync-and-deploy.cjs
// Automatically syncs all changes from v1-stable into enterprise-multi-dm instantly
// and triggers deploys to both production and beta domains.

const { execSync } = require('child_process');

function runGit(cmd) {
  const gitCmd = `set "PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%" && git ${cmd}`;
  console.log(`> git ${cmd}`);
  return execSync(gitCmd, { encoding: 'utf-8', shell: 'cmd.exe' }).trim();
}

async function main() {
  console.log('🔄 MistWalker Dual-Domain Auto-Sync Initiated\n');

  try {
    // 1. Get current branch
    const currentBranch = runGit('rev-parse --abbrev-ref HEAD');
    console.log(`Current branch: ${currentBranch}`);

    if (currentBranch === 'v1-stable') {
      console.log('\n📦 Step 1: Pushing stable changes to origin/v1-stable (Production)...');
      runGit('push origin v1-stable');

      console.log('\n🔀 Step 2: Instantly syncing stable changes into enterprise-multi-dm...');
      runGit('checkout enterprise-multi-dm');
      runGit('merge v1-stable -m "merge: Sync stable fixes into enterprise-multi-dm"');
      runGit('push origin enterprise-multi-dm');

      console.log('\n🔙 Step 3: Returning to v1-stable...');
      runGit('checkout v1-stable');
    } else if (currentBranch === 'enterprise-multi-dm') {
      console.log('\n📦 Step 1: Pushing enterprise changes to origin/enterprise-multi-dm (Beta)...');
      runGit('push origin enterprise-multi-dm');
    }

    console.log('\n🚀 Triggering Render Deployment...');
    execSync('node scripts/deploy.js', { stdio: 'inherit', shell: 'cmd.exe' });

    console.log('\n✅ Auto-sync and deployment complete!');
  } catch (err) {
    console.error('\n💥 Auto-sync failed:', err.message);
    process.exit(1);
  }
}

main();
