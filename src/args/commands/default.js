import { setConfig } from '../config';
import mainMenu from '../../flows/mainMenu';

export const command = '$0 <path>';

export const desc = 'run git-housekeeper on the given repository';

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
  setConfig(argv);

  mainMenu();
};
