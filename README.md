# ARLAS Web Core

[![Build Status](https://travis-ci.org/gisaia/ARLAS-web-core.svg?branch=develop)](https://travis-ci.org/gisaia/ARLAS-web-core)
[![npm version](https://badge.fury.io/js/arlas-web-core.svg)](https://badge.fury.io/js/arlas-web-core)

`arlas-web-core ` is a typescript library that provides :
- A collaborative search service (`CSS`) that coordinates the [ARLAS-web-contributors](https://github.com/gisaia/ARLAS-web-contributors) collaborations.
- A configuration service that allows to read and parse a configuration file (that is used by the `CSS` & other services in [ARLAS-wui-toolkit](https://github.com/gisaia/ARLAS-wui-toolkit)).

## Install

To install this library in your npm web application, add the dependency in your `package.json` file.

```shell
$ npm install --save arlas-web-core
```

## Documentation

Please find the documentation [here](https://docs.arlas.io/classes/CollaborativesearchService/).

## Build

To build the project you need to have installed
- [Node](https://nodejs.org/en/) version >= 16.3.0 
- [npm](https://github.com/npm/npm) version >= 8.3.0

Then, clone the project

```shell
$ git clone https://github.com/gisaia/ARLAS-web-core
```

Move to the folder

```shell
$ cd ARLAS-web-core
```

Install all the project's dependencies

```shell
$ npm install
```

Build the project with `tsc` :

```shell
$ npm run build-release
```

The build artifacts will be generated in the `dist/` directory. 

## Contributing

Please read [CONTRIBUTING.md](https://github.com/gisaia/ARLAS-web-core/blob/master/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning : `x.y.z`.

- `x` : Incremented as soon as the `ARLAS-server API` changes
- `y` : Incremented as soon as a new feature is implemented.
- `z` : Incremented as soon as the `ARLAS-web-core` implementation receives a fix or an enhancement.


 For the versions available, check the [ARLAS-web-core releases](https://github.com/gisaia/ARLAS-web-core/releases). 

## Authors

* **Gisaïa** - *Initial work* - [Gisaïa](http://gisaia.com/)

See also the list of [contributors](https://github.com/gisaia/ARLAS-web-core/graphs/contributors) who participated in this project.


## License

This project is licensed under the Apache License 2.0 - see the [LICENSE.txt](LICENSE.txt) file for details
