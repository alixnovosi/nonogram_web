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

const SQUARE_VALUES_MAP = [SQUARE_VALUES.EMPTY, SQUARE_VALUES.FILLED, SQUARE_VALUES.CROSSED_OFF];

class Square extends React.Component {
    render() {
        const value = SQUARE_VALUES_MAP[this.props.displayValue];
        const button_contents = value === SQUARE_VALUES.CROSSED_OFF ? "X" : null;
        const button_class = value === SQUARE_VALUES.FILLED ? "filled_square" : "square";
        return (
            <button
                className={button_class}
                onClick={this.props.onClick}
                disabled={this.props.disabled}>

                {button_contents}
            </button>
        );
    }
}

Square.propTypes = {
    filled: PropTypes.bool.isRequired,
    displayValue: PropTypes.number.isRequired,
    disabled: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired
};

class Board extends React.Component {
    render() {
        let board = [];
        for (var r = 0; r < this.props.squares.length; r++) {
            let row = [];
            for (var c = 0; c < this.props.width; c++) {
                row.push(this.props.squares[r][c]);
            }

            board.push(<div>{row}</div>);
        }

        return <div>{board}</div>;
    }
}

Board.propTypes = {
    height: PropTypes.number.isRequired,
    width: PropTypes.number,
    squares: PropTypes.array.isRequired,
};

class Game extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            code: props.code,
        };

        let newState;
        newState = this.decodeSquares();
        this.state.height = newState.height;
        this.state.width = newState.width;
        this.state.squares = newState.squares;

        // generate hints,
        // and then force blank rows based on those hints.
        newState = this.genHints();
        this.state.leftHints = newState.leftHints;
        this.state.topHints = newState.topHints;

        newState = this.initializeSquares();
        this.state.squares = newState.squares;
    }

    handleClick(r, c) {
        let squares = this.state.squares.slice();

        let oldSquare = squares[r][c];
        let newDisplayValue = (oldSquare.props.displayValue + 1) % SQUARE_VALUES_MAP.length;

        squares[r][c] =
            <Square
                key={oldSquare.key}
                filled={oldSquare.props.filled}
                displayValue={newDisplayValue}
                disabled={oldSquare.props.disabled}
                onClick={oldSquare.props.onClick}
            />;

        this.setState({
            squares: squares,
        });
    }

    reset() {
        let squares = this.state.squares.slice();

        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                squares[r][c].resetDisplay();
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

                if (square) {
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

        // this.setHintsForDisplay();
        return {
            topHints: topHints,
            leftHints: leftHints,
        };
    }

    // set disabled rows.
    initializeSquares() {
        console.log(this.state.leftHints);
        let squares = this.state.squares.slice();
        for (let r = 0; r < this.state.height; r++) {
            for (let c = 0; c < this.state.width; c++) {
                // TODO must be a way to do this more nicely.
                if (this.state.leftHints[r][0] === 0 || this.state.topHints[c][0] === 0) {
                    console.log("hei");
                    squares[r][c].disabled = true;
                }
            }
        }

        return {
            squares: squares,
        };
    }

    decodeSquares() {
        // base64 -> zip -> string -> object.
        // also need to un-url-safe-encode in there
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
            let r = Math.floor(i / width);
            let c = i % width;

            let square = <Square
                key={i}
                filled={char === "1"}
                displayValue={0}
                disabled={false}
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
        const reset =
            <button onClick={() => this.reset()}>
                Reset
            </button>;

        return (
            <div className="game">
                <div className="game-board">
                    <Board
                        height={this.state.height}
                        width={this.state.width}
                        squares={this.state.squares}
                    />
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
