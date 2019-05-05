import * as Pako from "pako";
import * as React from "react";

// the nonogram grid should be broken into segments this big by this big for readability.
const GRID_BREAK = 5;

// this seemed like the easiest way to later iterate through the enum values.
// I don't intend on changing the values,
// so this seems fine.
const SQUARE_VALUES_NUM = 3;
enum SquareValue {
    CrossedOff = 0,
    Empty = 1,
    Filled = 2,
}

interface SquareProps {
    blocked: boolean;
    filled: boolean;
    solved: boolean;

    displayValue: SquareValue;

    onClick: () => void;

    key: number,
    children?: React.ReactNode;
}

class Square extends React.Component<SquareProps, {}> {
    public constructor(props : SquareProps) {
        super(props)
    }

    public render() {
        const value = this.props.displayValue;
        const buttonContents = value === SquareValue.CrossedOff ? "X" : null;

        const inputProps : { [key:string]:any; } = {};
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

    displayLeftHints: string[][];
    displayTopHints: string[][];

    maxLeftHintSize: number;
    maxTopHintSize: number;

    children?: React.ReactNode;
};

class Board extends React.Component<BoardProps, {}> {
    public render() {
        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        // manually track rowIndex so we can use it for modding,
        // and set indices correctly in the ul.
        let rowIndex = 0;
        const board : JSX.Element[] = [];
        const gridStart = this.props.maxLeftHintSize;
        for (const hintRow of this.props.displayTopHints) {
            board.push(
                <ul className="board-row" key={rowIndex}>
                    {hintRow.map((item, itemIndex) => {
                        let entryClassName = "board-entry";
                        if ((itemIndex - gridStart) > 0 &&
                            itemIndex !== (hintRow.length - 1) &&
                            ((itemIndex+1) - gridStart) % GRID_BREAK === 0) {
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

        for (const [r, row] of this.props.squares.entries()) {
            // we didn't add spacer rows in the hints because there's no reason to do that.
            // that means our rowIndex is off now and won't space correctly at GRID_BREAK points.
            // so correct for that here.
            const squareRowIndex = rowIndex - this.props.maxTopHintSize;
            let rowClassName = "board-row";
            if (squareRowIndex !== 0 &&
                squareRowIndex !== this.props.height - 1 &&
                (squareRowIndex+1) % GRID_BREAK === 0) {
                rowClassName = "board-row-spacer";
            }

            board.push(
                <ul className={rowClassName} key={rowIndex}>
                    {this.props.displayLeftHints[r].map((item, itemIndex) => {
                        return (
                            <li className="board-entry" key={itemIndex}>
                                {item}
                            </li>
                        );
                    })}
                    {row.map((item, itemIndex) => {
                        let entryClassName = "board-entry";
                        if (itemIndex !== 0 &&
                            itemIndex !== (row.length - 1) &&
                            (itemIndex+1) % GRID_BREAK === 0) {
                            entryClassName = "board-entry-spacer";
                        }

                        return (
                            <li className={entryClassName} key={itemIndex}>
                                <Square {...item.props}/>
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
    solved: boolean;

    children?: React.ReactNode;
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

        this.state = {
                code: this.props.code,
                solved: this.props.solved,
                validateResult: "No!❌",

                displayLeftHints: [],
                displayTopHints: [],
                leftHints: [],
                topHints: [],

                maxLeftHintSize: 1,
                maxTopHintSize: 1,

                squares: [],

                height: 0,
                size: 0,
                width: 0,
            };
        // TODO I hate this pattern.
        this.state = this.decodeSquares(this.state);
        this.state = this.genHints(this.state);
        this.state = this.setBlockedSections(this.state);
        this.state = this.genDisplayHints(this.state);
    }

    decodeSquares(state : GameState) {
        const base64Blob = state.code.replace(/_/g, "/").replace(/-/g, "+");

        let zipped;
        try {
            zipped = window.atob(base64Blob);
        } catch (err) {
            // TODO more robust error handling.
            // only case we handle now is messed up query params putting an extra ? in.
            const start = base64Blob.indexOf("?");
            zipped = window.atob(base64Blob.slice(0, start));
        }

        // I hate this quote replacing.
        const boardDict =
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
        const height = parseInt(boardDict.height, 10);
        const width = parseInt(boardDict.width, 10);
        const size = height * width;

        // okay.
        // so what we're doing here,
        // is reading each hex digit out,
        // converting it to the four squares it represents,
        // and filling those four squares.
        // mapping from a 1D string representing 4-digit chunks to a 2D array,
        // it's weird.
        const hexString = boardDict.squares;
        let i = size-1;
        const squares = [...Array(height).keys()].map(() => [...Array(width).fill(0)]);
        for (let h = hexString.length-1; h >= 0; h--) {

            var binChunk = parseInt(hexString[h], 16).toString(2);

            if (binChunk.length < 4) {

                var diff = 4 - binChunk.length;

                while (diff > 0) {
                    binChunk = "0" + binChunk;
                    diff--;
                }

            }

            for (var j = 3; j >= 0; j--) {
                const filled = binChunk[j] === "1";
                let defaultDisplayValue;
                if (state.solved && filled) {
                    defaultDisplayValue = SquareValue.Filled;
                } else {
                    defaultDisplayValue = SquareValue.Empty;
                }

                const r = Math.floor(i / width);
                const c = i % width;
                squares[r][c] = new Square(
                    {
                        "key": i,
                        "filled": filled,
                        "displayValue": defaultDisplayValue,
                        "blocked": false,
                        "onClick": () => this.handleClick(r, c),
                        "solved": state.solved
                    }
                );

                // we may have less squares than the whole hex string would imply.
                i--;
                if (i < 0) {
                    return {
                        ...state,
                        height: height,
                        width: width,
                        size: size,
                        squares: squares,
                    };
                }
            }
        }

        // final check - we may have a chunk or more at the beginning of hexString that are zeroes.
        // fill out empty squares for this.
        while (i >= 0) {
            const r = Math.floor(i / width);
            const c = i % width;
            squares[r][c] = new Square(
                {
                    "key": i,
                    "filled": false,
                    "displayValue": SquareValue.Empty,
                    "blocked": false,
                    "onClick": () => this.handleClick(r, c),
                    "solved": state.solved
                }
            );
            i--;
        }

        return {
            ...state,
            height: height,
            width: width,
            size: size,
            squares: squares,
        };
    }

    genHints(state: GameState) {
        const leftHints : number[][] = [...Array(state.height).keys()].map(() => []);
        const topHints : number[][] = [...Array(state.width).keys()].map(() => []);

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
        const colCounts = Array(state.width).fill(0);
        for (const [r, row] of state.squares.entries()) {

            let rowCount = 0;
            for (const [c, square] of row.entries()) {
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
        for (const [c, colCount] of colCounts.entries()) {
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
            ...state,
            topHints: topHints,
            leftHints: leftHints,
            maxLeftHintSize: maxLeftHintSize,
            maxTopHintSize: maxTopHintSize,
        };
    }

    setBlockedSections(state : GameState) {
        const squares : Square[][] = state.squares.map((row, r) => {
            return row.map((square, c) => {
                const newProps = {...square.props};
                if (state.leftHints[r][0] === 0 ||
                    state.topHints[c][0] === 0) {
                    newProps.blocked = true;
                    newProps.displayValue = SquareValue.CrossedOff;
                }

                return new Square(newProps);
            });
        });

        return {
            ...state,
            squares: squares,
        };
    }

    genDisplayHints(state : GameState) {
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

        const displayLeftHints : string[][] = [];
        for (const hint of state.leftHints) {
            const newHint : string[] = [];
            if (hint.length < state.maxLeftHintSize) {
                newHint
                    .push(...Array(state.maxLeftHintSize - hint.length)
                        .fill(""));
            }
            newHint.push(...(hint.map((num) => num.toString())));

            displayLeftHints.push(newHint);
        }

        const displayTopHints : string[][] = [...Array(state.maxTopHintSize).keys()]
            .map(
                () => Array(state.maxLeftHintSize).fill("")
            );
        for (const hintCol of state.topHints) {
            const paddedHintCol : string[] = [];
            if (hintCol.length < state.maxTopHintSize) {
                paddedHintCol.push(...Array(state.maxTopHintSize - hintCol.length)
                    .fill(""));
            }
            paddedHintCol.push(...(hintCol.map((num) => num.toString())));

            // in addition to padding,
            // we want to rearrange the top hints from "vertical" arrays to "horizontal",
            // to make displaying them more straightforward.
            for (const [h, hint] of paddedHintCol.entries()) {
                displayTopHints[h].push(hint);
            }
        }

        return {
            ...state,
            displayTopHints: displayTopHints,
            displayLeftHints: displayLeftHints,
        };
    }

    handleClick(r : number, c : number) {
        const squares = this.state.squares.slice();

        const square = squares[r][c];
        const displayValue = (square.props.displayValue + 1) % SQUARE_VALUES_NUM;

        squares[r][c] = new Square(
            {
                ...square.props,
                displayValue: displayValue,
            }
        );

        this.setState({
            squares: squares,
        });
    }

    validate() {
        for (const row of this.state.squares) {
            for (const square of row) {
                if ((square.props.filled && square.props.displayValue === SquareValue.Empty) ||
                    (!square.props.filled && square.props.displayValue === SquareValue.Filled)) {
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

        const squares = this.state.squares.slice();

        for (const [r, row] of squares.entries()) {
            for (const [c, square] of row.entries()) {
                let displayValue;
                if (square.props.blocked) {
                    displayValue = SquareValue.CrossedOff;
                } else {
                    displayValue = SquareValue.Empty;
                }

                squares[r][c] = new Square(
                    {
                        ...square.props,
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

export default Game;
