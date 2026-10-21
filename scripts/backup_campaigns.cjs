const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

async function runBackup() {
  console.log('🔄 Loading Firebase config...');
  const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Could not find firebase-applet-config.json at', configPath);
    process.exit(1);
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  const auth = getAuth(app);

  try {
    console.log('🔐 Authenticating anonymously...');
    await signInAnonymously(auth);
    console.log('✅ Auth success');
  } catch (err) {
    console.warn('⚠️ Anonymous auth notice:', err.message);
  }

  console.log('📥 Fetching all campaigns from Firestore...');
  const colRef = collection(db, 'campaigns');
  const snapshot = await getDocs(colRef);

  const campaigns = [];
  snapshot.forEach(docSnap => {
    campaigns.push(docSnap.data());
  });

  console.log(`✅ Retrieved ${campaigns.length} campaigns from Firestore.`);

  const backupDir = path.resolve(__dirname, '../server/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `campaigns_backup_${timestamp}.json`);
  const latestBackupFile = path.join(backupDir, `campaigns_backup_latest.json`);

  fs.writeFileSync(backupFile, JSON.stringify(campaigns, null, 2), 'utf8');
  fs.writeFileSync(latestBackupFile, JSON.stringify(campaigns, null, 2), 'utf8');

  console.log(`🎉 Backup saved successfully to:`);
  console.log(`   1. ${backupFile}`);
  console.log(`   2. ${latestBackupFile}`);

  // Print summary of chapters and scenes found
  for (const c of campaigns) {
    console.log(`\n📌 Campaign: "${c.campaignTitle}" (ID: ${c.campaignId})`);
    if (c.chapters && Array.isArray(c.chapters)) {
      for (const ch of c.chapters) {
        console.log(`   📂 Chapter: "${ch.chapterTitle}" (ID: ${ch.chapterId}) - ${ch.scenes?.length || 0} scenes`);
        if (ch.scenes) {
          for (const sc of ch.scenes) {
            console.log(`      🗺️ Scene: "${sc.sceneTitle}" (Walls: ${sc.walls?.length || 0}, Tokens: ${sc.tokens?.length || 0}, Rooms: ${sc.roomAnnotations?.length || 0})`);
          }
        }
      }
    }
  }
}

runBackup().then(() => {
  console.log('\n✅ Backup process completed successfully.');
  process.exit(0);
}).catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
