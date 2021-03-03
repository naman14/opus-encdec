
var OggOpusDecoder = function( config, Module ){

  if ( !Module ) {
    throw new Error('Module with exports required to initialize a decoder instance');
  }

  // this.mainReady = mainReady; // Expose for unit testingthis.isReady = Module.isReady;
  this.isReady = Module.isReady;
  if(!this.isReady){
    Module.onready = function(){
      this.isReady = true;
      this.onready && this.onready();
    }
  }

  this.config = Object.assign({
    // bufferLength: 4096, // Define size of outgoing buffer
    decoderSampleRate: 48000, // Desired decoder sample rate.
    outputBufferSampleRate: 48000, // Desired output sample rate. Audio will be resampled
    resampleQuality: 3, // Value between 0 and 10 inclusive. 10 being highest quality.
  }, config );

  // encode "raw" opus stream?
  // -> either config.rawOpus = true/false,
  //    or config.mimeType = 'audio/opus'
  //   (instead of 'audio/ogg; codecs=opus')
  this.rawOpus = typeof this.config.rawOpus === 'boolean'?
                  this.config.rawOpus :
                  /^audio\/opus\b/i.test(this.config.mimeType);

  this._opus_decoder_create = Module._opus_decoder_create;
  this._opus_decoder_destroy = Module._opus_decoder_destroy;
  this._speex_resampler_process_interleaved_float = Module._speex_resampler_process_interleaved_float;
  this._speex_resampler_init = Module._speex_resampler_init;
  this._speex_resampler_destroy = Module._speex_resampler_destroy;
  this._opus_decode_float = Module._opus_decode_float;
  this._free = Module._free;
  this._malloc = Module._malloc;
  this.HEAPU8 = Module.HEAPU8;
  this.HEAP32 = Module.HEAP32;
  this.HEAPF32 = Module.HEAPF32;

  // this.outputBuffers = [];
  this.decodedBuffers = [];

  if(this.config.onInit){
    this.oninit = this.config.onInit;
  }

  if(this.config.numberOfChannels > 0){
    this.numberOfChannels = this.config.numberOfChannels;
    this.init();
  }
};


OggOpusDecoder.prototype.decode = function( typedArray, onDecoded ) {
  onDecoded = onDecoded || this.handleDecoded;
  var dataView = new DataView( typedArray.buffer );
  this.getPageBoundaries( dataView ).map( function( pageStart ) {
    var headerType = dataView.getUint8( pageStart + 5, true );
    var pageIndex = dataView.getUint32( pageStart + 18, true );

    // Beginning of stream
    if ( headerType & 2 ) {
      this.numberOfChannels = dataView.getUint8( pageStart + 37, true );
      this.init();
    }

    // Decode page
    if ( pageIndex > 1 ) {
      var segmentTableLength = dataView.getUint8( pageStart + 26, true );
      var segmentTableIndex = pageStart + 27 + segmentTableLength;

      for ( var i = 0; i < segmentTableLength; i++ ) {
        var packetLength = dataView.getUint8( pageStart + 27 + i, true );
        this.decoderBuffer.set( typedArray.subarray( segmentTableIndex, segmentTableIndex += packetLength ), this.decoderBufferIndex );
        this.decoderBufferIndex += packetLength;

        if ( packetLength < 255 ) {
          var outputSampleLength = this._opus_decode_float( this.decoder, this.decoderBufferPointer, this.decoderBufferIndex, this.decoderOutputPointer, this.decoderOutputMaxLength, 0);
          var resampledLength = Math.ceil( outputSampleLength * this.config.outputBufferSampleRate / this.config.decoderSampleRate );
          this.HEAP32[ this.decoderOutputLengthPointer >> 2 ] = outputSampleLength;
          this.HEAP32[ this.resampleOutputLengthPointer >> 2 ] = resampledLength;
          this._speex_resampler_process_interleaved_float( this.resampler, this.decoderOutputPointer, this.decoderOutputLengthPointer, this.resampleOutputBufferPointer, this.resampleOutputLengthPointer );
          // this.sendToOutputBuffers( this.HEAPF32.subarray( this.resampleOutputBufferPointer >> 2, (this.resampleOutputBufferPointer >> 2) + resampledLength * this.numberOfChannels ) );
          onDecoded.call(this, this.HEAPF32.subarray( this.resampleOutputBufferPointer >> 2, (this.resampleOutputBufferPointer >> 2) + resampledLength * this.numberOfChannels ) );
          this.decoderBufferIndex = 0;
        }
      }

      // End of stream
      if ( headerType & 4 ) {
        this.sendLastBuffer();
      }
    }
  }, this );
};

OggOpusDecoder.prototype.decodeRawPacket = function( typedArray, onDecoded ) {

  onDecoded = onDecoded || this.handleDecoded;
  var dataLength = typedArray.length * typedArray.BYTES_PER_ELEMENT;
  if(dataLength === 0){
    return;
  }

  var dataOffset=0;
  if ( typeof this.numberOfChannels === 'undefined' ) {

    // this.numberOfChannels = typedArray[0] & 0x04 ? 2 : 1;

    var headerLength = this.decodeHeader(typedArray);
    this.init();

    if ( headerLength > 0 ) {
      if ( headerLength >= dataLength ) {
        return;
      }
      dataOffset += headerLength;
    }
  }

  while ( dataOffset < dataLength ) {
    var packetLength = Math.min( dataLength - dataOffset, this.decoderBufferMaxLength );
    // this.decoderBuffer.set( typedArray );
    this.decoderBuffer.set( typedArray.subarray( dataOffset, dataOffset += packetLength ), this.decoderBufferIndex );
    this.decoderBufferIndex += packetLength;

    // Decode raw opus packet
    var outputSampleLength = this._opus_decode_float( this.decoder, this.decoderBufferPointer, typedArray.length, this.decoderOutputPointer, this.decoderOutputMaxLength, 0);
    var resampledLength = Math.ceil( outputSampleLength * this.config.outputBufferSampleRate / this.config.decoderSampleRate );
    this.HEAP32[ this.decoderOutputLengthPointer >> 2 ] = outputSampleLength;
    this.HEAP32[ this.resampleOutputLengthPointer >> 2 ] = resampledLength;
    this._speex_resampler_process_interleaved_float( this.resampler, this.decoderOutputPointer, this.decoderOutputLengthPointer, this.resampleOutputBufferPointer, this.resampleOutputLengthPointer );
    // this.sendToOutputBuffers( this.HEAPF32.subarray( this.resampleOutputBufferPointer >> 2, (this.resampleOutputBufferPointer >> 2) + resampledLength * this.numberOfChannels ) );
    onDecoded.call(this, this.HEAPF32.subarray( this.resampleOutputBufferPointer >> 2, (this.resampleOutputBufferPointer >> 2) + resampledLength * this.numberOfChannels ) );
    this.decoderBufferIndex = 0;
  }

  return;
}

OggOpusDecoder.prototype.handleDecoded = function( typedArray ) {
  this.decodedBuffers.push( typedArray );
};

OggOpusDecoder.prototype.decodeHeader = function( typedArray ) {

  var invalid = false;
  var segmentDataView = new DataView( typedArray.buffer );
  invalid = invalid || (segmentDataView.getUint32( 0, true ) !== 1937076303); // Magic Signature 'Opus'
  invalid = invalid || (segmentDataView.getUint32( 4, true ) !== 1684104520); // Magic Signature 'Head'
  invalid = invalid || (segmentDataView.getUint8(  8 ) !== 1); // Version

  if(invalid){
    return false;
  }
  this.numberOfChannels = segmentDataView.getUint8( 9 ); // Channel count
  invalid = invalid || (!isFinite(this.numberOfChannels) || this.numberOfChannels < 0 || this.numberOfChannels > 2);

  if(invalid){
    this.numberOfChannels = undefined;
    return false;
  }
  var sampleRate = segmentDataView.getUint32( 12, true ); // sample rate
  invalid = invalid || (!isFinite(sampleRate) || sampleRate < 0 || !this.config);

  if(invalid){
    return false;
  }
  this.config.decoderSampleRate = sampleRate;

  var headerSize = 19;
  var channelMapping = segmentDataView.getUint8( 18 ); // channel map 0 = mono or stereo
  if(channelMapping > 0){
    var channelCount = segmentDataView.getUint8( 19 ); // channel count (only encoded, if channel map != 0)
    headerSize += 2 + ( channelCount * 8 ); // additional header length, when channel mapping family is != 0
  }

  var size = typedArray.length * typedArray.BYTES_PER_ELEMENT;
  if(size > headerSize){
    var tagsSize;
    while(tagsSize = this.calcTags(typedArray, headerSize)){
      headerSize += tagsSize;
      if(headerSize >= size){
        break;
      }
    }
  }

  return headerSize;
}

OggOpusDecoder.prototype.calcTags = function( typedArray, offset ) {

  var invalid = false;
  var segmentDataView = new DataView( typedArray.buffer, offset );
  invalid = invalid || (segmentDataView.getUint32( 0, true ) !== 1937076303); // Magic Signature 'Opus'
  invalid = invalid || (segmentDataView.getUint32( 4, true ) !== 1936154964); // Magic Signature 'Tags'

  if(invalid){
    return false;
  }
  var vendorLength = segmentDataView.getUint32( 8, true ); // vendor string length
  var userCommentsListLength = segmentDataView.getUint32( 12 + vendorLength, true ); // size of user comments list
  var size = 16 + vendorLength;
  if(userCommentsListLength > 0){
    for(var i=0; i < userCommentsListLength; ++i){
      size += 4 + segmentDataView.getUint32( size, true ); // length of user comment string <i>
    }
  }
  // NOTE in difference to Vorbis Comments, no final 'framing bit' for OpusTags

  return size;
}

OggOpusDecoder.prototype.getPageBoundaries = function( dataView ){
  var pageBoundaries = [];

  for ( var i = 0; i < dataView.byteLength - 32; i++ ) {
    if ( dataView.getUint32( i, true ) == 1399285583 ) {
      pageBoundaries.push( i );
    }
  }

  return pageBoundaries;
};

OggOpusDecoder.prototype.init = function(){
  this.initCodec();
  this.initResampler();
  if(this.oninit){
    this.oninit();
  }
};

OggOpusDecoder.prototype.initCodec = function() {

  if ( this.decoder ) {
    this._opus_decoder_destroy( this.decoder );
    this._free( this.decoderBufferPointer );
    this._free( this.decoderOutputLengthPointer );
    this._free( this.decoderOutputPointer );
  }

  var errReference = this._malloc( 4 );
  this.decoder = this._opus_decoder_create( this.config.decoderSampleRate, this.numberOfChannels, errReference );
  this._free( errReference );

  this.decoderBufferMaxLength = 4000;
  this.decoderBufferPointer = this._malloc( this.decoderBufferMaxLength );
  this.decoderBuffer = this.HEAPU8.subarray( this.decoderBufferPointer, this.decoderBufferPointer + this.decoderBufferMaxLength );
  this.decoderBufferIndex = 0;

  this.decoderOutputLengthPointer = this._malloc( 4 );
  this.decoderOutputMaxLength = this.config.decoderSampleRate * this.numberOfChannels * 120 / 1000; // Max 120ms frame size
  this.decoderOutputPointer = this._malloc( this.decoderOutputMaxLength * 4 ); // 4 bytes per sample
};

OggOpusDecoder.prototype.initResampler = function() {

  if ( this.resampler ) {
    this._speex_resampler_destroy( this.resampler );
    this._free( this.resampleOutputLengthPointer );
    this._free( this.resampleOutputBufferPointer );
  }

  var errLocation = this._malloc( 4 );
  this.resampler = this._speex_resampler_init( this.numberOfChannels, this.config.decoderSampleRate, this.config.outputBufferSampleRate, this.config.resampleQuality, errLocation );
  this._free( errLocation );

  this.resampleOutputLengthPointer = this._malloc( 4 );
  this.resampleOutputMaxLength = Math.ceil( this.decoderOutputMaxLength * this.config.outputBufferSampleRate / this.config.decoderSampleRate );
  this.resampleOutputBufferPointer = this._malloc( this.resampleOutputMaxLength * 4 ); // 4 bytes per sample
};
