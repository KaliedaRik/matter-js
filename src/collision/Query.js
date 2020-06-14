/**
* The `Matter.Query` module contains methods for performing collision queries.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Query
*/

const Query = {};

module.exports = Query;

const Vector = require('../geometry/Vector');
const SAT = require('./SAT');
const Bounds = require('../geometry/Bounds');
const Bodies = require('../factory/Bodies');
const Vertices = require('../geometry/Vertices');

(function() {

    /**
     * Returns a list of collisions between `body` and `bodies`.
     * @method collides
     * @param {body} body
     * @param {body[]} bodies
     * @return {object[]} Collisions
     */
    Query.collides = (body, bodies) => {

        // check to see if this function is ever used ...
        // console.log('Query.collides')

        let collisions = [];

        let overlaps = Bounds.overlaps,
            collides = SAT.collides;

        let {bounds: bodyBounds} = body;

        bodies.forEach(bodyA => {

            let {parts, bounds} = bodyA;

            if (overlaps(bounds, bodyBounds)) {

                let [firstItem, ...rest] = parts;
                if (!rest.length) rest = [firstItem];

                rest.some(part => {

                    if (overlaps(part.bounds, bodyBounds)) {

                        let collision = collides(part, body);

                        if (collision.collided) {

                            collisions.push(collision);
                            return true;
                        }
                    }
                    return false;
                })
            }
        });
        return collisions;
    };

    /**
     * Casts a ray segment against a set of bodies and returns all collisions, ray width is optional. Intersection points are not provided.
     * @method ray
     * @param {body[]} bodies
     * @param {vector} startPoint
     * @param {vector} endPoint
     * @param {number} [rayWidth]
     * @return {object[]} Collisions
     */
    Query.ray = (bodies, startPoint, endPoint, rayWidth = 1e-100) => {

        // check to see if this function is ever used ...
        // console.log('Query.ray')

        let rayAngle = Vector.angle(startPoint, endPoint),
            rayLength = Vector.magnitude(Vector.sub(startPoint, endPoint)),
            rayX = (endPoint.x + startPoint.x) * 0.5,
            rayY = (endPoint.y + startPoint.y) * 0.5,
            ray = Bodies.rectangle(rayX, rayY, rayLength, rayWidth, { angle: rayAngle }),
            collisions = Query.collides(ray, bodies);

        collisions.forEach(collision => {

            collision.body = collision.bodyB = collision.bodyA;
        });

        return collisions;
    };

    /**
     * Returns all bodies whose bounds are inside (or outside if set) the given set of bounds, from the given set of bodies.
     * @method region
     * @param {body[]} bodies
     * @param {bounds} bounds
     * @param {bool} [outside=false]
     * @return {body[]} The bodies matching the query
     */
    Query.region = (bodies, bounds, outside) => {

        // check to see if this function is ever used ...
        console.log('Query.region')

        let result = [],
            overlapping = Bounds.overlaps;

        bodies.forEach(body => {

            let overlaps = overlapping(body.bounds, bounds);

            if ((overlaps && !outside) || (!overlaps && outside)) result.push(body);
        });

        return result;
    };

    /**
     * Returns all bodies whose vertices contain the given point, from the given set of bodies.
     * @method point
     * @param {body[]} bodies
     * @param {vector} point
     * @return {body[]} The bodies matching the query
     */
    Query.point = function(bodies, point) {

        // check to see if this function is ever used ...
        // console.log('Query.point')

        let result = [];

        let bContains = Bounds.contains,
            vContains = Vertices.contains;

        bodies.forEach(body => {

            if (bContains(body.bounds, point)) {

                let [firstItem, ...parts] = body.parts;
                if (!parts.length) parts = [firstItem];

                parts.some(part => {

                    if (bContains(part.bounds, point) && vContains(part.vertices, point)) {

                        result.push(body);
                        return true;
                    }
                    return false;
                });
            }
        });
        return result;
    };

})();
