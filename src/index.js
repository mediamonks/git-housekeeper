import yargs from 'yargs';
import packageJson from '../package.json';
import * as processSheetCommand from './args/commands/process-sheet';
import * as defaultCommand from './args/commands/default';

console.log(`\n${packageJson.name} v${packageJson.version}`);

// eslint-disable-next-line no-unused-expressions
yargs
  .command(defaultCommand)
  .command(processSheetCommand)
  .help()
  .wrap(yargs.terminalWidth()).argv;
