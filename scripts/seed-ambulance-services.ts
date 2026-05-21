/**
 * Seed script: Signs in with Firebase Auth, then populates ambulance_services.
 * 
 * PREREQUISITES: 
 * 1. Deploy firestore.rules to Firebase Console first
 * 2. Have at least one user account created
 * 
 * Run with: npx tsx scripts/seed-ambulance-services.ts
 */

const PROJECT_ID = 'heal-u-ai-studio';
const API_KEY = 'AIzaSyBckPXI2QKxPzYTUMRfp-PzlLoVCAbn0Ig';

// Test user credentials (created during our auth test)
const TEST_EMAIL = 'testuser@healu.ai';
const TEST_PASSWORD = 'TestPass123!';

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

// ─── Firebase Auth REST API ────────────────────────────────────────────────────

async function signIn(): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      returnSecureToken: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${err}`);
  }

  const data = await res.json();
  return data.idToken;
}

// ─── Firestore REST API ────────────────────────────────────────────────────────

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

async function writeDocument(docId: string, data: AmbulanceService, token: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/ambulance_services/${docId}?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(toFirestoreDoc(data)),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`    Error: ${err.substring(0, 150)}`);
    return false;
  }
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚑 Ambulance Services Seeder');
  console.log('━'.repeat(50));

  // Step 1: Authenticate
  console.log('\n🔑 Signing in as test user...');
  let token: string;
  try {
    token = await signIn();
    console.log('  ✅ Authenticated successfully\n');
  } catch (err: any) {
    console.error(`  ❌ ${err.message}`);
    console.log('\n  Make sure you have created a test user first.');
    process.exit(1);
  }

  // Step 2: Seed data
  console.log('📝 Seeding ambulance services...\n');
  let success = 0;
  let failed = 0;

  for (const service of AMBULANCE_SERVICES) {
    const ok = await writeDocument(service.id, service.data, token);
    if (ok) {
      console.log(`  ✅ ${service.data.name}`);
      success++;
    } else {
      console.log(`  ❌ ${service.data.name}`);
      failed++;
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n🏁 Result: ${success}/${AMBULANCE_SERVICES.length} services seeded.`);

  if (failed > 0) {
    console.log('\n⚠️  Some writes failed. Make sure you have deployed the Firestore');
    console.log('   security rules from firestore.rules to your Firebase Console:');
    console.log('   https://console.firebase.google.com/project/heal-u-ai-studio/firestore/rules');
    console.log('\n   After deploying rules, re-run: npx tsx scripts/seed-ambulance-services.ts');
  }

  process.exit(0);
}

main();
