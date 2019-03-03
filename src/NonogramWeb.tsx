import * as Pako from "pako";
import * as PropTypes from "prop-types";
import * as React from "react";
import * as ReactDOM from "react-dom";

// the nonogram grid should be broken into segments this big by this big for readability.
const GRID_BREAK = 5;

enum SquareValue {
    CrossedOff,
    Empty,
    Filled,
}

interface SquareProps {
    blocked: boolean;
    displayValue: SquareValue;
    filled: boolean;
    solved: boolean;
    onClick: () => void;
}

class Square extends React.Component<SquareProps, {}> {
    public render() {
        const value = this.props.displayValue;
        const buttonContents = value === SquareValue.CrossedOff ? "X" : null;

        let inputProps : { [key:string]:any; } = {};
        if (value === SquareValue.Filled) {
            inputProps.className = "filled-square";
        } else if (value === SquareValue.Empty) {
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

interface BoardProps {
    height: number;
    width: number;
    size: number;
    squares: Square[][];
    displayTopHints: string[][];
    displayLeftHints: string[][];
    maxTopHintSize: number;
    maxLeftHintSize: number;
};

class Board extends React.Component<BoardProps, {}> {
    render() {
        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        // manually track rowIndex so we can use it for modding,
        // and set indices correctly in the ul.
        let rowIndex = 0;
        let board = [];
        let gridStart = this.props.maxLeftHintSize;
        for (let hintRow of this.props.displayTopHints) {
            board.push(
                <ul className="board-row" key={rowIndex}>
                    {hintRow.map((item, itemIndex) => {
                        let entryClassName;
                        if ((itemIndex - gridStart) <= 0 ||
                            itemIndex === (hintRow.length - 1) ||
                            ((itemIndex+1) - gridStart) % GRID_BREAK !== 0) {

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

        for (let [r, row] of this.props.squares.entries()) {
            let entries : (string|Square)[] = [];
            entries.push(...this.props.displayLeftHints[r]);
            entries.push(...row);

            // we didn't add spacer rows in the hints because there's no reason to do that.
            // that means our rowIndex is off now and won't space correctly at GRID_BREAK points.
            // so correct for that here.
            let squareRowIndex = rowIndex - this.props.maxTopHintSize;
            let rowClassName;
            if (squareRowIndex === 0 ||
                squareRowIndex === this.props.height - 1 ||
                (squareRowIndex+1) % GRID_BREAK !== 0) {
                rowClassName = "board-row";
            } else {
                rowClassName = "board-row-spacer";
            }

            board.push(
                <ul className={rowClassName} key={rowIndex}>
                    {entries.map((item, itemIndex) => {
                        let entryClassName;
                        if ((itemIndex - gridStart) <= 0 ||
                            itemIndex === (entries.length - 1) ||
                            ((itemIndex+1) - gridStart) % GRID_BREAK !== 0) {

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

interface GameProps {
    code: string;
    solved: string | undefined;
}

interface GameState {
    code: string;
    solved: boolean;

    validateResult: string;

    displayLeftHints: string[][];
    displayTopHints: string[][];
    leftHints: number[][];
    topHints: number[][];

    maxLeftHintSize: number;
    maxTopHintSize: number;

    squares: Square[][];

    height: number;
    size: number;
    width: number;
}

class Game extends React.Component<GameProps, GameState> {
    constructor(props : GameProps) {
        super(props);

        let solved = false;
        if (this.props.solved &&
            (this.props.solved === "true" || this.props.solved === "1")) {
            solved = true;
        }
        // TODO I hate this pattern.
        // lol you thought that old pattern was bad
        this.state = {
            ...{
                code: this.props.code,
                solved: solved,
                validateResult: "",
            },
            ...this.decodeSquares(),
            ...this.genHints(),
            ...this.setBlockedSections(),
            ...this.genDisplayHints(),
        };
    }

    decodeSquares() {
        let base64Blob =
            this.state.code.replace(/_/g, "/").replace(/-/g, "+");

        let zipped;
        try {
            zipped = window.atob(base64Blob);
        } catch (err) {
            // TODO more robust error handling.
            // only case we handle now is messed up query params putting an extra ? in.
            let start = base64Blob.indexOf("?");
            zipped = window.atob(base64Blob.slice(0, start));
        }

        // I hate this quote replacing.
        let boardDict =
            JSON.parse(new TextDecoder("utf-8")
                .decode(
                    Pako.ungzip(zipped)
                ).replace(/'/g, "\"")
            );

        // we need the size separately because the encoding on the other end
        // can lose digits when it encodes the board as a hex string.
        // that SHOULD be redone,
        // but until I get around to it,
        // we have to do this.
        let height = parseInt(boardDict.height, 10);
        let width = parseInt(boardDict.width, 10);
        let size = height * width;

        // okay.
        // so what we're doing here,
        // is reading each hex digit out,
        // converting it to the four squares it represents,
        // and filling those four squares.
        // mapping from a 1D string representing 4-digit chunks to a 2D array,
        // it's weird
        let hexString = boardDict.squares;
        let i = size-1;
        let squares = [...Array(height).keys()].map(() => [...Array(width).fill(0)]);
        for (let h = hexString.length-1; h >= 0; h--) {

            let binChunk = parseInt(hexString[h], 16).toString(2);
            for (var j = 0; j < 4; j++) {
                // TODO I think this needs another j = 3-j setup.
                let filled = binChunk[j] === "1";
                let defaultDisplayValue;
                if (this.state.solved && filled) {
                    defaultDisplayValue = SquareValue.Filled;
                } else {
                    defaultDisplayValue = SquareValue.Empty;
                }

                let r = Math.floor(i / width);
                let c = i % width;
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
                if (i < 0) {
                    break;
                }
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
        let leftHints : number[][] = [...Array(this.state.height).keys()].map(() => []);
        let topHints : number[][] = [...Array(this.state.width).keys()].map(() => []);

        // calculate max top/left hints as we go,
        // so we don't have to do it later.
        // this is used for formatting the hints.
        // we set to 1 because if we have all empty rows or columns or both,
        // these will never be set.
        let maxTopHintSize = 1;
        let maxLeftHintSize = 1;

        // generate hints by counting squares in each row and column.
        // if we encounter an empty square while having a count,
        // add that as a hint.
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
                        colCounts[c] = 0;

                        // when pushing new top hints,
                        // check if we have a new largest top hint.
                        if (topHints[c].length > maxTopHintSize) {
                            maxTopHintSize = topHints[c].length;
                        }
                    }

                    if (rowCount > 0) {
                        leftHints[r].push(rowCount);
                        rowCount = 0;

                        // do this for left hints as well.
                        if (leftHints[r].length > maxLeftHintSize) {
                            maxLeftHintSize = leftHints[r].length;
                        }
                    }
                }
            }

            // handle still having a cell count at end of row.
            if (rowCount > 0) {
                leftHints[r].push(rowCount);

                // one more max hint size check.
                if (leftHints[r].length > maxLeftHintSize) {
                    maxLeftHintSize = leftHints[r].length;
                }
            }

            // handle empty row.
            if (leftHints[r].length === 0) {
                leftHints[r].push(0);
            }
        }

        // handle any leftover column counts uncounted due to not finding an empty square.
        for (let [c, colCount] of colCounts.entries()) {
            if (colCount > 0) {
                topHints[c].push(colCount);

                // and one more max hint size check here.
                if (topHints[c].length > maxTopHintSize) {
                    maxTopHintSize = topHints[c].length;
                }
            }

            // handle empty columns.
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
        for (let [r, row] of squares.entries()) {
            for (let [c, square] of row.entries()) {
                // TODO must be a way to do this more nicely.
                if (this.state.leftHints[r][0] === 0 ||
                    this.state.topHints[c][0] === 0) {

                    squares[r][c] = new Square(
                        {
                            ...square.props,
                            ...{
                                blocked: true,
                                displayValue: SquareValue.CrossedOff,
                            },
                        }
                    );
                }
            }
        }

        return {
            squares: squares,
        };
    }

    genDisplayHints() {
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

        let displayLeftHints = [];
        for (let hint of this.state.leftHints) {
            let newHint = [];
            if (hint.length < this.state.maxLeftHintSize) {
                newHint
                    .push(...Array(this.state.maxLeftHintSize - hint.length)
                        .fill(null));
            }
            newHint.push(...hint);

            displayLeftHints.push(newHint);
        }

        let displayTopHints = [...Array(this.state.maxTopHintSize).keys()]
            .map(
                () => Array(this.state.maxLeftHintSize).fill(null)
            );
        for (let hintCol of this.state.topHints) {
            let paddedHintCol = [];
            if (hintCol.length < this.state.maxTopHintSize) {
                paddedHintCol.push(...Array(this.state.maxTopHintSize - hintCol.length)
                    .fill(null));
            }
            paddedHintCol.push(...hintCol);

            // in addition to padding,
            // we want to rearrange the top hints from "vertical" arrays to "horizontal",
            // to make displaying them more straightforward.
            for (let [h, hint] of paddedHintCol.entries()) {
                displayTopHints[h].push(hint);
            }
        }

        return {
            displayTopHints: displayTopHints,
            displayLeftHints: displayLeftHints,
        };
    }

    handleClick(r : number, c : number) {
        let squares = this.state.squares.slice();

        let square = squares[r][c];
        let displayValue = (square.props.displayValue + 1) % Object.keys(SquareValue).length;

        squares[r][c] = new Square(
            {
                ...square.props,
                ...{
                    displayValue: displayValue,
                },
            }
        );

        this.setState({
            squares: squares,
        });
    }

    validate() {
        for (let row of this.state.squares) {
            for (let square of row) {
                if ((square.props.filled && square.props.displayValue === SquareValue.Empty) ||
                    (!square.props.filled && square.props.displayValue === SquareValue.Filled)) {
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
                    displayValue = SquareValue.CrossedOff;
                } else {
                    displayValue = SquareValue.Empty;
                }

                squares[r][c] = new Square(
                    {
                        ...square.props,
                        ...{
                            displayValue: displayValue,
                        },
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

export default Game;
