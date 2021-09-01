import { createMachine, actions } from 'xstate';
import {
  areSameImages,
  getDeviceCapabilities,
  getDeviceOsVersion,
  getDeviceWifiListCount,
  getInstalledImages,
  getManufacturingState,
} from './azsphere';
import type { DeviceConfig } from './deviceConfig';

const { log } = actions;

type Context = { deviceConfig: DeviceConfig };
export const deviceCompleterMachine = createMachine<Context>(
  {
    id: 'deviceCompletor',
    initial: 'checkingIfDeviceIsReadyToComplete',
    states: {
      checkingIfDeviceIsReadyToComplete: {
        entry: log('Checking if device is ready to complete...'),
        invoke: {
          src: 'checkIfDeviceIsReadyToComplete',
          onError: { target: 'notReadyToBeCompleted', actions: log((_, e) => `Error: ${e}`) },
        },
        on: {
          ALREADY_COMPLETED: {
            target: 'completed',
            actions: log('❕ The device is already completed.'),
          },
          DEVICE_READY: {
            target: 'completingDevice',
            actions: log('Device is ready to be completed.'),
          },
          DEVICE_NOT_READY: {
            target: 'notReadyToBeCompleted',
            actions: log((_ctx, e) => 'Device not ready to be completed. Reason: ' + e.reason),
          },
        },
      },
      completingDevice: {
        entry: log('Completing device...'),
        invoke: {
          src: 'completeDevice',
          onDone: {
            target: 'completed',
            actions: log('✅ The device was completed successfully.'),
          },
          onError: {
            target: 'error',
            actions: log(
              (_, e) => `❌ There was an error completing the device: ${e.data.message}`
            ),
          },
        },
      },
      notReadyToBeCompleted: {},
      error: {},
      completed: {
        type: 'final',
      },
    },
  },
  {
    services: {
      checkIfDeviceIsReadyToComplete: (ctx) => async (send) => {
        const manufacturingState = await getManufacturingState();
        if (manufacturingState == 'DeviceComplete') {
          send('ALREADY_COMPLETED');
          return;
        }

        const [capabilities, installedImages, osVersion, wifiNetworkCount] = await Promise.all([
          getDeviceCapabilities(),
          getInstalledImages(),
          getDeviceOsVersion(),
          getDeviceWifiListCount(),
        ]);

        let reason: string | null = null;
        if (manufacturingState !== ctx.deviceConfig.expectedManufacturingState) {
          reason = `Expected manufacturing state: ${ctx.deviceConfig.expectedManufacturingState}`;
        } else if (capabilities.length > 0) {
          reason = `Device has capabilities configured`;
        } else if (!areSameImages(ctx.deviceConfig.images, installedImages)) {
          reason = `Device doesn't have the correct images installed`;
        } else if (osVersion !== ctx.deviceConfig.expectedOsVersion) {
          reason = `Expected device to be running OS version ${ctx.deviceConfig.expectedOsVersion}, but found ${osVersion}`;
        } else if (wifiNetworkCount > 0) {
          reason = `Device has wifi networks configured`;
        }

        send(reason != null ? { type: 'DEVICE_NOT_READY', reason } : 'DEVICE_READY');
      },
      completeDevice: async (ctx) => {
        //await setManufacturingState(ctx.deviceConfig.desiredManufacturingState)
      },
    },
  }
);
