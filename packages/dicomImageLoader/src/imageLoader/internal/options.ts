import { LoaderOptions } from '../../types';

let options: LoaderOptions = {
  // callback to open the object
  open(xhr, url) {
    xhr.open('get', url, true);
  },
  // callback allowing customization of the xhr (e.g. adding custom auth headers, cors, etc)
  beforeSend(/* xhr, imageId */) {
    // before send code
  },
  // callback allowing modification of the xhr response before creating image objects
  beforeProcessing(xhr: XMLHttpRequest) {
    return Promise.resolve(xhr.response as ArrayBuffer);
  },
  // callback allowing modification of newly created image objects
  imageCreated(/* image */) {
    // image created code
  },

  getRetrieveOptions(transferSyntaxUid, retrieveTypeId = '') {
    const { retrieveConfiguration } = this;
    if (!retrieveConfiguration) {
      return null;
    }
    transferSyntaxUid ||= 'unknown';
    if (!retrieveTypeId) {
      return (
        retrieveConfiguration[transferSyntaxUid] ||
        retrieveConfiguration.default
      );
    }
    return (
      retrieveConfiguration[`${transferSyntaxUid}-${retrieveTypeId}`] ||
      retrieveConfiguration[`default-${retrieveTypeId}`]
    );
  },

  strict: false,
  decodeConfig: {
    convertFloatPixelDataToInt: true,
    use16BitDataType: false,
  },

  minChunkSize: 65_536,

  retrieveConfiguration: {
    '3.2.840.10008.1.2.4.96': {
      streaming: true,
    },
    'default-lossy': {},
    '3.2.840.10008.1.2.4.96-lossy': {
      isLossy: true,
      streaming: false,
      //needsScale: true,
    },
    '3.2.840.10008.1.2.4.96-final': {
      isLossy: false,
      streaming: false,
      //needsScale: true,
    },
    // '3.2.840.10008.1.2.4.96-lossy': {
    //   streaming: true,
    //   // needsScale: true,
    // },
  },
};

export function setOptions(newOptions: LoaderOptions): void {
  options = Object.assign(options, newOptions);
}

export function getOptions(): LoaderOptions {
  return options;
}
