# MazeGen JS

A simple maze generator, solver and a web-based game.

![Maze generator](https://github.com/kburnik/maze/blob/master/mazegen.png)

Inspired by a [video](https://www.youtube.com/watch?v=Y37-gB83HKE) of
[One Lone Coder](https://www.youtube.com/channel/UC-yuWVUplUJZvieEligKBkA).

See it in action at [Code pen](https://codepen.io/kburnik/pen/ZoLBbe).

Sry plunkr, you were broken at the time...

## Generator algorithm

We start of with a grid of blocks, each surrounded by 4 walls. We then randomly
traverse the grid and by moving from one block to the next we knock down the
wall between them.

To ensure we traverse the entire grid, we utilize a stack so we can backtrack
and branch out to blocks we previously missed.

We can only knock down the walls between the current block and the one we
haven't stepped onto yet.

## Solver algorithm

BFS.

What? need I say more? :-D

