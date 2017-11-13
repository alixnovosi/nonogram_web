let canvas;
let ctx;

let SIZE = 20;
let SQUARE_SPACER = 2;
let METASQUARE_SPACER = 10;

let BACKGROUND = "grey";
let VALUE = "black";
let EMPTY = "white";

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
    genHints(nonogrid);

    return nonogrid;
}

function genHints(nonogrid) {
    nonogrid.leftHints = Array(nonogrid.height).fill([]);
    nonogrid.topHints = Array(nonogrid.width).fill([]);

    let colCounts = Array(nonogrid.width).fill(0);
    for (let row of nonogrid.squares) {
        let r = nonogrid.squares.indexOf(row);
        let rowCount = 0

        for (let square of row) {
            let c = row.indexOf(square);
            if (square.hasValue) {
                rowCount += 1;
                colCounts[c] += 1;
            } else {
                if (colCounts[c] > 0) {
                    nonogrid.topHints[c].push(colCounts[c]);
                    colCounts[c] = 0;
                }

                if (rowCount > 0) {
                    nonogrid.leftHints[r].push(rowCount);
                    rowCount = 0;
                }
            }

            // Finish row.
            if (rowCount > 0) {
                nonogrid.leftHints[r].push(rowCount);
            }

            // Handle empty row.
            if (nonogrid.topHints[c] == []) {
                nonogrid.topHints[c] = [0];
            }
        }
    }

    // Handle last column.
    for (let c = 0; c < nonogrid.squares.length; c++) {
        if (colCounts[c] > 0) {
            nonogrid.topHints[c].push(colCounts[c]);
        }

        // Handle empty columns.
        if (nonogrid.topHints[c] == []) {
            nonogrid.topHints[c] = [0];
        }
    }

    // Blank out empty rows.
    for (let r = 0; r < nonogrid.squares.length; r++) {
        for (let c = 0; c < nonogrid.squares[0].length; c++) {
            if (nonogrid.leftHints[r] == [0] || nonogrid.topHints[c] == [0]) {
                nonogrid.squares[r][c].denied = true;
            }
        }
    }

    setHintsForDisplay(nonogrid);
}

function setHintsForDisplay(nonogrid) {

}

function drawBoard(nonogrid) {
    // Set up canvas.
    canvas.width = (10 +
        nonogrid.width * (SIZE + SQUARE_SPACER) - SQUARE_SPACER +
        (nonogrid.width / 5) * METASQUARE_SPACER);

    canvas.height = (10 +
        nonogrid.height * (SIZE + SQUARE_SPACER) - SQUARE_SPACER +
        (nonogrid.height / 5) * METASQUARE_SPACER);

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 10;
    for (let row of nonogrid.squares) {
        let x = 10;
        for (let square of row) {
            if (square.hasValue) {
                ctx.fillStyle = VALUE;
            }
            else {
                ctx.fillStyle = EMPTY;
            }
            ctx.fillRect(x, y, SIZE, SIZE);

            x += SIZE;

            let x_index = row.indexOf(square);
            if (x_index != nonogrid.width - 1) {
                x += SQUARE_SPACER;

                if ((x_index + 1) % 5 == 0) {
                    x += METASQUARE_SPACER;
                }
            }
        }

        y += SIZE;

        let y_index = nonogrid.squares.indexOf(row);
        if (y_index != nonogrid.height - 1) {
            y += SQUARE_SPACER;

            if ((y_index + 1) % 5 == 0) {
                y += METASQUARE_SPACER;
            }
        }
    }
}

window.onload = () => {
    canvas = document.getElementById("nonogram_board");
    ctx = canvas.getContext("2d");
    let nonogrid = decodeGrid();

    drawBoard(nonogrid);
};
