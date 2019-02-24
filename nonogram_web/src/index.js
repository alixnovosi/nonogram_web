import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

var pako = require('pako');

const SQUARE_VALUES = Object.freeze({
    EMPTY: Symbol('Empty'),
    FILLED: Symbol('Filled'),
    CROSSED_OFF: Symbol('CrossedOff'),
});

const SQUARE_VALUES_MAP = [SQUARE_VALUES.EMPTY, SQUARE_VALUES.FILLED, SQUARE_VALUES.CROSSED_OFF];

function SquareButton(props) {
    const value = SQUARE_VALUES_MAP[props.value];
    const button_contents = value === SQUARE_VALUES.CROSSED_OFF ? 'X' : null;
    const button_class = value === SQUARE_VALUES.FILLED ? 'filled_square' : 'square';
    return (
        <button className={button_class} onClick={props.onClick} >{button_contents}</button>
    );
}

class Board extends React.Component {
    renderSquare(i) {
        return (
            <SquareButton
                value={this.props.squares[i]}
                onClick={() => this.props.onClick(i)}
            />
        );
    }

    render() {
        const height = this.props.height;
        const width = this.props.width;
        const size = height * width;

        let board = [];
        for (var i = 0; i < size; i += width) {
            let row = [];
            for (var j = i; j < i + width; j++) {
                row.push(this.renderSquare(j));
            }

            board.push(<div>{row}</div>);
        }

        return <div>{board}</div>;
    }
}

class Game extends React.Component {
    constructor(props) {
        super(props);

        let size = props.height * props.width;

        // TODO it's weird that the square buttons are stored as a 1D array,
        // but the actual values are a 2D array.
        // refactor.
        this.state = {
            height: props.height,
            width: props.width,
            history: [{
                squares: Array(size).fill(0),
            }],
            values: props.values,
            stepNumber: 0,
        };

        let hints = this.genHints();

        this.state.leftHints = hints.leftHints;
        this.state.topHints = hints.topHints;
    }

    handleClick(i) {
        const history = this.state.history.slice(0, this.state.stepNumber + 1);
        const current = history[history.length - 1];
        const squares = current.squares.slice();

        squares[i] = (squares[i] + 1) % SQUARE_VALUES_MAP.length;
        this.setState({
            history: history.concat([{
                squares: squares,
            }]),
            stepNumber: history.length,
        });
    }

    reset() {
        this.setState({
            stepNumber: 0,
        });
    }

    jumpTo(step) {
        this.setState({
            stepNumber: step,
        });
    }

    genHints() {
        let leftHints = [...Array(this.state.height).keys()].map(() => []);
        let topHints = [...Array(this.state.width).keys()].map(() => []);

        let colCounts = Array(this.state.width).fill(0);
        for (let [r, row] of this.state.values.entries()) {
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

        // this.blankEmptyRows();
        // this.setHintsForDisplay();
        console.log(leftHints);
        console.log(`topHints ${topHints}`);

        return {topHints: topHints, leftHints: leftHints};
    }

    render() {
        const history = this.state.history;
        const current = history[this.state.stepNumber];

        const moves = history.map((step, move) => {
            const desc = move ?
                `Go to move #${move}` :
                'Go to game start';

            return (
                <li key={move}>
                    <button onClick={() => this.jumpTo(move)}>
                        {desc}
                    </button>
                </li>
            );
        });

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
                        squares={current.squares}
                        onClick={(i) => this.handleClick(i)}
                    />
                </div>
                <div className="game-info">
                    <div>{reset}</div>
                </div>
            </div>
        );
    }
}

// ========================================

let test_board_code = "eJyrVs9IzUzPKFG3UrDQUVAvz0wpyQCyDY2AnOLC0sSi1GIgVz051cAw1cDALNXC3DwlOS0tJS0tLTU5Rb0WAG0IE5M";

let test_board = decode_squares(test_board_code);

ReactDOM.render(
    test_board,
    document.getElementById("root")
);

function decode_squares(code) {
    // base64 -> zip -> string -> object.
    // also need to un-url-safe-encode in there
    let base64BoardDict = code.replace(/_/g, "/").replace(/-/g, "+");

    let boardDictZipped = window.atob(base64BoardDict);

    let boardDictArray = pako.ungzip(boardDictZipped);

    // I hate this quote replacing.
    let boardDictString = new TextDecoder("utf-8").decode(boardDictArray).replace(/'/g, "\"");

    let boardDict = JSON.parse(boardDictString);
    let height = parseInt(boardDict.height, 10);
    let width = parseInt(boardDict.width, 10);
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

    let squares = [];
    let row = [];
    // python would let me enumerate over the string...
    for (let c = 0; c < padded_binary.length; c++) {
        let char = padded_binary[c];

        if (c % width === 0 && c !== 0) {
            squares.push(row);
            row = [];
        }

        row.push(char === "1");
    }

    squares.push(row);

    return (
        <Game width={width} height={height} values={squares}/>
    );
};
