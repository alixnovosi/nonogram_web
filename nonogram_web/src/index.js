import React from "react";
import ReactDOM from "react-dom";
import pako from "pako";
import queryString from "query-string";
import PropTypes from "prop-types";

const SQUARE_VALUES = Object.freeze({
    EMPTY: Symbol("Empty"),
    FILLED: Symbol("Filled"),
    CROSSED_OFF: Symbol("CrossedOff"),
});

const SQUARE_VALUES_LIST = [
    SQUARE_VALUES.EMPTY,
    SQUARE_VALUES.FILLED,
    SQUARE_VALUES.CROSSED_OFF];

class Square extends React.Component {
    render() {
        const value = this.props.displayValue;
        const buttonContents = value === SQUARE_VALUES.CROSSED_OFF ? "X" : null;

        let inputProps = {};
        if (value === SQUARE_VALUES.FILLED) {
            inputProps.className = "filled-square";
        } else if (value === SQUARE_VALUES.EMPTY) {
            inputProps.className = "empty-square";
        } else if (this.props.blocked) {
            inputProps.className = "force-blocked-square";
        } else {
            inputProps.className = "blocked-square";
        }

        if (this.props.solved || this.props.blocked) {
            inputProps.disabled = true;
        }

        return (
            <button
                onClick={this.props.onClick}
                {...inputProps}>

                {buttonContents}
            </button>
        );
    }
}

Square.propTypes = {
    displayValue: PropTypes.symbol.isRequired,
    filled: PropTypes.bool.isRequired,
    blocked: PropTypes.bool.isRequired,
    solved: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired
};

class Board extends React.Component {
    render() {
        // the nonogram grid should be broken into segments this big by this big,
        // for readability.
        const gridBreak = 5;

        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        let rowIndex = 0;
        let board = [];
        let gridStart = this.props.maxLeftHintSize;

        for (let hintRow of this.props.displayTopHints) {
            board.push(
                <ul className="board-row" key={rowIndex}>
                    {hintRow.map((item, itemIndex) => {
                        let entryClassName;
                        if ((itemIndex - gridStart) <= 0 ||
                            itemIndex === (hintRow.size - 1) ||
                            ((itemIndex+1) - gridStart) % gridBreak !== 0) {

                            entryClassName = "board-entry";

                        } else {
                            entryClassName = "board-entry-spacer";
                        }

                        return (
                            <li className={entryClassName} key={itemIndex}>
                                {item}
                            </li>
                        );
                    })}
                </ul>
            );
            rowIndex++;
        }

        for (let i = 0; i < this.props.height; i++) {
            let entries = [];
            entries.push(...this.props.displayLeftHints[i]);
            entries.push(...this.props.squares[i]);

            let rowClassName;
            let squareRowIndex = rowIndex - this.props.maxTopHintSize;
            if (squareRowIndex === 0 ||
                squareRowIndex === this.props.height - 1 ||
                (squareRowIndex+1) % gridBreak !== 0) {
                rowClassName = "board-row";
            } else {
                rowClassName = "board-row-spacer";
            }

            board.push(
                <ul className={rowClassName} key={rowIndex}>
                    {entries.map((item, itemIndex) => {
                        let entryClassName;
                        if ((itemIndex - gridStart) <= 0 ||
                            itemIndex === (entries.size - 1) ||
                            ((itemIndex+1) - gridStart) % gridBreak !== 0) {

                            entryClassName = "board-entry";

                        } else {
                            entryClassName = "board-entry-spacer";
                        }

                        return (
                            <li className={entryClassName} key={itemIndex}>
                                {item}
                            </li>
                        );
                    })}
                </ul>
            );
            rowIndex++;
        }

        return board;
    }
}

Board.propTypes = {
    height: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
    squares: PropTypes.array.isRequired,
    displayTopHints: PropTypes.array.isRequired,
    displayLeftHints: PropTypes.array.isRequired,
    maxTopHintSize: PropTypes.number.isRequired,
    maxLeftHintSize: PropTypes.number.isRequired,
};

class Game extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            code: this.props.code,
            solved: false,
        };

        if (this.props.solved &&
            (this.props.solved === "true" || this.props.solved === "1")) {
            this.state.solved = true;
        }

        // TODO I hate this pattern.
        this.state = {...this.state, ...this.decodeSquares()};

        // generate hints,
        // and then force blank rows based on those hints.
        this.state = {...this.state, ...this.genHints()};
        this.state = {...this.state, ...this.setBlockedSections()};

        // finally,
        // reformat display hints.
        this.state = {...this.state, ...this.setHintsForDisplay()};
    }

    decodeSquares() {
        // base64url_safe -> base64 -> zip -> array.
        // also need to un-url-safe-encode in there.
        let base64BoardDict = this.state.code.replace(/_/g, "/").replace(/-/g, "+");

        let boardDictZipped;
        try {
            boardDictZipped = window.atob(base64BoardDict);
        } catch (err) {
            // TODO more robust error handling.
            // only case we handle now is messed up query params putting an extra ? in.
            let start = base64BoardDict.indexOf("?");
            boardDictZipped = window.atob(base64BoardDict.slice(0, start));
        }

        let boardDictArray = pako.ungzip(boardDictZipped);

        // I hate this quote replacing.
        let boardDictString = new TextDecoder("utf-8").decode(boardDictArray).replace(/'/g, "\"");

        // quote_replaced_string -> obj
        let boardDict = JSON.parse(boardDictString);

        // we need the size separately because the encoding on the other end
        // can lose digits when it encodes the board as a hex string.
        // that SHOULD be redone,
        // but until I get around to it,
        // we have to do this.
        let height = parseInt(boardDict.height, 10);
        let width = parseInt(boardDict.width, 10);
        let size = height * width;

        // hex to binary,
        // which will get us actual cell values.
        let hexString = boardDict.squares;

        // okay.
        // so what we're doing here,
        // is reading each hex digit out,
        // converting it to the four squares it represents,
        // and filling that square.
        // but we do it with a 2D loop over the squares,
        // because that seemed convenient.
        let squares = [...Array(height).keys()].map(() => [...Array(width).fill(0)]);
        let i = size-1;
        let lastHIndex = null;
        let hChunk;
        for (let r = height-1; r >= 0; r--) {
            for (let c = width-1; c >= 0; c--) {
                let hIndex = hexString.length - Math.floor((size - i - 1) / 4) - 1;
                if (hIndex !== lastHIndex) {
                    hChunk = parseInt(hexString[hIndex], 16).toString(2).padStart(4, "0");
                    lastHIndex = hIndex;
                }

                let hChunkIndex = (4 - ((size - i - 1) % 4)) - 1;
                let value = hChunk[hChunkIndex];
                let filled = value === "1";

                let defaultDisplayValue;
                if (this.state.solved && filled) {
                    defaultDisplayValue = SQUARE_VALUES.FILLED;
                } else {
                    defaultDisplayValue = SQUARE_VALUES.EMPTY;
                }

                squares[r][c] =
                    <Square
                        key={i}
                        filled={filled}
                        displayValue={defaultDisplayValue}
                        blocked={false}
                        onClick={() => this.handleClick(r, c)}
                        solved={this.state.solved}
                    />;

                i--;
            }
        }

        return {
            height: height,
            width: width,
            size: size,
            squares: squares,
        };
    }

    genHints() {
        let leftHints = [...Array(this.state.height).keys()].map(() => []);
        let topHints = [...Array(this.state.width).keys()].map(() => []);

        // calculate max top/left hints as we go,
        // so we don't have to do it later.
        // we set to 1 because if we have all empty rows or columns or both,
        // these will never be set.
        let maxTopHintSize = 1;
        let maxLeftHintSize = 1;

        // generate hints by counting squares in each row and column.
        // empty columns are handled in a later step.
        let colCounts = Array(this.state.width).fill(0);
        for (let [r, row] of this.state.squares.entries()) {
            let rowCount = 0;

            for (let [c, square] of row.entries()) {

                if (square.props.filled) {
                    rowCount += 1;
                    colCounts[c] += 1;
                } else {
                    if (colCounts[c] > 0) {
                        topHints[c].push(colCounts[c]);

                        // when pushing new top hints,
                        // check if we have a new largest top hint.
                        if (topHints[c].length > maxTopHintSize) {
                            maxTopHintSize = topHints[c].length;
                        }

                        colCounts[c] = 0;
                    }

                    if (rowCount > 0) {
                        leftHints[r].push(rowCount);

                        // do this for left hints as well.
                        if (leftHints[r].length > maxLeftHintSize) {
                            maxLeftHintSize = leftHints[r].length;
                        }

                        rowCount = 0;
                    }
                }
            }

            // Finish row.
            if (rowCount > 0) {
                leftHints[r].push(rowCount);

                if (leftHints[r].length > maxLeftHintSize) {
                    maxLeftHintSize = leftHints[r].length;
                }
            }

            // Handle empty row.
            if (leftHints[r].length === 0) {
                leftHints[r].push(0);
            }
        }

        // Handle last column.
        for (let c = 0; c < this.state.width; c++) {
            if (colCounts[c] > 0) {
                topHints[c].push(colCounts[c]);

                if (topHints[c].length > maxTopHintSize) {
                    maxTopHintSize = topHints[c].length;
                }
            }

            // Handle empty columns.
            if (topHints[c].length === 0) {
                topHints[c].push(0);
            }
        }

        return {
            topHints: topHints,
            leftHints: leftHints,
            maxLeftHintSize: maxLeftHintSize,
            maxTopHintSize: maxTopHintSize,
        };
    }

    setBlockedSections() {
        let squares = this.state.squares.slice();
        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                // TODO must be a way to do this more nicely.
                if (this.state.leftHints[r][0] === 0 || this.state.topHints[c][0] === 0) {
                    let oldSquare = squares[r][c];
                    squares[r][c] = React.cloneElement(
                        oldSquare,
                        {
                            blocked: true,
                            displayValue: SQUARE_VALUES.CROSSED_OFF,
                        }
                    );
                }
            }
        }

        return {
            squares: squares,
        };
    }

    setHintsForDisplay() {
        // we're essentially just padding hints out here.
        // we want all top hints to be arrays of the same length,
        // and we want all left hints to be arrays of the same length.

        // ADDITIONALLY,
        // we want top hints to be padded out by the size of the left hints,
        // so that they align with the board,
        // and,
        // for convenience,
        // we also want the top hints rearranged into rows,
        // not columns.

        // the left hints are easy,
        // they just need the first kind of padding.
        let leftHints = [];
        for (let hint of this.state.leftHints) {
            let newHint = [];
            if (hint.length < this.state.maxLeftHintSize) {
                newHint.push(...Array(this.state.maxLeftHintSize - hint.length).fill(null));
            }
            newHint.push(...hint);

            leftHints.push(newHint);
        }


        // the top hints are... harder.
        let topHints = [...Array(this.state.maxTopHintSize).keys()]
            .map(
                () => Array(this.state.maxLeftHintSize).fill(null)
            );
        for (let hintCol of this.state.topHints) {
            let paddedHintCol = [];
            if (hintCol.length < this.state.maxTopHintSize) {
                paddedHintCol.push(...Array(this.state.maxTopHintSize - hintCol.length).fill(null));
            }
            paddedHintCol.push(...hintCol);

            // in addition to padding,
            // we want to rearrange the top hints from "vertical" arrays to "horizontal",
            // to make displaying them more straightforward.
            for (let [h, hint] of paddedHintCol.entries()) {
                topHints[h].push(hint);
            }
        }

        return {
            displayTopHints: topHints,
            displayLeftHints: leftHints,
        };
    }

    handleClick(r, c) {
        let squares = this.state.squares.slice();

        let oldSquare = squares[r][c];
        let newDisplayIndex = (SQUARE_VALUES_LIST.indexOf(oldSquare.props.displayValue) + 1) %
            SQUARE_VALUES_LIST.length;

        squares[r][c] = React.cloneElement(
            oldSquare,
            {
                displayValue: SQUARE_VALUES_LIST[newDisplayIndex],
            }
        );

        this.setState({
            squares: squares,
        });
    }

    validate() {
        for (let row of this.state.squares) {
            for (let square of row) {
                if ((square.props.filled && square.props.displayValue === SQUARE_VALUES.EMPTY) ||
                    (!square.props.filled && square.props.displayValue === SQUARE_VALUES.FILLED)) {
                    this.setState({
                        validateResult: "No!❌",
                    });
                    return;
                }
            }
        }

        this.setState({
            validateResult: "Yes!✔️",
        });
    }

    reset() {
        if (this.state.solved) {
            return;
        }

        let squares = this.state.squares.slice();

        for (let [r, row] of squares.entries()) {
            for (let [c, square] of row.entries()) {
                let displayValue;
                if (square.props.blocked) {
                    displayValue = SQUARE_VALUES.CROSSED_OFF;
                } else {
                    displayValue = SQUARE_VALUES.EMPTY;
                }

                squares[r][c] = React.cloneElement(
                    square,
                    {
                        displayValue: displayValue,
                    }
                );
            }
        }

        this.setState({
            squares: squares,
        });
    }

    render() {
        const reset =
            <button onClick={() => this.reset()}>
                Reset
            </button>;

        const validate =
            <button onClick={() => this.validate()}>
                Validate
            </button>;

        let gameInfo = null;
        if (this.state.solved === false) {
            gameInfo = (
                <div className="game-info">
                    <div>
                        {reset}
                    </div>
                    <div>
                        {validate}
                    </div>
                    <div>
                        {this.state.validateResult}
                    </div>
                </div>
            );
        }

        return (
            <div className="game">
                <div className="game-board">
                    <Board
                        squares={this.state.squares}
                        height={this.state.height}
                        width={this.state.width}
                        size={this.state.size}
                        displayTopHints={this.state.displayTopHints}
                        displayLeftHints={this.state.displayLeftHints}
                        maxTopHintSize={this.state.maxTopHintSize}
                        maxLeftHintSize={this.state.maxLeftHintSize}
                    />
                </div>
                {gameInfo}
            </div>
        );
    }
}

Game.propTypes = {
    code: PropTypes.string.isRequired,
    solved: PropTypes.string,
    height: PropTypes.number,
    width: PropTypes.number,
    squares: PropTypes.array,
};

// ========================================

let PARAMS = queryString.parse(window.location.search);
let BOARD_CODE = PARAMS.board;
let SOLVED = PARAMS.solved;

let BOARD = <Game code={BOARD_CODE} solved={SOLVED}/>;

ReactDOM.render(
    BOARD,
    document.getElementById("root")
);
