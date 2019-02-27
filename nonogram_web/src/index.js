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
        let buttonClass;
        if (value === SQUARE_VALUES.FILLED) {
            buttonClass = "filled-square";
        } else if (value === SQUARE_VALUES.EMPTY) {
            buttonClass = "empty-square";
        } else if (this.props.blocked) {
            buttonClass = "force-blocked-square";
        } else {
            buttonClass = "blocked-square";
        }

        // TODO dry
        if (this.props.blocked) {
            return (
                <button
                    className={buttonClass}
                    onClick={this.props.onClick}
                    disabled>

                    {buttonContents}
                </button>
            );
        } else {
            return (
                <button
                    className={buttonClass}
                    onClick={this.props.onClick}>

                    {buttonContents}
                </button>
            );
        }
    }
}

Square.propTypes = {
    displayValue: PropTypes.any.isRequired,
    filled: PropTypes.bool.isRequired,
    blocked: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired
};

class Game extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            code: props.code,
        };

        // TODO find best practices for this nonsense I'm doing.
        // TODO specifically the like 10 loops over every square this all requires.
        // there MUST be a better way.
        let newState;
        newState = this.decodeSquares();
        this.state.height = newState.height;
        this.state.width = newState.width;
        this.state.size = newState.size;
        this.state.squares = newState.squares;

        // generate hints,
        // and then force blank rows based on those hints.
        let hints = this.genHints();
        this.state.leftHints = hints.leftHints;
        this.state.topHints = hints.topHints;
        this.state.maxTopHintSize = hints.maxTopHintSize;
        this.state.maxLeftHintSize = hints.maxLeftHintSize;

        newState = this.setBlockedSections();
        this.state.squares = newState.squares;

        // and then reformat hints again.
        newState = this.setHintsForDisplay();
        this.state.leftHints = newState.leftHints;
        this.state.topHints = newState.topHints;
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
                        validateResult: "Solution is not correct!",
                    });
                    return;
                }
            }
        }

        this.setState({
            validateResult: "Solution is correct!",
        });
    }

    reset() {
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
            topHints: topHints,
            leftHints: leftHints,
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

    decodeSquares() {
        // base64 -> zip -> string -> object.
        // also need to un-url-safe-encode in there.
        let base64BoardDict = this.state.code.replace(/_/g, "/").replace(/-/g, "+");
        let boardDictZipped = window.atob(base64BoardDict);
        let boardDictArray = pako.ungzip(boardDictZipped);

        // I hate this quote replacing.
        let boardDictString = new TextDecoder("utf-8").decode(boardDictArray).replace(/'/g, "\"");

        let boardDict = JSON.parse(boardDictString);
        let height = parseInt(boardDict.height, 10);
        let width = parseInt(boardDict.width, 10);

        let size = height * width;

        let hexString = boardDict.squares;

        let unpaddedBinary = "";
        for (let h = 0; h < hexString.length; h++) {
            let hexit = hexString[h];
            // Make sure not to put extra padding in from the first digit - padding step below
            // will take it.
            let bitString = parseInt(hexit, 16).toString(2);
            if (h > 0) {
                unpaddedBinary += bitString.padStart(4, "0");
            } else {
                unpaddedBinary += bitString;
            }
        }

        let paddedBinary = unpaddedBinary.padStart(size, "0");

        let squares = [];
        let row = [];
        // python would let me enumerate over the string...
        for (let i = 0; i < size; i++) {
            let char = paddedBinary[i];

            if (i % width === 0 && i !== 0) {
                squares.push(row);
                row = [];
            }

            // convert 1D array index i into 2D indices r and c for convenience.
            const r = Math.floor(i / width);
            const c = i % width;

            let square = <Square
                key={i}
                filled={char === "1"}
                displayValue={SQUARE_VALUES.EMPTY}
                blocked={false}
                onClick={() => this.handleClick(r, c)}
            />;
            row.push(square);
        }

        squares.push(row);

        return {
            height: height,
            width: width,
            squares: squares,
            size: size,
        };
    }

    render() {
        // the nonogram grid should be broken into segments this big by this big,
        // for readability.
        const gridBreak = 5;

        const reset =
            <button onClick={() => this.reset()}>
                Reset
            </button>;

        const validate =
            <button onClick={() => this.validate()}>
                Validate
            </button>;

        // TODO push back down into a board class.
        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        let rowIndex = 0;
        const board = [];
        let gridStart = this.state.maxLeftHintSize;

        for (let hintRow of this.state.topHints) {
            let newRow =
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

                        return <li className={entryClassName} key={itemIndex}>
                            {item}
                        </li>;
                    })}
                </ul>;

            board.push(newRow);
            rowIndex++;
        }

        for (let i = 0; i < this.state.height; i++) {
            let entries = [];
            entries.push(...this.state.leftHints[i]);
            entries.push(...this.state.squares[i]);

            let rowClassName;
            let squareRowIndex = rowIndex - this.state.maxTopHintSize;
            if (squareRowIndex === 0 ||
                squareRowIndex === this.state.height - 1 ||
                (squareRowIndex+1) % gridBreak !== 0) {
                rowClassName = "board-row";
            } else {
                rowClassName = "board-row-spacer";
            }

            let newRow =
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

                        return <li className={entryClassName} key={itemIndex}>
                            {item}
                        </li>;
                    })}
                </ul>;

            board.push(newRow);
            rowIndex++;
        }

        return (
            <div className="game">
                <div className="game-board">
                    {board}
                </div>
                <div className="game-info">
                    <div>{reset}</div>
                    <div>
                        {validate}
                    </div>
                    <div>
                        {this.state.validateResult}
                    </div>
                </div>
            </div>
        );
    }
}

Game.propTypes = {
    code: PropTypes.string.isRequired,
    height: PropTypes.number,
    width: PropTypes.number,
    squares: PropTypes.array,
};

// ========================================

let PARAMS = queryString.parse(window.location.search);
let BOARD_CODE = PARAMS.board;

let BOARD = <Game code={BOARD_CODE}/>;

ReactDOM.render(
    BOARD,
    document.getElementById("root")
);
