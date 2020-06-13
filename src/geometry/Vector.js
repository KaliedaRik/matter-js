/**
* The `Matter.Vector` module contains methods for creating and manipulating vectors.
* Vectors are the basis of all the geometry related operations in the engine.
* A `Matter.Vector` object is of the form `{ x: 0, y: 0 }`.
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vector
*/

// TODO: consider params for reusing vector objects


// I want to replace Vector objects with Scrawl-canvas Coordinate enhanced Arrays, together with a pool for reusing them
// + this will be a big job as Vectors are used extensively throughout the code base!
const Vector = {};

module.exports = Vector;

(function() {

    /**
     * Creates a new vector.
     * @method create
     * @param {number} x
     * @param {number} y
     * @return {vector} A new vector
     */
    Vector.create = (x, y) => {return {x: x || 0, y: y || 0}};

    /**
     * Returns a new vector with `x` and `y` copied from the given `vector`.
     * @method clone
     * @param {vector} vector
     * @return {vector} A new cloned vector
     */
    Vector.clone = (vector) => {return { x: vector.x, y: vector.y }};

    /**
     * Returns the magnitude (length) of a vector.
     * @method magnitude
     * @param {vector} vector
     * @return {number} The magnitude of the vector
     */
    Vector.magnitude = (vector) => Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));

    /**
     * Returns the magnitude (length) of a vector (therefore saving a `sqrt` operation).
     * @method magnitudeSquared
     * @param {vector} vector
     * @return {number} The squared magnitude of the vector
     */
    Vector.magnitudeSquared = (vector) => (vector.x * vector.x) + (vector.y * vector.y);

    /**
     * Rotates the vector about (0, 0) by specified angle.
     * @method rotate
     * @param {vector} vector
     * @param {number} angle
     * @param {vector} [output]
     * @return {vector} The vector rotated about (0, 0)
     */
    Vector.rotate = (vector, angle = 0, output = {}) => {

        let cos = Math.cos(angle), 
            sin = Math.sin(angle);

        let {x: vx, y: vy} = vector;

        let x = vx * cos - vy * sin;

        output.y = vx * sin + vy * cos;
        output.x = x;

        return output;
    };

    /**
     * Rotates the vector about a specified point by specified angle.
     * @method rotateAbout
     * @param {vector} vector
     * @param {number} angle
     * @param {vector} point
     * @param {vector} [output]
     * @return {vector} A new vector rotated about the point
     */
    Vector.rotateAbout = (vector, angle = 0, point, output = {}) => {

        let cos = Math.cos(angle), 
            sin = Math.sin(angle);

        let {x: vx, y: vy} = vector;
        let {x: px, y: py} = point;


        let x = px + ((vx - px) * cos - (vy - py) * sin);

        output.y = py + ((vx - px) * sin + (vy - py) * cos);
        output.x = x;

        return output;
    };

    /**
     * Normalises a vector (such that its magnitude is `1`).
     * @method normalise
     * @param {vector} vector
     * @return {vector} A new vector normalised
     */
    Vector.normalise = (vector) => {

        let magnitude = Vector.magnitude(vector);

        if (magnitude === 0) return { x: 0, y: 0 };

        return { x: vector.x / magnitude, y: vector.y / magnitude };
    };

    /**
     * Returns the dot-product of two vectors.
     * @method dot
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The dot product of the two vectors
     */
    Vector.dot = (vecA, vecB) => (vecA.x * vecB.x) + (vecA.y * vecB.y);

    /**
     * Returns the cross-product of two vectors.
     * @method cross
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The cross product of the two vectors
     */
    Vector.cross = (vecA, vecB) => (vecA.x * vecB.y) - (vecA.y * vecB.x);

    /**
     * Returns the cross-product of three vectors.
     * @method cross3
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} vectorC
     * @return {number} The cross product of the three vectors
     */
    Vector.cross3 = (vA, vB, vC) => (vB.x - vA.x) * (vC.y - vA.y) - (vB.y - vA.y) * (vC.x - vA.x);

    /**
     * Adds the two vectors.
     * @method add
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB added
     */
    Vector.add = (vecA, vecB, output = {}) => {

        output.x = vecA.x + vecB.x;
        output.y = vecA.y + vecB.y;

        return output;
    };

    /**
     * Subtracts the two vectors.
     * @method sub
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @param {vector} [output]
     * @return {vector} A new vector of vectorA and vectorB subtracted
     */
    Vector.sub = (vecA, vecB, output = {}) => {

        output.x = vecA.x - vecB.x;
        output.y = vecA.y - vecB.y;

        return output;
    };

    /**
     * Multiplies a vector and a scalar.
     * @method mult
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector multiplied by scalar
     */
    Vector.mult = (vec, scalar) => { return { x: vec.x * scalar, y: vec.y * scalar }};

    /**
     * Divides a vector and a scalar.
     * @method div
     * @param {vector} vector
     * @param {number} scalar
     * @return {vector} A new vector divided by scalar
     */
    Vector.div = (vec, scalar) => { return { x: vec.x / scalar, y: vec.y / scalar }};

    /**
     * Returns the perpendicular vector. Set `negate` to true for the perpendicular in the opposite direction.
     * @method perp
     * @param {vector} vector
     * @param {bool} [negate=false]
     * @return {vector} The perpendicular vector
     */
    Vector.perp = (vec, negate) => {

        negate = (negate === true) ? -1 : 1;

        return { x: negate * -vec.y, y: negate * vec.x };
    };

    /**
     * Negates both components of a vector such that it points in the opposite direction.
     * @method neg
     * @param {vector} vector
     * @return {vector} The negated vector
     */
    Vector.neg = (vector) => { return { x: -vector.x, y: -vector.y }};

    /**
     * Returns the angle between the vector `vectorB - vectorA` and the x-axis in radians.
     * @method angle
     * @param {vector} vectorA
     * @param {vector} vectorB
     * @return {number} The angle in radians
     */
    Vector.angle = (vecA, vecB) => Math.atan2(vecB.y - vecA.y, vecB.x - vecA.x);

    /**
     * Temporary vector pool (not thread-safe).
     * @property _temp
     * @type {vector[]}
     * @private
     */
    Vector._temp = [
        Vector.create(), Vector.create(), 
        Vector.create(), Vector.create(), 
        Vector.create(), Vector.create()
    ];

})();