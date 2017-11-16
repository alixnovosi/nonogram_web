let SIZE = 20;
let SQUARE_SPACER = 2;
let METASQUARE_SPACER = 4;

// How many spaces before we put a bigger break between squares in.
let SPACER = 5

let HORIZ_SPACER = "─";
let VERT_SPACER = "│";

let BACKGROUND = "#666677";
let VALUE = "#000011";
let DENIED = "#9999AA"
let EMPTY = "#EEEEFF";
let FONT = "19px Arial";

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

    genHints() {
        this.leftHints = [...Array(this.height).keys()].map(() => []);
        this.topHints = [...Array(this.width).keys()].map(() => []);

        let colCounts = Array(this.width).fill(0);
        for (let [r, row] of this.squares.entries()) {
            let rowCount = 0

            for (let [c, square] of row.entries()) {

                if (square.hasValue) {
                    rowCount += 1;
                    colCounts[c] += 1;
                } else {
                    if (colCounts[c] > 0) {
                        this.topHints[c].push(colCounts[c]);
                        colCounts[c] = 0;
                    }

                    if (rowCount > 0) {
                        this.leftHints[r].push(rowCount);
                        rowCount = 0;
                    }
                }
            }

            // Finish row.
            if (rowCount > 0) {
                this.leftHints[r].push(rowCount);
            }

            // Handle empty row.
            if (this.leftHints[r].length === 0) {
                this.leftHints[r].push(0);
            }
        }

        // Handle last column.
        for (let c = 0; c < this.width; c++) {
            if (colCounts[c] > 0) {
                this.topHints[c].push(colCounts[c]);
            }

            // Handle empty columns.
            if (this.topHints[c].length === 0) {
                this.topHints[c].push(0);
            }
        }

        this.blankEmptyRows()
        this.setHintsForDisplay();
    }

    blankEmptyRows() {
        for (let [r, row] of this.squares.entries()) {
            for (let [c, square] of row.entries()) {
                // TODO must be a way to do this more nicely.
                if (this.leftHints[r][0] === 0 || this.topHints[c][0] === 0) {
                    square.denied = true;
                }
            }
        }
    }

    setHintsForDisplay() {
        // Set up left hints.
        this.maxLeftHintSize = 1;
        this.displayLeftHints = [];
        for (let item of this.leftHints) {

            let newItem = "";
            for (let hint of item) {

                if (hint.toString().length > 1) {
                    newItem += `${VERT_SPACER}${hint}${VERT_SPACER}`;
                } else {
                    newItem += `${hint}`;
                }
            }

            if (newItem.length > this.maxLeftHintSize) {
                this.maxLeftHintSize = newItem.length;
            }

            this.displayLeftHints.push(newItem);
        }

        // Set up top hints.
        this.maxTopHintSize = 1;
        this.displayTopHints = [];
        for (let item of this.topHints) {

            let newItem = "";
            for (let hint of item) {

                if (hint.toString().length > 1) {
                    newItem += `${HORIZ_SPACER}${hint}${HORIZ_SPACER}`;
                } else {
                    newItem += `${hint}`;
                }
            }

            if (newItem.length > this.maxTopHintSize) {
                this.maxTopHintSize = newItem.length;
            }

            this.displayTopHints.push(newItem);
        }

        // Pad left hints.
        for (let [i, item] of this.displayLeftHints.entries()){
            this.displayLeftHints[i] = item.padStart(this.maxLeftHintSize);
        }

        // Pad top hints.
        for (let [i, item] of this.displayTopHints.entries()){
            this.displayTopHints[i] = item.padStart(this.maxTopHintSize);
        }
    }

    drawBoard(canvas, ctx, valueColor=EMPTY) {
        let leftHintWidth = (SIZE + SQUARE_SPACER) * this.displayLeftHints[0].length
        let topHintHeight = (SIZE + SQUARE_SPACER) * this.displayTopHints[0].length

        canvas.width = leftHintWidth + getSquaresHelper(this.width, SIZE, SQUARE_SPACER, METASQUARE_SPACER) + leftHintWidth;
        canvas.height = topHintHeight + getSquaresHelper(this.height, SIZE, SQUARE_SPACER, METASQUARE_SPACER) + topHintHeight;

        ctx.fillStyle = BACKGROUND;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = FONT;

        let x = 0;
        let y = METASQUARE_SPACER + SIZE;
        // Print top hints.
        for (let i = 0; i < this.displayTopHints[0].length; i++) {

            // Space out left hints.
            x = METASQUARE_SPACER + leftHintWidth + SIZE / 2;
            for (let [hi, item] of this.displayTopHints.map(x => x[i]).entries()) {
                ctx.fillStyle = VALUE;
                ctx.fillText(item, x, y);
                x += SIZE + SQUARE_SPACER;

                if ((hi+1) % 5 == 0) {
                    x += METASQUARE_SPACER;
                }
            }

            y += SIZE * 1.5;
        }

        // Handle squares and left hints.
        for (let [r, row] of this.squares.entries()) {

            x = SQUARE_SPACER + METASQUARE_SPACER;
            for (let hint of this.displayLeftHints[r]) {
                ctx.fillStyle = VALUE;
                ctx.fillText(hint, x, y);
                x += SIZE;
            }

            // Space hints from square.
            x = METASQUARE_SPACER + leftHintWidth + SIZE / 3;

            for (let [c, square] of row.entries()) {
                if (square.hasValue) {
                    ctx.fillStyle = valueColor;
                } else if (square.denied) {
                    ctx.fillStyle = DENIED;
                } else {
                    ctx.fillStyle = EMPTY;
                }

                // TODO figure out why text and squares are drawn differently and why I need this.
                // maybe also better align python+js code
                ctx.fillRect(x, y-(SIZE*4/5), SIZE, SIZE);

                x += SIZE + SQUARE_SPACER;

                if ((c + 1) % 5 === 0) {
                    x += METASQUARE_SPACER;
                }
            }

            y += SIZE + SQUARE_SPACER;
            if ((r + 1) % 5 === 0) {
                y += METASQUARE_SPACER;
            }
        }
    }
}

function decodeNonogram(boardCode) {
    // base64 -> zip -> string -> object.
    // also need to un-url-safe-encode in there
    let decoded = window.atob(boardCode.replace(/_/g, '/').replace(/-/g, '+'));
    let boardDictEncoded = pako.ungzip(decoded);

    // I hate this quote replacing.
    let boardDictString = new TextDecoder("utf-8").decode(boardDictEncoded).replace(/'/g, '"');

    let boardDict = JSON.parse(boardDictString);
    let height = parseInt(boardDict.height, 10);
    let width = parseInt(boardDict.width, 10);
    let size = height * width;

    let hexString = boardDict["squares"];

    let nonogrid = new Nonogrid(width, height);

    let unpadded_binary = ""
    for (let h = 0; h < hexString.length; h++) {
        let hexit = hexString[h];
        // Make sure not to put extra padding in from the first digit - padding step below will take it.
        let bit_string = parseInt(hexit, 16).toString(2);
        if (h > 0) {
            unpadded_binary += bit_string.padStart(4, "0");
        } else {
            unpadded_binary += bit_string;
        }
    }

    let padded_binary = unpadded_binary.padStart(size, "0");

    let squares = [];
    let row = [];
    // python would let me enumerate over the string...
    for (let c = 0; c < padded_binary.length; c++) {
        let char = padded_binary[c];

        if (c % width == 0 && c != 0) {
            squares.push(row);
            row = [];
        }

        let square = new Nonosquare();
        if (char == '1') {
            square.hasValue = true;
        }

        row.push(square);
    }

    squares.push(row);

    nonogrid.squares = squares;
    nonogrid.genHints();

    return nonogrid;
}

function getSquaresHelper(dim, squareSize=1, spacerSize=1, metaSpacerSize=1) {
    return (dim * squareSize) +
        ((dim-1) * spacerSize) +
        ((Math.floor(dim/SPACER) + 1) * metaSpacerSize) +
        (dim % SPACER == 0 ? 0 : 1 * metaSpacerSize);
}

window.onload = () => {
    // Set up canvas.
    let canvas = document.getElementById("nonogram_board");
    let ctx = canvas.getContext("2d");

    // Get URL Params, and then encoded board.
    let params = new URLSearchParams(window.location.search.slice(1));
    let solved = params.get("solved");
    let encodedBoard = params.get("board");

    if (encodedBoard == null) {
        console.log("sorry");
    } else {

        let nonogrid = decodeNonogram(encodedBoard);

        if (solved && solved != "0" && solved != "false") {
            nonogrid.drawBoard(canvas, ctx, VALUE);
        } else {
            nonogrid.drawBoard(canvas, ctx);
        }
    }
};
