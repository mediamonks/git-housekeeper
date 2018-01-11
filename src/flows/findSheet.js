import inquirer from 'inquirer';
import * as proxyApi from '../api/proxy';
import * as googleApi from '../api/google';

async function promptApiUsage() {
  proxyApi.logDisclaimer();

  const { api } = await inquirer.prompt([
    {
      name: 'api',
      message: '[review remote] Would you like to use the API?',
      type: 'list',
      choices: [
        {
          name: 'yes (recommended)',
          value: proxyApi,
        },
        {
          name:
            "no, I'd rather use the Google API directly (requires setting up an OAuth client ID)",
          value: googleApi,
        },
      ],
    },
  ]);

  return api;
}

async function findSheet() {
  const api = await promptApiUsage();

  const authenticated = await api.authenticate();
  if (!authenticated) {
    return false;
  }

  const sheetId = await api.findSheet();

  if (!sheetId) {
    console.log('\nBye!\n');
    return false;
  }

  return api.processSheet(sheetId);
}

export default findSheet;
