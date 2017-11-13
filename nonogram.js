let canvas;
let ctx;
let SIZE = 20;
let SQUARE_SPACER = 2;
let METASQUARE_SPACER = 10;

class Nonosquare {
    constructor() {
        this.hasValue = false;
        this.filled = false;
        this.marked = false;
    }
}

class Nonogrid {
    constructor(width, height = width) {
        this.width = width;
        this.height = height;
        this.squares = [];
        for (let r of _.range(this.height)) {
            var row = [];
            for (let c of _.range(this.width)) {
                var square = new Nonosquare();
                row.push(square);
            }
            this.squares.push(row);
        }
    }
}
function decodeGrid() {
    let xSize = Math.floor(Math.random() * 20) + 5;
    let ySize = Math.floor(Math.random() * 20) + 5;
    var nonogrid = new Nonogrid(xSize, ySize);
    for (let row of nonogrid.squares) {
        for (let square of row) {
            square.hasValue = Math.floor(Math.random() * 2) == 0;
        }
    }
    return nonogrid;
}
function drawBoard(nonogrid) {
    // Set up canvas.
    canvas.width = (10 +
        nonogrid.width * (SIZE + SQUARE_SPACER) +
        (nonogrid.width / 5) * METASQUARE_SPACER);
    canvas.height = (10 +
        nonogrid.height * (SIZE + SQUARE_SPACER) +
        (nonogrid.height / 5) * METASQUARE_SPACER);
    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 10;
    for (let row of nonogrid.squares) {
        let x = 10;
        for (let square of row) {
            if (square.hasValue) {
                ctx.fillStyle = "black";
            }
            else {
                ctx.fillStyle = "white";
            }
            ctx.fillRect(x, y, SIZE, SIZE);

            x += SIZE + SQUARE_SPACER;

            if ((row.indexOf(square) + 1) % 5 == 0) {
                x += METASQUARE_SPACER;
            }
        }

        y += SIZE + SQUARE_SPACER;

        if ((nonogrid.squares.indexOf(row) + 1) % 5 == 0) {
            y += METASQUARE_SPACER;
        }
    }
}

window.onload = () => {
    canvas = document.getElementById("nonogram_board");
    ctx = canvas.getContext("2d");
    let nonogrid = decodeGrid();

    drawBoard(nonogrid);
};
