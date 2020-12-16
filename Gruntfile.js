"use strict";

module.exports = function( grunt ) {
	function readOptionalJSON( filepath ) {
		var stripJSONComments = require( "strip-json-comments" ),
			data = {};
		try {
			data = JSON.parse( stripJSONComments(
				fs.readFileSync( filepath, { encoding: "utf8" } )
			) );
		} catch ( e ) {}
		return data;
	}

	var fs = require( "fs" ),
		gzip = require( "gzip-js" ),
		isCi = process.env.TRAVIS || process.env.GITHUB_ACTION,
		ciBrowsers = process.env.BROWSERS && process.env.BROWSERS.split( "," ),
		isBrowserStack = !!( process.env.BROWSER_STACK_USERNAME &&
			process.env.BROWSER_STACK_ACCESS_KEY ),
		browsers = {
			headless: [ "FirefoxHeadless" ],
			firefox: [],
			chrome: [],
			edge: [],
			ie: [],
			opera: [],
			safari: []
		},
		CLIEngine = require( "eslint" ).CLIEngine;

	if ( !grunt.option( "filename" ) ) {
		grunt.option( "filename", "jquery.js" );
	}

	browsers = {
		headless: [ "FirefoxHeadless" ],
		firefox: [],
		chrome: [],
		edge: [],
		ie: [],
		opera: [],
		safari: []
	};

	// if Browserstack is set up, assume we can use it
	if ( isBrowserStack ) {

		browsers.firefox = [
			"bs_firefox-48", "bs_firefox-60", "bs_firefox-78", "bs_firefox-82", "bs_firefox-83"
		];

		browsers.chrome = [
			"bs_chrome-86", "bs_chrome-87", "bs_android-8.0"
		];

		browsers.edge = [
			"bs_edge-18", "bs_edge-86", "bs_edge-87"
		];

		browsers.ie = [
			"bs_ie-9", "bs_ie-10", "bs_ie-11"
		];

		browsers.opera = [
			"bs_opera-72"
		];

		browsers.safari = [
			"bs_safari-12.1", "bs_safari-13.1"
		];
	}

	grunt.initConfig( {
		pkg: grunt.file.readJSON( "package.json" ),
		dst: readOptionalJSON( "dist/.destination.json" ),
		compare_size: {
			files: [ "dist/jquery.js", "dist/jquery.min.js" ],
			options: {
				compress: {
					gz: function( contents ) {
						return gzip.zip( contents, {} ).length;
					}
				},
				cache: "build/.sizecache.json"
			}
		},
		babel: {
			options: {
				sourceMap: "inline",
				retainLines: true,
				plugins: [ "@babel/transform-for-of" ]
			},
			tests: {
				files: {
					"test/data/core/jquery-iterability-transpiled.js":
						"test/data/core/jquery-iterability-transpiled-es6.js"
				}
			}
		},
		build: {
			all: {
				dest: "dist/jquery.js",
				minimum: [
					"core",
					"selector"
				],

				// Exclude specified modules if the module matching the key is removed
				removeWith: {
					ajax: [ "manipulation/_evalUrl", "deprecated/ajax-event-alias" ],
					callbacks: [ "deferred" ],
					css: [ "effects", "dimensions", "offset" ],
					"css/showHide": [ "effects" ],
					deferred: {
						remove: [ "ajax", "effects", "queue", "core/ready" ],
						include: [ "core/ready-no-deferred" ]
					},
					event: [ "deprecated/ajax-event-alias", "deprecated/event" ]
				}
			}
		},
		jsonlint: {
			pkg: {
				src: [ "package.json" ]
			}
		},
		eslint: {
			options: {
				maxWarnings: 0
			},

			// We have to explicitly declare "src" property otherwise "newer"
			// task wouldn't work properly :/
			dist: {
				src: [ "dist/jquery.js", "dist/jquery.min.js" ]
			},
			dev: {
				src: [
					"src/**/*.js",
					"Gruntfile.js",
					"test/**/*.js",
					"build/**/*.js",

					// Ignore files from .eslintignore
					// See https://github.com/sindresorhus/grunt-eslint/issues/119
					...new CLIEngine()
						.getConfigForFile( "Gruntfile.js" )
						.ignorePatterns.map( ( p ) => `!${ p }` )
				]
			}
		},
		testswarm: {
			tests: [

				// A special module with basic tests, meant for not fully
				// supported environments like jsdom. We run it everywhere,
				// though, to make sure tests are not broken.
				"basic",

				"ajax",
				"animation",
				"attributes",
				"callbacks",
				"core",
				"css",
				"data",
				"deferred",
				"deprecated",
				"dimensions",
				"effects",
				"event",
				"manipulation",
				"offset",
				"queue",
				"selector",
				"serialize",
				"support",
				"traversing",
				"tween"
			]
		},
		karma: {
			options: {
				configFile: "test/karma/karma.conf.js",
				singleRun: true
			},
			main: {
				browsers: isCi && ciBrowsers || browsers.headless
			},
			esmodules: {
				browsers: isCi && ciBrowsers || [ "ChromeHeadless" ],
				options: {
					client: {
						qunit: {

							// We're running `QUnit.start()` ourselves via `loadTests()`
							// in test/jquery.js
							autostart: false,

							esmodules: true
						}
					}
				}
			},
			amd: {
				browsers: isCi && ciBrowsers || [ "ChromeHeadless" ],
				options: {
					client: {
						qunit: {

							// We're running `QUnit.start()` ourselves via `loadTests()`
							// in test/jquery.js
							autostart: false,

							amd: true
						}
					}
				}
			},
			firefox: {
					browsers: browsers.firefox
				},
			chrome: {
					browsers: browsers.chrome
				},
			edge: {
					browsers: browsers.edge
				},
			ie: {
					browsers: browsers.ie,

					// Support: IE <=8 only
					// Force use of JSONP polling
					transports: [ "polling" ],
					forceJSONP: true
				},
			opera: {
					browsers: browsers.opera
			},
			safari: {
					browsers: browsers.safari
			},
			all: {
					browsers: browsers.headless.concat(
						browsers.firefox,
						browsers.chrome,
						browsers.edge,
						browsers.ie,
						browsers.opera,
						browsers.safari
					)
				},
			jsdom: {
				options: {
					files: [
						"test/data/jquery-1.9.1.js",
						"test/data/testinit-jsdom.js",

						// We don't support various loading methods like esmodules,
						// choosing a version etc. for jsdom.
						"dist/jquery.js",

						// A partial replacement for testinit.js#loadTests()
						"test/data/testrunner.js",

						// jsdom only runs basic tests
						"test/unit/basic.js",

						{
							pattern: "test/**/*.@(js|css|jpg|html|xml|svg)",
							included: false,
							served: true
						}
					]
				},
				browsers: [ "jsdom" ]
			},

			// To debug tests with Karma:
			// 1. Run 'grunt karma:chrome-debug' or 'grunt karma:firefox-debug'
			//    (any karma subtask that has singleRun=false)
			// 2. Press "Debug" in the opened browser window to start
			//    the tests. Unlike the other karma tasks, the debug task will
			//    keep the browser window open.
			"chrome-debug": {
				browsers: [ "Chrome" ],
				singleRun: false
			},
			"firefox-debug": {
				browsers: [ "Firefox" ],
				singleRun: false
			},
			"ie-debug": {
				browsers: [ "IE" ],
				singleRun: false
			}
		},
		watch: {
			files: [ "<%= eslint.dev.src %>" ],
			tasks: [ "dev" ]
		},
		uglify: {
			all: {
				files: {
					"dist/<%= grunt.option('filename').replace('.js', '.min.js') %>":
						"dist/<%= grunt.option('filename') %>"
				},
				options: {
					preserveComments: false,
					sourceMap: true,
					sourceMapName:
						"dist/<%= grunt.option('filename').replace('.js', '.min.map') %>",
					report: "min",
					output: {
						"ascii_only": true
					},
					banner: "/*! jQuery v<%= pkg.version %> | " +
						"(c) OpenJS Foundation and other contributors | jquery.org/license */",
					compress: {
						"hoist_funs": false,
						loops: false
					}
				}
			}
		}
	} );

	// Load grunt tasks from NPM packages
	require( "load-grunt-tasks" )( grunt );

	// Integrate jQuery specific tasks
	grunt.loadTasks( "build/tasks" );

	grunt.registerTask( "lint", [
		"jsonlint",

		// Running the full eslint task without breaking it down to targets
		// would run the dist target first which would point to errors in the built
		// file, making it harder to fix them. We want to check the built file only
		// if we already know the source files pass the linter.
		"eslint:dev",
		"eslint:dist"
	] );

	grunt.registerTask( "lint:newer", [
		"newer:jsonlint",

		// Don't replace it with just the task; see the above comment.
		"newer:eslint:dev",
		"newer:eslint:dist"
	] );

	grunt.registerTask( "test:fast", "node_smoke_tests" );
	grunt.registerTask( "test:slow", [
		"promises_aplus_tests",
		"karma:jsdom"
	] );

	grunt.registerTask( "karma:tests", [
		`karma-tests:${ isBrowserStack ? "browserstack" : "" }`
	] );

	grunt.registerTask( "test:prepare", [
		"qunit_fixture",
		"babel:tests"
	] );

	grunt.registerTask( "test", [
		"test:prepare",
		"test:fast",
		"test:slow"
	] );

	grunt.registerTask( "dev", [
		"build:*:*",
		"newer:eslint:dev",
		"newer:uglify",
		"remove_map_comment",
		"dist:*",
		"qunit_fixture",
		"compare_size"
	] );

	grunt.registerTask( "default", [
		"eslint:dev",
		"build:*:*",
		"amd",
		"uglify",
		"remove_map_comment",
		"dist:*",
		"test:prepare",
		"eslint:dist",
		"test:fast",
		"compare_size"
	] );
};
