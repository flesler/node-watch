var fs = require('fs'),
  EventEmitter = require('events').EventEmitter;

function File(path, encoding) {
  this.path = path;
  this.encoding = encoding || 'utf8';
  this.state = File.IDLE;
};

// States
File.IDLE = 1;
File.WATCHING = 2;
File.LOADING = 3;

File.prototype = {
  constructor: File,

  __proto__: EventEmitter.prototype,

  start:function(){
    var self = this;
    fs.watch(this.path, {persistent:false}, function(event, filename) {
        if (event === 'rename') {
          // File was renamed, follow it around
          self.stop();
          self.path = filename;
          self.start();
        } else if (event === 'change') {
          self.update();
        }
    });

    this.update();
  },

  update:function(){
    // fs.watch seems to fire twice, lock multiple calls to update
    if (this.state === File.LOADING) return;
    this.state = File.LOADING;

    this.emit('updating');

    var self = this;
    fs.readFile(this.path, this.encoding, function(err, contents) {
      if (err) throw err;
      self.parse(contents);
    });
  },

  parse:function(contents) {
    var event = this.data == null ? 'loaded' : 'updated';
    this.data = this._parse(contents); 
    this.emit(event, this.data);
    this.emit('changed', this.data);

    this.state = File.WATCHING;
  },

  _parse:function(contents) {
    var ext = this.path.split('.').pop();
    if (ext in File.parsers) {
      return File.parsers[ext](contents, this.data);
    }
    // Plain text
    return contents;
  },

  stop:function(){
    this.state = File.IDLE;
    fs.unwatchFile(this.path);
  }
};

// Utils for parsers

File.inline = function(old, data) {
  // Wipe all the old data
  for (var key in old) {
    delete old[key];
  }

  // Put the new data in place
  for (key in data) {
   old[key] = data[key];
  }
}

// Parsers are expected to update the contents in place
// When possible so the user doesn't need to reinject the data
File.parsers = {
  json:function(contents, data) {
    var obj = JSON.parse(contents);
    // First call
    if (!data) return obj;

    File.inline(data, obj);
    return data;
  },

  js:function(contents, data) {
    // TODO: eval module and inline contents into old module.exports
  }
};

File.watch = function(path, callback, encoding) {
  var f = new File(path, encoding);
  f.on('changed', callback);
  f.start();
  return f;
};

module.exports = File;