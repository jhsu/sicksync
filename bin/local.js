#! /usr/bin/env node

/**
 *  Client
 *
 *  Entry point into the client portion of sicksync
 */
var fs = require('fs'),
    watcher = require('chokidar'),
    path = require('path'),
    util = require('../lib/util'),
    WebSocketClient = require('../lib/ws-client'),
    bigSync = require('../lib/big-sync'),
    SegfaultHandler = require('segfault-handler'),
    config = util.getConfig(),
    ignored = config.excludes,
    isPaused = false,
    devbox = null;

require('colors');

if (config.debug) {
    SegfaultHandler.registerHandler();
}

var NUM_FILES_FOR_LARGE_SEND = 10;
var FILE_CHANGE_COOLDOWN_TIME = 10;

var rebouncedFileChange = util.rebounce(onFileChange, onBigTransfer, NUM_FILES_FOR_LARGE_SEND, FILE_CHANGE_COOLDOWN_TIME);

function onBigTransfer() {
    if (config.debug) console.log('[local] Sending large change');

    bigSync(onBigTransferDone);
    isPaused = true;
}

function onBigTransferDone() {
    if (config.debug) {
        console.log('['+ config.hostname +'] Received large change');
    }
    isPaused = false;
}

function filterAndRebounce(evt, filepath) {
    var projectPath = path.resolve(config.sourceLocation);
    var relativePath = filepath.replace(projectPath, '');

    if (util.isExcluded(relativePath, ignored) || isPaused) return false;

    rebouncedFileChange(evt, filepath);
}

function onFileChange(evt, filepath) {
    var fileContents = null;
    var projectPath = path.resolve(config.sourceLocation);
    var localPath = filepath.replace(projectPath, '');

    if (evt === 'add' || evt === 'change') {
        fileContents = fs.readFileSync(filepath).toString();
    }

    if (config.debug) {
        console.log('[local] > ' + evt + ' ' + localPath);
    }

    devbox.send({
        subject: 'file',
        changeType: evt,
        location: localPath,
        contents: fileContents ? fileContents : null,
        name: path.basename(filepath)
    });
}

function startFileWatch() {
    watcher.watch(path.resolve(config.sourceLocation), {
        ignored: ignored,
        persistent: true,
        ignoreInitial: true
    }).on('all', filterAndRebounce);
}

function onAuthorized() {
    startFileWatch();
    console.log(('Connected to ' + config.hostname + (config.prefersEncrypted ? ' using' : ' not using') + ' encryption').green);
}

devbox = new WebSocketClient({
    url: 'ws://' + config.hostname + ':' + config.websocketPort
});

devbox.on('authorized', onAuthorized);
