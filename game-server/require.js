const path = require("path");

// Suporta .env local (PM2 já carrega via node_args, mas dev também funciona)
try { require("dotenv/config"); } catch (_) { /* opcional */ }

global.CONFIG = require("./config.json");

// Create some useful global functions
global.getDataFile = function() {
  return path.join(__dirname, "data", CONFIG.SERVER.CLIENT_VERSION, ...arguments);
}

global.requireData = function() {
  return require(getDataFile(...arguments))
}

global.requireModule = function() {
  // Aponta para engine-src/ (o antigo src/ do repo original)
  return require(path.join(__dirname, "engine-src", ...arguments));
}

// Requires the prototype modifications
requireModule("__proto__");

// Load constants — busca em vendor-client-reference (só código, sem .dat/.spr)
global.CONST = require("./" + path.join("vendor-client-reference", "data", CONFIG.SERVER.CLIENT_VERSION, "constants.json"))

// Check the NodeJS version
let [ major, minor, patch ] = process.versions.node.split(".");

if(major < 16) {
  console.log("Could not launch gameserver: required version > 16.0.0 and current version: %s.".format(process.versions.node));
  return process.exit(1);
}
