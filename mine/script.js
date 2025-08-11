const rows = 10;
const cols = 10;
const dinos = 10;
let board = [];
let gameOver = false;

const gameContainer = document.getElementById("game");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restart");

restartBtn.addEventListener("click", init);

function init() {
    gameContainer.innerHTML = "";
    board = [];
    gameOver = false;
    statusText.textContent = "";

    // 盤面初期化
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        for (let c = 0; c < cols; c++) {
            const cell = {
                r, c,
                hasDino: false,
                opened: false,
                flagged: false,
                neighborCount: 0
            };
            board[r][c] = cell;
        }
    }

    // 恐竜配置
    let placed = 0;
    while (placed < dinos) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (!board[r][c].hasDino) {
            board[r][c].hasDino = true;
            placed++;
        }
    }

    // 隣接数計算
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            board[r][c].neighborCount = countNeighbors(r, c);
        }
    }

    // セル生成
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cellEl = document.createElement("div");
            cellEl.classList.add("cell");
            cellEl.dataset.r = r;
            cellEl.dataset.c = c;
            cellEl.addEventListener("click", onClick);
            cellEl.addEventListener("contextmenu", onRightClick);
            gameContainer.appendChild(cellEl);
        }
    }
}

function countNeighbors(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (board[nr][nc].hasDino) count++;
            }
        }
    }
    return count;
}

function onClick(e) {
    if (gameOver) return;
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    openCell(r, c);
}

function onRightClick(e) {
    e.preventDefault();
    if (gameOver) return;
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    const cell = board[r][c];
    if (!cell.opened) {
        cell.flagged = !cell.flagged;
        e.target.textContent = cell.flagged ? "🚩" : "";
        e.target.classList.toggle("flag");
    }
}

function openCell(r, c) {
    const cell = board[r][c];
    if (cell.opened || cell.flagged) return;
    cell.opened = true;
    const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    cellEl.classList.add("open");

    if (cell.hasDino) {
        cellEl.textContent = "🦖";
        gameOver = true;
        statusText.textContent = "💥 恐竜に食べられた！";
        revealAll();
        return;
    }

    if (cell.neighborCount > 0) {
        cellEl.textContent = cell.neighborCount;
    } else {
        // 周囲も開く
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    openCell(nr, nc);
                }
            }
        }
    }

    checkWin();
}

function revealAll() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = board[r][c];
            const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
            if (cell.hasDino) {
                cellEl.textContent = "🦖";
            }
        }
    }
}

function checkWin() {
    let openedCount = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].opened) openedCount++;
        }
    }
    if (openedCount === rows * cols - dinos) {
        gameOver = true;
        statusText.textContent = "🎉 恐竜を全て避け切った！";
        revealAll();
    }
}

init();
