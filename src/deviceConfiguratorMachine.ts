import { createMachine, assign } from 'xstate';
import { otaUpdateConfiguratorMachine } from './otaConfiguratorMachine';
import { imageSideloaderMachine } from './imageSideloaderMachine';
import type { ManufacturingState } from './azsphere';
import type { DeviceConfig } from './deviceConfig';

type Context = {
  deviceConfig: DeviceConfig;
  manufacturingState?: ManufacturingState;
};

export const deviceConfiguratorMachine = createMachine<Context>(
  {
    id: 'device',
    initial: 'sideloadingProdImages',
    states: {
      sideloadingProdImages: {
        invoke: {
          src: 'imageSideloaderMachine',
          data: (ctx) => ({
            expectedOsVersion: ctx.deviceConfig.expectedOsVersion,
            images: ctx.deviceConfig.images,
          }),
          onDone: 'configureOtaUpdates',
          onError: 'error',
        },
        on: {
          MANUFACTURING_STATE: {
            actions: assign({ manufacturingState: (_ctx, e) => e.manufacturingState }),
          },
        },
      },
      configureOtaUpdates: {
        invoke: {
          src: 'otaUpdateConfiguratorMachine',
          data: (ctx) => ({
            deviceGroup: ctx.deviceConfig.deviceGroup,
          }),
          onDone: 'done',
          onError: 'error',
        },
      },
      done: {
        type: 'final',
      },
      error: {
        type: 'final',
      },
    },
  },
  {
    services: {
      otaUpdateConfiguratorMachine,
      imageSideloaderMachine,
    },
  }
);
