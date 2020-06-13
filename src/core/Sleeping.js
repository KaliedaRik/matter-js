/**
* The `Matter.Sleeping` module contains methods to manage the sleeping state of bodies.
*
* @class Sleeping
*/

const Sleeping = {};

module.exports = Sleeping;

const Events = require('./Events');

(function() {

    Sleeping._motionWakeThreshold = 0.18;
    Sleeping._motionSleepThreshold = 0.08;
    Sleeping._minBias = 0.9;

    /**
     * Puts bodies to sleep or wakes them up depending on their motion.
     * @method update
     * @param {body[]} bodies
     * @param {number} timeScale
     */
    Sleeping.update = (bodies, timeScale) => {

        // check to see if this function is ever used ...
        // console.log('Sleeping.update')

        let timeFactor = timeScale * timeScale * timeScale;

        // update bodies sleeping status
        bodies.forEach(body => {

            let {speed, angularSpeed, force, motion: bodyMotion, sleepThreshold} = body;
            let {x, y} = force;

            let motion = speed * speed + angularSpeed * angularSpeed;

            // wake up bodies if they have a force applied
            if (x !== 0 || y !== 0) Sleeping.set(body, false);
            else {

                let {_minBias, _motionSleepThreshold} = Sleeping;

                let minMotion = Math.min(bodyMotion, motion),
                    maxMotion = Math.max(bodyMotion, motion);
            
                // biased average motion estimation between frames
                motion = body.motion = _minBias * minMotion + (1 - _minBias) * maxMotion;

                if (sleepThreshold > 0 && motion < _motionSleepThreshold * timeFactor) {

                    body.sleepCounter += 1;
                    
                    if (body.sleepCounter >= sleepThreshold) Sleeping.set(body, true);
                } 
                else if (body.sleepCounter > 0) body.sleepCounter -= 1;
            }
        });
    };

    /**
     * Given a set of colliding pairs, wakes the sleeping bodies involved.
     * @method afterCollisions
     * @param {pair[]} pairs
     * @param {number} timeScale
     */
    Sleeping.afterCollisions = (pairs, timeScale) => {

        // check to see if this function is ever used ...
        // console.log('Sleeping.afterCollisions')

        let timeFactor = timeScale * timeScale * timeScale;

        pairs.forEach(pair => {

            if (pair.isActive) {

                let {collision, bodyA, bodyB} = pair;

                bodyA = bodyA.parent;
                bodyB = bodyB.parent;

                if (!bodyA.isStatic && !bodyB.isStatic && (!bodyA.isSleeping || bodyB.isSleeping)) {

                    if (bodyA.isSleeping || bodyB.isSleeping) {

                        let sleepingBody = (bodyA.isSleeping && !bodyA.isStatic) ? bodyA : bodyB,
                            movingBody = (sleepingBody === bodyA) ? bodyB : bodyA;

                        if (!sleepingBody.isStatic && movingBody.motion > Sleeping._motionWakeThreshold * timeFactor) Sleeping.set(sleepingBody, false);
                    }
                }
            }
        });
    };
  
    /**
     * Set a body as sleeping or awake.
     * @method set
     * @param {body} body
     * @param {boolean} isSleeping
     */
    Sleeping.set = (body, isSleeping) => {

        let wasSleeping = body.isSleeping;

        if (isSleeping) {

            body.isSleeping = true;
            body.sleepCounter = body.sleepThreshold;

            body.positionImpulse.x = 0;
            body.positionImpulse.y = 0;

            body.positionPrev.x = body.position.x;
            body.positionPrev.y = body.position.y;

            body.anglePrev = body.angle;
            body.speed = 0;
            body.angularSpeed = 0;
            body.motion = 0;

            // + commenting out to see if the system works without event emissions
            // + "Sleeping" demo has tied console notifications to this event
            if (!wasSleeping) Events.trigger(body, 'sleepStart');
        } 
        else {
            body.isSleeping = false;
            body.sleepCounter = 0;

            // + commenting out to see if the system works without event emissions
            // + "Sleeping" demo has tied console notifications to this event
            if (wasSleeping) Events.trigger(body, 'sleepEnd');
        }
    };

})();
