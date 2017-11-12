var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D;

var SIZE = 20;

class Nonosquare {
    public hasValue: boolean;

    public filled: boolean;
    public marked: boolean;

    constructor() {
        this.hasValue = false;

        this.filled = false;
        this.marked = false;
    }
}

class Nonogrid {
    public width: number;
    public height: number;

    public squares: Nonosquare[][];

    constructor(width: number, height = width) {
        this.width = width;
        this.height = height;

        this.squares = [];
        for (let i = 0; i < height; i++) {
            var row: Nonosquare[] = [];

            for (let j = 0; j < width; j++) {
                var square: Nonosquare = new Nonosquare();
                row.push(square);
            }

            this.squares.push(row);
        }
    }
}

function decodeGrid() {
    let xSize = Math.floor(Math.random() * 20) + 1;
    let ySize = Math.floor(Math.random() * 20) + 1;
    var nonogrid = new Nonogrid(xSize, ySize);
    console.log("grid width " + nonogrid.width);
    console.log("grid height " + nonogrid.height);

    for (let row of nonogrid.squares) {
        for (let square of row) {

            if (Math.floor(Math.random() * 2) == 0) {
                square.hasValue = true;
            }
        }
    }

    return nonogrid;
}

function drawBoard(nonogrid) {

    let spacer = 10;

    let y = 10;
    for (let row of nonogrid.squares) {
        let x = 10;

        for (let square of row) {
            if (square.hasValue) {
                ctx.fillStyle = "black";
            }
            else {
                ctx.fillStyle = "white";
            }

            ctx.fillRect(x, y, x + SIZE, y + SIZE);

            x += SIZE + spacer;

        }

        y += SIZE + spacer;
    }
}


function gameLoop() {
    requestAnimationFrame(gameLoop);

    let nonogrid = decodeGrid();
    drawBoard(nonogrid);

}

window.onload = () => {
    canvas = <HTMLCanvasElement>document.getElementById("nonogram_board");
    ctx = canvas.getContext("2d");

    let nonogrid = decodeGrid();
    drawBoard(nonogrid);
}
