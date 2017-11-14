let canvas;
let ctx;

let SIZE = 20;
let SQUARE_SPACER = 2;
let METASQUARE_SPACER = 10;

// How many spaces before we put a bigger break between squares in.
let SPACER = 5

let HORIZ_SPACER = "─";
let VERT_SPACER = "│";

let BACKGROUND = "#555555";
let VALUE = "#000000";
let DENIED = "#DDDDDD"
let EMPTY = "#FFFFFF";

class Nonosquare {
    constructor() {
        this.hasValue = false;
        this.filled = false;
        this.denied = false;
    }
}

class Nonogrid {
    constructor(width, height = width) {
        this.width = width;
        this.height = height;
        this.squares = [...Array(this.height).keys()].map(() => Array(this.width));
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                this.squares[r][c] = new Nonosquare();
            }
        }
    }
}

function decodeGrid() {
    let xSize = Math.floor(Math.random() * 20) + 5;
    let ySize = Math.floor(Math.random() * 20) + 5;
    let nonogrid = new Nonogrid(xSize, ySize);
    for (let row of nonogrid.squares) {
        for (let square of row) {
            square.hasValue = Math.floor(Math.random() * 2) === 0;
        }
    }
    genHints(nonogrid);

    return nonogrid;
}

function genHints(nonogrid) {
    nonogrid.leftHints = [...Array(nonogrid.height).keys()].map(() => []);
    nonogrid.topHints = [...Array(nonogrid.width).keys()].map(() => []);

    let colCounts = Array(nonogrid.width).fill(0);
    for (let [r, row] of nonogrid.squares.entries()) {
        let rowCount = 0

        for (let [c, square] of row.entries()) {

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
        }

        // Finish row.
        if (rowCount > 0) {
            nonogrid.leftHints[r].push(rowCount);
        }

        // Handle empty row.
        if (nonogrid.leftHints[r].length === 0) {
            nonogrid.leftHints[r].push(0);
        }
    }

    // Handle last column.
    for (let c = 0; c < nonogrid.width; c++) {
        if (colCounts[c] > 0) {
            nonogrid.topHints[c].push(colCounts[c]);
        }

        // Handle empty columns.
        if (nonogrid.topHints[c].length === 0) {
            nonogrid.topHints[c].push(0);
        }
    }

    // Blank out empty rows.
    for (let [r, row] of nonogrid.squares.entries()) {
        for (let [c, square] of row.entries()) {
            // TODO must be a way to do this more nicely.
            if (nonogrid.leftHints[r][0] === 0 || nonogrid.topHints[c][0] === 0) {
                square.denied = true;
            }
        }
    }

    setHintsForDisplay(nonogrid);
}

function setHintsForDisplay(nonogrid) {
    // Set up left hints.
    nonogrid.maxLeftHintSize = 1;
    nonogrid.displayLeftHints = [];
    for (let item of nonogrid.leftHints) {

        let newItem = "";
        for (let hint of item) {

            if (hint.toString().length > 1) {
                newItem += `${VERT_SPACER}${hint}${VERT_SPACER}`;
            } else {
                newItem += `${hint}`;
            }
        }

        if (newItem.length > nonogrid.maxLeftHintSize) {
            nonogrid.maxLeftHintSize = newItem.length;
        }

        nonogrid.displayLeftHints.push(newItem);

    }

    // Set up top hints.
    nonogrid.maxTopHintSize = 1;
    nonogrid.displayTopHints = [];
    for (let item of nonogrid.topHints) {

        let newItem = "";
        for (let hint of item) {

            if (hint.toString().length > 1) {
                newItem += `${HORIZ_SPACER}${hint}${HORIZ_SPACER}`;
            } else {
                newItem += `${hint}`;
            }

        }

        if (newItem.length > nonogrid.maxTopHintSize) {
            nonogrid.maxTopHintSize = newItem.length;
        }

        nonogrid.displayTopHints.push(newItem);
    }

    // Pad left hints.
    for (let [i, item] of nonogrid.displayLeftHints.entries()){
        if (item.length < nonogrid.maxLeftHintSize) {
            nonogrid.displayLeftHints[i] = `${Array(nonogrid.maxLeftHintSize - item.length).join(" ")}${item}`;
        }
    }

    // Pad top hints.
    for (let [i, item] of nonogrid.displayTopHints.entries()){
        if (item.length < nonogrid.maxTopHintSize) {
            nonogrid.displayTopHints[i] = `${Array(nonogrid.maxTopHintSize - item.length).join(" ")}${item}`;
        }
    }

    console.log(`Left Hints: \n${nonogrid.displayLeftHints.join("\n")}`);
    console.log(`Top Hints: \n${nonogrid.displayTopHints.join("\n")}`);
}

function getSquaresHelper(dim, squareSize=1, spacerSize=1, metaSpacerSize=1) {
    return (dim * squareSize) +
        ((dim-1) * spacerSize) +
        ((Math.floor(dim/SPACER) + 1) * metaSpacerSize) +
        (dim % SPACER == 0 ? 0 : 1 * metaSpacerSize);
}

function drawBoard(nonogrid) {
    // Set up canvas.
    canvas.width = getSquaresHelper(nonogrid.width, SIZE, SQUARE_SPACER, METASQUARE_SPACER);
    console.log(canvas.width);

    canvas.height = getSquaresHelper(nonogrid.height, SIZE, SQUARE_SPACER, METASQUARE_SPACER);

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = METASQUARE_SPACER;
    for (let [r, row] of nonogrid.squares.entries()) {

        let x = METASQUARE_SPACER;
        for (let [c, square] of row.entries()) {
            if (square.hasValue) {
                ctx.fillStyle = VALUE;
            } else if (square.denied) {
                ctx.fillStyle = DENIED;
            } else {
                ctx.fillStyle = EMPTY;
            }
            ctx.fillRect(x, y, SIZE, SIZE);

            x += SIZE;

            if (c != nonogrid.width - 1) {
                x += SQUARE_SPACER;

                if ((c + 1) % 5 === 0) {
                    x += METASQUARE_SPACER;
                }
            }
        }

        y += SIZE;

        if (r != nonogrid.height - 1) {
            y += SQUARE_SPACER;

            if ((r + 1) % 5 === 0) {
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
