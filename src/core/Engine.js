/**
* The `Matter.Engine` module contains methods for creating and manipulating engines.
* An engine is a controller that manages updating the simulation of the world.
* See `Matter.Runner` for an optional game loop utility.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Engine
*/

var Engine = {};

module.exports = Engine;

var World = require('../body/World');
var Sleeping = require('./Sleeping');
var Resolver = require('../collision/Resolver');
var Render = require('../render/Render');
var Pairs = require('../collision/Pairs');
var Metrics = require('./Metrics');
var Grid = require('../collision/Grid');
var Events = require('./Events');
var Composite = require('../body/Composite');
var Constraint = require('../constraint/Constraint');
var Common = require('./Common');
var Body = require('../body/Body');

(function() {

    /**
     * Creates a new engine. The options parameter is an object that specifies any properties you wish to override the defaults.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {object} [options]
     * @return {engine} engine
     */
    Engine.create = (element, options) => {
        
        // options may be passed as the first (and only) argument
        options = Common.isElement(element) ? options : element;
        element = Common.isElement(element) ? element : null;
        options = options || {};

        if (element || options.render) {
            Common.warn('Engine.create: engine.render is deprecated (see docs)');
        }

        let defaults = {
            positionIterations: 6,
            velocityIterations: 4,
            constraintIterations: 2,
            enableSleeping: false,
            events: [],
            plugin: {},
            timing: {
                timestamp: 0,
                timeScale: 1
            },
            broadphase: {
                controller: Grid
            }
        };

        let engine = Common.extend(defaults, options);

        // @deprecated
        if (element || engine.render) {

            console.log('deprecated engine.render invoked #1')
            let renderDefaults = {
                element: element,
                controller: Render
            };
            engine.render = Common.extend(renderDefaults, engine.render);
        }

        // @deprecated
        if (engine.render && engine.render.controller) {

            console.log('deprecated engine.render invoked #2')
            engine.render = engine.render.controller.create(engine.render);
        }

        // @deprecated
        if (engine.render) {

            console.log('deprecated engine.render invoked #3')
            engine.render.engine = engine;
        }

        engine.world = options.world || World.create(engine.world);
        engine.pairs = Pairs.create();
        engine.broadphase = engine.broadphase.controller.create(engine.broadphase);
        engine.metrics = engine.metrics || { extended: false };

        // @if DEBUG
        engine.metrics = Metrics.create(engine.metrics);
        // @endif

        return engine;
    };


    /**
     * Moves the simulation forward in time by `delta` ms.
     * The `correction` argument is an optional `Number` that specifies the time correction factor to apply to the update.
     * This can help improve the accuracy of the simulation in cases where `delta` is changing between updates.
     * The value of `correction` is defined as `delta / lastDelta`, i.e. the percentage change of `delta` over the last step.
     * Therefore the value is always `1` (no correction) when `delta` constant (or when no correction is desired, which is the default).
     * See the paper on <a href="http://lonesock.net/article/verlet.html">Time Corrected Verlet</a> for more information.
     *
     * Triggers `beforeUpdate` and `afterUpdate` events.
     * Triggers `collisionStart`, `collisionActive` and `collisionEnd` events.
     * @method update
     * @param {engine} engine
     * @param {number} [delta=16.666]
     * @param {number} [correction=1]
     */
    Engine.update = (engine, delta = 16.666666667, correction = 1) => {

        let {world, timing, broadphase, enableSleeping, constraintIterations, velocityIterations, positionIterations} = engine;
        let {timeScale} = timing;
        let {gravity, bounds: worldBounds, isModified: worldIsModified} = world;
        let {controller} = broadphase;

        let broadphasePairs = [],
            i;

        // increment timestamp
        timing.timestamp += delta * timeScale;

        // create an event object
        // + commenting out to see if the system works without event emissions
        // + OUCH! The mouse functionality seems to rely on events
        // + not an ideal solution as this brings UI (and render engine) functionality right into the heart/soul of the physics engine - coupling cannot get any tighter!
        var event = {
            timestamp: timing.timestamp
        };
        // + Mouse functionality relies on this event
        Events.trigger(engine, 'beforeUpdate', event);

        // get lists of all bodies and constraints, no matter what composites they are in
        let allBodies = Composite.allBodies(world),
            allConstraints = Composite.allConstraints(world);

        // @if DEBUG
        // reset metrics logging
        // + commenting out to see if the system works without metrics reset
        // Metrics.reset(engine.metrics);
        // @endif

        // if sleeping enabled, call the sleeping controller
        if (enableSleeping) Sleeping.update(allBodies, timeScale);

        // applies gravity to all bodies
        Engine._bodiesApplyGravity(allBodies, gravity);

        // update all body position and rotation by integration
        Engine._bodiesUpdate(allBodies, delta, timeScale, correction, worldBounds);

        // update all constraints (first pass)
        Constraint.preSolveAll(allBodies);

        for (i = 0; i < constraintIterations; i++) {

            Constraint.solveAll(allConstraints, timeScale);
        }
        Constraint.postSolveAll(allBodies);

        // broadphase pass: find potential collision pairs
        if (controller) {

            // if world is dirty, we must flush the whole grid
            if (worldIsModified) controller.clear(broadphase);

            // update the grid buckets based on current bodies
            controller.update(broadphase, allBodies, engine, worldIsModified);
            broadphasePairs = broadphase.pairsList;
        } 
        // if no broadphase set, we just pass all bodies
        else broadphasePairs = allBodies;

        // clear all composite modified flags
        if (worldIsModified) Composite.setModified(world, false, false, true);

        // narrowphase pass: find actual collisions, then create or update collision pairs
        let collisions = broadphase.detector(broadphasePairs, engine);

        // update collision pairs
        let pairs = engine.pairs,
            timestamp = timing.timestamp;

        Pairs.update(pairs, collisions, timestamp);
        Pairs.removeOld(pairs, timestamp);

        // wake up bodies involved in collisions
        if (enableSleeping) Sleeping.afterCollisions(pairs.list, timeScale);

        // trigger collision events
        // + commenting out to see if the system works without event emissions
        // + Mouse functionality works without this event
        // if (pairs.collisionStart.length > 0)
        //     Events.trigger(engine, 'collisionStart', { pairs: pairs.collisionStart });

        // iteratively resolve position between collisions
        Resolver.preSolvePosition(pairs.list);

        for (i = 0; i < positionIterations; i++) {

            Resolver.solvePosition(pairs.list, timeScale);
        }
        Resolver.postSolvePosition(allBodies);

        // update all constraints (second pass)
        Constraint.preSolveAll(allBodies);

        for (i = 0; i < constraintIterations; i++) {

            Constraint.solveAll(allConstraints, timeScale);
        }
        Constraint.postSolveAll(allBodies);

        // iteratively resolve velocity between collisions
        Resolver.preSolveVelocity(pairs.list);

        for (i = 0; i < velocityIterations; i++) {

            Resolver.solveVelocity(pairs.list, timeScale);
        }

        // trigger collision events
        // + commenting out to see if the system works without event emissions
        // + Mouse functionality works without these events
        // if (pairs.collisionActive.length > 0)
        //     Events.trigger(engine, 'collisionActive', { pairs: pairs.collisionActive });

        // if (pairs.collisionEnd.length > 0)
        //     Events.trigger(engine, 'collisionEnd', { pairs: pairs.collisionEnd });

        // @if DEBUG
        // update metrics log
        // + commenting out to see if the system works without metrics reset
        // Metrics.update(engine.metrics, engine);
        // @endif

        // clear force buffers
        Engine._bodiesClearForces(allBodies);

        // + commenting out to see if the system works without event emissions
        // + Mouse functionality works without this event
        // Events.trigger(engine, 'afterUpdate', event);

        return engine;
    };
    
    /**
     * Merges two engines by keeping the configuration of `engineA` but replacing the world with the one from `engineB`.
     * @method merge
     * @param {engine} engineA
     * @param {engine} engineB
     */
    Engine.merge = (engineA, engineB) => {

        // check to see if this function is ever used ...
        console.log('Engine.merge')

        Common.extend(engineA, engineB);
        
        if (engineB.world) {

            engineA.world = engineB.world;

            Engine.clear(engineA);

            let bodies = Composite.allBodies(engineA.world);

            bodies.forEach(body => {

                Sleeping.set(body, false);
                body.id = Common.nextId();
            });
        }
    };

    /**
     * Clears the engine including the world, pairs and broadphase.
     * @method clear
     * @param {engine} engine
     */
    Engine.clear = (engine) => {

        // check to see if this function is ever used ...
        console.log('Engine.clear')

        let {world, broadphase, pairs} = engine;
        
        Pairs.clear(pairs);

        if (broadphase.controller) {

            let bodies = Composite.allBodies(world);

            broadphase.controller.clear(broadphase);
            broadphase.controller.update(broadphase, bodies, engine, true);
        }
    };

    /**
     * Zeroes the `body.force` and `body.torque` force buffers.
     * @method _bodiesClearForces
     * @private
     * @param {body[]} bodies
     */
    Engine._bodiesClearForces = (bodies) => {

        // check to see if this function is ever used ...
        // console.log('Engine._bodiesClearForces')

        bodies.forEach(body => {

            body.force.x = 0;
            body.force.y = 0;
            body.torque = 0;
        });
    };

    /**
     * Applys a mass dependant force to all given bodies.
     * @method _bodiesApplyGravity
     * @private
     * @param {body[]} bodies
     * @param {vector} gravity
     */
    Engine._bodiesApplyGravity = (bodies, gravity) => {

        // check to see if this function is ever used ...
        // console.log('Engine._bodiesApplyGravity')

        let {x: gravityX, y: gravityY, scale} = gravity;

        let gravityScale = typeof scale !== 'undefined' ? scale : 0.001;

        if ((gravityX === 0 && gravityY === 0) || gravityScale === 0) return;
        
        bodies.forEach(body => {

            let {force, isStatic, isSleeping, mass} = body;

            if (!isStatic && !isSleeping) {

                force.x += mass * gravityX * gravityScale;
                force.y += mass * gravityY * gravityScale;
            }
        });
    };

    /**
     * Applys `Body.update` to all given `bodies`.
     * @method _bodiesUpdate
     * @private
     * @param {body[]} bodies
     * @param {number} deltaTime 
     * The amount of time elapsed between updates
     * @param {number} timeScale
     * @param {number} correction 
     * The Verlet correction factor (deltaTime / lastDeltaTime)
     * @param {bounds} worldBounds
     */
    Engine._bodiesUpdate = (bodies, deltaTime, timeScale, correction, worldBounds) => {

        // check to see if this function is ever used ...
        // console.log('Engine._bodiesUpdate')

        bodies.forEach(body => {

            let {isStatic, isSleeping} = body;

            if (!isStatic && !isSleeping) Body.update(body, deltaTime, timeScale, correction);
        });
    };

    /**
     * An alias for `Runner.run`, see `Matter.Runner` for more information.
     * @method run
     * @param {engine} engine
     */

    /**
    * Fired just before an update
    *
    * @event beforeUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update and all collision events
    *
    * @event afterUpdate
    * @param {} event An event object
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have started to collide in the current tick (if any)
    *
    * @event collisionStart
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that are colliding in the current tick (if any)
    *
    * @event collisionActive
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired after engine update, provides a list of all pairs that have ended collision in the current tick (if any)
    *
    * @event collisionEnd
    * @param {} event An event object
    * @param {} event.pairs List of affected pairs
    * @param {number} event.timestamp The engine.timing.timestamp of the event
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` that specifies the number of position iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property positionIterations
     * @type number
     * @default 6
     */

    /**
     * An integer `Number` that specifies the number of velocity iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     *
     * @property velocityIterations
     * @type number
     * @default 4
     */

    /**
     * An integer `Number` that specifies the number of constraint iterations to perform each update.
     * The higher the value, the higher quality the simulation will be at the expense of performance.
     * The default value of `2` is usually very adequate.
     *
     * @property constraintIterations
     * @type number
     * @default 2
     */

    /**
     * A flag that specifies whether the engine should allow sleeping via the `Matter.Sleeping` module.
     * Sleeping can improve stability and performance, but often at the expense of accuracy.
     *
     * @property enableSleeping
     * @type boolean
     * @default false
     */

    /**
     * An `Object` containing properties regarding the timing systems of the engine. 
     *
     * @property timing
     * @type object
     */

    /**
     * A `Number` that specifies the global scaling factor of time for all bodies.
     * A value of `0` freezes the simulation.
     * A value of `0.1` gives a slow-motion effect.
     * A value of `1.2` gives a speed-up effect.
     *
     * @property timing.timeScale
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the current simulation-time in milliseconds starting from `0`. 
     * It is incremented on every `Engine.update` by the given `delta` argument. 
     *
     * @property timing.timestamp
     * @type number
     * @default 0
     */

    /**
     * An instance of a `Render` controller. The default value is a `Matter.Render` instance created by `Engine.create`.
     * One may also develop a custom renderer module based on `Matter.Render` and pass an instance of it to `Engine.create` via `options.render`.
     *
     * A minimal custom renderer object must define at least three functions: `create`, `clear` and `world` (see `Matter.Render`).
     * It is also possible to instead pass the _module_ reference via `options.render.controller` and `Engine.create` will instantiate one for you.
     *
     * @property render
     * @type render
     * @deprecated see Demo.js for an example of creating a renderer
     * @default a Matter.Render instance
     */

    /**
     * An instance of a broadphase controller. The default value is a `Matter.Grid` instance created by `Engine.create`.
     *
     * @property broadphase
     * @type grid
     * @default a Matter.Grid instance
     */

    /**
     * A `World` composite object that will contain all simulated bodies and constraints.
     *
     * @property world
     * @type world
     * @default a Matter.World instance
     */

    /**
     * An object reserved for storing plugin-specific properties.
     *
     * @property plugin
     * @type {}
     */

})();
