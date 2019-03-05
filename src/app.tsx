import * as React from "react";
import * as ReactDOM from "react-dom";
import * as QueryString from "query-string";
import Game from "./NonogramWeb";

const PARAMS = QueryString.parse(window.location.search);
let BOARD_CODE;
if (PARAMS.board instanceof Array) {
    BOARD_CODE = PARAMS.board[0];
} else {
    BOARD_CODE = PARAMS.board;
}

let QUERY_SOLVED
if (PARAMS.solved instanceof Array) {
    QUERY_SOLVED= PARAMS.solved[0];
} else {
    QUERY_SOLVED = PARAMS.solved;
}

let SOLVED = false;
if (QUERY_SOLVED &&
    (QUERY_SOLVED === "true" || QUERY_SOLVED === "1")) {
    SOLVED = true;
}

// no point rendering if there is no code.
// TODO put up a nice message or something if there isn't code.
if (BOARD_CODE) {
    const BOARD = <Game code={BOARD_CODE} solved={SOLVED}/>;

    ReactDOM.render(
        BOARD,
        document.getElementById("root")
    );
}
