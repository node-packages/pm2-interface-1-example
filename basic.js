var fs = require('fs')
  , ipm2 = require('pm2-interface')()

var logger = {
  streams: {}, //used to store streams
  //outpus formatted log
  log: function(stream, data) {
    if(!stream || typeof stream.write != 'function') {
      throw new TypeError('logger expects a writable stream instance')
    }

    stream.write(data)
  },
  stream: function(env, type) {
    var self = this;

    //storing the stream if it's not existing
    if(!this.streams[env.pm_id]) {
      this.streams[env.pm_id] = {err: null, log: null}
    }

    //adding the stream
    if(this.streams[env.pm_id][type] == null) {

      //outputs: server.out.log
      var log_name = env.name + '.' + type + '.log'
      this.streams[env.pm_id][type] = fs.createWriteStream('./logs/'+log_name)
    }

    return function(data) {

      data = new Date().toLocaleString() + ': ' + data

      //log
      self.log(self.streams[env.pm_id][type], data)
    }
  }
}

ipm2.bus.on('log:out', function(d){
  logger.stream(d.process.pm2_env, 'out')(d.data)
})

ipm2.bus.on('log:err', function(d){
  logger.stream(d.process.pm2_env, 'err')(d.data)
})
