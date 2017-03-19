var express = require('express')
var app = express()
var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');


app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/public/test_sphere.html'));
})

app.use("/public", express.static(__dirname + '/public'))
app.use("/images", express.static(__dirname + '/images'))
app.use("/bower_components", express.static(__dirname + '/bower_components'))

// This line is from the Node.js HTTPS documentation.
if(process.env.NODE_ENV == 'prod'){
  var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/spaceadventure.zone/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/spaceadventure.zone/fullchain.pem')
  };
}
else{
  var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };
}

// Create an HTTP service.
var httpServer = http.createServer(app);
// Create an HTTPS service identical to the HTTP service.
var httpsServer = https.createServer(options, app);

httpServer.listen(80);
httpsServer.listen(443);

var io = require('socket.io')(httpsServer);

objects = {}

io.on('connection', function(socket){
  console.log("a client connected ", socket.id);

  objects[socket.id] = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  socket.on("new pos", function(pos) {
    objects[socket.id] = pos;
  })

  socket.on('disconnect', function () {
    io.emit('user disconnected', socket.id)
    delete objects[socket.id];
  })


  setInterval(function () {
    console.log(objects)
    socket.emit('update', objects);
  }, 100);
});
