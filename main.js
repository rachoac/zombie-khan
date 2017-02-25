//////////////////////////////////////////////////////////////////////////

var idCounter = 0;
var robotCount = 5;
var treeCount = 23;
var score = 0;

//////////////////////////////////////////////////////////////////////////
var Bounds = function(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.width = this.x2 - this.x1;
    this.height = this.y2 - this.y1;
};
Bounds.prototype.collision = function(other) {
    return !(other.x1 > this.x2 || other.x2 < this.x1 || other.y1 > this.y2 || other.y2 < this.y1);
};
Bounds.prototype.recompute = function() {
    this.width = this.x2 - this.x1;
    this.height = this.y2 - this.y1;
};

//// 
var Tile = function() {
    this.x = 0;
    this.y = 0;
    this.id = ++idCounter;
    this.lastBounds = new Bounds();
};
Tile.prototype.setPosition = function(x, y) {  this.x = x; this.y = y; };
Tile.prototype.update = function() {};
Tile.prototype.calcBounds = function(x, y) { return this.lastBounds; };
Tile.prototype.getBounds = function() {
    var x = this.x;
    var y = this.y;

    if (this.lastBounds && this.lastX === x && this.lastY === y) {
        return this.lastBounds;
    }

    this.lastX = x;
    this.lastY = y;

    this.lastBounds = this.calcBounds(x, y);
    return this.lastBounds;
};

//////////////////////////////////////////////////////////////////////////
var Tree = function(color, height) {
    Tile.call(this);
    this.color = color;
    this.height = height;
};
Tree.prototype = Object.create(Tile.prototype);
Tree.prototype.render = function() {
    var x = this.x;
    var y = this.y;
    var height = this.height;
    var color = this.color;
    stroke(0, 0, 0);
    fill(102, 0, 39);
    rect(x, y - height, height/8, height);
    fill(color.r, color.g, color.b);
    ellipse(x + height/16, y - height, height/2, height/2);
};
Tree.prototype.calcBounds = function(x, y) {
    var height = this.height;
    var boundWidth = height * 0.25;
    var boundX = x - boundWidth * 0.05;
    var boundY = y - height * 0.12;
    var boundX2 = boundX + height * 0.15;
    var boundY2 = boundY + height * 0.12;
    this.lastBounds.x1 = boundX;
    this.lastBounds.y1 = boundY;
    this.lastBounds.x2 = boundX2;
    this.lastBounds.y2 = boundY2;
    this.lastBounds.recompute();

    return this.lastBounds;
};
//////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////
var Entity = function(color, height, speed, engine) {
    Tile.call(this);
    this.color = color;
    this.height = height;
    this.speed = speed;
    this.engine = engine;
    this.tilesContainer = engine.tilesContainer;
};
Entity.prototype = Object.create(Tile.prototype);
Entity.prototype.setTarget = function(x, y) { this.targetX = x; this.targetY = y; };
Entity.prototype.setTargetEntity = function(entity) { this.targetEntity = entity; };
Entity.prototype.render = function() {};
Entity.prototype.onCollision = function() {};
Entity.prototype.onTargetMet = function() {};
Entity.prototype.calcDistance = function(x1, y1, x2, y2) {
    var a = x1 - x2;
    var b = y1 - y2;

    return Math.sqrt( a*a + b*b );
};
Entity.prototype.update = function(tilesContainer) {
    var x = this.x;
    var y = this.y;
    var targetX = this.targetX;
    var targetY = this.targetY;
    if (this.targetEntity) {
        targetX = this.targetEntity.x;
        targetY = this.targetEntity.y;
    }

    if (x === targetX && y === targetY) {
        this.onTargetMet(tilesContainer);
        return;
    }

    var newX = x;
    var newY = y;

    if ( x < targetX ) {
        newX += this.speed;
    }
    if ( x > targetX ) {
        newX -= this.speed;
    }
    if ( y < targetY ) {
        newY += this.speed;
    }
    if ( y > targetY ) {
        newY -= this.speed;
    }

    var distance1 = this.calcDistance(x, y, targetX, targetY);
    var distance2 = this.calcDistance(newX, newY, targetX, targetY);

    if (distance2 > distance1) {
        newX = targetX;
        newY = targetY;
    }

    if (tilesContainer.collisionAt(this, newX, newY)) {
        this.onCollision(tilesContainer);
        return;
    }
    this.setPosition(newX, newY);

    return true;
};
Entity.prototype.collisionDetector = function(x, y, otherTile, tilesContainer) {
    var targetBounds;
    if (this.lastX === x && this.lastY === y) {
        targetBounds = this.getBounds();
    } else {
        targetBounds = this.calcBounds(x, y);
    }
    if (otherTile.id === this.id) {
        return false;
    }
    var tileBounds = otherTile.getBounds();
    if (targetBounds.collision(tileBounds)) {
        var tileRect = tileBounds;
        stroke(255, 0, 0);
        rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
        return true;
    }
    return false;
};
Entity.prototype.setType = function(entityType) {
    this.entityType = entityType;
};

//////////////////////////////////////////////////////////////////////////
var Bullet = function(color, height, speed, originId, engine) {
    Entity.call(this, color, height, speed, engine);
    this.originId = originId;
    this.distance = 0;
    this.range = 400;
};
Bullet.prototype = Object.create(Entity.prototype);
Bullet.prototype.calcBounds = function(x, y) {
    var boundWidth = this.height;
    var boundX = x - boundWidth/2;
    var boundY = y - boundWidth/2;
    var boundX2 = boundX + boundWidth;
    var boundY2 = boundY + boundWidth;
    this.lastBounds.x1 = boundX;
    this.lastBounds.y1 = boundY;
    this.lastBounds.x2 = boundX2;
    this.lastBounds.y2 = boundY2;
    this.lastBounds.recompute();

    return this.lastBounds;
};
Bullet.prototype.update = function(tilesContainer) {
    this.distance += this.speed;
    if (this.distance > this.range) {
        tilesContainer.removeTile(this);
        return true;
    }
    return Entity.prototype.update.call(this, tilesContainer);
};
Bullet.prototype.render = function() {
    var height = this.height;
    var color = this.color;
    var x = this.x;
    var y = this.y;
    stroke(255, 255, 255);
    fill(color.r, color.g, color.b);
    ellipse(x, y, height/2, height);
    ellipse(x, y, height, height/2);
};
Bullet.prototype.onTargetMet = function(tilesContainer) {
    tilesContainer.removeTile(this);
};
Bullet.prototype.onCollision = function(tilesContainer) {
    tilesContainer.removeTile(this);
};
Bullet.prototype.collisionDetector = function(x, y, otherTile, tilesContainer) {
    var collided = Entity.prototype.collisionDetector.call(this, x, y, otherTile);

    if (otherTile.id !== this.originId &&
        otherTile.getAttackableBounds &&
        otherTile.getAttackableBounds().collision(this.getBounds())
    ) {
        this.engine.killedZombie(otherTile);

        return true;
    }
    return collided;
};


//////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////
var Robot = function(color, height, speed, engine) {
    Entity.call(this, color, height, speed, engine);
};
Robot.prototype = Object.create(Entity.prototype);
Robot.prototype.calcBounds = function(x, y) {
    var height = this.height;
    var boundWidth = height * 0.25;
    var boundX = x - boundWidth * 0.27;
    var boundY = y - height * 0.12;
    var boundX2 = boundX + height *0.14;
    var boundY2 = boundY + height * 0.12;
    this.lastBounds.x1 = boundX;
    this.lastBounds.y1 = boundY;
    this.lastBounds.x2 = boundX2;
    this.lastBounds.y2 = boundY2;
    this.lastBounds.recompute();

    return this.lastBounds;
};
Robot.prototype.render = function() {
    var height = this.height;
    var color = this.color;
    var x = this.x;
    var y = this.y - height/2;

    stroke(255, 255, 255);
    // head
    fill(color.r, color.g, color.b);
    ellipse(x, y, height/4, height/4);
    // body
    line(x, y + height/8, x, y + height/3);
    line(x - height/6, y + height/8, x + height/6, y + height/8);
    line(x, y + height/3, x - height/6, y + height/2);
    line(x, y + height/3, x + height/6, y + height/2);
};
Robot.prototype.getAttackableBounds = function() {
    var height = this.height;
    var color = this.color;
    var x = this.x - height * 0.13;
    var y = this.y - height * 0.63;
    return new Bounds(x, y, x + height/4, y + height/4);
};
Robot.prototype.fireBullet = function(speed, xOffsetStart, yOffsetStart, xOffsetEnd, yOffsetEnd) {
    var x = this.x;
    var y = this.y;
    var bullet = new Bullet({r: 255, g: 0, b: 0}, 8, speed, this.id, this.engine);
    bullet.setPosition(x + xOffsetStart, y + yOffsetStart);
    bullet.setTarget(x + xOffsetEnd, y + yOffsetEnd);
    this.tilesContainer.addTile(bullet);
};
Robot.prototype.collisionDetector = function(x, y, otherTile, tilesContainer) {
    var collided = Entity.prototype.collisionDetector.call(this, x, y, otherTile);
    if (collided && this.entityType === "player" && this.id !== otherTile.id && otherTile.entityType === "zombie") {
        // game over
        Program.restart();
    }
    return collided;
};

//////////////////////////////////////////////////////////////////////////

var TilesContainer = function() {
    this.tiles = [];
    this.tilesByType = {};
};
TilesContainer.prototype.addTile = function(tile) {
    this.tiles.push(tile);
    if (tile.entityType) {
        var typeTiles = this.tilesByType[tile.entityType];
        if (!typeTiles) {
            typeTiles = [];
            this.tilesByType[tile.entityType] = typeTiles;
        }
        typeTiles.push(tile);
    }
};
TilesContainer.prototype.sortTiles = function() {
    var swapped;
    var tiles = this.tiles;
    do {
        swapped = false;
        for (var i=0; i < tiles.length-1; i++) {
            if (tiles[i].y > tiles[i+1].y) {
                var temp = tiles[i];
                tiles[i] = tiles[i+1];
                tiles[i+1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
};
TilesContainer.prototype.getTiles = function() {
    return this.tiles;
};
TilesContainer.prototype.collisionAt = function(targetTile, x, y) {
    var tiles = this.tiles;
    for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        if (targetTile.collisionDetector(x, y, tile, this)) {
            return true;
        }
    }

    return false;
};
TilesContainer.prototype.removeTile = function(tile) {
    this.tiles = this.tiles.filter( function(t) {
        return t.id !== tile.id;
    });
    var typeTiles = this.tilesByType[tile.entityType];
    if (!typeTiles) {
        return;
    }
    typeTiles = typeTiles.filter( function(t) {
        return t.id !== tile.id;
    });
    this.tilesByType[tile.entityType] = typeTiles;
};
TilesContainer.prototype.getTilesByType = function(entityType) {
    return this.tilesByType[entityType];
};
////////////////////////////////////////////////////////////////////////
var GameEngine = function(tilesContainer) {
    this.tilesContainer = tilesContainer;
};
GameEngine.prototype.createPlayer = function() {
    var man = new Robot({ r: 238, g: 255, b: 0 }, 103, 3, this);
    man.setType("player");
    this.tilesContainer.addTile(man);
    this.player = man;
    return man;
};
GameEngine.prototype.spawnZombie = function(speed) {
    var robot = new Robot( { r: 255, g: 0, b: 0 }, 103, speed, this);
    if (random(0, 1) > 0.5) {
        robot.setPosition( random(0, width), random(0, 1) > 0.5 ? -70 : height+70 );
    } else {
        robot.setPosition( random(0, 1) > 0.5 ? -70 : width+70, random(0, height) );
    }
    robot.setType("zombie");
    robot.setTargetEntity(this.player);
    this.tilesContainer.addTile(robot);
};
GameEngine.prototype.getZombies = function() {
    return this.tilesContainer.getTilesByType("zombie");
};
GameEngine.prototype.killedZombie = function(zombie) {
    // increase score
    score++;

    // remove self
    this.tilesContainer.removeTile(zombie);

    // spawn more fast zombies
    this.spawnZombie(zombie.speed + 0.1);

    if (random(0, 1) > 0.8) {
        this.spawnZombie(0.1);
    }
};
GameEngine.prototype.keyHandling = function() {
    var man = this.player;
    var x = man.x;
    var y = man.y;
    var speed = 15;

    if (keyCode === 38) {
        y -= speed;
    }
    if (keyCode === 40) {
        y += speed;
    }
    if (keyCode === 37) {
        x -= speed;
    }
    if (keyCode === 39) {
        x += speed;
    }

    var bulletSpeed = 8;

    if (keyCode === 87) {
        man.fireBullet(bulletSpeed, 0, -30, 0, -300);
    }
    if (keyCode === 83) {
        man.fireBullet(bulletSpeed, 0, 10, 0, 300);
    }
    if (keyCode === 65) {
        man.fireBullet(bulletSpeed, 0, -30, -300, -30);
    }
    if (keyCode === 68) {
        man.fireBullet(bulletSpeed, 0, -30, 300, -30);
    }

    man.setTarget(x, y);
};
GameEngine.prototype.mouseMovedHandling = function() {
    var man = this.player;
    man.setTarget(mouseX, mouseY);
};

GameEngine.prototype.update = function() {
    var tilesContainer = this.tilesContainer;
    var tiles = tilesContainer.getTiles();
    var doSort = false;
    for ( var i = 0; i < tiles.length; i++ ) {
        var tile = tiles[i];

        if (tile && tile.update(tilesContainer)) {
            doSort = true;
        }
    }
    if (doSort) {
        tilesContainer.sortTiles();
    }

    background(0, 0, 0);

    for ( var i = 0; i < tiles.length; i++ ) {
        var tile = tiles[i];
        tile.render();
    }

    // score
    fill(255, 0, 0);
    text("Score " + score + " / obj " + tiles.length, 10, 30);
};

////////////////////////////////////////////////////////////////////////
var tilesContainer = new TilesContainer();
var engine = new GameEngine(tilesContainer);
var man = engine.createPlayer();
background(0, 0, 0);

// starting zombies
for ( var i = 0; i < robotCount; i++ ) {
    engine.spawnZombie(random(0.1, 0.5));
}

// starting trees
for ( var i = 0; i < treeCount; i++ ) {
    var tree = new Tree({r: 0, g: random(100, 200), b: 0}, random(50, 103));
    tilesContainer.addTile(tree);
    tree.setPosition(random(0, width), random(0, height));
}

// for debugging
var tree = new Tree({r: 0, g: 200, b: 0}, 103);
tree.setPosition(200, 200);
tree.render();
var tileRect = tree.getBounds();
stroke(255, 0, 0);
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);


man.setPosition(100, 100);
man.render();
var tileRect = man.getBounds();
stroke(255, 0, 0);
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
var tileRect = man.getAttackableBounds();
stroke(255, 0, 0);
noFill();
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
noFill();

var bullet = new Bullet({ r: 255, g: 0, b: 0 }, 8, 3, 0, engine);
bullet.setPosition(250, 250);
bullet.render();
var tileRect = bullet.getBounds();
stroke(255, 0, 0);
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);

tilesContainer.sortTiles();
//////////////////////////////////////////////////////////////////////////

keyPressed = function() {
    engine.keyHandling();
};
mouseMoved = function() {
    engine.mouseMovedHandling();
};

var f = createFont("monospace", 30);
textFont(f);

draw = function() {
    engine.update();
};

//////////////////////////////////////////////////////////////////////////
