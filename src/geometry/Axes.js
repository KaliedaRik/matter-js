/**
* The `Matter.Axes` module contains methods for creating and manipulating sets of axes.
*
* @class Axes
*/

const Axes = {};

module.exports = Axes;

const Vector = require('../geometry/Vector');
const Common = require('../core/Common');

(function() {

    /**
     * Creates a new set of axes from the given vertices.
     * @method fromVertices
     * @param {vertices} vertices
     * @return {axes} A new axes from the given vertices
     */
    Axes.fromVertices = (vertices) => {

        // check to see if this function is ever used ...
        // console.log('Axes.fromVertices')

        let axes = {},
            len = vertices.length;

        // find the unique axes, using edge normal gradients
        vertices.forEach((vertex, index) => {

            let other = vertices[(index + 1) % len];

            let normal = Vector.normalise({
                x: other.y - vertex.y, 
                y: vertex.x - other.x
            });

            let gradient = (normal.y === 0) ? Infinity : (normal.x / normal.y);

            gradient = gradient.toFixed(3);
            axes[gradient] = normal;
        });

        return Common.values(axes);
    };

    /**
     * Rotates a set of axes by the given angle.
     * @method rotate
     * @param {axes} axes
     * @param {number} angle
     */
    Axes.rotate = (axes, angle = 0) => {

        // check to see if this function is ever used ...
        // console.log('Axes.rotate')

        if (angle === 0) return;
        
        let cos = Math.cos(angle),
            sin = Math.sin(angle);

        axes.forEach(axis => {

            let {x, y} = axis;

            axis.y = x * sin + y * cos;
            axis.x = x * cos - y * sin;
        });
    };

})();
