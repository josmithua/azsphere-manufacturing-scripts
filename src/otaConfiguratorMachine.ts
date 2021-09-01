import { createMachine, actions } from 'xstate';
import { claimDevice, DeviceGroup, updateDeviceGroup } from './azsphere';
const { log } = actions;

type Context = {
  deviceGroup: DeviceGroup;
};

export const otaUpdateConfiguratorMachine = createMachine<Context>(
  {
    id: 'otaUpdateConfigurator',
    initial: 'claimingDevice',
    states: {
      claimingDevice: {
        entry: log('Claiming device...'),
        invoke: {
          src: 'claimDevice',
          onDone: {
            target: 'claimed',
            actions: log('✅ Device claimed successfully'),
          },
          onError: {
            target: 'error',
            actions: log((_, e) => '❌ Error claiming device: ' + e.data.message),
          },
        },
      },
      claimed: {
        entry: log((ctx) => `Updating device group to ${ctx.deviceGroup}...`),
        invoke: {
          src: 'updateDeviceGroup',
          onDone: {
            target: 'configured',
            actions: log('✅ Device group updated successfully'),
          },
          onError: {
            target: 'error',
            actions: log((_, e) => '❌ Error updating device group: ' + e.data.message),
          },
        },
      },
      configured: {
        type: 'final',
      },
      error: {},
    },
  },
  {
    services: {
      claimDevice,
      updateDeviceGroup: async (ctx) => {
        await updateDeviceGroup(ctx.deviceGroup);
      },
    },
  }
);
