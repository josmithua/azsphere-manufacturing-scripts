import { interpret } from 'xstate';
import parseArgs from 'minimist';
import { deviceCompleterMachine } from './deviceCompleterMachine';
import prepare from './commands/prepare';
import { access } from 'fs/promises';
import { join } from 'path';
import complete from './commands/complete';
import { readDeviceConfig } from './deviceConfig';

export async function cli() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'help';

  if (cmd === 'help' || args.help === true) {
    console.log(`
    Dideload production images to the attached device and configure it for OTA updates:
      azsphere-manufacturing-scripts prepare --device-config <path/to/device-config.json>

    Complete the attached device after a successful check for device readiness:
      azsphere-manufacturing-scripts complete --device-config <path/to/device-config.json>`);
    return;
  }

  switch (cmd) {
    case 'prepare':
    case 'complete':
      const deviceConfigPath = args['device-config'];
      if (typeof deviceConfigPath !== 'string') {
        console.error(
          'Must specify a device config file with the `--device-config path/to/file.json` option'
        );
        return;
      }
      const path = join(process.cwd(), deviceConfigPath);
      try {
        const deviceConfig = readDeviceConfig(path);
        if (cmd === 'prepare') {
          prepare(deviceConfig);
        } else {
          complete(deviceConfig);
        }
      } catch (e) {
        console.error((e as Error).message);
      }
      break;
    default:
      console.log(`Unknown command: ${cmd}`);
      return;
  }
}
