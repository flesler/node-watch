var nw = require('../index.js');

console.log('\nTry changing the files to see node-watch in action...\n');

function log(file, data) {
   console.log(file.path.split('/').pop(), '=>', data);
}

// Plain text
nw.watch(__dirname + '/files/text.txt', function(data){
  log(this, data);
});

// JSON (test inline updating)
var json = nw.watch(__dirname + '/files/json.json', function(){
  // As you can see, the data is replaced in place (into the original object)
  log(this, 'foo is '+ data.foo);
});
// Keep an external reference to the data object
var data = json.data = {};


// Keep the process running
process.stdin.resume();