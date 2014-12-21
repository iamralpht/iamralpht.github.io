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
    equal: function(a, b) { return b - a; }
};

function MotionConstraint(variable, op, value, physicsModel) {
    this.variable = variable;
    this.value = value;
    this.op = op;
    this.physicsModel = physicsModel;
}
