/**
* The `Matter.Bounds` module contains methods for creating and manipulating axis-aligned bounding boxes (AABB).
*
* @class Bounds
*/

const Bounds = {};

module.exports = Bounds;

(function() {

    /**
     * Creates a new axis-aligned bounding box (AABB) for the given vertices.
     * @method create
     * @param {vertices} vertices
     * @return {bounds} A new bounds object
     */
    Bounds.create = (vertices) => {

        let bounds = { 
            min: { x: 0, y: 0 }, 
            max: { x: 0, y: 0 }
        };

        if (vertices) Bounds.update(bounds, vertices);
        
        return bounds;
    };

    /**
     * Updates bounds using the given vertices and extends the bounds given a velocity.
     * @method update
     * @param {bounds} bounds
     * @param {vertices} vertices
     * @param {vector} velocity
     */
    Bounds.update = (bounds, vertices, velocity) => {

        let {min, max} = bounds;

        min.x = Infinity;
        max.x = -Infinity;
        min.y = Infinity;
        max.y = -Infinity;

        vertices.forEach(vertex => {

            let {x, y} = vertex;

            if (x > max.x) max.x = x;
            if (x < min.x) min.x = x;
            if (y > max.y) max.y = y;
            if (y < min.y) min.y = y;
        })

        if (velocity) {

            let {x: vx, y: vy} = velocity;

            if (vx > 0) max.x += vx;
            else min.x += vx;
            
            if (vy > 0) max.y += vy;
            else min.y += vy;
        }
    };

    /**
     * Returns true if the bounds contains the given point.
     * @method contains
     * @param {bounds} bounds
     * @param {vector} point
     * @return {boolean} True if the bounds contain the point, otherwise false
     */
    Bounds.contains = (bounds, point) => {

        let {x, y} = point;
        let {max, min} = bounds;

        return (x >= min.x && x <= max.x && y >= min.y && y <= max.y);
    };

    /**
     * Returns true if the two bounds intersect.
     * @method overlaps
     * @param {bounds} boundsA
     * @param {bounds} boundsB
     * @return {boolean} True if the bounds overlap, otherwise false
     */
    Bounds.overlaps = (A, B) => {

        let {min: minA, max: maxA} = A;
        let {min: minB, max: maxB} = B;

        return (minA.x <= maxB.x && maxA.x >= minB.x && maxA.y >= minB.y && minA.y <= maxB.y);
    };

    /**
     * Translates the bounds by the given vector.
     * @method translate
     * @param {bounds} bounds
     * @param {vector} vector
     */
    Bounds.translate = (bounds, vector) => {

        let {x, y} = vector;
        let {min, max} = bounds;

        min.x += x;
        max.x += x;
        min.y += y;
        max.y += y;
    };

    /**
     * Shifts the bounds to the given position.
     * @method shift
     * @param {bounds} bounds
     * @param {vector} position
     */
    Bounds.shift = (bounds, position) => {

        let {max, min} = bounds;
        let {x, y} = position;

        let deltaX = max.x - min.x,
            deltaY = max.y - min.y;
            
        min.x = x;
        max.x = x + deltaX;
        min.y = y;
        max.y = y + deltaY;
    };
    
})();
