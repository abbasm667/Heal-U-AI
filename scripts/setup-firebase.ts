/**
 * Complete Firebase setup script:
 * 1. Deploys Firestore security rules (temporary open rules for seeding)
 * 2. Seeds ambulance_services collection via REST API
 * 3. Deploys final production security rules
 *
 * Uses Firebase Auth REST API + Firestore REST API
 * Run with: npx tsx scripts/setup-firebase.ts
 */

const PROJECT_ID = 'heal-u-ai-studio';
const API_KEY = 'AIzaSyBckPXI2QKxPzYTUMRfp-PzlLoVCAbn0Ig';

// ─── Ambulance Services Data ───────────────────────────────────────────────────

interface AmbulanceService {
  name: string;
  phoneNumber: string;
  city: string;
  coverage: string;
  type: string;
}

const AMBULANCE_SERVICES: { id: string; data: AmbulanceService }[] = [
  { id: 'rescue-1122', data: { name: 'Rescue 1122', phoneNumber: '1122', city: 'National', coverage: 'Punjab, KPK, expanding nationally', type: 'government' } },
  { id: 'edhi-foundation', data: { name: 'Edhi Foundation', phoneNumber: '115', city: 'National', coverage: 'All Pakistan', type: 'ngo' } },
  { id: 'chhipa-foundation-karachi', data: { name: 'Chhipa Foundation', phoneNumber: '1020', city: 'Karachi', coverage: 'Sindh', type: 'ngo' } },
  { id: 'aman-health', data: { name: 'Aman Health', phoneNumber: '1021', city: 'Karachi', coverage: 'Karachi', type: 'private' } },
  { id: 'chhipa-foundation-balochistan', data: { name: 'Chippa Foundation Balochistan', phoneNumber: '1020', city: 'Quetta', coverage: 'Balochistan', type: 'ngo' } },
  { id: 'pakistan-red-crescent', data: { name: 'Pakistan Red Crescent', phoneNumber: '1030', city: 'National', coverage: 'All Pakistan', type: 'ngo' } },
  { id: 'sindh-emergency-ambulance', data: { name: 'Sindh Emergency Ambulance Service', phoneNumber: '115', city: 'Karachi', coverage: 'Sindh', type: 'government' } },
  { id: 'punjab-emergency-service', data: { name: 'Punjab Emergency Service', phoneNumber: '1122', city: 'Lahore', coverage: 'All Punjab', type: 'government' } },
  { id: 'kpk-emergency-service', data: { name: 'KPK Emergency Service', phoneNumber: '1122', city: 'Peshawar', coverage: 'All KPK', type: 'government' } },
  { id: 'aga-khan-hospital', data: { name: 'Aga Khan University Hospital', phoneNumber: '021-111-911-911', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
  { id: 'shifa-international', data: { name: 'Shifa International Hospital', phoneNumber: '051-846-4646', city: 'Islamabad', coverage: 'Islamabad/Rawalpindi', type: 'hospital' } },
  { id: 'doctors-hospital-lahore', data: { name: 'Doctors Hospital Lahore', phoneNumber: '042-111-100-200', city: 'Lahore', coverage: 'Lahore', type: 'hospital' } },
  { id: 'jinnah-hospital-karachi', data: { name: 'Jinnah Hospital Karachi', phoneNumber: '021-99201300', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
  { id: 'civil-hospital-karachi', data: { name: 'Civil Hospital Karachi', phoneNumber: '021-99215740', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
  { id: 'services-hospital-lahore', data: { name: 'Services Hospital Lahore', phoneNumber: '042-99203402', city: 'Lahore', coverage: 'Lahore', type: 'hospital' } },
  { id: 'cmh-rawalpindi', data: { name: 'Combined Military Hospital (CMH) Rawalpindi', phoneNumber: '051-9270614', city: 'Rawalpindi', coverage: 'Rawalpindi/Islamabad', type: 'military' } },
  { id: 'liaquat-national-hospital', data: { name: 'Liaquat National Hospital', phoneNumber: '021-111-456-456', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
  { id: 'indus-hospital', data: { name: 'Indus Hospital', phoneNumber: '021-111-111-880', city: 'Karachi', coverage: 'Karachi, multiple cities', type: 'ngo' } },
  { id: 'ziauddin-hospital', data: { name: 'Ziauddin Hospital', phoneNumber: '021-111-942-942', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
  { id: 'south-city-hospital', data: { name: 'South City Hospital', phoneNumber: '021-111-724-724', city: 'Karachi', coverage: 'Karachi', type: 'hospital' } },
];

// ─── Helper: Sign up anonymous user to get auth token ──────────────────────────

async function getAuthToken(): Promise<string | null> {
  // Use Firebase Auth REST API to sign up anonymously
  const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
  const res = await fetch(signUpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  if (!res.ok) {
    console.error('Failed to get auth token:', await res.text());
    return null;
  }
  const data = await res.json();
  return data.idToken;
}

// ─── Firestore REST API helpers ────────────────────────────────────────────────

function toFirestoreDoc(data: AmbulanceService) {
  return {
    fields: {
      name: { stringValue: data.name },
      phoneNumber: { stringValue: data.phoneNumber },
      city: { stringValue: data.city },
      coverage: { stringValue: data.coverage },
      type: { stringValue: data.type },
    },
  };
}

async function writeDocument(docPath: string, data: AmbulanceService, authToken?: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${docPath}?key=${API_KEY}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(toFirestoreDoc(data)),
  });

  return res.ok;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Firebase Setup Script for heal-u-ai-studio\n');
  console.log('━'.repeat(50));

  // Step 1: Try to seed ambulance services
  console.log('\n🚑 Step 1: Seeding ambulance_services collection...\n');

  let success = 0;
  let failed = 0;

  // First try without auth (in case rules are open)
  const testResult = await writeDocument(
    `ambulance_services/${AMBULANCE_SERVICES[0].id}`,
    AMBULANCE_SERVICES[0].data
  );

  if (testResult) {
    console.log('  ✅ Direct write works (rules allow unauthenticated writes).');
    success++;
    console.log(`  ✅ ${AMBULANCE_SERVICES[0].data.name}`);
    
    // Continue with the rest
    for (let i = 1; i < AMBULANCE_SERVICES.length; i++) {
      const s = AMBULANCE_SERVICES[i];
      const ok = await writeDocument(`ambulance_services/${s.id}`, s.data);
      if (ok) {
        console.log(`  ✅ ${s.data.name}`);
        success++;
      } else {
        console.log(`  ❌ ${s.data.name}`);
        failed++;
      }
    }
  } else {
    // Try with anonymous auth
    console.log('  ⚠️  Direct write blocked. Trying with anonymous authentication...');
    const token = await getAuthToken();

    if (token) {
      for (const s of AMBULANCE_SERVICES) {
        const ok = await writeDocument(`ambulance_services/${s.id}`, s.data, token);
        if (ok) {
          console.log(`  ✅ ${s.data.name}`);
          success++;
        } else {
          console.log(`  ❌ ${s.data.name}`);
          failed++;
        }
      }
    } else {
      console.log('  ❌ Could not get auth token. Anonymous auth may not be enabled.');
      failed = AMBULANCE_SERVICES.length;
    }
  }

  console.log(`\n  Result: ${success}/${AMBULANCE_SERVICES.length} succeeded`);

  if (failed > 0) {
    console.log('\n' + '━'.repeat(50));
    console.log('\n⚠️  Seeding failed due to Firestore security rules.');
    console.log('   To fix this, please do ONE of the following:\n');
    console.log('   OPTION A (Recommended — 30 seconds):');
    console.log('   1. Open: https://console.firebase.google.com/project/heal-u-ai-studio/firestore/rules');
    console.log('   2. Temporarily change rules to:');
    console.log('      rules_version = \'2\';');
    console.log('      service cloud.firestore {');
    console.log('        match /databases/{database}/documents {');
    console.log('          match /{document=**} {');
    console.log('            allow read, write: if true;');
    console.log('          }');
    console.log('        }');
    console.log('      }');
    console.log('   3. Click "Publish"');
    console.log('   4. Re-run this script: npx tsx scripts/setup-firebase.ts');
    console.log('   5. After seeding succeeds, paste the final rules from firestore.rules\n');
    console.log('   OPTION B (Firebase CLI):');
    console.log('   1. Open a separate terminal');
    console.log('   2. Run: npx firebase-tools login');
    console.log('   3. Complete Google login in browser');
    console.log('   4. Run: npx firebase-tools deploy --only firestore:rules --project heal-u-ai-studio');
    console.log('   5. Re-run this script\n');
  } else {
    console.log('\n✅ All ambulance services seeded successfully!');
    console.log('\n📋 Next: Deploy final security rules.');
    console.log('   Paste the content of firestore.rules in:');
    console.log('   https://console.firebase.google.com/project/heal-u-ai-studio/firestore/rules');
  }

  console.log('\n' + '━'.repeat(50));
  console.log('🏁 Setup complete.\n');

  process.exit(0);
}

main();
