'use strict';

// Motion constraint definition

// These are the ops; they return the delta when not met.
var mc = {
    greater: function(a, b) {
            if (a >= b) return 0;
            return b - a;
        },
    less: function(a, b) {
        if (a <= b) return 0;
        return b - a;
    },
    l: function(a, b) {
        if (a < b) return 0;
        return b - a;
    },
    g: function(a, b) {
        if (a > b) return 0;
        return b - a;
    },
    equal: function(a, b) { return b - a; },
    modulo: function(a, b, naturalEndPosition) {
        var nearest = b * Math.round(naturalEndPosition/b);
        return nearest - a;
    },
    // Like modulo, but only snaps to the current or adjacent values. Really good for pagers.
    adjacentModulo: function(a, b, naturalEndPosition, gestureStartPosition) {
        if (gestureStartPosition === undefined) return mc.modulo(a, b, naturalEndPosition);

        var startNearest = Math.round(gestureStartPosition/b);
        var endNearest = Math.round(naturalEndPosition/b);

        var difference = endNearest - startNearest;

        // Make the difference at most 1, so that we're only going to adjacent snap points.
        if (difference) difference /= Math.abs(difference);

        var nearest = (startNearest + difference) * b;

        return nearest - a;
    },
    // A range, where by default every value is disallowed. You can add allowed ranges or values
    // to the range. It's like a single span from a region.
    range: function() {
        function Range() {
            this._keys = [];
        }
        Range.prototype.addAllowedRange = function(start, end) {
            this._keys.push([start, end]);
            this._sort();
        }
        Range.prototype.addAllowedValue = function(value) {
            this.addAllowedRange(value, value);
        }
        Range.prototype._sort = function() {
            this._keys.sort(function(a, b) { return a[0] - b[0]; });
        }
        Range.prototype.op = function(a, b, end) {
            if (this._keys.length == 0) return 0;
            // The value starts out invalid. Now we walk the keys and see if it's in a valid section.
            var closest = 0;
            for (closest = 0; closest < this._keys.length; closest++) {
                if (this._keys[closest][0] == end) return 0;
                if (this._keys[closest][1] == end) return 0;

                // If we're inside this pair then we're out of violation.
                if (this._keys[closest][0] <= end && this._keys[closest][1] >= end) return 0;

                // If we're past this pair then keep going.
                if (this._keys[closest][1] < end) continue;
                // If this is the first one past our value then it's the "closest" for now
                if (this._keys[closest][0] >= end) break;
            }
            // If we got here then we're in an invalid range and need to find our way back to the closest.
            if (closest > this._keys.length - 1) closest = this._keys.length - 1;
            var distA = this._keys[closest][0] - end;
            var distB = this._keys[closest][1] - end;
            var dist = Math.min(distA, distB);
            return a - (dist + end);
        }

        return new Range();
    }
};

function MotionConstraint(variable, op, value, options) {
    this.variable = variable;
    this.value = value;
    if (typeof op === 'string') {
        switch (op) {
        case '==': this.op = mc.equal; break;
        case '>=': this.op = mc.greater; break;
        case '<=': this.op = mc.less; break;
        case '<': this.op = mc.l; break;
        case '>': this.op = mc.g; break;
        case '%': this.op = mc.modulo; break;
        }
    } else {
        this.op = op;
    }
    if (!options) options = {};
    this.overdragCoefficient = options.hasOwnProperty('overdragCoefficient') ? options.overdragCoefficient : 0.75;
    this.physicsModel = options.physicsModel;
    this.captive = options.captive || false;
}
// Some random physics models to use in options. Not sure these belong here.
MotionConstraint.underDamped = function() { return new Spring(1, 200, 20); }
MotionConstraint.criticallyDamped = function() { return new Spring(1, 200, Math.sqrt(4 * 1 * 200)); }
MotionConstraint.prototype.delta = function(naturalEndPosition, gestureStartPosition) {
    if (!naturalEndPosition) naturalEndPosition = this.variable;

    return this.op(this.variable, this.value, naturalEndPosition, gestureStartPosition);
}
MotionConstraint.prototype.createMotion = function(startPosition) {
    var motion = this.physicsModel ? this.physicsModel() : new Spring(1, 200, 20);//Math.sqrt(200 * 4));
    motion.snap(startPosition);
    return motion;
}
