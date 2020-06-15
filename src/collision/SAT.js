/**
* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
*
* @class SAT
*/

// TODO: true circles and curves

const SAT = {};

module.exports = SAT;

const Vertices = require('../geometry/Vertices');
const Vector = require('../geometry/Vector');

(function() {

    /**
     * Detect collision between two bodies using the Separating Axis Theorem.
     * @method collides
     * @param {body} bodyA
     * @param {body} bodyB
     * @param {collision} previousCollision
     * @return {collision} collision
     */
    SAT.collides = (bodyA, bodyB, previousCollision) => {

        let overlapAB,
            overlapBA, 
            minOverlap,
            collision,
            canReusePrevCol = false;

        let _overlapAxes = SAT._overlapAxes,
            _findSupports = SAT._findSupports,
            _contains = Vertices.contains,

            vDot = Vector.dot,
            vSub = Vector.sub,
            vPerp = Vector.perp,
            vNeg = Vector.neg;

        if (previousCollision) {

            // estimate total motion
            let parentA = bodyA.parent,
                parentB = bodyB.parent;

            let {speed: speedA, angularSpeed: angularSpeedA} = parentA;
            let {speed: speedB, angularSpeed: angularSpeedB} = parentB;

            let motion = (speedA * speedA) + (angularSpeedA * angularSpeedA) + (speedB * speedB) + (angularSpeedB * angularSpeedB);

            // we may be able to (partially) reuse collision result 
            // but only safe if collision was resting
            canReusePrevCol = previousCollision && previousCollision.collided && motion < 0.2;

            // reuse collision object
            collision = previousCollision;
        } 
        else collision = { collided: false, bodyA: bodyA, bodyB: bodyB };

        if (previousCollision && canReusePrevCol) {

            // if we can reuse the collision result
            // we only need to test the previously found axis
            let axisBodyA = collision.axisBody,
                axisBodyB = axisBodyA === bodyA ? bodyB : bodyA,
                axes = [axisBodyA.axes[previousCollision.axisNumber]];

            minOverlap = _overlapAxes(axisBodyA.vertices, axisBodyB.vertices, axes);
            collision.reused = true;

            if (minOverlap.overlap <= 0) {

                collision.collided = false;
                return collision;
            }
        } 
        else {
            // if we can't reuse a result, perform a full SAT test

            let {vertices: tempVertA, axes: tempAxesA} = bodyA;
            let {vertices: tempVertB, axes: tempAxesB} = bodyB;

            overlapAB = _overlapAxes(tempVertA, tempVertB, tempAxesA);

            if (overlapAB.overlap <= 0) {

                collision.collided = false;
                return collision;
            }

            overlapBA = _overlapAxes(tempVertB, tempVertA, tempAxesB);

            if (overlapBA.overlap <= 0) {

                collision.collided = false;
                return collision;
            }

            if (overlapAB.overlap < overlapBA.overlap) {

                minOverlap = overlapAB;
                collision.axisBody = bodyA;
            } 
            else {

                minOverlap = overlapBA;
                collision.axisBody = bodyB;
            }

            // important for reuse later
            collision.axisNumber = minOverlap.axisNumber;
        }

        let {overlap: oOverlap, axis: oAxis} = minOverlap;

        collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
        collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
        collision.collided = true;
        collision.depth = oOverlap;
        collision.parentA = collision.bodyA.parent;
        collision.parentB = collision.bodyB.parent;
        
        bodyA = collision.bodyA;
        bodyB = collision.bodyB;

        let {position: bodyPosA, vertices: bodyVertA} = bodyA;
        let {position: bodyPosB, vertices: bodyVertB} = bodyB;

        // ensure normal is facing away from bodyA
        if (vDot(oAxis, vSub(bodyPosB, bodyPosA)) < 0) {

            collision.normal = {
                x: oAxis.x,
                y: oAxis.y
            };
        } 
        else {

            collision.normal = {
                x: -oAxis.x,
                y: -oAxis.y
            };
        }

        let {normal: collNormal, depth: collDepth} = collision;

        collision.tangent = vPerp(collNormal);

        collision.penetration = collision.penetration || {};
        collision.penetration.x = collNormal.x * collDepth;
        collision.penetration.y = collNormal.y * collDepth; 

        // find support points, there is always either exactly one or two
        let verticesB = _findSupports(bodyA, bodyB, collNormal),
            supports = [];

        // find the supports from bodyB that are inside bodyA
        if (_contains(bodyVertA, verticesB[0])) supports.push(verticesB[0]);

        if (_contains(bodyVertA, verticesB[1])) supports.push(verticesB[1]);

        // find the supports from bodyA that are inside bodyB
        if (supports.length < 2) {

            let verticesA = _findSupports(bodyB, bodyA, vNeg(collNormal));
                
            if (_contains(bodyVertB, verticesA[0])) supports.push(verticesA[0]);

            if (supports.length < 2 && _contains(bodyVertB, verticesA[1])) supports.push(verticesA[1]);
        }

        // account for the edge case of overlapping but no vertex containment
        if (supports.length < 1) supports = [verticesB[0]];
        
        collision.supports = supports;

        return collision;
    };

    /**
     * Find the overlap between two sets of vertices.
     * @method _overlapAxes
     * @private
     * @param {} verticesA
     * @param {} verticesB
     * @param {} axes
     * @return result
     */
    SAT._overlapAxes = (verticesA, verticesB, axes) => {

        let projectionA = Vector._temp[0], 
            projectionB = Vector._temp[1],
            result = { overlap: Number.MAX_VALUE };

        let _projectToAxis = SAT._projectToAxis;

        axes.some((axis, index) => {

            _projectToAxis(projectionA, verticesA, axis);
            _projectToAxis(projectionB, verticesB, axis);

            let overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

            if (overlap <= 0) {

                result.overlap = overlap;
                return true;
            }

            if (overlap < result.overlap) {
                result.overlap = overlap;
                result.axis = axis;
                result.axisNumber = index;
            }
            return false;
        });

        return result;
    };

    /**
     * Projects vertices on an axis and returns an interval.
     * @method _projectToAxis
     * @private
     * @param {} projection
     * @param {} vertices
     * @param {} axis
     */
    SAT._projectToAxis = (projection, vertices, axis) => {

        let vDot = Vector.dot;

        let min = vDot(vertices[0], axis),
            max = min;

        vertices.forEach(vertex => {

            let dot = vDot(vertex, axis);

            if (dot > max) max = dot; 
            else if (dot < min) min = dot; 
        });

        projection.min = min;
        projection.max = max;
    };
    
    /**
     * Finds supporting vertices given two bodies along a given direction using hill-climbing.
     * @method _findSupports
     * @private
     * @param {} bodyA
     * @param {} bodyB
     * @param {} normal
     * @return [vector]
     */
    SAT._findSupports = (bodyA, bodyB, normal) => {

        let nearestDistance = Number.MAX_VALUE,

            vertexToBody = Vector._temp[0],
            vDot = Vector.dot,

            vertices = bodyB.vertices,
            vLen = vertices.length,
            bodyAPosition = bodyA.position,

            distance, vertex, vertexA, vertexB;

        // find closest vertex on bodyB
        vertices.forEach(v => {

            vertexToBody.x = v.x - bodyAPosition.x;
            vertexToBody.y = v.y - bodyAPosition.y;

            distance = -vDot(normal, vertexToBody);

            if (distance < nearestDistance) {

                nearestDistance = distance;
                vertexA = v;
            }
        });

        // find next closest vertex using the two connected to it
        let prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vLen - 1;

        vertex = vertices[prevIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;

        nearestDistance = -vDot(normal, vertexToBody);
        vertexB = vertex;

        let nextIndex = (vertexA.index + 1) % vLen;

        vertex = vertices[nextIndex];
        vertexToBody.x = vertex.x - bodyAPosition.x;
        vertexToBody.y = vertex.y - bodyAPosition.y;

        distance = -vDot(normal, vertexToBody);

        if (distance < nearestDistance) vertexB = vertex;

        return [vertexA, vertexB];
    };

})();
