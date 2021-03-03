
(function (root, factory, globalExport) {

	var lib, env;
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['require'], function (req) {
			lib = factory(root, req);
			return lib;
		});
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.

		// use process.env (if available) for reading Opus environment settings:
		env = typeof process !== 'undefined' && process && process.env? process.env : root;
		lib = factory(env, module.require);
		module.exports = lib;
	} else {
		// Browser globals
		lib = factory(root);
		root[globalExport] = lib;
	}

}(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function (global, require) {
'use strict';

var Module = {};
Module['isReady'] = false;
Module['onready'] = null;
Module['onRuntimeInitialized'] = function(){
	Module['isReady'] = true;
	if(Module['onready']) setTimeout(Module['onready'], 0);
};

if(global && global.OPUS_SCRIPT_LOCATION){
	Module['locateFile'] = function(fileName){
		var path = global.OPUS_SCRIPT_LOCATION || '';
		if(path[fileName]) return path[fileName];
		path += path && !/\/$/.test(path)? '/' : '';
		return path + fileName;
	};
}
