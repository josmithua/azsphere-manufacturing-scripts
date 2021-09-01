import { createMachine, actions, assign } from 'xstate';
import {
  getDeviceCapabilities,
  getDeviceOsVersion,
  getDeviceWifiListCount,
  getManufacturingState,
  recoverDevice,
  sideloadImage,
  areExactImagesInstalled,
} from './azsphere';
import type { ImageWithPath } from './deviceConfig';

const { log } = actions;

type Context = {
  expectedOsVersion: string;
  images: ImageWithPath[];
  manufacturingState?: string;
};

export const imageSideloaderMachine = createMachine<Context>(
  {
    id: 'imageSideloaderMachine',
    initial: 'checkingManufacturingState',
    states: {
      checkingManufacturingState: {
        entry: log('Checking manufacturing state...'),
        invoke: {
          src: 'checkManufacturingState',
          onError: 'error',
        },
        on: {
          NOT_COMPLETED: {
            target: 'checkingIfShouldRecover',
            actions: [
              'assignManufacturingState',
              log(
                (ctx, e) => `Device is not completed. Manufacturing state: ${e.manufacturingState}`
              ),
            ],
          },
          COMPLETED: {
            target: 'done',
            actions: log(
              '❕ The device is in the DeviceComplete manufacturing state and cannot be prepared'
            ),
          },
        },
      },
      checkingIfShouldRecover: {
        entry: log('Checking if the device should be recovered...'),
        invoke: {
          src: 'checkIfShouldRecover',
        },
        on: {
          SHOULD_RECOVER: {
            target: 'recovering',
            actions: log((_, e) => 'Device needs to be recovered. Reason: ' + e.reason),
          },
          SHOULD_NOT_RECOVER: {
            target: 'checkingIfAlreadyInstalled',
            actions: log('Device does not need to be recovered'),
          },
        },
      },
      recovering: {
        entry: log('Recovering device... Please note that this may take up to 10 minutes.'),
        invoke: {
          src: 'recover',
          onDone: {
            target: 'checkingIfAlreadyInstalled',
            actions: log('✅ Device recovered successfully'),
          },
          onError: {
            target: 'error',
            actions: log('❌ Recovery failed'),
          },
        },
      },
      checkingIfAlreadyInstalled: {
        entry: log('Checking if the images are already installed...'),
        invoke: {
          src: 'checkIfAlreadyInstalled',
        },
        on: {
          INSTALLED: {
            target: 'done',
            actions: log('Images are already installed on the device'),
          },
          NOT_INSTALLED: {
            target: 'sideloadingImages',
            actions: log('Images are not already installed'),
          },
        },
      },
      sideloadingImages: {
        entry: log('Sideloading images...'),
        invoke: {
          src: 'sideloadImages',
          onDone: {
            target: 'done',
            actions: log('✅ Images sideloaded successfully'),
          },
          onError: {
            target: 'error',
            actions: log((ctx, e) => '❌ Sideloading failed!' + e.data),
          },
        },
      },
      done: {
        type: 'final',
      },
      error: {},
    },
  },
  {
    actions: {
      assignManufacturingState: assign({
        manufacturingState: (_ctx, e) => e.manufacturingState,
      }),
    },
    services: {
      checkManufacturingState: () => async (send) => {
        const manufacturingState = await getManufacturingState();
        if (manufacturingState === 'DeviceComplete') {
          send('COMPLETED');
        } else {
          send({ type: 'NOT_COMPLETED', manufacturingState });
        }
      },
      checkIfShouldRecover: (ctx) => async (send) => {
        const [capabilities, wifiNetworkCount, osVersion] = await Promise.all([
          getDeviceCapabilities(),
          getDeviceWifiListCount(),
          getDeviceOsVersion(),
        ]);

        let reason: string | null = null;
        if (ctx.manufacturingState! != 'Blank' && capabilities.length > 0) {
          reason = 'Device has capabilities configured';
        } else if (wifiNetworkCount > 0) {
          reason = 'Device has wifi networks configured';
        } else if (osVersion !== ctx.expectedOsVersion) {
          reason = `Expected device to be running OS version ${ctx.expectedOsVersion}, but found ${osVersion}`;
        }

        send(reason !== null ? { type: 'SHOULD_RECOVER', reason } : 'SHOULD_NOT_RECOVER');
      },
      checkIfAlreadyInstalled: (ctx) => async (send) => {
        const areImagesInstalled = await areExactImagesInstalled(ctx.images);
        send(areImagesInstalled ? 'INSTALLED' : 'NOT_INSTALLED');
      },
      recover: async () => await recoverDevice(),
      sideloadImages: async (ctx) => {
        ctx.images.forEach(async (image) => {
          await sideloadImage(image.path);
        });
      },
    },
  }
);
