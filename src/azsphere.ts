import { run } from './run';

export type ManufacturingState = 'Module1Complete' | 'DeviceComplete';

export type DeviceGroup = `${string}/${string}`;

export type Image = {
  imageId: string;
  componentId: string;
};

export async function getManufacturingState(): Promise<ManufacturingState> {
  const result = await run('azsphere', [
    'device',
    'manufacturing-state',
    'show',
    '--output',
    'json',
  ]);
  const json = JSON.parse(result.stdout);
  return json['manufacturingState'];
}

// Get the version of the azsphere sdk
export async function getVersion(): Promise<string> {
  const result = await run('azsphere', ['show-version', '--output', 'json']);
  const json = JSON.parse(result.stdout);
  return json['Azure Sphere SDK'];
}

export async function recoverDevice() {
  await run('azsphere', ['device', 'recover']);
}

export async function getDeviceCapabilities() {
  const result = await run('azsphere', [
    'device',
    'capability',
    'show-attached',
    '--output',
    'json',
  ]);
  const json = JSON.parse(result.stdout);
  return json as string[];
}

export async function getDeviceWifiListCount() {
  const result = await run('azsphere', ['device', 'wifi', 'list']);
  return (result.stdout.match(/ID\s+:\s\d+/g) || []).length;
}

export async function getDeviceOsVersion() {
  const result = await run('azsphere', ['device', 'show-os-version']);
  const match = result.stdout.match(/Azure Sphere OS version (.+)\./);
  if (match) {
    return match[1];
  } else {
    throw new Error('Could not get device OS version');
  }
}

export async function getInstalledImages(): Promise<Image[]> {
  const result = await run('azsphere', ['device', 'image', 'list-installed']);
  const installedImages = parseImagesFromOutput(result.stdout);
  return installedImages;
}

/**
 * Parse the output into Image objects
 * The output looks like this:
 * ```
 * Installed images:
 * --> NW Kernel
 *   --> Image type:   System software image type 7
 *   --> Component ID: ec96028b-080b-4ff5-9ef1-b40264a8c652
 *   --> Image ID:     039b4c3f-7d1c-4354-98de-3fbdea90eabc
 * --> NW Root Filesystem
 *  --> Image type:   System software image type 8
 *  --> Component ID: f7fd0c88-d005-45c6-ac4b-88afdbf2dc6a
 *  --> Image ID:     2e6ad9ac-bb2c-41bc-ab42-cb307cab8992
 * ```
 */
export function parseImagesFromOutput(output: string): Image[] {
  type OutputImage = Image & { name: string; imageType: string };
  const lines = output.split('\n');
  const images = [];
  let currentImage: OutputImage | undefined;
  for (const line of lines) {
    if (line.startsWith('Installed images:')) {
      continue;
    }
    if (line.startsWith(' --> ')) {
      const [, name] = line.split(' --> ');
      currentImage = {
        name: name.trim(),
      } as OutputImage;
      images.push(currentImage);
      continue;
    }
    if (currentImage) {
      const [type, id] = line.split(':');
      const trimmedId = id.trim();
      if (type.includes('Image type')) {
        currentImage.imageType = trimmedId;
      } else if (type.includes('Component ID')) {
        currentImage.componentId = trimmedId;
      } else if (type.includes('Image ID')) {
        currentImage.imageId = trimmedId;
      }
    }
  }
  return images;
}

export async function sideloadImage(path: string) {
  await run('azsphere', ['device', 'sideload', 'deploy', '--image-package', path]);
}

export async function claimDevice() {
  await run('azsphere', ['device', 'claim', '--force']);
}

export async function updateDeviceGroup(deviceGroup: DeviceGroup) {
  await run('azsphere', ['device', 'update', '--device-group', deviceGroup]);
}

export function areSameImages(images1: Image[], images2: Image[]) {
  return (
    images1.length === images2.length &&
    images1.every((image1) => images2.some((image2) => image1.imageId === image2.imageId))
  );
}

export async function areExactImagesInstalled(expected: Image[]) {
  const actual = await getInstalledImages();
  return areSameImages(expected, actual);
}

export async function setManufacturingState(state: ManufacturingState) {
  await run('azsphere', ['device', 'manufacturing-state', 'update', '--state', state]);
}
