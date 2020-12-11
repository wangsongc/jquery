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
		CLIEngine = require( "eslint" ).CLIEngine;

	if ( !grunt.option( "filename" ) ) {
		grunt.option( "filename", "jquery.js" );
	}

	var isBrowserStack = process.env.BROWSER_STACK_USERNAME && process.env.BROWSER_STACK_ACCESS_KEY,
	browsers = {
		phantom: [ "ChromeHeadless" ],
		desktop: [],
		android: [],
		ios: [],
		old: {
			firefox: [],
			chrome: [],
			safari: [],
			ie: [],
			opera: [],
			android: []
		}
	};

	// if Browserstack is set up, assume we can use it
	if ( isBrowserStack ) {

		// See https://github.com/jquery/sizzle/wiki/Sizzle-Documentation#browsers

		browsers.desktop = [
			"bs_chrome-45", // shares V8 with Node.js 4 LTS

			"bs_chrome-86", "bs_chrome-87",

			"bs_firefox-60", "bs_firefox-68", "bs_firefox-78", // Firefox ESR
			"bs_firefox-82", "bs_firefox-83",

			"bs_edge-15", "bs_edge-16", "bs_edge-17", "bs_edge-18",

			"bs_ie-9", "bs_ie-10", "bs_ie-11",

			"bs_opera-71", "bs_opera-72",

			// Real Safari 6.1 and 7.0 are not available
			"bs_safari-6.0", "bs_safari-8.0", "bs_safari-9.1", "bs_safari-10.1",
			"bs_safari-11.1", "bs_safari-12.1", "bs_safari-13.1"
		];

		browsers.ios = [
			"bs_ios-9.3", "bs_ios-10", "bs_ios-11", "bs_ios-12", "bs_ios-13", "bs_ios-14"
		];
		browsers.android = [
			"bs_android-4.0", "bs_android-4.1", "bs_android-4.2",
			"bs_android-4.3", "bs_android-4.4"
		];

		browsers.old = {
			firefox: [ "bs_firefox-3.6" ],
			chrome: [ "bs_chrome-16" ],
			safari: [ "bs_safari-4.0", "bs_safari-5.0", "bs_safari-5.1" ],
			ie: [ "bs_ie-7", "bs_ie-8" ],
			opera: [ "bs_opera-11.6", "bs_opera-12.16" ],
			ios: [ "bs_ios-5.1", "bs_ios-6.0", "bs_ios-7.0", "bs_ios-8.3" ],
			android: [ "bs_android-2.3" ]
		};
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
				browsers: isCi && ciBrowsers || [ "ChromeHeadless", "FirefoxHeadless" ]
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
			phantom: {
				browsers: [ "ChromeHeadless" ]

				// browsers: browsers.phantom
			},
			watch: {
					background: true,
					singleRun: false,
					browsers: browsers.phantom
				},
			phantom: {
					browsers: browsers.phantom

					// browsers: browsers.phantom
				},
			desktop: {

					// browsers: browsers.desktop
					browsers: browsers.desktop
				},
			android: {
					browsers: browsers.android
				},
			ios: {
					browsers: browsers.ios
				},
			oldIe: {
					browsers: browsers.old.ie,

					// Support: IE <=8 only
					// Force use of JSONP polling
					transports: [ "polling" ],
					forceJSONP: true
				},
			oldOpera: {
					browsers: browsers.old.opera
				},
			oldFirefox: {
					browsers: browsers.old.firefox
				},
			oldChrome: {
					browsers: browsers.old.chrome
				},
			oldSafari: {
					browsers: browsers.old.safari
				},
			oldAndroid: {
					browsers: browsers.old.android
				},
			oldIos: {
					browsers: browsers.old.ios
				},
			all: {
					browsers: browsers.phantom.concat(
						browsers.desktop,

						browsers.old.firefox,
						browsers.old.chrome,
						browsers.old.safari,
						browsers.old.ie,
						browsers.old.opera,

						browsers.ios,
						browsers.android,

						browsers.old.ios,
						browsers.old.android
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
