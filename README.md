#### Under active development. Not feature-complete yet and unstable.

[![Build Status](https://travis-ci.org/martijndeh/fire.svg?branch=master)](https://travis-ci.org/martijndeh/fire)
## Node on Fire
A productive & convention-based web framework.

### Installation
```
npm install fire
```

### Features
- Very productive & super-easy.
- Routing system based on naming convention of your controller's methods.
- Create models and associations which will persist to your datastore (Postgres).
- Generate your database schema based on your models with migrations. You can easily apply or revert migrations.
- Automatically generate migrations based on your models.
- Integrated publish-subscribe to pass messages to workers (RabbitMQ).
- Integrated Jade template rendering system and easy passing-around data from controllers to views.
- Hooks in controllers (?!).
- Auto loads controllers, models, etc.
- Promise-based (Q).

### Introduction

In your main file e.g. `index.js`:
```js
var fire = require('fire');
var app = fire();
app.run();
```

In ```controllers/``` your first controller called `hello.js`:
```js
function HelloController() {

}

HelloController.prototype.getIndex = function() {
	return {
		text: 'Hello, world.'
	};
}
```
In `views/hello/index.jade`:
```jade
doctype html
html(lang="en")
  head
    title Node on Fire Test
  body
    h1= text
```

Now start your first app by calling your main file e.g. `$ node index.js` and open http://127.0.0.1:3000/ in your browser.

### Routes

Node on Fire automatically builds the routes based on a naming convention. Let's take the following declaration as an example:

```js
HelloController.prototype.getIndex = function(hello, world) { ... }
```

```*Hello*Controller.prototype.getIndex = function(hello, world) { ... }```
*Hello* defines the folder where the view of this route is located.

```HelloController.prototype.*get*Index = function(hello, world) { ... }```
*get* indicates the HTTP verb the route matches to. Can be any value really. It's matching the first lower-case part of a method.

```HelloController.prototype.get*Index* = function(hello, world) { ... }```
*Index* is the view name of this route. It will retrieve the view from view folder. The extension is ignored.

```HelloController.prototype.getIndex = function(*hello, world*) { ... }```
*hello, world* declare the path of the route. In this case it's /hello/world.

See also `examples/hello-world` for a short intro on routes.

### Views

As described in Routes, a view path is defined based on a controller's method, and the return value of a controller's method is passed to the view.

In `examples/hello-world` you will find the below method in the only controller:
```js
Example.prototype.getTest = function() {
	return {
		title: 'Hello, world!',
		user: {
			id: 1,
			name: 'Martijn',
			email: 'a@b.c'
		}
	};
};
```

The return value gets passed to the view and gets rendered. Jade is configured by default.
```
doctype html
html(lang="en")
head
	title= title
body
h1
	| Hello,
	= user.name
p.
	This is Node on Fire's first example.
```

### Models

#### Introduction

In Node on Fire ... models ... migrations.

Generate migrations. Optional. Can auto-create migrations & execute when your app starts. Generally not a good idea: fine for rapid prototyping but not when launching your product.

Place models in models directory. Migrations in migrations folder.

#### Definition
The below defines a basic User model:
```js
function User(models) {
	this.name 		= [this.String];
	this.password 	= [this.String];
	this.email 		= [this.String];
}
```
This user model contains three properties each of type String: name, password and email. Every property can have multiple types. It is up to you to add sane property types e.g. Node on Fire will not throw an error if you add a Text and an Integer type.

Each property often represents a column. The expection is a many-to-one reference, see `Many` below.

See below the list of all property types.

- String: Set the property's data type in the table definition to TEXT.
- Text: Synonym of String.
- Number: Set the property's data type in the table definition to INTEGER.
- Integer: Set the property's data type in the table definition to INTEGER.
- Date: Set the property's data type in the table definition to DATE.
- DateTime: Synonym of Timestamp.
- Timestamp: Set the property's data type in the table definition to TIMESTAMP WITHOUT TIME ZONE.
- Time: Set the property's data type in the table definition to TIME WITH TIME ZONE.
- Interval: Set the property's data type in the table definition to INTERVAL.
- Unsigned: Add UNSIGNED to to property's data type in the table definition.
- Serial: Set the property's data type in the table definition to SERIAL.
- PrimaryKey: Add PRIMARY KEY to the property's data type in the table definition.
- Unique: Add UNIQUE to the property's data type in the table definition.
- Required: Add NOT NULL to the property's data type in the table definition. In addition, if this is part of a relation (e.g. `Reference` or `Many`), under-the-hood Node on Fire will use an `INNER JOIN` when automatically fetching this relation.
- Id: Set the property's data type in the table definition to SERIAL PRIMARY KEY. Generally, this shouldn't be set manually, as Node on Fire automatically adds an id property to every model with only this property type.
- Reference(model): Set the property's data type in the table definition to INTEGER REFERENCES model(id). In addition, this creates an accessor method so you can easily retrieve references. For example, the below illustrates how to define a Pet model with a Person reference:

TODO: align Reference and Many naming styles: should be e.g. this.One and this.Many.
TODO: why is `models` an argument in the constructor, and why can't we simply to this.models?

```js
function Person(models) {
	this.name = [this.String];
}

function Pet(models) {
	this.name = [this.String];
	this.person = [this.Reference(models.Person)];
}
```

```js
return this.models.Pet.findOne({name:'Cat'})
	.then(function(pet) {
		// pet.getPerson()
	});
```
- Many(model): create a many-to-one association. This does not create a column. This actually creates a new property on `model`. For example, imagine you have a person with multiple pets, you can do the following:

```js
function Pet(models) {
	this.name = [this.String];
}

function Person(models) {
	this.name = [this.String];
	this.pets = [this.Many(models.Pet)];
}
```

This creates a reference on pet to person, just like you would write the below:

```js
function Pet(models) {
	this.name = [this.String];
	this.person = [this.Reference(models.Person)];
}
```

The advantage is that, next to it being a bit more straight forward, when using the `Many(model)` method you are creating accessors on the model so you can do the below:

```js
return this.models.Person.findOne({name:'Martijn'})
	.then(function(user) {
		return user.getPets();
	})
	.then(function(pets) {
		// pets contains an array of Pet model instances belonging to Martijn
	});
```
- AutoFetch: Automatically fetches the relation when retrieving a model. This means the relationship will get joined when fetched.

This changes the way you access the relationship from calling a get-accessor to being able to directly work on an property (Reference) or array (Many). Imagine a person having multiple pets (with auto fetch enabled):

```js
function Pet(models) {
	this.name = [this.String];
}

function Person(models) {
	this.name = [this.String];
	this.pets = [this.Many(models.Pet), this.AutoFetch];
}
```

You can access a person's pets like the below:
```js
return this.models.Person.findOne({name:'Martijn'})
	.then(function(person) {
		// person.pets contains all pets of Martijn
	})
```
- Default(value): Set the default value in the column definition to `value`. Alternatively, you can manually set default values by implement a `beforeCreate` hook in your model. Check Model: hooks for more info on that.

The focus when designing the API was to reduce boilerplate code to a bare minimum.

#### Migrations
To actual .. datastore .. generate database .. optional. Auto-migrate or migrations. Generate . Models could be optional, by design, chosen not to make them optional.

-> define model
```js
function User(models) {
	this.name = [this.String];
	this.password = [this.String];
}
```

```js
function CreateUserMigration() {}
CreateUserMigration.prototype.up = function() {
	this.models.createModel('User', {
		name: [this.String],
		password: [this.String]
	});
};

CreateUserMigration.prototype.up = function() {
	this.models.destroyModel('User');
};
```
TODO: create test to check what happens if two of the same migration numbers.




-> create migration
-> explain references (many)
-> execution order (and method swizzling?)
-> auto create migrations
-> auto migrate
