export interface RetrieveStage {
  id: string;
  // Set of positions - negative values are relative to the end, positive to
  // the beginning, and fractional values between 0 and 1 are relative to frame count
  positions?: number[];
  // Alternately, choose positions by decimating at the given interval
  decimate?: number;
  // With the given offset to decimation
  offset?: number;
  // Use a specified retrieve type to add fetch arguments and configuration
  // on the retrieve URL.
  retrieveTypeId?: string;
  // If true, remove from the set of items
  remove?: boolean;
}

export interface LossyConfiguration {
  // Additional arguments to add to the URL, in the format
  // arg1=value1 ('&' arg2=value2)*
  // For example: '&lossy=jhc' to use JHC lossy values
  urlArguments?: string;
  // Alternate way to encode argument information by updating the frames path
  framesPath?: string;
  // True to use streaming decode
  streaming?: boolean;
  // byte range value to retrieve for initial decode
  byteRange?: string;
  // Decode level to attempt
  decodeLevel?: number;
  // Load status when this item has complete - true to indicate lossy response
  isLossy?: boolean;
}

/**
 * Defines how the retrieve configuration is handled for single and multi
 * frame volumes.  This includes things like prefetch information and
 * ordering for streaming volumes.
 */
export interface IRetrieveConfiguration {
  stages?: RetrieveStage[];
}
