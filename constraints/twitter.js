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
            if (pc.op(Math.round(pc.variable.valueOf()), Math.round(pc.value)))
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

// This object manages the list of tweets that are currently opened and
// ensures that they all have good constraints.
function OpenedTweets(solver, update, motionConstraints) {
    this._solver = solver;
    this._update = update;
    this._tweets = [];
    this._spacing = new c.Variable();
    solver.add(geq(this._spacing, 6, medium));

    motionConstraints.push({
        variable: this._spacing,
        value: 6,
        op: mc.greater
    });
    motionConstraints.push({
        variable: this._spacing,
        value: 90,
        op: mc.less
    });

    this._dimmer = document.createElement('div');
    this._dimmer.className = 'dimmer';
}
OpenedTweets.prototype.makeInteractive = function(index, box, button) {
    var solver = this._solver;
    var tweet = {
        index: index,
        box: box,
        button: button,
        constraints: null,
        selected: false
    };
    this._tweets.push(tweet);
    var self = this;

    // Make it manipulable too, so that it can control the expansion by being
    // dragged. We use the pointer-events style to ensure that it only does
    // this when it's in the sticky state (though it should only do it when
    // its sticky and stuck to the top).
    new Manipulable(this._spacing, this._solver, this._update, box.element(), 'y');

    // Attempt at a button; should actually do proper gesture detection and not
    // eat events if it looks like a drag...
    addTouchOrMouseListener(button, {
        onTouchEnd: function() {
            if (tweet.selected) self._unselectTweet(tweet);
            else self._selectTweet(tweet);
        }});
}
OpenedTweets.prototype._selectTweet = function(tweet) {
    var e = tweet.box.element();
    e.style.zIndex = tweet.index + 1;
    e.classList.add('sticky');
    tweet.button.textContent = 'STOP AUDIO';
    tweet.selected = true;

    this._reconstrain();
}
OpenedTweets.prototype._unselectTweet = function(tweet) {
    var e = tweet.box.element();
    e.style.zIndex = 0;
    e.classList.remove('sticky');
    tweet.button.textContent = 'PLAY AUDIO';
    tweet.selected = false;

    this._reconstrain();
}
OpenedTweets.prototype._reconstrain = function() {
    var selected = [];

    for (var i = 0; i < this._tweets.length; i++) {
        var t = this._tweets[i];
        if (t.selected) selected.push(t);
        if (!t.constraints) continue;
        for (var k = 0; k < t.constraints.length; k++) {
            this._solver.removeConstraint(t.constraints[k]);
        }
        t.constraints = null;
    }
    selected.sort(function(a, b) { return a.index - b.index; });
    for (var i = 0; i < selected.length; i++) {
        var t = selected[i];
        t.constraints = [
            geq(t.box.y, c.times(i, this._spacing), medium),
            leq(t.box.bottom, 420 - (selected.length - i - 1) * 6, medium)
        ];
        for (var k = 0; k < t.constraints.length; k++)
            this._solver.addConstraint(t.constraints[k]);
    }
    this._solver.solve();
}
OpenedTweets.prototype.update = function() {
    var spacing = this._spacing.valueOf();
    var showDimmer = spacing > 30;

    if (showDimmer == this._lastShowDimmer) return;
    this._lastShowDimmer = showDimmer;
    if (showDimmer) this._dimmer.classList.add('show');
    else this._dimmer.classList.remove('show');
}
OpenedTweets.prototype.element = function() { return this._dimmer; }


// Make a tweet display nested in a box controlled by constraint layout.
function makeTweet(index, tweet, openedTweets) {
    var box = new Box();
    box.right = 320;
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
        box.element().classList.add('audio-tweet');
        
        var progress = document.createElement('div');
        progress.className = 'progress';
        box.element().appendChild(progress);

        var audioControls = document.createElement('div');
        audioControls.className = 'button';
        audioControls.textContent = 'PLAY AUDIO';
        box.element().appendChild(audioControls);

        openedTweets.makeInteractive(index, box, audioControls);
    }

    return box;
}

function makeTwitterExample(parentElement) {
    var solver = new MultiEditSolver(new c.SimplexSolver());
    var tweets = [];
    var motionConstraints = [];
    var update = updater(tweets, motionConstraints);
    var openedTweets = new OpenedTweets(solver, update, motionConstraints);

    parentElement.appendChild(openedTweets.element());

    var scrollPosition = new c.Variable();

    for (var i = 0; i < model.length * 10; i++) {
        var tweetModel = model[i % model.length];

        var tweet = makeTweet(i, tweetModel, openedTweets);
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

    // Let openedTweets get an update message when the solver runs so that it
    // can show/hide its dimming layer. Super need more state control from
    // state controlling active constraints to constraints driving state (not
    // sure how to avoid cycles though).
    tweets.push(openedTweets);

    new Manipulable(scrollPosition, solver, update, parentElement, 'y');
}

makeTwitterExample(document.getElementById('timeline'));
