"use strict";

var OggOpusDecoder, OpusDecoderLib;
if(typeof require === 'function'){
  OpusDecoderLib = require('./libopus-decoder.js');
  OggOpusDecoder = require('./oggOpusDecoder.js');
} else {
  importScripts('./libopus-decoder.js');
  importScripts('./oggOpusDecoder.js');
}

var decoder, cached;

function cacheEvent( evtData ){
  if(!cached) cached = [];
  cached.push(evtData);
}

function applyCachedEvents(){
  if(cached){
    for(var i=0,size=cached.length; i < size; ++i){
      global['onmessage']( {data: cached[i]} );
    }
    cached = undefined;
  }
}

function checkReady( decoder, evtData ){
  if(!decoder.isReady){
    cacheEvent(evtData);
    decoder['onready'] = applyCachedEvents;
    return false;
  }
  return true;
}

global['onmessage'] = function( e ){
  switch( e['data']['command'] ){

    case 'decode':
      if ( checkReady( decoder, e['data']) ){
        decoder.decode( e['data']['pages'] );
      }
      break;

    case 'done':
      if ( checkReady( decoder, e['data']) ) {
        decoder.sendLastBuffer();
        global['close']();
      }
      break;

    case 'init':
      decoder = new OggOpusDecoder( e['data'], OpusDecoderLib );
      break;

    default:
      // Ignore any unknown commands and continue recieving commands
  }
};

var module = module || {};
module.exports = OpusDecoderLib;
