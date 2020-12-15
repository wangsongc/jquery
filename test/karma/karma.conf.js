"use strict";

var grunt = require( "grunt" );

module.exports = function( config ) {
	var isTravis = process.env.TRAVIS,
		dateString = grunt.config( "dateString" ),

		// isBrowserStack = !!( process.env.BROWSER_STACK_USERNAME &&
		// 	process.env.BROWSER_STACK_ACCESS_KEY ),
		isBrowserStack = true,
		hostName = isBrowserStack ? "bs-local.com" : "localhost";

	config.set( {
		// browserstack: {
			
		// },

		// Can't specify path as "../../test" which would be intuitive
		// because if we do, karma will make paths outside "test" folder absolute
		// that will break iframe tests
		basePath: "../../",


		// files: [
		// 	"external/jquery/jquery.js",
		// 	"dist/sizzle.js",
		// 	"test/data/testingPseudos.js",

		// 	// Base fixtures
		// 	{
		// 		pattern: "test/data/fixtures.html",
		// 		watched: false
		// 	},

		// 	"test/data/testinit.js",
		// 	"test/data/testrunner.js",
		// 	"test/data/empty.js",

		// 	"test/unit/selector.js",
		// 	"test/unit/utilities.js",
		// 	"test/unit/extending.js",

		// 	// For iframe tests
		// 	{
		// 		pattern: "test/data/mixed_sort.html",
		// 		watched: false,
		// 		included: false
		// 	},
		// 	{
		// 		pattern: "test/data/noConflict.html",
		// 		watched: false,
		// 		included: false
		// 	}
		// ],

		// preprocessors: {

		// 	// mixed_sort.html, noConflict.html downloaded through iframe inclusion
		// 	// so it should not be preprocessed
		// 	"test/data/mixed_sort.html": [],
		// 	"test/data/noConflict.html": [],
		// 	"test/data/fixtures.html": [ "html2js" ]
		// },

		// Add BrowserStack launchers
		customLaunchers: require( "./lanucher" ),

		customContextFile: "test/karma.context.html",
				customDebugFile: "test/karma.debug.html",
				// customLaunchers: {
				// 	ChromeHeadlessNoSandbox: {
				// 		base: "ChromeHeadless",
				// 		flags: [ "--no-sandbox" ]
				// 	}
				// },
				frameworks: [ "qunit" ],
				middleware: [ "mockserver" ],
				plugins: [
					"karma-*",
					{
						"middleware:mockserver": [
							"factory",
							require( "../middleware-mockserver.js" )
						]
					}
				],
				client: {
					qunit: {

						// We're running `QUnit.start()` ourselves via `loadTests()`
						// in test/jquery.js
						autostart: false
					}
				},
				files: [
					"test/data/jquery-1.9.1.js",
					"node_modules/sinon/pkg/sinon.js",
					"node_modules/native-promise-only/lib/npo.src.js",
					"node_modules/requirejs/require.js",
					"test/data/testinit.js",

					"test/jquery.js",

					{
						pattern: "dist/jquery.*",
						included: false,
						served: true,
						nocache: true
					},
					{
						pattern: "src/**",
						type: "module",
						included: false,
						served: true,
						nocache: true
					},
					{
						pattern: "amd/**",
						included: false,
						served: true,
						nocache: true
					},
					{ pattern: "node_modules/**", included: false, served: true },
					{
						pattern: "test/**/*.@(js|css|jpg|html|xml|svg)",
						included: false,
						served: true,
						nocache: true
					}
				],

				// reporters: [ "dots" ],
				autoWatch: false,
				concurrency: 3,

				// captureTimeout: 20 * 1000,
				singleRun: true,
		// Make travis output less verbose
		reporters: isTravis ? "dots" : "progress",

		colors: !isTravis,

		hostname: hostName,
		port: 9876,

		// Possible values:
		// config.LOG_DISABLE
		// config.LOG_ERROR
		// config.LOG_WARN
		// config.LOG_INFO
		// config.LOG_DEBUG
		logLevel: config.LOG_INFO,

		// If browser does not capture in given timeout [ms], kill it
		captureTimeout: 3e5,
		browserNoActivityTimeout: 3e5,
		browserDisconnectTimeout: 3e5,
		browserDisconnectTolerance: 3
	} );

	// Deal with Travis environment
	if ( isTravis ) {

		// Browserstack launcher specifies "build" options as a default value
		// of "TRAVIS_BUILD_NUMBER" variable, but this way a bit more verbose
		config.browserStack.build = "travis #" + process.env.TRAVIS_BUILD_NUMBER;

		// You can't get access to secure environment variables from pull requests
		// so we don't have browserstack from them, but travis has headless Firefox so use that
		if ( !isBrowserStack && process.env.TRAVIS_PULL_REQUEST ) {
			config.browsers.push( "FirefoxHeadless" );
		}
	}
};
