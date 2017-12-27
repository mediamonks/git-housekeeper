import path from 'path';
import inquirer from 'inquirer';
import { getSheetData } from './sheetsApi';
import { setRemote, fetchRemote, getBranches, openRepository, deleteBranch } from '../git';

const VALIDATE_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

async function promptConfirmRemoveBranches(dryRun) {
  const { response } = await inquirer.prompt([
    {
      name: 'response',
      message: `[review remote] Are you sure? ${dryRun ? '(dry run)' : 'THIS CANNOT BE UNDONE!'}`,
      type: 'confirm',
    },
  ]);

  return response;
}

const processors = [
  {
    version: '0.1.0',
    process: async (argv, sheetData) => {
      const META_PROPS = ['version', 'remote', 'url', 'baseBranch'];

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

      const noActionRows = [];
      const keepRows = [];
      const deleteRows = [];

      // eslint-disable-next-line no-restricted-syntax
      for (const row of branchRows) {
        const action = row[6] && row[6].userEnteredValue && row[6].userEnteredValue.stringValue;
        const branchRef = row[0].userEnteredValue.stringValue;
        switch (action) {
          case 'KEEP':
            keepRows.push(branchRef);
            break;
          case 'DELETE':
            deleteRows.push(branchRef);
            break;
          default:
            noActionRows.push(branchRef);
        }
      }

      console.log(`\n\nrepository path: ${repositoryPath}`);
      console.log(`remote: ${meta.remote}`);
      console.log(`url: ${meta.url}`);
      if (keepRows.length) {
        console.log(`${keepRows.length} branches marked to keep`);
      }
      if (noActionRows.length) {
        console.log(`${noActionRows.length} branches with no action specified`);
      }
      if (deleteRows.length) {
        console.log(`${deleteRows.length} branches marked for removal`);
      }

      if (!deleteRows.length) {
        console.log('\n\nnothing to do here. Bye!');
        return false;
      }

      const deleteBranches = [];
      const goneBranches = [];
      const changedBranches = [];

      await Promise.all(
        deleteRows.map(async ref => {
          const [branchRef, headSha] = ref.split(':');
          const branch = branches.remotes.find(remoteBranch => remoteBranch.name === branchRef);
          if (branch) {
            deleteBranches.push(branch);

            if (branch.head.sha() !== headSha) {
              changedBranches.push(branch);
            }
          } else {
            goneBranches.push(branchRef);
          }
        }),
      );

      if (goneBranches.length) {
        console.log(`\nthe following branches in the sheet are no longer found on ${meta.remote}:`);
        goneBranches.forEach(ref => console.log(` - ${ref}`));
        console.log('these branches will be ignored\n');
      }

      if (changedBranches.length) {
        console.warn(
          `\nWARNING: the following branches have changed on remote "${
            meta.remote
          }" since the sheet was generated:`,
        );
        changedBranches.forEach(branch => console.warn(` - ${branch.shortName}`));
      }

      if (!deleteBranches.length) {
        console.log('nothing to do here. Bye!');
        return false;
      }

      console.log(`\nthe following branches will be deleted on ${meta.remote}:`);
      deleteBranches.forEach(branch => console.log(` - ${branch.shortName}`));

      if (await promptConfirmRemoveBranches(argv.d)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const branch of deleteBranches) {
          if (!branch) {
            console.warn(`Could not find branch: ${branch}`);
          } else {
            // eslint-disable-next-line no-await-in-loop
            await deleteBranch(branch.ref, argv.d, true);
          }
        }
      }

      return false;
    },
  },
];

async function processSheet(argv, spreadsheetId) {
  console.log('getting sheet data...');
  const response = await getSheetData(spreadsheetId);
  const sheetData = response.sheets[0].data[0].rowData;
  const sheetVersion = sheetData[0].values[0].userEnteredValue.stringValue;
  if (!sheetVersion.match(VALIDATE_VERSION_REGEX)) {
    throw new Error(`Value "${sheetVersion}" at [0,0] in sheet does not match expected pattern`);
  }

  const processor = processors.find(({ version }) => {
    const splitVersion = version.split('.');
    const splitSheetVersion = sheetVersion.split('.');

    for (let i = 0; i < splitVersion.length; i++) {
      if (splitSheetVersion[i] > splitVersion[i]) {
        return true;
      }

      if (splitSheetVersion[i] < splitVersion[i]) {
        return false;
      }
    }

    return true;
  });

  if (!processor) {
    throw new Error(`Could not find processor for version ${sheetVersion}`);
  }

  return processor.process(argv, sheetData);
}

export default processSheet;
