import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load firebase-applet-config.json
const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  config = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0670750167',
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || 'ai-studio-agentdateagentic-6ff4775a-15bd-4e45-aba9-cc3f71185469'
  };
}

if (getApps().length === 0) {
  initializeApp({
    projectId: config.projectId
  });
}

// Get standard Admin Firestore instance with custom databaseId
const db = getFirestore(config.firestoreDatabaseId || '(default)');

export { db };
export default db;
