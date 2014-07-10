var fs = require('fs')
  , ipm2 = require('pm2-interface')()

var Log = require('log')

var logger = {
  streams: {}, //used to store Log instances
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
      //storing the Log instance
      this.streams[env.pm_id][type] = new Log(type, fs.createWriteStream('./logs/'+log_name))
    }

    return function(data) {
      //logging
      self.streams[env.pm_id][type].info(data)
    }
  }
}


ipm2.bus.on('log:out', function(d){
  logger.stream(d.process.pm2_env, 'out')(d.data)
})

ipm2.bus.on('log:err', function(d){
  logger.stream(d.process.pm2_env, 'err')(d.data)
})
