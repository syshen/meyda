"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var utilities = _interopRequireWildcard(require("./utilities"));

var extractors = _interopRequireWildcard(require("./featureExtractors"));

var _fftjs = require("fftjs");

var _meydaWa = require("./meyda-wa");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj["default"] = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * Meyda Module
 * @module meyda
 */

/**
 * Options for constructing a MeydaAnalyzer
 * @typedef {Object} MeydaOptions
 * @property {AudioContext} audioContext - The Audio Context for the MeydaAnalyzer to operate in.
 * @property {AudioNode} source - The Audio Node for Meyda to listen to.
 * @property {number} [bufferSize] - The size of the buffer.
 * @property {number} [hopSize] - The hop size between buffers.
 * @property {number} [sampleRate] - The number of samples per second in the audio context.
 * @property {Function} [callback] - A function to receive the frames of audio features
 * @property {string} [windowingFunction] - The Windowing Function to apply to the signal before transformation to the frequency domain
 * @property {string|Array.<string>} [featureExtractors] - Specify the feature extractors you want to run on the audio.
 * @property {boolean} [startImmediately] - Pass `true` to start feature extraction immediately
 */

/**
 * Web Audio context
 * Either an {@link AudioContext|https://developer.mozilla.org/en-US/docs/Web/API/AudioContext}
 * or an {@link OfflineAudioContext|https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext}
 * @typedef {Object} AudioContext
 */

/**
 * AudioNode
 * A Web AudioNode
 * @typedef {Object} AudioNode
 */

/**
 * ScriptProcessorNode
 * A Web Audio ScriptProcessorNode
 * @typedef {Object} ScriptProcessorNode
 */

/**
 * @class Meyda
 * @hideconstructor
 * @classdesc
 * The schema for the default export of the Meyda library.
 * @example
 * var Meyda = require('meyda');
 */
var Meyda = {
  /**
   * Meyda stores a reference to the relevant audio context here for use inside
   * the Web Audio API.
   * @instance
   * @member {AudioContext}
   */
  audioContext: null,

  /**
   * Meyda keeps an internal ScriptProcessorNode in which it runs audio feature
   * extraction. The ScriptProcessorNode is stored in this member variable.
   * @instance
   * @member {ScriptProcessorNode}
   */
  spn: null,

  /**
   * The length of each buffer that Meyda will extract audio on. When recieving
   * input via the Web Audio API, the Script Processor Node chunks incoming audio
   * into arrays of this length. Longer buffers allow for more precision in the
   * frequency domain, but increase the amount of time it takes for Meyda to
   * output a set of audio features for the buffer. You can calculate how many
   * sets of audio features Meyda will output per second by dividing the
   * buffer size by the sample rate. If you're using Meyda for visualisation,
   * make sure that you're collecting audio features at a rate that's faster
   * than or equal to the video frame rate you expect.
   * @instance
   * @member {number}
   */
  bufferSize: 512,

  /**
   * The number of samples per second of the incoming audio. This affects
   * feature extraction outside of the context of the Web Audio API, and must be
   * set accurately - otherwise calculations will be off.
   * @instance
   * @member {number}
   */
  sampleRate: 44100,

  /**
   * The number of Mel bands to use in the Mel Frequency Cepstral Co-efficients
   * feature extractor
   * @instance
   * @member {number}
   */
  melBands: 26,

  /**
   * The number of bands to divide the spectrum into for the Chroma feature
   * extractor. 12 is the standard number of semitones per octave in the western
   * music tradition, but Meyda can use an arbitrary number of bands, which
   * can be useful for microtonal music.
   * @instance
   * @member {number}
   */
  chromaBands: 12,

  /**
   * A function you can provide that will be called for each buffer that Meyda
   * receives from its source node
   * @instance
   * @member {Function}
   */
  callback: null,

  /**
   * Specify the windowing function to apply to the buffer before the
   * transformation from the time domain to the frequency domain is performed
   * @instance
   * @member {string}
   */
  windowingFunction: 'hanning',

  /**
   * @member {object}
   */
  featureExtractors: extractors,
  EXTRACTION_STARTED: false,
  numberOfMFCCCoefficients: 13,
  _featuresToExtract: [],
  windowing: utilities.applyWindow,
  _errors: {
    notPow2: new Error('Meyda: Buffer size must be a power of 2, e.g. 64 or 512'),
    featureUndef: new Error('Meyda: No features defined.'),
    invalidFeatureFmt: new Error('Meyda: Invalid feature format'),
    invalidInput: new Error('Meyda: Invalid input.'),
    noAC: new Error('Meyda: No AudioContext specified.'),
    noSource: new Error('Meyda: No source node specified.')
  },

  /**
   * @summary
   * Create a MeydaAnalyzer
   *
   * A factory function for creating a MeydaAnalyzer, the interface for using
   * Meyda in the context of Web Audio.
   *
   * @method
   * @param {MeydaOptions} options Options - an object containing configuration
   * @returns {MeydaAnalyzer}
   * @example
   * const analyzer = Meyda.createMeydaAnalyzer({
   *   "audioContext": audioContext,
   *   "source": source,
   *   "bufferSize": 512,
   *   "featureExtractors": ["rms"],
   *   "inputs": 2,
   *   "callback": features => {
   *     levelRangeElement.value = features.rms;
   *   }
   * });
   */
  createMeydaAnalyzer: function createMeydaAnalyzer(options) {
    return new _meydaWa.MeydaAnalyzer(options, Object.assign({}, Meyda));
  },

  /**
   * Extract an audio feature from a buffer
   * @function
   * @param {(string|Array.<string>)} feature - the feature you want to extract
   * @param {Array.<number>} signal
   * An array of numbers that represents the signal. It should be of length
   * `meyda.bufferSize`
   * @param {Array.<number>} [previousSignal] - the previous buffer
   * @returns {object} Features
   * @example
   * meyda.bufferSize = 2048;
   * const features = meyda.extract(['zcr', 'spectralCentroid'], signal);
   */
  extract: function extract(feature, signal, previousSignal) {
    var _this = this;

    if (!signal) throw this._errors.invalidInput;else if (_typeof(signal) != 'object') throw this._errors.invalidInput;else if (!feature) throw this._errors.featureUndef;else if (!utilities.isPowerOfTwo(signal.length)) throw this._errors.notPow2;

    if (typeof this.barkScale == 'undefined' || this.barkScale.length != this.bufferSize) {
      this.barkScale = utilities.createBarkScale(this.bufferSize, this.sampleRate, this.bufferSize);
    } // Recalculate mel bank if buffer length changed


    if (typeof this.melFilterBank == 'undefined' || this.barkScale.length != this.bufferSize || this.melFilterBank.length != this.melBands) {
      this.melFilterBank = utilities.createMelFilterBank(Math.max(this.melBands, this.numberOfMFCCCoefficients), this.sampleRate, this.bufferSize);
    } // Recalculate chroma bank if buffer length changed


    if (typeof this.chromaFilterBank == 'undefined' || this.chromaFilterBank.length != this.chromaBands) {
      this.chromaFilterBank = utilities.createChromaFilterBank(this.chromaBands, this.sampleRate, this.bufferSize);
    }

    if (typeof signal.buffer == 'undefined') {
      //signal is a normal array, convert to F32A
      this.signal = utilities.arrayToTyped(signal);
    } else {
      this.signal = signal;
    }

    var preparedSignal = prepareSignalWithSpectrum(signal, this.windowingFunction, this.bufferSize);
    this.signal = preparedSignal.windowedSignal;
    this.complexSpectrum = preparedSignal.complexSpectrum;
    this.ampSpectrum = preparedSignal.ampSpectrum;

    if (previousSignal) {
      var _preparedSignal = prepareSignalWithSpectrum(previousSignal, this.windowingFunction, this.bufferSize);

      this.previousSignal = _preparedSignal.windowedSignal;
      this.previousComplexSpectrum = _preparedSignal.complexSpectrum;
      this.previousAmpSpectrum = _preparedSignal.ampSpectrum;
    }

    var extract = function extract(feature) {
      return _this.featureExtractors[feature]({
        ampSpectrum: _this.ampSpectrum,
        chromaFilterBank: _this.chromaFilterBank,
        complexSpectrum: _this.complexSpectrum,
        signal: _this.signal,
        bufferSize: _this.bufferSize,
        sampleRate: _this.sampleRate,
        barkScale: _this.barkScale,
        melFilterBank: _this.melFilterBank,
        previousSignal: _this.previousSignal,
        previousAmpSpectrum: _this.previousAmpSpectrum,
        previousComplexSpectrum: _this.previousComplexSpectrum,
        numberOfMFCCCoefficients: _this.numberOfMFCCCoefficients
      });
    };

    if (_typeof(feature) === 'object') {
      return feature.reduce(function (acc, el) {
        return Object.assign({}, acc, _defineProperty({}, el, extract(el)));
      }, {});
    } else if (typeof feature === 'string') {
      return extract(feature);
    } else {
      throw this._errors.invalidFeatureFmt;
    }
  }
};

var prepareSignalWithSpectrum = function prepareSignalWithSpectrum(signal, windowingFunction, bufferSize) {
  var preparedSignal = {};

  if (typeof signal.buffer == 'undefined') {
    //signal is a normal array, convert to F32A
    preparedSignal.signal = utilities.arrayToTyped(signal);
  } else {
    preparedSignal.signal = signal;
  }

  preparedSignal.windowedSignal = utilities.applyWindow(preparedSignal.signal, windowingFunction);
  preparedSignal.complexSpectrum = (0, _fftjs.fft)(preparedSignal.windowedSignal);
  preparedSignal.ampSpectrum = new Float32Array(bufferSize / 2);

  for (var i = 0; i < bufferSize / 2; i++) {
    preparedSignal.ampSpectrum[i] = Math.sqrt(Math.pow(preparedSignal.complexSpectrum.real[i], 2) + Math.pow(preparedSignal.complexSpectrum.imag[i], 2));
  }

  return preparedSignal;
};
/**
 * The Meyda class
 * @type {Meyda}
 */


var _default = Meyda;
exports["default"] = _default;
if (typeof window !== 'undefined') window.Meyda = Meyda;
module.exports = exports["default"];