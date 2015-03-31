/**
 * Modus Invaders
 * 
 * Based on the talk by Mary Rose Cook at Front-Trends 2014
 * https://vimeo.com/105955605
 */
    
(function() {

    /**
     * Game
     */
    var Game = function(canvasId) {
        var me = this,
            canvas = document.getElementById(canvasId);
            
        this.stage = canvas.getContext('2d');
        this.stage.fillStyle   = this.drawColor;
        this.stage.strokeStyle = this.drawColor;

        this.keyboard = new Keyboard();

        // create the player
        this.player = new Player(this);

        // build the initial set of invaders        
        this.bodies = this.createInvaders().concat(this.player);

        // add shields
        this.bodies = this.bodies.concat( this.createShields() );

        // load sounds and start the game loop when loaded
        this.loadSound('../assets/shoot.wav', function(shootSound) {
            me.shootSound = shootSound;
            me.gameLoop.call(me);
        });
    };

    Game.prototype = {
        bodies           : [],
        leftMostInvader  : undefined,
        rightMostInvader : undefined,
        patrolDir        : 1,
        drawColor        : '#FFF',

        gameLoop: function() {
            this.update();
            this.draw(this.stage);

            if (!this.gameOver) {
                requestAnimationFrame(this.gameLoop.bind(this));
            }
        },

        update: function() {
            var i, len;

            // eliminate game bodies that are colliding
            this.checkCollisions();

            // find left and right most invaders
            this.findEdgeInvaders();

            // check if the player was destroyed
            if (this.isGameOver()) {
                this.endGame('game-over');

            // call the update method on each game body
            } else {
                for (i=0, len=this.bodies.length; i<len; i++) {
                    this.bodies[i].update();
                }
            }

            // update Invader patrol direction
            this.updatePatrolDir();

            // check if the player won
            if (this.hasPlayerWon()) {
                this.endGame('you-win');
            }
        },

        // redraw all of the game bodies
        draw: function(stage) {
            stage.clearRect(0, 0, stage.canvas.width, stage.canvas.height);
            for (var i=0, len=this.bodies.length; i<len; i++) {
                this.bodies[i].draw(stage);
            }
        },

        addBody: function(body) {
            this.bodies.push(body);
        },

        checkCollisions: function() {
            var me = this,
                bodiesRemoved = [];

            this.bodies = this.bodies.filter(function(b1) {
                var collidingBodies = me.bodies.filter(function(b2) {
                    return me.isColliding(b1, b2);
                });

                bodiesRemoved.concat(collidingBodies);

                return me.isInBounds(b1) && collidingBodies.length === 0;
            });

            // call the destroy method on all of the colliding bodies
            bodiesRemoved.forEach(function(b) {
                if (!b.deleted) {
                    b.deleted = true;
                    if (typeof b.destroy === 'function') {
                        b.destroy();
                    }
                }
            });
        },

        // check if one body is colliding with another
        isColliding: function(b1, b2) {
            var b1HalfX = b1.size.x / 2,
                b1HalfY = b1.size.y / 2,
                b2HalfX = b2.size.x / 2,
                b2HalfY = b2.size.y / 2;

            return !(   b1 === b2 || 
                        b1.center.x + b1HalfX <= b2.center.x - b2HalfX ||
                        b1.center.x - b1HalfX >= b2.center.x + b2HalfX ||
                        b1.center.y + b1HalfY <= b2.center.y - b2HalfY ||
                        b1.center.y - b1HalfY >= b2.center.y + b2HalfY
                    );
        },

        // check if a body is on the stage
        isInBounds: function(b) {
            return b.center.x >= 0 &&
                b.center.x <= this.stage.canvas.width &&
                b.center.y >= 0 &&
                b.center.y <= this.stage.canvas.height;
        },

        // create initial set of shields
        createShields: function() {
            var stageSizeX = this.stage.canvas.width,
                centerY = this.stage.canvas.height - 40,
                shields = [],
                shield;

            for (i=0; i<3; i++) {
                shield = new Shield({
                    center: {
                        x: (60 - (60 * i)) + ((stageSizeX / 2) * i),
                        y: centerY
                    }
                });
                shields = shields.concat(shield.shieldBits);
            }

            return shields;
        },

        // create the initial set of invaders - X columns by X rows
        createInvaders: function() {
            var invaders = [];

            for (var i=0; i<24; i++) {
                invaders.push(new Invader(this, {
                    center: {
                        x: 30 + (i % 8) * 30, // 8 per row
                        y: 30 + (i % 3) * 30  // 3 columns
                    }
                }));
            }

            return invaders;
        },

        // check if the given invader have another invader below it
        hasInvaderBelow: function(invader) {
            return this.bodies.filter(function(b) {
                return b instanceof Invader && 
                    b.center.y > invader.center.y && 
                    b.center.x - invader.center.x < invader.size.x;
            }).length > 0;
        },

        findEdgeInvaders: function() {
            var i, len;

            for (i=0, len=this.bodies.length; i<len; i++) {
                if (this.isLeftMostInvader(this.bodies[i])) {
                    this.leftMostInvader = this.bodies[i];
                }
                if (this.isRightMostInvader(this.bodies[i]) ) {
                    this.rightMostInvader = this.bodies[i];
                }
            }
        },

        isLeftMostInvader: function(invader) {
            if (invader instanceof Invader && 
                 (this.leftMostInvader === undefined ||
                  this.leftMostInvader.deleted || 
                  invader.center.x < this.leftMostInvader.center.x) ) {
                return true;
            }

            return false;
        },

        isRightMostInvader: function(invader) {
            if (invader instanceof Invader && 
                 (this.rightMostInvader === undefined ||
                  this.rightMostInvader.deleted || 
                  invader.center.x > this.rightMostInvader.center.x) ) {
                return true;
            }

            return false;
        },

        updatePatrolDir: function() {
            if (this.leftMostInvader.center.x < 30 || this.rightMostInvader.center.x > 280) {
                this.patrolDir = -this.patrolDir;
            }
        },

        isGameOver: function() {
            return this.bodies.filter(function(b) {
                return b instanceof Player;
            }).length === 0;
        },

        hasPlayerWon: function() {
            return this.bodies.filter(function(b) {
                return b instanceof Invader;
            }).length === 0;
        },

        endGame: function(showEl) {
            var gameOverEl = document.getElementById(showEl);

            this.gameOver = true;
            gameOverEl.style.display = 'block';
        },

        loadSound: function(url, callback) {
            var sound = new Audio(url),
                loaded = function() {
                    callback(sound);
                    sound.removeEventListener('canplaythrough', loaded);
                };

            sound.addEventListener('canplaythrough', loaded);
        }
    };

    /**
     * Player
     */
    var Player = function(game) {
        var stageSizeX = game.stage.canvas.width,
            stageSizeY = game.stage.canvas.height;

        this.game = game;

        this.center = {
            x: stageSizeX / 2,
            y: stageSizeY - this.size.y
        };
    };

    Player.prototype = {
        speed    : 2,
        fireRate : 300,
        canFire  : true,
        size     : {
            x: 15,
            y: 15
        },

        update: function() {
            var keyboard = this.game.keyboard,
                stageSizeX = this.game.stage.canvas.width,
                halfX = this.size.x / 2;

            // Move left
            if (keyboard.isDown(keyboard.KEYS.LEFT)) {
                if (this.center.x - halfX > 0) {
                    this.center.x -= this.speed;
                }

            // or Move right
            } else if (keyboard.isDown(keyboard.KEYS.RIGHT)) {
                if (this.center.x + halfX < stageSizeX) {
                    this.center.x += this.speed;
                }
            }

            // Fire !
            if (keyboard.isDown(keyboard.KEYS.SPACE) && this.canFire) {
                this.fire();
            }

        },

        draw: function(stage) {
            var halfX = this.size.x / 2,
                halfY = this.size.y / 2;

            stage.beginPath();
            stage.moveTo(this.center.x, this.center.y - halfY);
            stage.lineTo(this.center.x - halfX, this.center.y + halfY);
            stage.lineTo(this.center.x + halfX, this.center.y + halfY);
            stage.fill();            
        },

        fire: function() {
            var me = this;
            
            this.canFire = false;

            this.game.addBody(new Bullet({
                size: {
                    x: 3,
                    y: 5
                },
                center: {
                    x: this.center.x,
                    y: this.center.y - this.size.y                                    
                },
                speed: {
                    x: 0,
                    y: -6
                }
            }));

            // re-enable fire after x milliseconds
            this.intervalId = setTimeout(function(){
                me.canFire = true;
            }, this.fireRate);

            this.game.shootSound.load();
            this.game.shootSound.play();            
        }
    };

    var Invader = function(game, config) {
        this.game   = game;
        this.center = config.center;
        this.speed  = {
            x : 0.3,
            y : 10
        };
    };

    /**
     * Invader
     */
    Invader.prototype = {
        size: {
            x: 15,
            y: 15
        },

        update: function() {
            if ( Math.sign(this.game.patrolDir) !== Math.sign(this.speed.x) ) {
                this.center.y += this.speed.y;
                this.speed.x = -this.speed.x;
            }

            this.center.x += this.speed.x;

            // create random invader bullets
            if (Math.random() > 0.995 && !this.game.hasInvaderBelow(this)) {
                this.game.addBody(new Bullet({
                    center: {
                        x: this.center.x,
                        y: this.center.y + this.size.y
                    },
                    speed: {
                        x: Math.random() - 0.5,
                        y: 2
                    }
                }));
            }
        },

        draw: function(stage) {
            stage.fillRect(
                this.center.x - this.size.x / 2, 
                this.center.y - this.size.y / 2,
                this.size.x,
                this.size.y
            );
        }
    };

    var Bullet = function(config) {
        for (var prop in config) {
            if (config.hasOwnProperty(prop)) {
                this[prop] = config[prop];
            }
        }
    };

    /**
     * Bullet
     */
    Bullet.prototype = {
        size: {
            x: 3,
            y: 3
        },

        update: function() {
            this.center.y += this.speed.y;
            this.center.x += this.speed.x;
        },

        draw: function(stage) {
            stage.fillRect(
                this.center.x - this.size.x / 2, 
                this.center.y - this.size.y / 2,
                this.size.x,
                this.size.y
            );
        }
    };

    /**
     * Shield
     */
    var Shield = function (config) {
        var i, iLen,
            j, jLen,
            bitSize = {
                x : 3,
                y : 3
            };

        for (var prop in config) {
            if (config.hasOwnProperty(prop)) {
                this[prop] = config[prop];
            }
        }

        this.width = this.pattern[0].length * bitSize.x;
        this.height = this.pattern.length * bitSize.y;
        this.origin = {
            x: this.center.x - bitSize.x / 2 - this.width / 2,
            y: this.center.y - bitSize.y / 2 - this.height / 2
        };

        this.shieldBits = [];

        for (i=0, iLen=this.pattern.length; i<iLen; i++) {
            for (j=0, jLen=this.pattern[i].length; j<jLen; j++) {
                if (this.pattern[i][j] === 1) {
                    this.shieldBits.push(new ShieldBit({
                        center: {
                            x: this.origin.x + j * bitSize.x,
                            y: this.origin.y + i * bitSize.y      
                        },
                        size  : bitSize
                    }));
                }
            }
        }
    };

    Shield.prototype = {
        pattern: [
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,0,0,1,1,1,1],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,1,0,0,0,0,1,1,1],
            [1,1,1,0,0,0,0,1,1,1]
        ]
    };

    var ShieldBit = function(config) {
        this.center = config.center;
        this.size = config.size;
    };

    ShieldBit.prototype = {
        update: function() {
        },

        draw: function(stage) {
            stage.fillRect(
                this.center.x - this.size.x / 2, 
                this.center.y - this.size.y / 2,
                this.size.x,
                this.size.y
            );
        }
    };

    /**
     * Keyboard
     */
    var Keyboard = function() {
        var keyState = {};

        this.KEYS = {
            LEFT  : 37,
            RIGHT : 39,
            SPACE : 32
        };

        this.isDown = function(keyCode) {
            return keyState[keyCode] === true;
        };

        window.onkeydown = function(e) {
            keyState[e.keyCode] = true;
        };
        window.onkeyup = function(e) {
            keyState[e.keyCode] = false;
        };        
    };

    /** 
     * Boostrap
     */
    window.onload = function() {
        new Game('stage');
    };
})();