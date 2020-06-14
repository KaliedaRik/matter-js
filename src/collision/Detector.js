/**
* The `Matter.Detector` module contains methods for detecting collisions given a set of pairs.
*
* @class Detector
*/

// TODO: speculative contacts

const Detector = {};

module.exports = Detector;

const SAT = require('./SAT');
const Pair = require('./Pair');
const Bounds = require('../geometry/Bounds');

(function() {

    /**
     * Finds all collisions given a list of pairs.
     * @method collisions
     * @param {pair[]} broadphasePairs
     * @param {engine} engine
     * @return {array} collisions
     */
    Detector.collisions = (broadphasePairs, engine) => {

        let collisions = [],
            canCollide = Detector.canCollide,
            overlaps = Bounds.overlaps,
            pairsTable = engine.pairs.table,
            pairId = Pair.id,
            collides = SAT.collides;

        broadphasePairs.forEach(pair => {

            let [A, B] = pair;

            if (!((A.isStatic || A.isSleeping) && (B.isStatic || B.isSleeping))) {

                if (canCollide(A.collisionFilter, B.collisionFilter)) {

                    if (overlaps(A.bounds, B.bounds)) {

                        // check to see if this function is ever used ...
                        // console.log('Detector.collisions')

                        let [firstItemA, ...partsA] = A.parts,
                            [firstItemB, ...partsB] = B.parts;

                        if (!partsA.length) partsA = [firstItemA];
                        if (!partsB.length) partsB = [firstItemB];

                        partsA.forEach(partA => {

                            let boundsA = partA.bounds;

                            partsB.forEach(partB => {

                                if ((partA === A && partB === B) || overlaps(boundsA, partB.bounds)) {

                                    let pair = pairsTable[pairId(partA, partB)],
                                        previousCollision = null;

                                    if (pair && pair.isActive) previousCollision = pair.collision;

                                    let collision = collides(partA, partB, previousCollision);

                                    if (collision.collided) collisions.push(collision);
                                }
                            });
                        });
                    }
                }
            }
        });
        return collisions;
    };

    /**
     * Returns `true` if both supplied collision filters will allow a collision to occur.
     * See `body.collisionFilter` for more information.
     * @method canCollide
     * @param {} filterA
     * @param {} filterB
     * @return {bool} `true` if collision can occur
     */
    Detector.canCollide = (filterA, filterB) => {

        if (filterA.group === filterB.group && filterA.group !== 0) return filterA.group > 0;

        return (filterA.mask & filterB.category) !== 0 && (filterB.mask & filterA.category) !== 0;
    };

})();