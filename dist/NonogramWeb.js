var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import * as Pako from "pako";
import * as React from "react";
// the nonogram grid should be broken into segments this big by this big for readability.
var GRID_BREAK = 5;
var SquareValue;
(function (SquareValue) {
    SquareValue[SquareValue["CrossedOff"] = 0] = "CrossedOff";
    SquareValue[SquareValue["Empty"] = 1] = "Empty";
    SquareValue[SquareValue["Filled"] = 2] = "Filled";
})(SquareValue || (SquareValue = {}));
var Square = /** @class */ (function (_super) {
    __extends(Square, _super);
    function Square() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Square.prototype.render = function () {
        var value = this.props.displayValue;
        var buttonContents = value === SquareValue.CrossedOff ? "X" : null;
        var inputProps = {};
        if (value === SquareValue.Filled) {
            inputProps.className = "filled-square";
        }
        else if (value === SquareValue.Empty) {
            inputProps.className = "empty-square";
        }
        else if (this.props.blocked) {
            inputProps.className = "force-blocked-square";
        }
        else {
            inputProps.className = "blocked-square";
        }
        if (this.props.solved || this.props.blocked) {
            inputProps.disabled = true;
        }
        return (<button onClick={this.props.onClick} {...inputProps}>

                {buttonContents}
            </button>);
    };
    return Square;
}(React.Component));
;
var Board = /** @class */ (function (_super) {
    __extends(Board, _super);
    function Board() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Board.prototype.render = function () {
        // combine hints and squares into a single array,
        // so that we can cleanly give each row keys.
        // manually track rowIndex so we can use it for modding,
        // and set indices correctly in the ul.
        var rowIndex = 0;
        var board = [];
        var gridStart = this.props.maxLeftHintSize;
        var _loop_1 = function (hintRow) {
            board.push(<ul className="board-row" key={rowIndex}>
                    {hintRow.map(function (item, itemIndex) {
                var entryClassName;
                if ((itemIndex - gridStart) <= 0 ||
                    itemIndex === (hintRow.length - 1) ||
                    ((itemIndex + 1) - gridStart) % GRID_BREAK !== 0) {
                    entryClassName = "board-entry";
                }
                else {
                    entryClassName = "board-entry-spacer";
                }
                return (<li className={entryClassName} key={itemIndex}>
                                {item}
                            </li>);
            })}
                </ul>);
            rowIndex++;
        };
        for (var _i = 0, _a = this.props.displayTopHints; _i < _a.length; _i++) {
            var hintRow = _a[_i];
            _loop_1(hintRow);
        }
        var _loop_2 = function (r, row) {
            var entries = [];
            entries.push.apply(entries, this_1.props.displayLeftHints[r]);
            entries.push.apply(entries, row);
            // we didn't add spacer rows in the hints because there's no reason to do that.
            // that means our rowIndex is off now and won't space correctly at GRID_BREAK points.
            // so correct for that here.
            var squareRowIndex = rowIndex - this_1.props.maxTopHintSize;
            var rowClassName = void 0;
            if (squareRowIndex === 0 ||
                squareRowIndex === this_1.props.height - 1 ||
                (squareRowIndex + 1) % GRID_BREAK !== 0) {
                rowClassName = "board-row";
            }
            else {
                rowClassName = "board-row-spacer";
            }
            board.push(<ul className={rowClassName} key={rowIndex}>
                    {entries.map(function (item, itemIndex) {
                var entryClassName;
                if ((itemIndex - gridStart) <= 0 ||
                    itemIndex === (entries.length - 1) ||
                    ((itemIndex + 1) - gridStart) % GRID_BREAK !== 0) {
                    entryClassName = "board-entry";
                }
                else {
                    entryClassName = "board-entry-spacer";
                }
                return (<li className={entryClassName} key={itemIndex}>
                                {item}
                            </li>);
            })}
                </ul>);
            rowIndex++;
        };
        var this_1 = this;
        for (var _b = 0, _c = this.props.squares.entries(); _b < _c.length; _b++) {
            var _d = _c[_b], r = _d[0], row = _d[1];
            _loop_2(r, row);
        }
        return board;
    };
    return Board;
}(React.Component));
var Game = /** @class */ (function (_super) {
    __extends(Game, _super);
    function Game(props) {
        var _this = _super.call(this, props) || this;
        var solved;
        if (_this.props.solved &&
            (_this.props.solved === "true" || _this.props.solved === "1")) {
            solved = true;
        }
        _this.state = {
            code: _this.props.code,
            solved: solved,
        };
        // TODO I hate this pattern.
        _this.state = __assign({}, _this.state, _this.decodeSquares());
        // generate hints,
        // and then force blank rows based on those hints.
        _this.state = __assign({}, _this.state, _this.genHints());
        _this.state = __assign({}, _this.state, _this.setBlockedSections());
        // finally,
        // reformat display hints.
        _this.state = __assign({}, _this.state, _this.genDisplayHints());
        return _this;
    }
    Game.prototype.decodeSquares = function () {
        var _this = this;
        var base64Blob = this.state.code.replace(/_/g, "/").replace(/-/g, "+");
        var zipped;
        try {
            zipped = window.atob(base64Blob);
        }
        catch (err) {
            // TODO more robust error handling.
            // only case we handle now is messed up query params putting an extra ? in.
            var start = base64Blob.indexOf("?");
            zipped = window.atob(base64Blob.slice(0, start));
        }
        // I hate this quote replacing.
        var boardDict = JSON.parse(new TextDecoder("utf-8")
            .decode(Pako.ungzip(zipped)).replace(/'/g, "\""));
        // we need the size separately because the encoding on the other end
        // can lose digits when it encodes the board as a hex string.
        // that SHOULD be redone,
        // but until I get around to it,
        // we have to do this.
        var height = parseInt(boardDict.height, 10);
        var width = parseInt(boardDict.width, 10);
        var size = height * width;
        // okay.
        // so what we're doing here,
        // is reading each hex digit out,
        // converting it to the four squares it represents,
        // and filling those four squares.
        // mapping from a 1D string representing 4-digit chunks to a 2D array,
        // it's weird
        var hexString = boardDict.squares;
        var i = size - 1;
        var squares = Array(height).keys().slice().map(function () { return Array(width).fill(0).slice(); });
        for (var h = hexString.length - 1; h >= 0; h--) {
            var binChunk = parseInt(hexString[h], 16).toString(2).padStart(4, "0");
            var _loop_3 = function () {
                var filled = binChunk[j] === "1";
                var defaultDisplayValue = void 0;
                if (this_2.state.solved && filled) {
                    defaultDisplayValue = SquareValue.Filled;
                }
                else {
                    defaultDisplayValue = SquareValue.Empty;
                }
                var r = Math.floor(i / width);
                var c = i % width;
                squares[r][c] =
                    <Square key={i} filled={filled} displayValue={defaultDisplayValue} blocked={false} onClick={function () { return _this.handleClick(r, c); }} solved={this_2.state.solved}/>;
                i--;
                if (i < 0) {
                    return "break";
                }
            };
            var this_2 = this;
            for (var j = 3; j >= 0; j--) {
                var state_1 = _loop_3();
                if (state_1 === "break")
                    break;
            }
        }
        return {
            height: height,
            width: width,
            size: size,
            squares: squares,
        };
    };
    Game.prototype.genHints = function () {
        var leftHints = Array(this.state.height).keys().slice().map(function () { return []; });
        var topHints = Array(this.state.width).keys().slice().map(function () { return []; });
        // calculate max top/left hints as we go,
        // so we don't have to do it later.
        // this is used for formatting the hints.
        // we set to 1 because if we have all empty rows or columns or both,
        // these will never be set.
        var maxTopHintSize = 1;
        var maxLeftHintSize = 1;
        // generate hints by counting squares in each row and column.
        // if we encounter an empty square while having a count,
        // add that as a hint.
        // empty columns are handled in a later step.
        var colCounts = Array(this.state.width).fill(0);
        for (var _i = 0, _a = this.state.squares.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], r = _b[0], row = _b[1];
            var rowCount = 0;
            for (var _c = 0, _d = row.entries(); _c < _d.length; _c++) {
                var _e = _d[_c], c = _e[0], square = _e[1];
                if (square.props.filled) {
                    rowCount += 1;
                    colCounts[c] += 1;
                }
                else {
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
        for (var _f = 0, _g = colCounts.entries(); _f < _g.length; _f++) {
            var _h = _g[_f], c = _h[0], colCount = _h[1];
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
    };
    Game.prototype.setBlockedSections = function () {
        var squares = this.state.squares.slice();
        for (var _i = 0, _a = squares.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], r = _b[0], row = _b[1];
            for (var _c = 0, _d = row.entries(); _c < _d.length; _c++) {
                var _e = _d[_c], c = _e[0], square = _e[1];
                // TODO must be a way to do this more nicely.
                if (this.state.leftHints[r][0] === 0 ||
                    this.state.topHints[c][0] === 0) {
                    squares[r][c] = new Square(__assign({}, square.props, {
                        blocked: true,
                        displayValue: SquareValue.CrossedOff,
                    }));
                }
            }
        }
        return {
            squares: squares,
        };
    };
    Game.prototype.genDisplayHints = function () {
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
        var _this = this;
        var displayLeftHints = [];
        for (var _i = 0, _a = this.state.leftHints; _i < _a.length; _i++) {
            var hint = _a[_i];
            var newHint = [];
            if (hint.length < this.state.maxLeftHintSize) {
                newHint
                    .push.apply(newHint, Array(this.state.maxLeftHintSize - hint.length)
                    .fill(null));
            }
            newHint.push.apply(newHint, hint);
            displayLeftHints.push(newHint);
        }
        var displayTopHints = Array(this.state.maxTopHintSize).keys().slice().map(function () { return Array(_this.state.maxLeftHintSize).fill(null); });
        for (var _b = 0, _c = this.state.topHints; _b < _c.length; _b++) {
            var hintCol = _c[_b];
            var paddedHintCol = [];
            if (hintCol.length < this.state.maxTopHintSize) {
                paddedHintCol.push.apply(paddedHintCol, Array(this.state.maxTopHintSize - hintCol.length)
                    .fill(null));
            }
            paddedHintCol.push.apply(paddedHintCol, hintCol);
            // in addition to padding,
            // we want to rearrange the top hints from "vertical" arrays to "horizontal",
            // to make displaying them more straightforward.
            for (var _d = 0, _e = paddedHintCol.entries(); _d < _e.length; _d++) {
                var _f = _e[_d], h = _f[0], hint = _f[1];
                displayTopHints[h].push(hint);
            }
        }
        return {
            displayTopHints: displayTopHints,
            displayLeftHints: displayLeftHints,
        };
    };
    Game.prototype.handleClick = function (r, c) {
        var squares = this.state.squares.slice();
        var square = squares[r][c];
        var displayValue = (square.props.displayValue + 1) % Object.keys(SquareValue).length;
        squares[r][c] = new Square(__assign({}, square.props, {
            displayValue: displayValue,
        }));
        this.setState({
            squares: squares,
        });
    };
    Game.prototype.validate = function () {
        for (var _i = 0, _a = this.state.squares; _i < _a.length; _i++) {
            var row = _a[_i];
            for (var _b = 0, row_1 = row; _b < row_1.length; _b++) {
                var square = row_1[_b];
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
    };
    Game.prototype.reset = function () {
        if (this.state.solved) {
            return;
        }
        var squares = this.state.squares.slice();
        for (var _i = 0, _a = squares.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], r = _b[0], row = _b[1];
            for (var _c = 0, _d = row.entries(); _c < _d.length; _c++) {
                var _e = _d[_c], c = _e[0], square = _e[1];
                var displayValue = void 0;
                if (square.props.blocked) {
                    displayValue = SquareValue.CrossedOff;
                }
                else {
                    displayValue = SquareValue.Empty;
                }
                squares[r][c] = new Square(__assign({}, square.props, {
                    displayValue: displayValue,
                }));
            }
        }
        this.setState({
            squares: squares,
        });
    };
    Game.prototype.render = function () {
        var _this = this;
        var reset = <button onClick={function () { return _this.reset(); }}>
                Reset
            </button>;
        var validate = <button onClick={function () { return _this.validate(); }}>
                Validate
            </button>;
        var gameInfo = null;
        if (this.state.solved === false) {
            gameInfo = (<div className="game-info">
                    <div>
                        {reset}
                    </div>
                    <div>
                        {validate}
                    </div>
                    <div>
                        {this.state.validateResult}
                    </div>
                </div>);
        }
        return (<div className="game">
                <div className="game-board">
                    <Board squares={this.state.squares} height={this.state.height} width={this.state.width} size={this.state.size} displayTopHints={this.state.displayTopHints} displayLeftHints={this.state.displayLeftHints} maxTopHintSize={this.state.maxTopHintSize} maxLeftHintSize={this.state.maxLeftHintSize}/>
                </div>
                {gameInfo}
            </div>);
    };
    return Game;
}(React.Component));
export default Game;
