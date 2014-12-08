// Twitter scrolling and bunching example. A bit like Android notifications.

// Helpers to make cassowary.js a bit clearer.
var weak = c.Strength.weak;
var medium = c.Strength.medium;
var strong = c.Strength.strong;
var required = c.Strength.required;

var eq  = function(a1, a2, strength, w) {
  return new c.Equation(a1, a2, strength || weak, w||0);
};
var neq = function(a1, a2, a3) { return new c.Inequality(a1, a2, a3); };
var geq = function(a1, a2, str, w) { return new c.Inequality(a1, c.GEQ, a2, str, w); };
var leq = function(a1, a2, str, w) { return new c.Inequality(a1, c.LEQ, a2, str, w); };

var stay = function(v, strength, weight) {
  return new c.StayConstraint(v, strength||weak, weight||0);
};
var weakStay =     function(v, w) { return stay(v, weak,     w||0); };
var mediumStay =   function(v, w) { return stay(v, medium,   w||0); };
var strongStay =   function(v, w) { return stay(v, strong,   w||0); };
var requiredStay = function(v, w) { return stay(v, required, w||0); };


/*
 * XXX: Note while reading this that the concept of a "motion constraint" isn't
 *      abstracted fully yet; this is coming soon!
 */
// Ops for motion constraints.
var mc = {
    greater: function(a, b) { return a >= b; },
    less: function(a, b) { return a <= b; },
    equal: function(a, b) { return a == b; },
};
// Generate a function that updates a UI when the constraint solver has run. It
// also enforces motion constraints.
function updater(boxes, motionConstraints) {
    function resolveMotionConstraints(manipulator) {
        for (var i = 0; i < motionConstraints.length; i++) {
            var pc = motionConstraints[i];
            if (pc.op(pc.variable.valueOf(), pc.value))
                continue;

            manipulator.hitConstraint(pc);
        }
    }

    function update(manipulator) {
        resolveMotionConstraints(manipulator);
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].update();
        }
    }

    return update;
}

// Data model. Fake tweets, some with media attributes to make them sticky.
var model = [
    {
        user: 'ralph thomas',
        content: 'Check out my new article http://iamralpht.github.io/',
        type: 'url',
    },
    {
        user: 'Rachael Nabors',
        content: "I'm not sure how you make passive income on web animation?"
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'Thom Yorke',
        content: "Preview of our new album",
        type: 'audio',
    },
    {
        user: 'Blender.org',
        content: "Announcing our new video",
        type: 'video'
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'xyz',
        content: 'More text content. 1 2 3.'
    },
    {
        user: 'xyz',
        content: 'More text content.'
    },
    {
        user: 'ralph thomas',
        content: 'Is there some fake tweet generator somewhere?'
    },
];

var zIndex = 1;

// Make a tweet display nested in a box controlled by constraint layout.
function makeTweet(tweet, solver, update) {
    var box = new Box();
    box.right = 300;
    box.height = 65;

    box.element().classList.add('tweet');

    // Make content.
    var photo = document.createElement('div');
    photo.className = 'photo';
    box.element().appendChild(photo);

    var text = document.createElement('div');
    text.className = 'text';
    var user = document.createElement('div');
    user.className = 'username';
    user.textContent = tweet.user;
    text.appendChild(user);
    var tweetText = document.createElement('span');
    tweetText.textContent = tweet.content;
    text.appendChild(tweetText);
    box.element().appendChild(text);

    if (tweet.type == 'audio') {
        var audioControls = document.createElement('div');
        audioControls.className = 'audio';
        audioControls.textContent = 'PLAY AUDIO';
        addTouchOrMouseListener(audioControls, {
            onTouchEnd: function() {
                if (this._constraints) {
                    for (var i = 0; i < this._constraints.length; i++) {
                        solver.removeConstraint(this._constraints[i]);
                    }
                    this._constraints = null;
                    solver.solve();
                    box.element().style.zIndex = 'none';
                    audioControls.textContent = 'PLAY AUDIO';
                    return;
                }
                // Pin the opened tweet to be inside the scroll area.
                this._constraints = [
                    geq(box.y, 0, medium),
                    leq(box.bottom, 420, medium)
                ];
                for (var i = 0; i < this._constraints.length; i++) {
                    solver.add(this._constraints[i]);
                }
                solver.solve();
                box.element().style.zIndex = (++zIndex);
                audioControls.textContent = 'STOP AUDIO';
            }});
        box.element().appendChild(audioControls);
    }

    return box;
}

function makeTwitterExample(parentElement) {
    var solver = new c.SimplexSolver();
    var tweets = [];
    var motionConstraints = [];
    var update = updater(tweets, motionConstraints);

    var scrollPosition = new c.Variable();

    for (var i = 0; i < model.length * 10; i++) {
        var tweetModel = model[i % model.length];

        var tweet = makeTweet(tweetModel, solver, update);
        parentElement.appendChild(tweet.element());

        tweet.y = new c.Variable();
        tweet.bottom = new c.Variable();

        // Add some constraints so that this tweet appears under the
        // previous tweet and attached to the scroll position.
        if (i > 0) {
            solver.add(eq(tweet.y, c.plus(scrollPosition, i * 90), weak));
        } else {
            solver.add(eq(tweet.y, scrollPosition, weak));
        }
        // Make the tweet 65 tall. This is clumsily represented; messes with box sizing currently.
        solver.add(eq(tweet.bottom, c.plus(tweet.y, 90), medium));

        tweets.push(tweet);
    }

    // Don't scroll over the ends.
    motionConstraints.push({
        variable: tweets[0].y,
        value: 0,
        op: mc.less
    });
    motionConstraints.push({
        variable: tweets[tweets.length - 1].bottom,
        value: 420,
        op: mc.greater
    });

    new Manipulable(scrollPosition, solver, update, parentElement, 'y');
}

makeTwitterExample(document.getElementById('timeline'));
