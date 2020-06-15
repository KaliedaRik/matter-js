/**
* The `Matter.Resolver` module contains methods for resolving collision pairs.
*
* @class Resolver
*/

const Resolver = {};

module.exports = Resolver;

const Vertices = require('../geometry/Vertices');
const Vector = require('../geometry/Vector');
const Common = require('../core/Common');
const Bounds = require('../geometry/Bounds');

(function() {

    Resolver._restingThresh = 4;
    Resolver._restingThreshTangent = 6;
    Resolver._positionDampen = 0.9;
    Resolver._positionWarming = 0.8;
    Resolver._frictionNormalMultiplier = 5;

    /**
     * Prepare pairs for position solving.
     * @method preSolvePosition
     * @param {pair[]} pairs
     */
    Resolver.preSolvePosition = (pairs) => {

        // check to see if this function is ever used ...
        // console.log('Resolver.preSolvePosition')

        pairs.forEach(pair => {

            if (pair.isActive) {

                let {parentA, parentB} = pair.collision;

                let activeCount = pair.activeContacts.length;

                parentA.totalContacts += activeCount;
                parentB.totalContacts += activeCount;
            }
        });
    };

    /**
     * Find a solution for pair positions.
     * @method solvePosition
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solvePosition = (pairs, timeScale) => {

        let tempA = Vector._temp[0],
            tempB = Vector._temp[1],
            tempC = Vector._temp[2],
            tempD = Vector._temp[3],

            _positionDampen = Resolver._positionDampen,

            vSub = Vector.sub,
            vAdd = Vector.add,
            vDot = Vector.dot;

        pairs.forEach(pair => {

            if (!(!pair.isActive || pair.isSensor)) {

                let {collision} = pair;
                let {parentA: bodyA, parentB: bodyB, normal, penetration} = collision;
                let {positionImpulse: impulseA} = bodyA;
                let {positionImpulse: impulseB, position: posB} = bodyB;

                let bodyBtoA = vSub(vAdd(impulseB, posB, tempA), vAdd(impulseA, vSub(posB, penetration, tempB), tempC), tempD);

                pair.separation = vDot(normal, bodyBtoA);
            }
        });

        pairs.forEach(pair => {

            if (!(!pair.isActive || pair.isSensor)) {

                let {collision} = pair;
                let {parentA: bodyA, parentB: bodyB, normal} = collision;
                let {x: nx, y: ny} = normal;
                let {isStatic: staticA, isSleeping: sleepingA, totalContacts: contactsA, positionImpulse: impulseA} = bodyA;
                let {isStatic: staticB, isSleeping: sleepingB, totalContacts: contactsB, positionImpulse: impulseB} = bodyB;

                let myImpulse = (pair.separation - pair.slop) * timeScale;

                if (staticA || staticB) myImpulse *= 2;

                let contactShare;
                
                if (!(staticA || sleepingA)) {

                    contactShare = _positionDampen / contactsA;

                    impulseA.x += nx * myImpulse * contactShare;
                    impulseA.y += ny * myImpulse * contactShare;
                }

                if (!(staticB || sleepingB)) {

                    contactShare = _positionDampen / contactsB;

                    impulseB.x -= nx * myImpulse * contactShare;
                    impulseB.y -= ny * myImpulse * contactShare;
                }
            }
        });
    };

    /**
     * Apply position resolution.
     * @method postSolvePosition
     * @param {body[]} bodies
     */
    Resolver.postSolvePosition = (bodies) => {

        let _positionWarming = Resolver._positionWarming,
            translate = Vertices.translate,
            update = Bounds.update,
            dot = Vector.dot;

        bodies.forEach(body => {

            let {positionImpulse: impulse, positionPrev, velocity, parts} = body;

            body.totalContacts = 0;

            if (impulse.x !== 0 || impulse.y !== 0) {

                // update body geometry
                parts.forEach(part => {

                    let {position, bounds, vertices} = part;

                    translate(vertices, impulse);
                    update(bounds, vertices, velocity);

                    position.x += impulse.x;
                    position.y += impulse.y;
                });

                // move the body without changing velocity
                positionPrev.x += impulse.x;
                positionPrev.y += impulse.y;

                if (dot(impulse, velocity) < 0) {

                    // reset cached impulse if the body has velocity along it
                    impulse.x = 0;
                    impulse.y = 0;
                } 
                else {

                    // warm the next iteration
                    impulse.x *= _positionWarming;
                    impulse.y *= _positionWarming;
                }
            }
        });
    };

    /**
     * Prepare pairs for velocity solving.
     * @method preSolveVelocity
     * @param {pair[]} pairs
     */
    Resolver.preSolveVelocity = (pairs) => {

        let impulse = Vector._temp[0],
            tempA = Vector._temp[1],
            vSub = Vector.sub,
            vCross = Vector.cross;

        let offset;

        pairs.forEach(pair => {

            if (!(!pair.isActive || pair.isSensor)) {

                let {activeContacts: contacts, collision} = pair;
                let {parentA: bodyA, parentB: bodyB, normal, tangent} = collision;

                let {isStatic: staticA, isSleeping: sleepingA, positionPrev: prevA, inverseMass: iMassA, inverseInertia: iInertiaA, position: posA} = bodyA;

                let {isStatic: staticB, isSleeping: sleepingB, positionPrev: prevB, inverseMass: iMassB, inverseInertia: iInertiaB, position: posB} = bodyB;

                // resolve each contact
                contacts.forEach(contact => {

                    let {vertex: contactVertex, normalImpulse, tangentImpulse} = contact;

                    if (normalImpulse !== 0 || tangentImpulse !== 0) {

                        // total impulse from contact
                        impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                        impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);

                        // apply impulse from contact
                        if (!(staticA || sleepingA)) {

                            offset = vSub(contactVertex, posA, tempA);

                            prevA.x += impulse.x * iMassA;
                            prevA.y += impulse.y * iMassA;

                            bodyA.anglePrev += vCross(offset, impulse) * iInertiaA;
                        }

                        if (!(staticB || sleepingB)) {

                            offset = vSub(contactVertex, posB, tempA);

                            prevB.x -= impulse.x * iMassB;
                            prevB.y -= impulse.y * iMassB;

                            bodyB.anglePrev -= vCross(offset, impulse) * iInertiaB;
                        }
                    }
                });
            }
        });
    };

    /**
     * Find a solution for pair velocities.
     * @method solveVelocity
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Resolver.solveVelocity = (pairs, timeScale) => {

        // check to see if this function is ever used ...
        // console.log('Resolver.solveVelocity')

        let timeScaleSquared = timeScale * timeScale,

            impulse = Vector._temp[0],
            tempA = Vector._temp[1],
            tempB = Vector._temp[2],
            tempC = Vector._temp[3],
            tempD = Vector._temp[4],
            tempE = Vector._temp[5],

            vSub = Vector.sub,
            vAdd = Vector.add,
            vMult = Vector.mult,
            vPerp = Vector.perp,
            vDot = Vector.dot,
            vCross = Vector.cross,

            sign = Common.sign,
            clamp = Common.clamp,

            _frictionNormalMultiplier = Resolver._frictionNormalMultiplier,
            _restingThresh = Resolver._restingThresh,
            _restingThreshTangent = Resolver._restingThreshTangent;

        pairs.forEach(pair => {

            if (!(!pair.isActive || pair.isSensor)) {

                let {collision, activeContacts: contacts, restitution, separation, friction, frictionStatic} = pair;

                let {parentA: bodyA, parentB: bodyB, normal, tangent} = collision;

                let contactShare = 1 / contacts.length;

                let {positionPrev: prevA, position: posA, velocity: velocityA, angle: angleA, anglePrev: anglePrevA, angularVelocity: angularVelocityA, inverseMass: inverseMassA, inverseInertia: inverseInertiaA, isSleeping: isSleepingA, isStatic: isStaticA} = bodyA;

                let {positionPrev: prevB, position: posB, velocity: velocityB, angle: angleB, anglePrev: anglePrevB, angularVelocity: angularVelocityB, inverseMass: inverseMassB, inverseInertia: inverseInertiaB, isSleeping: isSleepingB, isStatic: isStaticB} = bodyB;

                // update body velocities
                velocityA.x = posA.x - prevA.x;
                velocityA.y = posA.y - prevA.y;
                bodyA.angularVelocity = angleA - anglePrevA;

                velocityB.x = posB.x - prevB.x;
                velocityB.y = posB.y - prevB.y;
                bodyB.angularVelocity = angleB - anglePrevB;

                contacts.forEach(contact => {

                    let contactVertex = contact.vertex;

                    let offsetA = vSub(contactVertex, posA, tempA);
                    let offsetB = vSub(contactVertex, posB, tempB);
                    let velocityPointA = vAdd(velocityA, vMult(vPerp(offsetA), angularVelocityA), tempC);
                    let velocityPointB = vAdd(velocityB, vMult(vPerp(offsetB), angularVelocityB), tempD); 
                    let relativeVelocity = vSub(velocityPointA, velocityPointB, tempE);
                    let normalVelocity = vDot(normal, relativeVelocity);

                    let tangentVelocity = vDot(tangent, relativeVelocity);
                    let tangentSpeed = Math.abs(tangentVelocity);
                    let tangentVelocityDirection = sign(tangentVelocity);

                    // raw impulses
                    let normalImpulse = (1 + restitution) * normalVelocity;
                    let normalForce = clamp(separation + normalVelocity, 0, 1) * _frictionNormalMultiplier;

                    // coulomb friction
                    let tangentImpulse = tangentVelocity,
                        maxFriction = Infinity;

                    if (tangentSpeed > friction * frictionStatic * normalForce * timeScaleSquared) {

                        maxFriction = tangentSpeed;
                        tangentImpulse = clamp((friction * tangentVelocityDirection * timeScaleSquared), -maxFriction, maxFriction);
                    }

                    // modify impulses accounting for mass, inertia and offset
                    let oAcN = vCross(offsetA, normal);
                    let oBcN = vCross(offsetB, normal);
                    let share = contactShare / (inverseMassA + inverseMassB + (inverseInertiaA * oAcN * oAcN) + (inverseInertiaB * oBcN * oBcN));

                    normalImpulse *= share;
                    tangentImpulse *= share;

                    // handle high velocity and resting collisions separately
                    if (normalVelocity < 0 && normalVelocity * normalVelocity > _restingThresh * timeScaleSquared) {

                        // high normal velocity so clear cached contact normal impulse
                        contact.normalImpulse = 0;
                    } 
                    else {

                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // impulse constraint tends to 0
                        let contactNormalImpulse = contact.normalImpulse;
                        contact.normalImpulse = Math.min(contact.normalImpulse + normalImpulse, 0);
                        normalImpulse = contact.normalImpulse - contactNormalImpulse;
                    }

                    // handle high velocity and resting collisions separately
                    if (tangentVelocity * tangentVelocity > _restingThreshTangent * timeScaleSquared) {

                        // high tangent velocity so clear cached contact tangent impulse
                        contact.tangentImpulse = 0;
                    } 
                    else {

                        // solve resting collision constraints using Erin Catto's method (GDC08)
                        // tangent impulse tends to -tangentSpeed or +tangentSpeed
                        let contactTangentImpulse = contact.tangentImpulse;
                        contact.tangentImpulse = clamp(contact.tangentImpulse + tangentImpulse, -maxFriction, maxFriction);
                        tangentImpulse = contact.tangentImpulse - contactTangentImpulse;
                    }

                    // total impulse from contact
                    impulse.x = (normal.x * normalImpulse) + (tangent.x * tangentImpulse);
                    impulse.y = (normal.y * normalImpulse) + (tangent.y * tangentImpulse);

                    // apply impulse from contact
                    if (!(isStaticA || isSleepingA)) {
                        prevA.x += impulse.x * inverseMassA;
                        prevA.y += impulse.y * inverseMassA;
                        bodyA.anglePrev += vCross(offsetA, impulse) * inverseInertiaA;
                    }

                    if (!(isStaticB || isSleepingB)) {
                        prevB.x -= impulse.x * inverseMassB;
                        prevB.y -= impulse.y * inverseMassB;
                        bodyB.anglePrev -= vCross(offsetB, impulse) * inverseInertiaB;
                    }
                });
            }
        });
    };

})();
