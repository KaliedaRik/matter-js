/**
* The `Matter.Grid` module contains methods for creating and manipulating collision broadphase grid structures.
*
* @class Grid
*/

const Grid = {};

module.exports = Grid;

const Pair = require('./Pair');
const Detector = require('./Detector');
const Common = require('../core/Common');

(function() {

    /**
     * Creates a new grid.
     * @method create
     * @param {} options
     * @return {grid} A new grid
     */
    Grid.create = (options) => {

        // check to see if this function is ever used ...
        // console.log('Grid.create')

        let defaults = {
            controller: Grid,
            detector: Detector.collisions,
            buckets: {},
            pairs: {},
            pairsList: [],
            bucketWidth: 48,
            bucketHeight: 48
        };

        return Common.extend(defaults, options);
    };

    /**
     * The width of a single grid bucket.
     *
     * @property bucketWidth
     * @type number
     * @default 48
     */

    /**
     * The height of a single grid bucket.
     *
     * @property bucketHeight
     * @type number
     * @default 48
     */

    /**
     * Updates the grid.
     * @method update
     * @param {grid} grid
     * @param {body[]} bodies
     * @param {engine} engine
     * @param {boolean} forceUpdate
     */
    Grid.update = function(grid, bodies, engine, forceUpdate) {
        var i, col, row,
            world = engine.world,
            buckets = grid.buckets,
            bucket,
            bucketId,
            gridChanged = false;

        // @if DEBUG
        var metrics = engine.metrics;
        metrics.broadphaseTests = 0;
        // @endif

        for (i = 0; i < bodies.length; i++) {
            var body = bodies[i];

            if (body.isSleeping && !forceUpdate)
                continue;

            // don't update out of world bodies
            if (body.bounds.max.x < world.bounds.min.x || body.bounds.min.x > world.bounds.max.x
                || body.bounds.max.y < world.bounds.min.y || body.bounds.min.y > world.bounds.max.y)
                continue;

            var newRegion = Grid._getRegion(grid, body);

            // if the body has changed grid region
            if (!body.region || newRegion.id !== body.region.id || forceUpdate) {

                // @if DEBUG
                metrics.broadphaseTests += 1;
                // @endif

                if (!body.region || forceUpdate)
                    body.region = newRegion;

                var union = Grid._regionUnion(newRegion, body.region);

                // update grid buckets affected by region change
                // iterate over the union of both regions
                for (col = union.startCol; col <= union.endCol; col++) {
                    for (row = union.startRow; row <= union.endRow; row++) {
                        bucketId = Grid._getBucketId(col, row);
                        bucket = buckets[bucketId];

                        var isInsideNewRegion = (col >= newRegion.startCol && col <= newRegion.endCol
                                                && row >= newRegion.startRow && row <= newRegion.endRow);

                        var isInsideOldRegion = (col >= body.region.startCol && col <= body.region.endCol
                                                && row >= body.region.startRow && row <= body.region.endRow);

                        // remove from old region buckets
                        if (!isInsideNewRegion && isInsideOldRegion) {
                            if (isInsideOldRegion) {
                                if (bucket)
                                    Grid._bucketRemoveBody(grid, bucket, body);
                            }
                        }

                        // add to new region buckets
                        if (body.region === newRegion || (isInsideNewRegion && !isInsideOldRegion) || forceUpdate) {
                            if (!bucket)
                                bucket = Grid._createBucket(buckets, bucketId);
                            Grid._bucketAddBody(grid, bucket, body);
                        }
                    }
                }

                // set the new region
                body.region = newRegion;

                // flag changes so we can update pairs
                gridChanged = true;
            }
        }

        // update pairs list only if pairs changed (i.e. a body changed region)
        if (gridChanged)
            grid.pairsList = Grid._createActivePairsList(grid);
    };

    /**
     * Clears the grid.
     * @method clear
     * @param {grid} grid
     */
    Grid.clear = (grid) => {

        // check to see if this function is ever used ...
        // console.log('Grid.clear')

        grid.buckets = {};
        grid.pairs = {};
        grid.pairsList = [];
    };

    /**
     * Finds the union of two regions.
     * @method _regionUnion
     * @private
     * @param {} regionA
     * @param {} regionB
     * @return {} region
     */
    Grid._regionUnion = (regionA, regionB) => {

        // check to see if this function is ever used ...
        // console.log('Grid._regionUnion')

        let min = Math.min,
            max = Math.max;

        let startCol = min(regionA.startCol, regionB.startCol),
            endCol = max(regionA.endCol, regionB.endCol),
            startRow = min(regionA.startRow, regionB.startRow),
            endRow = max(regionA.endRow, regionB.endRow);

        return Grid._createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Gets the region a given body falls in for a given grid.
     * @method _getRegion
     * @private
     * @param {} grid
     * @param {} body
     * @return {} region
     */
    Grid._getRegion = (grid, body) => {

        // check to see if this function is ever used ...
        // console.log('Grid._getRegion')

        let {bucketWidth, bucketHeight} = grid;
        let {min, max} = body.bounds;

        let floor = Math.floor;

        let startCol = floor(min.x / bucketWidth),
            endCol = floor(max.x / bucketWidth),
            startRow = floor(min.y / bucketHeight),
            endRow = floor(max.y / bucketHeight);

        return Grid._createRegion(startCol, endCol, startRow, endRow);
    };

    /**
     * Creates a region.
     * @method _createRegion
     * @private
     * @param {} startCol
     * @param {} endCol
     * @param {} startRow
     * @param {} endRow
     * @return {} region
     */
    Grid._createRegion = (startCol, endCol, startRow, endRow) => {

        return { 
            id: `${startCol},${endCol},${startRow},${endRow}`,
            startCol: startCol, 
            endCol: endCol, 
            startRow: startRow, 
            endRow: endRow 
        };
    };

    /**
     * Gets the bucket id at the given position.
     * @method _getBucketId
     * @private
     * @param {} column
     * @param {} row
     * @return {string} bucket id
     */
    Grid._getBucketId = (column, row) => `C${column}R${row}`;

    /**
     * Creates a bucket.
     * @method _createBucket
     * @private
     * @param {} buckets
     * @param {} bucketId
     * @return {} bucket
     */
    Grid._createBucket = (buckets, bucketId) => {

        let bucket = buckets[bucketId] = [];

        return bucket;
    };

    /**
     * Adds a body to a bucket.
     * @method _bucketAddBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    Grid._bucketAddBody = (grid, bucket, body) => {

        // check to see if this function is ever used ...
        // console.log('Grid._bucketAddBody')

        let {pairs} = grid;

        let getPairId = Pair.id;

        // add new pairs
        bucket.forEach(bodyB => {

            if (!(body.id === bodyB.id || (body.isStatic && bodyB.isStatic))) {

                let pairId = getPairId(body, bodyB),
                    pair = pairs[pairId];

                if (pair) pair[2] += 1;
                else pairs[pairId] = [body, bodyB, 1];
            }
        });

        // add to bodies (after pairs, otherwise pairs with self)
        bucket.push(body);
    };

    /**
     * Removes a body from a bucket.
     * @method _bucketRemoveBody
     * @private
     * @param {} grid
     * @param {} bucket
     * @param {} body
     */
    Grid._bucketRemoveBody = (grid, bucket, body) => {

        // check to see if this function is ever used ...
        // console.log('Grid._bucketRemoveBody')

        let {pairs} = grid;

        let getPairId = Pair.id;

        // remove from bucket
        bucket.splice(Common.indexOf(bucket, body), 1);

        // update pair counts
        bucket.forEach(bodyB => {

            // keep track of the number of buckets the pair exists in
            // important for _createActivePairsList to work
            let pairId = getPairId(body, bodyB),
                pair = pairs[pairId];

            if (pair) pair[2] -= 1;
        });
    };

    /**
     * Generates a list of the active pairs in the grid.
     * @method _createActivePairsList
     * @private
     * @param {} grid
     * @return [] pairs
     */
    Grid._createActivePairsList = (grid) => {

        // check to see if this function is ever used ...
        // console.log('Grid._createActivePairsList')

        let pairs = [];

        // grid.pairs is used as a hashmap
        let gridPairs = grid.pairs,
            pairKeys = Common.keys(gridPairs);

        // iterate over grid.pairs
        pairKeys.forEach(key => {

            let pair = gridPairs[key];

            if (pair[2] > 0) pairs.push(pair);
            else delete gridPairs[key];
        });
        
        return pairs;
    };
    
})();
