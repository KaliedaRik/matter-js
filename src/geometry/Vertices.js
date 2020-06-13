/**
* The `Matter.Vertices` module contains methods for creating and manipulating sets of vertices.
* A set of vertices is an array of `Matter.Vector` with additional indexing properties inserted by `Vertices.create`.
* A `Matter.Body` maintains a set of vertices to represent the shape of the object (its convex hull).
*
* See the included usage [examples](https://github.com/liabru/matter-js/tree/master/examples).
*
* @class Vertices
*/

const Vertices = {};

module.exports = Vertices;

const Vector = require('../geometry/Vector');
const Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of `Matter.Body` compatible vertices.
     * The `points` argument accepts an array of `Matter.Vector` points orientated around the origin `(0, 0)`, for example:
     *
     *     [{ x: 0, y: 0 }, { x: 25, y: 50 }, { x: 50, y: 0 }]
     *
     * The `Vertices.create` method returns a new array of vertices, which are similar to Matter.Vector objects,
     * but with some additional references required for efficient collision detection routines.
     *
     * Vertices must be specified in clockwise order.
     *
     * Note that the `body` argument is not optional, a `Matter.Body` reference must be provided.
     *
     * @method create
     * @param {vector[]} points
     * @param {body} body
     */
    Vertices.create = (points, body) => {

        let vertices = [];

        points.forEach((point, index) => {

            let vertex = {
                x: point.x,
                y: point.y,
                index,
                body,
                isInternal: false
            };

            vertices.push(vertex);
        });

        return vertices;
    };

    /**
     * Parses a string containing ordered x y pairs separated by spaces (and optionally commas), 
     * into a `Matter.Vertices` object for the given `Matter.Body`.
     * For parsing SVG paths, see `Svg.pathToVertices`.
     * @method fromPath
     * @param {string} path
     * @param {body} body
     * @return {vertices} vertices
     */
    Vertices.fromPath = (path, body) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.fromPath')

        let pattern = /L?\s*([-\d.e]+)[\s,]*([-\d.e]+)*/ig,
            points = [];

        path.replace(pattern, (match, x, y) => points.push({ x: parseFloat(x), y: parseFloat(y) }));

        return Vertices.create(points, body);
    };

    /**
     * Returns the centre (centroid) of the set of vertices.
     * @method centre
     * @param {vertices} vertices
     * @return {vector} The centre point
     */
    // Non-international function name will trip up non-UK-educated coders!
    Vertices.centre = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.centre')

        var area = Vertices.area(vertices, true),
            len = vertices.length,
            centre = { x: 0, y: 0 };

        vertices.forEach((vertex, index) => {

            let other = vertices[(index + 1) % len];

            let cross = Vector.cross(vertex, other);
            let temp = Vector.mult(Vector.add(vertex, other), cross);

            centre = Vector.add(centre, temp);
        });

        return Vector.div(centre, 6 * area);
    };

    /**
     * Returns the average (mean) of the set of vertices.
     * @method mean
     * @param {vertices} vertices
     * @return {vector} The average point
     */
    Vertices.mean = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.mean')

        let x = y = 0;

        vertices.forEach(vertex => {

            x += vertex.x;
            y += vertex.y;
        })

        return Vector.div({x, y}, vertices.length);
    };

    /**
     * Returns the area of the set of vertices.
     * @method area
     * @param {vertices} vertices
     * @param {bool} signed
     * @return {number} The area
     */
    Vertices.area = (vertices, signed = false) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.area')

        let area = 0,
            previous = vertices.length - 1;

        vertices.forEach((vertex, index) => {

            let other = vertices[previous];

            area += (other.x - vertex.x) * (other.y + vertex.y);
            previous = index;
        });

        if (signed) return area / 2;

        return Math.abs(area) / 2;
    };

    /**
     * Returns the moment of inertia (second moment of area) of the set of vertices given the total mass.
     * @method inertia
     * @param {vertices} vertices
     * @param {number} mass
     * @return {number} The polygon's moment of inertia
     */
    Vertices.inertia = (vertices, mass = 0) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.inertia')

        let numerator = denominator = 0,
            len = vertices.length,
            dot = Vector.dot;

        // find the polygon's moment of inertia, using second moment of area
        // from equations at http://www.physicsforums.com/showthread.php?t=25293
        vertices.forEach((vertex, index) => {

            let other = vertices[(index + 1) % len];
            let cross = Math.abs(Vector.cross(other, vertex));

            numerator += cross * (dot(other, other) + dot(other, vertex) + dot(vertex, vertex));
            denominator += cross;
        });

        return (mass / 6) * (numerator / denominator);
    };

    /**
     * Translates the set of vertices in-place.
     * @method translate
     * @param {vertices} vertices
     * @param {vector} vector
     * @param {number} scalar
     */
    Vertices.translate = (vertices, vector, scalar = 0) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.translate')

        let {x, y} = vector;

        if (scalar) {

            x *= scalar;
            y *= scalar;
        }

        vertices.forEach(vertex => {

            vertex.x += x;
            vertex.y += y;
        });

        return vertices;
    };

    /**
     * Rotates the set of vertices in-place.
     * @method rotate
     * @param {vertices} vertices
     * @param {number} angle
     * @param {vector} point
     */
    Vertices.rotate = (vertices, angle = 0, point) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.rotate')

        if (angle === 0) return;

        let {x, y} = point;

        let cos = Math.cos(angle),
            sin = Math.sin(angle);

        vertices.forEach(vertex => {

            let dx = vertex.x - x,
                dy = vertex.y - y;

            vertex.x = x + (dx * cos - dy * sin);
            vertex.y = y + (dx * sin + dy * cos);
        });

        return vertices;
    };

    /**
     * Returns `true` if the `point` is inside the set of `vertices`.
     * @method contains
     * @param {vertices} vertices
     * @param {vector} point
     * @return {boolean} True if the vertices contains point, otherwise false
     */
    Vertices.contains = (vertices, point) => {

        let {x: px, y: py} = point;
        let len = vertices.length;

        return vertices.every((vertex, index) => {

            let {x, y} = vertex;
            let next = vertices[(index + 1) % len];

            let test = (px - x) * (next.y - y) + (py - y) * (x - next.x)

            if (test < 0) return true;
            return false;
        });
    };

    /**
     * Scales the vertices from a point (default is centre) in-place.
     * @method scale
     * @param {vertices} vertices
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {vector} point
     */
    Vertices.scale = (vertices, scaleX = 1, scaleY = 1, point = false) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.scale')

        if (scaleX == 1 && scaleY == 1) return vertices;

        point = point || Vertices.centre(vertices);

        let {x, y} = point;
        let sub = Vector.sub;

        vertices.forEach(vertex => {

            let delta = sub(vertex, point);

            vertex.x = x + delta.x * scaleX;
            vertex.y = y + delta.y * scaleY;
        });

        return vertices;
    };

    /**
     * Chamfers a set of vertices by giving them rounded corners, returns a new set of vertices.
     * The radius parameter is a single number or an array to specify the radius for each vertex.
     * @method chamfer
     * @param {vertices} vertices
     * @param {number[]} radius
     * @param {number} quality
     * @param {number} qualityMin
     * @param {number} qualityMax
     */
    Vertices.chamfer = (vertices, radius = 8, quality = -1, qualityMin = 2, qualityMax = 14) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.chamfer')

        if (!Array.isArray(radius)) radius = [radius];

        let newVertices = [],
            len = vertices.length;

        vertices.forEach((vertex, index) => {

            let previous = vertices[index - 1 >= 0 ? index - 1 : len - 1],
                next = vertices[(index + 1) % len];

            let currentRadius = radius[index < radius.length ? index : radius.length - 1];

            if (currentRadius == 0) newVertices.push(vertex);
            else {

                let previousNormal = Vector.normalise({
                    x: vertex.y - previous.y, 
                    y: previous.x - vertex.x
                });

                let nextNormal = Vector.normalise({
                    x: next.y - vertex.y, 
                    y: vertex.x - next.x
                });

                let diagonalRadius = Math.sqrt(2 * Math.pow(currentRadius, 2));

                let radiusVector = Vector.mult(Common.clone(previousNormal), currentRadius);

                let midNormal = Vector.normalise(Vector.mult(Vector.add(previousNormal, nextNormal), 0.5));

                let scaledVertex = Vector.sub(vertex, Vector.mult(midNormal, diagonalRadius));

                let precision = quality;

                if (quality == -1) precision = Math.pow(currentRadius, 0.32) * 1.75;

                precision = Common.clamp(precision, qualityMin, qualityMax);

                // use an even value for precision, more likely to reduce axes by using symmetry
                if (precision % 2 == 1) precision++;

                let alpha = Math.acos(Vector.dot(previousNormal, nextNormal)),
                    theta = alpha / precision;

                for (let j = 0; j < precision; j++) {

                    newVertices.push(Vector.add(Vector.rotate(radiusVector, theta * j), scaledVertex));
                }
            }
        });
        return newVertices;
    };

    /**
     * Sorts the input vertices into clockwise order in place.
     * @method clockwiseSort
     * @param {vertices} vertices
     * @return {vertices} vertices
     */
    Vertices.clockwiseSort = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.clockwiseSort')

        let center = Vertices.mean(vertices),
            angle = Vector.angle;

        vertices.sort((A, B) => angle(center, A) - angle(center, B));

        return vertices;
    };

    /**
     * Returns true if the vertices form a convex shape (vertices must be in clockwise order).
     * @method isConvex
     * @param {vertices} vertices
     * @return {bool} `true` if the `vertices` are convex, `false` if not (or `null` if not computable).
     */
    Vertices.isConvex = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.isConvex')

        // http://paulbourke.net/geometry/polygonmesh/
        // Copyright (c) Paul Bourke (use permitted)
        let len = vertices.length,
            flag = 0;

        if (len < 3) return null;

        let checkForThree = vertices.every((A, index) => {

            let B = vertices[(index + 1) % len],
                C = vertices[(index + 2) % len];

            let test = (B.x - A.x) * (C.y - B.y);
            test -= (B.y - A.y) * (C.x - B.x);

            if (test < 0) flag |= 1;
            else if (test > 0) flag |= 2;

            if (flag == 3) return false;
            return true;
        });

        if (!checkForThree) return false;

        if (flag != 0) return true;
        return null;
    };

    /**
     * Returns the convex hull of the input vertices as a new array of points.
     * @method hull
     * @param {vertices} vertices
     * @return [vertex] vertices
     */
    Vertices.hull = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Vertices.hull')

        // http://geomalgorithms.com/a10-_hull-1.html
        let U = [],
            L = [];

        // sort vertices on x-axis (y-axis for ties)
        vertices = vertices.slice(0);

        vertices.sort((A, B) => {

            let dx = A.x - B.x;
            return (dx != 0) ? dx : A.y - B.y;
        });

        let len = vertices.length,
            x3 = Vector.cross3,
            vertex, i;

        // build lower hull
        for (i = 0; i < len; i++) {

            vertex = vertices[i];

            while (L.length >= 2 && x3(L[L.length - 2], L[L.length - 1], vertex) <= 0) {

                L.pop();
            }
            L.push(vertex);
        }

        // build upper hull
        for (i = len - 1; i >= 0; i--) {

            vertex = vertices[i];

            while (U.length >= 2 && x3(U[U.length - 2], U[U.length - 1], vertex) <= 0) {

                U.pop();
            }
            U.push(vertex);
        }

        // concatenation of the lower and upper hulls gives the convex hull
        // omit last points because they are repeated at the beginning of the other list
        U.pop();
        L.pop();

        return U.concat(L);
    };

})();
