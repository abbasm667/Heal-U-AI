/**
 * Deploy Firestore security rules via Firebase REST API.
 * Run with: npx tsx scripts/deploy-firestore-rules.ts
 * 
 * This uses the Firebase Management REST API to deploy rules
 * without requiring the Firebase CLI.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'heal-u-ai-studio';
const API_KEY = 'AIzaSyBckPXI2QKxPzYTUMRfp-PzlLoVCAbn0Ig';

async function deployRules() {
  const rulesPath = path.resolve(__dirname, '..', 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  console.log('📋 Firestore Security Rules to deploy:\n');
  console.log(rulesContent);
  console.log('\n🚀 Deploying rules to project:', PROJECT_ID);

  try {
    // Step 1: Create a new ruleset
    const createUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets?key=${API_KEY}`;
    
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: {
          files: [
            {
              name: 'firestore.rules',
              content: rulesContent,
            },
          ],
        },
      }),
    });

    if (!createRes.ok) {
      const errorBody = await createRes.text();
      console.error(`\n❌ Failed to create ruleset (HTTP ${createRes.status}):`);
      console.error(errorBody);
      console.log('\n💡 The Firebase Rules REST API requires OAuth2 authentication.');
      console.log('   As an alternative, please deploy rules manually:');
      console.log('   1. Open Firebase Console → Firestore → Rules');
      console.log('   2. Paste the content of firestore.rules');
      console.log('   3. Click "Publish"');
      process.exit(1);
    }

    const ruleset = await createRes.json();
    const rulesetName = ruleset.name; // e.g., "projects/heal-u-ai-studio/rulesets/abc123"
    console.log('  ✅ Ruleset created:', rulesetName);

    // Step 2: Release the ruleset to production
    const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases?key=${API_KEY}`;

    const releaseRes = await fetch(releaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
        rulesetName,
      }),
    });

    if (!releaseRes.ok) {
      // Try PATCH (update existing release)
      const patchUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore?key=${API_KEY}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName,
        }),
      });

      if (!patchRes.ok) {
        const errorBody = await patchRes.text();
        console.error(`\n❌ Failed to release ruleset (HTTP ${patchRes.status}):`);
        console.error(errorBody);
        console.log('\n💡 Please deploy rules manually via Firebase Console.');
        process.exit(1);
      }
    }

    console.log('  ✅ Rules deployed to production!');
    console.log('\n🏁 Firestore security rules are now active.');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Please deploy rules manually:');
    console.log('   Firebase Console → Firestore → Rules → Paste content → Publish');
  }

  process.exit(0);
}

deployRules();
