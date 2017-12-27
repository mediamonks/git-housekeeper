import path from 'path';
import { getSheetData } from './sheetsApi';
import { setRemote, fetchRemote, getBranches, openRepository } from '../git';

const META_PROPS = ['version', 'remote', 'url', 'baseBranch'];

async function processSheet(argv, spreadsheetId) {
  console.log('getting sheet data...');
  const response = await getSheetData(spreadsheetId);
  const sheetData = response.sheets[0].data[0].rowData;
  const meta = META_PROPS.reduce((props, name, index) => {
    // eslint-disable-next-line no-param-reassign
    props[name] = sheetData[index].values[0].userEnteredValue.stringValue;

    return props;
  }, {});
  const repositoryPath = path.resolve(argv.path);

  await openRepository(repositoryPath);
  await setRemote(meta.remote, meta.url);
  await fetchRemote();
  const branches = await getBranches();

  const branchRows = sheetData
    .map(row => row.values)
    .filter(_ => _)
    .filter(
      cols =>
        cols[0] &&
        cols[0].userEnteredValue &&
        cols[0].userEnteredValue.stringValue &&
        cols[0].userEnteredValue.stringValue.startsWith(`refs/remotes/${meta.remote}`),
    );

  const noActionRefs = [];
  const keepRefs = [];
  const deleteRefs = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const row of branchRows) {
    const action = row[6] && row[6].userEnteredValue && row[6].userEnteredValue.stringValue;
    const branchRef = row[0].userEnteredValue.stringValue;
    switch (action) {
      case 'KEEP':
        keepRefs.push(branchRef);
        break;
      case 'DELETE':
        deleteRefs.push(branchRef);
        break;
      default:
        noActionRefs.push(branchRef);
    }
  }

  if (noActionRefs.length + keepRefs.length) {
    console.log('Branches to keep: ');
    noActionRefs.forEach(ref => console.log(` - ${ref} (no action specified)`));
    keepRefs.forEach(ref => console.log(` - ${ref} (KEEP)`));
  }
  if (!deleteRefs.length) {
    console.log('\nNo branches to delete. Bye!');
  }

  console.log('\nBranches to delete: ');
  deleteRefs.forEach(ref => console.log(` - ${ref} (DELETE)`));
}

export default processSheet;
