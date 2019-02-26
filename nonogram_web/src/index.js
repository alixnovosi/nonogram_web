import React from "react";
import ReactDOM from "react-dom";
import pako from "pako";
import PropTypes from "prop-types";

import "./index.css";

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
        const button_contents = value === SQUARE_VALUES.CROSSED_OFF ? "X" : null;
        const button_class = value === SQUARE_VALUES.FILLED ? "filled_square" : "square";
        // TODO dry
        if (this.props.blocked) {
            return (
                <button
                    className={button_class}
                    onClick={this.props.onClick}
                    disabled>

                    {button_contents}
                </button>
            );
        } else {
            return (
                <button
                    className={button_class}
                    onClick={this.props.onClick}>

                    {button_contents}
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
        this.state.squares = newState.squares;

        // generate hints,
        // and then force blank rows based on those hints.
        let hints = this.genHints();
        this.state.leftHints = hints.leftHints;
        this.state.topHints = hints.topHints;

        newState = this.setBlockedSections();
        this.state.squares = newState.squares;

        // and then reformat hints again.
        newState = this.setHintsForDisplay(hints);
        this.state.leftHints = newState.leftHints;
        this.state.topHints = newState.topHints;
        this.state.maxTopHintSize = newState.maxTopHintSize;
        this.state.maxLeftHintSize = newState.maxLeftHintSize;
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

    reset() {
        let squares = this.state.squares.slice();

        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                let oldSquare = squares[r][c];
                if (oldSquare.props.blocked) {
                    squares[r][c] = React.cloneElement(
                        oldSquare,
                        {
                            displayValue: SQUARE_VALUES.CROSSED_OFF,
                            filled: false,
                        }
                    );
                } else {
                    squares[r][c] = React.cloneElement(
                        oldSquare,
                        {
                            displayValue: SQUARE_VALUES.EMPTY,
                            filled: false,
                        }
                    );

                }
            }
        }

        this.setState({
            squares: squares,
        });
    }

    genHints() {
        let leftHints = [...Array(this.state.height).keys()].map(() => []);
        let topHints = [...Array(this.state.width).keys()].map(() => []);

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
                        colCounts[c] = 0;
                    }

                    if (rowCount > 0) {
                        leftHints[r].push(rowCount);
                        rowCount = 0;
                    }
                }
            }

            // Finish row.
            if (rowCount > 0) {
                leftHints[r].push(rowCount);
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
            }

            // Handle empty columns.
            if (topHints[c].length === 0) {
                topHints[c].push(0);
            }
        }

        return {
            topHints: topHints,
            leftHints: leftHints,
        };
    }

    setHintsForDisplay(hints) {
        // pad out hints.
        // we want all left hints to be of the same length,
        // and all top hints,
        // so we can more easily align them with each other and the squares.

        // TODO can I be more clever and save a loop here? maybe do this in genHints somehow?
        let maxLeftHintSize = 0;
        for (let hint of hints.leftHints) {
            if (hint.length > maxLeftHintSize) {
                maxLeftHintSize = hint.length;
            }
        }

        let leftHints = [];
        for (let hint of hints.leftHints) {
            let newHint = [];
            if (hint.length < maxLeftHintSize) {
                newHint.push(...Array(maxLeftHintSize - hint.length).fill(null));
            }
            newHint.push(...hint);

            leftHints.push(newHint);
        }

        let maxTopHintSize = 0;
        for (let hint of hints.topHints) {
            if (hint.length > maxTopHintSize) {
                maxTopHintSize = hint.length;
            }
        }

        let topHints = [];
        for (let hint of hints.topHints) {
            let newHint = [];
            if (hint.length < maxTopHintSize) {
                newHint.push(...Array(maxTopHintSize - hint.length).fill(null));
            }
            newHint.push(...hint);

            topHints.push(newHint);
        }

        // rearrange top hints into horizontal arrays after padding.
        // should be safe to do at that point without misaligning them.
        let finalTopHints = [];
        for (let i = 0; i < maxTopHintSize; i++) {
            // pad out space equal to how wide the left hints are,
            // so these hints align with the board.
            let newHintRow = Array(maxLeftHintSize).fill(null);
            newHintRow.push(...topHints.map(list => list[i]));

            finalTopHints.push(newHintRow);
        }

        return {
            maxTopHintSize: maxTopHintSize,
            maxLeftHintSize: maxLeftHintSize,
            topHints: finalTopHints,
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

        let squares = [];
        let row = [];
        // python would let me enumerate over the string...
        for (let i = 0; i < padded_binary.length; i++) {
            let char = padded_binary[i];

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

        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        let rowIndex = 0;
        const board = [];
        let gridStart = this.state.leftHints[0].length;

        for (let hintRow of this.state.topHints) {
            let newRow =
                <ul className="board-row" key={rowIndex}>
                    {hintRow.map((item, itemIndex) => {
                        // TODO gross.
                        let entryClassName;
                        if (itemIndex > gridStart && (itemIndex-gridStart+1) % gridBreak === 0) {
                            entryClassName = "board-entry-spacer";
                        } else {
                            entryClassName = "board-entry";
                        }

                        return <li className={entryClassName} key={itemIndex}>
                            {item}
                        </li>;
                    })}
                </ul>;

            board.push(newRow);
            rowIndex++;
        }

        for (let i = 0; i < this.state.squares.length; i++) {
            let entries = [];
            entries.push(...this.state.leftHints[i]);
            entries.push(...this.state.squares[i]);

            let rowClassName;
            if ((rowIndex-1) % gridBreak === 0) {
                rowClassName = "board-row-spacer";
            } else {
                rowClassName = "board-row";
            }

            let newRow =
                <ul className={rowClassName} key={rowIndex}>
                    {entries.map((item, itemIndex) => {
                        let entryClassName;
                        // TODO gross.
                        if (itemIndex > gridStart && (itemIndex-gridStart+1) % 5 === 0) {
                            entryClassName = "board-entry-spacer";
                        } else {
                            entryClassName = "board-entry";
                        }

                        return <li className={entryClassName} key={itemIndex}>
                            {item}
                        </li>;
                    })}
                </ul>;

            board.push(newRow);
            rowIndex++;
        }

        // TODO this just keeps getting messier.
        return (
            <div className="game">
                <div className="game-board">
                    {board}
                </div>
                <div className="game-info">
                    <div>{reset}</div>
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

let test_board_code = "eJyrVs9IzUzPKFG3UjDVUVAvz0wpyQCyDU2AnOLC0sSi1GIgV93Q2DjNIDnN0NA81cQ8xSLJ2FK9FgAH6xDX";

let test_board = <Game code={test_board_code}/>;

ReactDOM.render(
    test_board,
    document.getElementById("root")
);
