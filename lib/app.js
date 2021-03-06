'use strict';

var Injector = require('./modules/injector');
var Controllers = require('./modules/controllers');
var Static = require('./modules/static');
var Models = require('./modules/models');
var APIBuild = require('./modules/api-build');
var APIServe = require('./modules/api-serve');
var Bridge = require('./modules/bridge');
var Templates = require('./modules/templates');
var Bridge = require('./modules/bridge');
var Workers = require('./modules/workers');
var HTTPServer = require('./modules/http-server');
var ConfigureFunctions = require('./modules/configure-functions');
var Tasks = require('./modules/tasks');
var Streams = require('./modules/streams');
var ModuleProperties = require('./modules/module-properties');
var Triggers = require('./modules/triggers');
var Clock = require('./modules/clock');
var Schedulers = require('./modules/schedulers');
var Middleware = require('./modules/middleware');
var Tests = require('./modules/tests');
var Isomorphic = require('./modules/isomorphic');
var SearchSystem = require('./modules/search-system');
var StageMethods = require('./modules/stage-methods');
var BuildSystem = require('./modules/build-system');
var AutoReconnect = require('./modules/auto-reconnect');

var utils = require('./helpers/utils');
var config = require('./helpers/config');
var fs = require('fs');

var AppContainer = require('./app-container');

var path = require('path');
var inflection = require('inflection');

var Q = require('q');
var minimist = require('minimist');
var debug = require('debug')('fire:app');

exports = module.exports = App;

/**
 * Initialize a new `App` for both the client- and server-context. A new app is usually created via {@link Firestarter#app}.
 *
 * In the client-context, this creates an `angular.Module` with `name` and requires from `settings.modules`. This instance also acts as a proxy to the `angular.Module`. This means that you can invoke `directive`, `controller` or any of the `angular.Module` methods.
 *
 * For a complete list, angular's Module documentation at {@link https://docs.angularjs.org/api/ng/type/angular.Module}.
 *
 * @param {String} name    Name of the app.
 * @param {Dictionary} settings
 * @param {String} settings.type The type of the app, either angular or ractive.
 * @param {Array} settings.modules List of requires passed to angular.Module. These modules are also automatically bundled in browserify if they are available in `node_modules`.
 * @param {Array} settings.require List of additional files to bundle in browserify in the build stage.
 * @param {Boolean} settings.isMaster Whether this app is the master. A master app is responsible for any shared models and other dependencies.
 *
 * @constructor
 */
function App(name, settings, container) {
	debug('Creating app `' + name + '` ' + JSON.stringify(settings) + '.');

	this.name = name;
	this._settings = settings || {};
	this.container = container;

	Object.defineProperty(this, 'type', {
		get: function() {
			throw new Error('App#type is deprecated. Use App#settings(\'type\') instead.');
		}
	});

	if(!this._settings.type) {
		this._settings.type = 'angular';
	}

	if(typeof this._settings.modules == 'undefined') {
		this._settings.modules = ['angular-route'];
	}

	if(typeof this._settings.require == 'undefined') {
		this._settings.require = [];
	}

	for(var i = 0, il = this._settings.modules.length; i < il; i++) {
		var moduleName = this._settings.modules[i];
		if(moduleName == 'ngRoute') {
			throw new Error([
				'`ngRoute` found instead of `angular-route`.',
				'',
				'Node on Fire now uses browserify and a CommonJS-based loading on the client-side. It looks like your project is still based on bower. Please migrate your project.',
				'',
				'Please check your modules in your app and install the CommonJS versions from npm (most if not all libraries from bower should be available in npm. This removes one dependency: bower). Rename `ngRoute` in modules to `angular-route` and do a `npm install angular-route --save`.',
				'',
				'If you have additional files you want to bundle, please include them in the `require` key in the settings object when creating an app, see http://nodeonfire.org/documentation/App.html.',
				'',
				'Lastly, update your `view.jade` to remove all unnecessary scripts and load the `/scripts/bundle.min.js.`. This file includes all JavaScript.'
			].join('\n'));
		}
	}

	this.modules = [];
	this._loadModules();
}

App.prototype.isRunStage = function() {
	return (this.container.stage == 'run');
};

App.prototype.isBuildStage = function() {
	return (this.container.stage == 'build');
};

App.prototype.isReleaseStage = function() {
	return (this.container.stage == 'release');
};

App.prototype.settings = function(key, value) {
	if(typeof value == 'undefined') {
		return this._settings[key];
	}
	else {
		this._settings[key] = value;
		return value;
	}
};

App.prototype._loadModules = function() {
	// TODO: Load these modules automatically?

	this.addModule(Injector);
	this.addModule(Isomorphic);
	this.addModule(StageMethods);
	this.addModule(BuildSystem);

	this.addModule(Templates);
	this.addModule(Models);
	this.addModule(Controllers);
	this.addModule(Bridge);
	this.addModule(Clock);
	this.addModule(APIBuild);
	this.addModule(APIServe);
	this.addModule(Workers);
	this.addModule(Triggers);
	this.addModule(HTTPServer);
	this.addModule(Middleware);
	this.addModule(ConfigureFunctions);
	this.addModule(Static);
	this.addModule(Tasks);
	this.addModule(Schedulers);
	this.addModule(Streams);
	this.addModule(SearchSystem);
	this.addModule(Tests);
	this.addModule(ModuleProperties);
	this.addModule(AutoReconnect);
};

App.prototype.requireDirSync = function(dirPath, all) {
	if(this.container.numberOfApps() == 1) {
		utils._requireDirSync(dirPath);
	}
	else if(all) {
		this.settings('_sharedMode', true);

		utils._requireDirSync(path.join(dirPath, AppContainer.kSharedAppName));

		this.settings('_sharedMode', false);

		Object.keys(this.container.appsMap).forEach(function(appName) {
			this.container.setActiveApp(this.container.appsMap[appName]);
			utils._requireDirSync(path.join(dirPath, appName));
			this.container.setActiveApp(null);
		}, this);
	}
	else {
		this.settings('_sharedMode', true);

		utils._requireDirSync(path.join(dirPath, AppContainer.kSharedAppName));

		this.settings('_sharedMode', false);

		utils._requireDirSync(path.join(dirPath, this.name));

		// Only check in development mode as we do not want to increase start-up time of the app in production.
		if(process.env.NODE_ENV != 'production' && fs.existsSync(dirPath)) {
			var self = this;
			fs.readdirSync(dirPath).forEach(function(resourceFileName) {
				if(resourceFileName.length && resourceFileName[0] != '_' && resourceFileName[0] != '.') {
					var fullPath = path.join(dirPath, resourceFileName);
					if(!fs.lstatSync(fullPath).isDirectory()) {
						throw new Error('Not loading file `' + resourceFileName + '`. You have multiple apps and the file is not in one of the app folders or the `_shared` folder.');
					}
					else if(resourceFileName != AppContainer.kSharedAppName) {
						try {
							self.container.getApp(resourceFileName);
						}
						catch(e) {
							console.log(e);

							throw new Error('Found folder `' + resourceFileName + '` but no app of this names exists. The active app is `' + self.name + '`. If this folder should be loaded, be sure to create an app with the same name. If it should not be loaded, please rename the folder to `_' + resourceFileName + '`.');
						}
					}
				}
			});
		}
	}
};

/**
 * Adds a new module to the app.
 *
 * @param {Constructor} moduleConstructor The module constructor which gets invoked with 1 param: this app instance.
 * @return {App} The app instance-so this method is chainable.
 */
App.prototype.addModule = function(moduleConstructor) {
	if(typeof moduleConstructor.prototype.ignoreDisabled != 'undefined') {
		throw new Error('Module#ignoreDisabled is deprecated. Please use Module#stages to indicate which stages the module should be available.');
	}

	var module_ = null;

	if(this.injector) {
		module_ = this.injector.construct(moduleConstructor);
	}
	else {
		module_ = new moduleConstructor(this);
	}

	this.modules.push(module_);

	// We get the name of the property based on the name of the constructor
	var propertyName = inflection.camelize(moduleConstructor.name, (moduleConstructor.name.length <= 1 || moduleConstructor.name.substring(1, 2).toLowerCase() == moduleConstructor.name.substring(1, 2)));

	if(this[propertyName]) {
		throw new Error('Module `' + propertyName + '` already exists.');
	}

	if(typeof module_.stages == 'undefined') {
		throw new Error('Please set Module#stages on `' + moduleConstructor.name + '` to indicate which stage the module should be available.');
	}

	Object.defineProperty(this, propertyName, {
		value: module_,
		configurable: true
	});

	this.injector.register(propertyName, function() {
		return module_;
	});

	if(module_.exports) {
		// Let's add the exported methods of the module to the app so they can be used in user-land.
		var exportMethods = module_.exports();
		Object.keys(exportMethods).forEach(function(key) {
			var exportMethod = exportMethods[key];

			var existingMethod = this[key];
			if(existingMethod) {
				// A method already exists. No problem, we'll just chain them.
				this[key] = function() {
					// Copying the special arguments array-like object this way avoids memory leaks.
					var args = new Array(arguments.length);
					for(var i = 0; i < args.length; ++i) {
						args[i] = arguments[i];
					}

					return Q.when(exportMethod(args))
						.then(function() {
							return existingMethod(args);
						});
				};
			}
			else {
				this[key] = exportMethod;
			}
		}, this);
	}
	return this;
};

App.prototype.isActive = function() {
	return (this.container.numberOfApps() == 1 || this.container.getActiveAppName() == this.name);
};

/**
 * Removes a module.
 *
 * ```
 * app.removeModule(app.webSockets);
 * ```
 */
App.prototype.removeModule = function(module_) {
	var index = this.modules.indexOf(module_);
	if(index >= 0) {
		this.modules.splice(index, 1);

		var propertyName = inflection.camelize(module_.constructor.name, (module_.constructor.name.length <= 1 || module_.constructor.name.substring(1, 2).toLowerCase() == module_.constructor.name.substring(1, 2)));
		this.injector.unregister(propertyName);
		delete this[propertyName];
	}
};

/**
 * Stops the app. This also invokes the `stop` method on all modules.
 *
 * @return {Promise} Resolves when closing of the server finishes, or rejects when an error occurs.
 */
App.prototype.stop = function() {
	debug('Stopping app `' + this.name + '`.');

	var result = Q.when(true);

	this.modules.forEach(function(module_) {
		if(module_.stop) {
			result = result.then(function() {
				return module_.stop();
			});
		}
	});

	return result;
};

/**
 * Starts the app.
 *
 * This method is deprecated. Please use `fire#start()` instead.
 *
 * @deprecated
 */
App.prototype.start = function() {
	throw new Error('This method is deprecated. Please use `fire#start()` instead.');
};

/**
 * Starts the app by setting up all modules, invoking all configure functions, starting the HTTP server and binding to the value of PORT defined in the environmental table.
 *
 * This method should not be be invoked multiple times (even after calling App#stop).
 *
 * @return {Promise}
 */
App.prototype._start = function() {
	var argv = minimist(process.argv.slice(2)) || {};
	debug('App#_start ' + this.name + ' (arguments: ' + Object.keys(argv).join(', ') + ')');

	this.injector.register('argv', function() {
		return argv;
	});

	var currentStage = this.container.stage;

	var self = this;
	return (function setupModules() {
		debug('App#setup');

		var result = Q.when(true);

		self.modules.forEach(function(module_) {
			if(module_.stages.indexOf(currentStage) != -1 && module_.setup) {
				result = result.then(function() {
					debug(module_.constructor.name + '#setup');

					return Q.when(self.injector.call(module_.setup, {basePath: config.basePath}, module_));
				});
			}
		});

		return result;
	})()
		.then(function startModules() {
			debug('Start app ' + self.name + ' in ' + currentStage + ' stage.');

			var result = Q.when(true);

			if(currentStage == 'run') {
				self.modules.forEach(function(module_) {
					if(module_.start && typeof module_.start == 'function') {
						result = result.then(function() {
							debug(module_.constructor.name + '#start');

							return self.injector.call(module_.start, {}, module_);
						});
					}
				});

				result = result
					.then(function() {
						return self.stageMethods.run();
					});
			}

			return result;
		})
		.catch(function(error) {
			console.log(error);
			console.log(error.stack);
			throw error;
		});
};
