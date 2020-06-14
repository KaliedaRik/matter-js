/**
* The `Matter.Pairs` module contains methods for creating and manipulating collision pair sets.
*
* @class Pairs
*/

const Pairs = {};

module.exports = Pairs;

const Pair = require('./Pair');
const Common = require('../core/Common');

(function() {
    
    Pairs._pairMaxIdleLife = 1000;

    /**
     * Creates a new pairs structure.
     * @method create
     * @param {object} options
     * @return {pairs} A new pairs structure
     */
    Pairs.create = (options) => {

        return Common.extend({ 
            table: {},
            list: [],
            collisionStart: [],
            collisionActive: [],
            collisionEnd: []
        }, options);
    };

    /**
     * Updates pairs given a list of collisions.
     * @method update
     * @param {object} pairs
     * @param {collision[]} collisions
     * @param {number} timestamp
     */
    Pairs.update = (pairs, collisions, timestamp) => {

        let {list, table, collisionStart, collisionEnd, collisionActive} = pairs;
        let {id: getPairId, update: pairUpdate, create: pairCreate, setActive: pairSetActive} = Pair;

        // clear collision state arrays, but maintain old reference
        collisionStart.length = 0;
        collisionEnd.length = 0;
        collisionActive.length = 0;

        list.forEach(pair => pair.confirmedActive = false);

        collisions.forEach(collision => {

            if (collision.collided) {

                let pairId = getPairId(collision.bodyA, collision.bodyB),
                    pair = table[pairId];

                // pair already exists (but may or may not be active)
                if (pair) {

                    // pair exists and is active
                    if (pair.isActive) collisionActive.push(pair);

                    // pair exists but was inactive, so a collision has just started again
                    else collisionStart.push(pair);

                    // update the pair
                    pairUpdate(pair, collision, timestamp);
                    pair.confirmedActive = true;
                }

                // pair did not exist, create a new pair
                else {

                    pair = pairCreate(collision, timestamp);
                    table[pairId] = pair;
                    collisionStart.push(pair);
                    list.push(pair);
                }
            }
        });

        // deactivate previously active pairs that are now inactive
        list.forEach(pair => {

            if (pair.isActive && !pair.confirmedActive) {

                pairSetActive(pair, false, timestamp);
                collisionEnd.push(pair);
            }
        });
    };
    
    /**
     * Finds and removes pairs that have been inactive for a set amount of time.
     * @method removeOld
     * @param {object} pairs
     * @param {number} timestamp
     */
    Pairs.removeOld = (pairs, timestamp) => {

        let {list, table} = pairs;

        let indexesToRemove = [],
            _pairMaxIdleLife = Pairs._pairMaxIdleLife;

        list.forEach((pair, index) => {

            let {bodyA, bodyB} = pair.collision;

            // never remove sleeping pairs
            if (bodyA.isSleeping || bodyB.isSleeping) pair.timeUpdated = timestamp;

            // if pair is inactive for too long, mark it to be removed
            else if (timestamp - pair.timeUpdated > _pairMaxIdleLife) indexesToRemove.push(index);
        });

        // remove marked pairs
        indexesToRemove.forEach((pairIndex, index) => {

            pairIndex -= index;

            let pair = list[pairIndex];

            delete table[pair.id];
            list.splice(pairIndex, 1);
        });
    };

    /**
     * Clears the given pairs structure.
     * @method clear
     * @param {pairs} pairs
     * @return {pairs} pairs
     */
    Pairs.clear = (pairs) => {

        pairs.table = {};
        pairs.list.length = 0;
        pairs.collisionStart.length = 0;
        pairs.collisionActive.length = 0;
        pairs.collisionEnd.length = 0;

        return pairs;
    };

})();
