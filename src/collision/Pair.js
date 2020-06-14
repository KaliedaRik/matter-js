/**
* The `Matter.Pair` module contains methods for creating and manipulating collision pairs.
*
* @class Pair
*/

const Pair = {};

module.exports = Pair;

const Contact = require('./Contact');

(function() {
    
    /**
     * Creates a pair.
     * @method create
     * @param {collision} collision
     * @param {number} timestamp
     * @return {pair} A new pair
     */
    Pair.create = (collision, timestamp) => {

        let {bodyA, bodyB, parentA, parentB} = collision;

        let max = Math.max;

        let pair = {
            id: Pair.id(bodyA, bodyB),
            bodyA: bodyA,
            bodyB: bodyB,
            contacts: {},
            activeContacts: [],
            separation: 0,
            isActive: true,
            confirmedActive: true,
            isSensor: bodyA.isSensor || bodyB.isSensor,
            timeCreated: timestamp,
            timeUpdated: timestamp,
            inverseMass: parentA.inverseMass + parentB.inverseMass,
            friction: Math.min(parentA.friction, parentB.friction),
            frictionStatic: max(parentA.frictionStatic, parentB.frictionStatic),
            restitution: max(parentA.restitution, parentB.restitution),
            slop: max(parentA.slop, parentB.slop)
        };

        Pair.update(pair, collision, timestamp);

        return pair;
    };

    /**
     * Updates a pair given a collision.
     * @method update
     * @param {pair} pair
     * @param {collision} collision
     * @param {number} timestamp
     */
    Pair.update = (pair, collision, timestamp) => {

        let {supports, parentA, parentB} = collision;
        let {contacts, activeContacts} = pair;

        let max = Math.max,
            contactId = Contact.id,
            contactCreate = Contact.create;

        pair.collision = collision;
        pair.inverseMass = parentA.inverseMass + parentB.inverseMass;
        pair.friction = Math.min(parentA.friction, parentB.friction);
        pair.frictionStatic = max(parentA.frictionStatic, parentB.frictionStatic);
        pair.restitution = max(parentA.restitution, parentB.restitution);
        pair.slop = max(parentA.slop, parentB.slop);

        activeContacts.length = 0;
        
        if (collision.collided) {

            supports.forEach(support => {

                let id = contactId(support),
                    contact = contacts[id];

                if (contact) activeContacts.push(contact);
                else activeContacts.push(contacts[id] = contactCreate(support));
            });

            pair.separation = collision.depth;
            Pair.setActive(pair, true, timestamp);
        } 
        else if (pair.isActive === true) Pair.setActive(pair, false, timestamp);
    };
    
    /**
     * Set a pair as active or inactive.
     * @method setActive
     * @param {pair} pair
     * @param {bool} isActive
     * @param {number} timestamp
     */
    Pair.setActive = (pair, isActive, timestamp) => {

        if (isActive) {
            pair.isActive = true;
            pair.timeUpdated = timestamp;
        } 
        else {
            pair.isActive = false;
            pair.activeContacts.length = 0;
        }
    };

    /**
     * Get the id for the given pair.
     * @method id
     * @param {body} bodyA
     * @param {body} bodyB
     * @return {string} Unique pairId
     */
    Pair.id = (bodyA, bodyB) => {

        let idA = bodyA.id,
            idB = bodyB.id;

        if (idA < idB) return `A${idA}B${idB}`;
        else return `A${idB}B${idA}`;
    };

})();
