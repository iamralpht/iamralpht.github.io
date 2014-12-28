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
    equal: function(a, b) { return b - a; }
};

function MotionConstraint(variable, op, value, overdragCoefficient, physicsModel) {
    this.variable = variable;
    this.value = value;
    if (typeof op === 'string') {
        switch (op) {
        case '==': this.op = mc.equal; break;
        case '>=': this.op = mc.greater; break;
        case '<=': this.op = mc.less; break;
        case '<': this.op = mc.l; break;
        case '>': this.op = mc.g; break;
        }
    } else {
        this.op = op;
    }
    this.overdragCoefficient = overdragCoefficient || 0.75;
    this.physicsModel = physicsModel;
}
MotionConstraint.prototype.delta = function() {
    return this.op(this.variable, this.value, false);
}
MotionConstraint.prototype.deltaFromAnimation = function(velocity) {
    return this.op(this.variable, this.value, true, velocity);
}
