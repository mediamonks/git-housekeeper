import path from 'path';
import { authenticate, findSheetId } from './sheetsApi';
import processSheet from './processSheet';

async function findSheet(argv) {
  const repositoryPath = path.resolve(argv.path);
  console.log('\n\nWelcome back!\n\n');

  const authenticated = await authenticate();
  if (!authenticated) {
    return true;
  }

  const sheetId = await findSheetId();

  if (!sheetId) {
    console.log('\n\nBye!\n\n');
    process.exit();
  }

  await processSheet(argv, sheetId);
}

export default findSheet;
