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
    // This is an animation-only constraint. Need a better way to declare what these
    // are and why (maybe the animation detection needs to move to the MotionConstraint
    // rather than being in the op?).
    modulo: function(a, b, velocity) {
        // This is bogus; we're just inventing some friction constant and assuming that
        // this is what the manipulator is using. We probably need the manipulator to
        // tell us the end point or local minima/maxima so that we can decide which
        // direction we're going to trigger in from that...
        //
        // XXX: Move this end-position computation out to the manipulator. We might be
        //      interested in the start, current and projected end, but we shouldn't care
        //      about velocity or physics particularly here...
        //
        // This is correct for pagers and things where the manipulator is actually using
        // this friction value, though.
        //
        var end = a;
        if (velocity) {
            var friction = new Friction(0.001);
            friction.set(a, velocity);
            // We say that the end is after 60sec. We should compute the end time but it
            // requires a numerical method (like newton-raphson) for springs, so we just
            // give it a "big" time instead.
            end = friction.x(60);
        }
        // Where is the end point closest to?
        var nearest = b * Math.round(end/b);
        return nearest - a;
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
    this.overdragCoefficient = options.overdragCoefficient || 0.75;
    this.physicsModel = options.physicsModel;
    this.captive = options.captive || false;
}
// Some random physics models to use in options. Not sure these belong here.
MotionConstraint.underDamped = function() { return new Spring(1, 200, 20); }
MotionConstraint.criticallyDamped = function() { return new Spring(1, 200, Math.sqrt(4 * 1 * 200)); }
MotionConstraint.prototype.delta = function(velocity) {
    return this.op(this.variable, this.value, velocity);
}
MotionConstraint.prototype.createMotion = function(startPosition) {
    var motion = this.physicsModel ? this.physicsModel() : new Spring(1, 200, 20);//Math.sqrt(200 * 4));
    motion.snap(startPosition);
    return motion;
}
