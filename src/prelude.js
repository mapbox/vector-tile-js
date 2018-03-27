const path = require('path');

const isNode = typeof process === 'object' &&
    typeof require === 'function' &&
    typeof window !== 'object' &&
    typeof importScripts !== 'function';

Module.locateFile = (url) => {
    return isNode && /libvtzero_wasm.wasm$/.test(url) ?
        path.join(__dirname, 'libvtzero_wasm.wasm') :
        url;
};
