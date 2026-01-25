import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resets the database fixtures to the initial state.
 * Uses the backend's 'make reload-fixture' command.
 * 
 * Assumes the backend repo is located at '../narvik-back' relative to this project root.
 */
export const resetFixtures = () => {
  // Check if running in CI
  if (process.env.CI) {
    try {
      console.log('Resetting fixtures in CI environment...');
      // In CI, we use the specific e2e compose file and 'backend' service
      // We use -T because there is no TTY in CI
      execSync('docker compose -f docker-compose.e2e.yml exec -T backend composer reload-fixture', {
        stdio: 'inherit',
        timeout: 60000
      });
      console.log('Fixtures reset complete (CI).');
    } catch (error) {
      console.error('Failed to reset fixtures in CI:', error);
      throw error;
    }
    return;
  }

  // Local development fallback
  const projectRoot = path.resolve(__dirname, '../../..');
  
  // Allow overriding the backend path via environment variable, default to sibling directory
  const backendPath = process.env.BACKEND_PATH 
    ? path.resolve(projectRoot, process.env.BACKEND_PATH)
    : path.resolve(projectRoot, '../narvik-back');

  if (!fs.existsSync(backendPath)) {
    console.warn(`Backend directory not found at ${backendPath}. Skipping fixture reset.`);
    console.warn('Set BACKEND_PATH environment variable if your backend is in a custom location.');
    return;
  }

  try {
    console.log(`Resetting fixtures via backend docker compose (path: ${backendPath})...`);
    // Use docker compose directly for consistency, pointing to local backend setup
    // Assuming standard 'php' service name in local dev
    execSync('docker compose exec -T php composer reload-fixture', { 
      cwd: backendPath, 
      stdio: 'inherit',
      timeout: 60000 
    });
    console.log('Fixtures reset complete.');
  } catch (error) {
    console.error('Failed to reset fixtures:', error);
    throw error;
  }
};
