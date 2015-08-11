'use strict';


var fs = require ('fs');
var http = require ('http');
var https = require ('https');
var fileKey = fs.readFileSync (__dirname + '/path/filename', 'utf8');
// Drop newline character at the end.
if (fileKey && (fileKey[fileKey.length - 1] == '\n')) {
	fileKey = fileKey.substr (0, fileKey.length - 1);
}
var credentials = {
	// Specify the key file for the server
	key: fs.readFileSync (__dirname + '/path/file.key'),
	// Specify the certificate file
	cert: fs.readFileSync (__dirname + '/path/file.crt'),
	// Specify the Certificate Authority certificate
	ca: fs.readFileSync (__dirname + '/path/file.pem'),
	passphrase: fileKey,
	// Set to true, if using client certificates.
	requestCert: false,
	// If specified as "true", all clients will need certs.
	rejectUnauthorized: false
};


var express = require ('express');
var bodyParser = require ('body-parser');
var cookieParser = require ('cookie-parser');
var cookieSession = require ('cookie-session');
var favicon = require ('serve-favicon');
var logger = require ('morgan');
var methodOverride = require ('method-override');
var router = express.Router ();
var mRouter = express.Router ();

// Use CORS for cross-domain access (i.e. mobile apps)
var cors = require ('cors');
var open = require ('open');
// ExpressJWT is for JSON Web Tokens to protect APIs
var jwt = require ('jsonwebtoken');
var expressJwt = require ('express-jwt');

var config = require ('./config/svr_config');
var secret = config.server.secret;
var db = require ('./config/dbschema');
var restify = require ('express-restify-mongoose');

var passport = require ('passport');
var pass = require ('./security/pass-file');
var security = require ('./security/security');
var xsrf = require ('./security/xsrf');
var protectJSON = require ('./security/protectJSON');

var public_routes = require ('./routes/public');
var user_routes = require ('./routes/user');
var doctor_routes = require ('./routes/doctor');
var admin_routes = require ('./routes/admin');
var mobile_routes = require ('./routes/mobile');
var billing_report = require ('./modules/billingReport');
var patient_list = require ('./modules/patientList');

// Provide namespace support for routes
// require('express-namespace');

exports.start = function (PORT, PUBLIC_DIR, APP_DIR, REF_DIR, TEST_DIR, MODE) {
	var app = express ();
	var secureServer = https.createServer (credentials, app);
	var server = http.createServer (app);

	app.set ('views', PUBLIC_DIR + '/views');
	app.set ('view engine', 'html');
	app.set ('view engine', 'ejs');

	// Stop IE from caching Ajax requests!
	app.use (function noCache (req, res, next) {
		res.header ("Cache-Control", "no-cache, no-store, must-revalidate");
		res.header ("Pragma", "no-cache");
		res.header ("Expires", 0);
		next ();
	});

	// Embedded JS template engine for login page to help protect the app
	app.engine ('html', require ('ejs').renderFile);

	// Serve favicon from /public
	app.use (favicon (__dirname + '/../public/favicon.ico'));

	// log requests
	app.use (logger ('dev'));

	// handle cookies
	app.use (cookieParser ());

	// parse body into req.body
	app.use (bodyParser.json ());
	app.use (bodyParser.urlencoded ({extended: true}));
	app.use (methodOverride ());
	// Encrypt session cookies with our secret
	app.use (cookieSession ({secret: secret}));

	// Initialize Passport Security
	app.use (passport.initialize ());
	app.use (passport.session ());

	// Add XSRF checks to the request
	app.use (xsrf);

	// For Debugging
	// TODO: Enhance logging for better auditing
	app.use ('/web/*', function (req, res, next) {
		if (req.user) {
			console.log ('User:', req.user.first_name, req.user.last_name);
			console.log ('Time Stamp: ' + (new Date).toString ());
			next ();
		} else {
			// No user.
			console.log ('Unauthenticated');
			res.status (403).send ('Not Authenticated.');
		}
	});


	// Protect from JSON injections
	app.use (protectJSON);

	// serve public files (EJS Login Page)
	// The server-based EJS login page is used for protecting the web app from non-clients
	app.use (express.static (PUBLIC_DIR));

	// Public app routes (used by pre-login EJS web page)
	app.get ('/', public_routes.index);
	app.get ('/login', public_routes.getlogin);
	app.post ('/login', public_routes.postlogin);
	app.get ('/logout', public_routes.logout);


	/***************************************************************
	 * REST APIs for web client app
	 **************************************************************/
	// Set up options for the General Web Routes
	var ermStrict = true
		, ermPrefix = '/web'
		, ermVersion = '/v1'
		, ermMiddleware = [pass.ensureAuthenticated]
		, ermProtected = '__v';
	var ermWebV1Options = {
		strict: ermStrict,
		prefix: ermPrefix,
		version: ermVersion,
		middleware: ermMiddleware,
		protected: ermProtected
	};

	// Set up options for the Web User Route
	var ermMiddleware_User = ermMiddleware.slice (0); // Make a copy
	ermMiddleware_User.push (pass.encryptPass); // Add another middleware
	var ermProtected_User = ermProtected + ', password, pin';
	var ermWebV1Options_User = {
		strict: ermStrict,
		prefix: ermPrefix,
		version: ermVersion,
		middleware: ermMiddleware_User,
		protected: ermProtected_User
	};

	/**************  Start Billing Report REST Route   *************/
	var billRoute = ermPrefix + ermVersion + '/bill/:practice_id/:startDate/:endDate';
	app.get (billRoute, billing_report);
	/**************   End Billing Report REST Route   **************/

		// User REST Route - Web Client (no CORS)
	restify.serve (app, db.UserModel, ermWebV1Options_User);

	// Hospital REST Route - Web Client (no CORS)
	restify.serve (app, db.HospitalModel, ermWebV1Options);

	// Practice REST Route - Web Client (no CORS)
	restify.serve (app, db.PracticeModel, ermWebV1Options);

	// Patient REST Route - Web Client (no CORS)
	restify.serve (app, db.PatientModel, ermWebV1Options);

	// Visit REST Route - Web Client (no CORS)
	restify.serve (app, db.VisitModel, ermWebV1Options);

	// BillCode REST Route - Web Client (no CORS)
	restify.serve (app, db.BillCodeModel, ermWebV1Options);

	// ModCode REST Route - Web Client (no CORS)
	restify.serve (app, db.ModCodeModel, ermWebV1Options);

	// DxCode REST Route - Web Client (no CORS)
	restify.serve (app, db.DxCodeModel, ermWebV1Options);

	// PCA (Practice Calendar Assignment) REST Route - Web Client (no CORS)
	restify.serve (app, db.PCAModel, ermWebV1Options);

	/***************************************************************
	 * REST APIs for Mobile client app
	 **************************************************************/

	// Provide CORS for mobile REST APIs
	var corsOptions = {
		origin: true,
		methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
		credentials: true,
		maxAge: 3600
	};

	// Enable pre-flight for mobile REST APIs
	app.options ('/mobile/*', cors (corsOptions));

	// Config Options object for general Mobile Restify Routes
	var mrrStrict = true,
		mrrPrefix = '/mobile',
		mrrVersion = '/v1',
		mrrMiddleware = [],
		mrrProtected = '__v';

	var mrrPrereqFn = function mrrPrereqFn (req) {
		// This function is only called on POST or PUT. It can be used to analyze the request
		// object and then return approval (true) or rejection (false). false returns status 403.
		// NOTE: Not returning a value = false. Make sure all paths are covered!
		if (req.method === 'DELETE') {
			// No deletes allowed!
			return false;
		}
		// Otherwise, return true (proceed)
		return true;
	};

	var mrrAccessFn = function mrrAccessFn (req) {
		// This function can be used to analyze the request object and then
		// return one of three levels of access:
		// 'public' = General access; Do not return private or protected attributes.
		// 'private' = Private access; Return general, protected and private attributes.
		// 'protected' = Protected access; Return general and protected attributes.
		if (req.method === 'GET') {
			return 'public'
		} else {
			return 'protected'
		}
	};

	// Add the CORS middleware
	mrrMiddleware.push (cors (corsOptions));
	// Add the Token Auth middleware
	mrrMiddleware.push (expressJwt ({secret: secret}));

	var ermMobileV1Options = {
		strict: mrrStrict,
		prefix: mrrPrefix,
		version: mrrVersion,
		middleware: mrrMiddleware,
		prereq: mrrPrereqFn,
		access: mrrAccessFn,
		private: mrrProtected
	};

	/** Config Options object for Mobile Restify User Route **/
	var mruMiddleware = [];

	// Add the CORS middleware
	mruMiddleware.push (cors (corsOptions));
	// Add the Token Auth middleware
	mruMiddleware.push (expressJwt ({secret: secret}));

	// User also needs password and pin protection
	var mruProtected = mrrProtected + ', password, pin';

	var ermMobileV1Options_User = {
		strict: mrrStrict,
		prefix: mrrPrefix,
		version: mrrVersion,
		middleware: mruMiddleware,
		prereq: mrrPrereqFn,
		access: mrrAccessFn,
		private: mruProtected
	};

	/**************  Authenticate POST to Mobile Login route   *************/
	var mLoginRoute = ermMobileV1Options.prefix + ermMobileV1Options.version + '/login';
	var tokenize = function tokenize (req, res, next) {
		passport.authenticate ('pass', function (err, userWithPractice, info) {
			if (err) {
				return next (err)
			}
			if (!userWithPractice) {
				// No user was sent in the request
				req.session.messages = [info.message];
				return res.send (401, 'Login failed.');
			}
			var user = userWithPractice.user;
			var practice = userWithPractice.practice;
			req.logIn (user, function (err) {
				if (err) {
					// Authentication failed. Pass forward the error.
					return next (err);
				}
				// Authentication succeeded.
				// Remove the user's password and pin before returning the user object.
				delete user._doc.password;
				delete user._doc.pin;
				delete user._doc.__v;
				// Return the user inside the token.
				var token = jwt.sign (user, secret, {expiresInMinutes: 10});
				return res.json ({
					user: user,
					practice: practice,
					token: token
				});
			});
		}) (req, res, next);
	};
	mRouter.route (mLoginRoute)
		.post (cors (corsOptions), tokenize);

	/**************  Mobile Patient List REST Route   *************/
	var patListMobileRoute = mrrPrefix + mrrVersion + '/PatientList/:practice_id/:hosp_id/:visit_date';
	// TODO: Add security layers
	mRouter.route (patListMobileRoute)
		.get (cors (corsOptions), expressJwt ({secret: secret}), patient_list);

	app.use (mRouter);

	// User REST Route - Mobile Client (CORS)
	restify.serve (app, db.UserModel, ermMobileV1Options_User);

	// Hospital REST Route - Mobile Client (CORS)
	restify.serve (app, db.HospitalModel, ermMobileV1Options);

	// Practice REST Route - Mobile Client (CORS)
	restify.serve (app, db.PracticeModel, ermMobileV1Options);

	// Patient REST Route - Mobile Client (CORS)
	restify.serve (app, db.PatientModel, ermMobileV1Options);

	// Visit REST Route - Mobile Client (CORS)
	restify.serve (app, db.VisitModel, ermMobileV1Options);

	// BillCode REST Route - Mobile Client (CORS)
	restify.serve (app, db.BillCodeModel, ermMobileV1Options);

	// ModCode REST Route - Mobile Client (CORS)
	restify.serve (app, db.ModCodeModel, ermMobileV1Options);

	// DxCode REST Route - Mobile Client (CORS)
	restify.serve (app, db.DxCodeModel, ermMobileV1Options);

	// PCA (Practice Calendar Assignment) REST Route - Mobile Client (CORS)
	restify.serve (app, db.PCAModel, ermMobileV1Options);

	/***************************************************************
	 * End REST APIs for Mobile Client
	 **************************************************************/

		// Require authentication for all app resources
	app.all ('/app/*', pass.ensureAuthenticated);


	// serve static files
	app.use ('/app', express.static (APP_DIR));

	/******************************************************
	 * Functions for Catching 404's and Errors
	 *****************************************************/

	// catch 404's and forward to error handler
	if (MODE === 'PRODUCTION') {
		// Production (MODE='PRODUCTION') error handler
		// no stacktraces leaked to user
		app.use (function (req, res, next) {
			// For Production, prevent leakage of site structure. Just redirect back.
			res.redirect ('/')
		});
	} else {
		// Default Development (MODE='DEV') and Test (MODE='TEST') error handlers
		// Will print stacktrace
		app.use (function (req, res, next) {
			var err = new Error ('Not Found');
			err.status = 404;
			next (err);
		});
	}

	// Set ERROR handler for message sent to user.
	// Note: This is separate from 404 handler
	if (MODE === 'PRODUCTION') {
		// Production (MODE='PRODUCTION') error handler
		// no stacktraces leaked to user
		app.use (function (err, req, res, next) {
			res.status (500);
			res.render ('error', {
				message: err.message,
				error: {}
			});
		});
	} else {
		// Default Development (MODE='DEV') and Test (MODE='TEST') error handlers
		// Will print stacktrace
		app.use (function (err, req, res, next) {
			res.status (err.status || 500);
			res.render ('error', {
				message: err.message,
				error: err
			});
		});
	}

	/******************************************************
	 * Server Startup Functions
	 *****************************************************/

		// Start up the server on the port specified in the config
	server.listen (config.server.listenPort, '0.0.0.0', 511, function () {
	});
	console.log ('App Server - listening on port: ' + config.server.listenPort);
	secureServer.listen (config.server.securePort);
	console.log ('Secure App Server - listening on port: ' + config.server.securePort);

	try {
		process.on ('SIGINT', function () {
			console.log ("Server shutting down.");
			process.exit (0);
		});
	} catch (e) {
	}
};




