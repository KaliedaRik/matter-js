/**
* The `Matter.Composite` module contains methods for creating and manipulating composite bodies.
* A composite body is a collection of `Matter.Body`, `Matter.Constraint` and other `Matter.Composite`, therefore composites form a tree structure.
* It is important to use the functions in this module to modify composites, rather than directly modifying their properties.
* Note that the `Matter.World` object is also a type of `Matter.Composite` and as such all composite methods here can also operate on a `Matter.World`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Composite
*/

const Composite = {};

module.exports = Composite;

const Events = require('../core/Events');
const Common = require('../core/Common');
const Bounds = require('../geometry/Bounds');
const Body = require('./Body');

(function() {

    /**
     * Creates a new composite. The options parameter is an object that specifies any properties you wish to override the defaults.
     * See the properites section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} [options]
     * @return {composite} A new composite
     */
    Composite.create = (options) => {

        return Common.extend({ 
            id: Common.nextId(),
            type: 'composite',
            parent: null,
            isModified: false,
            bodies: [], 
            constraints: [], 
            composites: [],
            label: 'Composite',
            plugin: {}
        }, options);
    };

    /**
     * Sets the composite's `isModified` flag. 
     * If `updateParents` is true, all parents will be set (default: false).
     * If `updateChildren` is true, all children will be set (default: false).
     * @method setModified
     * @param {composite} composite
     * @param {boolean} isModified
     * @param {boolean} [updateParents=false]
     * @param {boolean} [updateChildren=false]
     */
    Composite.setModified = (composite, isModified, updateParents, updateChildren) => {

        // console.log('Composite.setModified')

        composite.isModified = isModified;

        if (updateParents && composite.parent) {

            Composite.setModified(composite.parent, isModified, updateParents, updateChildren);
        }

        if (updateChildren) {

            composite.composites.forEach(childComposite => {

                Composite.setModified(childComposite, isModified, updateParents, updateChildren);
            });
        }
    };

    /**
     * Generic add function. Adds one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Triggers `beforeAdd` and `afterAdd` events on the `composite`.
     * @method add
     * @param {composite} composite
     * @param {} object
     * @return {composite} The original composite with the objects added
     */
    Composite.add = (composite, object) => {

        // console.log('Composite.add')

        let objects = [].concat(object);

        Events.trigger(composite, 'beforeAdd', { object: object });

        objects.forEach(obj => {

            switch (obj.type) {

                case 'body':
                    // skip adding compound parts
                    if (obj.parent !== obj) {
                        Common.warn('Composite.add: skipped adding a compound body part (you must add its parent instead)');
                        break;
                    }

                    Composite.addBody(composite, obj);
                    break;

                case 'constraint':
                    Composite.addConstraint(composite, obj);
                    break;

                case 'composite':
                    Composite.addComposite(composite, obj);
                    break;

                case 'mouseConstraint':
                    Composite.addConstraint(composite, obj.constraint);
                    break;
            }
        });

        Events.trigger(composite, 'afterAdd', { object: object });

        return composite;
    };

    /**
     * Generic remove function. Removes one or many body(s), constraint(s) or a composite(s) to the given composite.
     * Optionally searching its children recursively.
     * Triggers `beforeRemove` and `afterRemove` events on the `composite`.
     * @method remove
     * @param {composite} composite
     * @param {} object
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the objects removed
     */
    Composite.remove = (composite, object, deep) => {

        // check to see if this function is ever used ...
        console.log('Composite.remove')

        let objects = [].concat(object);

        Events.trigger(composite, 'beforeRemove', { object: object });

        objects.forEach(obj => {

            switch (obj.type) {

                case 'body':
                    Composite.removeBody(composite, obj, deep);
                    break;

                case 'constraint':
                    Composite.removeConstraint(composite, obj, deep);
                    break;

                case 'composite':
                    Composite.removeComposite(composite, obj, deep);
                    break;

                case 'mouseConstraint':
                    Composite.removeConstraint(composite, obj.constraint);
                    break;

            }
        });

        Events.trigger(composite, 'afterRemove', { object: object });

        return composite;
    };

    /**
     * Adds a composite to the given composite.
     * @private
     * @method addComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @return {composite} The original compositeA with the objects from compositeB added
     */
    Composite.addComposite = (compositeA, compositeB) => {

        // check to see if this function is ever used ...
        // console.log('Composite.addComposite')

        compositeA.composites.push(compositeB);
        compositeB.parent = compositeA;

        Composite.setModified(compositeA, true, true, false);
        
        return compositeA;
    };

    /**
     * Removes a composite from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeComposite
     * @param {composite} compositeA
     * @param {composite} compositeB
     * @param {boolean} [deep=false]
     * @return {composite} The original compositeA with the composite removed
     */
    Composite.removeComposite = (compositeA, compositeB, deep) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeComposite')

        let position = Common.indexOf(compositeA.composites, compositeB);

        if (position !== -1) {

            Composite.removeCompositeAt(compositeA, position);
            Composite.setModified(compositeA, true, true, false);
        }

        if (deep) {

            compositeA.composites.forEach(subComposite => {

                Composite.removeComposite(subComposite, compositeB, true);
            });
        }

        return compositeA;
    };

    /**
     * Removes a composite from the given composite.
     * @private
     * @method removeCompositeAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the composite removed
     */
    // Composite.removeCompositeAt = function(composite, position) {
    //     composite.composites.splice(position, 1);
    //     Composite.setModified(composite, true, true, false);
    //     return composite;
    // };
    Composite.removeCompositeAt = (composite, position) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeCompositeAt')

        composite.composites.splice(position, 1);

        Composite.setModified(composite, true, true, false);

        return composite;
    };


    /**
     * Adds a body to the given composite.
     * @private
     * @method addBody
     * @param {composite} composite
     * @param {body} body
     * @return {composite} The original composite with the body added
     */
    Composite.addBody = (composite, body) => {

        // check to see if this function is ever used ...
        // console.log('Composite.addBody')

        composite.bodies.push(body);
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Removes a body from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeBody
     * @param {composite} composite
     * @param {body} body
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBody = (composite, body, deep) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeBody')

        let position = Common.indexOf(composite.bodies, body);

        if (position !== -1) {

            Composite.removeBodyAt(composite, position);
            Composite.setModified(composite, true, true, false);
        }

        if (deep) {

            composite.composites.forEach(subComposite => {

                Composite.removeBody(subComposite, body, true);
            })
        }
        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeBodyAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the body removed
     */
    Composite.removeBodyAt = (composite, position) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeBodyAt')

        composite.bodies.splice(position, 1);
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Adds a constraint to the given composite.
     * @private
     * @method addConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @return {composite} The original composite with the constraint added
     */
    Composite.addConstraint = (composite, constraint) => {

        // check to see if this function is ever used ...
        // console.log('Composite.addConstraint')

        composite.constraints.push(constraint);
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Removes a constraint from the given composite, and optionally searching its children recursively.
     * @private
     * @method removeConstraint
     * @param {composite} composite
     * @param {constraint} constraint
     * @param {boolean} [deep=false]
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraint = (composite, constraint, deep) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeConstraint')

        let position = Common.indexOf(composite.constraints, constraint);

        if (position !== -1) Composite.removeConstraintAt(composite, position);

        if (deep) {

            composite.composites.forEach(subComposite => {

                Composite.removeConstraint(subComposite, constraint, true);
            });
        }
        return composite;
    };

    /**
     * Removes a body from the given composite.
     * @private
     * @method removeConstraintAt
     * @param {composite} composite
     * @param {number} position
     * @return {composite} The original composite with the constraint removed
     */
    Composite.removeConstraintAt = (composite, position) => {

        // check to see if this function is ever used ...
        console.log('Composite.removeConstraintAt')

        composite.constraints.splice(position, 1);
        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Removes all bodies, constraints and composites from the given composite.
     * Optionally clearing its children recursively.
     * @method clear
     * @param {composite} composite
     * @param {boolean} keepStatic
     * @param {boolean} [deep=false]
     */
    Composite.clear = (composite, keepStatic, deep) => {

        // check to see if this function is ever used ...
        console.log('Composite.clear')

        if (deep) {

            composite.composites.forEach(subComposite => {

                Composite.clear(subComposite, keepStatic, true);
            });
        }
        
        if (keepStatic) composite.bodies = composite.bodies.filter(body => body.isStatic);
        else composite.bodies.length = 0;

        composite.constraints.length = 0;
        composite.composites.length = 0;

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Returns all bodies in the given composite, including all bodies in its children, recursively.
     * @method allBodies
     * @param {composite} composite
     * @return {body[]} All the bodies
     */
    Composite.allBodies = (composite) => {

        // check to see if this function is ever used ...
        // console.log('Composite.allBodies')

        let bodies = [].concat(composite.bodies);

        composite.composites.forEach(subComposite => {

            bodies = bodies.concat(Composite.allBodies(subComposite));
        });
        return bodies;
    };

    /**
     * Returns all constraints in the given composite, including all constraints in its children, recursively.
     * @method allConstraints
     * @param {composite} composite
     * @return {constraint[]} All the constraints
     */
    Composite.allConstraints = (composite) => {

        // check to see if this function is ever used ...
        // console.log('Composite.allConstraints')

        let constraints = [].concat(composite.constraints);

        composite.composites.forEach(subComposite => {

            constraints = constraints.concat(Composite.allConstraints(subComposite));
        });
        return constraints;
    };

    /**
     * Returns all composites in the given composite, including all composites in its children, recursively.
     * @method allComposites
     * @param {composite} composite
     * @return {composite[]} All the composites
     */
    Composite.allComposites = (composite) => {

        // check to see if this function is ever used ...
        // console.log('Composite.allComposites')

        let composites = [].concat(composite.composites);

        composite.composites.forEach(subComposite => {

            composites = composites.concat(Composite.allComposites(subComposite));
        });
        return composites;
    };

    /**
     * Searches the composite recursively for an object matching the type and id supplied, null if not found.
     * @method get
     * @param {composite} composite
     * @param {number} id
     * @param {string} type
     * @return {object} The requested object, if found
     */
    Composite.get = (composite, id, type) => {

        // check to see if this function is ever used ...
        console.log('Composite.get')

        let objects,
            object;

        switch (type) {

            case 'body':
                objects = Composite.allBodies(composite);
                break;

            case 'constraint':
                objects = Composite.allConstraints(composite);
                break;

            case 'composite':
                objects = Composite.allComposites(composite).concat(composite);
                break;
        }

        if (!objects)
            return null;

        object = objects.filter(object => object.id.toString() === id.toString());

        return object.length === 0 ? null : object[0];
    };

    /**
     * Moves the given object(s) from compositeA to compositeB (equal to a remove followed by an add).
     * @method move
     * @param {compositeA} compositeA
     * @param {object[]} objects
     * @param {compositeB} compositeB
     * @return {composite} Returns compositeA
     */
    Composite.move = (compositeA, objects, compositeB) => {

        // check to see if this function is ever used ...
        console.log('Composite.move')

        Composite.remove(compositeA, objects);
        Composite.add(compositeB, objects);

        return compositeA;
    };

    /**
     * Assigns new ids for all objects in the composite, recursively.
     * @method rebase
     * @param {composite} composite
     * @return {composite} Returns composite
     */
    Composite.rebase = (composite) => {

        // check to see if this function is ever used ...
        console.log('Composite.rebase')

        let objects = Composite.allBodies(composite)
            .concat(Composite.allConstraints(composite))
            .concat(Composite.allComposites(composite));

        objects.forEach(obj => objects[i].id = Common.nextId());

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Translates all children in the composite by a given vector relative to their current positions, 
     * without imparting any velocity.
     * @method translate
     * @param {composite} composite
     * @param {vector} translation
     * @param {bool} [recursive=true]
     */
    Composite.translate = (composite, translation, recursive) => {

        // check to see if this function is ever used ...
        // console.log('Composite.translate')

        let bodies = (recursive) ? Composite.allBodies(composite) : composite.bodies;

        bodies.forEach(body => Body.translate(body, translation));

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Rotates all children in the composite by a given angle about the given point, without imparting any angular velocity.
     * @method rotate
     * @param {composite} composite
     * @param {number} rotation
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.rotate = (composite, rotation, point, recursive) => {

        // check to see if this function is ever used ...
        // console.log('Composite.rotate')

        let cos = Math.cos(rotation),
            sin = Math.sin(rotation),
            bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        let {x: px, y: py} = point;

        bodies.forEach(body => {

            let {x: bx, y: by} = body.position;

            let dx = bx - px,
                dy = by - py;

            Body.setPosition(body, {
                x: px + (dx * cos - dy * sin),
                y: py + (dx * sin + dy * cos)
            });

            Body.rotate(body, rotation);
        });

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Scales all children in the composite, including updating physical properties (mass, area, axes, inertia), from a world-space point.
     * @method scale
     * @param {composite} composite
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     * @param {bool} [recursive=true]
     */
    Composite.scale = (composite, scaleX, scaleY, point, recursive) => {

        // check to see if this function is ever used ...
        // console.log('Composite.scale')

        let bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        let {x: px, y: py} = point;

        bodies.forEach(body => {

            let {x: bx, y: by} = body.position;

            let dx = bx - px,
                dy = by - py;

            Body.setPosition(body, {
                x: px + dx * scaleX,
                y: py + dy * scaleY
            });

            Body.scale(body, scaleX, scaleY);
        });

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    /**
     * Returns the union of the bounds of all of the composite's bodies.
     * @method bounds
     * @param {composite} composite The composite.
     * @returns {bounds} The composite bounds.
     */
    Composite.bounds = (composite) => {

        // check to see if this function is ever used ...
        console.log('Composite.bounds')

        let bodies = Composite.allBodies(composite),
            vertices = [];

        bodies.forEach(body => vertices.push(body.bounds.min, body.bounds.max));

        return Bounds.create(vertices);
    };

    /*
    *
    *  Events Documentation
    *
    */

    /**
    * Fired when a call to `Composite.add` is made, before objects have been added.
    *
    * @event beforeAdd
    * @param {} event An event object
    * @param {} event.object The object(s) to be added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.add` is made, after objects have been added.
    *
    * @event afterAdd
    * @param {} event An event object
    * @param {} event.object The object(s) that have been added (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, before objects have been removed.
    *
    * @event beforeRemove
    * @param {} event An event object
    * @param {} event.object The object(s) to be removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /**
    * Fired when a call to `Composite.remove` is made, after objects have been removed.
    *
    * @event afterRemove
    * @param {} event An event object
    * @param {} event.object The object(s) that have been removed (may be a single body, constraint, composite or a mixed array of these)
    * @param {} event.source The source object of the event
    * @param {} event.name The name of the event
    */

    /*
    *
    *  Properties Documentation
    *
    */

    /**
     * An integer `Number` uniquely identifying number generated in `Composite.create` by `Common.nextId`.
     *
     * @property id
     * @type number
     */

    /**
     * A `String` denoting the type of object.
     *
     * @property type
     * @type string
     * @default "composite"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage composites.
     *
     * @property label
     * @type string
     * @default "Composite"
     */

    /**
     * A flag that specifies whether the composite has been modified during the current step.
     * Most `Matter.Composite` methods will automatically set this flag to `true` to inform the engine of changes to be handled.
     * If you need to change it manually, you should use the `Composite.setModified` method.
     *
     * @property isModified
     * @type boolean
     * @default false
     */

    /**
     * The `Composite` that is the parent of this composite. It is automatically managed by the `Matter.Composite` methods.
     *
     * @property parent
     * @type composite
     * @default null
     */

    /**
     * An array of `Body` that are _direct_ children of this composite.
     * To add or remove bodies you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allBodies` method.
     *
     * @property bodies
     * @type body[]
     * @default []
     */

    /**
     * An array of `Constraint` that are _direct_ children of this composite.
     * To add or remove constraints you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allConstraints` method.
     *
     * @property constraints
     * @type constraint[]
     * @default []
     */

    /**
     * An array of `Composite` that are _direct_ children of this composite.
     * To add or remove composites you should use `Composite.add` and `Composite.remove` methods rather than directly modifying this property.
     * If you wish to recursively find all descendants, you should use the `Composite.allComposites` method.
     *
     * @property composites
     * @type composite[]
     * @default []
     */

    /**
     * An object reserved for storing plugin-specific properties.
     *
     * @property plugin
     * @type {}
     */

})();
