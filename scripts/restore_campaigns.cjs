const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

async function runRestore(targetFile) {
  const filePath = targetFile || path.resolve(__dirname, '../server/backups/campaigns_backup_latest.json');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Backup file not found at:', filePath);
    process.exit(1);
  }

  console.log('🔄 Loading Firebase config...');
  const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

  console.log(`📖 Reading backup from ${filePath}...`);
  const campaigns = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📦 Found ${campaigns.length} campaigns in backup.`);

  for (const c of campaigns) {
    if (!c.campaignId) continue;
    console.log(`⏳ Restoring campaign "${c.campaignTitle}" (${c.campaignId})...`);
    await setDoc(doc(db, 'campaigns', c.campaignId), c);
    console.log(`✅ Restored "${c.campaignTitle}"`);
  }

  console.log('🎉 All campaigns restored successfully.');
}

const argFile = process.argv[2];
runRestore(argFile).then(() => process.exit(0)).catch(err => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
