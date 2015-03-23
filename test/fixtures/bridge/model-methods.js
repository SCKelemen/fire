'use strict';

/* jshint undef: true, unused: true */
/* global angular */

var app = angular.module('default', ['ngRoute']);




app.controller('TestController', ['$scope', 'FireTestController', function($scope, fire) {/* jshint ignore:start */$scope.user = null; //jshint ignore:line
			// Test comment.

			$scope.submit = function() {
				fire.TestController.test()
					.then(function(result) {

					});
			};

			/* jshint ignore:end */
		}]);

app.controller('fn7', [function() {
			// Test :)
			//{
		}]);

app.controller('fn6', [function() {}]);

app.controller('fn5', [function() {}]);

app.controller('fn4', [function() { //jshint ignore:line
     		// Comments remains untouched.
     	}]);

app.controller('fn3', ['param1', 'param2', function(param1, param2) { //jshint ignore:line
			/* jshint ignore:start */
			alert('"There."');
			/* jshint ignore:end */
		}]);

app.controller('fn2', [function() {
    		/* jshint ignore:start */
    		test();
    		/* jshint ignore:end */
     	}]);

app.controller('fn1', [function() {
    		/* jshint ignore:start */
        	alert("/*This is not a comment, it's a string literal*/");
        	/* jshint ignore:end */
     	}]);

app.controller('fn0', ['param1', 'param2', function(param1, param2) { //jshint ignore:line
        	/*inside*/
        	/* jshint ignore:start */
        	execute(param2, param1);
        	/* jshint ignore:end */
    	}]);

function _getUUID(modelInstanceOrUUID) {
    var UUID;

    if(typeof modelInstanceOrUUID.toQueryValue != 'undefined') {
        UUID = modelInstanceOrUUID.toQueryValue();
    }
    else if(typeof modelInstanceOrUUID == 'string') {
        UUID = modelInstanceOrUUID;
    }
    else {
        var error = new FireError('Parameter `' + modelInstanceOrUUID + '` is not a valid model instance or UUID.');
        error.status = 400;
        throw error;
    }

    return UUID;
}

function FireError(message) {
    this.name = 'FireError';
    this.message = message || '';
	this.number = -1;
}
FireError.prototype = new Error();

function FireModelInstance(setMap, model, path) {
	this._map = setMap || {};
	this._changes = {};
	this._model = model;

	if(this._map.id) {
		this._endpoint = path + '/' + this._map.id;
	}
	else {
		this._endpoint = null;
	}
}

FireModelInstance.prototype.refresh = function(otherInstance) {
	this._map = otherInstance._map;
	return this;
};

FireModelInstance.prototype.toQueryValue = function() {
	return this._map.id;
};

FireModelInstance.prototype.remove = function() {
	return this._model.remove(this._map.id);
};

FireModelInstance.prototype.save = function() {
	// TODO: Check validation locally.

    var self = this;
    return this.$q.when(Object.keys(this._changes).length)
        .then(function(numberOfChanges) {
            if(numberOfChanges) {
                var queryMap = transformQueryMap(self._changes);

                return self._model._put(self._endpoint, queryMap)
                    .then(function(instance) {
                        self._changes = {};

                        Object.keys(instance._map).forEach(function(key) {
                            if(instance._map[key] !== null) {
                                self._map[key] = instance._map[key];
                            }
                        });
                        return self;
                    });
            }
            else {
                return self;
            }
        });
};

function FireModel($http, $q, models) {
	this.$http = $http;
	this.$q = $q;
	this.models = models;
}

FireModel.prototype._prepare = function(params) {
	var map = {};
	Object.keys(params || {}).forEach(function(key) {
		map[key] = JSON.stringify(params[key]);
	});
	return map;
};

FireModel.prototype._action = function(verb, path, params, data) {
	var defer = this.$q.defer();

	var self = this;
	this.$http({method: verb, url: path, data: data, params: params, headers: {'x-json-params': true}})
		.success(function(result) {
			defer.resolve(self.parseResult(result, path));
		})
		.error(function(data, statusCode) {
            var error = new FireError(data);
            error.number = statusCode;
			defer.reject(error);
		});

	return defer.promise;
};

FireModel.prototype._post = function(path, fields) {
	return this._action('post', path, null, this._prepare(fields));
};

FireModel.prototype._get = function(path, params) {
	return this._action('get', path, this._prepare(params));
};

FireModel.prototype._put = function(path, fields) {
	return this._action('put', path, null, this._prepare(fields));
};

FireModel.prototype.update = function(id, model) {
    var queryMap = transformQueryMap(model);

	return this._put(this.endpoint + '/' + id, queryMap);
};

FireModel.prototype.remove = function(modelInstanceMapOrUUID) {
    var UUID = null;

    if(typeof modelInstanceMapOrUUID.toQueryValue != 'undefined') {
        UUID = modelInstanceMapOrUUID.toQueryValue();
    }
    else if(typeof modelInstanceMapOrUUID == 'string') {
        UUID = modelInstanceMapOrUUID;
    }

    if(UUID) {
        return this._action('delete', this.endpoint + '/' + UUID);
    }
    else {
        return this._action('delete', this.endpoint, this._prepare(transformQueryMap(modelInstanceMapOrUUID)));
    }
};

FireModel.prototype.findOrCreate = function(where, set) {
	var self = this;
	return this.findOne(where)
		.then(function(modelInstance) {
			if(modelInstance) {
				return modelInstance;
			}
			else {
				var createMap = {};
				Object.keys(where || {}).forEach(function(key) {
					createMap[key] = where[key];
				});

				Object.keys(set || {}).forEach(function(key) {
					createMap[key] = set[key];
				});

				return self.create(createMap);
			}
		});
};

FireModel.prototype._create = function(path, fields) {
    var queryMap = transformQueryMap(fields);

	return this._post(path, queryMap);
};

FireModel.prototype.create = function(fields) {
	return this._create(this.endpoint, fields);
};

function transformQueryMap(fields, options) {
    var queryMap = {};

    Object.keys(fields || {}).forEach(function(key) {
        var value = fields[key];
        if(value && typeof value.toQueryValue != 'undefined') {
            queryMap[key] = value.toQueryValue();
        }
        else {
            queryMap[key] = value;
        }
    });

    if(options) {
        queryMap.$options = options;
    }

    return queryMap;
}

FireModel.prototype._find = function(path, fields, options) {
	var queryMap = transformQueryMap(fields, options);
	return this._get(path, queryMap);
};

FireModel.prototype.find = function(fields, options) {
	return this._find(this.endpoint, fields, options);
};

FireModel.prototype.findOne = function(fields, options) {
	var fieldsMap = fields || {};
	if(fieldsMap.id) {
		var modelID = fieldsMap.id;
		delete fieldsMap.id;

		var self = this;
		return this._get(this.endpoint + '/' + modelID, transformQueryMap(fieldsMap))
			.then(function(modelInstance) {
				if(modelInstance) {
					modelInstance._endpoint = self.endpoint + '/' + modelID;
				}

				return modelInstance;
			});
	}
	else {
		var optionsMap = options || {};
		optionsMap.limit = 1;

		return this.find(fieldsMap, optionsMap)
			.then(function(list) {
				if(list && list.length) {
					return list[0];
				}
				else {
					return null;
				}
			});
	}

};

FireModel.prototype.getOne = function(fields) {
	var defer = this.$q.defer();
	this.findOne(fields)
		.then(function(model) {
			if(model) {
				defer.resolve(model);
			}
			else {
				var error = new FireError('Not Found');
				error.number = 404;
				defer.reject(error);
			}
		});
	return defer.promise;
};


function FireModelInstancePet(setMap, model, path) {
	var self = this;

	

	Object.defineProperty(this, 'id', {
		get: function() {
			if(typeof self._changes['id'] != 'undefined') {
				return self._changes['id'];
			}

			return self._map['id'];
		},

		set: function(value) {
			self._changes['id'] = value;
		}
	});

	

	Object.defineProperty(this, 'name', {
		get: function() {
			if(typeof self._changes['name'] != 'undefined') {
				return self._changes['name'];
			}

			return self._map['name'];
		},

		set: function(value) {
			self._changes['name'] = value;
		}
	});


	FireModelInstance.call(this, setMap, model, path);
}
FireModelInstancePet.prototype = new FireModelInstance();



function FireModelPet($http, $q, models) {
	FireModel.call(this, $http, $q, models);

	this.endpoint = '/api/pets';
}
FireModelPet.prototype = new FireModel();

FireModelPet.prototype.parseResult = function(setMapOrList, path) {
	if(Object.prototype.toString.call(setMapOrList) === '[object Array]') {
		var self = this;
		return setMapOrList.map(function(setMap) {
			return new FireModelInstancePet(setMap, self, path);
		});
	}
	else {
		return new FireModelInstancePet(setMapOrList, this, path);
	}
};



app.factory('PetModel', ['$http', '$q', 'FireModels', function($http, $q, FireModels) {
	return new FireModelPet($http, $q, FireModels);
}]);

function FireModelInstanceUser(setMap, model, path) {
	var self = this;

	

	Object.defineProperty(this, 'id', {
		get: function() {
			if(typeof self._changes['id'] != 'undefined') {
				return self._changes['id'];
			}

			return self._map['id'];
		},

		set: function(value) {
			self._changes['id'] = value;
		}
	});

	

	Object.defineProperty(this, 'name', {
		get: function() {
			if(typeof self._changes['name'] != 'undefined') {
				return self._changes['name'];
			}

			return self._map['name'];
		},

		set: function(value) {
			self._changes['name'] = value;
		}
	});


	FireModelInstance.call(this, setMap, model, path);
}
FireModelInstanceUser.prototype = new FireModelInstance();



function FireModelUser($http, $q, models) {
	FireModel.call(this, $http, $q, models);

	this.endpoint = '/api/users';
}
FireModelUser.prototype = new FireModel();

FireModelUser.prototype.parseResult = function(setMapOrList, path) {
	if(Object.prototype.toString.call(setMapOrList) === '[object Array]') {
		var self = this;
		return setMapOrList.map(function(setMap) {
			return new FireModelInstanceUser(setMap, self, path);
		});
	}
	else {
		return new FireModelInstanceUser(setMapOrList, this, path);
	}
};



app.factory('UserModel', ['$http', '$q', 'FireModels', function($http, $q, FireModels) {
	return new FireModelUser($http, $q, FireModels);
}]);

function FireModelInstanceArticle(setMap, model, path) {
	var self = this;

	

	Object.defineProperty(this, 'id', {
		get: function() {
			if(typeof self._changes['id'] != 'undefined') {
				return self._changes['id'];
			}

			return self._map['id'];
		},

		set: function(value) {
			self._changes['id'] = value;
		}
	});

	

	Object.defineProperty(this, 'title', {
		get: function() {
			if(typeof self._changes['title'] != 'undefined') {
				return self._changes['title'];
			}

			return self._map['title'];
		},

		set: function(value) {
			self._changes['title'] = value;
		}
	});


	FireModelInstance.call(this, setMap, model, path);
}
FireModelInstanceArticle.prototype = new FireModelInstance();



function FireModelArticle($http, $q, models) {
	FireModel.call(this, $http, $q, models);

	this.endpoint = '/api/articles';
}
FireModelArticle.prototype = new FireModel();

FireModelArticle.prototype.parseResult = function(setMapOrList, path) {
	if(Object.prototype.toString.call(setMapOrList) === '[object Array]') {
		var self = this;
		return setMapOrList.map(function(setMap) {
			return new FireModelInstanceArticle(setMap, self, path);
		});
	}
	else {
		return new FireModelInstanceArticle(setMapOrList, this, path);
	}
};



app.factory('ArticleModel', ['$http', '$q', 'FireModels', function($http, $q, FireModels) {
	return new FireModelArticle($http, $q, FireModels);
}]);


app.service('FireModels', ['$http', '$q', function($http, $q) {
	
	this.Pet = new FireModelPet($http, $q, this);
	
	this.User = new FireModelUser($http, $q, this);
	
	this.Article = new FireModelArticle($http, $q, this);
	
}]);
function unwrap(promise, initialValue) {
    var value = initialValue;

    promise.then(function(newValue) {
        angular.copy(newValue, value);
    });

    return value;
};

app.service('fire', ['FireModels', '$http', '$q', function(FireModels, $http, $q) {
    function unwrap(promise, initialValue) {
        var value = initialValue;

        promise.then(function(newValue) {
            angular.copy(newValue, value);
        });

        return value;
    };
    this.unwrap = unwrap;
    this.models = FireModels;
}]);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });

    $routeProvider.when('', {
        templateUrl: '/templates/test.html',
        controller: 'TestController',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn7.html',
        controller: 'fn7',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn6.html',
        controller: 'fn6',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn5.html',
        controller: 'fn5',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn4.html',
        controller: 'fn4',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn3.html',
        controller: 'fn3',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn2.html',
        controller: 'fn2',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn1.html',
        controller: 'fn1',
        resolve: {
        
        }
    });

    $routeProvider.when('', {
        templateUrl: '/templates/fn0.html',
        controller: 'fn0',
        resolve: {
        
        }
    });

}]);
app.service('ChannelService', ['WebSocketService', '$rootScope', function(WebSocketService, $rootScope) {
	var channelsMap = {};

	function getChannelAddress(channelId, channelType) {
		return (channelType + ':' + channelId);
	}

	this.registerChannel = function(channel) {
		channelsMap[getChannelAddress(channel.id, channel.type)] = channel;

		this.sendMessageOnChannel({
			event: '_subscribe'
		}, channel);
	};

	this.getChannel = function(channelId, channelType) {
		return channelsMap[getChannelAddress(channelId, channelType)];
	};

	this.getUnknownMessage = function(messageMap, channelMap) { //jshint ignore:line
		console.log('Unknown message.');
	};

	this.sendMessageOnChannel = function(message, channel) {
		return WebSocketService.send({
			channel: {
				type: channel.type,
				id: channel.id
			},
			message: message
		});
	};

	var self = this;
	WebSocketService.parsePacket = function(packet) {
		var channel = self.getChannel(packet.channel.id, packet.channel.type);
		if(channel) {
			if(channel.delegate) {
				$rootScope.$apply(function() {
					channel.delegate(packet.message);
				});
			}
			else {
				console.log('Warning: no delegate set on channel.');
			}
		}
		else {
			$rootScope.$apply(function() {
				self.getUnknownMessage(packet.message, packet.channel);
			});
		}
	};
}]);

app.service('WebSocketService', ['$location', '$timeout', function($location, $timeout) {
	var queue = [];

	var reconnectInterval = 1000;
	var reconnectDecay = 1.5;
	var reconnectAttempts = 0;
	var reconnectMaximum = 60 * 1000;
	var socket = null;

	var self = this;
	var onOpen = function () {
		if(queue && queue.length > 0) {
			var queue_ = queue;
			queue = null;

			queue_.forEach(function(message) {
				self.send(message);
			});
		}
	};

	var onError = function(error) {
		console.log('error');
		console.log(error);
	};

	var onClose = function(event) {
		$timeout(connect, Math.max(reconnectMaximum, reconnectInterval * Math.pow(reconnectDecay, reconnectAttempts)));
	};

	var onMessage = function(event) {
		var packet = JSON.parse(event.data);

		// TODO: Change this to an event emitter instead. Now it's only possible to delegate the packets to 1 listeners.

		if(self.parsePacket) {
			self.parsePacket(packet);
		}
	};

	function connect() {
		reconnectAttempts++;

		socket = new WebSocket('ws://' + $location.host() + ($location.port() ? ':' + $location.port() : ''));
		socket.onopen = onOpen;
		socket.onerror = onError;
		socket.onclose = onClose;
		socket.onmessage = onMessage;
	}

	this.send = function(message) {
		if(queue !== null) {
			queue.push(message);
		}
		else {
			console.log(socket);

			socket.send(JSON.stringify(message));
		}
	};
	this.parsePacket = null;

	connect();
}]);


/* global window, app */
app.service('_StorageService', [function _StorageService() {
	var storage = {};

	this.get = function(key) {
		if(typeof storage[key] != 'undefined') {
			return storage[key];
		}
		else {
			return window.localStorage.getItem(key);
		}
	};

	this.set = function(key, value) {
		try {
			window.localStorage.setItem(key, value);
		}
		catch(error) {
			storage[key] = value;
		}
	};

	this.unset = function(key) {
		if(typeof storage[key] != 'undefined') {
			delete storage[key];
		}
		else {
			window.localStorage.removeItem(key);
		}
	};
}]);

app.service('TestsService', [function() {
	this.delegate = null;
	this.participate = function(test, variant) {
		if(this.delegate === null) {
			throw new Error('Please set the TestsService.delegate');
		}
		else {
			this.delegate.participate(test, variant);
		}
	};
}]);


