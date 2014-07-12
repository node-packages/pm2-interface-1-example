[![](http://keymetrics.io/content/images/2014/Jul/01---OBLVN-Light-Table-UI_06_905.JPG)](http://keymetrics.io/)
<center>[pm2-interface](https://github.com/Unitech/pm2-interface/) [image by @gmunk](http://work.gmunk.com/OBLIVION-GFX)</center>

PM2 default logging system don't fit your needs? I have one of a hell solution to build your own logging system on top of PM2!

This article is presenting a simple way of doing this but will need some improvements to handle all the processes events (e.g. start, stop, restart, delete).

## How does it work?

We will use [pm2-interface](https://github.com/Unitech/pm2-interface/) to talk with your processes, it's an RPC wrapper for pm2. It can listen to events or execute tasks remotely.

```language-bash
$ npm i pm2-interface --save
```

Now, we need to redirect each processes `stdout` and `stderr`. These logs will be streamed to a file.

According to the `pm2-interface` docs we can write this task in a few listeners:

```language-javascript
var ipm2 = require('pm2-interface')();

//called when the RPC connection is listening to pm2
ipm2.on('ready', function() {

  //your process is logging to stdout
  ipm2.bus.on('log:out', function(err, d) { })

  //and to stderr
  ipm2.bus.on('log:err', function(err, d) { })

})
```

## A small homemade logger instance

On `log`, we'll start streaming through a file. As we are working with streams we'll store the streams in an object.

```language-javascript
var fs = require('fs')

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
```

Now we add this to the `pm2-interface` listeners:

```language-javascript
ipm2.bus.on('log:out', function(err, d){
  logger.stream(d.process.pm2_env, 'out')(d.data)
})

ipm2.bus.on('log:err', function(err, d){
  logger.stream(d.process.pm2_env, 'err')(d.data)
})
```

And voilà! Launch `node my-logger.js` and start a chatty process with pm2 to stream logs to the `/logs/my-app.out.log` file.

## Improvements

What about using an external library to do the logging?

### [Log](https://www.npmjs.org/package/log)

[Log](https://www.npmjs.org/package/log) is a basic logging module.
Using my previous basic code I'm storing `Log` instance instead of streams and log to them. It is configured to log to a `name.err.log` type file.

```language-javascript
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
      this.streams[env.pm_id][type] = new Log(type, './logs/'+log_name)
    }

    return function(data) {
      self.streams[env.pm_id][type].log(data)
    }
  }
}
```

### [Bunyan](https://www.npmjs.org/package/bunyan)

Let's try out the [node-bunyan](https://github.com/trentm/node-bunyan) library. It will log to files with a file rotation.
Basically it will log:

```language-javascript
{"name":"foo","hostname":"localhost.local","pid":42895,"level":50,"msg":"thisnok\n","time":"2014-06-26T18:15:42.857Z","v":0}
```

However, bunyan is smart and does not reset the file you're logging to!

```language-javascript
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
          },{
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
```

## Some more thoughts

Keep in mind that pm2 can stop or restart processes and that it should not break the logger process.

A few improvements could be done to:

- handle new started processes
- handle stopped|errored processes (e.g. end stream)
- handle pm2 exit
- start the logger with pm2
- log process memory or other process informations

For this you might want to look at the [pm2-interface](https://github.com/Unitech/pm2-interface/) docs!

A nice practice would be to use the [winston](https://github.com/flatiron/winston) module. You could use the `Container` to handle different logger systems for each processes.

All the sources are available on [github](https://github.com/soyuka/pm2-logs-interface).
