import { setConfig } from '../config';
import findSheet from '../../flows/findSheet';

export const command = 'process-sheet <path>';

export const desc = 'process a Google Sheet previously created with git-housekeeper';

export const builder = yargs =>
  yargs
    .options({
      d: {
        alias: 'dry-run',
        default: false,
        describe: "Executes a dry run (won't remove any branches)",
        type: 'boolean',
      },
    })
    .positional('path', {
      describe: 'the path to the repository to analyse',
      type: 'string',
    });

export const handler = argv => {
  console.log('\nWelcome back!\n\n');
  setConfig(argv);

  findSheet();
};
