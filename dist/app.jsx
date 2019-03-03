import * as React from "react";
import * as ReactDOM from "react-dom";
import * as QueryString from "query-string";
import Game from "./NonogramWeb";
let PARAMS = QueryString.parse(window.location.search);
let BOARD_CODE;
if (PARAMS.board instanceof Array) {
    BOARD_CODE = PARAMS.board[0];
}
else {
    BOARD_CODE = PARAMS.board;
}
let SOLVED;
if (PARAMS.solved instanceof Array) {
    SOLVED = PARAMS.solved[0];
}
else {
    SOLVED = PARAMS.solved;
}
if (BOARD_CODE) {
    let BOARD = <Game code={BOARD_CODE} solved={SOLVED}/>;
    ReactDOM.render(BOARD, document.getElementById("root"));
}
