var Rsync = require('rsync'),
    util = require('../lib/util'),
    path = require('path'),
    config = util.getConfig();

module.exports = function bigSync(onComplete) {

    if (util.isEmpty(config)) {
        return console.log('Please run `sicksync --setup` before doing a one-time sync');
    }

    var rsync = new Rsync()
        .shell('ssh')
        .flags('az')
        .exclude(config.excludes)
        .source(path.resolve(config.sourceLocation))
        .destination(config.hostname + ':' + config.destinationLocation);

    rsync.execute(onComplete);
};
