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
var Entity = function(color, height, speed, tilesContainer) {
    Tile.call(this);
    this.color = color;
    this.height = height;
    this.speed = speed;
    this.tilesContainer = tilesContainer;
};
Entity.prototype = Object.create(Tile.prototype);
Entity.prototype.setTarget = function(x, y) { this.targetX = x; this.targetY = y; };
Entity.prototype.render = function() {};
Entity.prototype.onCollision = function() {};
Entity.prototype.onTargetMet = function() {};
Entity.prototype.update = function(tilesContainer) {
    var x = this.x;
    var y = this.y;

    if (x === this.targetX && y === this.targetY) {
        this.onTargetMet(tilesContainer);
        return;
    }

    var newX = x;
    var newY = y;
    
    if ( x < this.targetX ) {
        newX += this.speed;
    }
    if ( x > this.targetX ) {
        newX -= this.speed;
    }
    if ( y < this.targetY ) {
        newY += this.speed;
    }
    if ( y > this.targetY ) {
        newY -= this.speed;
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
var Bullet = function(color, height, speed, originId) {
    Entity.call(this, color, height, speed);
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
    
    if (otherTile.id !== this.originId && otherTile.getAttackableBounds && otherTile.getAttackableBounds().collision(this.getBounds())) {
        // increase score
        score++;
        
        // remove self
        tilesContainer.removeTile(otherTile);
        
        // spawn more zombies -- todo, this shouldn't be the tilesContainer doing it
        tilesContainer.spawnZombie(otherTile.speed + 0.1);
        tilesContainer.spawnZombie(otherTile.speed + 0.1);
        tilesContainer.spawnZombie(otherTile.speed + 0.1);

        return true;
    }
    return collided;
};


//////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////
var Robot = function(color, height, speed, tilesContainer) {
    Entity.call(this, color, height, speed, tilesContainer);
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
    var bullet = new Bullet({r: 255, g: 0, b: 0}, 8, speed, this.id);
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

var NewTilesContainer = function() {
    var tiles = [];
    var bounds = [];
    var zombies = [];

    var addTile = function(tile) {
        tiles.push(tile);
    };
    
    var sort = function() {
        var swapped;
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
    
    var getTiles = function() {
        return tiles; 
    };

    var getZombies = function() {
        return zombies; 
    };
    
    var collisionAt = function(targetTile, x, y) {
        for (var i = 0; i < tiles.length; i++) {
            var tile = tiles[i];
            if (targetTile.collisionDetector(x, y, tile, this)) {
                return true;
            }
        }
        
        return false;
    };

    var removeTile = function(tile) {
        tiles = tiles.filter( function(t) {
            return t.id !== tile.id;
        });
        if (tile.entityType === "zombie") {
            zombies = zombies.filter( function(t) {
                return t.id !== tile.id;
            });
        }
    };
    
    var spawnZombie = function(speed) {
        var robot = new Robot( { r: 255, g: 0, b: 0 }, 103, speed, this);
        if (random(0, 1) > 0.5) {
            robot.setPosition( random(0, width), random(0, 1) > 0.5 ? -70 : height+70 );
        } else {
            robot.setPosition( random(0, 1) > 0.5 ? -70 : width+70, random(0, height) );
        }
        robot.setType("zombie");
        addTile(robot);
        zombies.push(robot);
    };
    
    return {
        addTile: addTile,
        sort: sort,
        getTiles: getTiles,
        removeTile: removeTile,
        collisionAt: collisionAt,
        spawnZombie: spawnZombie,
        getZombies: getZombies
    };
};

////////////////////////////////////////////////////////////////////////
background(0, 0, 0);

var tree = new Tree({r: 0, g: 200, b: 0}, 103);
tree.setPosition(200, 200);
tree.render();
var tileRect = tree.getBounds();
stroke(255, 0, 0);
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);

var tilesContainer = NewTilesContainer();
var man = new Robot({ r: 238, g: 255, b: 0 }, 103, 3, tilesContainer);
man.setType("player");
tilesContainer.addTile(man);

for ( var i = 0; i < robotCount; i++ ) {
    tilesContainer.spawnZombie(random(0.1, 0.5));
}

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

var bullet = new Bullet({ r: 255, g: 0, b: 0 }, 8, 3);
bullet.setPosition(250, 250);
bullet.render();
var tileRect = bullet.getBounds();
stroke(255, 0, 0);
rect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);

for ( var i = 0; i < treeCount; i++ ) {
    var tree = new Tree({r: 0, g: random(100, 200), b: 0}, random(50, 103));
    tilesContainer.addTile(tree);
    tree.setPosition(random(0, width), random(0, height));
}

tilesContainer.sort();

//////////////////////////////////////////////////////////////////////////

keyPressed = function() {
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
    var zombies = tilesContainer.getZombies();
    for ( var i = 0; i < zombies.length; i++ ) {
        var robot = zombies[i];
        robot.setTarget(x, y);
    }
};

var f = createFont("monospace", 30);
textFont(f);

draw = function() {
    var tiles = tilesContainer.getTiles();
    for ( var i = 0; i < tiles.length; i++ ) {
        var tile = tiles[i];

        if (tile && tile.update(tilesContainer)) {
          tilesContainer.sort();
        }
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

