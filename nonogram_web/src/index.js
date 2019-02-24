import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

const square_values = ['Empty', 'CrossedOff', 'Filled',];

function Square(props) {
    const value = square_values[props.value];
    if (value === 'Empty') {
        return (
            <button className="square" onClick={props.onClick} ></button>
        );
    } else if (value === 'CrossedOff') {
        return (
            <button className="square" onClick={props.onClick} >X</button>
        );
    } else {
        return (
            <button className="square" onClick={props.onClick} >O</button>
        );
    }
}

class Board extends React.Component {
    renderSquare(i) {
        return (
            <Square
                value={this.props.squares[i]}
                onClick={() => this.props.onClick(i)}
            />
        );
    }

    render() {
        const size = this.props.size;
        const width = this.props.width;

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

        let width;
        let size;

        // a sensible default tic-tac-toe board.
        if (!props.size && !props.width) {
            size = 9;
            width = 3;
        } else if (props.size) {
            size = props.size;
            width = Math.sqrt(props.size);
        } else {
            size = props.width * props.width;
            width = props.width;
        }

        this.state = {
            size: size,
            width: width,
            history: [{
                squares: Array(size).fill(0),
            }],
            stepNumber: 0,
        };
    }

    handleClick(i) {
        const history = this.state.history.slice(0, this.state.stepNumber + 1);
        const current = history[history.length - 1];
        const squares = current.squares.slice();

        squares[i] = (squares[i] + 1) % square_values.length;
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
                        size={this.state.size}
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

ReactDOM.render(
    <Game width={5} height={5}/>,
    document.getElementById('root')
);
