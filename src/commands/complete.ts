import { interpret } from 'xstate';
import { deviceCompleterMachine } from '../deviceCompleterMachine';
import type { DeviceConfig } from '../deviceConfig';

export default function complete(deviceConfig: DeviceConfig) {
  interpret(deviceCompleterMachine.withContext({ deviceConfig }), { devTools: true }).start();
}
