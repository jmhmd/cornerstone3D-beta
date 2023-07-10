import { xhrRequest } from '../internal/index';
import findIndexOfString from './findIndexOfString';

const partialRequests: { [key: string]: Uint8Array[] } = {};

function findBoundary(header: string[]): string {
  for (let i = 0; i < header.length; i++) {
    if (header[i].substr(0, 2) === '--') {
      return header[i];
    }
  }
}

function findContentType(header: string[]): string {
  for (let i = 0; i < header.length; i++) {
    if (header[i].substr(0, 13) === 'Content-Type:') {
      return header[i].substr(13).trim();
    }
  }
}

function uint8ArrayToString(data, offset, length) {
  offset = offset || 0;
  length = length || data.length - offset;
  let str = '';

  for (let i = offset; i < offset + length; i++) {
    str += String.fromCharCode(data[i]);
  }

  return str;
}

function getPixelData(
  uri: string,
  imageId: string,
  mediaType = 'application/octet-stream',
  progressive?: undefined | { rangeType: 'bytes'; range: [number, number] }
): Promise<any> {
  const headers: { Accept: string; Range?: string } = {
    Accept: mediaType,
  };

  if (progressive) {
    if (progressive.rangeType === 'bytes')
      headers.Range = `bytes=${progressive.range[0]}-${progressive.range[1]}`;
  }

  return new Promise((resolve, reject) => {
    const loadPromise = xhrRequest(uri, imageId, headers);
    const { xhr } = loadPromise;

    loadPromise.then(async function (imageFrameAsArrayBuffer /* , xhr*/) {
      // request succeeded, Parse the multi-part mime response
      let response = new Uint8Array(imageFrameAsArrayBuffer);

      if (partialRequests[imageId] && partialRequests[imageId].length > 0) {
        const priorResponses = partialRequests[imageId];
        const allResponses = [
          ...priorResponses.map((arrayBuffer) => new Uint8Array(arrayBuffer)),
          response,
        ];
        const totalLength = allResponses.reduce(
          (prev, next) => prev + next.length,
          0
        );
        partialRequests[imageId].push(response);
        response = new Uint8Array(totalLength);
        allResponses.forEach((r, i) =>
          response.set(r, i > 0 ? allResponses[i - 1].length : 0)
        );
        console.log(
          `Combined prior partial responses for imageid ${imageId}, for a total length of ${totalLength}.`
        );
      } else {
        if (!partialRequests[imageId]) partialRequests[imageId] = [];
        partialRequests[imageId].push(response);
      }

      const contentType =
        xhr.getResponseHeader('Content-Type') || 'application/octet-stream';

      if (contentType.indexOf('multipart') === -1) {
        resolve({
          contentType,
          imageFrame: {
            pixelData: response,
          },
        });

        return;
      }

      // First look for the multipart mime header
      const tokenIndex = findIndexOfString(response, '\r\n\r\n');

      if (tokenIndex === -1) {
        reject(new Error('invalid response - no multipart mime header'));
      }
      const header = uint8ArrayToString(response, 0, tokenIndex);
      // Now find the boundary  marker
      const split = header.split('\r\n');
      const boundary = findBoundary(split);

      if (!boundary) {
        reject(new Error('invalid response - no boundary marker'));
      }
      const offset = tokenIndex + 4; // skip over the \r\n\r\n

      // find the terminal boundary marker
      const endIndex = findIndexOfString(response, boundary, offset);

      if (endIndex === -1) {
        reject(new Error('invalid response - terminating boundary not found'));
      }

      // Remove \r\n from the length
      const length = endIndex - offset - 2;

      // return the info for this pixel data
      resolve({
        contentType: findContentType(split),
        imageFrame: {
          pixelData: new Uint8Array(imageFrameAsArrayBuffer, offset, length),
        },
      });
    }, reject);
  });
}

export default getPixelData;
