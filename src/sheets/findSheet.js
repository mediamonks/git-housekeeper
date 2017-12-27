import { authenticate, findSheetId } from './sheetsApi';
import processSheet from './processSheet';

async function findSheet(argv) {
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

  return processSheet(argv, sheetId);
}

export default findSheet;
