import type { ManufacturingState, Image } from './azsphere';

export type ImageWithPath = Image & { path: string };

export type DeviceConfig = {
  expectedOsVersion: string;
  expectedManufacturingState: ManufacturingState;
  desiredManufacturingState: ManufacturingState;
  deviceGroup: string;
  images: ImageWithPath[];
};

/**
 * Read a device configuration from a json file.
 * If the file doesn't exist, throw an error.
 * @param path Absolute path to the json file.
 * @returns A DeviceConfig object.
 * @throws Error if the file doesn't exist.
 * @throws Error if the file is malformed.
 */
export function readDeviceConfig(path: string): DeviceConfig {
  try {
    const config = require(path);
    if (typeof config !== 'object') {
      throw new Error(`Invalid device config: ${path}`);
    }
    return config;
  } catch (error) {
    // @ts-ignore
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Device config file does not exist: ${path}`);
    } else {
      throw error;
    }
  }
}
