# [Symbl - Opus JS Encoder / Decoder][0]

This library has been forked from [mmig/opus-encdec](https://github.com/mmig/opus-encdec/commit/e33ca40b92ddff8c168c7f5aca34b626c9acc08a) and modified.

#### Installing

Install via `npm` registry
```bash
npm install symbl-opus-encdec
```

Latest from repository
```bash
npm install git+https://github.com/symblai/opus-encdec.git
```

#### Usage
To use this library simply include the below code snippet in the public.html

```html
  <script src="https://sdk.symbl.ai/js/ga/symbl-opus-encdec/0.1.2/dist/recorder.min.js" type="text/javascript"></script>
```

The library loads the required asynchronous worker files from Symbl's CDN, therefore reducing the integration effort to just importing and start using the library.

An example configuration and initialization is shown below
```javascript
    const opusRecordingOptions = {
        numberOfChannels: 1,
        encoderSampleRate: 48000,
        encoderFrameSize: 20,
        maxFramesPerPage: 40,
        encoderComplexity: 6,
        streamPages: true,
//      sourceNode: source, //Can be passed-in from custom streams
        rawOpus: true
    };

    opusEncoder = new window.Recorder(opusRecordingOptions);
```

#### General Config options

- **bufferLength**                - (*optional*) The length of the buffer that the scriptProcessorNode uses to capture the audio. Defaults to `4096`.
- **encoderPath**                 - (*optional*) Path to desired worker script. Defaults to `encoderWorker.min.js`
- **mediaTrackConstraints**       - (*optional*) Object to specify [media track constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints). Defaults to `true`.
- **monitorGain**                 - (*optional*) Sets the gain of the monitoring output. Gain is an a-weighted value between `0` and `1`. Defaults to `0`
- **numberOfChannels**            - (*optional*) The number of channels to record. `1` = mono, `2` = stereo. Defaults to `1`. Maximum `2` channels are supported.
- **recordingGain**               - (*optional*) Sets the gain of the recording input. Gain is an a-weighted value between `0` and `1`. Defaults to `1`
- **sourceNode**                  - (*optional*) An Instance of MediaStreamAudioSourceNode to use. If a sourceNode is provided, then closing the stream and audioContext will need to be managed by the implementation.


#### Config options for OGG OPUS encoder

- **encoderApplication**          - (*optional*) Supported values are: `2048` - Voice, `2049` - Full Band Audio, `2051` - Restricted Low Delay. Defaults to `2049`.
- **encoderBitRate**              - (*optional*) Target bitrate in bits/sec. The encoder selects an application-specific default when this is not specified.
- **encoderComplexity**           - (*optional*) Value between 0 and 10 which determines latency and processing for encoding. `0` is fastest with lowest complexity. `10` is slowest with highest complexity. The encoder selects a default when this is not specified.
- **encoderFrameSize**            - (*optional*) Specifies the frame size in ms used for encoding. Defaults to `20`.
- **encoderSampleRate**           - (*optional*) Specifies the sample rate to encode at. Defaults to `48000`. Supported values are `8000`, `12000`, `16000`, `24000` or `48000`.
- **maxFramesPerPage**            - (*optional*) Maximum number of frames to collect before generating an Ogg page. This can be used to lower the streaming latency. The lower the value the more overhead the ogg stream will incur. Defaults to `40`.
- **originalSampleRateOverride**  - (*optional*) Override the ogg opus 'input sample rate' field. Google Speech API requires this field to be `16000`.
- **resampleQuality**             - (*optional*) Value between 0 and 10 which determines latency and processing for resampling. `0` is fastest with lowest quality. `10` is slowest with highest quality. Defaults to `3`.
- **streamPages**                 - (*optional*) `dataAvailable` event will fire after each encoded page. Defaults to `false`.
- **rawOpus**                     - (*optional*) `rawOpus` encode as _raw_ OPUS (instead of OGG container) frames. Defaults to `false`.

#### Config options for WAV recorder

- **wavBitDepth**                 - (*optional*) Desired bit depth of the WAV file. Defaults to `16`. Supported values are `8`, `16`, `24` and `32` bits per sample.


---------
#### Instance Methods


```js
rec.close()
```

**close** will close the audioContext, destroy the workers, disconnect the audio nodes and close the mic stream. A new Recorder instance will be required for additional recordings. if a `sourceNode` was provided in the initial config, then the implementation will need to close the audioContext and close the mic stream.

```js
rec.pause([flush])
```

**pause** will keep the stream and monitoring alive, but will not be recording the buffers. If `flush` is `true` and `streamPages` is set, any pending encoded frames of data will be flushed, and it will return a promise that only resolves after the frames have been flushed to `ondataavailable`. Will call the `onpause` callback when paused. Subsequent calls to **resume** will add to the current recording.

```js
rec.resume()
```

**resume** will resume the recording if paused. Will call the `onresume` callback when recording is resumed.

```js
rec.setRecordingGain( gain )
```

**setRecordingGain** will set the volume on what will be passed to the recorder. Gain is an a-weighted value between `0` and `1`.

```js
rec.setMonitorGain( gain )
```

**setMonitorGain** will set the volume on what will be passed to the monitor. Monitor level does not affect the recording volume. Gain is an a-weighted value between `0` and `1`.

```js
rec.start()
```

**start** Begins a new recording. Returns a promise which resolves when recording is started. Will callback `onstart` when started. `start` ***needs to be initiated from a user action*** (click or touch) so that the audioContext can be resumed and the stream can have audio data.

```js
rec.stop()
```

**stop** will cease capturing audio and disable the monitoring and mic input stream. Will request the recorded data and then terminate the worker once the final data has been published. Will call the `onstop` callback when stopped.

---------
#### Instance Fields

```js
rec.encodedSamplePosition
```

Reads the currently encoded sample position (the number of samples up to and including the most recent data provided to `ondataavailable`). For Opus, the encoded sample rate is always 48kHz, so a time position can be determined by dividing by 48000.

---------
#### Static Methods

```js
Recorder.isRecordingSupported()
```

Returns a truthy value indicating if the browser supports recording.


#### Static Properties

```js
Recorder.version
```

The version of the library.


---------
#### Callback Handlers

```js
rec.ondataavailable( arrayBuffer )
```
A callback which returns an array buffer of audio data. If `streamPages` is `true`, this will be called with each page of encoded audio.  If `streamPages` is `false`, this will be called when the recording is finished with the complete data.


```js
rec.onpause()
```

A callback which occurs when media recording is paused.

```js
rec.onresume()
```

A callback which occurs when media recording resumes after being paused.

```js
rec.onstart()
```

A callback which occurs when media recording starts.

```js
rec.onstop()
```

A callback which occurs when media recording ends.

---------
### Gotchas
- To be able to read the mic stream, the page must be served over https. Use ngrok for local development with https.
- All browsers require that `rec.start()` to be called from a user initiated event. In iOS and macOS Safari, the mic stream will be empty with no logged errors. In Chrome and Firefox the audioContext could be suspended.
- macOS and iOS Safari native opus playback is not yet supported
- The worker files need to be hosted on the same domain as the page recording as cross-domain workers and worklets are not supported.

---------
### Browser Support

Supported:
- Chrome v58
- Firefox v53
- Microsoft Edge v41
- Opera v44
- macOS Safari v11
- iOS Safari v11

Unsupported:
- IE 11 and below
- iOS 11 Chrome


---------
### Known Issues

- iOS 11.2.2 and iOS 11.2.5 are not working due to a regression in WebAssembly: https://bugs.webkit.org/show_bug.cgi?id=181781
- Firefox does not support sample rates above 48000Hz: https://bugzilla.mozilla.org/show_bug.cgi?id=1124981
- macOS Safari v11 does not support sample rates above 44100Hz


---------
### Building from sources

Prebuilt sources are included in the dist folder. However below are instructions if you want to build them yourself. Opus and speex are compiled without SIMD optimizations. Performace is significantly worse with SIMD optimizations enabled.

Mac: Install autotools using [MacPorts](https://www.macports.org/install.php)
```bash
port install automake autoconf libtool pkgconfig
```

Windows: Install autotools using [MSYS2](http://www.msys2.org/)
```bash
pacman -S make autoconf automake libtool pkgconfig
```

[Install Node.js](https://nodejs.org/en/download/)

[Install EMScripten](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html)

Install npm dependencies:
```bash
npm install
```

checkout, compile and create the dist from sources:
```bash
npm run make
```

Running the unit tests:
```bash
npm test
```

Clean the dist folder and git submodules:
```bash
make clean
```

[0]: https://github.com/symblai/opus-encdec
[1]: https://github.com/kripken/emscripten
[2]: https://opus-codec.org/downloads/
[3]: https://www.speex.org/downloads/
