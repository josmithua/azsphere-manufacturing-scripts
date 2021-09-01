import { interpret } from 'xstate';
import { deviceConfiguratorMachine } from '../deviceConfiguratorMachine';
import type { DeviceConfig } from '../deviceConfig';

export default function prepare(config: DeviceConfig) {
  interpret(deviceConfiguratorMachine.withContext({ deviceConfig: config }), { devTools: true })
    .onTransition(async (state) => {
      if (state.matches('done') && state.context.manufacturingState !== 'DeviceComplete') {
        console.log(
          '✨ The attached device is ready to be completed. Complete the device by running the `complete` command'
        );
      }
    })
    .start();
}
