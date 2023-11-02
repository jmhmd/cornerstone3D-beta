import {
  RenderingEngine,
  Types,
  Enums,
  cache,
  setUseCPURendering,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';

import cornerstoneDicomImageLoader from '@cornerstonejs/dicom-image-loader';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const { ViewportType, ImageQualityStatus } = Enums;

// ======== Set up page ======== //
setTitleAndDescription(
  'Progressive Stack',
  'Displays a single DICOM image in a Stack viewport after clicking the load button.'
);

const content = document.getElementById('content');

const instructions = document.createElement('p');
instructions.innerText = 'Click on a button to perform the given load type';
content.appendChild(instructions);

const loaders = document.createElement('div');
content.appendChild(loaders);

const timingInfo = document.createElement('div');
timingInfo.style.width = '45em';
timingInfo.style.height = '10em';
timingInfo.style.float = 'left';
timingInfo.innerText = 'Timing Info Here';
content.appendChild(timingInfo);

const itemInfo = document.createElement('div');
itemInfo.style.width = '25em';
itemInfo.style.height = '10em';
itemInfo.style.float = 'left';
content.appendChild(itemInfo);
itemInfo.innerHTML = `
<ul>
<li>JLS Thumbnail - small JLS thumbnails only</li>
<li>JLS Mixed - thumbnail first, then full</li>
<li>HTJ2K - streaming load</li>
<li>HTJ2K - lossy byte range then lossy full</li>
<li>Bytes - full resolution 64k bytes, then full final</li>
</ul>
`;

const devicePixelRatio = window.devicePixelRatio || 1;
const element = document.createElement('div');
element.id = 'cornerstone-element';
// Use devicePixelRatio here so that the window size fits all pixels, but not
// larger than that.
element.style.width = `${3036 / devicePixelRatio}px`;
element.style.height = `${3036 / devicePixelRatio}px`;
element.style.clear = 'both';
content.appendChild(element);

// ============================= //

const statusNames = {
  [ImageQualityStatus.FULL_RESOLUTION]: 'full resolution',
  [ImageQualityStatus.LOSSY]: 'lossy',
  [ImageQualityStatus.SUBRESOLUTION]: 'sub-resolution',
};

async function newImageFunction(evt) {
  const { image } = evt.detail;
  const {
    imageQualityStatus: status,
    decodeTimeInMS,
    loadTimeInMS,
    transferSyntaxUID,
  } = image;
  const complete = status === ImageQualityStatus.FULL_RESOLUTION;
  if (complete) {
    element.removeEventListener(
      cornerstone.EVENTS.STACK_NEW_IMAGE,
      newImageFunction
    );
  }
  const completeText = statusNames[status] || `other ${status}`;
  timingInfo.innerHTML += `<p style="margin:0">Render ${completeText} of ${transferSyntaxUID} took ${loadTimeInMS} ms to load and ${decodeTimeInMS} to decode ${
    loadTimeInMS + decodeTimeInMS
  } total</p>`;
}

async function showStack(stack: string[], viewport, config, name: string) {
  cornerstoneDicomImageLoader.configure(config);
  cache.purgeCache();
  timingInfo.innerHTML = `<p id="loading" style="margin:0">Loading ${name}</p>`;
  element.addEventListener(
    cornerstone.EVENTS.STACK_NEW_IMAGE,
    newImageFunction
  );
  const start = Date.now();
  // Set the stack on the viewport
  await viewport.setStack(stack);

  // Render the image
  viewport.render();
  const end = Date.now();
  const { transferSyntaxUID } = cornerstone.metaData.get(
    'transferSyntax',
    stack[0]
  );
  document.getElementById('loading').innerText = `Stack render took ${
    end - start
  } using ${transferSyntaxUID}`;
}

/**
 * Generate the various configurations by using the options on static DICOMweb:
 * Base lossy/full thumbnail configuration for HTJ2K:
 * ```
 * mkdicomweb create -t jhc --recompress true --alternate jhc --alternate-name lossy "/dicom/DE Images for Rad"
 * ```
 *
 * JLS and JLS thumbnails:
 * ```bash
 * mkdicomweb create -t jhc --recompress true --alternate jlsLossless --alternate-name jls "/dicom/DE Images for Rad"
 * mkdicomweb create -t jhc --recompress true --alternate jls --alternate-name jlsThumbnail --alternate-thumbnail "/dicom/DE Images for Rad"
 * ```
 *
 * HTJ2K and HTJ2K thumbnail - lossless:
 * ```bash
 * mkdicomweb create -t jhc --recompress true --alternate jhcLossless --alternate-name htj2k "/dicom/DE Images for Rad"
 * mkdicomweb create -t jhc --recompress true --alternate jhc --alternate-name htj2kThumbnail --alternate-thumbnail "/dicom/DE Images for Rad"
 * ```
 */
const configJLS = {
  retrieveOptions: {
    default: {
      default: {
        framesPath: '/jls/',
      },
    },
  },
};

const configJLSMixed = {
  retrieveOptions: {
    ...configJLS.retrieveOptions,
    singleFast: {
      default: {
        status: ImageQualityStatus.SUBRESOLUTION,
        framesPath: '/jlsThumbnail/',
      },
    },
  },
};

const configJLSThumbnail = {
  retrieveOptions: {
    default: {
      default: {
        framesPath: '/jlsThumbnail/',
      },
    },
  },
};

const configHtj2k = {
  retrieveOptions: {
    default: {
      '3.2.840.10008.1.2.4.96': {
        streaming: true,
        streamingDecode: true,
      },
      default: {
        streaming: true,
        streamingDecode: false,
      },
    },
  },
};

const configHtj2kLossy = {
  retrieveOptions: {
    default: {
      default: {
        streaming: true,
        streamingDecode: true,
        framesPath: '/lossy/',
      },
    },
  },
};

const configHtj2kMixed = {
  retrieveOptions: {
    ...configHtj2k,
    singleFinal: {
      default: {
        range: 1,
        streamingDecode: true,
      },
    },
    singleFast: {
      default: {
        streamingDecode: true,
        range: 0,
        decodeLevel: 3,
      },
    },
  },
};

const configHtj2kThumbnail = {
  retrieveOptions: {
    singleFinal: {
      default: {},
    },
    singleFast: {
      default: {
        status: ImageQualityStatus.SUBRESOLUTION,
        framesPath: '/htj2kThumbnail/',
      },
    },
  },
};

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Get Cornerstone imageIds and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.9590.100.1.2.19841440611855834937505752510708699165',
    SeriesInstanceUID:
      '1.3.6.1.4.1.9590.100.1.2.160160590111755920740089886004263812825',
    wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
  });

  const imageIdsCt = await createImageIdsAndCacheMetaData({
    StudyInstanceUID: '1.3.6.1.4.1.25403.345050719074.3824.20170125113417.1',
    SeriesInstanceUID: '1.3.6.1.4.1.25403.345050719074.3824.20170125113545.4',
    wadoRsRoot: 'https://d3t6nz73ql33tx.cloudfront.net/dicomweb',
  });

  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create a stack viewport
  const viewportId = 'stackViewport';
  const viewportInput = {
    viewportId,
    type: ViewportType.STACK,
    element,
    defaultOptions: {
      background: <Types.Point3>[0.2, 0, 0.2],
    },
  };

  renderingEngine.enableElement(viewportInput);

  // Get the stack viewport that was created
  const viewport = <Types.IStackViewport>(
    renderingEngine.getViewport(viewportId)
  );

  const createButton = (text, action) => {
    const button = document.createElement('button');
    button.innerText = text;
    button.id = text;
    button.onclick = action;
    loaders.appendChild(button);
    return button;
  };

  const loadButton = (text, imageIds, config) => {
    return createButton(
      text,
      showStack.bind(null, imageIds, viewport, config, text)
    );
  };

  loadButton('JLS', imageIds, configJLS);
  loadButton('JLS Thumbnail', imageIds, configJLSThumbnail);
  loadButton('JLS Mixed', imageIds, configJLSMixed);

  loadButton('HTJ2K', imageIds, configHtj2k);
  loadButton('HTJ2K Lossy', imageIds, configHtj2kLossy);
  loadButton('HTJ2K Thumbnail', imageIds, configHtj2kThumbnail);
  loadButton('HTJ2K Bytes', imageIds, configHtj2kMixed);

  loadButton('CT JLS Mixed', imageIdsCt, configJLSMixed);
  loadButton('CT HTJ2K Bytes', imageIdsCt, configHtj2kMixed);

  createButton('Set CPU', (onclick) => {
    const button = document.getElementById('Set CPU');
    const cpuValue = button.innerText === 'Set CPU';
    setUseCPURendering(cpuValue);
    viewport.setUseCPURendering(cpuValue);
    button.innerText = cpuValue ? 'Set GPU' : 'Set CPU';
  });

  const nonProgressive = 'Set Non Progressive';
  createButton(nonProgressive, (onclick) => {
    const button = document.getElementById(nonProgressive);
    const progressive = button.innerText !== nonProgressive;
    button.innerText = progressive ? nonProgressive : 'Set Progressive';
  });
}

run();
