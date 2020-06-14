/**
* The `Matter.Constraint` module contains methods for creating and manipulating constraints.
* Constraints are used for specifying that a fixed distance must be maintained between two bodies (or a body and a fixed world-space position).
* The stiffness of constraints can be modified to create springs or elastic.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Constraint
*/

const Constraint = {};

module.exports = Constraint;

const Vertices = require('../geometry/Vertices');
const Vector = require('../geometry/Vector');
const Sleeping = require('../core/Sleeping');
const Bounds = require('../geometry/Bounds');
const Axes = require('../geometry/Axes');
const Common = require('../core/Common');

(function() {

    Constraint._warming = 0.4;
    Constraint._torqueDampen = 1;
    Constraint._minLength = 0.000001;

    /**
     * Creates a new constraint.
     * All properties have default values, and many are pre-calculated automatically based on other properties.
     * To simulate a revolute constraint (or pin joint) set `length: 0` and a high `stiffness` value (e.g. `0.7` or above).
     * If the constraint is unstable, try lowering the `stiffness` value and / or increasing `engine.constraintIterations`.
     * For compound bodies, constraints must be applied to the parent body (not one of its parts).
     * See the properties section below for detailed information on what you can pass via the `options` object.
     * @method create
     * @param {} options
     * @return {constraint} constraint
     */
    Constraint.create = (options) => {

        // check to see if this function is ever used ...
        // console.log('Constraint.create')

        let constraint = options;

        let {bodyA, bodyB, pointA, pointB} = constraint;

        // if bodies defined but no points, use body centre
        if (bodyA && !pointA) {

            pointA = constraint.pointA = { x: 0, y: 0 };
        }

        if (bodyB && !pointB) {

            pointB = constraint.pointB = { x: 0, y: 0 };
        }

        // calculate static length using initial world space points
        let initialPointA = bodyA ? Vector.add(bodyA.position, pointA) : pointA,
            initialPointB = bodyB ? Vector.add(bodyB.position, pointB) : pointB,
            length = Vector.magnitude(Vector.sub(initialPointA, initialPointB));
    
        constraint.length = (typeof constraint.length !== 'undefined') ? constraint.length : length;

        // option defaults
        constraint.id = constraint.id || Common.nextId();
        constraint.label = constraint.label || 'Constraint';
        constraint.type = 'constraint';
        constraint.stiffness = constraint.stiffness || (constraint.length > 0 ? 1 : 0.7);
        constraint.damping = constraint.damping || 0;
        constraint.angularStiffness = constraint.angularStiffness || 0;
        constraint.angleA = bodyA ? bodyA.angle : constraint.angleA;
        constraint.angleB = bodyB ? bodyB.angle : constraint.angleB;
        constraint.plugin = {};

        // render
        let render = {
            visible: true,
            lineWidth: 2,
            strokeStyle: '#ffffff',
            type: 'line',
            anchors: true
        };

        if (constraint.length === 0 && constraint.stiffness > 0.1) {

            render.type = 'pin';
            render.anchors = false;
        } 
        else if (constraint.stiffness < 0.9) render.type = 'spring';

        constraint.render = Common.extend(render, constraint.render);

        return constraint;
    };

    /**
     * Prepares for solving by constraint warming.
     * @private
     * @method preSolveAll
     * @param {body[]} bodies
     */
    Constraint.preSolveAll = (bodies) => {

        // check to see if this function is ever used ...
        // console.log('Constraint.preSolveAll')

        bodies.forEach(body => {

            let {constraintImpulse: impulse, isStatic, position} = body;
            let {x, y, angle} = impulse;

            if (!isStatic || !(x === 0 && y === 0 && angle === 0)) {

                position.x += x;
                position.y += y;
                body.angle += angle;
            }
        });
    };

    /**
     * Solves all constraints in a list of collisions.
     * @private
     * @method solveAll
     * @param {constraint[]} constraints
     * @param {number} timeScale
     */
    Constraint.solveAll = (constraints, timeScale) => {

        // check to see if this function is ever used ...
        // console.log('Constraint.solveAll')

        let free = [];

        // Solve fixed constraints first.
        constraints.forEach(constraint => {

            let {bodyA, bodyB} = constraint;

            let fixedA = !bodyA || (bodyA && bodyA.isStatic),
                fixedB = !bodyB || (bodyB && bodyB.isStatic);

            if (fixedA || fixedB) Constraint.solve(constraint, timeScale);
            else free.push(constraint);
        });

        // Solve free constraints last.
        if (free.length) free.forEach(constraint => Constraint.solve(constraint, timeScale));
    };

    /**
     * Solves a distance constraint with Gauss-Siedel method.
     * @private
     * @method solve
     * @param {constraint} constraint
     * @param {number} timeScale
     */
    Constraint.solve = (constraint, timeScale) => {

        let {bodyA, bodyB, pointA, pointB} = constraint;

        if (!bodyA && !bodyB) return;

        let {stiffness: cStiffness, damping: cDamping, angularStiffness: cAngularStiffness} = constraint;

        // update reference angle
        if (bodyA && !bodyA.isStatic) {

            Vector.rotate(pointA, bodyA.angle - constraint.angleA, pointA);
            constraint.angleA = bodyA.angle;
        }
        
        // update reference angle
        if (bodyB && !bodyB.isStatic) {

            Vector.rotate(pointB, bodyB.angle - constraint.angleB, pointB);
            constraint.angleB = bodyB.angle;
        }

        let pointAWorld = pointA,
            pointBWorld = pointB;

        let inverseMassA = 0, 
            inverseInertiaA = 0, 
            positionA, positionPrevA, isStaticA, constraintImpulseA;

        let inverseMassB = 0, 
            inverseInertiaB = 0, 
            positionB, positionPrevB, isStaticB, constraintImpulseB;

        if (bodyA) {

            inverseMassA = bodyA.inverseMass;
            inverseInertiaA = bodyA.inverseInertia;
            positionA = bodyA.position;
            positionPrevA = bodyA.positionPrev;
            isStaticA = bodyA.isStatic;
            constraintImpulseA = bodyA.constraintImpulse;

            pointAWorld = Vector.add(positionA, pointA);
        }

        if (bodyB) {

            inverseMassB = bodyB.inverseMass;
            inverseInertiaB = bodyB.inverseInertia;
            positionB = bodyB.position;
            positionPrevB = bodyB.positionPrev;
            isStaticB = bodyB.isStatic;
            constraintImpulseB = bodyB.constraintImpulse;

            pointBWorld = Vector.add(positionB, pointB);
        }

        if (!pointAWorld || !pointBWorld) return;

        let {_minLength, _torqueDampen} = Constraint;

        let delta = Vector.sub(pointAWorld, pointBWorld),
            currentLength = Vector.magnitude(delta);

        // prevent singularity
        if (currentLength < _minLength) currentLength = _minLength;

        // solve distance constraint with Gauss-Siedel method
        let difference = (currentLength - constraint.length) / currentLength;
        let stiffness = cStiffness < 1 ? cStiffness * timeScale : cStiffness;

        let force = Vector.mult(delta, difference * stiffness);
        let {x: fx, y: fy} = force;

        let massTotal = inverseMassA + inverseMassB;
        let inertiaTotal = inverseInertiaA + inverseInertiaB;
        let resistanceTotal = massTotal + inertiaTotal;

        let torque, share, normal, normalVelocity, relativeVelocity;

        if (cDamping) {

            let zero = Vector.create();

            normal = Vector.div(delta, currentLength);

            relativeVelocity = Vector.sub(
                (bodyB) ? Vector.sub(positionB, positionPrevB) : zero,
                (bodyA) ? Vector.sub(positionA, positionPrevA) : zero
            );

            normalVelocity = Vector.dot(normal, relativeVelocity);
        }

        if (bodyA && !isStaticA) {

            share = inverseMassA / massTotal;

            // keep track of applied impulses for post solving
            constraintImpulseA.x -= fx * share;
            constraintImpulseA.y -= fy * share;

            // apply forces
            positionA.x -= fx * share;
            positionA.y -= fy * share;

            // apply damping
            if (cDamping) {

                positionPrevA.x -= cDamping * normal.x * normalVelocity * share;
                positionPrevA.y -= cDamping * normal.y * normalVelocity * share;
            }

            // apply torque
            torque = (Vector.cross(pointA, force) / resistanceTotal) * _torqueDampen * inverseInertiaA * (1 - cAngularStiffness);

            constraintImpulseA.angle -= torque;
            bodyA.angle -= torque;
        }

        if (bodyB && !isStaticB) {

            share = inverseMassB / massTotal;

            // keep track of applied impulses for post solving
            constraintImpulseB.x += fx * share;
            constraintImpulseB.y += fy * share;
            
            // apply forces
            positionB.x += fx * share;
            positionB.y += fy * share;

            // apply damping
            if (cDamping) {

                positionPrevB.x += cDamping * normal.x * normalVelocity * share;
                positionPrevB.y += cDamping * normal.y * normalVelocity * share;
            }

            // apply torque
            torque = (Vector.cross(pointB, force) / resistanceTotal) * _torqueDampen * inverseInertiaB * (1 - cAngularStiffness);

            constraintImpulseB.angle += torque;
            bodyB.angle += torque;
        }
    };

    /**
     * Performs body updates required after solving constraints.
     * @private
     * @method postSolveAll
     * @param {body[]} bodies
     */
    Constraint.postSolveAll = (bodies) => {

        let {_warming} = Constraint;

        bodies.forEach(body => {

            let {constraintImpulse: impulse, isStatic, parts, velocity, position: bodyPosition} = body;
            let {x, y, angle} = impulse;

            if (!isStatic && !(x === 0 && y === 0 && angle === 0)) {

                Sleeping.set(body, false);

                parts.forEach((part, index) => {

                    let {vertices, position: partPosition, axes, bounds} = part;

                    Vertices.translate(vertices, impulse);

                    if (index) {

                        partPosition.x += x;
                        partPosition.y += y;
                    }

                    if (angle !== 0) {

                        Vertices.rotate(vertices, angle, bodyPosition);
                        Axes.rotate(axes, angle);

                        if (index) Vector.rotateAbout(partPosition, angle, bodyPosition, partPosition);
                    }
                    Bounds.update(bounds, vertices, velocity);
                });
            }

            // dampen the cached impulse for warming next step
            impulse.angle *= _warming;
            impulse.x *= _warming;
            impulse.y *= _warming;
        });
    };

    /**
     * Returns the world-space position of `constraint.pointA`, accounting for `constraint.bodyA`.
     * @method pointAWorld
     * @param {constraint} constraint
     * @returns {vector} the world-space position
     */
    Constraint.pointAWorld = (constraint) => {

        let {bodyA, pointA} = constraint;

        return {
            x: (bodyA ? bodyA.position.x : 0) + pointA.x,
            y: (bodyA ? bodyA.position.y : 0) + pointA.y
        };
    };

    /**
     * Returns the world-space position of `constraint.pointB`, accounting for `constraint.bodyB`.
     * @method pointBWorld
     * @param {constraint} constraint
     * @returns {vector} the world-space position
     */
    Constraint.pointBWorld = (constraint) => {

        let {bodyB, pointB} = constraint;

        return {
            x: (bodyB ? bodyB.position.x : 0) + pointB.x,
            y: (bodyB ? bodyB.position.y : 0) + pointB.y
        };
    };

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
     * @default "constraint"
     * @readOnly
     */

    /**
     * An arbitrary `String` name to help the user identify and manage bodies.
     *
     * @property label
     * @type string
     * @default "Constraint"
     */

    /**
     * An `Object` that defines the rendering properties to be consumed by the module `Matter.Render`.
     *
     * @property render
     * @type object
     */

    /**
     * A flag that indicates if the constraint should be rendered.
     *
     * @property render.visible
     * @type boolean
     * @default true
     */

    /**
     * A `Number` that defines the line width to use when rendering the constraint outline.
     * A value of `0` means no outline will be rendered.
     *
     * @property render.lineWidth
     * @type number
     * @default 2
     */

    /**
     * A `String` that defines the stroke style to use when rendering the constraint outline.
     * It is the same as when using a canvas, so it accepts CSS style property values.
     *
     * @property render.strokeStyle
     * @type string
     * @default a random colour
     */

    /**
     * A `String` that defines the constraint rendering type. 
     * The possible values are 'line', 'pin', 'spring'.
     * An appropriate render type will be automatically chosen unless one is given in options.
     *
     * @property render.type
     * @type string
     * @default 'line'
     */

    /**
     * A `Boolean` that defines if the constraint's anchor points should be rendered.
     *
     * @property render.anchors
     * @type boolean
     * @default true
     */

    /**
     * The first possible `Body` that this constraint is attached to.
     *
     * @property bodyA
     * @type body
     * @default null
     */

    /**
     * The second possible `Body` that this constraint is attached to.
     *
     * @property bodyB
     * @type body
     * @default null
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyA` if defined, otherwise a world-space position.
     *
     * @property pointA
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Vector` that specifies the offset of the constraint from center of the `constraint.bodyB` if defined, otherwise a world-space position.
     *
     * @property pointB
     * @type vector
     * @default { x: 0, y: 0 }
     */

    /**
     * A `Number` that specifies the stiffness of the constraint, i.e. the rate at which it returns to its resting `constraint.length`.
     * A value of `1` means the constraint should be very stiff.
     * A value of `0.2` means the constraint acts like a soft spring.
     *
     * @property stiffness
     * @type number
     * @default 1
     */

    /**
     * A `Number` that specifies the damping of the constraint, 
     * i.e. the amount of resistance applied to each body based on their velocities to limit the amount of oscillation.
     * Damping will only be apparent when the constraint also has a very low `stiffness`.
     * A value of `0.1` means the constraint will apply heavy damping, resulting in little to no oscillation.
     * A value of `0` means the constraint will apply no damping.
     *
     * @property damping
     * @type number
     * @default 0
     */

    /**
     * A `Number` that specifies the target resting length of the constraint. 
     * It is calculated automatically in `Constraint.create` from initial positions of the `constraint.bodyA` and `constraint.bodyB`.
     *
     * @property length
     * @type number
     */

    /**
     * An object reserved for storing plugin-specific properties.
     *
     * @property plugin
     * @type {}
     */

})();
