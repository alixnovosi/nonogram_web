////////////////////////////////////////////////////////////////////////////////////////////////////
// AUTHOR:  Andrew Michaud - andrewmichaud.com                                                    //
// FILE:    nonogram.js                                                                           //
// PURPOSE: Renderer for nonogram puzzles.                                                        //
// UPDATED: 2018-03-21                                                                            //
// LICENSE: ISC                                                                                   //
////////////////////////////////////////////////////////////////////////////////////////////////////

// Sizes of squares, square dividers, every-SPACER-spaces divider.
const SIZE = 20;
const SQUARE_SPACER = 2;
const METASQUARE_SPACER = 4;

// How many spaces before we put a bigger break between squares in.
const SPACER = 5;

const HORIZ_SPACER = "─";
const VERT_SPACER = "│";

// Styles.
const BACKGROUND = "#666677";
const VALUE = "#000011";
const DENIED = "#9999AA";
const EMPTY = "#EEEEFF";

const FONT = "19px Arial";

class Nonosquare {
    constructor() {
        this.hasValue = false;
        this.filled = false;
        this.denied = false;
    }
}

class Nonogrid {
    constructor(width = 0, height = width) {
        this.width = width;
        this.height = height;
        this.squares = [...Array(this.height).keys()].map(() => Array(this.width));
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                this.squares[r][c] = new Nonosquare();
            }
        }
    }

    randomize() {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                this.squares[r][c].hasValue = (Math.floor(Math.random() * 2) == 0);
            }
        }
    }

    encode() {
        // object -> string -> zip -> base64
        let unpaddedBinary = [];
        let chunk = "";
        for (let r = this.squares.length - 1; r >= 0; r--) {
            let row = this.squares[r];
            for (let c = row.length - 1; c >= 0; c--) {
                if (this.squares[r][c].hasValue) {
                    chunk += "1";
                } else {
                    chunk += "0";
                }

                if (chunk.length == 4) {
                    unpaddedBinary.push(parseInt(chunk, 2).toString(16));
                    chunk = "";
                }
            }
        }

        // Handle last chunk.
        if (chunk !== "") {
            unpaddedBinary.push(parseInt(chunk, 2).toString(16));
        }

        unpaddedBinary.reverse();

        let hexString = unpaddedBinary.join("");

        let boardDict = {"height": this.height, "width": this.width, "squares": hexString};

        let boardDictString = JSON.stringify(boardDict);

        let boardDictZipped = pako.gzip(boardDictString, {to: "string"});

        let base64BoardDict = window.btoa(boardDictZipped);

        let url64BoardDict = base64BoardDict.replace(/\//g, "_").replace(/\+/g, "-");

        return url64BoardDict;
    }

    decode(boardCode) {
        // base64 -> zip -> string -> object.
        // also need to un-url-safe-encode in there
        let base64BoardDict = boardCode.replace(/_/g, "/").replace(/-/g, "+");

        let boardDictZipped = window.atob(base64BoardDict);

        let boardDictArray = pako.ungzip(boardDictZipped);

        // I hate this quote replacing.
        let boardDictString = new TextDecoder("utf-8").decode(boardDictArray).replace(/'/g, "\"");

        let boardDict = JSON.parse(boardDictString);
        let height = parseInt(boardDict.height, 10);
        let width = parseInt(boardDict.width, 10);

        this.height = height;
        this.width = width;

        let size = height * width;

        let hexString = boardDict["squares"];

        let unpadded_binary = "";
        for (let h = 0; h < hexString.length; h++) {
            let hexit = hexString[h];
            // Make sure not to put extra padding in from the first digit - padding step below
            // will take it.
            let bit_string = parseInt(hexit, 16).toString(2);
            if (h > 0) {
                unpadded_binary += bit_string.padStart(4, "0");
            } else {
                unpadded_binary += bit_string;
            }
        }

        let padded_binary = unpadded_binary.padStart(size, "0");

        this.squares = [];
        let row = [];
        // python would let me enumerate over the string...
        for (let c = 0; c < padded_binary.length; c++) {
            let char = padded_binary[c];

            if (c % width == 0 && c != 0) {
                this.squares.push(row);
                row = [];
            }

            let square = new Nonosquare();
            if (char == "1") {
                square.hasValue = true;
            }

            row.push(square);
        }

        this.squares.push(row);
    }


    genHints() {
        this.leftHints = [...Array(this.height).keys()].map(() => []);
        this.topHints = [...Array(this.width).keys()].map(() => []);

        let colCounts = Array(this.width).fill(0);
        for (let [r, row] of this.squares.entries()) {
            let rowCount = 0;

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

        this.blankEmptyRows();
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
        let leftHintWidth = (SIZE + SQUARE_SPACER) * this.displayLeftHints[0].length;
        let topHintHeight = (SIZE + SQUARE_SPACER) * this.displayTopHints[0].length;

        canvas.width = leftHintWidth +
            getSquaresHelper(this.width, SIZE, SQUARE_SPACER, METASQUARE_SPACER) + leftHintWidth;
        canvas.height = topHintHeight +
            getSquaresHelper(this.height, SIZE, SQUARE_SPACER, METASQUARE_SPACER) + topHintHeight;

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

function getSquaresHelper(dim, squareSize=1, spacerSize=1, metaSpacerSize=1) {
    return (dim * squareSize) +
        ((dim-1) * spacerSize) +
        ((Math.floor(dim/SPACER) + 1) * metaSpacerSize) +
        (dim % SPACER == 0 ? 0 : 1 * metaSpacerSize);
}

window.onload = () => {
    let canvas = document.getElementById("nonogram-board");
    let ctx = canvas.getContext("2d");

    let label = document.getElementById("nonogram-label");

    let params = new URLSearchParams(window.location.search.slice(1));
    let solved = params.get("solved");
    let encodedBoard = params.get("board");

    // Create a random board if given nothing.
    let nonogrid;
    if (encodedBoard == null) {
        let height = Math.floor(Math.random() * (20 - 5) + 5);
        let width = Math.floor(Math.random() * (20 - 5) + 5);
        nonogrid = new Nonogrid(width, height);
        nonogrid.randomize();

        encodedBoard = nonogrid.encode();

        label.textContent = `Generated puzzle.\nPuzzle code is:\n${encodedBoard}`;

    } else {
        nonogrid = new Nonogrid();
        nonogrid.decode(encodedBoard);
        label.textContent = `Decoded puzzle.\nPuzzle code is:\n${encodedBoard}`;
    }

    nonogrid.genHints();

    if (solved && solved != "0" && solved != "false") {
        nonogrid.drawBoard(canvas, ctx, VALUE);
    } else {
        nonogrid.drawBoard(canvas, ctx);
    }
};
