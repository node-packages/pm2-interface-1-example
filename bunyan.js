var ipm2 = require('pm2-interface')()
  , bunyan = require('bunyan')

var logger = {
  streams: {}, //used to store streams
  stream: function(env, type) {
    var self = this;

    //storing the stream if it's not existing
    if(!this.streams[env.pm_id]) {

      this.streams[env.pm_id] = bunyan.createLogger({
          name: 'foo',
          streams: [{
              type: 'rotating-file',
              path: './logs/' + env.name + '.err.log',
              level:  'error',
              period: '1d',   // daily rotation
              count: 3        // keep 3 back copies
          },
          {
              type: 'rotating-file',
              path: './logs/' + env.name + '.out.log',
              level:  'info',
              period: '1d',   // daily rotation
              count: 3        // keep 3 back copies
          }]
      })
    }

    return function(data) {
      //log through the right logger    
      self.streams[env.pm_id][type == 'out' ? 'info' : 'error'](data)
    }
  }
}

ipm2.bus.on('log:out', function(d){
  logger.stream(d.process.pm2_env, 'out')(d.data)
})

ipm2.bus.on('log:err', function(d){
  logger.stream(d.process.pm2_env, 'err')(d.data)
})
