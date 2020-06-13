/**
* The `Matter` module is the top level namespace. It also includes a function for installing plugins on top of the library.
*
* @class Matter
*/

// Will need to investigate if any of the plugins offer useful functionality that could be bought back into the codebase
//
// Also need to move away from Node/Commonjs exports/require to ES import/export form of module
// + I don't care about running the physics library on the backend, only in the browser
// + toolchain bundlers can look after the fallout, if needed
//
// I don't like the way objects get stood up - prefer something along the lines of Scrawl's prototypes, mixins and factories for generating objects (but then I would, wouldn't I)
// 
// At some point I want to isolate the various sub-systems from each other, to make the system more pluggable-with-apis kinda thing:
// + world/engine/composite/body - to represent the world and its objects and do all the physics force/constraints calculations and updates (may split this into two, to make the physics engine even more bare-bones?)
// + collision detection and reconciliation - the current approach works very well, but there's alernatives I want to experiment with eg canvas engine isPointInPath/isPointInStroke detection
// + animator - to issue the update ticks to the worlds/engines
// + render engine - to make the world visible in a canvas (or whatever) - keen that this should be as decoupled as possible from the other systems so that anyone can write a render engine to display their worlds in different ways to meet different purposes ... eg the inbuilt render engine is good for demoing physics principles and education, but possibly too intransigent for a game engine (or, indeed, Scrawl-canvas)
// + reports and metrics logging system, possibly tied in with an events emitter system? Make this very optional!

const Matter = {};

module.exports = Matter;

const Plugin = require('./Plugin');
const Common = require('./Common');

(function() {

    /**
     * The library name.
     * @property name
     * @readOnly
     * @type {String}
     */
    Matter.name = 'matter-js';

    /**
     * The library version.
     * @property version
     * @readOnly
     * @type {String}
     */
    Matter.version = typeof __MATTER_VERSION__ !== 'undefined' ? __MATTER_VERSION__ : '*';

    /**
     * A list of plugin dependencies to be installed. These are normally set and installed through `Matter.use`.
     * Alternatively you may set `Matter.uses` manually and install them by calling `Plugin.use(Matter)`.
     * @property uses
     * @type {Array}
     */
    Matter.uses = [];

    /**
     * The plugins that have been installed through `Matter.Plugin.install`. Read only.
     * @property used
     * @readOnly
     * @type {Array}
     */
    Matter.used = [];

    /**
     * Installs the given plugins on the `Matter` namespace.
     * This is a short-hand for `Plugin.use`, see it for more information.
     * Call this function once at the start of your code, with all of the plugins you wish to install as arguments.
     * Avoid calling this function multiple times unless you intend to manually control installation order.
     * @method use
     * @param ...plugin {Function} The plugin(s) to install on `base` (multi-argument).
     */
    Matter.use = () => {

        // check to see if this function is ever used ...
        console.log('Matter.use')

        Plugin.use(Matter, Array.prototype.slice.call(arguments));
    };

    /**
     * Chains a function to excute before the original function on the given `path` relative to `Matter`.
     * See also docs for `Common.chain`.
     * @method before
     * @param {string} path The path relative to `Matter`
     * @param {function} func The function to chain before the original
     * @return {function} The chained function that replaced the original
     */
    Matter.before = (path, func) => {

        // check to see if this function is ever used ...
        console.log('Matter.before')

        path = path.replace(/^Matter./, '');
        return Common.chainPathBefore(Matter, path, func);
    };

    /**
     * Chains a function to excute after the original function on the given `path` relative to `Matter`.
     * See also docs for `Common.chain`.
     * @method after
     * @param {string} path The path relative to `Matter`
     * @param {function} func The function to chain after the original
     * @return {function} The chained function that replaced the original
     */
    Matter.after = (path, func) => {

        // check to see if this function is ever used ...
        console.log('Matter.after')

        path = path.replace(/^Matter./, '');
        return Common.chainPathAfter(Matter, path, func);
    };

})();
