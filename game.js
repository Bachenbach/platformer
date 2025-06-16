// Game Constants
const GRAVITY = 0.5;
const FRICTION = 0.9;
const PLAYER_SPEED = 5;
const JUMP_FORCE = -12;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const BULLET_SPEED = 10;
const BULLET_SIZE = 5;
const SCROLL_THRESHOLD = 400; // When player reaches this X, camera starts scrolling
const LEVEL_WIDTH = 3000; // Width of each level

// Game State
let gameState = {
    player: {
        x: 100,
        y: 300,
        velocityX: 0,
        velocityY: 0,
        health: 100,
        maxHealth: 100,
        coins: 0,
        weapons: ['pistol'],
        currentWeapon: 'pistol',
        ammo: {
            pistol: Infinity,
            shotgun: 20,
            rifle: 30
        },
        facingRight: true,
        isJumping: false,
        isShooting: false,
        shootCooldown: 0
    },
    enemies: [],
    bullets: [],
    platforms: [],
    coins: [],
    camera: {
        x: 0,
        y: 0
    },
    level: 1,
    gameOver: false,
    levelComplete: false,
    shopOpen: false
};

// Canvas Setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI Elements
const healthFill = document.getElementById('health-fill');
const coinsDisplay = document.getElementById('coins');
const ammoDisplay = document.getElementById('ammo');
const weaponDisplay = document.getElementById('weapon');
const levelDisplay = document.getElementById('level');
const shopElement = document.getElementById('shop');
const gameOverElement = document.getElementById('game-over');
const levelCompleteElement = document.getElementById('level-complete');

// Initialize Game
function initGame() {
    loadLevel(gameState.level);
    updateUI();
    gameLoop();
}

// Level Loading
function loadLevel(levelNum) {
    gameState.player.x = 100;
    gameState.player.y = 300;
    gameState.player.velocityX = 0;
    gameState.player.velocityY = 0;
    gameState.enemies = [];
    gameState.bullets = [];
    gameState.platforms = [];
    gameState.coins = [];
    gameState.camera.x = 0;
    gameState.gameOver = false;
    gameState.levelComplete = false;
    
    // Create platforms
    createPlatform(0, canvas.height - 50, LEVEL_WIDTH, 50); // Ground
    
    // Random platforms
    for (let i = 0; i < 15; i++) {
        const x = 300 + Math.random() * (LEVEL_WIDTH - 600);
        const y = 200 + Math.random() * 300;
        const width = 100 + Math.random() * 150;
        createPlatform(x, y, width, 20);
    }
    
    // Create coins
    for (let i = 0; i < 20; i++) {
        gameState.coins.push({
            x: 100 + Math.random() * (LEVEL_WIDTH - 200),
            y: 100 + Math.random() * (canvas.height - 200),
            width: 15,
            height: 15,
            collected: false
        });
    }
    
    // Create enemies
    for (let i = 0; i < levelNum * 3; i++) {
        gameState.enemies.push({
            x: 500 + i * 200,
            y: 400,
            width: ENEMY_WIDTH,
            height: ENEMY_HEIGHT,
            health: 30 * levelNum,
            speed: 1 + levelNum * 0.5,
            direction: Math.random() > 0.5 ? 1 : -1
        });
    }
    
    levelDisplay.textContent = `Level: ${levelNum}`;
}

function createPlatform(x, y, width, height) {
    gameState.platforms.push({
        x: x,
        y: y,
        width: width,
        height: height
    });
}

// Game Loop
function gameLoop() {
    if (gameState.gameOver) {
        gameOverElement.classList.remove('hidden');
        return;
    }
    
    if (gameState.levelComplete) {
        levelCompleteElement.classList.remove('hidden');
        return;
    }
    
    if (gameState.shopOpen) {
        return;
    }
    
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Update Game State
function update() {
    updatePlayer();
    updateCamera();
    updateBullets();
    updateEnemies();
    checkCollisions();
    
    // Check level completion
    if (gameState.player.x > LEVEL_WIDTH - 100 && gameState.enemies.length === 0) {
        gameState.levelComplete = true;
    }
    
    if (gameState.player.shootCooldown > 0) {
        gameState.player.shootCooldown--;
    }
}

function updatePlayer() {
    gameState.player.velocityY += GRAVITY;
    gameState.player.velocityX *= FRICTION;
    
    gameState.player.x += gameState.player.velocityX;
    gameState.player.y += gameState.player.velocityY;
    
    // Platform collisions
    let onGround = false;
    for (const platform of gameState.platforms) {
        if (checkCollision(
            gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
            platform.x, platform.y, platform.width, platform.height
        )) {
            if (gameState.player.velocityY > 0 && gameState.player.y + PLAYER_HEIGHT < platform.y + 10) {
                gameState.player.y = platform.y - PLAYER_HEIGHT;
                gameState.player.velocityY = 0;
                gameState.player.isJumping = false;
                onGround = true;
            }
            else if (gameState.player.velocityY < 0) {
                gameState.player.y = platform.y + platform.height;
                gameState.player.velocityY = 0;
            }
            else if (gameState.player.velocityX > 0) {
                gameState.player.x = platform.x - PLAYER_WIDTH;
                gameState.player.velocityX = 0;
            }
            else if (gameState.player.velocityX < 0) {
                gameState.player.x = platform.x + platform.width;
                gameState.player.velocityX = 0;
            }
        }
    }
    
    // Ground collision
    if (gameState.player.y + PLAYER_HEIGHT > canvas.height - 50) {
        gameState.player.y = canvas.height - 50 - PLAYER_HEIGHT;
        gameState.player.velocityY = 0;
        gameState.player.isJumping = false;
        onGround = true;
    }
    
    // Collect coins
    for (const coin of gameState.coins) {
        if (!coin.collected && checkCollision(
            gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
            coin.x, coin.y, coin.width, coin.height
        )) {
            coin.collected = true;
            gameState.player.coins += 5;
            updateUI();
        }
    }
}

function updateCamera() {
    // Camera follows player when they reach the scroll threshold
    if (gameState.player.x > SCROLL_THRESHOLD && 
        gameState.player.x < LEVEL_WIDTH - canvas.width / 2) {
        gameState.camera.x = gameState.player.x - SCROLL_THRESHOLD;
    }
    
    // Don't scroll past level boundaries
    if (gameState.camera.x < 0) gameState.camera.x = 0;
    if (gameState.camera.x > LEVEL_WIDTH - canvas.width) {
        gameState.camera.x = LEVEL_WIDTH - canvas.width;
    }
}

function updateBullets() {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        
        // Remove bullets that go off-screen
        if (bullet.x < gameState.camera.x || 
            bullet.x > gameState.camera.x + canvas.width || 
            bullet.y < 0 || 
            bullet.y > canvas.height) {
            gameState.bullets.splice(i, 1);
        }
    }
}

function updateEnemies() {
    for (const enemy of gameState.enemies) {
        enemy.x += enemy.speed * enemy.direction;
        
        // Change direction at edges or when hitting a wall
        if (enemy.x < 0 || enemy.x + ENEMY_WIDTH > LEVEL_WIDTH) {
            enemy.direction *= -1;
        }
        
        // Simple platform following
        let onPlatform = false;
        for (const platform of gameState.platforms) {
            if (enemy.x + ENEMY_WIDTH > platform.x && 
                enemy.x < platform.x + platform.width &&
                enemy.y + ENEMY_HEIGHT <= platform.y + 5 &&
                enemy.y + ENEMY_HEIGHT >= platform.y - 5) {
                enemy.y = platform.y - ENEMY_HEIGHT;
                onPlatform = true;
            }
        }
        
        if (!onPlatform) {
            enemy.y += GRAVITY * 2;
        }
    }
}

function checkCollisions() {
    // Bullet-enemy collisions
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            if (checkCollision(
                bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE,
                enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT
            )) {
                gameState.bullets.splice(i, 1);
                enemy.health -= bullet.damage;
                if (enemy.health <= 0) {
                    gameState.enemies.splice(j, 1);
                    gameState.player.coins += 10;
                    updateUI();
                }
                break;
            }
        }
    }
    
    // Player-enemy collisions
    for (const enemy of gameState.enemies) {
        if (checkCollision(
            gameState.player.x, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT,
            enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT
        )) {
            gameState.player.health -= 1;
            updateUI();
            if (gameState.player.health <= 0) {
                gameState.gameOver = true;
            }
        }
    }
}

function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
}

// Render Game
function render() {
    // Clear canvas with transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw platforms
    ctx.fillStyle = '#8B4513';
    for (const platform of gameState.platforms) {
        const screenX = platform.x - gameState.camera.x;
        if (screenX + platform.width > 0 && screenX < canvas.width) {
            ctx.fillRect(screenX, platform.y, platform.width, platform.height);
        }
    }
    
    // Draw coins
    ctx.fillStyle = '#FFD700';
    for (const coin of gameState.coins) {
        if (!coin.collected) {
            const screenX = coin.x - gameState.camera.x;
            if (screenX + coin.width > 0 && screenX < canvas.width) {
                ctx.beginPath();
                ctx.arc(
                    screenX + coin.width/2, 
                    coin.y + coin.height/2, 
                    coin.width/2, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
    
    // Draw player
    const playerScreenX = gameState.player.x - gameState.camera.x;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(playerScreenX, gameState.player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
    
    // Draw eyes to show direction
    ctx.fillStyle = '#FFF';
    const eyeX = gameState.player.facingRight ? 
        playerScreenX + PLAYER_WIDTH - 10 : 
        playerScreenX + 10;
    ctx.beginPath();
    ctx.arc(eyeX, gameState.player.y + 15, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw enemies
    for (const enemy of gameState.enemies) {
        const enemyScreenX = enemy.x - gameState.camera.x;
        if (enemyScreenX + ENEMY_WIDTH > 0 && enemyScreenX < canvas.width) {
            ctx.fillStyle = '#800080';
            ctx.fillRect(enemyScreenX, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
            
            // Draw health bar
            const healthPercent = enemy.health / (30 * gameState.level);
            ctx.fillStyle = '#333';
            ctx.fillRect(enemyScreenX, enemy.y - 10, ENEMY_WIDTH, 5);
            ctx.fillStyle = '#0F0';
            ctx.fillRect(enemyScreenX, enemy.y - 10, ENEMY_WIDTH * healthPercent, 5);
        }
    }
    
    // Draw bullets
    ctx.fillStyle = '#FFFF00';
    for (const bullet of gameState.bullets) {
        const bulletScreenX = bullet.x - gameState.camera.x;
        ctx.beginPath();
        ctx.arc(bulletScreenX, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ... [Rest of the JavaScript code remains the same as in the previous example] ...

// Start the game
initGame();
