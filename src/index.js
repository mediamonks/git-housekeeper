import yargs from 'yargs';
import path from 'path';
import { openRepository, fetchRemote } from './git';

const { argv } = yargs
  .usage('$0 <path>', 'starts branch cleanup for the given repository', y => {
    y.positional('path', {
      describe: 'the path to the repository to analyse',
      type: 'string',
    });
  })
  .options({
    d: {
      alias: 'dry-mode',
      default: false,
      describe: "Runs in dry mode (won't remove any branches)",
      type: 'boolean',
    },
  })
  .help();

async function mainMenu() {
  
}

(async function main() {
  console.log('\n\n Welcome to git housekeeper! \n\n');
  const repositoryPath = path.resolve(argv.path);
  await openRepository(repositoryPath);
  await fetchRemote();
  await mainMenu();
})();
