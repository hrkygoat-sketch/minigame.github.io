const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
const nextTetrominoCanvas = document.getElementById('nextTetrominoCanvas');
const nextCtx = nextTetrominoCanvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const startButton = document.getElementById('startButton');

// 効果音要素の取得
const landSound = document.getElementById('landSound');
const rotateSound = document.getElementById('rotateSound');
const clearSound = document.getElementById('clearSound');
const gameOverSound = document.getElementById('gameOverSound');
const moveSound = document.getElementById('moveSound');

const COLS = 10; // 列数
const ROWS = 20; // 行数
const BLOCK_SIZE = 20; // ブロックの1辺のサイズ

ctx.canvas.width = COLS * BLOCK_SIZE;
ctx.canvas.height = ROWS * BLOCK_SIZE;

// 盤面を初期化 (0は空きマス)
let board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));

// テトリミノの形を定義 (I, O, T, S, Z, J, L)
const TETROMINOES = {
    'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    'O': [[1,1], [1,1]],
    'T': [[0,1,0], [1,1,1], [0,0,0]],
    'S': [[0,1,1], [1,1,0], [0,0,0]],
    'Z': [[1,1,0], [0,1,1], [0,0,0]],
    'J': [[1,0,0], [1,1,1], [0,0,0]],
    'L': [[0,0,1], [1,1,1], [0,0,0]]
};

// ブロックの色 (TETROMINOESのキーに対応)
const COLORS = {
    'I': 'cyan',
    'O': 'yellow',
    'T': 'purple',
    'S': 'lime', // 緑
    'Z': 'red',
    'J': 'blue',
    'L': 'orange',
    'GHOST': 'rgba(255, 255, 255, 0.2)' // ゴーストブロック用（実装しないが色だけ定義）
};

let currentTetromino = null;
let nextTetromino = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let level = 1;
let dropInterval = 1000; // 落下間隔 (ms)
let gameLoop;
let isGameOver = false;

// 新しいテトリミノを生成
function generateNewTetromino() {
    const keys = Object.keys(TETROMINOES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return {
        shape: TETROMINOES[randomKey],
        color: COLORS[randomKey],
        name: randomKey // 回転判定のために名前も持つ
    };
}

// ゲームの初期化
function initGame() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    dropInterval = 1000;
    isGameOver = false;
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    nextTetromino = generateNewTetromino(); // 最初の次のブロックを生成
    spawnTetromino(); // 最初のブロックを生成
    if (gameLoop) clearInterval(gameLoop); // 既存のループがあればクリア
    gameLoop = setInterval(drop, dropInterval); // ゲームループ開始
    startButton.textContent = 'リスタート';
    draw(); // 初回描画
}

// ブロックを描画
function drawBlock(x, y, color, context = ctx) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = 'black';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// 盤面全体を描画
function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] !== 0) {
                drawBlock(col, row, board[row][col]);
            }
        }
    }
}

// 現在のテトリミノを描画
function drawCurrentTetromino() {
    if (!currentTetromino) return;

    for (let row = 0; row < currentTetromino.shape.length; row++) {
        for (let col = 0; col < currentTetromino.shape[row].length; col++) {
            if (currentTetromino.shape[row][col] === 1) {
                drawBlock(currentX + col, currentY + row, currentTetromino.color);
            }
        }
    }
}

// 次のテトリミノを表示
function drawNextTetromino() {
    nextCtx.clearRect(0, 0, nextTetrominoCanvas.width, nextTetrominoCanvas.height);
    if (!nextTetromino) return;

    // 中央に配置するためのオフセット
    const shapeWidth = nextTetromino.shape[0].length;
    const shapeHeight = nextTetromino.shape.length;
    const offsetX = (nextTetrominoCanvas.width / BLOCK_SIZE - shapeWidth) / 2;
    const offsetY = (nextTetrominoCanvas.height / BLOCK_SIZE - shapeHeight) / 2;

    for (let row = 0; row < shapeHeight; row++) {
        for (let col = 0; col < shapeWidth; col++) {
            if (nextTetromino.shape[row][col] === 1) {
                drawBlock(offsetX + col, offsetY + row, nextTetromino.color, nextCtx);
            }
        }
    }
}

// ゲームの描画ループ
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア
    drawBoard(); // 盤面を描画
    drawCurrentTetromino(); // 現在のテトリミノを描画
    drawNextTetromino(); // 次のテトリミノを描画
}

// 衝突判定
// x, y: 判定したいテトリミノの左上の座標
// newShape: 判定したいテトリミノの形 (回転後の形など)
function isValidMove(x, y, newShape) {
    for (let row = 0; row < newShape.length; row++) {
        for (let col = 0; col < newShape[row].length; col++) {
            if (newShape[row][col] === 1) {
                const boardX = x + col;
                const boardY = y + row;

                // 盤面の外に出ていないか
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                // 盤面の上端より上はOK (ブロック生成時)
                if (boardY < 0) {
                    continue;
                }
                // 他のブロックと衝突していないか
                if (board[boardY][boardX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// ブロックを盤面に固定
function merge() {
    if (!currentTetromino) return;

    for (let row = 0; row < currentTetromino.shape.length; row++) {
        for (let col = 0; col < currentTetromino.shape[row].length; col++) {
            if (currentTetromino.shape[row][col] === 1) {
                const boardX = currentX + col;
                const boardY = currentY + row;
                if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                    board[boardY][boardX] = currentTetromino.color;
                }
            }
        }
    }
    playAudio(landSound); // 着地音
}

// 行の消去
function clearLines() {
    let linesCleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            // 行が埋まっている場合
            board.splice(row, 1); // その行を削除
            board.unshift(Array(COLS).fill(0)); // 新しい空の行を上に追加
            linesCleared++;
            row++; // 行を削除したので、同じ行をもう一度チェック
        }
    }

    if (linesCleared > 0) {
        playAudio(clearSound); // ライン消去音
        updateScore(linesCleared);
    }
}

// スコア更新
function updateScore(linesCleared) {
    const lineScores = [0, 100, 300, 500, 800]; // 1, 2, 3, 4ライン消去のスコア
    score += lineScores[linesCleared] * level;
    scoreDisplay.textContent = score;

    // レベルアップ判定 (例: 1000点ごとにレベルアップ)
    const newLevel = Math.floor(score / 1000) + 1;
    if (newLevel > level) {
        level = newLevel;
        levelDisplay.textContent = level;
        // 落下速度を上げる
        dropInterval = Math.max(100, dropInterval - 100); // 最低100ms
        clearInterval(gameLoop);
        gameLoop = setInterval(drop, dropInterval);
    }
}

// 新しいテトリミノを出現させる
function spawnTetromino() {
    currentTetromino = nextTetromino;
    nextTetromino = generateNewTetromino(); // 次のブロックを事前に生成
    currentX = Math.floor(COLS / 2) - Math.floor(currentTetromino.shape[0].length / 2);
    currentY = 0;

    // 新しいテトリミノが生成された時点で衝突していたらゲームオーバー
    if (!isValidMove(currentX, currentY, currentTetromino.shape)) {
        gameOver();
    }
}

// ゲームオーバー処理
function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    playAudio(gameOverSound); // ゲームオーバー音
    alert(`ゲームオーバー！ スコア: ${score}`);
    startButton.textContent = 'もう一度プレイ';
}

// テトリミノの落下
function drop() {
    if (isGameOver) return;

    if (isValidMove(currentX, currentY + 1, currentTetromino.shape)) {
        currentY++;
    } else {
        // 落下できない場合、ブロックを固定し、ラインを消去し、新しいブロックを生成
        merge();
        clearLines();
        spawnTetromino();
    }
    draw();
}

// テトリミノの回転
function rotate(shape) {
    // 行と列を入れ替えて、各行を反転させる (時計回り90度)
    const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
    return newShape;
}

// キーボードイベントリスナー
document.addEventListener('keydown', e => {
    if (isGameOver || !currentTetromino) return;

    let newX = currentX;
    let newY = currentY;
    let newShape = currentTetromino.shape;
    let moved = false;

    switch (e.key) {
        case 'ArrowLeft':
            newX--;
            moved = true;
            break;
        case 'ArrowRight':
            newX++;
            moved = true;
            break;
        case 'ArrowDown':
            newY++;
            score += 1; // ソフトドロップでスコア加算
            scoreDisplay.textContent = score;
            moved = true;
            break;
        case 'ArrowUp':
            newShape = rotate(currentTetromino.shape);
            // ここで壁蹴り(Wall Kick)のロジックを追加するとより本格的になりますが、
            // 今回は単純な衝突判定のみとします。
            // 衝突した場合、回転しない
            if (!isValidMove(currentX, currentY, newShape)) {
                newShape = currentTetromino.shape; // 元に戻す
            } else {
                playAudio(rotateSound); // 回転音
            }
            break;
        case ' ': // スペースキー (ハードドロップ)
            e.preventDefault(); // スペースキーでスクロールしないようにする
            while (isValidMove(currentX, currentY + 1, currentTetromino.shape)) {
                currentY++;
                score += 2; // ハードドロップでスコア加算
            }
            scoreDisplay.textContent = score;
            playAudio(landSound); // 着地音 (ハードドロップ後も鳴らす)
            merge();
            clearLines();
            spawnTetromino();
            break;
    }

    if (moved && isValidMove(newX, newY, newShape)) {
        currentX = newX;
        currentY = newY;
        playAudio(moveSound); // 移動音
    }
    // 回転の場合は、isValidMoveでチェック済みなので、直接更新
    if (e.key === 'ArrowUp' && newShape !== currentTetromino.shape) {
        currentTetromino.shape = newShape;
    }

    draw(); // 移動後再描画
});

// 効果音再生関数
function playAudio(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0; // 再生位置を先頭に戻す
        audioElement.play().catch(e => console.log("Audio play failed:", e)); // エラーハンドリング
    }
}

// ゲーム開始ボタンのイベントリスナー
startButton.addEventListener('click', initGame);

// ページロード時に一度描画
draw();