import inquirer from 'inquirer';
import { reviewGoogleSheetsLocal } from './reviewRemoteGoogleSheetsLocal';

async function reviewGoogleSheets(argv, remoteBranches, baseBranch, commitsInBase) {
  console.log('\n---- IMPORTANT ----\n');

  console.log(
    'In order to easily generate Google Sheets, git-housekeeper hosts an API that\n' +
      'calls the Google API based on the meta information of the branches in your repository.\n' +
      'Branch names, author names, remote urls and commit messages and dates will be sent to this \n' +
      'API. This data will be used solely for generating the Google Sheet and will not be\n' +
      'stored on our servers.',
  );
  console.log(
    'If you would rather not share repository information with our API, you have the\n' +
      'option to use to the Google API directly. Please consult the README for more information.',
  );

  console.log('\n------------------\n');

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: '[review remote] Would you like to use the API?',
      type: 'list',
      choices: [
        {
          name: 'yes (recommended)',
          value: () => console.log('TODO'),
        },
        {
          name: 'yes, but exclude commit messages',
          value: () => console.log('TODO'),
        },
        {
          name:
            "no, I'd rather use the Google API directly (requires setting up an OAuth client ID)",
          value: () => reviewGoogleSheetsLocal(argv, remoteBranches, baseBranch, commitsInBase),
        },
      ],
    },
  ]);

  return action();
}

export default reviewGoogleSheets;
