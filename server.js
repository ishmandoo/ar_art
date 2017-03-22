var express = require('express')
var app = express();
var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');
var numeric = require('numeric');


app.all('*', ensureSecure);

function ensureSecure(req, res, next){
  if(req.secure){
    return next();
  };
  res.redirect('https://' + req.hostname + req.url);
}

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/public/client.html'));
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

objects = {
  0: [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

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
    console.log(objects);
    updatePlanetPositions();
    socket.emit('update', objects);
  }, 100);
});

function unpackVec(v){
	var vecs = [];
	for(var vecnum = 0; vecnum < v.length/3 ; vecnum++){
		var vec = [];
		for(var index = 0; index < 3; index ++){
			vec.push(v[3*vecnum + index]);
		}
		vecs.push(vec);
	}
	return vecs;
}

function packVec(v){
	var y = [];
	for(var i = 0; i<v.length; i++){
		for(var index = 0; index < 3; index ++){
			y.push(v[i][index]);
  	}
  }
	return y;
}

function derivatives(t, y){
	var pos = unpackVec(y.slice(0, y.length/2));
	var xdot = y.slice(y.length/2);

	var force = numeric.rep([pos.length,3],0)
	for(var i =0 ; i < pos.length; i++){
		for(var j = 0; j < i; j++){
			var dr = numeric.sub(pos[i],pos[j]);
			var denom = -0.1 / Math.pow(numeric.norm2(dr) , 3/2);
			force[i] = numeric.add(force[i], numeric.mul(denom, dr) );
		}
		// central force
		var denom = -5.0 / Math.pow(numeric.norm2(pos[i]) , 3/2);
		force[i] = numeric.add(force[i], numeric.mul(denom, pos[i]) );

	}
	var acc = packVec(force)

	var retval = xdot.concat(acc);
	return retval;
}

var time;
var nPlanets = 1;
//var state = numeric.mul(5,numeric.random([nPlanets * 3 ])).concat(numeric.mul(1,numeric.random([nPlanets * 3 ])));
var state = [10, 0, 0, 0, 0, 1];
var origin = [-10.6, 3, 5];
var R = 6;

function updatePlanetPositionsIntegrator() {
	var now = new Date().getTime();
  var dt = (now - (time || now)) / 1000;

  time = now;

	sol = numeric.dopri(0, dt, state, derivatives)

	state = sol.y[sol.y.length-1]

	var pos = unpackVec(state.slice(0, state.length/2));

	for(var i = 0; i < nPlanets; i++){
    objects[i] = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      pos[i][0] + origin[0], pos[i][1] + origin[1], pos[i][2] + origin[2], 1,
    ];
	}
}

function updatePlanetPositions() {
  var now = new Date().getTime();
  time = now;

  for(var i = 0; i < nPlanets; i++){
    objects[i] = [
      Math.cos(time/500), 0, -Math.sin(time/500), 0,
      0, 1, 0, 0,
      Math.sin(time/500), 0, Math.cos(time/500), 0,
      R * Math.sin(time/1000) + origin[0], origin[1], R * Math.cos(time/1000) + origin[2], 1,
    ];
  }

}
