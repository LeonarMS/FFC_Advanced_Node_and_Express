'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');

const routes = require('./routes');
const auth = require('./auth.js');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const cookieParser = require('cookie-parser')
const passportSocketIo = require('passport.socketio')

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI })

// Assign pug as the view engine
app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
	key: 'express.sid',
	secret: process.env.SESSION_SECRET,
	resave: true,
	saveUninitialized: true,
	store: store,
	cookie: { secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());

// success, and fail callback functions for Passport authentication
function onAuthorizeSuccess(dat, accept) {
	console.log('successful connection to socket.io');

	accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
	if (error) throw new Error(message);
	console.log('failed connection to socket.io:', message);
	accept(null, false);
}

// Persistent connection to DB
myDB(async client => {
	const myDataBase = await client.db('advancedNode').collection('users');

	auth(app, myDataBase);
	routes(app, myDataBase);

	io.use(
		passportSocketIo.authorize({
			cookieParser: cookieParser,
			key: 'express.sid',
			secret: process.env.SESSION_SECRET,
			store: store,
			success: onAuthorizeSuccess,
			fail: onAuthorizeFail
		})
	);

	let currentUsers = 0;
	io.on('connection', socket => {
		console.log('A user has connected');
		console.log('user ' + socket.request.user.name + ' connected');

		currentUsers++;
		io.emit('user', {
			name: socket.request.user.name,
			currentUsers,
			connected: true
		});

		socket.on('chat message', message => {
			io.emit('chat message', { name: socket.request.user.name, message})
		})

		socket.on('disconnect', () => {
			console.log('A user has disconnected');
			--currentUsers;
			io.emit('user', {
			name: socket.request.user.name,
			currentUsers,
			connected: false
		});
		});
	});

}).catch((e) => {
	app.route('/').get((req, res) => {
		res.render('pug', { title: e, message: 'Unable to login' });
	});
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, (err) => {
	if (err) console.log(err);
	else {
		console.log('Listening on port ' + PORT);
	}
});
