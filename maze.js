/** Helper function for better responsiveness and animation. */
function whileAsync(cond, body, chunkSize, period) {
  var chunkSize = chunkSize || 10;
  var period = period || 0;
  return new Promise(function(resolve, reject){
    var interval = setInterval(function() {
      for (var k = 0; k < chunkSize; k++) {
        if (!cond()) {
          clearInterval(interval);
          resolve();
          return;
        }
        body();
     }
    }, period);
  });
}

/** Adds a CSS class for a short time. */
function addEphemeralClass(element, className, duration) {
  var duration = duration || 1000;
  element.classList.add(className);
  setTimeout(function() {
    element.classList.remove(className);
  }, duration);
}

/** A simple point or pair. */
function Point(x, y) {
  this.x = parseInt(x);
  this.y = parseInt(y);
}

Point.prototype.equals = function(other) {
  return other.x == this.x && other.y == this.y;
}

/** Allows for using the point as a key in a set. */
Point.prototype.serialize = function() {
  return JSON.stringify([this.x, this.y]);
}

/** Checks if the point is inside bounds. */
Point.prototype.insideBounds = function(bounds) {
  return (
      (this.x >= 0 && this.x < bounds.x) &&
      (this.y >= 0 && this.y < bounds.y));
}

/** Creates a new point offset by the delta. */
Point.prototype.offset = function(delta) {
  return new Point(this.x + parseInt(delta[0]), this.y + parseInt(delta[1]));
}

/** The main game object. */
function Maze(options) {
  var options = Object.assign({
    gridElement: document.getElementById('body'),
    gridSize: new Point(20, 10),
    startPosition: new Point(0, 0),
    targetPosition: null,
    blockSize: 25,
    onSolved: function() {},
  }, options || {});

  this.gridElement = options.gridElement;
  this.blockSize = options.blockSize;
  this.onSolved = options.onSolved;
  this.bounds = options.gridSize;
  this.startPosition = options.startPosition
  this.targetPosition =  options.targetPosition || this.bounds.offset([-1, -1]);

  this.sides = ['bottom', 'right', 'top', 'left'];
  this.oppositeSides = ['top', 'left', 'bottom', 'right'];
  this.delta = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  this.keyCodeDirMap = {37: 'left', 38: 'top', 39: 'right', 40: 'bottom'};

  this.blocks = new Array(this.bounds.y);
  for (var i = 0; i < this.bounds.y; i++) {
    this.blocks[i] = new Array(this.bounds.x);
  }

  var self = this;
  document.onkeydown = function(e) {
    if (self.solving || self.solved) {
      return;
    }
    if (e.keyCode in self.keyCodeDirMap) {
      self.movePlayer(self.keyCodeDirMap[e.keyCode]);
      e.preventDefault();
    }
  };
}

/** Creates a single block and sets it's position. */
Maze.prototype.createBlock = function(p) {
  var block = document.createElement('div');
  block.classList.add('block');
  block.style.left = (p.x * this.blockSize) + 'px';
  block.style.top = (p.y * this.blockSize) + 'px';
  block.open = {left: false, top: false, bottom: false, right: false};
  return block;
}

/** Fetches a block by a given position. */
Maze.prototype.getBlock = function(point) {
  return this.blocks[point.y][point.x];
}

/** Fetches the player's position block. */
Maze.prototype.getPlayerBlock = function() {
  return this.getBlock(this.position);
}

/** Resets the game. */
Maze.prototype.reset = function() {
  if (this.solving || this.reseting) {
    return false;
  }

  this.reseting = true;
  this.position = this.startPosition;
  this.solving = false;
  this.solved = false;

  while (this.gridElement.firstChild) {
    this.gridElement.removeChild(this.gridElement.firstChild);
  }

  var fragment = document.createDocumentFragment();
  for (var x = 0; x < this.bounds.x; x++) {
    for (var y = 0; y < this.bounds.y; y++) {
      var block = this.createBlock(new Point(x, y), 25);
      this.blocks[y][x] = block;
      fragment.appendChild(block);
    }
  }
  this.gridElement.appendChild(fragment);

  this.getBlock(this.targetPosition).classList.add('target');

  var self = this;
  return this.generate().then(function() {
    self.setPlayerPosition(self.startPosition);
    self.reseting = false;
  })
}

/** Gets the valid adjacent points which were not visited. */
Maze.prototype.getAdjacents = function(point, visitedSet) {
  var adjacents = [];
  for (var i = 0; i < this.delta.length; i++) {
    var cp = point.offset(this.delta[i]);
    // We add the direction information w.r.t. the original point.
    cp.side = this.sides[i];
    cp.oppositeSide = this.oppositeSides[i];
    if (cp.insideBounds(this.bounds) && !visitedSet.has(cp.serialize())) {
      adjacents.push(cp);
    }
  }
  return adjacents;
}

/** Moves the player to the specified direction (top, left, right, bottom). */
Maze.prototype.movePlayer = function(direction) {
  var currentBlock = this.getPlayerBlock();
  var delta = this.delta[this.sides.indexOf(direction)];
  var nextPosition = this.position.offset(delta);

  if (!nextPosition.insideBounds(this.bounds)) {
    addEphemeralClass(currentBlock, 'error', 100);
    return;
  }

  if (!currentBlock.open[direction]) {
    addEphemeralClass(currentBlock, 'error', 100);
    return;
  }

  this.setPlayerPosition(nextPosition);
}

/** Sets the player's block to the specified point and checks for the goal. */
Maze.prototype.setPlayerPosition = function(position) {
  this.getPlayerBlock().classList.remove('current');
  this.position = position;
  this.getPlayerBlock().classList.add('current');
  if (!this.solved && this.position.equals(this.targetPosition)) {
    this.solved = true;
    if (!this.solving) {
      this.onSolved();
    }
  }
}

/** Generates the maze by randomly traversing and removing walls. */
Maze.prototype.generate = function() {
  var blockCount = this.bounds.x * this.bounds.y;
  var stack = [];
  var visited = new Set();
  var start = this.startPosition;
  stack.push(start);

  var i = 0;
  return whileAsync(() => visited.size < blockCount, () => {
    var point = stack[stack.length - 1];
    var ps = point.serialize();

    var block = this.getBlock(point);

    if (!visited.has(ps)) {
      visited.add(ps);
      block.dataset.index = i;
      block.classList.add('generated');
      i++;
    }

    var adjacents = this.getAdjacents(point, visited);

    if (adjacents.length == 0) {
      stack.pop();
      return;
    }

    var rand = parseInt(Math.random() * 1000);
    var np = adjacents[rand % adjacents.length]
    var ajdBlock = this.getBlock(np);
    stack.push(np);

    // Remove the wall on the current block.
    block.classList.add(np.side);
    block.open[np.side] = true;

    // And the opposite side for the adjacent block's perspective.
    ajdBlock.classList.add(np.oppositeSide);
    ajdBlock.open[np.oppositeSide] = true;
  }, 100);
}

/** Solves the maze using the BFS algorithm including simple animation. */
Maze.prototype.solve = function() {
  if (this.solving || this.reseting) {
    return;
  }

  this.solving = true;
  var startPosition = this.position;
  var visited = new Set();
  var position = startPosition;
  var queue = [position];
  var self = this;

  // The familiar BFS loop.
  return whileAsync(
      () => queue.length > 0 && !position.equals(self.targetPosition), () => {
    position = queue.shift();
    var block = self.getBlock(position);

    visited.add(position.serialize());
    block.classList.add('visited');

    for (var side in block.open) {
      if (!block.open[side]) {
        continue;
      }

      var nextPosition =
          position.offset(self.delta[self.sides.indexOf(side)]);

      if (!nextPosition.insideBounds(self.bounds) ||
          visited.has(nextPosition.serialize())) {
        continue;
      }

      // Keep track so we can traverse back using the shortest path.
      nextPosition.previous = position;
      queue.push(nextPosition);
    }
  }).then(function() {
    // Build up the shortest path.
    var path = [];
    while (!position.equals(startPosition)) {
      path.push(position);
      position = position.previous;
    };

    // Animation for showing the shortest path.
    var i = path.length;
    whileAsync(() => i > 0, () => {
      self.getBlock(path[--i]).classList.add('path');
    }, 1, 5);

    // Animation for moving the player block to the target.
    return whileAsync(() => path.length > 0, () => {
      self.setPlayerPosition(path.pop());
    }, 1, 100);
  }).then(function() {
    self.solving = false;
  });
}
