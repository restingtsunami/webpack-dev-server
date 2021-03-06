'use strict';

/* eslint-disable
  no-undefined
*/
const webpack = require('webpack');
const Server = require('../lib/Server');

let server;

module.exports = {
  // start server, returning the full setup of the server
  // (both the server and the compiler)
  startFullSetup(config, options, done) {
    if (options.quiet === undefined) {
      options.quiet = true;
    }
    // originally, inline was not working by default for tests with the API
    // if you need to test inline, it should be set explicitly,
    // rather than expecting it to be defaulted to
    // (the only test that relied on inline before this point was Client.test.js)
    if (
      options.inline === undefined &&
      options.hot === undefined &&
      options.hotOnly === undefined
    ) {
      options.inline = false;
    }
    // defaulting to this will hopefully help with problems on OSX in tests
    if (options.watchOptions === undefined) {
      options.watchOptions = {
        poll: true,
      };
    }
    const compiler = webpack(config);
    server = new Server(compiler, options);

    const port = options.port || 8080;
    const host = options.host || 'localhost';
    server.listen(port, host, (err) => {
      if (err) return done(err);
      done();
    });

    return {
      server,
      compiler,
    };
  },
  startAwaitingCompilationFullSetup(config, options, done) {
    let readyCount = 0;
    const ready = () => {
      readyCount += 1;
      if (readyCount === 2) {
        done();
      }
    };

    const fullSetup = this.startFullSetup(config, options, ready);
    // wait for compilation, since dev server can start before this
    // https://github.com/webpack/webpack-dev-server/issues/847
    fullSetup.compiler.hooks.done.tap('done', ready);
    return fullSetup;
  },
  startAwaitingCompilation(config, options, done) {
    return this.startAwaitingCompilationFullSetup(config, options, done).server;
  },
  start(config, options, done) {
    // I suspect that almost all tests need to wait for compilation to
    // finish, because not doing so leaves open handles for jest,
    // in the case where a compilation didn't finish before destroying
    // the server and moving on. Thus, the default "start" should wait
    // for compilation, and only special cases where you don't expect
    // a compilation happen should use startBeforeCompilation
    return this.startAwaitingCompilation(config, options, done);
  },
  startBeforeCompilation(config, options, done) {
    return this.startFullSetup(config, options, done).server;
  },
  close(done) {
    if (server) {
      server.close(() => {
        server = null;
        done();
      });
    } else {
      done();
    }
  },
};
